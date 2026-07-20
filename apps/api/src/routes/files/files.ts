import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import {
  completeUploadRequestSchema,
  createUploadUrlRequestSchema,
  MAX_FILE_SIZE_BYTES,
  type CompleteUploadResponse,
  type CreateUploadUrlResponse,
  type DownloadUrlResponse,
  type FileDto,
} from "@layerflow/contracts";
import { getEnv } from "../../config/env";
import { logger } from "../../config/logger";
import { db } from "../../db/client";
import { createId } from "../../db/schema/_helpers";
import { files } from "../../db/schema/files";
import { promptAttachments } from "../../db/schema/prompts";
import { requireAuth } from "../../middleware/auth";
import { AppError } from "../../middleware/app-error";
import {
  buildObjectKey,
  createR2DownloadUrl,
  createR2UploadUrl,
  deleteLocalFile,
  deleteR2Object,
  isR2Configured,
  localFileExists,
  readLocalFile,
  r2ObjectExists,
  saveLocalFile,
} from "../../services/files/storage";
import type { AppEnv } from "../../types";

/**
 * Attachment upload flow (3 steps, mirroring how S3/R2 signed uploads work):
 *
 *   1. POST /api/files/upload-url   → file record + URL to PUT the bytes to
 *   2. PUT  <uploadUrl>             → raw file body (local API or R2)
 *   3. POST /api/files/complete     → verify + optionally attach to a prompt
 *
 * Local storage uses authenticated PUT/GET /api/files/:id/content.
 * When R2_* env vars are set, upload/download URLs are R2 presigned URLs.
 */
export const filesRouter = new Hono<AppEnv>();

filesRouter.use(requireAuth);

