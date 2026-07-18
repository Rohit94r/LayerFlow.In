import { AppError } from "../middleware/error";
import type { ChatCompletionRequest, ChatCompletionResult, ProviderAdapter } from "./types";

/**
 * Anthropic Messages API → chat-completions shape.
 * System messages are pulled out into the top-level `system` field.
 */
export const anthropicAdapter: ProviderAdapter = {
  provider: "anthropic",

  async chatCompletion(req: ChatCompletionRequest): Promise<ChatCompletionResult> {
    const started = Date.now();
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
          ...(systemParts.length > 0 ? { system: systemParts.join("\n\n") } : {}),
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
};
