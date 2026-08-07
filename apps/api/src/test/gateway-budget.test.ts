import net from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * Keys / BYOK / budget / gateway integration tests.
 * Uses docker Postgres when up, else in-memory PGlite (same pattern as integration.test.ts).
 *
 * IMPORTANT: do not statically import modules that touch db/client or getEnv()
 * before the PGlite DATABASE_URL rewrite below.
 */

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
const redisUrl = new URL(process.env.REDIS_URL!);
const pgUp = await canConnect(dbUrl.hostname, Number(dbUrl.port || 5432));
const redisUp = await canConnect(redisUrl.hostname, Number(redisUrl.port || 6379));

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

describe("keys, BYOK, budget, gateway", () => {
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
    await stopFallbackDb?.();
  });

  it("POST/GET/DELETE /api/keys — create, list without secret, revoke", async () => {
    const { createApp } = await import("../app");
    const { createTestSession } = await import("./auth");
    const app = createApp();
    const session = await createTestSession();

    const created = await app.request("/api/keys", {
      method: "POST",
      headers: { cookie: session.cookie, "content-type": "application/json" },
      body: JSON.stringify({ name: "CI key" }),
    });
    expect(created.status).toBe(201);
    const createdBody = (await created.json()) as any;
    expect(createdBody.secret).toMatch(/^lf_live_/);
    expect(createdBody.key.keyPrefix).toMatch(/^lf_live_/);
    expect(createdBody.key.name).toBe("CI key");

    const listed = await app.request("/api/keys", {
      headers: { cookie: session.cookie },
    });
    expect(listed.status).toBe(200);
    const listBody = (await listed.json()) as any;
    expect(listBody.keys.some((k: any) => k.id === createdBody.key.id)).toBe(true);
    expect(JSON.stringify(listBody)).not.toContain(createdBody.secret);

    const revoked = await app.request(`/api/keys/${createdBody.key.id}`, {
      method: "DELETE",
      headers: { cookie: session.cookie },
    });
    expect(revoked.status).toBe(200);
    expect(((await revoked.json()) as any).revoked).toBe(true);
  });

  it("provider-keys encrypt at rest and never return ciphertext/secret", async () => {
    const { createApp } = await import("../app");
    const { createTestSession } = await import("./auth");
    const { db } = await import("../db/client");
    const { decryptSecret } = await import("../services/crypto");
    const app = createApp();
    const session = await createTestSession();

    const secret = "sk-test-provider-secret-abcdef";
    const created = await app.request("/api/provider-keys", {
      method: "POST",
      headers: { cookie: session.cookie, "content-type": "application/json" },
      body: JSON.stringify({ provider: "openai", secret, label: "primary" }),
    });
    expect(created.status).toBe(201);
    const body = (await created.json()) as any;
    expect(body.key.provider).toBe("openai");
    expect(body.key.keyHint).toBe("cdef");
    expect(body.key.label).toBe("primary");
    expect(body.key.ciphertext).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain(secret);

    const row = await db.query.providerKeys.findFirst({
      where: (k, { eq }) => eq(k.id, body.key.id),
    });
    expect(row?.ciphertext).toBeTruthy();
    expect(row?.ciphertext).not.toBe(secret);
    expect(decryptSecret(row!.ciphertext)).toBe(secret);

    const listed = await app.request("/api/provider-keys", {
      headers: { cookie: session.cookie },
    });
    const listBody = (await listed.json()) as any;
    expect(JSON.stringify(listBody)).not.toContain(secret);
    expect(JSON.stringify(listBody)).not.toContain(row!.ciphertext);

    const del = await app.request(`/api/provider-keys/${body.key.id}`, {
      method: "DELETE",
      headers: { cookie: session.cookie },
    });
    expect(del.status).toBe(200);
  });

  it("GET /api/budgets/current and PUT updates limits", async () => {
    const { createApp } = await import("../app");
    const { createTestSession } = await import("./auth");
    const app = createApp();
    const session = await createTestSession();

    const get = await app.request("/api/budgets/current", {
      headers: { cookie: session.cookie },
    });
    expect(get.status).toBe(200);
    const before = (await get.json()) as any;
    expect(before.budget.monthlyLimitMicro).toBeGreaterThan(0);
    expect(before.remainingMicro).toBeDefined();

    const put = await app.request("/api/budgets/current", {
      method: "PUT",
      headers: { cookie: session.cookie, "content-type": "application/json" },
      body: JSON.stringify({
        monthlyLimitMicro: 5_000_000,
        dailyLimitMicro: 1_000_000,
        alertAtPct: 75,
        hardBlock: true,
      }),
    });
    expect(put.status).toBe(200);
    const after = (await put.json()) as any;
    expect(after.budget.monthlyLimitMicro).toBe(5_000_000);
    expect(after.budget.dailyLimitMicro).toBe(1_000_000);
    expect(after.budget.alertAtPct).toBe(75);
  });

  it.runIf(redisUp)("reserveBudget blocks when over hard limit", async () => {
    const { createTestSession } = await import("./auth");
    const { updateCurrentBudget } = await import("../services/budgets/current");
    const { reserveBudget, seedBudgetCounter, monthlyKey, currentPeriod } =
      await import("../services/budgets/enforce");
    const { redis } = await import("../redis/client");

    const session = await createTestSession();
    await updateCurrentBudget(session.workspaceId, {
      monthlyLimitMicro: 1_000,
      hardBlock: true,
    });
    await seedBudgetCounter(monthlyKey(session.workspaceId, currentPeriod()), 900, redis);

    await expect(
      reserveBudget({
        workspaceId: session.workspaceId,
        estimateMicro: 200,
        redis,
      }),
    ).rejects.toMatchObject({ status: 402, code: "budget_exceeded" });
  });

  it("POST /v1/chat/completions returns 401 without API key", async () => {
    const { createApp } = await import("../app");
    const res = await createApp().request("/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: "hi" }],
      }),
    });
    expect(res.status).toBe(401);
    expect(((await res.json()) as any).error.code).toBe("unauthorized");
  });

  it("gateway chat completions works with mocked provider adapter", async () => {
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

    await app.request("/api/provider-keys", {
      method: "POST",
      headers: { cookie: session.cookie, "content-type": "application/json" },
      body: JSON.stringify({ provider: "openai", secret: "sk-test-mock-key-12345678" }),
    });

    const keyRes = await app.request("/api/keys", {
      method: "POST",
      headers: { cookie: session.cookie, "content-type": "application/json" },
      body: JSON.stringify({ name: "gateway test" }),
    });
    const { secret } = (await keyRes.json()) as any;

    setAdapterForTests("openai", {
      provider: "openai",
      async chatCompletion() {
        return {
          content: "hello from mock",
          inputTokens: 10,
          outputTokens: 5,
          latencyMs: 1,
          raw: {},
        };
      },
    });

    const res = await app.request("/v1/chat/completions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${secret}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: "hi" }],
      }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.choices[0].message.content).toBe("hello from mock");
    expect(res.headers.get("x-layerflow-cache")).toBe("miss");
  });
});
