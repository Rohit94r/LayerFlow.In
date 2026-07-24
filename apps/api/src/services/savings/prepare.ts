import { and, eq } from "drizzle-orm";
import type { ExecutionMode, RunMessage, RunSavings } from "@layerflow/contracts";
import type { RoutingRuleConfig } from "@layerflow/contracts";
import { db } from "../../db/client";
import { routingRules, workspaceSettings } from "../../db/schema/intelligence";
import { routeModel } from "../../intelligence/route";
import { estimateTokens } from "../../intelligence/analyze";
import { getSavingsEnv } from "../../config/savings-env";
import { compressMessages, type CompressResult } from "./compress";
import { estimateRunSavings } from "./estimate";

export interface WorkspaceSavingsSettings {
  executionMode: ExecutionMode;
  preferCheap: boolean;
  tokenSaver: boolean;
  defaultModel: string;
}

export interface PreparedRunCall {
  messages: RunMessage[];
  model: string;
  requestedModel: string;
  routingReason: string | null;
  maxTokens: number | undefined;
  compress: CompressResult;
  settings: WorkspaceSavingsSettings;
  /** True when Prefer-cheap / Auto / tokenSaver should bias short answers. */
  shortAnswers: boolean;
}

export async function loadWorkspaceSavingsSettings(
  workspaceId: string,
): Promise<WorkspaceSavingsSettings> {
  const row = await db.query.workspaceSettings.findFirst({
    where: eq(workspaceSettings.workspaceId, workspaceId),
  });
  return {
    executionMode: (row?.executionMode ?? "suggest") as ExecutionMode,
    preferCheap: row?.preferCheap ?? false,
    tokenSaver: row?.tokenSaver ?? false,
    defaultModel: row?.defaultModel ?? "gpt-4o-mini",
  };
}

async function loadRoutingRules(workspaceId: string) {
  const rules = await db.query.routingRules.findMany({
    where: and(eq(routingRules.workspaceId, workspaceId), eq(routingRules.enabled, true)),
  });
  return rules.map((r) => ({
    id: r.id,
    condition: r.condition,
    conditionConfig: r.conditionConfig as RoutingRuleConfig | null,
    targetModel: r.targetModel,
    priority: r.priority,
    enabled: r.enabled,
  }));
}

/**
 * Apply compression + optional Prefer-cheap / Auto routing + short-answer max_tokens
 * before a provider call (runs + gateway).
 */
export async function prepareRunCall(args: {
  workspaceId: string;
  messages: RunMessage[];
  requestedModel: string;
  /** When false, never override the model (e.g. explicit compare legs). */
  allowRouting?: boolean;
  /** Pre-loaded settings (avoids extra query when caller already has them). */
  settings?: WorkspaceSavingsSettings;
}): Promise<PreparedRunCall> {
  const env = getSavingsEnv();
  const settings = args.settings ?? (await loadWorkspaceSavingsSettings(args.workspaceId));
  const shortAnswers = settings.preferCheap || settings.tokenSaver;
  const shouldCompress =
    settings.tokenSaver ||
    settings.preferCheap ||
    estimateTokens(args.messages.map((m) => m.content).join("\n")) > env.inputBudgetTokens;

  const compress = shouldCompress
    ? compressMessages(args.messages, {
        keepLastTurns: env.keepLastTurns,
        inputBudgetTokens: env.inputBudgetTokens,
      })
    : {
        messages: args.messages,
        originalTokens: estimateTokens(args.messages.map((m) => m.content).join("\n")),
        compressedTokens: estimateTokens(args.messages.map((m) => m.content).join("\n")),
        tokensSaved: 0,
        applied: false,
        method: "none" as const,
      };

  // TOKEN_SAVER_SUMMARY=true is reserved for a future cheap-model summary of
  // older turns; deterministic truncation already reduces tokens today.
  if (env.enableLlmSummary && compress.method === "truncate") {
    // no-op until summarizer ships
  }

  let model = args.requestedModel;
  let routingReason: string | null = null;
  const allowRouting = args.allowRouting !== false;
  const shouldRoute =
    allowRouting &&
    (settings.preferCheap || settings.executionMode.startsWith("auto-"));

  if (shouldRoute) {
    const rules = await loadRoutingRules(args.workspaceId);
    const content = compress.messages.map((m) => m.content).join("\n");
    const routed = routeModel({
      content,
      requestedModel: args.requestedModel,
      executionMode: settings.preferCheap && !settings.executionMode.startsWith("auto-")
        ? "auto-cheapest"
        : settings.executionMode,
      preferCheap: settings.preferCheap,
      defaultModel: settings.defaultModel,
      rules,
    });
    model = routed.model;
    routingReason = routed.explanation;
  }

  const maxTokens = shortAnswers ? env.shortMaxTokens : undefined;

  return {
    messages: compress.messages,
    model,
    requestedModel: args.requestedModel,
    routingReason,
    maxTokens,
    compress,
    settings,
    shortAnswers,
  };
}

/** Build the persisted / API savings object after the call completes. */
export function buildRunSavings(args: {
  prepared: PreparedRunCall;
  outputTokens: number;
  cacheHit?: boolean;
  actualCostMicro?: number;
}): RunSavings {
  return estimateRunSavings({
    originalInputTokens: args.prepared.compress.originalTokens,
    compressedInputTokens: args.prepared.compress.compressedTokens,
    outputTokens: args.outputTokens,
    modelUsed: args.prepared.model,
    expensiveAlternative:
      args.prepared.requestedModel !== args.prepared.model
        ? args.prepared.requestedModel
        : null,
    cacheHit: args.cacheHit,
    compressionApplied: args.prepared.compress.applied,
    maxTokensCapped: args.prepared.maxTokens ?? null,
    actualCostMicro: args.actualCostMicro,
  });
}
