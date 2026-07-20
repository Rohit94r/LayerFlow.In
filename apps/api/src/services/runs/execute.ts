import { and, eq } from "drizzle-orm";
import { computeCostMicro } from "@layerflow/model-registry";
import type { RunMessage, RunSource } from "@layerflow/contracts";
import { db } from "../../db/client";
import { promptOutputs, prompts, promptVersions } from "../../db/schema/prompts";
import { runs } from "../../db/schema/runs";
import { AppError } from "../../middleware/app-error";
import {
  loadProviderApiKey,
  resolveProviderFromModel,
  type ChatCompletionResult,
  type ProviderAdapter,
} from "../../providers";
import { estimateTokens } from "../../intelligence/analyze";
import { budgetRelease, budgetReserve, budgetSettle } from "./budget-hook";

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
 * Execute a non-streaming model call: reserve budget → provider → persist run
 * (+ optional prompt_outputs).
 */
export async function executeRun(input: ExecuteRunInput): Promise<ExecuteRunResult> {
  const { provider, adapter: resolvedAdapter } = resolveProviderFromModel(input.model);
  const adapter = input.adapter ?? resolvedAdapter;
  const { messages, promptVersionId } = await resolveMessages(input);

  const textForEstimate = messages.map((m) => m.content).join("\n");
  const estIn = estimateTokens(textForEstimate);
  const estOut = Math.min(800, Math.max(120, Math.floor(estIn * 1.5)));
  const estimatedCostMicro = computeCostMicro(input.model, estIn, estOut) ?? 0;

  const [pending] = await db
    .insert(runs)
    .values({
      workspaceId: input.workspaceId,
      promptVersionId,
      source: input.source,
      provider,
      model: input.model,
      status: "pending",
      routingReason: input.routingReason,
      requestId: input.requestId,
    })
    .returning();

  // BUDGET_HOOK: call reserve/settle here
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

  const useStream = Boolean(input.onDelta && adapter.chatCompletionStream);
  let result: ChatCompletionResult;
  try {
    if (useStream) {
      result = await adapter.chatCompletionStream!(
        { apiKey, model: input.model, messages },
        { onDelta: input.onDelta! },
      );
    } else {
      result = await adapter.chatCompletion({
        apiKey,
        model: input.model,
        messages,
      });
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
    computeCostMicro(input.model, result.inputTokens, result.outputTokens) ?? 0;

  const [succeeded] = await db
    .update(runs)
    .set({
      status: "succeeded",
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      costMicro,
      latencyMs: result.latencyMs,
      output: result.content,
    })
    .where(eq(runs.id, pending.id))
    .returning();

  // BUDGET_HOOK: call reserve/settle here
  await budgetSettle({
    workspaceId: input.workspaceId,
    reservationId: reservation.reservationId,
    actualCostMicro: costMicro,
    runId: succeeded.id,
    provider,
    model: input.model,
    source: input.source,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
  });

  if (promptVersionId) {
    await db.insert(promptOutputs).values({
      promptVersionId,
      workspaceId: input.workspaceId,
      runId: succeeded.id,
      provider,
      model: input.model,
      body: result.content,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      costMicro,
    });
  }

  return { run: succeeded, streamed: useStream };
}
