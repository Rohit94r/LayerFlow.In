import { z } from "zod";
import { idSchema, microDollarsSchema, timestampSchema } from "./common";

export const promptVariableSchema = z.object({
  name: z.string(),
  defaultValue: z.string().nullish(),
  description: z.string().nullish(),
});

export type PromptVariable = z.infer<typeof promptVariableSchema>;

export const promptVersionSchema = z.object({
  id: idSchema,
  promptId: idSchema,
  version: z.number().int().positive(),
  body: z.string(),
  note: z.string().nullish(),
  /** Model the author had selected when saving this version, e.g. "gpt-4o". */
  modelHint: z.string().nullish(),
  createdAt: timestampSchema,
});

export type PromptVersion = z.infer<typeof promptVersionSchema>;

export const promptSchema = z.object({
  id: idSchema,
  workspaceId: idSchema,
  domainId: idSchema.nullish(),
  projectId: idSchema.nullish(),
  folderId: idSchema.nullish(),
  title: z.string(),
  description: z.string().nullish(),
  notes: z.string().nullish(),
  source: z.enum(["manual", "chat", "improve"]),
  runCount: z.number().int().nonnegative(),
  currentVersionId: idSchema.nullish(),
  tags: z.array(z.string()),
  favorite: z.boolean(),
  archivedAt: timestampSchema.nullish(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export type Prompt = z.infer<typeof promptSchema>;

export const createPromptRequestSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1),
  domainId: idSchema.optional(),
  projectId: idSchema.optional(),
  folderId: idSchema.optional(),
  description: z.string().max(500).optional(),
  tags: z.array(z.string().max(40)).max(20).optional(),
  variables: z.array(promptVariableSchema).optional(),
});

export type CreatePromptRequest = z.infer<typeof createPromptRequestSchema>;

export const updatePromptRequestSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(500).optional(),
  notes: z.string().optional(),
  domainId: idSchema.nullable().optional(),
  projectId: idSchema.nullable().optional(),
  folderId: idSchema.nullable().optional(),
  tags: z.array(z.string().max(40)).max(20).optional(),
  favorite: z.boolean().optional(),
  /** true archives the prompt, false restores it. */
  archived: z.boolean().optional(),
});

export type UpdatePromptRequest = z.infer<typeof updatePromptRequestSchema>;

/**
 * GET /api/prompts query filters. Booleans arrive as the strings "true"/"false"
 * because they come from the URL query string.
 */
export const listPromptsQuerySchema = z.object({
  domainId: idSchema.optional(),
  projectId: idSchema.optional(),
  folderId: idSchema.optional(),
  tag: z.string().max(40).optional(),
  favorite: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  /** Case-insensitive title search. */
  q: z.string().max(200).optional(),
  includeArchived: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type ListPromptsQuery = z.infer<typeof listPromptsQuerySchema>;

export const listPromptsResponseSchema = z.object({
  prompts: z.array(promptSchema),
});

export type ListPromptsResponse = z.infer<typeof listPromptsResponseSchema>;

/** GET /api/prompts/:id (and POST/PATCH responses). */
export const promptResponseSchema = z.object({
  prompt: promptSchema,
  currentVersion: promptVersionSchema.nullish(),
  variables: z.array(promptVariableSchema).optional().default([]),
});

export type PromptResponse = z.infer<typeof promptResponseSchema>;

/** GET /api/prompts/:id/versions */
export const listPromptVersionsResponseSchema = z.object({
  versions: z.array(promptVersionSchema),
});

export type ListPromptVersionsResponse = z.infer<typeof listPromptVersionsResponseSchema>;

/** GET/POST version endpoints return a single snapshot. */
export const promptVersionResponseSchema = z.object({
  version: promptVersionSchema,
});

export type PromptVersionResponse = z.infer<typeof promptVersionResponseSchema>;

/** POST /api/prompts/:id/versions — versions are immutable; edits create new ones. */
export const createPromptVersionRequestSchema = z.object({
  body: z.string().min(1),
  note: z.string().max(500).optional(),
  modelHint: z.string().max(100).optional(),
});

export type CreatePromptVersionRequest = z.infer<typeof createPromptVersionRequestSchema>;

/** POST /api/prompts/:id/variables */
export const createPromptVariableRequestSchema = z.object({
  name: z.string().min(1).max(40),
  defaultValue: z.string().max(500).nullish(),
  description: z.string().max(500).nullish(),
});

export type CreatePromptVariableRequest = z.infer<typeof createPromptVariableRequestSchema>;

/** PATCH /api/prompts/:id/variables/:variableId */
export const updatePromptVariableRequestSchema = z.object({
  name: z.string().min(1).max(40).optional(),
  defaultValue: z.string().max(500).nullish().optional(),
  description: z.string().max(500).nullish().optional(),
});

export type UpdatePromptVariableRequest = z.infer<typeof updatePromptVariableRequestSchema>;

export const promptVariableResponseSchema = z.object({
  variable: promptVariableSchema.extend({ id: idSchema }),
});

export type PromptVariableResponse = z.infer<typeof promptVariableResponseSchema>;

/** A stored model output attached to a prompt version. */
export const promptOutputSchema = z.object({
  id: idSchema,
  promptVersionId: idSchema,
  runId: idSchema.nullish(),
  model: z.string(),
  provider: z.string(),
  body: z.string(),
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  costMicro: microDollarsSchema,
  createdAt: timestampSchema,
});

export type PromptOutput = z.infer<typeof promptOutputSchema>;
