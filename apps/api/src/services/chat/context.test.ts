import { describe, expect, it } from "vitest";
import type { AiChatMessageRow } from "../../db/schema/chat";
import {
  RECENT_MESSAGES,
  formatMemoryContext,
  normalizeStoredMessages,
  splitRecent,
  trimContext,
} from "./context";
import {
  CHEAP_CONTEXT_BUDGET_TOKENS,
  DEFAULT_TEMPERATURE,
  PREMIUM_CONTEXT_BUDGET_TOKENS,
  defaultTemperature,
  providerSystemPrompt,
  tokenBudgetForModel,
} from "./prompts";
import { estimateTokens } from "../intelligence/analyze";

function row(overrides: Partial<AiChatMessageRow> & { role: AiChatMessageRow["role"]; content: string }): AiChatMessageRow {
  return {
    id: "msg_test",
    sessionId: "chat_test",
    model: null,
    provider: null,
    keyHint: null,
    keyId: null,
    tokensIn: 0,
    tokensOut: 0,
    costMicro: 0,
    latencyMs: null,
    switchedFrom: null,
    errorCode: null,
    errorMessage: null,
    createdAt: new Date(),
    ...overrides,
  };
}

describe("token budget", () => {
  it("classifies cheap models at 4k and premium at 8k", () => {
    expect(tokenBudgetForModel("gpt-4o-mini")).toBe(CHEAP_CONTEXT_BUDGET_TOKENS);
    expect(tokenBudgetForModel("deepseek-chat")).toBe(CHEAP_CONTEXT_BUDGET_TOKENS);
    expect(tokenBudgetForModel("gemini-flash-latest")).toBe(CHEAP_CONTEXT_BUDGET_TOKENS);
    expect(tokenBudgetForModel("gpt-4o")).toBe(PREMIUM_CONTEXT_BUDGET_TOKENS);
    expect(tokenBudgetForModel("gemini-2.5-pro")).toBe(PREMIUM_CONTEXT_BUDGET_TOKENS);
    expect(tokenBudgetForModel("claude-sonnet-4")).toBe(PREMIUM_CONTEXT_BUDGET_TOKENS);
  });

  it("keeps the last message (the user turn) even when over budget", () => {
    const big = "word ".repeat(400); // ~1000 tokens
    const messages = [
      { role: "system" as const, content: "sys" },
      { role: "user" as const, content: big },
      { role: "assistant" as const, content: big },
      { role: "user" as const, content: "final user turn" },
    ];
    const trimmed = trimContext(messages, 500);
    expect(trimmed[trimmed.length - 1]!.content).toBe("final user turn");
    expect(estimateTokens(trimmed.map((m) => m.content).join("\n"))).toBeLessThanOrEqual(500);
  });

  it("drops oldest messages first and truncates only as a last resort", () => {
    const filler = "x".repeat(4000); // ~1000 tokens each
    const messages = Array.from({ length: 12 }, (_, i) => ({
      role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
      content: `msg-${i} ${filler}`,
    }));
    const budget = CHEAP_CONTEXT_BUDGET_TOKENS;
    const trimmed = trimContext(messages, budget);
    // Oldest contentful message (msg-0) is gone; newest preserved.
    expect(trimmed.some((m) => m.content.startsWith("msg-0"))).toBe(false);
    expect(trimmed[trimmed.length - 1]!.content.startsWith("msg-11")).toBe(true);
    expect(estimateTokens(trimmed.map((m) => m.content).join("\n"))).toBeLessThanOrEqual(budget);
  });
});

describe("normalizeStoredMessages — provider isolation", () => {
  it("strips router UI notices and empty assistant drafts, keeps context notes", () => {
    const rows = [
      row({
        role: "system",
        content:
          "I rescued this conversation from ChatGPT. Continue from here without asking me to repeat anything above.",
      }),
      row({ role: "system", content: "Heads-up: GPT-4o was unavailable (the key was invalid). I switched this conversation to DeepSeek." }),
      row({ role: "user", content: "hello" }),
      row({ role: "assistant", content: "" }), // failed draft
      row({ role: "assistant", content: "hi there" }),
    ];
    const out = normalizeStoredMessages(rows);
    expect(out).toEqual([
      { role: "system", content: rows[0]!.content },
      { role: "user", content: "hello" },
      { role: "assistant", content: "hi there" },
    ]);
  });

  it("never leaks provider/model metadata into the message array", () => {
    const rows = [
      row({ role: "user", content: "hi", provider: "openai", model: "gpt-4o-mini" }),
      row({ role: "assistant", content: "yo", provider: "deepseek", model: "deepseek-chat" }),
    ];
    for (const m of normalizeStoredMessages(rows)) {
      expect(Object.keys(m).sort()).toEqual(["content", "role"]);
    }
  });
});

describe("splitRecent", () => {
  it("keeps the last 8 messages and returns the rest as older", () => {
    const messages = Array.from({ length: 12 }, (_, i) => ({
      role: "user" as const,
      content: `m${i}`,
    }));
    const { recent, older } = splitRecent(messages, RECENT_MESSAGES);
    expect(older.map((m) => m.content)).toEqual(["m0", "m1", "m2", "m3"]);
    expect(recent.map((m) => m.content)).toEqual(["m4", "m5", "m6", "m7", "m8", "m9", "m10", "m11"]);
  });
});

describe("provider prompts & temperature", () => {
  it("gives every provider a distinct system prompt", () => {
    const prompts = new Set(
      Object.keys(DEFAULT_TEMPERATURE).map((p) => providerSystemPrompt(p as keyof typeof DEFAULT_TEMPERATURE)),
    );
    // DeepSeek and GPT must NOT share a persona.
    expect(prompts.size).toBe(Object.keys(DEFAULT_TEMPERATURE).length);
    expect(providerSystemPrompt("deepseek")).not.toBe(providerSystemPrompt("openai"));
    expect(providerSystemPrompt("deepseek")).toContain("DeepSeek");
    expect(providerSystemPrompt("google")).toContain("Gemini");
    expect(providerSystemPrompt("openai")).toContain("GPT");
  });

  it("maps per-provider temperatures (GPT 0.7, DeepSeek 0.6, Gemini 0.7)", () => {
    expect(defaultTemperature("openai")).toBe(0.7);
    expect(defaultTemperature("deepseek")).toBe(0.6);
    expect(defaultTemperature("google")).toBe(0.7);
  });
});

describe("formatMemoryContext", () => {
  it("formats hits as a titled memory block", () => {
    const out = formatMemoryContext([
      {
        memory: {
          id: "mem_1",
          workspaceId: "ws_1",
          userId: "u",
          sourceType: "manual",
          sourceId: null,
          title: "Deployment",
          body: "Production API runs on Render.",
          meta: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        score: 0.9,
        matchedBy: "semantic",
      },
    ]);
    expect(out.startsWith("Relevant memory for this conversation:")).toBe(true);
    expect(out).toContain("- Deployment: Production API runs on Render.");
  });
});
