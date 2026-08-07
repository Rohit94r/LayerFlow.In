import { describe, expect, it } from "vitest";
import { matchRoutingRule, recommend } from "./recommend";
import { analyzePrompt } from "./analyze";
import { routeModel } from "./route";

const codingContent = "Refactor this TypeScript API and fix the React bug";

describe("recommend", () => {
  it("applies a matching routing rule over heuristics", () => {
    const { recommendation, analysis } = recommend({
      content: codingContent,
      preferCheap: true,
      executionMode: "auto-cheapest",
      rules: [
        {
          id: "rule_coding",
          condition: "Coding tasks",
          conditionConfig: { taskType: "coding" },
          targetModel: "claude-sonnet-4",
          priority: 10,
          enabled: true,
        },
      ],
    });
    expect(analysis.taskType).toBe("coding");
    expect(recommendation.source).toBe("rule");
    expect(recommendation.recommendedModel).toBe("claude-sonnet-4");
    expect(recommendation.reason).toMatch(/Coding tasks/);
    expect(recommendation.matchedRuleId).toBe("rule_coding");
  });

  it("respects preferCheap / auto-cheapest when no rule matches", () => {
    const { recommendation } = recommend({
      content: codingContent,
      preferCheap: true,
      executionMode: "auto-cheapest",
      rules: [],
    });
    expect(recommendation.source).toBe("heuristic");
    expect(recommendation.recommendedModel).toBeTruthy();
    expect(recommendation.reason.length).toBeGreaterThan(0);
  });

  it("picks quality model for auto-best", () => {
    const { recommendation, analysis } = recommend({
      content: codingContent,
      preferCheap: false,
      executionMode: "auto-best",
      rules: [],
    });
    expect(recommendation.recommendedModel).toBe(analysis.alternative.model);
  });

  it("ignores disabled rules", () => {
    const analysis = analyzePrompt(codingContent);
    const matched = matchRoutingRule(
      [
        {
          id: "rule_off",
          condition: "Coding",
          conditionConfig: { taskType: "coding" },
          targetModel: "gpt-4o",
          priority: 100,
          enabled: false,
        },
      ],
      analysis,
      codingContent,
    );
    expect(matched).toBeUndefined();
  });
});

describe("routeModel", () => {
  it("always returns an explanation in auto mode", () => {
    const result = routeModel({
      content: codingContent,
      executionMode: "auto-balanced",
      preferCheap: false,
      defaultModel: "gpt-4o-mini",
      rules: [],
    });
    expect(result.model).toBeTruthy();
    expect(result.explanation.length).toBeGreaterThan(0);
    expect(result.source).toBe("heuristic");
  });

  it("returns requested model in manual mode with explanation", () => {
    const result = routeModel({
      content: codingContent,
      requestedModel: "gpt-4o",
      executionMode: "manual",
      preferCheap: false,
      defaultModel: "gpt-4o-mini",
      rules: [],
    });
    expect(result.model).toBe("gpt-4o");
    expect(result.source).toBe("manual");
    expect(result.explanation).toMatch(/Manual/);
  });
});
