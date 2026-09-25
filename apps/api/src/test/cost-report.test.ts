import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startTestDb } from "./helpers/integration-db";

/**
 * Phase 4: per-project cost reports (CSV/JSON) — the Pro export feature.
 * Each file gets a fresh in-memory PGlite, so parallel workers never share
 * data or race migrations.
 */

const stopDb = await startTestDb();

describe("cost report export", () => {
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

  /** Test session on a Pro subscription (the report is Pro-gated). */
  async function proSession(): Promise<{ workspaceId: string; cookie: string }> {
    const { createTestSession } = await import("./auth");
    const { db } = await import("../db/client");
    const { subscriptions } = await import("../db/schema/tenancy");
    const session = await createTestSession();
    await db.insert(subscriptions).values({
      workspaceId: session.workspaceId,
      plan: "pro",
      status: "active",
    });
    return session;
  }

  it("exports ledger rows as CSV with a download header", async () => {
    const { createApp } = await import("../app");
    const { db } = await import("../db/client");
    const { usageLedger } = await import("../db/schema/cost");
    const app = createApp();
    const session = await proSession();

    await db
      .insert(usageLedger)
      .values([
        {
          workspaceId: session.workspaceId,
          provider: "openai",
          model: "gpt-4o-mini",
          source: "gateway",
          inputTokens: 100,
          outputTokens: 50,
          costMicro: 1_254,
          createdAt: new Date("2026-07-02T10:00:00.000Z"),
        },
        {
          workspaceId: session.workspaceId,
          provider: "anthropic",
          model: "claude-sonnet-4",
          source: "gateway",
          inputTokens: 500,
          outputTokens: 200,
          costMicro: 9_000,
          createdAt: new Date("2026-07-02T12:00:00.000Z"),
        },
      ]);

    const res = await app.request(
      "/api/report/costs?format=csv&from=2026-07-01&to=2026-07-31",
      { headers: { cookie: session.cookie } },
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/csv");
    expect(res.headers.get("content-disposition")).toContain(
      'filename="layerflow-cost-report-2026-07-01-2026-07-31-csv.csv"',
    );

    const csv = await res.text();
    const lines = csv.trim().split("\n");
    expect(lines[0]).toBe(
      "date,project,provider,model,source,requests,input_tokens,output_tokens,cost_usd",
    );
    expect(lines).toContain(
      "2026-07-02,Ungrouped,openai,gpt-4o-mini,gateway,1,100,50,0.001254",
    );
    expect(lines).toContain(
      "2026-07-02,Ungrouped,anthropic,claude-sonnet-4,gateway,1,500,200,0.009000",
    );
  });

  it("returns the same report as JSON", async () => {
    const { createApp } = await import("../app");
    const { createTestSession } = await import("./auth");
    const { db } = await import("../db/client");
    const { usageLedger } = await import("../db/schema/cost");
    const app = createApp();
    const session = await proSession();

    await db.insert(usageLedger).values({
      workspaceId: session.workspaceId,
      provider: "groq",
      model: "llama-3.3-70b",
      source: "chat",
      inputTokens: 10,
      outputTokens: 10,
      costMicro: 0,
      createdAt: new Date("2026-07-03T09:00:00.000Z"),
    });

    const res = await app.request(
      "/api/report/costs?format=json&from=2026-07-01&to=2026-07-31",
      { headers: { cookie: session.cookie } },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.from).toBe("2026-07-01");
    expect(body.to).toBe("2026-07-31");
    expect(body.rows).toEqual([
      {
        date: "2026-07-03",
        project: "Ungrouped",
        provider: "groq",
        model: "llama-3.3-70b",
        source: "chat",
        requests: 1,
        inputTokens: 10,
        outputTokens: 10,
        costUsd: 0,
      },
    ]);
  });

  it("aggregates repeated calls on the same day/provider/model into one row", async () => {
    const { createApp } = await import("../app");
    const { createTestSession } = await import("./auth");
    const { db } = await import("../db/client");
    const { usageLedger } = await import("../db/schema/cost");
    const app = createApp();
    const session = await proSession();

    await db.insert(usageLedger).values([
      {
        workspaceId: session.workspaceId,
        provider: "openai",
        model: "gpt-4o-mini",
        source: "gateway",
        inputTokens: 100,
        outputTokens: 50,
        costMicro: 1_000,
        createdAt: new Date("2026-07-04T00:00:00.000Z"),
      },
      {
        workspaceId: session.workspaceId,
        provider: "openai",
        model: "gpt-4o-mini",
        source: "gateway",
        inputTokens: 200,
        outputTokens: 25,
        costMicro: 2_500,
        createdAt: new Date("2026-07-04T23:59:59.000Z"),
      },
    ]);

    const res = await app.request(
      "/api/report/costs?format=json&from=2026-07-01&to=2026-07-31",
      { headers: { cookie: session.cookie } },
    );
    const body = (await res.json()) as any;
    expect(body.rows).toHaveLength(1);
    expect(body.rows[0]).toMatchObject({
      requests: 2,
      inputTokens: 300,
      outputTokens: 75,
      costUsd: 0.0035,
    });
  });

  it("filters to one project and resolves its name", async () => {
    const { createApp } = await import("../app");
    const { createTestSession } = await import("./auth");
    const { db } = await import("../db/client");
    const { usageLedger } = await import("../db/schema/cost");
    const { domains } = await import("../db/schema/workspace");
    const { projects } = await import("../db/schema/workspace");
    const app = createApp();
    const session = await proSession();

    const [domain] = await db
      .insert(domains)
      .values({
        workspaceId: session.workspaceId,
        name: "General",
        slug: "general",
      })
      .returning({ id: domains.id });
    const [proj] = await db
      .insert(projects)
      .values({
        workspaceId: session.workspaceId,
        domainId: domain.id,
        name: "Docs Site",
      })
      .returning({ id: projects.id });

    await db.insert(usageLedger).values([
      {
        workspaceId: session.workspaceId,
        projectId: proj.id,
        provider: "openai",
        model: "gpt-4o-mini",
        source: "gateway",
        inputTokens: 50,
        outputTokens: 10,
        costMicro: 400,
        createdAt: new Date("2026-07-05T08:00:00.000Z"),
      },
      {
        workspaceId: session.workspaceId,
        provider: "openai",
        model: "gpt-4o-mini",
        source: "gateway",
        inputTokens: 50,
        outputTokens: 10,
        costMicro: 400,
        createdAt: new Date("2026-07-05T09:00:00.000Z"),
      },
    ]);

    const res = await app.request(
      `/api/report/costs?format=csv&from=2026-07-01&to=2026-07-31&projectId=${proj.id}`,
      { headers: { cookie: session.cookie } },
    );
    expect(res.status).toBe(200);
    const csv = await res.text();
    expect(csv).toContain("2026-07-05,Docs Site,openai,gpt-4o-mini,gateway,1,50,10,0.0004");
    expect(csv).not.toContain("Ungrouped");
  });

  it("rejects a project id from another workspace (404)", async () => {
    const { createApp } = await import("../app");
    const { createTestSession } = await import("./auth");
    const app = createApp();
    const session = await proSession();

    const res = await app.request(
      "/api/report/costs?from=2026-07-01&to=2026-07-31&projectId=proj_nonexistent",
      { headers: { cookie: session.cookie } },
    );
    expect(res.status).toBe(404);
    expect(((await res.json()) as any).error.code).toBe("project_not_found");
  });

  it("quotes and escapes CSV cells containing commas and quotes", async () => {
    const { createApp } = await import("../app");
    const { createTestSession } = await import("./auth");
    const { db } = await import("../db/client");
    const { usageLedger } = await import("../db/schema/cost");
    const { domains } = await import("../db/schema/workspace");
    const { projects } = await import("../db/schema/workspace");
    const app = createApp();
    const session = await proSession();

    const [domain] = await db
      .insert(domains)
      .values({ workspaceId: session.workspaceId, name: "General", slug: "general" })
      .returning({ id: domains.id });
    const [proj] = await db
      .insert(projects)
      .values({
        workspaceId: session.workspaceId,
        domainId: domain.id,
        name: 'Team "Alpha", Q3',
      })
      .returning({ id: projects.id });

    await db.insert(usageLedger).values({
      workspaceId: session.workspaceId,
      projectId: proj.id,
      provider: "openai",
      model: "gpt-4o-mini",
      source: "gateway",
      inputTokens: 1,
      outputTokens: 1,
      costMicro: 1,
      createdAt: new Date("2026-07-06T08:00:00.000Z"),
    });

    const res = await app.request(
      `/api/report/costs?format=csv&from=2026-07-01&to=2026-07-31&projectId=${proj.id}`,
      { headers: { cookie: session.cookie } },
    );
    expect(res.status).toBe(200);
    const csv = await res.text();
    expect(csv).toContain('"Team ""Alpha"", Q3"');
  });

  it("blocks a free workspace with plan_required (Pro feature)", async () => {
    const { createApp } = await import("../app");
    const { createTestSession } = await import("./auth");
    const app = createApp();
    const session = await createTestSession();

    const res = await app.request("/api/report/costs?format=json", {
      headers: { cookie: session.cookie },
    });
    expect(res.status).toBe(402);
    expect(((await res.json()) as any).error.code).toBe("plan_required");
  });

  it("allows a Pro workspace even with an empty ledger", async () => {
    const { createApp } = await import("../app");
    const app = createApp();
    const session = await proSession();

    const res = await app.request("/api/report/costs?format=csv", {
      headers: { cookie: session.cookie },
    });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("date,project,provider,model,source");
  });

  it("rejects an invalid date range with a validation error", async () => {
    const { createApp } = await import("../app");
    const { createTestSession } = await import("./auth");
    const app = createApp();
    const session = await createTestSession();

    const res = await app.request("/api/report/costs?format=csv&from=01-07-2026", {
      headers: { cookie: session.cookie },
    });
    expect(res.status).toBe(400);
    expect(((await res.json()) as any).error.code).toBe("validation_error");
  });
});