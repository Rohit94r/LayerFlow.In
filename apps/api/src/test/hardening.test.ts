import net from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * Production-hardening integration tests: security headers, health endpoints,
 * body limits, audio feature gating, platform provider-key fallback, budget
 * alert idempotency, usage rollups, and reconciliation.
 *
 * Same PGlite-fallback pattern as integration.test.ts. IMPORTANT: no static
 * imports of modules that touch db/client or getEnv().
 */

// Pin optional-service env BEFORE dotenv/config loads apps/api/.env, so tests
// never pick up real keys. Empty string = "unset" for feature checks.
// REDIS_URL points at a dead local port so these tests can never read/write a
// real (e.g. Upstash) instance from .env — every path here must work without Redis.
process.env.REDIS_URL = "redis://127.0.0.1:6399";
process.env.ELEVENLABS_API_KEY = "";
process.env.RESEND_API_KEY = "";
process.env.GROQ_API_KEY = "gsk_platform_test_key_123456";
process.env.GEMINI_API_KEY = "test_gemini_platform_key_123456";
process.env.OPENAI_API_KEY = "";

function canConnect(host: string, port: number, timeoutMs = 1_500): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port });
    const done = (ok: boolean) => {
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(timeoutMs, () => done(false));
    socket.once("connect", () => done(true));
    socket.once("error", () => done(false));
  });
}

const dbUrl = new URL(process.env.DATABASE_URL!);
const pgUp = await canConnect(dbUrl.hostname, Number(dbUrl.port || 5432));

let stopFallbackDb: (() => Promise<void>) | undefined;

if (!pgUp) {
  const { PGlite } = await import("@electric-sql/pglite");
  const { vector } = await import("@electric-sql/pglite-pgvector");
  const { PGLiteSocketServer } = await import("@electric-sql/pglite-socket");

  const pglite = await PGlite.create({ extensions: { vector } });
  const port = 20000 + Math.floor(Math.random() * 10_000);
  const server = new PGLiteSocketServer({ db: pglite, port, host: "127.0.0.1", maxConnections: 10 });
  await server.start();
  process.env.DATABASE_URL = `postgres://postgres:postgres@127.0.0.1:${port}/postgres`;
  stopFallbackDb = async () => {
    await server.stop();
    await pglite.close();
  };
}

