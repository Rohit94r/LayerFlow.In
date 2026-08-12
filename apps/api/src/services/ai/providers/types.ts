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
  /** Cap completion length (Prefer-cheap / tokenSaver short answers). */
  maxTokens?: number;
  /**
   * Sampling temperature (0..2). Omit to use the provider default; the chat
   * router sets a per-provider default so switching models never inherits the
   * previous model's temperature.
   */
  temperature?: number;
}

export interface ChatCompletionResult {
  content: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  /** Provider-native response body for debugging / storage. */
  raw?: unknown;
}

export interface ChatCompletionStreamHandlers {
  /** Called once per token/text delta, in order. */
  onDelta: (text: string) => void | Promise<void>;
}

export interface ProviderAdapter {
  provider: Provider;
  chatCompletion(req: ChatCompletionRequest): Promise<ChatCompletionResult>;
  /**
   * True token streaming. Resolves with the same final result shape as
   * chatCompletion — including real usage when the provider reports it in the
   * stream (OpenAI-compatible `stream_options.include_usage`, Anthropic
   * message_start/message_delta events). Optional: callers must fall back to
   * chatCompletion when absent.
   */
  chatCompletionStream?(
    req: ChatCompletionRequest,
    handlers: ChatCompletionStreamHandlers,
  ): Promise<ChatCompletionResult>;
}
