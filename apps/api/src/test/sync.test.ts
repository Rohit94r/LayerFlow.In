import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startTestDb } from "./helpers/integration-db";

/**
 * CLI sync protocol tests: handshake, push (idempotent), pull watermarking,
 * and dashboard listing. Runs against a fresh in-memory PGlite.
 */

process.env.REDIS_URL = "redis://127.0.0.1:6399";

const stopDb = await startTestDb();

describe("sync protocol", () => {
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

  it("rejects anonymous sync traffic with 401", async () => {
    const { createApp } = await import("../app");
    const res = await createApp().request("/api/v1/sync/handshake", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ device_id: "dev_anon", last_watermark: 0 }),
    });
    expect(res.status).toBe(401);
    expect(((await res.json()) as any).error.code).toBe("unauthorized");
  });

  it("rejects invalid API keys", async () => {
    const { createApp } = await import("../app");
    const res = await createApp().request("/api/v1/sync/push", {
      method: "POST",
      headers: {
        authorization: "Bearer lf_live_bogus",
        "content-type": "application/json",
      },
      body: JSON.stringify({ ops: [] }),
    });
    expect(res.status).toBe(401);
  });

  it("pushes operations, dedupes on op_id, and watermarks pulls", async () => {
    const { createApp } = await import("../app");
    const { createTestSession } = await import("./auth");
    const app = createApp();

    const session = await createTestSession({ name: "Sync Tester" });
    const headers = {
      cookie: session.cookie,
      "content-type": "application/json",
      "x-lf-device": "dev_macbook_pro",
    };

    // Handshake
    const hs = await app.request("/api/v1/sync/handshake", {
      method: "POST",
      headers,
      body: JSON.stringify({ device_id: "dev_macbook_pro", last_watermark: 0 }),
    });
    expect(hs.status).toBe(200);
    const hsBody = (await hs.json()) as any;
    expect(hsBody.server_watermark).toBe(0);

    const ops = [
      {
        op_id: "op_1_aaaa",
        entity: "session",
        entity_id: "sess_1",
        payload: { title: "Terminal session 1", provider: "openai" },
        device_id: "dev_macbook_pro",
        op_tick: 1,
      },
      {
        op_id: "op_2_bbbb",
        entity: "memory",
        entity_id: "mem_1",
        payload: { title: "Remembered fact", body: "LayerFlow ships" },
        device_id: "dev_macbook_pro",
        op_tick: 2,
      },
    ];

    const push = await app.request("/api/v1/sync/push", {
      method: "POST",
      headers,
      body: JSON.stringify({ ops }),
    });
    expect(push.status).toBe(200);
    const pushBody = (await push.json()) as any;
    expect(pushBody.accepted.sort()).toEqual(["op_1_aaaa", "op_2_bbbb"]);
    expect(pushBody.rejected).toHaveLength(0);
    const watermark = pushBody.server_watermark;
    expect(watermark).toBeGreaterThan(0);

    // Idempotent replay of the same op_ids must not double-insert.
    const replay = await app.request("/api/v1/sync/push", {
      method: "POST",
      headers,
      body: JSON.stringify({ ops }),
    });
    const replayBody = (await replay.json()) as any;
    expect(replayBody.accepted.sort()).toEqual(["op_1_aaaa", "op_2_bbbb"]);
    expect(replayBody.server_watermark).toBe(watermark);

    // Pull with since=0 returns both ops; since=watermark returns none.
    const pull0 = await app.request("/api/v1/sync/pull", {
      method: "POST",
      headers,
      body: JSON.stringify({ since: 0 }),
    });
    const pull0Body = (await pull0.json()) as any;
    expect(pull0Body.ops).toHaveLength(2);

    const pullAll = await app.request("/api/v1/sync/pull", {
      method: "POST",
      headers,
      body: JSON.stringify({ since: watermark }),
    });
    expect(((await pullAll.json()) as any).ops).toHaveLength(0);

    // Dashboard endpoints
    const list = await app.request("/api/v1/sync/operations", { headers });
    const listBody = (await list.json()) as any;
    expect(listBody.operations).toHaveLength(2);
    expect(listBody.operations[0].entity).toBe("memory");

    const devices = await app.request("/api/v1/sync/devices", { headers });
    const devicesBody = (await devices.json()) as any;
    expect(devicesBody.devices).toHaveLength(1);
    expect(devicesBody.devices[0].device_id).toBe("dev_macbook_pro");

    // Delete one op
    const del = await app.request("/api/v1/sync/operations/op_1_aaaa", {
      method: "DELETE",
      headers,
    });
    expect(del.status).toBe(200);
    const after = await app.request("/api/v1/sync/operations", { headers });
    expect(((await after.json()) as any).operations).toHaveLength(1);
  });

  it("rejects oversized payloads and unknown entities", async () => {
    const { createApp } = await import("../app");
    const { createTestSession } = await import("./auth");
    const app = createApp();
    const session = await createTestSession();
    const headers = { cookie: session.cookie, "content-type": "application/json" };

    const badEntity = await app.request("/api/v1/sync/push", {
      method: "POST",
      headers,
      body: JSON.stringify({
        ops: [{ op_id: "op_x", entity: "nope", entity_id: "e1", payload: {}, device_id: "d1" }],
      }),
    });
    expect(badEntity.status).toBe(400);

    const bigPayload = await app.request("/api/v1/sync/push", {
      method: "POST",
      headers,
      body: JSON.stringify({
        ops: [
          {
            op_id: "op_y",
            entity: "session",
            entity_id: "e2",
            payload: { blob: "x".repeat(110_000) },
            device_id: "d1",
          },
        ],
      }),
    });
    expect(bigPayload.status).toBe(400);
  });

  it("supports CLI authentication via workspace API key", async () => {
    const { createApp } = await import("../app");
    const { createTestSession } = await import("./auth");
    const app = createApp();
    const session = await createTestSession();

    const keyRes = await app.request("/api/keys", {
      method: "POST",
      headers: { cookie: session.cookie, "content-type": "application/json" },
      body: JSON.stringify({ name: "cli-sync-key" }),
    });
    const { secret } = (await keyRes.json()) as any;

    const res = await app.request("/api/v1/sync/handshake", {
      method: "POST",
      headers: {
        authorization: `Bearer ${secret}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ device_id: "dev_ci", last_watermark: 0 }),
    });
    expect(res.status).toBe(200);
    expect(((await res.json()) as any).server_watermark).toBe(0);
  });
});
