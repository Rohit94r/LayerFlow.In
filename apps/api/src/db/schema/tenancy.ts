import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { idColumn, timestamps } from "./_helpers";
import { users } from "./auth";

export const workspaces = pgTable("workspaces", {
  id: idColumn("ws"),
  ownerUserId: text("owner_user_id")
    .notNull()
    .references(() => users.id),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  ...timestamps,
});

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    id: idColumn("wsm"),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").$type<"owner" | "admin" | "member">().notNull().default("member"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("workspace_members_workspace_user_uq").on(t.workspaceId, t.userId),
    index("workspace_members_user_id_idx").on(t.userId),
  ],
);

export const invitations = pgTable(
  "invitations",
  {
    id: idColumn("inv"),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role").$type<"admin" | "member">().notNull().default("member"),
    token: text("token").notNull().unique(),
    invitedByUserId: text("invited_by_user_id")
      .notNull()
      .references(() => users.id),
    status: text("status")
      .$type<"pending" | "accepted" | "revoked" | "expired">()
      .notNull()
      .default("pending"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (t) => [index("invitations_workspace_id_idx").on(t.workspaceId)],
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: idColumn("sub"),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    /** Dodo Payments provider IDs (used by the billing service). */
    dodoCustomerId: text("dodo_customer_id"),
    dodoSubscriptionId: text("dodo_subscription_id"),
    plan: text("plan").$type<"free" | "starter" | "pro" | "team">().notNull().default("free"),
    status: text("status").notNull().default("active"),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex("subscriptions_workspace_id_uq").on(t.workspaceId)],
);

/**
 * One row per processed Dodo webhook event (keyed on the Standard-Webhooks
 * "webhook-id"). Used for idempotency: Dodo retries webhooks until we ACK, so
 * we must never apply the same event twice.
 */
export const billingEvents = pgTable(
  "billing_events",
  {
    id: idColumn("bev"),
    eventId: text("event_id").notNull().unique(),
    type: text("type").notNull(),
    workspaceId: text("workspace_id").references(() => workspaces.id, { onDelete: "set null" }),
    payload: jsonb("payload"),
    processedAt: timestamp("processed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("billing_events_event_id_idx").on(t.eventId)],
);

export const entitlements = pgTable(
  "entitlements",
  {
    id: idColumn("ent"),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    /** e.g. "max_prompts", "max_members", "gateway_enabled" */
    key: text("key").notNull(),
    /** Numeric limit when applicable; null = unlimited/boolean entitlement. */
    limitValue: integer("limit_value"),
    meta: jsonb("meta"),
    ...timestamps,
  },
  (t) => [uniqueIndex("entitlements_workspace_key_uq").on(t.workspaceId, t.key)],
);
