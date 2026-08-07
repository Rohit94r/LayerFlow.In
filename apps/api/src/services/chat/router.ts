import { and, asc, eq, isNull } from "drizzle-orm";
import { computeCostMicro, getModel, type Provider } from "@layerflow/model-registry";
import type { ChatMessageRecord } from "@layerflow/contracts";
import { db } from "../../db/client";
import { aiChatMessages, aiChatSessions } from "../../db/schema/chat";
import { providerKeys } from "../../db/schema/gateway";
import { AppError } from "../../middleware/app-error";
import { decryptSecret } from "../crypto";
import {
  hasProviderKey,
  platformApiKey,
  resolveAdapter,
  type ChatCompletionResult,
  type ProviderAdapter,
} from "../ai/providers";
import { budgetRelease, budgetReserve, budgetSettle } from "../runs/budget-hook";
import {
  isKeyUsable,
  listKeyHealth,
  markKeyFailed,
  markKeyHealthy,
} from "./health";
import {
  countSessionMessages,
  insertChatMessage,
  toMessageDto,
  touchChatSession,
  updateChatMessage,
} from "./store";

/**
 * Chat model failover chain. The first model whose provider has a usable key
 * (workspace BYOK or platform env fallback) wins; when a key dies mid-thread
 * the router moves down the chain — "your key expired, your conversation
 * didn't". Cheapest/fastest capable models are preferred so auto-switching
 * never surprises the user with a flagship bill.
 */
export const CHAT_MODEL_PRIORITY: { model: string; provider: Provider }[] = [
  { model: "gpt-4o-mini", provider: "openai" },
  { model: "gemini-2.5-flash", provider: "google" },
  { model: "llama-3.3-70b-versatile", provider: "groq" },
  { model: "grok-3-mini", provider: "xai" },
  { model: "deepseek-chat", provider: "deepseek" },
  { model: "kimi-k2", provider: "kimi" },
];

const MAX_CHAT_OUTPUT_TOKENS = 2048;
const HISTORY_WINDOW = 40;

/** Short human reason for a failed provider attempt. */
function reasonForStatus(status: number): string {
  if (status === 401 || status === 403) return "the key was invalid";
  if (status === 429) return "the provider rate-limited the key";
  if (status === 402) return "the key hit its quota";
  return "the provider had an error";
}

export interface ChatRunEvent {
  type: "start" | "delta" | "switched" | "done" | "error";
  messageId?: string;
  model?: string;
  provider?: string;
  keyHint?: string | null;
  text?: string;
  fromModel?: string;
  toModel?: string;
  reason?: string;
  code?: string;
  /** For error events: the message text. */
  message?: string;
  /** For done events: the persisted assistant message. */
  reply?: ChatMessageRecord;
}

interface KeyPayload {
  keyId: string | null;
  keyHint: string;
  source: "byok" | "platform";
  apiKey: () => Promise<string>;
}

/**
 * Choose the model for a chat turn:
 * explicit user pick > session default > first provider with a usable key.
 * Returns undefined when no provider is configured at all.
 */
export async function pickChatModel(
  workspaceId: string,
  opts: { userModel?: string; defaultModel?: string | null } = {},
): Promise<string | undefined> {
  if (opts.userModel) {
    const info = getModel(opts.userModel);
    if (info && (await hasProviderKey(workspaceId, info.provider))) return opts.userModel;
  }
  if (opts.defaultModel) {
    const info = getModel(opts.defaultModel);
    if (info && (await hasProviderKey(workspaceId, info.provider))) return opts.defaultModel;
  }
  for (const cand of CHAT_MODEL_PRIORITY) {
    if (!getModel(cand.model)) continue;
    if (await hasProviderKey(workspaceId, cand.provider)) return cand.model;
  }
  return undefined;
}

/** Usable keys for one provider: healthy BYOK keys first, then platform env key. */
async function buildCandidates(workspaceId: string, provider: Provider): Promise<KeyPayload[]> {
  const rows = await db.query.providerKeys.findMany({
    where: and(
      eq(providerKeys.workspaceId, workspaceId),
      eq(providerKeys.provider, provider),
      isNull(providerKeys.revokedAt),
    ),
  });
  const healthRows = await listKeyHealth(workspaceId);
  const healthByHint = new Map(healthRows.map((h) => [h.keyHint, h]));

  const candidates: KeyPayload[] = [];
  for (const row of rows) {
    if (!isKeyUsable(healthByHint.get(row.keyHint))) continue;
    candidates.push({
      keyId: row.id,
      keyHint: row.keyHint,
      source: "byok",
      apiKey: async () => decryptSecret(row.ciphertext),
    });
  }

  const platform = platformApiKey(provider);
  if (platform && isKeyUsable(healthByHint.get(`platform:${provider}`))) {
    candidates.push({
      keyId: null,
      keyHint: `platform:${provider}`,
      source: "platform",
      apiKey: async () => platform,
    });
  }
  return candidates;
}

