import { and, eq } from "drizzle-orm";
import { computeCostMicro } from "@layerflow/model-registry";
import type { RunMessage, RunSource, RunSavings } from "@layerflow/contracts";
import { db } from "../../db/client";
import { promptOutputs, prompts, promptVersions } from "../../db/schema/prompts";
import { runs } from "../../db/schema/runs";
import { AppError } from "../../middleware/app-error";
import {
  loadProviderApiKey,
  resolveProviderFromModel,
  type ChatCompletionResult,
  type ProviderAdapter,
} from "../ai/providers";
import { estimateTokens } from "../intelligence/analyze";
import { getExactCache, hashExactCacheKey, setExactCache } from "../../cache/exact";
import { budgetRelease, budgetReserve, budgetSettle } from "./budget-hook";
import { buildRunSavings, prepareRunCall } from "../savings/prepare";

/** Thrown after a run row has been persisted as failed/blocked. */
export class RunExecutionError extends AppError {
  constructor(
    public readonly run: typeof runs.$inferSelect,
    status: ConstructorParameters<typeof AppError>[0],
    code: string,
    message: string,
  ) {
    super(status, code, message);
  }
}

export interface ExecuteRunInput {
  workspaceId: string;
  userId: string;
  requestId?: string;
  model: string;
  source: RunSource;
  messages?: RunMessage[];
  content?: string;
  promptId?: string;
  promptVersionId?: string;
  routingReason?: string;
  /**
   * When false, keep the requested model (compare legs). Default true so
   * Prefer-cheap / Auto Mode can route playground + gateway-style runs.
   */
  allowRouting?: boolean;
  /**
   * Live token callback. When set and the provider adapter supports true
   * streaming, deltas are forwarded as they arrive and usage comes from the
   * stream's final usage frame. Without adapter stream support the run falls
   * back to the non-streaming call (check `streamed` on the result).
   */
  onDelta?: (text: string) => void | Promise<void>;
  /** Injected adapter for tests (skips real provider + BYOK). */
  adapter?: ProviderAdapter;
  /** Injected API key for tests. */
  apiKey?: string;
  /** Skip exact-match cache (tests). */
  skipCache?: boolean;
}

export interface ExecuteRunResult {
  run: typeof runs.$inferSelect;
  /** True when output was delivered live through onDelta. */
  streamed: boolean;
}

async function resolveMessages(input: ExecuteRunInput): Promise<{
  messages: RunMessage[];
  promptVersionId: string | null;
}> {
  if (input.messages?.length) {
    return { messages: input.messages, promptVersionId: input.promptVersionId ?? null };
  }

  let body = input.content;
  let promptVersionId = input.promptVersionId ?? null;

  if (!body && input.promptVersionId) {
    const version = await db.query.promptVersions.findFirst({
      where: and(
        eq(promptVersions.id, input.promptVersionId),
        eq(promptVersions.workspaceId, input.workspaceId),
      ),
    });
    if (!version) throw new AppError(404, "not_found", "Prompt version not found");
    body = version.body;
    promptVersionId = version.id;
  }

  if (!body && input.promptId) {
    const prompt = await db.query.prompts.findFirst({
      where: and(eq(prompts.id, input.promptId), eq(prompts.workspaceId, input.workspaceId)),
    });
    if (!prompt) throw new AppError(404, "not_found", "Prompt not found");
    if (!prompt.currentVersionId) {
      throw new AppError(400, "no_version", "Prompt has no current version");
    }
    const version = await db.query.promptVersions.findFirst({
      where: and(
        eq(promptVersions.id, prompt.currentVersionId),
        eq(promptVersions.workspaceId, input.workspaceId),
      ),
    });
    if (!version) throw new AppError(404, "not_found", "Current prompt version not found");
    body = version.body;
    promptVersionId = version.id;
  }

  if (!body) {
    throw new AppError(400, "validation_error", "No prompt content to run");
  }

  return {
    messages: [{ role: "user", content: body }],
    promptVersionId,
  };
}

