import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { idColumn, timestamps } from "./_helpers";
import { workspaces } from "./tenancy";

/**
 * Remote-control commands for CLI devices ("driver / car").
 *
 * A user issues a command from the web dashboard; the next `lf` daemon that
 * polls claims it (status pending -> running), executes it locally on that
 * machine (default cwd), streams output back, and marks it succeeded/failed.
 *
 * `device_id` is null when "any available device" may pick it up; otherwise
 * only the named device can claim it.
 */
export const deviceCommands = pgTable(
  "device_commands",
  {
    id: idColumn("cmd"),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    /** Creator user when issued from the dashboard; empty for API-key clients. */
    userId: text("user_id"),
    /** Target device. Null = any available daemon may claim. */
    deviceId: text("device_id"),
    /** Shell command string executed via the shell. */
    command: text("command").notNull(),
    /** Working directory on the device; defaults to the daemon cwd. */
    cwd: text("cwd"),
    status: text("status")
      .$type<"pending" | "running" | "succeeded" | "failed" | "cancelled">()
      .notNull()
      .default("pending"),
    exitCode: integer("exit_code"),
    /** Accumulated stdout+stderr from the daemon. */
    output: text("output").notNull().default(""),
    errorMessage: text("error_message"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("device_commands_workspace_status_idx").on(t.workspaceId, t.status),
    index("device_commands_workspace_created_idx").on(t.workspaceId, t.createdAt),
  ],
);

export type DeviceCommandRow = typeof deviceCommands.$inferSelect;