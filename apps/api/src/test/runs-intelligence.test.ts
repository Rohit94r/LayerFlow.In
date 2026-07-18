import net from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ProviderAdapter } from "../providers";

/**
 * Integration tests for runs + intelligence.
 * Same DB bootstrap as integration.test.ts / workspace-crud.test.ts.
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

const mockAdapter: ProviderAdapter = {
  provider: "openai",
  async chatCompletion() {
    return {
      content: "Hello from mock adapter",
      inputTokens: 12,
      outputTokens: 8,
      latencyMs: 42,
      raw: { mocked: true },
    };
  },
};

describe("runs + intelligence APIs", () => {
  let app: import("hono").Hono<import("../types").AppEnv>;
  let cookie: string;
  let workspaceId: string;

  async function api(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<{ status: number; json: any }> {
    const res = await app.request(path, {
      method,
      headers: {
        cookie,
        ...(body !== undefined ? { "content-type": "application/json" } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    const text = await res.text();
    return { status: res.status, json: text ? JSON.parse(text) : undefined };
  }

  beforeAll(async () => {
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    const { db } = await import("../db/client");
    await migrate(db, { migrationsFolder: "./drizzle" });

    const { createApp } = await import("../app");
    const { createTestSession } = await import("./auth");
    const { setAdapterForTests } = await import("../providers");
    const { encryptSecret } = await import("../services/crypto");
    const { providerKeys } = await import("../db/schema/gateway");

    setAdapterForTests("openai", mockAdapter);

    app = createApp();
    const session = await createTestSession({ name: "Runs Tester" });
    cookie = session.cookie;
    workspaceId = session.workspaceId;

    // Seed a BYOK key so loadProviderApiKey succeeds (adapter is mocked).
    await db.insert(providerKeys).values({
      workspaceId,
      provider: "openai",
      ciphertext: encryptSecret("sk-test-fake"),
      keyHint: "fake",
      label: "test",
    });
  });

  afterAll(async () => {
    const { resetAdapterForTests } = await import("../providers");
    resetAdapterForTests("openai");
    const { pool } = await import("../db/client");
    const { redis } = await import("../redis/client");
    await pool.end();
    redis.disconnect();
    await stopFallbackDb?.();
  });

  it("POST /api/intelligence/analyze returns heuristic analysis", async () => {
    const { status, json } = await api("POST", "/api/intelligence/analyze", {
      content: "Write a TypeScript function to call an API",
      currentModel: "gpt-4o",
    });
    expect(status).toBe(200);
    expect(json.analysis.taskType).toBe("coding");
    expect(json.analysis.estimatedTokensIn).toBeGreaterThan(0);
    expect(json.analysis.recommended.model).toBeTruthy();
    expect(json.analysis.why.length).toBeGreaterThan(0);
    expect(Number.isInteger(json.analysis.estimatedCostMicro)).toBe(true);
  });

  it("POST /api/intelligence/analyze requires auth", async () => {
    const res = await app.request("/api/intelligence/analyze", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: "hi" }),
    });
    expect(res.status).toBe(401);
  });

  it("GET/PUT /api/workspace/settings round-trips", async () => {
    const get = await api("GET", "/api/workspace/settings");
    expect(get.status).toBe(200);
    expect(get.json.settings.defaultModel).toBeTruthy();

    const put = await api("PUT", "/api/workspace/settings", {
      preferCheap: true,
      executionMode: "auto-cheapest",
    });
    expect(put.status).toBe(200);
    expect(put.json.settings.preferCheap).toBe(true);
    expect(put.json.settings.executionMode).toBe("auto-cheapest");
  });

  it("routing-rules CRUD + recommend uses the rule", async () => {
    const created = await api("POST", "/api/routing-rules", {
      condition: "Coding tasks",
      conditionConfig: { taskType: "coding" },
      targetModel: "gpt-4o-mini",
      priority: 50,
      enabled: true,
    });
    expect(created.status).toBe(201);
    expect(created.json.rule.id).toBeTruthy();

    const rec = await api("POST", "/api/intelligence/recommend", {
      content: "debug this typescript react component",
    });
    expect(rec.status).toBe(200);
    expect(rec.json.recommendation.source).toBe("rule");
    expect(rec.json.recommendation.recommendedModel).toBe("gpt-4o-mini");

    const toggled = await api("PATCH", `/api/routing-rules/${created.json.rule.id}`, {
      enabled: false,
    });
    expect(toggled.status).toBe(200);
    expect(toggled.json.rule.enabled).toBe(false);
  });

  it("POST /api/intelligence/route always returns explanation", async () => {
    await api("PUT", "/api/workspace/settings", { executionMode: "auto-balanced" });
    const { status, json } = await api("POST", "/api/intelligence/route", {
      content: "Summarize this paragraph briefly",
    });
    expect(status).toBe(200);
    expect(json.model).toBeTruthy();
    expect(json.explanation.length).toBeGreaterThan(0);
  });

  it("executeRun with mocked adapter persists a succeeded run", async () => {
    // Call the service directly so we can inject the mock without going through
    // the HTTP path's real BYOK+adapter resolution twice.
    const { executeRun } = await import("../services/runs/execute");
    const { toRunDetailDto } = await import("../services/runs/dto");

    const { run } = await executeRun({
      workspaceId,
      userId: "user_test",
      model: "gpt-4o-mini",
      source: "playground",
      content: "Say hello",
      adapter: mockAdapter,
      apiKey: "sk-test",
    });

    expect(run.status).toBe("succeeded");
    expect(run.output).toBe("Hello from mock adapter");
    expect(run.inputTokens).toBe(12);
    expect(run.costMicro).toBeGreaterThanOrEqual(0);

    const listed = await api("GET", "/api/runs");
    expect(listed.status).toBe(200);
    expect(listed.json.runs.some((r: { id: string }) => r.id === run.id)).toBe(true);

    const detail = await api("GET", `/api/runs/${run.id}`);
    expect(detail.status).toBe(200);
    expect(detail.json.run.output).toBe("Hello from mock adapter");
    expect(toRunDetailDto(run).id).toBe(run.id);
  });

  it("POST /api/runs returns provider_key_missing without a key for that provider", async () => {
    // Anthropic has no key seeded — should 400 before any network call.
    const { status, json } = await api("POST", "/api/runs", {
      model: "claude-sonnet-4",
      content: "hello",
      source: "playground",
    });
    expect(status).toBe(400);
    expect(json.error.code).toBe("provider_key_missing");
  });
});
