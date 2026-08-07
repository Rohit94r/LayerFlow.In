import { describe, expect, it } from "vitest";
import { analyzePrompt, estimateTokens } from "./analyze";

describe("estimateTokens", () => {
  it("estimates ~4 chars per token", () => {
    expect(estimateTokens("abcd")).toBe(1);
    expect(estimateTokens("a".repeat(40))).toBe(10);
  });
});

describe("analyzePrompt", () => {
  it("classifies coding prompts and recommends a cheap model", () => {
    const analysis = analyzePrompt(
      "Write a TypeScript function to debug this React API client",
      "gpt-4o",
    );
    expect(analysis.taskType).toBe("coding");
    expect(analysis.estimatedTokensIn).toBeGreaterThan(0);
    expect(analysis.estimatedTokensOut).toBeGreaterThan(0);
    expect(analysis.estimatedCostMicro).toBeGreaterThan(0);
    expect(analysis.recommended.model).toBeTruthy();
    expect(analysis.alternative.model).toBeTruthy();
    expect(analysis.why.length).toBeGreaterThanOrEqual(3);
    expect(analysis.recommended.label).toMatch(/cheap/i);
    expect(analysis.alternative.label).toMatch(/quality/i);
  });

  it("classifies long-form content", () => {
    const analysis = analyzePrompt("x".repeat(600), "gpt-4o");
    expect(analysis.taskType).toBe("long-form");
  });

  it("classifies drafting for short non-code prompts", () => {
    const analysis = analyzePrompt("Write a short product update email.", "gpt-4o");
    expect(analysis.taskType).toBe("drafting");
    expect(analysis.complexity).toBe("low");
  });

  it("uses micro-dollars (integer) for cost", () => {
    const analysis = analyzePrompt("hello world", "gpt-4o-mini");
    expect(Number.isInteger(analysis.estimatedCostMicro)).toBe(true);
    expect(analysis.recommended.estimatedCostMicro).toBeTypeOf("number");
  });
});
