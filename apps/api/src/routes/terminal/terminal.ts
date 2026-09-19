import { and, asc, desc, eq, isNull, or } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "../../db/client";
import { deviceCommands, type DeviceCommandRow } from "../../db/schema/terminal";
import { syncDevices } from "../../db/schema/sync";
import { requireSyncAuth } from "../../middleware/auth-sync";
import { AppError } from "../../middleware/app-error";
import type { AppEnv } from "../../types";

/**
 * Remote-control protocol ("driver / car").
 *
 * Dashboard (session cookie) can:
 *   POST /api/v1/terminal/commands        enqueue a command for a device
 *   GET  /api/v1/terminal/commands        list recent commands
 *   POST /api/v1/terminal/commands/:id/cancel  cancel a pending command
 *
 * CLI daemons (Bearer lf_live_...) can:
 *   POST /api/v1/terminal/commands/poll   claim the next pending command
 *   POST /api/v1/terminal/commands/:id/result  stream output / final result
 */

const createSchema = z
  .object({
    command: z.string().trim().min(1).max(4000),
    device_id: z.string().trim().max(128).nullable().optional(),
    cwd: z.string().trim().max(1000).nullable().optional(),
  })
  .strict();

const claimSchema = z
  .object({
    device_id: z.string().trim().min(1).max(128),
  })
  .strict();

const resultSchema = z
  .object({
    output: z.string().max(2_000_000).optional(),
    finished: z.boolean().optional().default(false),
    exit_code: z.number().int().min(-128).max(255).nullable().optional(),
    error: z.string().max(2000).nullable().optional(),
  })
  .strict();

function toDto(row: DeviceCommandRow) {
  return {
    id: row.id,
    workspace_id: row.workspaceId,
    user_id: row.userId,
    device_id: row.deviceId,
    command: row.command,
    cwd: row.cwd,
    status: row.status,
    exit_code: row.exitCode,
    output: row.output,
    error_message: row.errorMessage,
    started_at: row.startedAt?.toISOString() ?? null,
    completed_at: row.completedAt?.toISOString() ?? null,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

async function upsertDevice(workspaceId: string, deviceId: string) {
  await db
    .insert(syncDevices)
    .values({
      workspaceId,
      deviceId,
      name: deviceId,
      lastSeenAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [syncDevices.workspaceId, syncDevices.deviceId],
      set: { lastSeenAt: new Date() },
    })
    .catch(() => undefined);
}

export const terminalRouter = new Hono<AppEnv>();

terminalRouter.use(requireSyncAuth);

// POST /api/v1/terminal/commands — enqueue a remote-controlled command.
terminalRouter.post("/commands", async (c) => {
  const workspaceId = c.get("workspaceId");
  const userId = c.get("userId") || null;
  const body = createSchema.parse(await c.req.json());

  const [row] = await db
    .insert(deviceCommands)
    .values({
      workspaceId,
      userId,
      deviceId: body.device_id ?? null,
      command: body.command,
      cwd: body.cwd ?? null,
      status: "pending",
    })
    .returning();

  if (!row) throw new AppError(500, "insert_failed", "Could not create the command");
  return c.json({ command: toDto(row) }, 201);
});

// GET /api/v1/terminal/commands — recent commands for the workspace.
terminalRouter.get("/commands", async (c) => {
  const workspaceId = c.get("workspaceId");
  const limit = Math.min(Math.max(Number(c.req.query("limit") ?? "30"), 1), 100);

  const rows = await db
    .select()
    .from(deviceCommands)
    .where(eq(deviceCommands.workspaceId, workspaceId))
    .orderBy(desc(deviceCommands.createdAt))
    .limit(limit);

  return c.json({ commands: rows.map(toDto) });
});

// POST /api/v1/terminal/commands/poll — claim one pending command atomically.
// Only the named device can claim device-scoped commands; "any device"
// commands (device_id null) are claimable by everyone.
terminalRouter.post("/commands/poll", async (c) => {
  const workspaceId = c.get("workspaceId");
  const body = claimSchema.parse(await c.req.json());
  const deviceId = c.req.header("x-lf-device") ?? body.device_id;

  await upsertDevice(workspaceId, deviceId);

  const claimed = await db.transaction(async (tx) => {
    const [candidate] = await tx
      .select()
      .from(deviceCommands)
      .where(
        and(
          eq(deviceCommands.workspaceId, workspaceId),
          eq(deviceCommands.status, "pending"),
          or(eq(deviceCommands.deviceId, deviceId), isNull(deviceCommands.deviceId)),
        ),
      )
      .orderBy(asc(deviceCommands.createdAt))
      .limit(1)
      .for("update", { skipLocked: true });

    if (!candidate) return null;

    const [updated] = await tx
      .update(deviceCommands)
      .set({
        status: "running",
        deviceId,
        startedAt: new Date(),
        errorMessage: null,
      })
      .where(and(eq(deviceCommands.id, candidate.id), eq(deviceCommands.status, "pending")))
      .returning();

    return updated ?? null;
  });

  return c.json({ command: claimed ? toDto(claimed) : null });
});

// POST /api/v1/terminal/commands/:id/result — partial output or final result.
terminalRouter.post("/commands/:id/result", async (c) => {
  const workspaceId = c.get("workspaceId");
  const id = c.req.param("id");
  const body = resultSchema.parse(await c.req.json());

  const existing = await db.query.deviceCommands.findFirst({
    where: and(eq(deviceCommands.id, id), eq(deviceCommands.workspaceId, workspaceId)),
    columns: { status: true, output: true },
  });
  if (!existing) throw new AppError(404, "not_found", "Command not found");
  if (existing.status !== "running") {
    throw new AppError(409, "not_running", `Command is ${existing.status}, only running commands accept results`);
  }

  if (body.finished) {
    const [row] = await db
      .update(deviceCommands)
      .set({
        status: body.exit_code === 0 ? "succeeded" : "failed",
        output: body.output ?? existing.output,
        exitCode: body.exit_code ?? (body.error ? 1 : 0),
        errorMessage: body.error ?? null,
        completedAt: new Date(),
      })
      .where(and(eq(deviceCommands.id, id), eq(deviceCommands.workspaceId, workspaceId)))
      .returning();
    if (!row) throw new AppError(404, "not_found", "Command not found");
    return c.json({ command: toDto(row) });
  }

  // Streaming update — accumulate output, keep status running.
  const [row] = await db
    .update(deviceCommands)
    .set({
      output: body.output ?? existing.output,
      errorMessage: body.error ?? null,
    })
    .where(and(eq(deviceCommands.id, id), eq(deviceCommands.workspaceId, workspaceId)))
    .returning();
  if (!row) throw new AppError(404, "not_found", "Command not found");
  return c.json({ command: toDto(row) });
});

// POST /api/v1/terminal/commands/:id/cancel — cancel a pending command.
terminalRouter.post("/commands/:id/cancel", async (c) => {
  const workspaceId = c.get("workspaceId");
  const id = c.req.param("id");

  const [row] = await db
    .update(deviceCommands)
    .set({ status: "cancelled", errorMessage: "Cancelled from the dashboard", completedAt: new Date() })
    .where(
      and(
        eq(deviceCommands.id, id),
        eq(deviceCommands.workspaceId, workspaceId),
        eq(deviceCommands.status, "pending"),
      ),
    )
    .returning();

  if (!row) throw new AppError(409, "cannot_cancel", "Only pending commands can be cancelled");
  return c.json({ command: toDto(row) });
});