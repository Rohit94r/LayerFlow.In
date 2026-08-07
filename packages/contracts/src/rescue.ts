import { z } from "zod";
import { idSchema, timestampSchema } from "./common";

/** Rescue report lifecycle. */
export const rescueReportStatusSchema = z.enum(["queued", "running", "completed", "failed"]);
export type RescueReportStatus = z.infer<typeof rescueReportStatusSchema>;

/** Structured context captured from a rescued conversation. */
export const rescuePassportSchema = z.object({
  goal: z.string(),
  currentState: z.string(),
  decisions: z.array(z.string()),
  constraints: z.array(z.string()),
  failures: z.array(z.string()),
  successes: z.array(z.string()),
  missingInfo: z.array(z.string()),
  outputFormat: z.string(),
  nextAction: z.string(),
});
export type RescuePassport = z.infer<typeof rescuePassportSchema>;

export const rescueCostEstimateSchema = z.object({
  modelId: z.string(),
  provider: z.string(),
  model: z.string(),
  class: z.enum(["flagship", "balanced", "cheap"]),
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  /** Total run cost in USD. */
  cost: z.number().nonnegative(),
  latency: z.string(),
  recommended: z.boolean(),
});
export type RescueCostEstimate = z.infer<typeof rescueCostEstimateSchema>;

export const rescueDiffSchema = z.object({
  kept: z.array(z.string()),
  removed: z.array(z.string()),
  unsure: z.array(z.string()),
});
export type RescueDiff = z.infer<typeof rescueDiffSchema>;

export const rescueScoreAxisSchema = z.object({
  label: z.string(),
  value: z.number().int().min(0).max(100),
});
export type RescueScoreAxis = z.infer<typeof rescueScoreAxisSchema>;

export const rescueContinuePackSchema = z.object({
  label: z.string(),
  value: z.string(),
});
export type RescueContinuePackItem = z.infer<typeof rescueContinuePackSchema>;

export const rescueReportSchema = z.object({
  id: idSchema,
  workspaceId: idSchema,
  sessionId: idSchema.nullish(),
  projectId: idSchema.nullish(),
  sourceTool: z.string(),
  sourceModel: z.string(),
  status: rescueReportStatusSchema,
  errorMessage: z.string().nullish(),
  summary: z.string(),
  passport: rescuePassportSchema,
  improvedPrompt: z.string(),
  promptScore: z.number().int().min(0).max(100).nullish(),
  promptScores: z.array(rescueScoreAxisSchema),
  diff: rescueDiffSchema,
  costs: z.array(rescueCostEstimateSchema),
  recommendedModelId: z.string(),
  recommendedReason: z.string(),
  continuePack: z.array(rescueContinuePackSchema),
  originalWords: z.number().int().nonnegative(),
  compressedWords: z.number().int().nonnegative(),
  compressionPercent: z.number().nonnegative(),
  saved: z.boolean().default(false),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});
export type RescueReport = z.infer<typeof rescueReportSchema>;

/** POST /api/rescue — paste a conversation (or prompt) to rescue. */
export const createRescueRequestSchema = z.object({
  content: z.string().min(1).max(2_000_000),
  sourceTool: z.string().max(40).optional(),
  targetModel: z.string().max(100).optional(),
  projectId: idSchema.optional(),
  domainId: idSchema.optional(),
});
export type CreateRescueRequest = z.infer<typeof createRescueRequestSchema>;

export const createRescueResponseSchema = z.object({
  report: rescueReportSchema,
});
export type CreateRescueResponse = z.infer<typeof createRescueResponseSchema>;

/** GET /api/rescue?limit= */
export const listRescueReportsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(30),
  offset: z.coerce.number().int().min(0).default(0),
});
export type ListRescueReportsQuery = z.infer<typeof listRescueReportsQuerySchema>;

export const listRescueReportsResponseSchema = z.object({
  reports: z.array(rescueReportSchema),
});
export type ListRescueReportsResponse = z.infer<typeof listRescueReportsResponseSchema>;

/** GET /api/rescue/:id */
export const getRescueReportResponseSchema = z.object({
  report: rescueReportSchema,
});
export type GetRescueReportResponse = z.infer<typeof getRescueReportResponseSchema>;
