import { and, asc, desc, eq, gt, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "../../db/client";
import { syncDevices, syncOperations } from "../../db/schema/sync";
import { requireSyncAuth } from "../../middleware/auth-sync";
import { AppError } from "../../middleware/app-error";
import type { AppEnv } from "../../types";

/**
 * CLI sync protocol (mirrors terminal/internal/sync).
 *
 *   POST /api/v1/sync/handshake  { device_id, last_watermark }
 *        → { server_watermark, ops }
 *   POST /api/v1/sync/push       { ops: [...] } → { accepted, rejected }
 *   POST /api/v1/sync/pull       { since }      → { ops }
 *
 * Plus dashboard endpoints (session-authenticated):
 *   GET  /api/v1/sync/operations → recent synced operations
 *   GET  /api/v1/sync/devices    → registered CLI devices
 */

const ENTITIES = ["session", "message", "memory", "project"] as const;
const MAX_PAYLOAD_BYTES = 100_000;
const MAX_BATCH = 200;
const MAX_PULL = 500;

const payloadSchema = z
  .record(z.string(), z.unknown())
  .refine((p) => JSON.stringify(p).length <= MAX_PAYLOAD_BYTES, "payload exceeds 100KB limit");

const opSchema = z
  .object({
    op_id: z.string().min(1).max(128),
    entity: z.enum(ENTITIES),
    entity_id: z.string().min(1).max(128),
    payload: payloadSchema,
    device_id: z.string().min(1).max(128),
    op_tick: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).default(0),
    state: z.enum(["synced", "queued", "conflict"]).default("synced"),
    attempts: z.number().int().nonnegative().max(1000).default(0),
  })
  .strict();

const handshakeSchema = z
  .object({
    device_id: z.string().min(1).max(128),
    last_watermark: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).default(0),
  })
  .strict();

const pushSchema = z
  .object({
    ops: z.array(opSchema).min(1).max(MAX_BATCH),
  })
  .strict();

const pullSchema = z
  .object({
    since: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).default(0),
  })
  .strict();

function toOpDto(row: typeof syncOperations.$inferSelect) {
  return {
    op_id: row.id,
    entity: row.entity,
    entity_id: row.entityId,
    payload: row.payload,
    device_id: row.deviceId,
    op_tick: row.opTick,
    state: row.state,
    attempts: row.attempts,
    created_at: row.createdAt.toISOString(),
  };
}

async function currentWatermark(workspaceId: string): Promise<number> {
  const result = await db.execute<{ max: number }>(
    sql`SELECT COALESCE(MAX(sequence), 0)::int AS max FROM sync_operations WHERE workspace_id = ${workspaceId}`,
  );
  return result.rows[0]?.max ?? 0;
}

async function upsertDevice(workspaceId: string, deviceId: string, name?: string) {
  await db
    .insert(syncDevices)
    .values({
      workspaceId,
      deviceId,
      name: name || deviceId,
      lastSeenAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [syncDevices.workspaceId, syncDevices.deviceId],
      set: { lastSeenAt: new Date(), name: name || syncDevices.deviceId },
    });
}

export const syncRouter = new Hono<AppEnv>();

syncRouter.use(requireSyncAuth);

// POST /api/v1/sync/handshake — register device, return watermark + backlog.
syncRouter.post("/handshake", async (c) => {
  const workspaceId = c.get("workspaceId");
  const body = handshakeSchema.parse(await c.req.json());
  const deviceId = c.req.header("x-lf-device") ?? body.device_id;

  await upsertDevice(workspaceId, deviceId);

  const watermark = await currentWatermark(workspaceId);
  const backlog = await db
    .select()
    .from(syncOperations)
    .where(
      and(eq(syncOperations.workspaceId, workspaceId), gt(syncOperations.sequence, body.last_watermark)),
    )
    .orderBy(asc(syncOperations.sequence))
    .limit(MAX_PULL);

  return c.json({
    server_watermark: watermark,
    ops: backlog.map(toOpDto),
  });
});

// POST /api/v1/sync/push — accept client operations, idempotent on op_id.
syncRouter.post("/push", async (c) => {
  const workspaceId = c.get("workspaceId");
  const body = pushSchema.parse(await c.req.json());

  const deviceId = c.req.header("x-lf-device") ?? body.ops[0]?.device_id ?? "";
  if (deviceId) await upsertDevice(workspaceId, deviceId);

  const accepted: string[] = [];
  const rejected: { op_id: string; reason: string }[] = [];

  for (const op of body.ops) {
    try {
      const [row] = await db
        .insert(syncOperations)
        .values({
          id: op.op_id,
          workspaceId,
          deviceId,
          entity: op.entity,
          entityId: op.entity_id,
          payload: op.payload,
          opTick: op.op_tick,
          state: op.state,
          attempts: op.attempts,
        })
        .onConflictDoNothing({ target: syncOperations.id })
        .returning({ id: syncOperations.id });
      accepted.push(row?.id ?? op.op_id);
    } catch (err) {
      rejected.push({ op_id: op.op_id, reason: err instanceof Error ? err.message : "insert failed" });
    }
  }

  const watermark = await currentWatermark(workspaceId);
  return c.json({ accepted, rejected, server_watermark: watermark });
});

// POST /api/v1/sync/pull — fetch operations newer than the client's watermark.
syncRouter.post("/pull", async (c) => {
  const workspaceId = c.get("workspaceId");
  const body = pullSchema.parse(await c.req.json());

  const ops = await db
    .select()
    .from(syncOperations)
    .where(
      and(eq(syncOperations.workspaceId, workspaceId), gt(syncOperations.sequence, body.since)),
    )
    .orderBy(asc(syncOperations.sequence))
    .limit(MAX_PULL);

  return c.json({ ops: ops.map(toOpDto), server_watermark: await currentWatermark(workspaceId) });
});

// GET /api/v1/sync/operations — recent synced operations (dashboard).
syncRouter.get("/operations", async (c) => {
  const workspaceId = c.get("workspaceId");
  const limit = Number(c.req.query("limit") ?? "50");
  const page = Math.min(Math.max(Number.isFinite(limit) ? limit : 50, 1), 200);

  const ops = await db
    .select()
    .from(syncOperations)
    .where(eq(syncOperations.workspaceId, workspaceId))
    .orderBy(desc(syncOperations.sequence))
    .limit(page);

  return c.json({ operations: ops.map(toOpDto), server_watermark: await currentWatermark(workspaceId) });
});

// GET /api/v1/sync/devices — registered CLI devices (dashboard).
syncRouter.get("/devices", async (c) => {
  const workspaceId = c.get("workspaceId");

  const devices = await db
    .select()
    .from(syncDevices)
    .where(eq(syncDevices.workspaceId, workspaceId))
    .orderBy(desc(syncDevices.lastSeenAt))
    .limit(100);

  return c.json({
    devices: devices.map((d) => ({
      id: d.id,
      device_id: d.deviceId,
      name: d.name,
      last_seen_at: d.lastSeenAt.toISOString(),
      created_at: d.createdAt.toISOString(),
    })),
  });
});

// DELETE /api/v1/sync/operations/:opId — remove a synced operation (dashboard).
syncRouter.delete("/operations/:opId", async (c) => {
  const workspaceId = c.get("workspaceId");
  const opId = c.req.param("opId");
  const [deleted] = await db
    .delete(syncOperations)
    .where(and(eq(syncOperations.workspaceId, workspaceId), eq(syncOperations.id, opId)))
    .returning({ id: syncOperations.id });
  if (!deleted) throw new AppError(404, "not_found", "Operation not found");
  return c.json({ id: opId, deleted: true });
});
