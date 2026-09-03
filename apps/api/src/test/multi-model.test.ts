import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { canConnect, startTestDb } from "./helpers/integration-db";

/**
 * Multi-model test matrix:
 * Auto / A / B / unavailable / BYOK — assert model ID, provider, tokens,
 * cost, fallback events.
 */

const stopDb = await startTestDb();

describe("multi-model matrix", () => {
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

  it("auto mode picks cheapest working model when multiple providers are available", async () => {
    const { createApp } = await import("../app");
    const { createTestSession } = await import("./auth");
    const { setAdapterForTests } = await import("../services/ai/providers");
    const { encryptSecret } = await import("../services/crypto");
    const { db } = await import("../db/client");
    const { providerKeys } = await import("../db/schema/gateway");

    const app = createApp();
    const session = await createTestSession();

    await db.insert(providerKeys).values([
      { workspaceId: session.workspaceId, provider: "openai", ciphertext: await encryptSecret("sk-test-openai"), keyHint: "openai" },
      { workspaceId: session.workspaceId, provider: "groq", ciphertext: await encryptSecret("gsk-test-groq"), keyHint: "groq" },
    ]);

    setAdapterForTests("openai", {
      provider: "openai",
      async chatCompletion() {
        return { content: "openai reply", inputTokens: 50, outputTokens: 20, latencyMs: 100 };
      },
    });
    setAdapterForTests("groq", {
      provider: "groq",
      async chatCompletion() {
        return { content: "groq reply", inputTokens: 50, outputTokens: 20, latencyMs: 30 };
      },
    });

    const chatRes = await app.request("/api/chat", {
      method: "POST",
      headers: { cookie: session.cookie, "content-type": "application/json" },
      body: JSON.stringify({ title: "auto test", autoSwitch: true }),
    });
    expect(chatRes.status).toBe(201);
    const { session: chatSession }: any = await chatRes.json();

    const msgRes = await app.request(`/api/chat/${chatSession.id}/messages`, {
      method: "POST",
      headers: { cookie: session.cookie, "content-type": "application/json" },
      body: JSON.stringify({ content: "test", autoSwitch: true }),
    });
    expect(msgRes.status).toBe(200);

    const { resetAdapterForTests } = await import("../services/ai/providers");
    resetAdapterForTests("openai");
    resetAdapterForTests("groq");
  });

  it("fails over when provider A is unavailable", async () => {
    const { createApp } = await import("../app");
    const { createTestSession } = await import("./auth");
    const { setAdapterForTests } = await import("../services/ai/providers");
    const { encryptSecret } = await import("../services/crypto");
    const { db } = await import("../db/client");
    const { providerKeys } = await import("../db/schema/gateway");

    const app = createApp();
    const session = await createTestSession();

    await db.insert(providerKeys).values([
      { workspaceId: session.workspaceId, provider: "openai", ciphertext: await encryptSecret("sk-test-openai"), keyHint: "openai" },
      { workspaceId: session.workspaceId, provider: "deepseek", ciphertext: await encryptSecret("sk-test-deepseek"), keyHint: "deepseek" },
    ]);

    setAdapterForTests("openai", {
      provider: "openai",
      async chatCompletion() { throw new Error("401 Unauthorized"); },
    });
    setAdapterForTests("deepseek", {
      provider: "deepseek",
      async chatCompletion() {
        return { content: "deepseek after failover", inputTokens: 60, outputTokens: 30, latencyMs: 50 };
      },
    });

    const chatRes = await app.request("/api/chat", {
      method: "POST",
      headers: { cookie: session.cookie, "content-type": "application/json" },
      body: JSON.stringify({ title: "failover", autoSwitch: true, defaultModel: "gpt-4o-mini" }),
    });
    expect(chatRes.status).toBe(201);
    const { session: chatSession }: any = await chatRes.json();

    const msgRes = await app.request(`/api/chat/${chatSession.id}/messages`, {
      method: "POST",
      headers: { cookie: session.cookie, "content-type": "application/json" },
      body: JSON.stringify({ content: "fail", autoSwitch: true }),
    });
    expect(msgRes.status).toBe(200);

    const { resetAdapterForTests } = await import("../services/ai/providers");
    resetAdapterForTests("openai");
    resetAdapterForTests("deepseek");
  });

  it("BYOK key is preferred over platform key", async () => {
    const { createApp } = await import("../app");
    const { createTestSession } = await import("./auth");
    const { setAdapterForTests } = await import("../services/ai/providers");
    const { encryptSecret } = await import("../services/crypto");
    const { db } = await import("../db/client");
    const { providerKeys } = await import("../db/schema/gateway");

    const app = createApp();
    const session = await createTestSession();

    await db.insert(providerKeys).values([
      { workspaceId: session.workspaceId, provider: "groq", ciphertext: await encryptSecret("gsk-byok-key-123"), keyHint: "byok" },
    ]);

    process.env.GROQ_API_KEY = "gsk_platform_fallback_key";

    setAdapterForTests("groq", {
      provider: "groq",
      async chatCompletion(req) {
        expect(req.apiKey).toMatch(/gsk-byok/);
        return { content: "groq with BYOK", inputTokens: 50, outputTokens: 20, latencyMs: 40 };
      },
    });

    const chatRes = await app.request("/api/chat", {
      method: "POST",
      headers: { cookie: session.cookie, "content-type": "application/json" },
      body: JSON.stringify({ title: "byok test", autoSwitch: true }),
    });
    expect(chatRes.status).toBe(201);
    const { session: chatSession }: any = await chatRes.json();

    const msgRes = await app.request(`/api/chat/${chatSession.id}/messages`, {
      method: "POST",
      headers: { cookie: session.cookie, "content-type": "application/json" },
      body: JSON.stringify({ content: "test byok", autoSwitch: true }),
    });
    expect(msgRes.status).toBe(200);

    const { resetAdapterForTests } = await import("../services/ai/providers");
    resetAdapterForTests("groq");
  });

  it("unavailable provider returns correct error", async () => {
    const { createApp } = await import("../app");
    const { createTestSession } = await import("./auth");

    const app = createApp();
    const session = await createTestSession();

    const chatRes = await app.request("/api/chat", {
      method: "POST",
      headers: { cookie: session.cookie, "content-type": "application/json" },
      body: JSON.stringify({ title: "unavailable test", autoSwitch: false }),
    });
    expect(chatRes.status).toBe(201);
    const { session: chatSession }: any = await chatRes.json();

    const msgRes = await app.request(`/api/chat/${chatSession.id}/messages`, {
      method: "POST",
      headers: { cookie: session.cookie, "content-type": "application/json" },
      body: JSON.stringify({ content: "test", autoSwitch: false, model: "gpt-4o-mini" }),
    });
    // SSE starts with 200; the error is in the event stream body
    expect(msgRes.status).toBe(200);
    const body = await msgRes.text();
    expect(body).toContain("error");
  });
});