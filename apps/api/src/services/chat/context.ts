import { createHash } from "node:crypto";
import { and, asc, eq, isNull } from "drizzle-orm";
import { getModel, resolveProvider, type Provider } from "@layerflow/model-registry";
import type { ChatMessage } from "../ai/providers";
import { platformApiKey, resolveAdapter } from "../ai/providers";
import { db } from "../../db/client";
import { aiChatMessages, aiChatSessions, type AiChatMessageRow } from "../../db/schema/chat";
import { providerKeys } from "../../db/schema/gateway";
import { decryptSecret } from "../crypto";
import { estimateTokens } from "../intelligence/analyze";
import { redis } from "../../redis/client";
import { isKeyUsable, listKeyHealth, platformKeyHealth } from "./health";
import { providerSystemPrompt, tokenBudgetForModel } from "./prompts";
import { cleanupText } from "../savings/compress";
import { searchMemories } from "../memory/memory";
import type { MemorySearchHit } from "@layerflow/contracts";

/**
 * Chat context builder — 100% provider isolation for multi-model switching.
 *
 * Every turn the message array is rebuilt from stored rows ONLY:
 *   system prompt (provider-specific) + recent user/assistant messages +
 *   optional summarized older history + optional rescue context.
 * Provider/model metadata lives on the DB rows but is NEVER injected into the
 * request. The selected provider is therefore the only source of generation
 * for that request — no residual GPT reasoning style after a DeepSeek switch.
 */

/** The last N messages are always kept verbatim. */
export const RECENT_MESSAGES = 8;

/** Hard cap for an LLM-written history summary (keeps the memory block short). */
export const SUMMARY_MAX_TOKENS = 200;

/** How long a summarized-history block stays cached in Redis (7 days). */
const SUMMARY_TTL_SECONDS = 7 * 24 * 60 * 60;

const SUMMARY_SYSTEM_PROMPT =
  "You are a conversation-compression utility. Distill the EARLIER part of a " +
  "conversation into a short memory block for the model that continues it. " +
  "Keep the goal, the key facts, decisions, and any unresolved asks. Write in " +
  "2–4 sentences, third person, no preamble.";

/** Router "Heads-up:" switch notices are user-facing UI, not model context. */
function isUiNotice(content: string): boolean {
  return content.startsWith("Heads-up:");
}

/**
 * Stored rows → clean ChatMessage[]. Drops UI notices and empty/failed
 * assistant drafts; copies only `role` + `content` (never provider/model).
 */
export function normalizeStoredMessages(rows: AiChatMessageRow[]): ChatMessage[] {
  const out: ChatMessage[] = [];
  for (const row of rows) {
    if (row.role === "system") {
      if (isUiNotice(row.content)) continue;
      out.push({ role: "system", content: row.content });
      continue;
    }
    if (row.role === "assistant" && row.content.length === 0) continue;
    out.push({ role: row.role as "user" | "assistant", content: row.content });
  }
  return out;
}

export function splitRecent(
  messages: ChatMessage[],
  keep = RECENT_MESSAGES,
): { recent: ChatMessage[]; older: ChatMessage[] } {
  if (messages.length <= keep) return { recent: messages, older: [] };
  const older = messages.slice(0, messages.length - keep);
  const recent = messages.slice(messages.length - keep);
  return { recent, older };
}

function joinedTokens(messages: ChatMessage[]): number {
  return estimateTokens(messages.map((m) => m.content).join("\n"));
}

/**
 * Pure budget trimmer. Never drops the final message (the just-persisted user
 * turn); drops the oldest non-system message first, then truncates the oldest
 * remaining message only when still over budget.
 */
export function trimContext(
  messages: ChatMessage[],
  budgetTokens: number,
): ChatMessage[] {
  let out = messages.map((m) => ({ ...m, content: cleanupText(m.content) }));
  if (out.length === 0) return out;

  let guard = 0;
  while (joinedTokens(out) > budgetTokens && out.length > 1 && guard < 64) {
    const dropIdx = out.findIndex((m, i) => i < out.length - 1 && m.role !== "system");
    if (dropIdx < 0) break;
    out = out.filter((_, i) => i !== dropIdx);
    guard += 1;
  }

  guard = 0;
  while (joinedTokens(out) > budgetTokens && out.length > 1 && guard < 32) {
    const idx = out.findIndex(
      (m, i) => i < out.length - 1 && m.content.length > 60,
    );
    if (idx < 0) break;
    const nextLen = Math.max(60, Math.floor(out[idx]!.content.length * 0.5));
    out = out.map((m, i) =>
      i === idx
        ? {
            ...m,
            content: `${m.content.slice(0, nextLen).replace(/\s+\S*$/, "")}…`,
          }
        : m,
    );
    guard += 1;
  }
  return out;
}