/**
 * Execute a model call: compress → route → cache → reserve budget → provider
 * → persist run (+ optional prompt_outputs) with savings telemetry.
 */
export async function executeRun(input: ExecuteRunInput): Promise<ExecuteRunResult> {
  const { messages: rawMessages, promptVersionId } = await resolveMessages(input);

  const prepared = await prepareRunCall({
    workspaceId: input.workspaceId,
    messages: rawMessages,
    requestedModel: input.model,
    allowRouting: input.allowRouting,
  });

  const model = prepared.model;
  const messages = prepared.messages;
  const routingReason = input.routingReason ?? prepared.routingReason;

  const { provider, adapter: resolvedAdapter } = resolveProviderFromModel(model);
  const adapter = input.adapter ?? resolvedAdapter;

  const textForEstimate = messages.map((m) => m.content).join("\n");
  const estIn = prepared.compress.compressedTokens || estimateTokens(textForEstimate);
  const estOut = prepared.maxTokens
    ? Math.min(prepared.maxTokens, Math.max(64, Math.floor(estIn * 0.5)))
    : Math.min(800, Math.max(120, Math.floor(estIn * 1.5)));
  const estimatedCostMicro = computeCostMicro(model, estIn, estOut) ?? 0;

  const [pending] = await db
    .insert(runs)
    .values({
      workspaceId: input.workspaceId,
      promptVersionId,
      source: input.source,
      provider,
      model,
      status: "pending",
      routingReason,
      requestId: input.requestId,
    })
    .returning();

  const reservation = await budgetReserve({
    workspaceId: input.workspaceId,
    estimatedCostMicro,
    runId: pending.id,
    source: input.source,
  });

  if (reservation.blocked) {
    const [blocked] = await db
      .update(runs)
      .set({
        status: "blocked",
        errorMessage: reservation.reason ?? "Budget exceeded",
      })
      .where(eq(runs.id, pending.id))
      .returning();
    throw new RunExecutionError(
      blocked,
      402,
      "budget_exceeded",
      reservation.reason ?? "Budget exceeded",
    );
  }

  await db.update(runs).set({ status: "running" }).where(eq(runs.id, pending.id));

  // Exact-match response cache (workspace-scoped Redis).
  const cacheKey = hashExactCacheKey({
    model,
    messages,
    max_tokens: prepared.maxTokens,
  });
  if (!input.skipCache) {
    const cached = await getExactCache(input.workspaceId, cacheKey);
    if (cached) {
      let parsed: { content?: string; inputTokens?: number; outputTokens?: number } = {};
      try {
        const body = JSON.parse(cached) as {
          choices?: Array<{ message?: { content?: string } }>;
          usage?: { prompt_tokens?: number; completion_tokens?: number };
          content?: string;
          inputTokens?: number;
          outputTokens?: number;
        };
        parsed = {
          content:
            body.content ??
            body.choices?.[0]?.message?.content ??
            "",
          inputTokens: body.inputTokens ?? body.usage?.prompt_tokens ?? estIn,
          outputTokens: body.outputTokens ?? body.usage?.completion_tokens ?? 0,
        };
      } catch {
        parsed = { content: cached, inputTokens: estIn, outputTokens: 0 };
      }

      const savings: RunSavings = buildRunSavings({
        prepared,
        outputTokens: parsed.outputTokens ?? 0,
        cacheHit: true,
        actualCostMicro: 0,
      });

      const [succeeded] = await db
        .update(runs)
        .set({
          status: "succeeded",
          inputTokens: parsed.inputTokens ?? 0,
          outputTokens: parsed.outputTokens ?? 0,
          costMicro: 0,
          latencyMs: 0,
          output: parsed.content ?? "",
          cacheHit: true,
          savings,
        })
        .where(eq(runs.id, pending.id))
        .returning();

      await budgetSettle({
        workspaceId: input.workspaceId,
        reservationId: reservation.reservationId,
        actualCostMicro: 0,
        runId: succeeded.id,
        provider,
        model,
        source: input.source,
        inputTokens: parsed.inputTokens ?? 0,
        outputTokens: parsed.outputTokens ?? 0,
      });

      if (promptVersionId) {
        await db.insert(promptOutputs).values({
          promptVersionId,
          workspaceId: input.workspaceId,
          runId: succeeded.id,
          provider,
          model,
          body: parsed.content ?? "",
          inputTokens: parsed.inputTokens ?? 0,
          outputTokens: parsed.outputTokens ?? 0,
          costMicro: 0,
        });
      }

      if (input.onDelta && parsed.content) {
        await input.onDelta(parsed.content);
      }

      return { run: succeeded, streamed: Boolean(input.onDelta) };
    }
  }

  let apiKey: string;
  try {
    apiKey = input.apiKey ?? (await loadProviderApiKey(input.workspaceId, provider));
  } catch (err) {
    const message = err instanceof AppError ? err.message : "Missing provider key";
    const code = err instanceof AppError ? err.code : "provider_key_missing";
    const status = err instanceof AppError ? err.status : 400;
    const [failed] = await db
      .update(runs)
      .set({ status: "failed", errorMessage: message })
      .where(eq(runs.id, pending.id))
      .returning();
    await budgetRelease({
      workspaceId: input.workspaceId,
      reservationId: reservation.reservationId,
      runId: pending.id,
    });
    throw new RunExecutionError(failed, status, code, message);
  }

  const providerReq = {
    apiKey,
    model,
    messages,
    ...(prepared.maxTokens != null ? { maxTokens: prepared.maxTokens } : {}),
  };

  const useStream = Boolean(input.onDelta && adapter.chatCompletionStream);
  let result: ChatCompletionResult;
  try {
    if (useStream) {
      result = await adapter.chatCompletionStream!(providerReq, {
        onDelta: input.onDelta!,
      });
    } else {
      result = await adapter.chatCompletion(providerReq);
    }
  } catch (err) {
    const message = err instanceof AppError ? err.message : "Provider call failed";
    const code = err instanceof AppError ? err.code : "provider_error";
    const status = err instanceof AppError ? err.status : 502;
    const [failed] = await db
      .update(runs)
      .set({ status: "failed", errorMessage: message })
      .where(eq(runs.id, pending.id))
      .returning();
    await budgetRelease({
      workspaceId: input.workspaceId,
      reservationId: reservation.reservationId,
      runId: pending.id,
    });
    throw new RunExecutionError(failed, status, code, message);
  }

  const costMicro =
    computeCostMicro(model, result.inputTokens, result.outputTokens) ?? 0;

  const savings = buildRunSavings({
    prepared,
    outputTokens: result.outputTokens,
    cacheHit: false,
    actualCostMicro: costMicro,
  });

  const [succeeded] = await db
    .update(runs)
    .set({
      status: "succeeded",
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      costMicro,
      latencyMs: result.latencyMs,
      output: result.content,
      savings,
    })
    .where(eq(runs.id, pending.id))
    .returning();

  await budgetSettle({
    workspaceId: input.workspaceId,
    reservationId: reservation.reservationId,
    actualCostMicro: costMicro,
    runId: succeeded.id,
    provider,
    model,
    source: input.source,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
  });

  if (!input.skipCache) {
    await setExactCache(
      input.workspaceId,
      cacheKey,
      JSON.stringify({
        content: result.content,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        choices: [{ message: { role: "assistant", content: result.content } }],
        usage: {
          prompt_tokens: result.inputTokens,
          completion_tokens: result.outputTokens,
        },
      }),
    );
  }

  if (promptVersionId) {
    await db.insert(promptOutputs).values({
      promptVersionId,
      workspaceId: input.workspaceId,
      runId: succeeded.id,
      provider,
      model,
      body: result.content,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      costMicro,
    });
  }

  return { run: succeeded, streamed: useStream };
}
