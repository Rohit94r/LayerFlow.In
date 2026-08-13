import { describe, expect, it } from "vitest";
import { estimateTokens } from "../intelligence/analyze";
import { improveJsonSchema, stripJsonFences } from "./improve";

describe("stripJsonFences", () => {
  it("strips ```json fences", () => {
    expect(stripJsonFences('```json\n{"a":1}\n```')).toBe('{"a":1}');
  });

  it("leaves plain JSON untouched", () => {
    expect(stripJsonFences('{"a":1}')).toBe('{"a":1}');
  });

  it("strips fences with trailing whitespace", () => {
    expect(stripJsonFences("```json\n{\"a\":1}\n```\n")).toBe('{"a":1}');
  });
});

describe("improveJsonSchema", () => {
  it("parses a well-formed improvement payload", () => {
    const parsed = improveJsonSchema.safeParse({
      improvedPrompt: "Write a TypeScript function that sums an array.",
      promptScore: 42,
      promptScores: [
        { label: "Clarity", value: 60 },
        { label: "Context", value: 30 },
      ],
      diff: { kept: ["intent"], removed: ["filler"], unsure: [] },
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.promptScore).toBe(42);
      expect(parsed.data.promptScores).toHaveLength(2);
      expect(parsed.data.diff.kept).toEqual(["intent"]);
    }
  });

  it("clamps out-of-range scores", () => {
    const parsed = improveJsonSchema.safeParse({
      improvedPrompt: "x",
      promptScore: 150,
      promptScores: [{ label: "Clarity", value: -5 }],
    });
    expect(parsed.success).toBe(false);
  });

  it("defaults missing diff and scores", () => {
    const parsed = improveJsonSchema.safeParse({ improvedPrompt: "x" });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.diff).toEqual({ kept: [], removed: [], unsure: [] });
      expect(parsed.data.promptScores).toEqual([]);
    }
  });
});

describe("estimateTokens", () => {
  it("estimates ~4 chars per token", () => {
    expect(estimateTokens("a".repeat(400))).toBe(100);
  });
});