describe("production hardening", () => {
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
    await stopFallbackDb?.();
  });

  describe("security middleware", () => {
    it("adds security headers and request id to responses", async () => {
      const { createApp } = await import("../app");
      const res = await createApp().request("/health/live");
      expect(res.status).toBe(200);
      expect(res.headers.get("x-content-type-options")).toBe("nosniff");
      expect(res.headers.get("x-frame-options")).toBe("DENY");
      expect(res.headers.get("x-request-id")).toBeTruthy();
    });

    it("GET /health/live is always 200; /health/ready reports dependency checks", async () => {
      const { createApp } = await import("../app");
      const app = createApp();

      const live = await app.request("/health/live");
      expect(live.status).toBe(200);
      expect(((await live.json()) as any).status).toBe("ok");

      const ready = await app.request("/health/ready");
      const body = (await ready.json()) as any;
      expect(body.checks.db).toBe(true); // PGlite/docker either way
      expect([200, 503]).toContain(ready.status); // redis may be down locally
    });

    it("rejects oversized JSON bodies with 413", async () => {
      const { createApp } = await import("../app");
      const res = await createApp().request("/api/prompts", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": String(2 * 1024 * 1024),
        },
        body: JSON.stringify({ pad: "x".repeat(2 * 1024 * 1024) }),
      });
      expect(res.status).toBe(413);
      expect(((await res.json()) as any).error.code).toBe("payload_too_large");
    });
  });

  describe("audio (optional ElevenLabs)", () => {
    it("reports disabled and returns 503 audio_disabled without a platform key", async () => {
      const { createApp } = await import("../app");
      const { createTestSession } = await import("./auth");
      const app = createApp();
      const session = await createTestSession();

      const status = await app.request("/api/audio/status", {
        headers: { cookie: session.cookie },
      });
      expect(status.status).toBe(200);
      expect(((await status.json()) as any).enabled).toBe(false);

      const speech = await app.request("/api/audio/speech", {
        method: "POST",
        headers: { cookie: session.cookie, "content-type": "application/json" },
        body: JSON.stringify({ text: "hello world" }),
      });
      expect(speech.status).toBe(503);
      expect(((await speech.json()) as any).error.code).toBe("audio_disabled");
    });
  });

  describe("platform provider key fallback", () => {
    it("falls back to the platform Groq/Gemini keys and prefers BYOK", async () => {
      const { createTestSession } = await import("./auth");
      const { loadProviderApiKey } = await import("../services/ai/providers");
      const { createProviderKey, revokeProviderKey } = await import(
        "../services/keys/provider-keys"
      );

      const session = await createTestSession();

      // No BYOK key → platform env fallback.
      await expect(loadProviderApiKey(session.workspaceId, "groq")).resolves.toBe(
        "gsk_platform_test_key_123456",
      );
      await expect(loadProviderApiKey(session.workspaceId, "google")).resolves.toBe(
        "test_gemini_platform_key_123456",
      );

      // Providers without platform keys still fail clearly.
      await expect(loadProviderApiKey(session.workspaceId, "anthropic")).rejects.toMatchObject({
        code: "provider_key_missing",
      });

      // BYOK beats platform.
      const byok = await createProviderKey(session.workspaceId, {
        provider: "groq",
        secret: "gsk_byok_workspace_secret_999",
      });
      await expect(loadProviderApiKey(session.workspaceId, "groq")).resolves.toBe(
        "gsk_byok_workspace_secret_999",
      );

      // Revoking BYOK restores the platform fallback.
      await revokeProviderKey(session.workspaceId, byok.id);
      await expect(loadProviderApiKey(session.workspaceId, "groq")).resolves.toBe(
        "gsk_platform_test_key_123456",
      );
    });
  });

  describe("budget alerts (idempotent)", () => {
    async function seedBudgetAndSpend(spentMicro: number) {
      const { createTestSession } = await import("./auth");
      const { db } = await import("../db/client");
      const { budgets, usageLedger } = await import("../db/schema/cost");
      const { currentPeriod } = await import("../services/budgets/redis-keys");
      const { eq, and } = await import("drizzle-orm");

      const session = await createTestSession();
      const period = currentPeriod();

      const existing = await db.query.budgets.findFirst({
        where: and(eq(budgets.workspaceId, session.workspaceId), eq(budgets.period, period)),
      });
      if (existing) {
        await db
          .update(budgets)
          .set({ monthlyLimitMicro: 1_000_000, alertAtPct: 80 })
          .where(eq(budgets.id, existing.id));
      } else {
        await db.insert(budgets).values({
          workspaceId: session.workspaceId,
          period,
          monthlyLimitMicro: 1_000_000,
          alertAtPct: 80,
        });
      }

      if (spentMicro > 0) {
        await db.insert(usageLedger).values({
          workspaceId: session.workspaceId,
          provider: "openai",
          model: "gpt-4o-mini",
          source: "playground",
          inputTokens: 100,
          outputTokens: 50,
          costMicro: spentMicro,
        });
      }
      return session;
    }

    it("sends the warning once per period, then dedupes", async () => {
      const { evaluateBudgetAlertsForWorkspace } = await import(
        "../services/email/notifications"
      );
      const { db } = await import("../db/client");
      const { emailEvents } = await import("../db/schema/email");
      const { eq } = await import("drizzle-orm");

      const session = await seedBudgetAndSpend(850_000); // 85% of $1

      const first = await evaluateBudgetAlertsForWorkspace(session.workspaceId);
      expect(first).toHaveLength(1);
      expect(first[0].threshold).toBe("warn");
      expect(first[0].deduped).toBe(false);

      const second = await evaluateBudgetAlertsForWorkspace(session.workspaceId);
      expect(second).toHaveLength(1);
      expect(second[0].deduped).toBe(true);

      const rows = await db.query.emailEvents.findMany({
        where: eq(emailEvents.workspaceId, session.workspaceId),
      });
      expect(rows).toHaveLength(1);
      expect(rows[0].type).toBe("budget_alert");
      // No RESEND_API_KEY in tests → recorded as skipped, still deduped.
      expect(rows[0].status).toBe("skipped");
    });

    it("escalates to a blocked alert at 100% exactly once", async () => {
      const { evaluateBudgetAlertsForWorkspace } = await import(
        "../services/email/notifications"
      );
      const session = await seedBudgetAndSpend(1_200_000); // 120%

      const first = await evaluateBudgetAlertsForWorkspace(session.workspaceId);
      expect(first.map((o) => o.threshold)).toEqual(["blocked"]);
      expect(first[0].deduped).toBe(false);

      const second = await evaluateBudgetAlertsForWorkspace(session.workspaceId);
      expect(second[0].deduped).toBe(true);
    });
  });

  describe("usage rollups + reconciliation", () => {
    it("aggregates the ledger into usage_rollups idempotently", async () => {
      const { createTestSession } = await import("./auth");
      const { db } = await import("../db/client");
      const { usageLedger, usageRollups } = await import("../db/schema/cost");
      const { rollupUsageForDay } = await import("../services/budgets/rollup");
      const { eq } = await import("drizzle-orm");

      const session = await createTestSession();
      const day = new Date().toISOString().slice(0, 10);

      await db.insert(usageLedger).values([
        {
          workspaceId: session.workspaceId,
          provider: "openai",
          model: "gpt-4o-mini",
          source: "playground",
          inputTokens: 100,
          outputTokens: 40,
          costMicro: 1_000,
        },
        {
          workspaceId: session.workspaceId,
          provider: "openai",
          model: "gpt-4o-mini",
          source: "playground",
          inputTokens: 200,
          outputTokens: 80,
          costMicro: 2_000,
        },
        {
          workspaceId: session.workspaceId,
          provider: "anthropic",
          model: "claude-sonnet-4-5",
          source: "gateway",
          inputTokens: 50,
          outputTokens: 20,
          costMicro: 5_000,
        },
      ]);

      const first = await rollupUsageForDay(day);
      expect(first.rows).toBeGreaterThanOrEqual(2);

      const mine = await db.query.usageRollups.findMany({
        where: eq(usageRollups.workspaceId, session.workspaceId),
      });
      const gpt = mine.find((r) => r.model === "gpt-4o-mini");
      expect(gpt).toBeDefined();
      expect(gpt!.requests).toBe(2);
      expect(gpt!.inputTokens).toBe(300);
      expect(gpt!.outputTokens).toBe(120);
      expect(gpt!.costMicro).toBe(3_000);

      // Idempotent: second run replaces, does not double.
      await rollupUsageForDay(day);
      const again = await db.query.usageRollups.findMany({
        where: eq(usageRollups.workspaceId, session.workspaceId),
      });
      const gptAgain = again.find((r) => r.model === "gpt-4o-mini");
      expect(gptAgain!.requests).toBe(2);
      expect(gptAgain!.costMicro).toBe(3_000);
    });

    it("reconciliation syncs budgets.spent_micro to the ledger", async () => {
      const { createTestSession } = await import("./auth");
      const { db } = await import("../db/client");
      const { budgets, usageLedger } = await import("../db/schema/cost");
      const { currentPeriod } = await import("../services/budgets/redis-keys");
      const { reconcileBudgets } = await import("../services/budgets/rollup");
      const { and, eq } = await import("drizzle-orm");

      const session = await createTestSession();
      const period = currentPeriod();

      await db.insert(usageLedger).values({
        workspaceId: session.workspaceId,
        provider: "groq",
        model: "llama-3.3-70b-versatile",
        source: "gateway",
        costMicro: 42_000,
      });

      const rows = await reconcileBudgets({ period });
      const mine = rows.find((r) => r.workspaceId === session.workspaceId);
      expect(mine).toBeDefined();
      expect(mine!.ledgerMicro).toBe(42_000);

      const budget = await db.query.budgets.findFirst({
        where: and(eq(budgets.workspaceId, session.workspaceId), eq(budgets.period, period)),
      });
      expect(budget!.spentMicro).toBe(42_000);
    });
  });

  describe("weekly digest (idempotent)", () => {
    it("claims one digest per workspace per ISO week", async () => {
      const { createTestSession } = await import("./auth");
      const { sendWeeklyDigestForWorkspace } = await import("../services/email/notifications");

      const session = await createTestSession();
      const first = await sendWeeklyDigestForWorkspace(session.workspaceId);
      expect(first.deduped).toBe(false);

      const second = await sendWeeklyDigestForWorkspace(session.workspaceId);
      expect(second.deduped).toBe(true);
    });
  });
});
