import type { PromptAnalysis } from "./types";

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function analyzePrompt(content: string, currentModel = "gpt-4o"): PromptAnalysis {
  const tokensIn = estimateTokens(content);
  const tokensOut = Math.min(800, Math.max(120, Math.floor(tokensIn * 1.5)));
  const isCoding = /code|function|api|react|typescript|debug/i.test(content);
  const isLong = content.length > 500;

  const recommended = isCoding
    ? {
        model: "gemini-2.5-flash",
        provider: "Google",
        qualityPercent: 92,
        cheaperPercent: 74,
        label: "Cheapest good-enough",
      }
    : {
        model: "gemini-2.5-flash",
        provider: "Google",
        qualityPercent: 88,
        cheaperPercent: 68,
        label: "Cheapest good-enough",
      };

  const alternative = {
    model: "claude-sonnet-4",
    provider: "Anthropic",
    label: "Best Quality",
  };

  const costPer1M = currentModel.includes("gpt-4o") ? 5 : 3;
  const estimatedCost = (tokensIn * costPer1M + tokensOut * 15) / 1_000_000;

  const why = [
    `${recommended.cheaperPercent}% cheaper than ${currentModel} for similar output`,
    isLong ? "Long prompt — Flash handles context efficiently" : "Short task — budget tier is sufficient",
    isCoding ? "Coding prompts in your library often use Flash successfully" : "Similar prompts saved 60%+ with Flash",
    "Fast latency (~800ms avg)",
  ];

  return {
    estimatedTokensIn: tokensIn,
    estimatedTokensOut: tokensOut,
    estimatedCost,
    recommended,
    alternative,
    why,
    taskType: isCoding ? "coding" : isLong ? "long-form" : "drafting",
  };
}
