import {
  computeCostMicro,
  getModel,
  MODELS,
  resolveProvider,
  type ModelInfo,
} from "@layerflow/model-registry";
import type {
  Complexity,
  ModelSuggestion,
  PromptAnalysisResult,
  TaskType,
} from "@layerflow/contracts";

/** Rough token estimate — ~4 chars per token (same heuristic as the frontend). */
export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

function detectTaskType(content: string): TaskType {
  if (/code|function|api|react|typescript|debug|refactor|sql|python|javascript/i.test(content)) {
    return "coding";
  }
  if (/summariz|tl;dr|condense|key points/i.test(content)) return "summarization";
  if (/extract|parse|json|structured data|schema/i.test(content)) return "extraction";
  if (/prove|reason|step by step|logic|math|theorem/i.test(content)) return "reasoning";
  if (/poem|story|creative|novel|lyrics/i.test(content)) return "creative";
  if (content.length > 500) return "long-form";
  return "drafting";
}

function detectComplexity(content: string, taskType: TaskType): Complexity {
  if (taskType === "reasoning" || /multi-step|architecture|design system/i.test(content)) {
    return "high";
  }
  if (content.length > 800 || taskType === "coding" || taskType === "long-form") {
    return "medium";
  }
  return "low";
}

function providerDisplayName(provider: string): string {
  const map: Record<string, string> = {
    openai: "OpenAI",
    anthropic: "Anthropic",
    google: "Google",
    deepseek: "DeepSeek",
    groq: "Groq",
    xai: "xAI",
    openrouter: "OpenRouter",
  };
  return map[provider] ?? provider;
}

function estimatedCallCost(modelId: string, tokensIn: number, tokensOut: number): number {
  return computeCostMicro(modelId, tokensIn, tokensOut) ?? 0;
}

/** Prefer cheap, capable models for "cheapest good-enough". */
function pickCheapestGood(taskType: TaskType, complexity: Complexity): ModelInfo {
  // High-complexity reasoning prefers a stronger cheap option.
  if (complexity === "high" || taskType === "reasoning") {
    return (
      getModel("gemini-2.5-flash") ??
      getModel("gpt-4o-mini") ??
      MODELS[0]!
    );
  }
  if (taskType === "coding") {
    return (
      getModel("gemini-2.5-flash") ??
      getModel("deepseek-chat") ??
      getModel("gpt-4o-mini") ??
      MODELS[0]!
    );
  }
  // Short drafting / summarization → budget tier.
  return (
    getModel("gpt-4o-mini") ??
    getModel("gemini-2.5-flash") ??
    getModel("deepseek-chat") ??
    MODELS[0]!
  );
}

function pickBestQuality(taskType: TaskType): ModelInfo {
  if (taskType === "coding" || taskType === "reasoning") {
    return getModel("claude-sonnet-4") ?? getModel("gpt-4o") ?? MODELS[0]!;
  }
  return getModel("gpt-4o") ?? getModel("claude-sonnet-4") ?? MODELS[0]!;
}

function qualityPercentFor(model: ModelInfo, taskType: TaskType): number {
  if (model.capabilities.reasoning && (taskType === "reasoning" || taskType === "coding")) {
    return 95;
  }
  if (model.id.includes("flash") || model.id.includes("mini") || model.id.includes("haiku")) {
    return taskType === "coding" ? 88 : 85;
  }
  return 90;
}

/**
 * Port of lib/prompt-analysis.ts heuristics, priced via model-registry
 * (micro-dollars, never floats).
 */
export function analyzePrompt(
  content: string,
  currentModel = "gpt-4o",
): PromptAnalysisResult {
  const tokensIn = estimateTokens(content);
  const tokensOut = Math.min(800, Math.max(120, Math.floor(tokensIn * 1.5)));
  const taskType = detectTaskType(content);
  const complexity = detectComplexity(content, taskType);

  const cheap = pickCheapestGood(taskType, complexity);
  const best = pickBestQuality(taskType);

  const currentCost = estimatedCallCost(currentModel, tokensIn, tokensOut);
  const cheapCost = estimatedCallCost(cheap.id, tokensIn, tokensOut);
  const bestCost = estimatedCallCost(best.id, tokensIn, tokensOut);

  const cheaperPercent =
    currentCost > 0
      ? Math.max(0, Math.min(100, Math.round(((currentCost - cheapCost) / currentCost) * 100)))
      : 0;

  const recommended: ModelSuggestion = {
    model: cheap.id,
    provider: providerDisplayName(cheap.provider),
    label: "Cheapest good-enough",
    qualityPercent: qualityPercentFor(cheap, taskType),
    cheaperPercent,
    estimatedCostMicro: cheapCost,
  };

  const alternative: ModelSuggestion = {
    model: best.id,
    provider: providerDisplayName(best.provider),
    label: "Best Quality",
    qualityPercent: qualityPercentFor(best, taskType),
    estimatedCostMicro: bestCost,
  };

  const why: string[] = [];
  if (cheaperPercent > 0) {
    why.push(`${cheaperPercent}% cheaper than ${currentModel} for similar output`);
  } else {
    why.push(`${cheap.id} is cost-efficient for this task size`);
  }
  why.push(
    content.length > 500
      ? "Long prompt — Flash/mini models handle context efficiently"
      : "Short task — budget tier is sufficient",
  );
  if (taskType === "coding") {
    why.push("Coding prompts often succeed on Flash-class models");
  } else if (taskType === "reasoning") {
    why.push("Reasoning signals detected — prefer a capable model when quality matters");
  } else {
    why.push("Similar drafting prompts typically save 60%+ on Flash/mini");
  }
  why.push("Fast latency expected on the recommended tier");

  return {
    estimatedTokensIn: tokensIn,
    estimatedTokensOut: tokensOut,
    estimatedCostMicro: currentCost,
    taskType,
    complexity,
    recommended,
    alternative,
    why,
  };
}

/** Resolve provider display string for a model id. */
export function providerForModel(modelId: string): string {
  const p = resolveProvider(modelId) ?? getModel(modelId)?.provider ?? "unknown";
  return providerDisplayName(p);
}
