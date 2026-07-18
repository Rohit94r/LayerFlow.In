import { z } from "zod";
import { idSchema, microDollarsSchema, timestampSchema } from "./common";

// ---------------------------------------------------------------------------
// Prompt analysis (POST /api/intelligence/analyze)
// ---------------------------------------------------------------------------

export const taskTypeSchema = z.enum([
  "coding",
  "long-form",
  "drafting",
  "summarization",
  "extraction",
  "creative",
  "reasoning",
  "general",
]);

export type TaskType = z.infer<typeof taskTypeSchema>;

export const complexitySchema = z.enum(["low", "medium", "high"]);
export type Complexity = z.infer<typeof complexitySchema>;

export const analyzePromptRequestSchema = z
  .object({
    content: z.string().min(1).optional(),
    promptVersionId: idSchema.optional(),
    /** Model the user currently has selected; used for the savings comparison. */
    currentModel: z.string().default("gpt-4o"),
    /** Persist a prompt_analyses row (only possible with promptVersionId). */
    persist: z.boolean().default(false),
  })
  .refine((d) => d.content || d.promptVersionId, {
    message: "content or promptVersionId is required",
  });

export type AnalyzePromptRequest = z.infer<typeof analyzePromptRequestSchema>;

export const modelSuggestionSchema = z.object({
  model: z.string(),
  provider: z.string(),
  label: z.string(),
  qualityPercent: z.number().int().min(0).max(100).optional(),
  /** Percent cheaper than the current model (0 when not cheaper). */
  cheaperPercent: z.number().int().min(0).max(100).optional(),
  estimatedCostMicro: microDollarsSchema.optional(),
});

export type ModelSuggestion = z.infer<typeof modelSuggestionSchema>;

export const promptAnalysisSchema = z.object({
  estimatedTokensIn: z.number().int().nonnegative(),
  estimatedTokensOut: z.number().int().nonnegative(),
  /** Estimated cost of running on the current model, micro-dollars. */
  estimatedCostMicro: microDollarsSchema,
  taskType: taskTypeSchema,
  complexity: complexitySchema,
  /** Cheapest good-enough pick. */
  recommended: modelSuggestionSchema,
  /** Best-quality alternative. */
  alternative: modelSuggestionSchema,
  why: z.array(z.string()),
});

export type PromptAnalysisResult = z.infer<typeof promptAnalysisSchema>;

export const analyzePromptResponseSchema = z.object({
  analysis: promptAnalysisSchema,
});

export type AnalyzePromptResponse = z.infer<typeof analyzePromptResponseSchema>;

// ---------------------------------------------------------------------------
// Recommendation (POST /api/intelligence/recommend)
// ---------------------------------------------------------------------------

export const recommendRequestSchema = z
  .object({
    content: z.string().min(1).optional(),
    promptVersionId: idSchema.optional(),
    currentModel: z.string().optional(),
    /** Persist a model_recommendations row. */
    persist: z.boolean().default(false),
  })
  .refine((d) => d.content || d.promptVersionId, {
    message: "content or promptVersionId is required",
  });

export type RecommendRequest = z.infer<typeof recommendRequestSchema>;

export const recommendationSchema = z.object({
  recommendedModel: z.string(),
  alternativeModel: z.string().nullish(),
  /** Required explanation — recommendations are never silent. */
  reason: z.string(),
  source: z.enum(["heuristic", "llm", "rule"]),
  /** Routing rule that matched, when source is "rule". */
  matchedRuleId: idSchema.nullish(),
});

export type Recommendation = z.infer<typeof recommendationSchema>;

export const recommendResponseSchema = z.object({
  recommendation: recommendationSchema,
  analysis: promptAnalysisSchema,
});

export type RecommendResponse = z.infer<typeof recommendResponseSchema>;

// ---------------------------------------------------------------------------
// Routing (POST /api/intelligence/route) — Auto Mode model selection
// ---------------------------------------------------------------------------

export const routeRequestSchema = z.object({
  content: z.string().min(1),
  /** Model requested by the caller, if any (Manual mode returns it as-is). */
  requestedModel: z.string().optional(),
});

