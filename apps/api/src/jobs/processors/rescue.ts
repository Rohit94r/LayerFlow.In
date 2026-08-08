import type { Job } from "bullmq";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { computeCostMicro, getModel } from "@layerflow/model-registry";
import type { Provider } from "@layerflow/model-registry";
import { logger } from "../../config/logger";
import { db } from "../../db/client";
import { rescueReports } from "../../db/schema/rescue";
import { executeRun } from "../../services/runs/execute";
import { hasUsableProviderKey } from "../../services/chat/health";
import { recordActivity } from "../../services/workspace/activity";
import { estimateTokens } from "../../services/intelligence/analyze";

export interface RescueJobPayload {
  rescueId: string;
  workspaceId: string;
  userId?: string;
  content: string;
  targetModel?: string;
}

/** Fallback model when no target was requested and "auto" is unserviceable. */
const DEFAULT_RESCUE_MODEL = "gpt-4o-mini";

/**
 * Preferred rescue models in priority order. The pipeline picks the first one
 * whose provider has a usable key (workspace BYOK or platform env fallback),
 * so "Rescue my chat" works out of the box with whatever provider is
 * configured instead of failing with a missing-key error.
 */
const RESCUE_MODEL_PRIORITY: { model: string; provider: Provider }[] = [
  { model: "gpt-4o-mini", provider: "openai" },
  { model: "gemini-flash-latest", provider: "google" },
  { model: "llama-3.3-70b-versatile", provider: "groq" },
  { model: "grok-3-mini", provider: "xai" },
  { model: "deepseek-chat", provider: "deepseek" },
  { model: "kimi-k2", provider: "kimi" },
];

/**
 * Choose the model for a rescue run. An explicit valid target wins; otherwise
 * pick the first candidate whose provider has a usable key — presence alone is
 * not enough, since a key with an out-of-credits account (health status
 * `expired`) would make the whole rescue fail.
 */
async function pickRescueModel(workspaceId: string, targetModel?: string): Promise<string> {
  if (targetModel && getModel(targetModel)) return targetModel;
  for (const candidate of RESCUE_MODEL_PRIORITY) {
    if (!getModel(candidate.model)) continue;
    if (await hasUsableProviderKey(workspaceId, candidate.provider)) return candidate.model;
  }
  return DEFAULT_RESCUE_MODEL;
}

const rescueJsonSchema = z.object({
  summary: z.string(),
  improvedPrompt: z.string(),
  continuePack: z.array(z.object({ label: z.string(), value: z.string() })).default([]),
  passport: z
    .object({
      goal: z.string(),
      currentState: z.string(),
      decisions: z.array(z.string()).default([]),
      constraints: z.array(z.string()).default([]),
      failures: z.array(z.string()).default([]),
      successes: z.array(z.string()).default([]),
      missingInfo: z.array(z.string()).default([]),
      outputFormat: z.string(),
      nextAction: z.string(),
    })
    .default({
      goal: "",
      currentState: "",
      decisions: [],
      constraints: [],
      failures: [],
      successes: [],
      missingInfo: [],
      outputFormat: "",
      nextAction: "",
    }),
  diff: z
    .object({
      kept: z.array(z.string()).default([]),
      removed: z.array(z.string()).default([]),
      unsure: z.array(z.string()).default([]),
    })
    .default({ kept: [], removed: [], unsure: [] }),
  promptScore: z.number().int().min(0).max(100).nullish(),
  promptScores: z.array(z.object({ label: z.string(), value: z.number().int().min(0).max(100) })).default([]),
  recommendedModelId: z.string().nullish(),
  recommendedReason: z.string().default(""),
});

function costClass(inputPricePerMTokMicro: number): "flagship" | "balanced" | "cheap" {
  if (inputPricePerMTokMicro < 1_000_000) return "cheap";
  if (inputPricePerMTokMicro < 5_000_000) return "balanced";
  return "flagship";
}

/**
 * Build the per-model cost table for a rescue report. The executed model uses
 * the real run's tokens; alternatives use token estimates at catalog prices.
 */
function costRows(input: {
  content: string;
  runModel: string;
  runProvider: string;
  runInputTokens: number;
  runOutputTokens: number;
  runCostMicro: number | null;
  runLatencyMs: number | null;
  recommendedModelId: string;
}) {
  const estimatedInput = estimateTokens(input.content);
  const candidates = [
    "gpt-4o",
    "gpt-4o-mini",
    "claude-sonnet-4",
    "claude-3-5-haiku",
    "gemini-flash-latest",
    "deepseek-chat",
    "llama-3.3-70b-versatile",
    "grok-3-mini",
    "kimi-k2",
  ];
  const rows = [];
  for (const modelId of candidates) {
    const info = getModel(modelId);
    if (!info) continue;
    const isExecuted = modelId === input.runModel;
    const inputTokens = isExecuted ? input.runInputTokens : estimatedInput;
    const outputTokens = isExecuted ? input.runOutputTokens : Math.round(estimatedInput * 0.35);
    const costMicro =
      isExecuted && input.runCostMicro != null
        ? input.runCostMicro
        : (computeCostMicro(modelId, inputTokens, outputTokens) ?? 0);
    rows.push({
      modelId,
      provider: info.provider,
      model: info.displayName,
      class: costClass(info.inputPricePerMTokMicro),
      inputTokens,
      outputTokens,
      cost: costMicro / 1_000_000,
      latency: isExecuted && input.runLatencyMs != null ? `${(input.runLatencyMs / 1000).toFixed(1)}s` : "—",
      recommended: modelId === input.recommendedModelId,
    });
  }
  return rows;
}

