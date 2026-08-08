import type {
  ExecutionMode,
  PromptAnalysisResult,
  Recommendation,
  RoutingRuleConfig,
} from "@layerflow/contracts";
import { getModel } from "@layerflow/model-registry";
import { analyzePrompt } from "./analyze";

export interface RoutingRuleMatchInput {
  id: string;
  condition: string;
  conditionConfig: RoutingRuleConfig | null | undefined;
  targetModel: string;
  priority: number;
  enabled: boolean;
}

export interface RecommendInput {
  content: string;
  currentModel?: string;
  preferCheap: boolean;
  executionMode: ExecutionMode;
  rules: RoutingRuleMatchInput[];
}

function ruleMatches(
  rule: RoutingRuleMatchInput,
  analysis: PromptAnalysisResult,
  content: string,
): boolean {
  if (!rule.enabled) return false;
  const cfg = rule.conditionConfig;
  if (!cfg) {
    // Fall back to keyword match against the human-readable condition.
    const needle = rule.condition.toLowerCase();
    return (
      content.toLowerCase().includes(needle) ||
      analysis.taskType.includes(needle.replace(/\s+tasks?$/, ""))
    );
  }
  if (cfg.taskType && cfg.taskType !== analysis.taskType) return false;
  if (cfg.complexity && cfg.complexity !== analysis.complexity) return false;
  if (cfg.minTokens != null && analysis.estimatedTokensIn < cfg.minTokens) return false;
  if (cfg.maxTokens != null && analysis.estimatedTokensIn > cfg.maxTokens) return false;
  if (cfg.contains && !content.toLowerCase().includes(cfg.contains.toLowerCase())) return false;
  return true;
}

/** First matching rule by priority (higher first). */
export function matchRoutingRule(
  rules: RoutingRuleMatchInput[],
  analysis: PromptAnalysisResult,
  content: string,
): RoutingRuleMatchInput | undefined {
  const sorted = [...rules].sort((a, b) => b.priority - a.priority);
  return sorted.find((r) => ruleMatches(r, analysis, content));
}

/**
 * Pick a model from analysis + workspace prefs. Preference order:
 * 1. Matching routing rule
 * 2. Execution-mode / preferCheap heuristic
 */
export function recommend(input: RecommendInput): {
  recommendation: Recommendation;
  analysis: PromptAnalysisResult;
} {
  const analysis = analyzePrompt(input.content, input.currentModel ?? "gpt-4o");
  const matched = matchRoutingRule(input.rules, analysis, input.content);

  if (matched) {
    return {
      analysis,
      recommendation: {
        recommendedModel: matched.targetModel,
        alternativeModel: analysis.alternative.model,
        reason: `Applied routing rule: ${matched.condition}`,
        source: "rule",
        matchedRuleId: matched.id,
      },
    };
  }

  let recommendedModel = analysis.recommended.model;
  let reason = `Heuristic: ${analysis.recommended.label} for ${analysis.taskType}/${analysis.complexity}`;

  if (input.executionMode === "auto-best") {
    recommendedModel = analysis.alternative.model;
    reason = `Auto-best: ${analysis.alternative.label} for ${analysis.taskType}`;
  } else if (input.executionMode === "auto-cheapest" || input.preferCheap) {
    recommendedModel = analysis.recommended.model;
    reason = input.preferCheap
      ? `Prefer cheap: ${analysis.recommended.model} (${analysis.recommended.cheaperPercent ?? 0}% cheaper)`
      : `Auto-cheapest: ${analysis.recommended.model}`;
  } else if (input.executionMode === "auto-fastest") {
    // Flash/mini class models are the latency picks in our catalog.
    recommendedModel =
      getModel("gemini-flash-latest")?.id ??
      getModel("gpt-4o-mini")?.id ??
      analysis.recommended.model;
    reason = `Auto-fastest: ${recommendedModel}`;
  } else if (input.executionMode === "auto-balanced") {
    // Balanced: cheap for low complexity, quality for high.
    if (analysis.complexity === "high") {
      recommendedModel = analysis.alternative.model;
      reason = `Auto-balanced: quality model for high complexity (${analysis.taskType})`;
    } else {
      recommendedModel = analysis.recommended.model;
      reason = `Auto-balanced: cost-efficient model for ${analysis.complexity} ${analysis.taskType}`;
    }
  }

  return {
    analysis,
    recommendation: {
      recommendedModel,
      alternativeModel: analysis.alternative.model,
      reason,
      source: "heuristic",
      matchedRuleId: null,
    },
  };
}
