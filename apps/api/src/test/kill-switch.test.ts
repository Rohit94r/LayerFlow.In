import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startTestDb } from "./helpers/integration-db";

/**
 * Phase 4: runaway-loop kill switch. N identical calls in T seconds pause the
 * API key for a cooldown + alert the owner; distinct requests never pause.
 */

const stopDb = await startTestDb();

describe("runaway-loop kill switch", () => {
  beforeAll(async () => {
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    const { db } = await import("../db/client");
    await migrate(db, { migrationsFolder: "./drizzle" });
  });

  afterAll(async () => {
    const { pool } = await import("../db/client");
    const { redis } = await import("../redis/client");
    await pool.end();
    redis.disconnect();
    await stopDb.stop();
  });

  describe("requestSignature", () => {
    it("is deterministic and content-sensitive", async () => {
      const { requestSignature } = await import("../gateway/kill-switch");
      const a = requestSignature("gpt-4o-mini", [{ role: "user", content: "ping" }]);
      const b = requestSignature("gpt-4o-mini", [{ role: "user", content: "ping" }]);
      const c = requestSignature("gpt-4o-mini", [{ role: "user", content: "pong" }]);
      const d = requestSignature("claude-sonnet-4", [{ role: "user", content: "ping" }]);
      expect(a).toBe(b);
      expect(a).not.toBe(c);
      expect(a).not.toBe(d);
    });
  });

  describe("countGatewayCall", () => {
    it("pauses after maxIdentical identical calls inside the window", async () => {
      const { countGatewayCall } = await import("../gateway/kill-switch");
      const { redis } = await import("../redis/client");
      const opts = { maxIdentical: 3, windowSeconds: 60, cooldownSeconds: 60 } as const;
      const args = {
        workspaceId: "ws_kill_unit",
        apiKeyId: "key_kill_unit_a",
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: "ping" }],
      };

      const r1 = await countGatewayCall(args, opts);
      expect(r1.paused).toBe(false);
      expect(r1.count).toBe(1);
      await countGatewayCall(args, opts);
      await countGatewayCall(args, opts);
      const r4 = await countGatewayCall(args, opts);
      expect(r4.count).toBe(4);
      expect(r4.paused).toBe(true);

      const blocked = await redis.exists(`lf:loop:blocked:key_kill_unit_a`);
      expect(blocked).toBe(1);
      const isPaused = await (
        await import("../gateway/kill-switch")
      ).isKeyKillSwitched("key_kill_unit_a");
      expect(isPaused).toBe(true);
      await redis.del(`lf:loop:blocked:key_kill_unit_a`);
    });

    it("never pauses distinct content even past a low threshold", async () => {
      const { countGatewayCall } = await import("../gateway/kill-switch");
      const opts = { maxIdentical: 2, windowSeconds: 60, cooldownSeconds: 60 } as const;
      for (let i = 0; i < 5; i++) {
        const r = await countGatewayCall(
          {
            workspaceId: "ws_kill_unit",
            apiKeyId: "key_kill_unit_b",
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: `ping ${i}` }],
          },
          opts,
        );
        expect(r.paused).toBe(false);
      }
    });

    it("is a no-op when maxIdentical is 0 (kill switch disabled)", async () => {
      const { countGatewayCall } = await import("../gateway/kill-switch");
      const opts = { maxIdentical: 0, windowSeconds: 60, cooldownSeconds: 60 } as const;
      const args = {
        workspaceId: "ws_kill_unit",
        apiKeyId: "key_kill_unit_c",
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: "ping" }],
      };
      for (let i = 0; i < 5; i++) {
        const r = await countGatewayCall(args, opts);
        expect(r.paused).toBe(false);
        expect(r.count).toBe(0);
      }
    });
  });

  describe("gateway integration", () => {
    it("rejects a paused key with 429 runaway_loop_blocked", async () => {
      const { createApp } = await import("../app");
      const { createTestSession } = await import("./auth");
      const { setAdapterForTests } = await import("../services/ai/providers");
      const app = createApp();
      const session = await createTestSession();

      await app.request("/api/budgets/current", {
        method: "PUT",
        headers: { cookie: session.cookie, "content-type": "application/json" },
        body: JSON.stringify({ monthlyLimitMicro: 10_000_000, hardBlock: false }),
      });

      const keyRes = await app.request("/api/keys", {
        method: "POST",
        headers: { cookie: session.cookie, "content-type": "application/json" },
        body: JSON.stringify({ name: "kill-switch integration" }),
      });
      const { secret } = (await keyRes.json()) as any;

      setAdapterForTests("openai", {
        provider: "openai",
        async chatCompletion() {
          return { content: "pong", inputTokens: 3, outputTokens: 1, latencyMs: 1, raw: {} };
        },
      });

      // Direct-mode keys are never cached, so every identical request reaches
      // the provider path and is counted against the default threshold (5).
      const request = () =>
        app.request("/v1/chat/completions", {
          method: "POST",
          headers: {
            authorization: `Bearer ${secret}`,
            "content-type": "application/json",
            "x-lf-provider": "openai",
            "x-lf-provider-key": "sk-proj-kill-switch-test",
          },
          body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: "identical" }] }),
        });

      let loopHeader: string | null = null;
      for (let i = 0; i < 6; i++) {
        const res = await request();
        expect(res.status).toBe(200);
        loopHeader = res.headers.get("x-lf-loop-state");
      }
      expect(loopHeader).toBe("paused");

      const blockedRes = await request();
      expect(blockedRes.status).toBe(429);
      expect(((await blockedRes.json()) as any).error.code).toBe("runaway_loop_blocked");
    });

    it("does not pause for repeated but distinct requests", async () => {
      const { createApp } = await import("../app");
      const { createTestSession } = await import("./auth");
      const { setAdapterForTests } = await import("../services/ai/providers");
      const app = createApp();
      const session = await createTestSession();

      await app.request("/api/budgets/current", {
        method: "PUT",
        headers: { cookie: session.cookie, "content-type": "application/json" },
        body: JSON.stringify({ monthlyLimitMicro: 10_000_000, hardBlock: false }),
      });

      const keyRes = await app.request("/api/keys", {
        method: "POST",
        headers: { cookie: session.cookie, "content-type": "application/json" },
        body: JSON.stringify({ name: "kill-switch distinct" }),
      });
      const { secret } = (await keyRes.json()) as any;

      let calls = 0;
      setAdapterForTests("openai", {
        provider: "openai",
        async chatCompletion() {
          calls += 1;
          return { content: "pong", inputTokens: 3, outputTokens: 1, latencyMs: 1, raw: {} };
        },
      });

      for (let i = 0; i < 7; i++) {
        const res = await app.request("/v1/chat/completions", {
          method: "POST",
          headers: {
            authorization: `Bearer ${secret}`,
            "content-type": "application/json",
            "x-lf-provider": "openai",
            "x-lf-provider-key": "sk-proj-kill-switch-distinct",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: `distinct message ${i}` }],
          }),
        });
        expect(res.status).toBe(200);
      }
      expect(calls).toBe(7);
    });
  });
});