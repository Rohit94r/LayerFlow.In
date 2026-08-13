import { bigint, bigserial, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createdAtOnly, idColumn } from "./_helpers";
import { workspaces } from "./tenancy";

/**
 * Registered CLI devices per workspace. A device is a specific `lf` install
 * that syncs local operations (sessions, messages, memory, project notes).
 */
export const syncDevices = pgTable(
  "sync_devices",
  {
    id: idColumn("syd"),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    deviceId: text("device_id").notNull(),
    /** Free-form device label supplied by the CLI (hostname, platform). */
    name: text("name"),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    ...createdAtOnly,
  },
  (t) => [
    uniqueIndex("sync_devices_workspace_device_uq").on(t.workspaceId, t.deviceId),
    index("sync_devices_workspace_id_idx").on(t.workspaceId),
  ],
);

/**
 * One row per operation synced from a CLI device.
 *
 * `op_id` is generated client-side (device + timestamp) and is the
 * idempotency key: a push that replays an already-accepted op_id is a no-op.
 *
 * `sequence` is the server-assigned monotonic watermark used by pull —
 * devices poll with their last watermark and receive everything newer.
 */
export const syncOperations = pgTable(
  "sync_operations",
  {
    id: text("op_id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    deviceId: text("device_id").notNull(),
    /** Entity kind: session, message, memory, project. */
    entity: text("entity").notNull(),
    entityId: text("entity_id").notNull(),
    payload: jsonb("payload").default({}).notNull(),
    /** Client Lamport tick for conflict ordering. */
    opTick: bigint("op_tick", { mode: "number" }).notNull().default(0),
    /** synced | conflict */
    state: text("state").notNull().default("synced"),
    attempts: integer("attempts").notNull().default(0),
    sequence: bigserial("sequence", { mode: "number" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("sync_operations_workspace_sequence_idx").on(t.workspaceId, t.sequence),
    index("sync_operations_workspace_entity_idx").on(t.workspaceId, t.entity),
  ],
);
