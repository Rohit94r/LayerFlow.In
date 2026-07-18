import { z } from "zod";
import { idSchema, timestampSchema } from "./common";

export const workspaceRoleSchema = z.enum(["owner", "admin", "member"]);
export type WorkspaceRole = z.infer<typeof workspaceRoleSchema>;

export const workspaceSchema = z.object({
  id: idSchema,
  name: z.string(),
  slug: z.string(),
  ownerUserId: idSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export type Workspace = z.infer<typeof workspaceSchema>;

/** GET /api/workspaces/current */
export const currentWorkspaceResponseSchema = z.object({
  workspace: workspaceSchema,
  role: workspaceRoleSchema,
});

export type CurrentWorkspaceResponse = z.infer<typeof currentWorkspaceResponseSchema>;

/** PATCH /api/workspaces/:id */
export const updateWorkspaceRequestSchema = z.object({
  name: z.string().min(1).max(120),
});

export type UpdateWorkspaceRequest = z.infer<typeof updateWorkspaceRequestSchema>;

export const updateWorkspaceResponseSchema = z.object({
  workspace: workspaceSchema,
});

export type UpdateWorkspaceResponse = z.infer<typeof updateWorkspaceResponseSchema>;
