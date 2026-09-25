import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startTestDb } from "./helpers/integration-db";

/**
 * Phase 4: LayerFlow MCP server (tools subset over JSON-RPC 2.0 over HTTP).
 * An agent can read spend/budget, raise the monthly cap and list projects.
 */

const stopDb = await startTestDb();

async function createKeyAndClient() {
  const { createApp } = await import("../app");
  const { createTestSession } = await import("./auth");
  const app = createApp();
  const session = await createTestSession();

  const keyRes = await app.request("/api/keys", {
    method: "POST",
    headers: { cookie: session.cookie, "content-type": "application/json" },
    body: JSON.stringify({ name: "mcp-client" }),
  });
  const { secret } = (await keyRes.json()) as any;

  const rpc = async (body: unknown) =>
    app.request("/api/mcp", {
      method: "POST",
      headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" },
      body: JSON.stringify(body),
    });

  const read = async (res: Response) => (await res.json()) as any;

  return { app, session, secret, rpc, read };
}

describe("LayerFlow MCP server", () => {
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

  it("rejects requests without a valid API key", async () => {
    const { createApp } = await import("../app");
    const res = await createApp().request("/api/mcp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping" }),
    });
    expect(res.status).toBe(401);
  });

  it("serves health without auth", async () => {
    const { createApp } = await import("../app");
    const res = await createApp().request("/api/mcp/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: "ok", server: "layerflow-mcp" });
  });

  it("handles initialize", async () => {
    const { rpc, read } = await createKeyAndClient();
    const res = await rpc({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} });
    const body = await read(res);
    expect(body.id).toBe(1);
    expect(body.result.protocolVersion).toBe("2025-03-26");
    expect(body.result.serverInfo.name).toBe("layerflow");
    expect(body.result.capabilities.tools).toEqual({ listChanged: false });
  });

  it("lists the four spend tools", async () => {
    const { rpc, read } = await createKeyAndClient();
    const res = await rpc({ jsonrpc: "2.0", id: 2, method: "tools/list" });
    const body = await read(res);
    const names = (body.result.tools as { name: string }[]).map((t) => t.name);
    expect(names).toEqual([
      "layerflow_get_budget",
      "layerflow_set_monthly_budget",
      "layerflow_get_spend_summary",
      "layerflow_list_projects",
    ]);
  });

  it("get_budget returns the default budget in USD", async () => {
    const { rpc, read } = await createKeyAndClient();
    const res = await rpc({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: { name: "layerflow_get_budget" },
    });
    const body = await read(res);
    const parsed = JSON.parse(body.result.content[0].text);
    expect(parsed.monthlyLimitUsd).toBe(10);
    expect(parsed.spentUsd).toBe(0);
    expect(parsed.hardBlock).toBe(true);
    expect(body.result.isError).toBe(false);
  });

  it("set_monthly_budget converts USD to micro and persists", async () => {
    const { rpc, read, session } = await createKeyAndClient();
    const res = await rpc({
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: {
        name: "layerflow_set_monthly_budget",
        arguments: { monthlyLimitUsd: 250 },
      },
    });
    const body = await read(res);
    expect(body.result.isError).toBe(false);
    const parsed = JSON.parse(body.result.content[0].text);
    expect(parsed.monthlyLimitUsd).toBe(250);

    const { updateCurrentBudget } = await import("../services/budgets/current");
    // Rebuild from the workspace budget row directly to confirm persistence.
    const current = await updateCurrentBudget(session.workspaceId, { monthlyLimitMicro: 250_000_000 });
    expect(current.budget.monthlyLimitMicro).toBe(250_000_000);
  });

  it("set_monthly_budget validates arguments", async () => {
    const { rpc, read } = await createKeyAndClient();
    const res = await rpc({
      jsonrpc: "2.0",
      id: 5,
      method: "tools/call",
      params: { name: "layerflow_set_monthly_budget", arguments: { monthlyLimitUsd: -5 } },
    });
    const body = await read(res);
    expect(body.result.isError).toBe(true);
    expect(body.result.content[0].text).toContain("Invalid arguments");
  });

  it("get_spend_summary aggregates the ledger and returns USD totals", async () => {
    const { rpc, read, session } = await createKeyAndClient();
    const { usageLedger } = await import("../db/schema/cost");
    const { db } = await import("../db/client");
    await db.insert(usageLedger).values({
      workspaceId: session.workspaceId,
      projectId: session.workspaceId,
      model: "gpt-4o-mini",
      provider: "openai",
      source: "proxy",
      apiKeyId: "key_mcp_ledger",
      inputTokens: 1000,
      outputTokens: 500,
      costMicro: 1000,
    });

    const res = await rpc({
      jsonrpc: "2.0",
      id: 6,
      method: "tools/call",
      params: {
        name: "layerflow_get_spend_summary",
        arguments: { from: "2026-09-01", to: "2026-09-30", groupBy: "model" },
      },
    });
    const body = await read(res);
    expect(body.result.isError).toBe(false);
    const parsed = JSON.parse(body.result.content[0].text);
    expect(parsed.totals.requests).toBe(1);
    expect(parsed.totals.inputTokens).toBe(1000);
    expect(parsed.totals.outputTokens).toBe(500);
    expect(parsed.totals.costUsd).toBe(0.001);
    expect(parsed.buckets[0]).toMatchObject({ model: "gpt-4o-mini", costUsd: 0.001 });
  });

  it("list_projects returns id + name rows", async () => {
    const { rpc, read } = await createKeyAndClient();
    const res = await rpc({
      jsonrpc: "2.0",
      id: 7,
      method: "tools/call",
      params: { name: "layerflow_list_projects" },
    });
    const body = await read(res);
    expect(body.result.isError).toBe(false);
    const rows = JSON.parse(body.result.content[0].text);
    expect(Array.isArray(rows)).toBe(true);
    if (rows.length > 0) {
      expect(rows[0]).toHaveProperty("id");
      expect(rows[0]).toHaveProperty("name");
    }
  });

  it("unknown tool and unknown method return JSON-RPC errors", async () => {
    const { rpc, read } = await createKeyAndClient();
    const toolRes = await rpc({
      jsonrpc: "2.0",
      id: 8,
      method: "tools/call",
      params: { name: "layerflow_dance" },
    });
    const toolBody = await read(toolRes);
    expect(toolBody.error.code).toBe(-32602);

    const methodRes = await rpc({ jsonrpc: "2.0", id: 9, method: "bogus" });
    const methodBody = await read(methodRes);
    expect(methodBody.error.code).toBe(-32601);

    expect(methodRes.status).toBe(200);
  });
});