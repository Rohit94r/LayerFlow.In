import { AppError } from "../middleware/app-error";
import type { ChatCompletionRequest, ChatCompletionResult, ProviderAdapter } from "./types";

/**
 * Google Gemini generateContent API → chat-completions shape.
 * System messages become systemInstruction; user/assistant map to contents.
 */
export const googleAdapter: ProviderAdapter = {
  provider: "google",

  async chatCompletion(req: ChatCompletionRequest): Promise<ChatCompletionResult> {
    const started = Date.now();
    const systemParts: string[] = [];
    const contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];

    for (const msg of req.messages) {
      if (msg.role === "system") {
        systemParts.push(msg.content);
      } else {
        contents.push({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.content }],
        });
      }
    }

    if (contents.length === 0) {
      contents.push({ role: "user", parts: [{ text: "(empty)" }] });
    }

    const url = new URL(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(req.model)}:generateContent`,
    );
    url.searchParams.set("key", req.apiKey);

    let res: Response;
    try {
      res = await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(systemParts.length > 0
            ? { systemInstruction: { parts: [{ text: systemParts.join("\n\n") }] } }
            : {}),
          contents,
          ...(req.maxTokens != null
            ? { generationConfig: { maxOutputTokens: req.maxTokens } }
            : {}),
        }),
      });
    } catch (err) {
      throw new AppError(
        502,
        "provider_unreachable",
        `google request failed: ${err instanceof Error ? err.message : "network error"}`,
      );
    }

    const latencyMs = Date.now() - started;
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;

    if (!res.ok) {
      const message =
        (body as { error?: { message?: string } }).error?.message ??
        `google returned ${res.status}`;
      throw new AppError(
        res.status === 401 || res.status === 403 ? 400 : 502,
        "provider_error",
        message,
      );
    }

    const candidates = body.candidates as
      | Array<{ content?: { parts?: Array<{ text?: string }> } }>
      | undefined;
    const content =
      candidates?.[0]?.content?.parts
        ?.map((p) => p.text ?? "")
        .join("") ?? "";

    const usage = body.usageMetadata as
      | { promptTokenCount?: number; candidatesTokenCount?: number }
      | undefined;

    return {
      content,
      inputTokens: usage?.promptTokenCount ?? 0,
      outputTokens: usage?.candidatesTokenCount ?? 0,
      latencyMs,
      raw: body,
    };
  },
};