// ── Redis context cache (summarized history ONLY — never model responses) ──

async function getContextCache(key: string): Promise<string | null> {
  try {
    if (redis.status !== "ready") await redis.connect().catch(() => undefined);
    return await redis.get(key);
  } catch {
    return null;
  }
}

async function setContextCache(key: string, value: string, ttlSeconds: number): Promise<void> {
  try {
    if (redis.status !== "ready") await redis.connect().catch(() => undefined);
    await redis.set(key, value, "EX", ttlSeconds);
  } catch {
    // Best-effort — a down cache must never fail the chat.
  }
}

// ── Summarized older history ──────────────────────────────────────────────

/** First usable (healthy, non-revoked) key for a provider — BYOK then platform. */
export async function resolveFirstChatKey(
  workspaceId: string,
  provider: Provider,
): Promise<string | null> {
  const rows = await db.query.providerKeys.findMany({
    where: and(
      eq(providerKeys.workspaceId, workspaceId),
      eq(providerKeys.provider, provider),
      isNull(providerKeys.revokedAt),
    ),
  });
  const healthByHint = new Map((await listKeyHealth(workspaceId)).map((h) => [h.keyHint, h]));
  for (const row of rows) {
    if (!isKeyUsable(healthByHint.get(row.keyHint))) continue;
    try {
      return await decryptSecret(row.ciphertext);
    } catch {
      continue;
    }
  }
  const platform = platformApiKey(provider);
  if (platform && isKeyUsable(await platformKeyHealth(provider))) return platform;
  return null;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms),
    ),
  ]);
}

/** Best-effort LLM summary of the older messages, using the selected provider. */
export async function summarizeOlderMessages(input: {
  workspaceId: string;
  sessionId: string;
  older: ChatMessage[];
  provider: Provider;
  model: string;
}): Promise<string | null> {
  const apiKey = await resolveFirstChatKey(input.workspaceId, input.provider);
  if (!apiKey) return null;
  const adapter = resolveAdapter(input.provider);
  const body = input.older.map((m) => `${m.role}: ${m.content}`).join("\n\n");
  if (body.length === 0) return null;
  try {
    const result = await withTimeout(
      adapter.chatCompletion({
        model: input.model,
        messages: [
          { role: "system", content: SUMMARY_SYSTEM_PROMPT },
          { role: "user", content: body },
        ],
        apiKey,
        maxTokens: SUMMARY_MAX_TOKENS,
        temperature: 0.3,
      }),
      6_000,
    );
    const summary = result.content.trim();
    if (summary.length < 20) return null;
    return `[Earlier conversation: ${summary}]`;
  } catch {
    // Summarization is optional — never fail the chat because of it.
    return null;
  }
}

/**
 * Cached history summary: keyed by a hash of the summarized text so repeated
 * turns (and model switches) reuse the same block instead of re-summarizing.
 */
export async function getOrCreateHistorySummary(input: {
  workspaceId: string;
  sessionId: string;
  older: ChatMessage[];
  provider: Provider;
  model: string;
}): Promise<string | null> {
  const text = input.older.map((m) => `${m.role}: ${m.content}`).join("\n");
  const keyHash = createHash("sha256").update(text).digest("hex");
  const redisKey = `chat:summary:${input.workspaceId}:${keyHash}`;

  const cached = await getContextCache(redisKey);
  if (cached) return cached;

  const summary = await summarizeOlderMessages(input);
  if (!summary) return null;

  await setContextCache(redisKey, summary, SUMMARY_TTL_SECONDS);
  return summary;
}

// ── Semantic / keyword memory retrieval (retrieval cache only) ──────────────

/** Max memories injected into a chat request. */
export const MEMORY_LIMIT = 3;

/** In-process retrieval cache TTL — repeated turns never re-embed the same query. */
const MEMORY_CACHE_TTL_MS = 30_000;

const memoryCache = new Map<string, { at: number; text: string | null }>();

/** One-sentence-per-hit memory block injected as a system message. */
export function formatMemoryContext(hits: MemorySearchHit[]): string {
  const lines = hits.map((h) => {
    const m = h.memory;
    const head = m.title ? `${m.title}: ` : "";
    return `- ${head}${m.body}`;
  });
  return `Relevant memory for this conversation:\n${lines.join("\n")}`;
}

/**
 * Retrieve up to `MEMORY_LIMIT` relevant memories for a chat turn (hybrid:
 * semantic + keyword). Best-effort — never throws, never fails the chat;
 * an in-process TTL cache keeps the embedding/search work to one pass per
 * unique user message. ONLY memories are cached here, never model responses.
 */