const RESCUE_SYSTEM_PROMPT = `You are LayerFlow's Rescue engine. A user pasted a conversation (or a prompt) they lost or want to improve.

Your job: compress the essential context into a "Continue Pack" another AI model can pick up instantly, and produce the exact JSON below.

Rules:
- summary: 1-2 sentences on what the work is about.
- improvedPrompt: a rewritten, self-contained prompt (keep the user's voice; add missing context, constraints, format, next steps). THIS is what gets pasted into the next model.
- continuePack: 3-6 {label, value} pairs with the essential context (goal, key decisions, blockers, next action) — terse, copy-paste ready.
- passport: structured context fields extracted from the conversation (leave arrays empty when unknown).
- diff: what you kept / removed / added in improvedPrompt vs the original (keep only 1-2 items per list, terse).
- promptScore: 0-100 how complete the ORIGINAL prompt/conversation is; promptScores: 3-5 {label, value} axes (e.g. Context, Clarity, Constraints, Format).
- recommendedModelId: one of gpt-4o, gpt-4o-mini, claude-3-5-haiku, claude-sonnet-4, gemini-flash-latest, deepseek-chat, grok-3-mini, kimi-k2 best suited to continue this work.
- recommendedReason: one sentence why.

Respond with ONLY valid JSON matching this shape:
{"summary":"","improvedPrompt":"","continuePack":[{"label":"","value":""}],"passport":{"goal":"","currentState":"","decisions":[],"constraints":[],"failures":[],"successes":[],"missingInfo":[],"outputFormat":"","nextAction":""},"diff":{"kept":[],"removed":[],"unsure":[]},"promptScore":0,"promptScores":[{"label":"","value":0}],"recommendedModelId":"","recommendedReason":""}`;

/**
 * Run the rescue pipeline for one report: AI call → structured JSON → persist.
 * Fails the report (with a clear message) when no provider key is available
 * or the model call errors.
 */
export async function processRescue(job: Job<RescueJobPayload>): Promise<void> {
  const { rescueId, workspaceId, userId, content, targetModel } = job.data;

  const report = await db.query.rescueReports.findFirst({
    where: and(eq(rescueReports.id, rescueId), eq(rescueReports.workspaceId, workspaceId)),
  });
  if (!report) {
    logger.warn({ rescueId }, "rescue report missing");
    return;
  }

  await db.update(rescueReports).set({ status: "running" }).where(eq(rescueReports.id, rescueId));

  const model = await pickRescueModel(workspaceId, targetModel);

  try {
    const { run } = await executeRun({
      workspaceId,
      userId: userId ?? "system",
      model,
      source: "rescue",
      messages: [
        { role: "system", content: RESCUE_SYSTEM_PROMPT },
        { role: "user", content },
      ],
      routingReason: "rescue",
      allowRouting: false,
    });

    if (run.status !== "succeeded" || !run.output) {
      throw new Error(run.errorMessage ?? "Rescue run did not produce output");
    }

    const parsed = rescueJsonSchema.parse(JSON.parse(run.output.trim().replace(/^```json\s*/i, "").replace(/```$/g, "")));

    const recommendedModelId = parsed.recommendedModelId && getModel(parsed.recommendedModelId)
      ? parsed.recommendedModelId
      : model;

    const originalWords = report.originalWords || content.trim().split(/\s+/).filter(Boolean).length;
    const compressedWords = parsed.improvedPrompt.trim().split(/\s+/).filter(Boolean).length;
    const compressionPercent =
      originalWords > 0 ? Math.max(0, Math.round(((originalWords - compressedWords) / originalWords) * 100)) : 0;

    const costs = costRows({
      content,
      runModel: run.model,
      runProvider: run.provider,
      runInputTokens: run.inputTokens ?? 0,
      runOutputTokens: run.outputTokens ?? 0,
      runCostMicro: run.costMicro,
      runLatencyMs: run.latencyMs,
      recommendedModelId,
    });

    await db
      .update(rescueReports)
      .set({
        status: "completed",
        sourceModel: run.model,
        errorMessage: null,
        summary: parsed.summary,
        passport: parsed.passport,
        improvedPrompt: parsed.improvedPrompt,
        promptScore: parsed.promptScore ?? null,
        promptScores: parsed.promptScores,
        diff: parsed.diff,
        costs,
        recommendedModelId,
        recommendedReason: parsed.recommendedReason,
        continuePack: parsed.continuePack,
        compressedWords,
        compressionPercent,
        saved: parsed.promptScore != null && parsed.promptScore >= 60 ? 1 : 0,
      })
      .where(eq(rescueReports.id, rescueId));

    await recordActivity({
      workspaceId,
      userId,
      type: "rescue.completed",
      title: `Rescued a chat${report.sourceTool ? ` from ${report.sourceTool}` : ""}`,
      description: parsed.summary,
      meta: { rescueId, summary: parsed.summary, projectId: report.projectId },
    });

    logger.info({ rescueId, model: run.model }, "rescue completed");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Rescue failed";
    await db
      .update(rescueReports)
      .set({ status: "failed", errorMessage: message })
      .where(eq(rescueReports.id, rescueId));
    logger.warn({ rescueId, err: message }, "rescue failed");
    throw err;
  }
}
