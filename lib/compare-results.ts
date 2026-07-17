import type { CompareResult } from "./types";

export const compareResults: CompareResult[] = [
  {
    model: "gpt-4o",
    provider: "OpenAI",
    output: "LayerFlow is an AI workspace that helps you organize prompts, compare models, and control costs with hard budget limits.",
    cost: 0.014,
    latencyMs: 1240,
    tokensIn: 48,
    tokensOut: 42,
    qualityScore: 94,
  },
  {
    model: "claude-sonnet-4",
    provider: "Anthropic",
    output: "Think of LayerFlow as your command center for AI work — save prompts, run side-by-side comparisons, and never exceed your budget.",
    cost: 0.019,
    latencyMs: 1580,
    tokensIn: 48,
    tokensOut: 38,
    qualityScore: 96,
  },
  {
    model: "gemini-2.5-pro",
    provider: "Google",
    output: "LayerFlow centralizes prompt management with version history, multi-model testing, and enforced spending caps.",
    cost: 0.011,
    latencyMs: 980,
    tokensIn: 48,
    tokensOut: 35,
    qualityScore: 91,
  },
  {
    model: "deepseek-v3",
    provider: "DeepSeek",
    output: "An all-in-one AI workspace: organize prompts by domain, compare outputs across providers, block spend when budget runs out.",
    cost: 0.004,
    latencyMs: 720,
    tokensIn: 48,
    tokensOut: 40,
    qualityScore: 87,
  },
];
