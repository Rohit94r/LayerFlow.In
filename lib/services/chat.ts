import type { ChatEvent, ChatSession } from "@layerflow/contracts";
import {
  archiveChatSessionResponseSchema,
  chatKeysHealthResponseSchema,
  createChatSessionResponseSchema,
  getChatSessionResponseSchema,
  listChatSessionsResponseSchema,
  switchChatModelResponseSchema,
  type ArchiveChatSessionResponse,
  type ChatKeysHealthResponse,
  type CreateChatSessionRequest,
  type CreateChatSessionResponse,
  type GetChatSessionResponse,
  type ListChatSessionsResponse,
  type SwitchChatModelResponse,
} from "@layerflow/contracts";
import { apiFetch, ApiClientError, getServerCookieHeader } from "@/lib/api/client";
import { getApiBaseUrl } from "@/lib/api/config";

/**
 * Multi-AI chat workspace — frontend service.
 * Answers stream over SSE; the rest are normal JSON calls through apiFetch.
 */
export const chatService = {
  list: async (opts: { q?: string; limit?: number; offset?: number } = {}) =>
    apiFetch<ListChatSessionsResponse>(
      "/api/chat",
      { query: { q: opts.q, limit: opts.limit, offset: opts.offset } },
      listChatSessionsResponseSchema,
    ),

  /** Server-component variant — forwards the session cookie (same-origin API). */
  listServer: async (opts: { limit?: number } = {}): Promise<ListChatSessionsResponse> => {
    const headers = await getServerCookieHeader();
    return apiFetch<ListChatSessionsResponse>(
      "/api/chat",
      { query: { limit: opts.limit }, ...(headers.Cookie ? { headers } : {}) },
      listChatSessionsResponseSchema,
    );
  },

  create: async (body: CreateChatSessionRequest) =>
    apiFetch<CreateChatSessionResponse>(
      "/api/chat",
      { method: "POST", body },
      createChatSessionResponseSchema,
    ),

  get: async (id: string) =>
    apiFetch<GetChatSessionResponse>(`/api/chat/${id}`, {}, getChatSessionResponseSchema),

  switchModel: async (id: string, model: string) =>
    apiFetch<SwitchChatModelResponse>(
      `/api/chat/${id}/switch`,
      { method: "POST", body: { model } },
      switchChatModelResponseSchema,
    ),

  setAutoSwitch: async (id: string, autoSwitch: boolean) =>
    apiFetch<SwitchChatModelResponse>(
      `/api/chat/${id}/auto-switch`,
      { method: "PATCH", body: { autoSwitch } },
      switchChatModelResponseSchema,
    ),

  archive: async (id: string) =>
    apiFetch<ArchiveChatSessionResponse>(
      `/api/chat/${id}`,
      { method: "DELETE" },
      archiveChatSessionResponseSchema,
    ),

  keysHealth: async () =>
    apiFetch<ChatKeysHealthResponse>(
      "/api/chat/keys-health",
      {},
      chatKeysHealthResponseSchema,
    ),
};

/**
 * Send a message and consume the SSE stream.
 * Kicks off with the streaming POST; errors are surfaced as thrown ApiClientError.
 */
export async function streamChatMessage(input: {
  sessionId: string;
  content: string;
  model?: string;
  autoSwitch?: boolean;
  signal?: AbortSignal;
  onEvent: (event: ChatEvent) => void;
}): Promise<void> {
  const { sessionId, content, model, autoSwitch, signal, onEvent } = input;

  const res = await fetch(`${getApiBaseUrl()}/api/chat/${sessionId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({ content, model, autoSwitch }),
    credentials: "include",
    signal,
  });

  if (!res.ok) {
    let code = `http_${res.status}`;
    let message = res.statusText || `Request failed (${res.status})`;
    try {
      const json = (await res.json()) as { error?: { code?: string; message?: string } };
      if (json.error?.code) code = json.error.code;
      if (json.error?.message) message = json.error.message;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiClientError(res.status, code, message);
  }

  if (!res.body) {
    throw new ApiClientError(0, "no_stream", "No response stream from the server");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let sep: number;
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      const chunk = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      for (const line of chunk.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (!data) continue;
        if (data === "[DONE]") return;
        try {
          onEvent(JSON.parse(data) as ChatEvent);
        } catch {
          /* ignore malformed frame */
        }
      }
    }
  }
}

export type { ChatSession };