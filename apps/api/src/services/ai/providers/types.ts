import type { Provider } from "@layerflow/model-registry";

/**
 * Shared provider adapter contract.
 * Owned by the Runs agent (`apps/api/src/providers/*`). Gateway and compare
 * both call through this interface.
 */

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  /** Present on assistant messages that emitted function calls. */
  tool_calls?: Array<{ id: string; type: string; function: { name: string; arguments: string } }>;
  /** Present on tool role messages; the id of the call being answered. */
  tool_call_id?: string;
}

/** OpenAI-shaped function tool definition. */
export interface ChatTool {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
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
  /** Optional client abort signal — cancels the upstream provider request. */
  signal?: AbortSignal;
  /** OpenAI-shaped function definitions (function calling). */
  tools?: ChatTool[];
}

export interface ChatCompletionResult {
  content: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  /** Provider-native response body for debugging / storage. */
  raw?: unknown;
  /** Function calls emitted by the model, when tool calling was requested. */
  tool_calls?: ChatToolCall[];
}

/** A single function call argument (OpenAI-shaped). */
export interface ChatToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface ChatCompletionStreamHandlers {
  /** Called once per token/text delta, in order. */
  onDelta: (text: string) => void | Promise<void>;
  /** Called once per completed function call when tool calling was requested. */
  onToolCall?: (toolCall: ChatToolCall) => void | Promise<void>;
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
