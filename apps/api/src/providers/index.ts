import { resolveProvider, type Provider } from "@layerflow/model-registry";
import { AppError } from "../middleware/error";
import { anthropicAdapter } from "./anthropic";
import { deepseekAdapter } from "./deepseek";
import { googleAdapter } from "./google";
import { groqAdapter } from "./groq";
import { openaiAdapter } from "./openai";
import { openrouterAdapter } from "./openrouter";
import { xaiAdapter } from "./xai";
import type { ProviderAdapter } from "./types";

export type { ChatMessage, ChatCompletionRequest, ChatCompletionResult, ProviderAdapter } from "./types";
export { loadProviderApiKey } from "./keys";

const ADAPTERS: Record<Provider, ProviderAdapter> = {
  openai: openaiAdapter,
  anthropic: anthropicAdapter,
  google: googleAdapter,
  deepseek: deepseekAdapter,
  groq: groqAdapter,
  xai: xaiAdapter,
  openrouter: openrouterAdapter,
};

/** Resolve the adapter for a known provider name. */
export function resolveAdapter(provider: Provider): ProviderAdapter {
  const adapter = ADAPTERS[provider];
  if (!adapter) {
    throw new AppError(400, "unsupported_provider", `No adapter for provider "${provider}"`);
  }
  return adapter;
}

/** Resolve provider from a model ID via the model-registry, then return its adapter. */
export function resolveProviderFromModel(model: string): { provider: Provider; adapter: ProviderAdapter } {
  const provider = resolveProvider(model);
  if (!provider) {
    throw new AppError(
      400,
      "unknown_model",
      `Cannot determine provider for model "${model}". Use a catalog model or OpenRouter "vendor/model" id.`,
    );
  }
  return { provider, adapter: resolveAdapter(provider) };
}

/** Test seam: override an adapter (e.g. inject a mock in vitest). */
export function setAdapterForTests(provider: Provider, adapter: ProviderAdapter): void {
  ADAPTERS[provider] = adapter;
}

/** Restore the real adapter after a test override. */
export function resetAdapterForTests(provider: Provider): void {
  const originals: Record<Provider, ProviderAdapter> = {
    openai: openaiAdapter,
    anthropic: anthropicAdapter,
    google: googleAdapter,
    deepseek: deepseekAdapter,
    groq: groqAdapter,
    xai: xaiAdapter,
    openrouter: openrouterAdapter,
  };
  ADAPTERS[provider] = originals[provider];
}