export type RouteRequest = z.infer<typeof routeRequestSchema>;

export const routeResponseSchema = z.object({
  model: z.string(),
  provider: z.string(),
  /** ALWAYS present — Auto Mode never picks silently. */
  explanation: z.string(),
  source: z.enum(["manual", "rule", "heuristic"]),
  matchedRuleId: idSchema.nullish(),
});

export type RouteResponse = z.infer<typeof routeResponseSchema>;

// ---------------------------------------------------------------------------
// Workspace settings (GET/PUT /api/workspace/settings)
// ---------------------------------------------------------------------------

export const executionModeSchema = z.enum([
  "manual",
  "suggest",
  "auto-cheapest",
  "auto-fastest",
  "auto-best",
  "auto-balanced",
]);

export type ExecutionMode = z.infer<typeof executionModeSchema>;

export const workspaceSettingsSchema = z.object({
  workspaceId: idSchema,
  executionMode: executionModeSchema,
  preferCheap: z.boolean(),
  defaultModel: z.string(),
  updatedAt: timestampSchema,
});

export type WorkspaceSettingsDto = z.infer<typeof workspaceSettingsSchema>;

export const workspaceSettingsResponseSchema = z.object({
  settings: workspaceSettingsSchema,
});

export type WorkspaceSettingsResponse = z.infer<typeof workspaceSettingsResponseSchema>;

export const updateWorkspaceSettingsRequestSchema = z.object({
  executionMode: executionModeSchema.optional(),
  preferCheap: z.boolean().optional(),
  defaultModel: z.string().min(1).optional(),
});

export type UpdateWorkspaceSettingsRequest = z.infer<typeof updateWorkspaceSettingsRequestSchema>;

// ---------------------------------------------------------------------------
// Routing rules (GET/POST /api/routing-rules, PATCH/DELETE /api/routing-rules/:id)
// ---------------------------------------------------------------------------

/** Structured condition evaluated by the router. All present fields must match. */
export const routingRuleConfigSchema = z.object({
  taskType: taskTypeSchema.optional(),
  complexity: complexitySchema.optional(),
  minTokens: z.number().int().nonnegative().optional(),
  maxTokens: z.number().int().positive().optional(),
  /** Substring / keyword match against the prompt (case-insensitive). */
  contains: z.string().optional(),
});

export type RoutingRuleConfig = z.infer<typeof routingRuleConfigSchema>;

export const routingRuleSchema = z.object({
  id: idSchema,
  workspaceId: idSchema,
  condition: z.string(),
  conditionConfig: routingRuleConfigSchema.nullish(),
  targetModel: z.string(),
  priority: z.number().int(),
  enabled: z.boolean(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export type RoutingRule = z.infer<typeof routingRuleSchema>;

export const listRoutingRulesResponseSchema = z.object({
  rules: z.array(routingRuleSchema),
});

export type ListRoutingRulesResponse = z.infer<typeof listRoutingRulesResponseSchema>;

export const createRoutingRuleRequestSchema = z.object({
  condition: z.string().min(1).max(200),
  conditionConfig: routingRuleConfigSchema.optional(),
  targetModel: z.string().min(1),
  priority: z.number().int().default(0),
  enabled: z.boolean().default(true),
});

export type CreateRoutingRuleRequest = z.infer<typeof createRoutingRuleRequestSchema>;

export const updateRoutingRuleRequestSchema = z.object({
  condition: z.string().min(1).max(200).optional(),
  conditionConfig: routingRuleConfigSchema.nullable().optional(),
  targetModel: z.string().min(1).optional(),
  priority: z.number().int().optional(),
  enabled: z.boolean().optional(),
});

export type UpdateRoutingRuleRequest = z.infer<typeof updateRoutingRuleRequestSchema>;

export const routingRuleResponseSchema = z.object({
  rule: routingRuleSchema,
});

export type RoutingRuleResponse = z.infer<typeof routingRuleResponseSchema>;
