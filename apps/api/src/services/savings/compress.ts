import type { RunMessage } from "@layerflow/contracts";
import { estimateTokens } from "../intelligence/analyze";

export interface CompressOptions {
  /** Keep the last N non-system messages fully intact. Default 4. */
  keepLastTurns?: number;
  /** Soft input token budget before older context is truncated. Default 6000. */
  inputBudgetTokens?: number;
  /** Max chars kept per truncated older message. Default 240. */
  olderMaxChars?: number;
}

export interface CompressResult {
  messages: RunMessage[];
  originalTokens: number;
  compressedTokens: number;
  tokensSaved: number;
  applied: boolean;
  method: "none" | "cleanup" | "truncate";
}

/** Collapse redundant whitespace / repeated blank lines without changing meaning. */
export function cleanupText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function tokensForMessages(messages: RunMessage[]): number {
  return estimateTokens(messages.map((m) => m.content).join("\n"));
}

function truncateMessage(msg: RunMessage, maxChars: number): RunMessage {
  const cleaned = cleanupText(msg.content);
  if (cleaned.length <= maxChars) return { ...msg, content: cleaned };
  const slice = cleaned.slice(0, maxChars).replace(/\s+\S*$/, "").trimEnd();
  return {
    ...msg,
    content: `${slice}…\n[truncated]`,
  };
}

/**
 * Deterministic prompt/history compression:
 * 1. Light whitespace cleanup on every message
 * 2. When over budget, keep last N turns full; shrink older messages
 * 3. If still over, progressively shrink the oldest kept messages
 *
 * No LLM call — always reduces tokens immediately when history is large.
 */
export function compressMessages(
  input: RunMessage[],
  opts: CompressOptions = {},
): CompressResult {
  const keepLastTurns = opts.keepLastTurns ?? 4;
  const inputBudgetTokens = opts.inputBudgetTokens ?? 6000;
  const olderMaxChars = opts.olderMaxChars ?? 240;

  const originalTokens = tokensForMessages(input);
  if (input.length === 0) {
    return {
      messages: [],
      originalTokens: 0,
      compressedTokens: 0,
      tokensSaved: 0,
      applied: false,
      method: "none",
    };
  }

  const cleaned: RunMessage[] = input.map((m) => ({
    ...m,
    content: cleanupText(m.content),
  }));
  let method: CompressResult["method"] = "cleanup";
  let messages = cleaned;

  if (tokensForMessages(messages) > inputBudgetTokens) {
    const system = messages.filter((m) => m.role === "system");
    const rest = messages.filter((m) => m.role !== "system");
    const keepCount = Math.min(keepLastTurns, rest.length);
    const older = rest.slice(0, Math.max(0, rest.length - keepCount));
    const recent = rest.slice(Math.max(0, rest.length - keepCount));

    const compressedOlder =
      older.length === 0
        ? []
        : [
            {
              role: "system" as const,
              content: `[Earlier conversation truncated: ${older.length} message(s), ~${tokensForMessages(older)} tokens omitted for cost savings.]`,
            },
            ...older.map((m) => truncateMessage(m, olderMaxChars)),
          ];

    messages = [...system, ...compressedOlder, ...recent];
    method = "truncate";

    // Still over budget: shrink the oldest non-system messages further.
    let guard = 0;
    while (tokensForMessages(messages) > inputBudgetTokens && guard < 12) {
      // Prefer shrinking the first truncated / oldest contentful message.
      let target = -1;
      for (let i = 0; i < messages.length; i++) {
        if (messages[i]!.content.length > 80) {
          target = i;
          break;
        }
      }
      if (target < 0) break;
      const cur = messages[target]!;
      const nextLen = Math.max(40, Math.floor(cur.content.length * 0.5));
      messages = messages.map((m, i) =>
        i === target ? truncateMessage(m, nextLen) : m,
      );
      method = "truncate";
      guard += 1;
    }
  }

  const compressedTokens = tokensForMessages(messages);
  const tokensSaved = Math.max(0, originalTokens - compressedTokens);

  // If cleanup changed nothing meaningful, report none.
  if (tokensSaved === 0 && method === "cleanup") {
    const identical =
      input.length === messages.length &&
      input.every((m, i) => m.role === messages[i]?.role && m.content === messages[i]?.content);
    if (identical) {
      return {
        messages: input,
        originalTokens,
        compressedTokens: originalTokens,
        tokensSaved: 0,
        applied: false,
        method: "none",
      };
    }
  }

  return {
    messages,
    originalTokens,
    compressedTokens,
    tokensSaved,
    applied: tokensSaved > 0 || method === "truncate",
    method,
  };
}
