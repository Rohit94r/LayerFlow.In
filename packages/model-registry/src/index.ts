/**
 * LayerFlow model registry.
 *
 * All prices are in MICRO-DOLLARS per 1M tokens ($1 = 1_000_000 micro-dollars).
 * Example: GPT-4o input is $2.50 / 1M tokens = 2_500_000 micro-dollars / 1M tokens.
 *
 * This catalog is a static baseline; the API keeps a versioned `model_pricing`
 * table for effective-dated overrides so historical runs stay accurate.
 */

export const PROVIDERS = [
  "openai",
  "anthropic",
  "google",
  "deepseek",
  "groq",
  "xai",
  "kimi",
  "openrouter",
] as const;

export type Provider = (typeof PROVIDERS)[number];

export interface ModelCapabilities {
  streaming: boolean;
  toolCalling: boolean;
  vision: boolean;
  reasoning: boolean;
}

export interface ModelInfo {
  /** Model ID as sent to the provider API, e.g. "gpt-4o". */
  id: string;
  provider: Provider;
  displayName: string;
  /** Micro-dollars per 1M input tokens. */
  inputPricePerMTokMicro: number;
  /** Micro-dollars per 1M output tokens. */
  outputPricePerMTokMicro: number;
  /** Micro-dollars per 1M cached input tokens (if the provider discounts cache reads). */
  cachedInputPricePerMTokMicro?: number;
  /** Maximum context window in tokens. */
  contextWindow: number;
  /** Maximum output tokens per response, when the provider documents one. */
  maxOutputTokens?: number;
  capabilities: ModelCapabilities;
}

const ALL_CAPS: ModelCapabilities = { streaming: true, toolCalling: true, vision: true, reasoning: false };
const TEXT_CAPS: ModelCapabilities = { streaming: true, toolCalling: true, vision: false, reasoning: false };
const REASONING_CAPS: ModelCapabilities = { streaming: true, toolCalling: true, vision: true, reasoning: true };

