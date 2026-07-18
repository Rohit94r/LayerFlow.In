import type { Provider } from "@layerflow/model-registry";

/**
 * Shared provider adapter contract.
 * Owned by the Runs agent (`apps/api/src/providers/*`). Gateway and compare
 * both call through this interface.
 */

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  /** Decrypted BYOK secret — never logged. */
  apiKey: string;
  /** Reserved for streaming adapters; non-stream path ignores this. */
  stream?: boolean;
}

export interface ChatCompletionResult {
  content: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  /** Provider-native response body for debugging / storage. */
  raw?: unknown;
}

export interface ProviderAdapter {
  provider: Provider;
  chatCompletion(req: ChatCompletionRequest): Promise<ChatCompletionResult>;
}
