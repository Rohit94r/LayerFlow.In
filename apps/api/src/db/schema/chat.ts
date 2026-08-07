import { boolean, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createdAtOnly, idColumn, microDollars, timestamps } from "./_helpers";
import { users } from "./auth";
import { rescueReports } from "./rescue";
import { workspaces } from "./tenancy";

/**
 * Multi-AI chat workspace tables.
 *
 * A chat session is one thread that lives inside LayerFlow. Any message can be
 * answered by any provider the workspace has a key for, and the router can
 * auto-switch models mid-conversation when a key expires / is rate-limited.
 */

export const aiChatSessions = pgTable(
  "ai_chat_sessions",
  {
    id: idColumn("chat"),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    projectId: text("project_id"),
    title: text("title").notNull().default("New chat"),
    source: text("source").$type<"new" | "rescue">().notNull().default("new"),
    rescueReportId: text("rescue_report_id").references(() => rescueReports.id, { onDelete: "set null" }),
    defaultModel: text("default_model"),
    autoSwitch: boolean("auto_switch").notNull().default(true),
    status: text("status").$type<"active" | "archived">().notNull().default("active"),
    /** Portable context passport from a rescue import (JSONB, rarely read). */
    passport: jsonb("passport").notNull().default({}),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("ai_chat_sessions_workspace_idx").on(t.workspaceId, t.updatedAt)],
);

export type AiChatSessionRow = typeof aiChatSessions.$inferSelect;

export const aiChatMessages = pgTable(
  "ai_chat_messages",
  {
    id: idColumn("msg"),
    sessionId: text("session_id")
      .notNull()
      .references(() => aiChatSessions.id, { onDelete: "cascade" }),
    role: text("role").$type<"system" | "user" | "assistant">().notNull(),
    content: text("content").notNull(),
    model: text("model"),
    provider: text("provider"),
    keyHint: text("key_hint"),
    keyId: text("key_id"),
    tokensIn: integer("tokens_in").notNull().default(0),
    tokensOut: integer("tokens_out").notNull().default(0),
    costMicro: microDollars("cost_micro").notNull().default(0),
    latencyMs: integer("latency_ms"),
    /** Documented only when the router failed over (system notice). */
    switchedFrom: jsonb("switched_from"),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    ...createdAtOnly,
  },
  (t) => [index("ai_chat_messages_session_idx").on(t.sessionId, t.createdAt)],
);

export type AiChatMessageRow = typeof aiChatMessages.$inferSelect;

/**
 * Health bookkeeping for provider keys used by chat. Platform env keys have
 * keyId = null and keyHint = "platform:<provider>". Rows are upserted lazily on
 * the first error and refreshed after every successful call.
 */
export const providerKeyHealth = pgTable(
  "provider_key_health",
  {
    id: idColumn("kh"),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    keyId: text("key_id"),
    keyHint: text("key_hint").notNull(),
    status: text("status").$type<"healthy" | "degrading" | "dead" | "expired">().notNull().default("healthy"),
    lastStatusCode: integer("last_status_code"),
    lastErrorCode: text("last_error_code"),
    lastErrorAt: timestamp("last_error_at", { withTimezone: true }),
    consecutiveFailures: integer("consecutive_failures").notNull().default(0),
    /** Until this timestamp the key is skipped by the router (429 cooldowns). */
    cooldownUntil: timestamp("cooldown_until", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("provider_key_health_workspace_key_hint_uq").on(t.workspaceId, t.provider, t.keyHint),
    index("provider_key_health_workspace_idx").on(t.workspaceId, t.provider),
  ],
);

export type ProviderKeyHealthRow = typeof providerKeyHealth.$inferSelect;