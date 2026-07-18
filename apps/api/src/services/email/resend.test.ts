import { afterEach, describe, expect, it, vi } from "vitest";
import { isEmailEnabled, resetEmailFetch, sendEmail, setEmailFetch } from "./resend";

afterEach(() => {
  resetEmailFetch();
  delete process.env.RESEND_API_KEY;
  delete process.env.FROM_EMAIL;
});

// getEnv() caches, so tests mutate the cached object through process.env before
// first use — instead we re-read via the cached singleton. Because setup.ts
// runs first, the cache may already exist; mutate it directly.
async function withEnv(vars: Record<string, string | undefined>, fn: () => Promise<void>) {
  const { getEnv } = await import("../../config/env");
  const env = getEnv() as unknown as Record<string, unknown>;
  const previous: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(vars)) {
    previous[k] = env[k];
    env[k] = v;
  }
  try {
    await fn();
  } finally {
    for (const [k, v] of Object.entries(previous)) env[k] = v;
  }
}

describe("resend email service", () => {
  it("is a logged no-op without RESEND_API_KEY", async () => {
    await withEnv({ RESEND_API_KEY: undefined }, async () => {
      expect(isEmailEnabled()).toBe(false);
      const result = await sendEmail({ to: "a@b.co", subject: "s", html: "<p>x</p>" });
      expect(result).toEqual({ sent: false, skipped: true });
    });
  });

  it("posts to Resend with idempotency key when configured", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "email_123" }), { status: 200 }),
    );
    setEmailFetch(fetchMock as unknown as typeof fetch);

    await withEnv(
      { RESEND_API_KEY: "re_test_key", FROM_EMAIL: "LayerFlow <alerts@layerflow.dev>" },
      async () => {
        const result = await sendEmail({
          to: "owner@example.com",
          subject: "Budget at 80%",
          html: "<p>hi</p>",
          text: "hi",
          idempotencyKey: "budget-alert:ws_1:2026-07:warn",
        });
        expect(result.sent).toBe(true);
        expect(result.id).toBe("email_123");

        const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
        expect(url).toBe("https://api.resend.com/emails");
        const headers = init.headers as Record<string, string>;
        expect(headers.Authorization).toBe("Bearer re_test_key");
        expect(headers["Idempotency-Key"]).toBe("budget-alert:ws_1:2026-07:warn");
        const body = JSON.parse(init.body as string);
        expect(body.from).toBe("LayerFlow <alerts@layerflow.dev>");
        expect(body.to).toEqual(["owner@example.com"]);
      },
    );
  });

  it("reports failure without throwing when Resend rejects", async () => {
    setEmailFetch(
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ message: "invalid from" }), { status: 422 }),
        ) as unknown as typeof fetch,
    );
    await withEnv({ RESEND_API_KEY: "re_test_key" }, async () => {
      const result = await sendEmail({ to: "a@b.co", subject: "s", html: "x" });
      expect(result.sent).toBe(false);
      expect(result.skipped).toBe(false);
      expect(result.error).toContain("invalid from");
    });
  });
});
