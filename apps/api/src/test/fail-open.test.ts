import net from "node:net";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { canConnect, startTestDb } from "./helpers/integration-db";

/**
 * Phase 4.6 — GATEWAY_FAIL_OPEN for /v1/chat/completions.
 *
 * reserveBudget is mocked so we can deterministically simulate both failure
 * classes the router must distinguish:
 *   - budget_unavailable (503, LayerFlow's own Redis/infra down) → MAY pass
 *     through when GATEWAY_FAIL_OPEN=allow, marked x-lf-fail-open: 1.
 *   - budget_exceeded (402, a REAL over-limit decision) → ALWAYS blocks,
 *     fail-open or not.
 * Default (deny) fails closed: infra errors surface as 503 pass-through.
 */

const mockState = vi.hoisted(() => ({
  mode: "unavailable" as "unavailable" | "exceeded",
}));

vi.mock("../services/budgets/enforce", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/budgets/enforce")>();
  const { AppError } = await import("../middleware/app-error");
  return {
    ...actual,
    reserveBudget: vi.fn(async (input: never) => {
      if (mockState.mode === "unavailable") {
        throw new AppError(503, "budget_unavailable", "Redis unreachable");
      }
      throw new AppError(402, "budget_exceeded", "monthly limit hit");
    }),
  };
});

const stopDb = await startTestDb();

async function setupRequest() {
  const { createApp } = await import("../app");
  const { createTestSession } = await import("./auth");
  const { setAdapterForTests } = await import("../services/ai/providers");
  const app = createApp();
  const session = await createTestSession();

  const keyRes = await app.request("/api/keys", {
    method: "POST",
    headers: { cookie: session.cookie, "content-type": "application/json" },
    body: JSON.stringify({ name: "fail-open test" }),
  });
  const { secret } = (await keyRes.json()) as any;

  let adapterCalled = false;
  setAdapterForTests("openai", {
    provider: "openai",
    async chatCompletion() {
      adapterCalled = true;
      return { content: "still served", inputTokens: 3, outputTokens: 1, latencyMs: 1, raw: {} };
    },
  });

  const request = () =>
    app.request("/v1/chat/completions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${secret}`,
        "content-type": "application/json",
        "x-lf-provider-key": "sk-proj-fail-open-test-abcdef7890",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: "ping" }],
      }),
    });
  return { request, adapterCalled: () => adapterCalled, app };
}

async function setFailOpen(value: "allow" | "deny") {
  const env = await import("../config/env");
  process.env.GATEWAY_FAIL_OPEN = value;
  env.__resetEnvForTests();
}

describe("GATEWAY_FAIL_OPEN", () => {
  beforeAll(async () => {
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    const { db } = await import("../db/client");
    await migrate(db, { migrationsFolder: "./drizzle" });
  });

  afterAll(async () => {
    const { resetAdapterForTests } = await import("../services/ai/providers");
    resetAdapterForTests("openai");
    const { pool } = await import("../db/client");
    const { redis } = await import("../redis/client");
    await pool.end();
    redis.disconnect();
    await stopDb.stop();
  });

  describe("GATEWAY_FAIL_OPEN=allow", () => {
    it("passes through unmeasured when budget enforcement is unavailable", async () => {
      await setFailOpen("allow");
      mockState.mode = "unavailable";
      const { request, adapterCalled, app } = await setupRequest();
      void app;

      const res = await request();
      expect(res.status).toBe(200);
      expect(res.headers.get("x-lf-fail-open")).toBe("1");
      const body = (await res.json()) as any;
      expect(body.choices[0].message.content).toBe("still served");
      expect(adapterCalled()).toBe(true);
    });

    it("still blocks a real budget_exceeded (fail-open never bypasses a 402)", async () => {
      await setFailOpen("allow");
      mockState.mode = "exceeded";
      const { request, adapterCalled, app } = await setupRequest();
      void app;

      const res = await request();
      expect(res.status).toBe(402);
      expect(((await res.json()) as any).error.code).toBe("budget_exceeded");
      expect(res.headers.get("x-lf-fail-open")).toBeNull();
      expect(adapterCalled()).toBe(false);
    });
  });

  describe("GATEWAY_FAIL_OPEN=deny (default)", () => {
    it("fails closed: infra errors surface as 503, no pass-through", async () => {
      await setFailOpen("deny");
      mockState.mode = "unavailable";
      const { request, adapterCalled, app } = await setupRequest();
      void app;

      const res = await request();
      expect(res.status).toBe(503);
      expect(((await res.json()) as any).error.code).toBe("budget_unavailable");
      expect(res.headers.get("x-lf-fail-open")).toBeNull();
      expect(adapterCalled()).toBe(false);
    });
  });
});