export async function retrieveMemoryContext(input: {
  workspaceId: string;
  query: string;
}): Promise<string | null> {
  const { workspaceId, query } = input;
  if (!query.trim()) return null;
  const cacheKey = `${workspaceId}:${createHash("sha256").update(query).digest("hex")}`;
  const cached = memoryCache.get(cacheKey);
  if (cached && Date.now() - cached.at < MEMORY_CACHE_TTL_MS) return cached.text;

  let text: string | null = null;
  try {
    const { results } = await searchMemories(workspaceId, query, MEMORY_LIMIT);
    if (results.length > 0) text = formatMemoryContext(results);
  } catch {
    text = null;
  }

  memoryCache.set(cacheKey, { at: Date.now(), text });
  return text;
}

// ── Public API ────────────────────────────────────────────────────────────

export interface BuildMessagesInput {
  workspaceId: string;
  sessionId: string;
  model: string;
}

export interface BuildMessagesDeps {
  /** Test seam — replaces the LLM summarizer. */
  summarize?: typeof getOrCreateHistorySummary;
  /** Test seam — replaces semantic/keyword memory retrieval. */
  retrieveMemory?: (input: { workspaceId: string; query: string }) => Promise<string | null>;
}

/** The AI-summary fields injected into chat context (kept in sync with rescue). */
const RESCUE_CONTEXT_FIELDS: Array<[string, string]> = [
  ["goal", "Goal"],
  ["currentState", "Current state"],
  ["decisions", "Decisions"],
  ["constraints", "Constraints"],
  ["failures", "Failures"],
  ["successes", "Successes"],
  ["missingInfo", "Missing info"],
  ["outputFormat", "Output format"],
  ["nextAction", "Next action"],
];

/**
 * AI-generated conversation summary from a rescue import — injected verbatim
 * as a system message so the model can answer with full project context.
 */
export function formatConversationContext(context: Record<string, unknown>): string | null {
  if (!context || typeof context !== "object") return null;
  const lines: string[] = [];
  for (const [key, label] of RESCUE_CONTEXT_FIELDS) {
    const value = context[key];
    if (value == null) continue;
    const text = Array.isArray(value)
      ? value.map((v) => `- ${String(v)}`).join("\n")
      : String(value).trim();
    if (!text) continue;
    lines.push(`${label}: ${text}`);
  }
  if (lines.length === 0) return null;
  return `Project context (conversation summary):\n${lines.join("\n")}`;
}

/**
 * Rebuild a clean provider request from stored messages:
 *   [provider system prompt] → [summarized older history] →
 *   [retrieved memory] → [session context] → [rescue/system context] →
 *   [last 8 messages].
 * Token-budgeted (4k cheap / 8k premium), provider metadata stripped.
 */
export async function buildMessages(
  input: BuildMessagesInput,
  deps: BuildMessagesDeps = {},
): Promise<ChatMessage[]> {
  const { workspaceId, sessionId, model } = input;
  const info = getModel(model);
  const provider = (info?.provider ?? resolveProvider(model) ?? "openai") as Provider;

  const rows = await db.query.aiChatMessages.findMany({
    where: eq(aiChatMessages.sessionId, sessionId),
    orderBy: [asc(aiChatMessages.createdAt)],
  });

  const session = await db.query.aiChatSessions.findFirst({
    where: and(eq(aiChatSessions.id, sessionId), eq(aiChatSessions.workspaceId, workspaceId)),
  });

  const normalized = normalizeStoredMessages(rows);
  const { recent, older } = splitRecent(normalized, RECENT_MESSAGES);

  const summarize = deps.summarize ?? getOrCreateHistorySummary;
  const summary =
    older.length > 0
      ? await summarize({ workspaceId, sessionId, older, provider, model })
      : null;

  // Retrieve relevant workspace memory against the newest user turn.
  const retrieveMemory = deps.retrieveMemory ?? retrieveMemoryContext;
  const lastUser = [...recent].reverse().find((m) => m.role === "user") ?? recent[recent.length - 1];
  const memory =
    recent.length > 0 && lastUser
      ? await retrieveMemory({ workspaceId, query: lastUser.content })
      : null;

  // Full portable context (not just the seeded goal/next-action note).
  const context = session?.context && Object.keys(session.context).length > 0
    ? formatConversationContext(session.context as Record<string, unknown>)
    : null;

  const budget = tokenBudgetForModel(model);
  const base: ChatMessage[] = [];
  if (summary) base.push({ role: "system", content: summary });
  if (memory) base.push({ role: "system", content: memory });
  // Passport BEFORE the recent turns so the last message stays closest to the
  // question; must survive trimming, so it lands right after memory too.
  if (context) base.push({ role: "system", content: context });
  base.push(...recent);

  const trimmed = trimContext(base, budget);
  return [{ role: "system", content: providerSystemPrompt(provider) }, ...trimmed];
}