export const MODELS: readonly ModelInfo[] = [
  // --- OpenAI ---
  {
    id: "gpt-4o",
    provider: "openai",
    displayName: "GPT-4o",
    inputPricePerMTokMicro: 2_500_000,
    outputPricePerMTokMicro: 10_000_000,
    cachedInputPricePerMTokMicro: 1_250_000,
    contextWindow: 128_000,
    maxOutputTokens: 16_384,
    capabilities: ALL_CAPS,
  },
  {
    id: "gpt-4o-mini",
    provider: "openai",
    displayName: "GPT-4o mini",
    inputPricePerMTokMicro: 150_000,
    outputPricePerMTokMicro: 600_000,
    cachedInputPricePerMTokMicro: 75_000,
    contextWindow: 128_000,
    maxOutputTokens: 16_384,
    capabilities: ALL_CAPS,
  },
  {
    id: "gpt-4.1",
    provider: "openai",
    displayName: "GPT-4.1",
    inputPricePerMTokMicro: 2_000_000,
    outputPricePerMTokMicro: 8_000_000,
    cachedInputPricePerMTokMicro: 500_000,
    contextWindow: 1_047_576,
    maxOutputTokens: 32_768,
    capabilities: ALL_CAPS,
  },
  {
    id: "gpt-4.1-mini",
    provider: "openai",
    displayName: "GPT-4.1 mini",
    inputPricePerMTokMicro: 400_000,
    outputPricePerMTokMicro: 1_600_000,
    cachedInputPricePerMTokMicro: 100_000,
    contextWindow: 1_047_576,
    maxOutputTokens: 32_768,
    capabilities: ALL_CAPS,
  },
  {
    id: "o3-mini",
    provider: "openai",
    displayName: "o3-mini",
    inputPricePerMTokMicro: 1_100_000,
    outputPricePerMTokMicro: 4_400_000,
    cachedInputPricePerMTokMicro: 550_000,
    contextWindow: 200_000,
    maxOutputTokens: 100_000,
    capabilities: { streaming: true, toolCalling: true, vision: false, reasoning: true },
  },

  // --- Anthropic ---
  {
    id: "claude-sonnet-4",
    provider: "anthropic",
    displayName: "Claude Sonnet 4",
    inputPricePerMTokMicro: 3_000_000,
    outputPricePerMTokMicro: 15_000_000,
    cachedInputPricePerMTokMicro: 300_000,
    contextWindow: 200_000,
    maxOutputTokens: 64_000,
    capabilities: REASONING_CAPS,
  },
  {
    id: "claude-opus-4",
    provider: "anthropic",
    displayName: "Claude Opus 4",
    inputPricePerMTokMicro: 15_000_000,
    outputPricePerMTokMicro: 75_000_000,
    cachedInputPricePerMTokMicro: 1_500_000,
    contextWindow: 200_000,
    maxOutputTokens: 32_000,
    capabilities: REASONING_CAPS,
  },
  {
    id: "claude-3-5-haiku",
    provider: "anthropic",
    displayName: "Claude 3.5 Haiku",
    inputPricePerMTokMicro: 800_000,
    outputPricePerMTokMicro: 4_000_000,
    cachedInputPricePerMTokMicro: 80_000,
    contextWindow: 200_000,
    maxOutputTokens: 8_192,
    capabilities: ALL_CAPS,
  },

  // --- Google ---
  {
    id: "gemini-2.5-pro",
    provider: "google",
    displayName: "Gemini 2.5 Pro",
    inputPricePerMTokMicro: 1_250_000,
    outputPricePerMTokMicro: 10_000_000,
    cachedInputPricePerMTokMicro: 312_500,
    contextWindow: 1_048_576,
    maxOutputTokens: 65_536,
    capabilities: REASONING_CAPS,
  },
  {
    id: "gemini-flash-latest",
    provider: "google",
    displayName: "Gemini Flash",
    inputPricePerMTokMicro: 300_000,
    outputPricePerMTokMicro: 2_500_000,
    cachedInputPricePerMTokMicro: 75_000,
    contextWindow: 1_048_576,
    maxOutputTokens: 65_536,
    capabilities: REASONING_CAPS,
  },

  // --- DeepSeek ---
  {
    id: "deepseek-chat",
    provider: "deepseek",
    displayName: "DeepSeek V3 (chat)",
    inputPricePerMTokMicro: 270_000,
    outputPricePerMTokMicro: 1_100_000,
    cachedInputPricePerMTokMicro: 70_000,
    contextWindow: 64_000,
    maxOutputTokens: 8_000,
    capabilities: TEXT_CAPS,
  },
  {
    id: "deepseek-reasoner",
    provider: "deepseek",
    displayName: "DeepSeek R1 (reasoner)",
    inputPricePerMTokMicro: 550_000,
    outputPricePerMTokMicro: 2_190_000,
    cachedInputPricePerMTokMicro: 140_000,
    contextWindow: 64_000,
    maxOutputTokens: 64_000,
    capabilities: { streaming: true, toolCalling: false, vision: false, reasoning: true },
  },

  // --- Groq (hosted open models) ---
  {
    id: "llama-3.3-70b-versatile",
    provider: "groq",
    displayName: "Llama 3.3 70B (Groq)",
    inputPricePerMTokMicro: 590_000,
    outputPricePerMTokMicro: 790_000,
    contextWindow: 128_000,
    maxOutputTokens: 32_768,
    capabilities: TEXT_CAPS,
  },

  // --- xAI ---
  {
    id: "grok-3",
    provider: "xai",
    displayName: "Grok 3",
    inputPricePerMTokMicro: 3_000_000,
    outputPricePerMTokMicro: 15_000_000,
    contextWindow: 131_072,
    capabilities: TEXT_CAPS,
  },
  {
    id: "grok-3-mini",
    provider: "xai",
    displayName: "Grok 3 mini",
    inputPricePerMTokMicro: 300_000,
    outputPricePerMTokMicro: 500_000,
    contextWindow: 131_072,
    capabilities: { streaming: true, toolCalling: true, vision: false, reasoning: true },
  },

  // --- Kimi (Moonshot AI) ---
  {
    id: "kimi-k2",
    provider: "kimi",
    displayName: "Kimi K2",
    inputPricePerMTokMicro: 400_000,
    outputPricePerMTokMicro: 1_600_000,
    cachedInputPricePerMTokMicro: 100_000,
    contextWindow: 200_000,
    maxOutputTokens: 32_768,
    capabilities: TEXT_CAPS,
  },
  {
    id: "kimi-k2-thinking",
    provider: "kimi",
    displayName: "Kimi K2 Thinking",
    inputPricePerMTokMicro: 400_000,
    outputPricePerMTokMicro: 1_600_000,
    cachedInputPricePerMTokMicro: 100_000,
    contextWindow: 200_000,
    maxOutputTokens: 65_536,
    capabilities: { streaming: true, toolCalling: true, vision: false, reasoning: true },
  },
] as const;

