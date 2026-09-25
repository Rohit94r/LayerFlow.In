import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Phase 4: PostHog analytics. The client is env-gated (no-op without a key)
 * and fire-and-forget (a capture failure must never throw).
 */

describe("trackEvent (PostHog)", () => {
  beforeEach(async () => {
    const { setAnalyticsOverridesForTests } = await import("../services/analytics/posthog");
    setAnalyticsOverridesForTests({});
  });

  afterAll(async () => {
    const { setAnalyticsOverridesForTests } = await import("../services/analytics/posthog");
    setAnalyticsOverridesForTests({});
    vi.unstubAllGlobals();
  });

  it("is a no-op when no API key is configured", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const { trackEvent } = await import("../services/analytics/posthog");
    trackEvent({ distinctId: "u1", event: "user_signed_up" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("posts a well-formed capture payload to the default host", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchSpy);
    const { setAnalyticsOverridesForTests, trackEvent } = await import(
      "../services/analytics/posthog"
    );
    setAnalyticsOverridesForTests({ apiKey: "phc_test_123" });

    trackEvent({
      distinctId: "u_abc",
      workspaceId: "ws_123",
      event: "api_key_created",
      properties: { name: "prod", costUsd: 0.001 },
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://us.i.posthog.com/capture/");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");

    const body = JSON.parse(String(init.body));
    expect(body.api_key).toBe("phc_test_123");
    expect(body.event).toBe("api_key_created");
    expect(body.distinct_id).toBe("u_abc");
    expect(body.properties.workspaceId).toBe("ws_123");
    expect(body.properties.name).toBe("prod");
    expect(body.properties.costUsd).toBe(0.001);
    expect(body.properties.$lib).toBe("layerflow-server");
  });

  it("never throws when the capture request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    const { setAnalyticsOverridesForTests, trackEvent } = await import(
      "../services/analytics/posthog"
    );
    setAnalyticsOverridesForTests({ apiKey: "phc_test_fail" });

    expect(() =>
      trackEvent({ distinctId: "u1", event: "ping", properties: {} }),
    ).not.toThrow();
    await new Promise((r) => setTimeout(r, 10));
  });
});