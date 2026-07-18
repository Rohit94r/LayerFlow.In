import {
  boolean,
  date,
  index,
  integer,
  pgTable,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createdAtOnly, idColumn, microDollars, timestamps } from "./_helpers";
import { workspaces } from "./tenancy";
import { projects } from "./workspace";

/** Hard monthly budget per workspace. Redis enforces live; this is durable truth. */
export const budgets = pgTable(
  "budgets",
  {
    id: idColumn("bud"),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    /** Period key, e.g. "2026-07". */
    period: text("period").notNull(),
    monthlyLimitMicro: microDollars("monthly_limit_micro").notNull(),
    dailyLimitMicro: microDollars("daily_limit_micro"),
    /** Mirrored from Redis by the reconciliation worker. */
    spentMicro: microDollars("spent_micro").notNull().default(0),
    alertAtPct: integer("alert_at_pct").notNull().default(80),
    hardBlock: boolean("hard_block").notNull().default(true),
    ...timestamps,
  },
  // Core index from docs/backend.md §4: unique (workspaceId, period).
  (t) => [uniqueIndex("budgets_workspace_period_uq").on(t.workspaceId, t.period)],
);

/** Optional narrower caps under a budget: per-project or per-API-key. */
export const budgetScopes = pgTable(
  "budget_scopes",
  {
    id: idColumn("bsc"),
    budgetId: text("budget_id")
      .notNull()
      .references(() => budgets.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    scopeType: text("scope_type").$type<"project" | "api_key">().notNull(),
    projectId: text("project_id").references(() => projects.id, { onDelete: "cascade" }),
    // api_keys.id — plain text (no FK) to avoid a circular import with gateway.ts.
    apiKeyId: text("api_key_id"),
    limitMicro: microDollars("limit_micro").notNull(),
    spentMicro: microDollars("spent_micro").notNull().default(0),
    ...timestamps,
  },
  (t) => [index("budget_scopes_workspace_id_idx").on(t.workspaceId)],
);

/**
 * Immutable financial ledger — one row per settled model call.
 * Rows are only ever INSERTed; corrections are compensating entries.
 */
export const usageLedger = pgTable(
  "usage_ledger",
  {
    id: idColumn("ul"),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    // Loose references (no FK) so ledger inserts never fail on cleanup cascades.
    runId: text("run_id"),
    apiKeyId: text("api_key_id"),
    projectId: text("project_id"),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    source: text("source").notNull(),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    costMicro: microDollars("cost_micro").notNull(),
    ...createdAtOnly,
  },
  (t) => [index("usage_ledger_workspace_created_idx").on(t.workspaceId, t.createdAt)],
);

/** Pre-aggregated usage per day/dimension, maintained by the rollup worker. */
export const usageRollups = pgTable(
  "usage_rollups",
  {
    id: idColumn("ur"),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
    projectId: text("project_id"),
    model: text("model"),
    apiKeyId: text("api_key_id"),
    requests: integer("requests").notNull().default(0),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    costMicro: microDollars("cost_micro").notNull().default(0),
    ...timestamps,
  },
  (t) => [index("usage_rollups_workspace_day_idx").on(t.workspaceId, t.day)],
);
