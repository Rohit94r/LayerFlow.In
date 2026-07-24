import { describe, expect, it } from "vitest";
import { compressMessages, cleanupText } from "./compress";
import { estimateRunSavings, formatSavingsLine } from "./estimate";

describe("cleanupText", () => {
  it("collapses whitespace", () => {
    expect(cleanupText("hello   world\n\n\n\nnext")).toBe("hello world\n\nnext");
  });
});

describe("compressMessages", () => {
  it("keeps short prompts intact after light cleanup", () => {
    const result = compressMessages([
      { role: "user", content: "Say hello" },
    ]);
    expect(result.messages[0]?.content).toBe("Say hello");
    expect(result.tokensSaved).toBe(0);
  });

  it("truncates older turns when over budget", () => {
    const older = Array.from({ length: 8 }, (_, i) => ({
      role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
      content: `Message ${i}: ${"lorem ipsum dolor sit amet ".repeat(40)}`,
    }));
    const result = compressMessages(older, {
      keepLastTurns: 2,
      inputBudgetTokens: 200,
      olderMaxChars: 80,
    });
    expect(result.applied).toBe(true);
    expect(result.method).toBe("truncate");
    expect(result.compressedTokens).toBeLessThan(result.originalTokens);
    expect(result.tokensSaved).toBeGreaterThan(0);
    // Last two turns should still be present (possibly cleaned).
    expect(result.messages.some((m) => m.content.includes("Message 7"))).toBe(true);
  });
});

describe("estimateRunSavings", () => {
  it("credits compression + cheaper model vs expensive baseline", () => {
    const savings = estimateRunSavings({
      originalInputTokens: 4000,
      compressedInputTokens: 1000,
      outputTokens: 200,
      modelUsed: "gpt-4o-mini",
      expensiveAlternative: "gpt-4o",
    });
    expect(savings.tokensSaved).toBe(3000);
    expect(savings.costSavedMicro).toBeGreaterThan(0);
    expect(savings.expensiveAlternative).toBe("gpt-4o");
    expect(formatSavingsLine(savings)).toMatch(/Saved ~/);
  });

  it("credits full cost on cache hit", () => {
    const savings = estimateRunSavings({
      originalInputTokens: 500,
      compressedInputTokens: 500,
      outputTokens: 100,
      modelUsed: "gpt-4o",
      cacheHit: true,
      actualCostMicro: 0,
    });
    expect(savings.cacheHit).toBe(true);
    expect(savings.costSavedMicro).toBeGreaterThan(0);
  });
});
