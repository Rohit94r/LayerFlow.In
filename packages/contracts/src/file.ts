import { z } from "zod";
import { idSchema, timestampSchema } from "./common";

export const fileSchema = z.object({
  id: idSchema,
  workspaceId: idSchema,
  fileName: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  checksum: z.string().nullish(),
  createdAt: timestampSchema,
});

export type FileDto = z.infer<typeof fileSchema>;

/** Max upload size: 25 MB (attachments, not media hosting). */
export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

/** POST /api/files/upload-url */
export const createUploadUrlRequestSchema = z.object({
  fileName: z.string().min(1).max(200),
  mimeType: z.string().min(1).max(150),
  sizeBytes: z.number().int().positive().max(MAX_FILE_SIZE_BYTES),
  /** Attach to a prompt right away (prompt_attachments row on complete). */
  promptId: idSchema.optional(),
});

export type CreateUploadUrlRequest = z.infer<typeof createUploadUrlRequestSchema>;

export const createUploadUrlResponseSchema = z.object({
  file: fileSchema,
  /** PUT the raw file bytes to this URL, then call POST /api/files/complete. */
  uploadUrl: z.string(),
  method: z.literal("PUT"),
  storage: z.enum(["local", "r2"]),
});

export type CreateUploadUrlResponse = z.infer<typeof createUploadUrlResponseSchema>;

/** POST /api/files/complete */
export const completeUploadRequestSchema = z.object({
  fileId: idSchema,
  /** Attach to a prompt (alternative to passing promptId on upload-url). */
  promptId: idSchema.optional(),
});

export type CompleteUploadRequest = z.infer<typeof completeUploadRequestSchema>;

export const completeUploadResponseSchema = z.object({
  file: fileSchema,
  attachedPromptId: idSchema.nullish(),
});

export type CompleteUploadResponse = z.infer<typeof completeUploadResponseSchema>;

/** GET /api/files/:id/download-url */
export const downloadUrlResponseSchema = z.object({
  downloadUrl: z.string(),
  fileName: z.string(),
  mimeType: z.string(),
});

export type DownloadUrlResponse = z.infer<typeof downloadUrlResponseSchema>;
