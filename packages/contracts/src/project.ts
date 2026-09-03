import { z } from "zod";
import { idSchema, timestampSchema } from "./common";

export const projectStatusSchema = z.enum(["active", "archived"]);
export type ProjectStatus = z.infer<typeof projectStatusSchema>;

export const projectSchema = z.object({
  id: idSchema,
  workspaceId: idSchema,
  domainId: idSchema,
  name: z.string(),
  description: z.string().nullish(),
  status: projectStatusSchema,
  promptCount: z.number().int().default(0),
  learningCount: z.number().int().default(0),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export type Project = z.infer<typeof projectSchema>;

export const createProjectRequestSchema = z.object({
  domainId: idSchema,
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
});

export type CreateProjectRequest = z.infer<typeof createProjectRequestSchema>;

export const updateProjectRequestSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).optional(),
  status: projectStatusSchema.optional(),
});

export type UpdateProjectRequest = z.infer<typeof updateProjectRequestSchema>;

/** GET /api/projects?domainId=&status= */
export const listProjectsQuerySchema = z.object({
  domainId: idSchema.optional(),
  status: projectStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>;

export const listProjectsResponseSchema = z.object({
  projects: z.array(projectSchema),
});

export type ListProjectsResponse = z.infer<typeof listProjectsResponseSchema>;

/** POST /api/projects and PATCH /api/projects/:id */
export const projectResponseSchema = z.object({
  project: projectSchema,
});

export type ProjectResponse = z.infer<typeof projectResponseSchema>;
