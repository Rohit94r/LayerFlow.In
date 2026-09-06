import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("../../redis/client", () => ({
  redis: {
    set: vi.fn(async () => "OK"),
    get: vi.fn(async () => null),
    del: vi.fn(async () => 1),
    keys: vi.fn(async () => []),
  },
}));

import { Hono } from "hono";
import type { AppEnv } from "../../types";
import { redis } from "../../redis/client";
import { deviceAuthRouter } from "./device";

describe("device auth (lf terminal)", () => {
  let app: Hono<AppEnv>;

  beforeAll(async () => {
    const { handleError } = await import("../../middleware/app-error");
    app = new Hono<AppEnv>();
    app.route("/auth", deviceAuthRouter);
    app.onError(handleError);
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  function api(
    method: string,
    path: string,
    body?: string,
    contentType?: string,
  ): Promise<{ status: number; json: any }> {
    return app.request(path, {
      method,
      headers: body !== undefined ? { "content-type": contentType ?? "application/json" } : {},
      ...(body !== undefined ? { body } : {}),
    }).then(async (res) => {
      const text = await res.text();
      return { status: res.status, json: text ? JSON.parse(text) : undefined };
    });
  }

  it("POST /auth/device mints a device code", async () => {
    vi.mocked(redis.set).mockClear();
    const { status, json } = await api(
      "POST",
      "/auth/device",
      "client_id=layerflow-lf-cli",
      "application/x-www-form-urlencoded",
    );

    expect(status).toBe(200);
    expect(json.device_code).toMatch(/^[a-f0-9]{64}$/);
    expect(json.user_code).toMatch(/^[A-F0-9]{6}$/);
    expect(vi.mocked(redis.set)).toHaveBeenCalledOnce();
  });

  it("POST /auth/token with a form-encoded body returns authorization_pending (not 500)", async () => {
    vi.mocked(redis.get).mockResolvedValueOnce(
      JSON.stringify({
        userCode: "ABC123",
        status: "pending",
        apiKeySecret: null,
      }),
    );
    const { status, json } = await api(
      "POST",
      "/auth/token",
      "grant_type=urn:ietf:params:oauth:grant-type:device_code&device_code=deadbeef",
      "application/x-www-form-urlencoded",
    );

    expect(status).toBe(400);
    expect(json.error).toBe("authorization_pending");
  });

  it("POST /auth/token returns the minted key when approved", async () => {
    vi.mocked(redis.get).mockResolvedValueOnce(
      JSON.stringify({
        userCode: "ABC123",
        status: "approved",
        apiKeySecret: "lf_live_minted_secret",
      }),
    );
    const { status, json } = await api(
      "POST",
      "/auth/token",
      "grant_type=urn:ietf:params:oauth:grant-type:device_code&device_code=deadbeef",
      "application/x-www-form-urlencoded",
    );

    expect(status).toBe(200);
    expect(json.access_token).toBe("lf_live_minted_secret");
  });

  it("POST /auth/token works with JSON bodies too", async () => {
    vi.mocked(redis.get).mockResolvedValueOnce(
      JSON.stringify({
        userCode: "ABC123",
        status: "pending",
        apiKeySecret: null,
      }),
    );
    const { status, json } = await api("POST", "/auth/token", JSON.stringify({ device_code: "deadbeef" }));

    expect(status).toBe(400);
    expect(json.error).toBe("authorization_pending");
  });
});