import { z } from "zod";
import { idSchema, timestampSchema } from "./common";

export const folderSchema = z.object({
  id: idSchema,
  workspaceId: idSchema,
  projectId: idSchema,
  parentFolderId: idSchema.nullish(),
  name: z.string(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export type Folder = z.infer<typeof folderSchema>;

export const createFolderRequestSchema = z.object({
  projectId: idSchema,
  parentFolderId: idSchema.optional(),
  name: z.string().min(1).max(120),
});

export type CreateFolderRequest = z.infer<typeof createFolderRequestSchema>;

export const updateFolderRequestSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  parentFolderId: idSchema.nullable().optional(),
});

export type UpdateFolderRequest = z.infer<typeof updateFolderRequestSchema>;

/** GET /api/folders?projectId= */
export const listFoldersQuerySchema = z.object({
  projectId: idSchema.optional(),
});

export type ListFoldersQuery = z.infer<typeof listFoldersQuerySchema>;

export const listFoldersResponseSchema = z.object({
  folders: z.array(folderSchema),
});

export type ListFoldersResponse = z.infer<typeof listFoldersResponseSchema>;

/** POST /api/folders and PATCH /api/folders/:id */
export const folderResponseSchema = z.object({
  folder: folderSchema,
});

export type FolderResponse = z.infer<typeof folderResponseSchema>;