function toFileDto(row: typeof files.$inferSelect): FileDto {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    fileName: row.fileName,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    checksum: row.checksum,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Load a file scoped to the workspace, or 404. */
async function getOwnedFile(workspaceId: string, fileId: string) {
  const file = await db.query.files.findFirst({
    where: (f, { and, eq }) => and(eq(f.id, fileId), eq(f.workspaceId, workspaceId)),
  });
  if (!file) throw new AppError(404, "not_found", "File not found");
  return file;
}

/** Attach a file to a prompt (skips silently if already attached). */
async function attachToPrompt(workspaceId: string, promptId: string, fileId: string) {
  const prompt = await db.query.prompts.findFirst({
    where: (p, { and, eq }) => and(eq(p.id, promptId), eq(p.workspaceId, workspaceId)),
  });
  if (!prompt) throw new AppError(404, "not_found", "Prompt not found");

  const existing = await db.query.promptAttachments.findFirst({
    where: (a, { and, eq }) => and(eq(a.promptId, promptId), eq(a.fileId, fileId)),
  });
  if (!existing) {
    await db.insert(promptAttachments).values({ promptId, workspaceId, fileId });
  }
}

// POST /api/files/upload-url
filesRouter.post("/upload-url", async (c) => {
  const workspaceId = c.get("workspaceId");
  const userId = c.get("userId");
  const body = createUploadUrlRequestSchema.parse(await c.req.json());

  // Validate the prompt now so the client fails fast, before uploading bytes.
  if (body.promptId) {
    const prompt = await db.query.prompts.findFirst({
      where: (p, { and, eq }) => and(eq(p.id, body.promptId!), eq(p.workspaceId, workspaceId)),
    });
    if (!prompt) throw new AppError(404, "not_found", "Prompt not found");
  }

  const fileId = createId("file");
  const objectKey = buildObjectKey(workspaceId, fileId, body.fileName);
  const [created] = await db
    .insert(files)
    .values({
      id: fileId,
      workspaceId,
      ownerUserId: userId,
      objectKey,
      fileName: body.fileName,
      mimeType: body.mimeType,
      sizeBytes: body.sizeBytes,
    })
    .returning();

  if (isR2Configured()) {
    const uploadUrl = await createR2UploadUrl(objectKey, body.mimeType);
    const response: CreateUploadUrlResponse = {
      file: toFileDto(created),
      uploadUrl,
      method: "PUT",
      storage: "r2",
    };
    return c.json(response, 201);
  }

  const response: CreateUploadUrlResponse = {
    file: toFileDto(created),
    uploadUrl: `${getEnv().API_URL}/api/files/${fileId}/content`,
    method: "PUT",
    storage: "local",
  };
  return c.json(response, 201);
});

// PUT /api/files/:id/content — the local-dev upload target.
filesRouter.put("/:id/content", async (c) => {
  if (isR2Configured()) {
    throw new AppError(
      400,
      "use_signed_url",
      "R2 is configured — PUT the file to the presigned uploadUrl from /upload-url",
    );
  }

  const workspaceId = c.get("workspaceId");
  const file = await getOwnedFile(workspaceId, c.req.param("id"));

  const bytes = Buffer.from(await c.req.arrayBuffer());
  if (bytes.length === 0) throw new AppError(400, "empty_body", "Upload body is empty");
  if (bytes.length > MAX_FILE_SIZE_BYTES) {
    throw new AppError(413, "file_too_large", "File exceeds the 25 MB limit");
  }

  await saveLocalFile(file.objectKey, bytes);

  // Record what actually landed on disk, not what the client promised.
  const checksum = createHash("sha256").update(bytes).digest("hex");
  const [updated] = await db
    .update(files)
    .set({ sizeBytes: bytes.length, checksum })
    .where(eq(files.id, file.id))
    .returning();

  return c.json({ file: toFileDto(updated) });
});

// POST /api/files/complete
filesRouter.post("/complete", async (c) => {
  const workspaceId = c.get("workspaceId");
  const body = completeUploadRequestSchema.parse(await c.req.json());

  const file = await getOwnedFile(workspaceId, body.fileId);

  const uploaded = isR2Configured()
    ? await r2ObjectExists(file.objectKey)
    : localFileExists(file.objectKey);

  if (!uploaded) {
    throw new AppError(
      400,
      "upload_incomplete",
      "No bytes uploaded yet — PUT the file to the uploadUrl first",
    );
  }

  if (body.promptId) {
    await attachToPrompt(workspaceId, body.promptId, file.id);
  }

  const response: CompleteUploadResponse = {
    file: toFileDto(file),
    attachedPromptId: body.promptId ?? null,
  };
  return c.json(response);
});

// GET /api/files/:id/download-url
filesRouter.get("/:id/download-url", async (c) => {
  const workspaceId = c.get("workspaceId");
  const file = await getOwnedFile(workspaceId, c.req.param("id"));

  if (isR2Configured()) {
    const downloadUrl = await createR2DownloadUrl(file.objectKey, file.fileName, file.mimeType);
    const response: DownloadUrlResponse = {
      downloadUrl,
      fileName: file.fileName,
      mimeType: file.mimeType,
    };
    return c.json(response);
  }

  const response: DownloadUrlResponse = {
    downloadUrl: `${getEnv().API_URL}/api/files/${file.id}/content`,
    fileName: file.fileName,
    mimeType: file.mimeType,
  };
  return c.json(response);
});

// GET /api/files/:id/content — the local-dev download target.
filesRouter.get("/:id/content", async (c) => {
  if (isR2Configured()) {
    throw new AppError(
      400,
      "use_signed_url",
      "R2 is configured — GET the file from the presigned downloadUrl",
    );
  }

  const workspaceId = c.get("workspaceId");
  const file = await getOwnedFile(workspaceId, c.req.param("id"));

  if (!localFileExists(file.objectKey)) {
    throw new AppError(404, "not_found", "File content not found in local storage");
  }
  const bytes = await readLocalFile(file.objectKey);

  return c.body(new Uint8Array(bytes), 200, {
    "Content-Type": file.mimeType,
    "Content-Disposition": `attachment; filename="${file.fileName.replace(/"/g, "")}"`,
  });
});

// DELETE /api/files/:id — removes metadata, attachments (cascade), and bytes.
filesRouter.delete("/:id", async (c) => {
  const workspaceId = c.get("workspaceId");
  const file = await getOwnedFile(workspaceId, c.req.param("id"));

  await db.delete(files).where(and(eq(files.id, file.id), eq(files.workspaceId, workspaceId)));

  try {
    if (isR2Configured()) {
      await deleteR2Object(file.objectKey);
    } else {
      await deleteLocalFile(file.objectKey);
    }
  } catch (err) {
    // Metadata row is already gone; a leftover object is harmless.
    logger.warn({
      err,
      fileId: file.id,
      objectKey: file.objectKey,
      msg: "failed to delete file bytes after metadata delete",
    });
  }

  return c.json({ ok: true });
});