/**
 * One provider call with key-health bookkeeping. Throws the original error
 * (after recording it) so the caller can try the next key / provider.
 */
async function runSingleCall(input: {
  workspaceId: string;
  provider: Provider;
  model: string;
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  adapter: ProviderAdapter;
  payload: KeyPayload;
  onDelta: (text: string) => void | Promise<void>;
}): Promise<ChatCompletionResult> {
  const { workspaceId, provider, model, messages, adapter, payload, onDelta } = input;
  const identity = {
    workspaceId,
    provider,
    keyId: payload.keyId,
    keyHint: payload.keyHint,
  };

  let apiKey: string;
  try {
    apiKey = await payload.apiKey();
  } catch {
    await markKeyFailed(identity, { statusCode: 500, code: "key_decrypt_failed" });
    throw new AppError(500, "key_decrypt_failed", "Could not decrypt the API key for this provider");
  }

  const req = { model, messages, apiKey, maxTokens: MAX_CHAT_OUTPUT_TOKENS };

  try {
    let result: ChatCompletionResult;
    if (adapter.chatCompletionStream) {
      result = await adapter.chatCompletionStream(req, {
        onDelta: (text) => void onDelta(text),
      });
    } else {
      result = await adapter.chatCompletion(req);
      if (result.content) await onDelta(result.content);
    }
    await markKeyHealthy(identity);
    return result;
  } catch (err) {
    const status = err instanceof AppError ? err.status : 502;
    const code = err instanceof AppError ? err.code : "provider_error";
    await markKeyFailed(identity, {
      statusCode: status,
      code,
      cooldownSeconds: status === 429 ? 60 : undefined,
    });
    throw err;
  }
}

/**
 * Run one chat turn: persist the user message, pick a model, try each usable
 * key (and each provider in the failover chain) with budget + key-health
 * bookkeeping, then persist the assistant reply. Events stream via onEvent.
 */
