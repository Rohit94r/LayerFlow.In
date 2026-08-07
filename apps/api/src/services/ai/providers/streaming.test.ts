import { afterEach, describe, expect, it, vi } from "vitest";
import { anthropicAdapter } from "./anthropic";
import { createOpenAICompatibleAdapter } from "./openai-compatible";
import { parseSseJson } from "./sse";

function sseResponse(events: string[]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const event of events) controller.enqueue(encoder.encode(event));
      controller.close();
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("parseSseJson", () => {
  it("yields JSON events, skipping comments and [DONE]", async () => {
    const res = sseResponse([
      ": keepalive\n\n",
      'data: {"a":1}\n\n',
      'data: {"b":2}\r\n\r\n',
      "data: [DONE]\n\n",
    ]);
    const events: unknown[] = [];
    for await (const event of parseSseJson(res.body!)) events.push(event);
    expect(events).toEqual([{ a: 1 }, { b: 2 }]);
  });

  it("handles events split across chunk boundaries", async () => {
    const res = sseResponse(['data: {"hel', 'lo":"wor', 'ld"}\n\n']);
    const events: unknown[] = [];
    for await (const event of parseSseJson(res.body!)) events.push(event);
    expect(events).toEqual([{ hello: "world" }]);
  });
});

describe("openai-compatible streaming", () => {
  it("forwards deltas in order and returns usage from the final frame", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      sseResponse([
        'data: {"choices":[{"delta":{"role":"assistant","content":""}}]}\n\n',
        'data: {"choices":[{"delta":{"content":"Hel"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":"lo!"}}]}\n\n',
        'data: {"choices":[{"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":12,"completion_tokens":4}}\n\n',
        "data: [DONE]\n\n",
      ]),
    );
    vi.stubGlobal("fetch", fetchMock);

    const adapter = createOpenAICompatibleAdapter({
      provider: "openai",
      baseUrl: "https://api.openai.com/v1",
    });

    const deltas: string[] = [];
    const result = await adapter.chatCompletionStream!(
      { model: "gpt-4o-mini", messages: [{ role: "user", content: "hi" }], apiKey: "k" },
      { onDelta: (text) => void deltas.push(text) },
    );

    expect(deltas).toEqual(["Hel", "lo!"]);
    expect(result.content).toBe("Hello!");
    expect(result.inputTokens).toBe(12);
    expect(result.outputTokens).toBe(4);

    // Requests real usage in the stream.
    const requestBody = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(requestBody.stream).toBe(true);
    expect(requestBody.stream_options).toEqual({ include_usage: true });
  });

  it("surfaces provider errors as AppError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: { message: "invalid key" } }), { status: 401 }),
      ),
    );
    const adapter = createOpenAICompatibleAdapter({
      provider: "groq",
      baseUrl: "https://api.groq.com/openai/v1",
    });
    await expect(
      adapter.chatCompletionStream!(
        { model: "llama-3.3-70b-versatile", messages: [], apiKey: "bad" },
        { onDelta: () => undefined },
      ),
    ).rejects.toMatchObject({ status: 400, code: "provider_error" });
  });
});

describe("anthropic streaming", () => {
  it("accumulates text deltas and usage from message_start/message_delta", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        sseResponse([
          'event: message_start\ndata: {"type":"message_start","message":{"usage":{"input_tokens":21}}}\n\n',
          'event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hi "}}\n\n',
          'event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"there"}}\n\n',
          'event: message_delta\ndata: {"type":"message_delta","usage":{"output_tokens":7}}\n\n',
          'event: message_stop\ndata: {"type":"message_stop"}\n\n',
        ]),
      ),
    );

    const deltas: string[] = [];
    const result = await anthropicAdapter.chatCompletionStream!(
      {
        model: "claude-sonnet-4-5",
        messages: [
          { role: "system", content: "be brief" },
          { role: "user", content: "hello" },
        ],
        apiKey: "k",
      },
      { onDelta: (text) => void deltas.push(text) },
    );

    expect(deltas).toEqual(["Hi ", "there"]);
    expect(result.content).toBe("Hi there");
    expect(result.inputTokens).toBe(21);
    expect(result.outputTokens).toBe(7);
  });

  it("throws on stream error events", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        sseResponse([
          'event: error\ndata: {"type":"error","error":{"message":"overloaded"}}\n\n',
        ]),
      ),
    );
    await expect(
      anthropicAdapter.chatCompletionStream!(
        { model: "claude-sonnet-4-5", messages: [{ role: "user", content: "x" }], apiKey: "k" },
        { onDelta: () => undefined },
      ),
    ).rejects.toMatchObject({ code: "provider_error" });
  });
});
