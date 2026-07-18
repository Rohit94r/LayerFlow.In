/**
 * Gateway-local helpers that are NOT part of the shared provider adapters.
 *
 * Shared adapters live in `apps/api/src/providers/` (Runs agent). Non-stream
 * chat completions should go through `resolveProviderFromModel` there.
 *
 * This file only covers streaming SSE piping for OpenAI-compatible providers,
 * plus a fetch injection seam used when the shared adapter path is unavailable.
 */

import type { Provider } from "@layerflow/model-registry";
import { AppError } from "../middleware/error";

const STREAM_BASE_URLS: Partial<Record<Provider, string>> = {
  openai: "https://api.openai.com/v1",
  deepseek: "https://api.deepseek.com/v1",
  groq: "https://api.groq.com/openai/v1",
  xai: "https://api.x.ai/v1",
  openrouter: "https://openrouter.ai/api/v1",
  google: "https://generativelanguage.googleapis.com/v1beta/openai",
};

let fetchImpl: typeof fetch = globalThis.fetch.bind(globalThis);

export function setGatewayFetch(fn: typeof fetch): void {
  fetchImpl = fn;
}

export function resetGatewayFetch(): void {
  fetchImpl = globalThis.fetch.bind(globalThis);
}

/** Pipe OpenAI-compatible SSE from the provider. Anthropic streaming is not handled here. */
export async function streamOpenAiCompatible(
  provider: Provider,
  apiKey: string,
  body: {
    model: string;
    messages: unknown[];
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
    max_completion_tokens?: number;
    stop?: string | string[];
    user?: string;
  },
): Promise<Response> {
  const base = STREAM_BASE_URLS[provider];
  if (!base) {
    throw new AppError(
      400,
      "stream_unsupported",
      `Streaming is not yet supported for provider "${provider}" on the gateway`,
    );
  }

  const res = await fetchImpl(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({ ...body, stream: true }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new AppError(
      502,
      "provider_error",
      `Provider ${provider} returned ${res.status}: ${text.slice(0, 400)}`,
    );
  }
  return res;
}
