import { z } from "zod";
import { rescueDiffSchema, rescueScoreAxisSchema } from "./rescue";

/**
 * One-click prompt improvement ("Improve in Chat").
 * Takes a rough plain-English prompt and returns a sharpened, low-token
 * version with a completeness score, per-axis scores, and a diff of what
 * was kept / removed / added.
 */

export const improvePromptRequestSchema = z.object({
  /** The rough prompt to improve. */
  content: z.string().min(1).max(6_000),
  /** Optional model override; defaults to the cheapest usable provider. */
  targetModel: z.string().max(100).optional(),
  /** Chat session this improvement was triggered from (for attribution). */
  sessionId: z.string().max(100).optional(),
});
export type ImprovePromptRequest = z.infer<typeof improvePromptRequestSchema>;

export const improvePromptResponseSchema = z.object({
  /** The improved, self-contained prompt (keep the user's voice). */
  improvedPrompt: z.string(),
  /** Completeness of the ORIGINAL prompt, 0–100. */
  promptScore: z.number().int().min(0).max(100),
  /** Per-axis scores (Context, Clarity, Constraints, Format, ...). */
  promptScores: z.array(rescueScoreAxisSchema),
  /** What was kept / removed / added vs the original. */
  diff: rescueDiffSchema,
  /** Estimated tokens of the original prompt. */
  beforeTokens: z.number().int().nonnegative(),
  /** Estimated tokens of the improved prompt. */
  afterTokens: z.number().int().nonnegative(),
  /** Relative token reduction vs the original, 0–100. */
  tokenSavingPct: z.number().nonnegative(),
  /** Actual run cost in micro-dollars (1e-6 USD). */
  costMicro: z.number().int().nonnegative(),
  /** Model that produced the improvement. */
  model: z.string(),
  /** Provider that produced the improvement. */
  provider: z.string(),
  latencyMs: z.number().int().nonnegative(),
});
export type ImprovePromptResponse = z.infer<typeof improvePromptResponseSchema>;