export async function runChatMessage(input: {
  workspaceId: string;
  sessionId: string;
  content: string;
  userModel?: string;
  autoSwitch?: boolean;
  onEvent: (event: ChatRunEvent) => void | Promise<void>;
}): Promise<void> {
  const { workspaceId, sessionId, content } = input;

  const session = await db.query.aiChatSessions.findFirst({
    where: and(eq(aiChatSessions.id, sessionId), eq(aiChatSessions.workspaceId, workspaceId)),
  });
  if (!session) throw new AppError(404, "not_found", "Chat session not found");

  // The user turn lands immediately so the UI can render it while the model works.
  const count = await countSessionMessages(sessionId);
  await insertChatMessage({ sessionId, role: "user", content });
  await touchChatSession(sessionId, {
    title: count === 0 ? content.slice(0, 48) : undefined,
  });

  const autoSwitch = input.autoSwitch ?? session.autoSwitch;
  const chosenModel = await pickChatModel(workspaceId, {
    userModel: input.userModel,
    defaultModel: session.defaultModel,
  });
  if (!chosenModel) {
    const failed = await insertChatMessage({
      sessionId,
      role: "assistant",
      content: "",
      errorCode: "no_provider",
      errorMessage:
        "No AI provider key is configured. Add one under Models → BYOK Vault, then send again.",
    });
    await input.onEvent({
      type: "error",
      code: "no_provider",
      message: "No AI provider key is configured. Add one under Models → BYOK Vault.",
    });
    void failed;
    return;
  }

  const chosenProvider = getModel(chosenModel)!.provider;

  // Provider context: the last N user/assistant turns (imports arrive as user messages).
  const allMessages = await db.query.aiChatMessages.findMany({
    where: eq(aiChatMessages.sessionId, sessionId),
    orderBy: [asc(aiChatMessages.createdAt)],
  });
  const history = allMessages
    .filter((m) => m.role === "user" || (m.role === "assistant" && m.content.length > 0))
    .slice(-HISTORY_WINDOW)
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  const estInput =
    Math.ceil(history.reduce((a, m) => a + m.content.length, 0) / 4) +
    Math.ceil(content.length / 4);
  const estimateCost = computeCostMicro(chosenModel, estInput, MAX_CHAT_OUTPUT_TOKENS) ?? 50_000;

  // Stable row for the streaming reply; updated in place when a call succeeds.
  const assistantMessage = await insertChatMessage({ sessionId, role: "assistant", content: "" });

  const reservation = await budgetReserve({
    workspaceId,
    estimatedCostMicro: estimateCost,
    source: "chat",
  });
  if (reservation.blocked) {
    await updateChatMessage(assistantMessage.id, {
      errorCode: "budget_exceeded",
      errorMessage: reservation.reason ?? "Budget exceeded",
    });
    throw new AppError(402, "budget_exceeded", reservation.reason ?? "Budget exceeded");
  }

  // Failover chain: the chosen provider first, then the priority order.
  const chain = autoSwitch
    ? [
        ...CHAT_MODEL_PRIORITY.filter((c) => c.model === chosenModel),
        ...CHAT_MODEL_PRIORITY.filter((c) => c.model !== chosenModel),
      ]
    : CHAT_MODEL_PRIORITY.filter((c) => c.model === chosenModel);

  let lastError: { status: number; code: string; message: string } | null = null;

  for (const choice of chain) {
    if (!getModel(choice.model)) continue;
    const candidates = await buildCandidates(workspaceId, choice.provider);
    if (candidates.length === 0) continue;

    await input.onEvent({
      type: "start",
      messageId: assistantMessage.id,
      model: choice.model,
      provider: choice.provider,
      keyHint: candidates[0].keyHint,
    });

    for (const payload of candidates) {
      try {
        const result = await runSingleCall({
          workspaceId,
          provider: choice.provider,
          model: choice.model,
          messages: history,
          adapter: resolveAdapter(choice.provider),
          payload,
          onDelta: (text) => input.onEvent({ type: "delta", text }),
        });

        const costMicro =
          computeCostMicro(choice.model, result.inputTokens, result.outputTokens) ?? 0;

        const switchedFrom =
          choice.model !== chosenModel
            ? {
                fromModel: chosenModel,
                toModel: choice.model,
                reason: lastError ? reasonForStatus(lastError.status) : "key unavailable",
              }
            : undefined;

        const row = await updateChatMessage(assistantMessage.id, {
          content: result.content,
          model: choice.model,
          provider: choice.provider,
          keyHint: payload.keyHint,
          keyId: payload.keyId,
          tokensIn: result.inputTokens,
          tokensOut: result.outputTokens,
          costMicro,
          latencyMs: result.latencyMs,
          switchedFrom: switchedFrom ?? null,
        });

        await budgetSettle({
          workspaceId,
          reservationId: reservation.reservationId,
          actualCostMicro: costMicro,
          runId: assistantMessage.id,
          provider: choice.provider,
          model: choice.model,
          source: "chat",
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
        });

        if (switchedFrom) {
          await insertChatMessage({
            sessionId,
            role: "system",
            content: `Heads-up: ${getModel(chosenModel)?.displayName ?? chosenModel} was unavailable (${switchedFrom.reason}). I switched this conversation to ${getModel(choice.model)?.displayName ?? choice.model} — nothing is lost. You can change it anytime.`,
          });
          await input.onEvent({
            type: "switched",
            fromModel: chosenModel,
            toModel: choice.model,
            reason: switchedFrom.reason,
          });
        }

        await touchChatSession(sessionId, {});
        await input.onEvent({ type: "done", reply: toMessageDto(row) });
        return;
      } catch (err) {
        lastError = {
          status: err instanceof AppError ? err.status : 502,
          code: err instanceof AppError ? err.code : "provider_error",
          message: err instanceof Error ? err.message : "Provider call failed",
        };
        // Only surface network-level failures as error events; key-health
        // failures are expected during failover and will be explained by the
        // switch notice if a fallback succeeds.
        if (!autoSwitch) {
          await input.onEvent({ type: "error", code: lastError.code, message: lastError.message });
        }
      }
    }
  }

  // Every provider/key failed.
  const finalCode = lastError?.code ?? "no_key_usable";
  const finalMessage =
    lastError?.message ??
    "All providers failed — no usable key could answer this message.";
  await updateChatMessage(assistantMessage.id, {
    errorCode: finalCode,
    errorMessage: finalMessage,
  });
  await budgetRelease({
    workspaceId,
    reservationId: reservation.reservationId,
    runId: assistantMessage.id,
  });
  await input.onEvent({ type: "error", code: finalCode, message: finalMessage });
}