import { AppError } from "../../../middleware/app-error";
import { parseSseJson } from "./sse";
import type {
  ChatCompletionRequest,
  ChatCompletionResult,
  ChatCompletionStreamHandlers,
  ChatToolCall,
  ProviderAdapter,
} from "./types";
import type { Provider } from "@layerflow/model-registry";

/**
 * Shared fetch helper for OpenAI-compatible chat/completions endpoints
 * (OpenAI, DeepSeek, Groq, xAI, OpenRouter). Supports non-streaming and true
 * SSE token streaming with real usage via `stream_options.include_usage`.
 */
export function createOpenAICompatibleAdapter(opts: {
  provider: Provider;
  baseUrl: string;
  /** Extra headers (e.g. OpenRouter HTTP-Referer). */
  extraHeaders?: (apiKey: string) => Record<string, string>;
}): ProviderAdapter {
  return {
    provider: opts.provider,
    async chatCompletion(req: ChatCompletionRequest): Promise<ChatCompletionResult> {
      const started = Date.now();
      const headers: Record<string, string> = {
        Authorization: `Bearer ${req.apiKey}`,
        "Content-Type": "application/json",
        ...(opts.extraHeaders?.(req.apiKey) ?? {}),
      };

      let res: Response;
      try {
        res = await fetch(`${opts.baseUrl}/chat/completions`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            model: req.model,
            messages: req.messages,
            stream: false,
            ...(req.temperature != null ? { temperature: req.temperature } : {}),
            ...(req.maxTokens != null ? { max_tokens: req.maxTokens } : {}),
            ...(req.tools != null ? { tools: req.tools } : {}),
          }),
          ...(req.signal ? { signal: req.signal } : {}),
        });
      } catch (err) {
        throw new AppError(
          502,
          "provider_unreachable",
          `${opts.provider} request failed: ${err instanceof Error ? err.message : "network error"}`,
        );
      }

      const latencyMs = Date.now() - started;
      const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;

      if (!res.ok) {
        const message =
          (body as { error?: { message?: string } }).error?.message ??
          (typeof body.error === "string" ? body.error : undefined) ??
          `${opts.provider} returned ${res.status}`;
        throw new AppError(
          res.status >= 500 ? 502 : (res.status as 400 | 401 | 402 | 403 | 404 | 429),
          "provider_error",
          message,
        );
      }

      const choices = body.choices as
        | Array<{ message?: { content?: string | null; tool_calls?: ChatToolCall[] } }>
        | undefined;
      const content = choices?.[0]?.message?.content ?? "";
      const toolCalls = choices?.[0]?.message?.tool_calls;
      const usage = body.usage as
        | { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
        | undefined;

      return {
        content: typeof content === "string" ? content : "",
        tool_calls: Array.isArray(toolCalls) ? toolCalls : undefined,
        inputTokens: usage?.prompt_tokens ?? 0,
        outputTokens: usage?.completion_tokens ?? 0,
        latencyMs,
        raw: body,
      };
    },

    async chatCompletionStream(
      req: ChatCompletionRequest,
      handlers: ChatCompletionStreamHandlers,
    ): Promise<ChatCompletionResult> {
      const started = Date.now();
      const headers: Record<string, string> = {
        Authorization: `Bearer ${req.apiKey}`,
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        ...(opts.extraHeaders?.(req.apiKey) ?? {}),
      };

      let res: Response;
      try {
        res = await fetch(`${opts.baseUrl}/chat/completions`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            model: req.model,
            messages: req.messages,
            stream: true,
            // Ask for real usage in the final chunk (supported by OpenAI,
            // Groq, DeepSeek, xAI, OpenRouter).
            stream_options: { include_usage: true },
            ...(req.temperature != null ? { temperature: req.temperature } : {}),
            ...(req.maxTokens != null ? { max_tokens: req.maxTokens } : {}),
            ...(req.tools != null ? { tools: req.tools } : {}),
          }),
          ...(req.signal ? { signal: req.signal } : {}),
        });
      } catch (err) {
        throw new AppError(
          502,
          "provider_unreachable",
          `${opts.provider} request failed: ${err instanceof Error ? err.message : "network error"}`,
        );
      }

      if (!res.ok || !res.body) {
        const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        const message =
          (body as { error?: { message?: string } }).error?.message ??
          `${opts.provider} returned ${res.status}`;
        throw new AppError(
          res.status >= 500 ? 502 : (res.status as 400 | 401 | 402 | 403 | 404 | 429),
          "provider_error",
          message,
        );
      }

      let content = "";
      let usage:
        | { prompt_tokens?: number; completion_tokens?: number }
        | undefined;
      // Tool calls stream as per-index deltas: a first chunk carries
      // {index, id, function:{name}}, later chunks carry {index, function:{arguments}}.
      // Accumulate per index and emit each call once its id + name are known.
      const toolCalls: ChatToolCall[] = [];

      for await (const event of parseSseJson(res.body)) {
        const choices = event.choices as
          | Array<{ delta?: { content?: string | null; tool_calls?: unknown } }>
          | undefined;
        const delta = choices?.[0]?.delta;
        if (delta) {
          if (typeof delta.content === "string" && delta.content.length > 0) {
            content += delta.content;
            await handlers.onDelta(delta.content);
          }
          if (Array.isArray(delta.tool_calls)) {
            for (const raw of delta.tool_calls as Array<{
              index?: number;
              id?: string;
              type?: string;
              function?: { name?: string; arguments?: string };
            }>) {
              const i = raw.index ?? toolCalls.length;
              const acc = (toolCalls[i] ??= {
                id: "",
                type: "function",
                function: { name: "", arguments: "" },
              });
              if (raw.id) acc.id = raw.id;
              if (raw.function?.name) acc.function.name += raw.function.name;
              if (raw.function?.arguments) acc.function.arguments += raw.function.arguments;
            }
          }
        }
        if (event.usage) {
          usage = event.usage as { prompt_tokens?: number; completion_tokens?: number };
        }
      }

      const settled = toolCalls.filter((tc) => tc.id !== "" && tc.function.name !== "");
      if (settled.length > 0 && handlers.onToolCall) {
        for (const tc of settled) {
          await handlers.onToolCall(tc);
        }
      }

      return {
        content,
        tool_calls: settled.length > 0 ? settled : undefined,
        inputTokens: usage?.prompt_tokens ?? 0,
        outputTokens: usage?.completion_tokens ?? 0,
        latencyMs: Date.now() - started,
      };
    },
  };
}