const MODELS_BY_ID = new Map(MODELS.map((m) => [m.id, m]));

/** Look up a model in the catalog. Returns undefined for unknown models. */
export function getModel(modelId: string): ModelInfo | undefined {
  return MODELS_BY_ID.get(modelId);
}

export interface ModelPricing {
  inputPricePerMTokMicro: number;
  outputPricePerMTokMicro: number;
  cachedInputPricePerMTokMicro?: number;
}

/** Pricing for a model, in micro-dollars per 1M tokens. Returns undefined for unknown models. */
export function getModelPricing(modelId: string): ModelPricing | undefined {
  const model = MODELS_BY_ID.get(modelId);
  if (!model) return undefined;
  return {
    inputPricePerMTokMicro: model.inputPricePerMTokMicro,
    outputPricePerMTokMicro: model.outputPricePerMTokMicro,
    cachedInputPricePerMTokMicro: model.cachedInputPricePerMTokMicro,
  };
}

/**
 * Compute the cost of a call in micro-dollars.
 * Token counts are absolute (not per-million); result is rounded up so we never under-charge.
 */
export function computeCostMicro(
  modelId: string,
  inputTokens: number,
  outputTokens: number,
): number | undefined {
  const pricing = getModelPricing(modelId);
  if (!pricing) return undefined;
  return Math.ceil(
    (inputTokens * pricing.inputPricePerMTokMicro + outputTokens * pricing.outputPricePerMTokMicro) /
      1_000_000,
  );
}

/**
 * Resolve the provider from a model ID.
 * Prefers an exact catalog match, then falls back to well-known prefixes.
 * OpenRouter-style IDs ("vendor/model") resolve to "openrouter".
 */
export function resolveProvider(modelId: string): Provider | undefined {
  const known = MODELS_BY_ID.get(modelId);
  if (known) return known.provider;

  if (modelId.includes("/")) return "openrouter";

  const prefixMap: [RegExp, Provider][] = [
    [/^(gpt-|o[134](-|$)|chatgpt-|text-embedding-)/, "openai"],
    [/^claude-/, "anthropic"],
    [/^(gemini-|gemma-)/, "google"],
    [/^deepseek-/, "deepseek"],
    [/^grok-/, "xai"],
    [/^(kimi-|moonshot-)/, "kimi"],
    [/^(llama-|llama3|mixtral-|qwen-)/, "groq"],
  ];
  for (const [pattern, provider] of prefixMap) {
    if (pattern.test(modelId)) return provider;
  }
  return undefined;
}

/** All catalog models for one provider. */
export function getModelsForProvider(provider: Provider): ModelInfo[] {
  return MODELS.filter((m) => m.provider === provider);
}
