import { z } from "zod";
import { idSchema, microDollarsSchema, timestampSchema } from "./common";

export const runSourceSchema = z.enum(["compare", "playground", "gateway", "session", "replay"]);
export type RunSource = z.infer<typeof runSourceSchema>;

export const runStatusSchema = z.enum(["pending", "running", "succeeded", "failed", "blocked"]);
export type RunStatus = z.infer<typeof runStatusSchema>;

/** Workspace-run chat message (stricter than the gateway OpenAI-shaped variant). */
export const runMessageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string(),
});

export type RunMessage = z.infer<typeof runMessageSchema>;

export const runSchema = z.object({
  id: idSchema,
  workspaceId: idSchema,
  promptVersionId: idSchema.nullish(),
  source: runSourceSchema,
  provider: z.string(),
  model: z.string(),
  status: runStatusSchema,
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  costMicro: microDollarsSchema,
  latencyMs: z.number().int().nonnegative().nullish(),
  cacheHit: z.boolean(),
  /** Why this model was chosen (routing rule / auto mode explanation). */
  routingReason: z.string().nullish(),
  errorMessage: z.string().nullish(),
  requestId: z.string().nullish(),
  createdAt: timestampSchema,
});

export type Run = z.infer<typeof runSchema>;

/** Run + the model output body (detail views). */
export const runDetailSchema = runSchema.extend({
  output: z.string().nullish(),
});

export type RunDetail = z.infer<typeof runDetailSchema>;

/**
 * POST /api/runs — execute a model call.
 * Input text comes from exactly one of: messages, content, promptVersionId,
 * or promptId (its current version).
 */
export const createRunRequestSchema = z
  .object({
    promptId: idSchema.optional(),
    promptVersionId: idSchema.optional(),
    model: z.string().min(1),
    content: z.string().min(1).optional(),
    messages: z.array(runMessageSchema).min(1).optional(),
    source: z.enum(["playground", "compare", "gateway"]).default("playground"),
  })
  .refine((d) => d.messages || d.content || d.promptVersionId || d.promptId, {
    message: "one of messages, content, promptVersionId, or promptId is required",
  });

export type CreateRunRequest = z.infer<typeof createRunRequestSchema>;

export const runResponseSchema = z.object({
  run: runDetailSchema,
});

export type RunResponse = z.infer<typeof runResponseSchema>;

export const listRunsQuerySchema = z.object({
  promptId: idSchema.optional(),
  promptVersionId: idSchema.optional(),
  model: z.string().optional(),
  source: runSourceSchema.optional(),
  status: runStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type ListRunsQuery = z.infer<typeof listRunsQuerySchema>;

export const listRunsResponseSchema = z.object({
  runs: z.array(runSchema),
});

export type ListRunsResponse = z.infer<typeof listRunsResponseSchema>;

/** POST /api/compare — either a saved prompt version or ad-hoc content. */
export const createCompareRequestSchema = z
  .object({
    promptVersionId: idSchema.optional(),
    content: z.string().min(1).optional(),
    models: z.array(z.string().min(1)).min(2).max(8),
  })
  .refine((d) => d.promptVersionId || d.content, {
    message: "promptVersionId or content is required",
  });

export type CreateCompareRequest = z.infer<typeof createCompareRequestSchema>;

export const compareJobStatusSchema = z.enum(["queued", "running", "completed", "failed"]);
export type CompareJobStatus = z.infer<typeof compareJobStatusSchema>;

export const createCompareResponseSchema = z.object({
  jobId: idSchema,
  status: compareJobStatusSchema,
});

export type CreateCompareResponse = z.infer<typeof createCompareResponseSchema>;

/** Computed badges for one compare result. */
export const rankHintsSchema = z.object({
  best: z.boolean(),
  cheapest: z.boolean(),
  fastest: z.boolean(),
});

export type RankHints = z.infer<typeof rankHintsSchema>;

export const compareResultSchema = z.object({
  id: idSchema,
  runId: idSchema,
  rankHints: rankHintsSchema.nullish(),
  run: runDetailSchema,
});

export type CompareResult = z.infer<typeof compareResultSchema>;

/** GET /api/compare/:jobId */
export const compareJobResponseSchema = z.object({
  job: z.object({
    id: idSchema,
    status: compareJobStatusSchema,
    models: z.array(z.string()),
    promptVersionId: idSchema.nullish(),
    errorMessage: z.string().nullish(),
    createdAt: timestampSchema,
    completedAt: timestampSchema.nullish(),
  }),
  results: z.array(compareResultSchema),
});

export type CompareJobResponse = z.infer<typeof compareJobResponseSchema>;
