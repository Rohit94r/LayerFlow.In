import net from "node:net";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { canConnect, startTestDb } from "./helpers/integration-db";

/**
 * Gateway direct/no-store keys, BYOK base URLs, per-project tagging and
 * free demo daily caps (Phase 3 wedge: "handle both key modes").
 * Each file gets a fresh in-memory PGlite, so parallel workers never share
 * data or race migrations.
 *
 * IMPORTANT: do not statically import modules that touch db/client or
 * getEnv() before the PGlite DATABASE_URL rewrite below.
 */

const stopDb = await startTestDb();

const redisUrl = new URL(process.env.REDIS_URL!);
const redisUp = await canConnect(redisUrl.hostname, Number(redisUrl.port || 6379));

/** Far-future day labels so demo-counter tests never collide across runs. */
const FUTURE_DAY = new Date(Date.UTC(2100, 0, 3));
/** Distinct day for the global-cap test so user counters don't leak into it. */
const FUTURE_DAY_GLOBAL = new Date(Date.UTC(2100, 0, 4));

describe("gateway direct/no-store mode + demo caps + BYOK base URL", () => {
  beforeAll(async () => {
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    const { db } = await import("../db/client");
    await migrate(db, { migrationsFolder: "./drizzle" });
  });

  afterAll(async () => {
    const { resetAdapterForTests } = await import("../services/ai/providers");
    resetAdapterForTests("openai");
    resetAdapterForTests("groq");
    const { pool } = await import("../db/client");
    const { redis } = await import("../redis/client");
    await pool.end();
    redis.disconnect();
    await stopDb.stop();
  });

  describe("provider-keys baseUrl (BYOK custom endpoint)", () => {
    it("stores and serves a safe base URL override", async () => {
      const { createApp } = await import("../app");
      const { createTestSession } = await import("./auth");
      const app = createApp();
      const session = await createTestSession();

      const created = await app.request("/api/provider-keys", {
        method: "POST",
        headers: { cookie: session.cookie, "content-type": "application/json" },
        body: JSON.stringify({
          provider: "openai",
          secret: "sk-test-custom-endpoint-1234",
          label: "self-hosted",
          baseUrl: "https://llm.internal.example.com/v1/",
        }),
      });
      expect(created.status).toBe(201);
      const body = (await created.json()) as any;
      expect(body.key.baseUrl).toBe("https://llm.internal.example.com/v1");

      const listed = await app.request("/api/provider-keys", {
        headers: { cookie: session.cookie },
      });
      const listBody = (await listed.json()) as any;
      expect(listBody.keys[0].baseUrl).toBe("https://llm.internal.example.com/v1");
    });

    it("rejects private/loopback/link-local and non-http(s) base URLs (SSRF guard)", async () => {
      const { createApp } = await import("../app");
      const { createTestSession } = await import("./auth");
      const app = createApp();
      const session = await createTestSession();

      const cases: Array<{ baseUrl: string; code: string }> = [
        { baseUrl: "http://127.0.0.1:11434/v1", code: "base_url_forbidden" },
        { baseUrl: "http://10.0.0.5:8080", code: "base_url_forbidden" },
        { baseUrl: "http://169.254.169.254/latest/meta-data", code: "base_url_forbidden" },
        { baseUrl: "http://192.168.1.10:3000", code: "base_url_forbidden" },
        { baseUrl: "http://localhost:3000", code: "base_url_forbidden" },
        { baseUrl: "ftp://example.com", code: "invalid_base_url" },
        { baseUrl: "not a url", code: "validation_error" }, // rejected by zod
      ];

      for (const { baseUrl, code } of cases) {
        const res = await app.request("/api/provider-keys", {
          method: "POST",
          headers: { cookie: session.cookie, "content-type": "application/json" },
          body: JSON.stringify({ provider: "groq", secret: "sk-test-groq-abcdef1234", baseUrl }),
        });
        expect(res.status).toBe(400);
        expect(((await res.json()) as any).error.code).toBe(code);
      }
    });
  });

  describe("direct/no-store key mode (x-lf-provider-key)", () => {
    it("serves a request with a per-request key and never stores it", async () => {
      const { createApp } = await import("../app");
      const { createTestSession } = await import("./auth");
      const { setAdapterForTests } = await import("../services/ai/providers");
      const { db } = await import("../db/client");
      const { providerKeys } = await import("../db/schema/gateway");
      const { eq } = await import("drizzle-orm");
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
        body: JSON.stringify({ name: "gateway direct test" }),
      });
      const { secret } = (await keyRes.json()) as any;

      const seen: string[] = [];
      setAdapterForTests("openai", {
        provider: "openai",
        async chatCompletion(req: any) {
          seen.push(req.apiKey);
          return { content: "pong", inputTokens: 3, outputTokens: 1, latencyMs: 1, raw: {} };
        },
      });

      const directKey = "sk-proj-direct-no-store-abcdef123456";
      const res = await app.request("/v1/chat/completions", {
        method: "POST",
        headers: {
          authorization: `Bearer ${secret}`,
          "content-type": "application/json",
          "x-lf-provider-key": directKey,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: "ping" }],
        }),
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.choices[0].message.content).toBe("pong");
      expect(res.headers.get("x-lf-key-mode")).toBe("direct");
      expect(seen).toEqual([directKey]);

      // No vault write happened on the gateway path.
      const rows = await db.query.providerKeys.findMany({
        where: eq(providerKeys.workspaceId, session.workspaceId),
      });
      expect(rows).toHaveLength(0);
    });

    it("skips the exact cache between direct-mode calls", async () => {
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
        body: JSON.stringify({ name: "gateway direct cache" }),
      });
      const { secret } = (await keyRes.json()) as any;

      let calls = 0;
      setAdapterForTests("openai", {
        provider: "openai",
        async chatCompletion() {
          calls += 1;
          return { content: "same", inputTokens: 3, outputTokens: 1, latencyMs: 1, raw: {} };
        },
      });

      const request = () =>
        app.request("/v1/chat/completions", {
          method: "POST",
          headers: {
            authorization: `Bearer ${secret}`,
            "content-type": "application/json",
            "x-lf-provider-key": "sk-direct-cache-check-xyz789012",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: "identical 🚀" }],
          }),
        });

      const first = await request();
      const second = await request();
      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
      // An identical direct-mode request must hit the provider again — no cache.
      expect(calls).toBe(2);
      expect(first.headers.get("x-layerflow-cache")).toBe("miss");
      expect(second.headers.get("x-layerflow-cache")).toBe("miss");
    });

    it("honors x-lf-provider override for non-catalog model ids", async () => {
      const { createApp } = await import("../app");
      const { createTestSession } = await import("./auth");
      const { setAdapterForTests } = await import("../services/ai/providers");
      const app = createApp();
      const session = await createTestSession();

      const keyRes = await app.request("/api/keys", {
        method: "POST",
        headers: { cookie: session.cookie, "content-type": "application/json" },
        body: JSON.stringify({ name: "gateway direct provider" }),
      });
      const { secret } = (await keyRes.json()) as any;

      setAdapterForTests("groq", {
        provider: "groq",
        async chatCompletion() {
          return {
            content: "from groq",
            inputTokens: 4,
            outputTokens: 2,
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
          "x-lf-provider-key": "sk-groq-direct-1234567890abcdef",
          "x-lf-provider": "groq",
        },
        body: JSON.stringify({
          model: "custom/weird-model-id",
          messages: [{ role: "user", content: "hi" }],
        }),
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.choices[0].message.content).toBe("from groq");
      expect(res.headers.get("x-lf-key-mode")).toBe("direct");
    });

    it("tags spend via the x-lf-project header (auto-provisions a project)", async () => {
      const { createApp } = await import("../app");
      const { createTestSession } = await import("./auth");
      const { setAdapterForTests } = await import("../services/ai/providers");
      const { db } = await import("../db/client");
      const { projects } = await import("../db/schema/workspace");
      const { eq } = await import("drizzle-orm");
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
        body: JSON.stringify({ name: "gateway project" }),
      });
      const { secret } = (await keyRes.json()) as any;

      setAdapterForTests("openai", {
        provider: "openai",
        async chatCompletion() {
          return { content: "tagged", inputTokens: 3, outputTokens: 1, latencyMs: 1, raw: {} };
        },
      });

      const res = await app.request("/v1/chat/completions", {
        method: "POST",
        headers: {
          authorization: `Bearer ${secret}`,
          "content-type": "application/json",
          "x-lf-provider-key": "sk-direct-project-tag-abcdef4040",
          "x-lf-project": "client-acme",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: "invoice me" }],
        }),
      });
      expect(res.status).toBe(200);

      const project = await db.query.projects.findFirst({
        where: eq(projects.workspaceId, session.workspaceId),
      });
      expect(project?.name).toBe("client-acme");
      expect(project?.domainId).toBeTruthy();
    });
  });

  describe("free demo daily caps", () => {
    it.runIf(redisUp)("throws demo_daily_limit_reached past the per-user cap", async () => {
      const { enforceDemoLimit } = await import("../services/demo/demo-limits");
      const owner = `demo-owner-${randomUUID()}`;
      const limits = { perUserLimit: 2, globalLimit: 100_000, plan: "free" as const, date: FUTURE_DAY };

      const first = await enforceDemoLimit("ws-demo-per-user", owner, limits);
      expect(first.applicable).toBe(true);
      expect(first.remainingUser).toBe(1);

      const second = await enforceDemoLimit("ws-demo-per-user", owner, limits);
      expect(second.remainingUser).toBe(0);

      await expect(enforceDemoLimit("ws-demo-per-user", owner, limits)).rejects.toMatchObject({
        status: 429,
        code: "demo_daily_limit_reached",
      });
    });

    it.runIf(redisUp)("hits the global cap across distinct users", async () => {
      const { enforceDemoLimit, dayLabel } = await import("../services/demo/demo-limits");
      const limits = { perUserLimit: 100_000, globalLimit: 1, plan: "free" as const, date: FUTURE_DAY_GLOBAL };

      // The global counter is shared across every run (it is per-day, not per
      // user), so reset this test's key first to stay isolated from earlier runs.
      const { redis } = await import("../redis/client");
      await redis.del(`lf:demo:global:${dayLabel(FUTURE_DAY_GLOBAL)}`);

      await enforceDemoLimit("ws-demo-global", `demo-global-${randomUUID()}`, limits);
      await expect(
        enforceDemoLimit("ws-demo-global", `demo-global-${randomUUID()}`, limits),
      ).rejects.toMatchObject({ status: 429, code: "demo_daily_limit_reached" });
    });

    it.runIf(redisUp)("skips counting for paying plans and when disabled", async () => {
      const { enforceDemoLimit } = await import("../services/demo/demo-limits");
      const limits = { perUserLimit: 2, globalLimit: 2, plan: "pro" as const, date: FUTURE_DAY };

      const paid = await enforceDemoLimit("ws-demo-paid", `demo-paid-${randomUUID()}`, limits);
      expect(paid.applicable).toBe(false);
      expect(paid.remainingUser).toBe(-1);

      const disabled = await enforceDemoLimit("ws-demo-disabled", `demo-off-${randomUUID()}`, {
        perUserLimit: 0,
        globalLimit: 0,
      });
      expect(disabled.applicable).toBe(false);
    });
  });

  describe("OpenAI-compatible adapter baseUrl override", () => {
    it("posts to the request base URL when the vault provides one", async () => {
      const { createOpenAICompatibleAdapter } = await import(
        "../services/ai/providers/openai-compatible"
      );
      const adapter = createOpenAICompatibleAdapter({
        provider: "openai",
        baseUrl: "https://default.example.com",
      });

      const fetchMock = vi.fn(async () =>
        new Response(
          JSON.stringify({
            choices: [{ message: { content: "ok" } }],
            usage: { prompt_tokens: 2, completion_tokens: 1, total_tokens: 3 },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      );
      vi.stubGlobal("fetch", fetchMock);
      try {
        await adapter.chatCompletion({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: "hi" }],
          apiKey: "sk-test",
          baseUrl: "https://custom.endpoint.example.com/v1",
        });
      } finally {
        vi.unstubAllGlobals();
      }
      expect(fetchMock).toHaveBeenCalledOnce();
      expect((fetchMock.mock.calls[0] as any[])[0]).toBe("https://custom.endpoint.example.com/v1/chat/completions");
    });
  });
});