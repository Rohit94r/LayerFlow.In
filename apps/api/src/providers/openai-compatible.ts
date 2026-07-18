import { AppError } from "../middleware/error";
import type { ChatCompletionRequest, ChatCompletionResult, ProviderAdapter } from "./types";
import type { Provider } from "@layerflow/model-registry";

/**
 * Shared fetch helper for OpenAI-compatible chat/completions endpoints
 * (OpenAI, DeepSeek, Groq, xAI, OpenRouter).
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
          }),
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
          res.status === 401 || res.status === 403 ? 400 : 502,
          "provider_error",
          message,
        );
      }

      const choices = body.choices as Array<{ message?: { content?: string | null } }> | undefined;
      const content = choices?.[0]?.message?.content ?? "";
      const usage = body.usage as
        | { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
        | undefined;

      return {
        content: typeof content === "string" ? content : "",
        inputTokens: usage?.prompt_tokens ?? 0,
        outputTokens: usage?.completion_tokens ?? 0,
        latencyMs,
        raw: body,
      };
    },
  };
}
