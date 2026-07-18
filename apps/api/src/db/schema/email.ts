import { index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createdAtOnly, idColumn } from "./_helpers";
import { workspaces } from "./tenancy";

/**
 * Outbound email audit + idempotency. One row per logical notification;
 * the unique dedupe key guarantees a given alert/digest is sent at most once
 * (e.g. `budget-alert:ws_x:2026-07:80`), no matter how often jobs re-run.
 */
export const emailEvents = pgTable(
  "email_events",
  {
    id: idColumn("eml"),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    type: text("type").$type<"budget_alert" | "weekly_digest">().notNull(),
    /** Deterministic key, unique per logical notification. */
    dedupeKey: text("dedupe_key").notNull(),
    recipient: text("recipient").notNull(),
    /** Null while claimed but not yet confirmed sent/skipped. */
    sentAt: timestamp("sent_at", { withTimezone: true }),
    /** "sent" | "skipped" (no RESEND_API_KEY) | "failed" */
    status: text("status").notNull().default("pending"),
    ...createdAtOnly,
  },
  (t) => [
    uniqueIndex("email_events_dedupe_key_uq").on(t.dedupeKey),
    index("email_events_workspace_id_idx").on(t.workspaceId),
  ],
);
