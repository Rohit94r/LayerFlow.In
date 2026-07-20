import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import {
  createFolderRequestSchema,
  listFoldersQuerySchema,
  updateFolderRequestSchema,
  type Folder,
  type FolderResponse,
  type ListFoldersResponse,
} from "@layerflow/contracts";
import { db } from "../../db/client";
import { folders } from "../../db/schema/workspace";
import { requireAuth } from "../../middleware/auth";
import { AppError } from "../../middleware/app-error";
import type { AppEnv } from "../../types";

export const foldersRouter = new Hono<AppEnv>();

foldersRouter.use(requireAuth);

function toFolderDto(row: typeof folders.$inferSelect): Folder {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    projectId: row.projectId,
    parentFolderId: row.parentFolderId,
    name: row.name,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Load a folder scoped to the workspace, or 404. */
async function getOwnedFolder(workspaceId: string, folderId: string) {
  const folder = await db.query.folders.findFirst({
    where: (f, { and, eq }) => and(eq(f.id, folderId), eq(f.workspaceId, workspaceId)),
  });
  if (!folder) throw new AppError(404, "not_found", "Folder not found");
  return folder;
}

/**
 * Walk up the parent chain to make sure `candidateParentId` is not `folderId`
 * itself or one of its descendants (that would create a cycle).
 */
async function assertNoCycle(workspaceId: string, folderId: string, candidateParentId: string) {
  let currentId: string | null = candidateParentId;
  // Folders never nest deeper than this in practice; bail out defensively.
  for (let depth = 0; currentId && depth < 50; depth++) {
    if (currentId === folderId) {
      throw new AppError(400, "folder_cycle", "A folder cannot be moved inside itself");
    }
    const parent = await getOwnedFolder(workspaceId, currentId);
    currentId = parent.parentFolderId;
  }
}

// GET /api/folders?projectId=
foldersRouter.get("/", async (c) => {
  const workspaceId = c.get("workspaceId");
  const query = listFoldersQuerySchema.parse(c.req.query());

  const rows = await db.query.folders.findMany({
    where: (f, { and, eq }) =>
      and(
        eq(f.workspaceId, workspaceId),
        query.projectId ? eq(f.projectId, query.projectId) : undefined,
      ),
    orderBy: (f, { asc }) => [asc(f.createdAt)],
  });

  const response: ListFoldersResponse = { folders: rows.map(toFolderDto) };
  return c.json(response);
});

// POST /api/folders
foldersRouter.post("/", async (c) => {
  const workspaceId = c.get("workspaceId");
  const body = createFolderRequestSchema.parse(await c.req.json());

  const project = await db.query.projects.findFirst({
    where: (p, { and, eq }) => and(eq(p.id, body.projectId), eq(p.workspaceId, workspaceId)),
  });
  if (!project) throw new AppError(404, "not_found", "Project not found");

  if (body.parentFolderId) {
    const parent = await getOwnedFolder(workspaceId, body.parentFolderId);
    if (parent.projectId !== body.projectId) {
      throw new AppError(400, "folder_project_mismatch", "Parent folder is in another project");
    }
  }

  const [created] = await db
    .insert(folders)
    .values({
      workspaceId,
      projectId: body.projectId,
      parentFolderId: body.parentFolderId,
      name: body.name,
    })
    .returning();

  const response: FolderResponse = { folder: toFolderDto(created) };
  return c.json(response, 201);
});

// PATCH /api/folders/:id — rename or move under another parent (null = root).
foldersRouter.patch("/:id", async (c) => {
  const workspaceId = c.get("workspaceId");
  const id = c.req.param("id");
  const body = updateFolderRequestSchema.parse(await c.req.json());

  const folder = await getOwnedFolder(workspaceId, id);

  if (body.parentFolderId !== undefined && body.parentFolderId !== null) {
    const parent = await getOwnedFolder(workspaceId, body.parentFolderId);
    if (parent.projectId !== folder.projectId) {
      throw new AppError(400, "folder_project_mismatch", "Parent folder is in another project");
    }
    await assertNoCycle(workspaceId, id, body.parentFolderId);
  }

  const [updated] = await db
    .update(folders)
    .set({
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.parentFolderId !== undefined ? { parentFolderId: body.parentFolderId } : {}),
    })
    .where(and(eq(folders.id, id), eq(folders.workspaceId, workspaceId)))
    .returning();
  if (!updated) throw new AppError(404, "not_found", "Folder not found");

  const response: FolderResponse = { folder: toFolderDto(updated) };
  return c.json(response);
});

// DELETE /api/folders/:id — hard delete. Child folders cascade away;
// prompts inside keep existing with folderId set to null.
foldersRouter.delete("/:id", async (c) => {
  const workspaceId = c.get("workspaceId");
  const id = c.req.param("id");

  const [deleted] = await db
    .delete(folders)
    .where(and(eq(folders.id, id), eq(folders.workspaceId, workspaceId)))
    .returning();
  if (!deleted) throw new AppError(404, "not_found", "Folder not found");

  return c.json({ deleted: true });
});
