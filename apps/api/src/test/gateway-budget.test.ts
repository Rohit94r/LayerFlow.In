import net from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { canConnect, startTestDb } from "./helpers/integration-db";

/**
 * Keys / BYOK / budget / gateway integration tests.
 * Each file gets a fresh in-memory PGlite (real Postgres + pgvector) so
 * parallel workers never share data or race migrations.
 *
 * IMPORTANT: do not statically import modules that touch db/client or getEnv()
 * before the PGlite DATABASE_URL rewrite below.
 */

const stopDb = await startTestDb();

const redisUrl = new URL(process.env.REDIS_URL!);
const redisUp = await canConnect(redisUrl.hostname, Number(redisUrl.port || 6379));

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
    await stopDb.stop();
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

  it.runIf(redisUp)("releases reservation on provider failure (gateway /v1/chat/completions)", async () => {
    const { createApp } = await import("../app");
    const { createTestSession } = await import("./auth");
    const { setAdapterForTests } = await import("../services/ai/providers");
    const { redis } = await import("../redis/client");
    const app = createApp();
    const session = await createTestSession();

    // Set a tight budget
    await app.request("/api/budgets/current", {
      method: "PUT",
      headers: { cookie: session.cookie, "content-type": "application/json" },
      body: JSON.stringify({ monthlyLimitMicro: 50_000_000, hardBlock: true }),
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

    // Mock adapter that FAILS
    setAdapterForTests("openai", {
      provider: "openai",
      async chatCompletion() {
        throw new Error("provider rejected the request");
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
    expect(res.status).toBe(502);

    // After failure, the budget counter should NOT be decremented (reservation released)
    const monthlyKey = `budget:monthly:${session.workspaceId}:*`;
    const keys = await redis.keys(monthlyKey);
    let spent = 0;
    for (const key of keys) {
      const val = await redis.get(key);
      spent += Number(val ?? 0);
    }
    // The budget counter should be 0 or very low — reservation was released on failure
    expect(spent).toBeLessThan(100);
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
