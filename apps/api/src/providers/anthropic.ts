import { AppError } from "../middleware/error";
import { parseSseJson } from "./sse";
import type {
  ChatCompletionRequest,
  ChatCompletionResult,
  ChatCompletionStreamHandlers,
  ProviderAdapter,
} from "./types";

/**
 * Anthropic Messages API → chat-completions shape.
 * System messages are pulled out into the top-level `system` field.
 */

function toAnthropicPayload(req: ChatCompletionRequest): {
  system?: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
} {
  const systemParts: string[] = [];
  const messages: Array<{ role: "user" | "assistant"; content: string }> = [];

  for (const msg of req.messages) {
    if (msg.role === "system") {
      systemParts.push(msg.content);
    } else {
      messages.push({ role: msg.role, content: msg.content });
    }
  }

  // Anthropic requires at least one user message and alternating roles.
  if (messages.length === 0) {
    messages.push({ role: "user", content: "(empty)" });
  }

  return {
    ...(systemParts.length > 0 ? { system: systemParts.join("\n\n") } : {}),
    messages,
  };
}

export const anthropicAdapter: ProviderAdapter = {
  provider: "anthropic",

  async chatCompletion(req: ChatCompletionRequest): Promise<ChatCompletionResult> {
    const started = Date.now();
    const { system, messages } = toAnthropicPayload(req);

    let res: Response;
    try {
      res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": req.apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: req.model,
          max_tokens: 4096,
          ...(system ? { system } : {}),
          messages,
        }),
      });
    } catch (err) {
      throw new AppError(
        502,
        "provider_unreachable",
        `anthropic request failed: ${err instanceof Error ? err.message : "network error"}`,
      );
    }

    const latencyMs = Date.now() - started;
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;

    if (!res.ok) {
      const message =
        (body as { error?: { message?: string } }).error?.message ??
        `anthropic returned ${res.status}`;
      throw new AppError(
        res.status === 401 || res.status === 403 ? 400 : 502,
        "provider_error",
        message,
      );
    }

    const contentBlocks = body.content as Array<{ type?: string; text?: string }> | undefined;
    const content =
      contentBlocks
        ?.filter((b) => b.type === "text" && typeof b.text === "string")
        .map((b) => b.text!)
        .join("") ?? "";

    const usage = body.usage as { input_tokens?: number; output_tokens?: number } | undefined;

    return {
      content,
      inputTokens: usage?.input_tokens ?? 0,
      outputTokens: usage?.output_tokens ?? 0,
      latencyMs,
      raw: body,
    };
  },

  async chatCompletionStream(
    req: ChatCompletionRequest,
    handlers: ChatCompletionStreamHandlers,
  ): Promise<ChatCompletionResult> {
    const started = Date.now();
    const { system, messages } = toAnthropicPayload(req);

    let res: Response;
    try {
      res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": req.apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({
          model: req.model,
          max_tokens: 4096,
          stream: true,
          ...(system ? { system } : {}),
          messages,
        }),
      });
    } catch (err) {
      throw new AppError(
        502,
        "provider_unreachable",
        `anthropic request failed: ${err instanceof Error ? err.message : "network error"}`,
      );
    }

    if (!res.ok || !res.body) {
      const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      const message =
        (body as { error?: { message?: string } }).error?.message ??
        `anthropic returned ${res.status}`;
      throw new AppError(
        res.status === 401 || res.status === 403 ? 400 : 502,
        "provider_error",
        message,
      );
    }

    let content = "";
    let inputTokens = 0;
    let outputTokens = 0;

    // Event stream: message_start (input usage) → content_block_delta
    // (text_delta) → message_delta (final output usage) → message_stop.
    for await (const event of parseSseJson(res.body)) {
      const type = event.type as string | undefined;
      if (type === "message_start") {
        const message = event.message as { usage?: { input_tokens?: number } } | undefined;
        inputTokens = message?.usage?.input_tokens ?? inputTokens;
      } else if (type === "content_block_delta") {
        const delta = event.delta as { type?: string; text?: string } | undefined;
        if (delta?.type === "text_delta" && delta.text) {
          content += delta.text;
          await handlers.onDelta(delta.text);
        }
      } else if (type === "message_delta") {
        const usage = event.usage as { output_tokens?: number } | undefined;
        outputTokens = usage?.output_tokens ?? outputTokens;
      } else if (type === "error") {
        const error = event.error as { message?: string } | undefined;
        throw new AppError(502, "provider_error", error?.message ?? "anthropic stream error");
      }
    }

    return { content, inputTokens, outputTokens, latencyMs: Date.now() - started };
  },
};
