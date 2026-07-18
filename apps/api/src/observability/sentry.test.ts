import { describe, expect, it } from "vitest";
import { initSentry, isSentryEnabled, scrubEvent, scrubObject, scrubText } from "./sentry";

describe("sentry redaction", () => {
  it("initSentry is a no-op without SENTRY_DSN", () => {
    delete process.env.SENTRY_DSN;
    expect(initSentry()).toBe(false);
    expect(isSentryEnabled()).toBe(false);
  });

  it("scrubText removes credential-shaped values", () => {
    const text =
      "openai sk-abc123def456ghi789 groq gsk_abc123def456 lf lf_live_abcdef123456 " +
      "resend re_abc123def456 google AIzaSyExample12345 header Bearer eyJhbGciOiJIUzI1";
    const out = scrubText(text);
    expect(out).not.toContain("sk-abc123def456ghi789");
    expect(out).not.toContain("gsk_abc123def456");
    expect(out).not.toContain("lf_live_abcdef123456");
    expect(out).not.toContain("re_abc123def456");
    expect(out).not.toContain("AIzaSyExample12345");
    expect(out).not.toContain("eyJhbGciOiJIUzI1");
    expect(out).toContain("[redacted]");
  });

  it("scrubObject redacts sensitive keys at any depth", () => {
    const scrubbed = scrubObject({
      apiKey: "secret-value",
      nested: { GOOGLE_CLIENT_SECRET: "oauth-secret", ok: "fine" },
      list: [{ authorization: "Bearer tok" }],
      plain: "hello",
    }) as Record<string, unknown>;
    expect(scrubbed.apiKey).toBe("[redacted]");
    expect((scrubbed.nested as Record<string, unknown>).GOOGLE_CLIENT_SECRET).toBe("[redacted]");
    expect((scrubbed.nested as Record<string, unknown>).ok).toBe("fine");
    expect(((scrubbed.list as unknown[])[0] as Record<string, unknown>).authorization).toBe(
      "[redacted]",
    );
    expect(scrubbed.plain).toBe("hello");
  });

  it("scrubEvent drops request bodies and redacts auth headers", () => {
    const event = scrubEvent({
      message: "failed with key sk-abc123def456ghi789",
      request: {
        url: "https://api.layerflow.dev/v1/chat/completions",
        data: { messages: [{ role: "user", content: "private prompt" }] },
        headers: {
          authorization: "Bearer lf_live_abcdef123456",
          cookie: "better-auth.session_token=xyz",
          "content-type": "application/json",
        },
        cookies: { session: "xyz" },
      },
      exception: {
        values: [{ type: "Error", value: "provider rejected gsk_abc123def456" }],
      },
    });

    expect(event.request?.data).toBeUndefined();
    expect(event.request?.cookies).toBeUndefined();
    expect(event.request?.headers?.authorization).toBe("[redacted]");
    expect(event.request?.headers?.cookie).toBe("[redacted]");
    expect(event.request?.headers?.["content-type"]).toBe("application/json");
    expect(event.message).not.toContain("sk-abc123def456ghi789");
    expect(event.exception?.values?.[0].value).not.toContain("gsk_abc123def456");
  });
});
