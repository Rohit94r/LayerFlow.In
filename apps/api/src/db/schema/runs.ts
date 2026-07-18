import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createdAtOnly, idColumn, microDollars } from "./_helpers";
import { promptVersions } from "./prompts";
import { workspaces } from "./tenancy";

/** One model call — from the workspace (compare/playground/session) or the gateway. */
export const runs = pgTable(
  "runs",
  {
    id: idColumn("run"),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    promptVersionId: text("prompt_version_id").references(() => promptVersions.id, {
      onDelete: "set null",
    }),
    source: text("source")
      .$type<"compare" | "playground" | "gateway" | "session" | "replay">()
      .notNull(),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    status: text("status")
      .$type<"pending" | "running" | "succeeded" | "failed" | "blocked">()
      .notNull()
      .default("pending"),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    costMicro: microDollars("cost_micro").notNull().default(0),
    latencyMs: integer("latency_ms"),
    cacheHit: boolean("cache_hit").notNull().default(false),
    // api_keys.id — plain text (no FK) so gateway tables can stay in gateway.ts.
    apiKeyId: text("api_key_id"),
    /** Why this model was chosen (routing rule / auto mode explanation). */
    routingReason: text("routing_reason"),
    /** Model output body (assistant message). Null while pending or on failure. */
    output: text("output"),
    errorMessage: text("error_message"),
    requestId: text("request_id"),
    ...createdAtOnly,
  },
  (t) => [
    // Core index from docs/backend.md §4: (workspaceId, createdAt) on runs.
    index("runs_workspace_created_idx").on(t.workspaceId, t.createdAt),
    index("runs_prompt_version_id_idx").on(t.promptVersionId),
  ],
);

export const compareJobs = pgTable(
  "compare_jobs",
  {
    id: idColumn("cmp"),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    /** Null for ad-hoc compares that send raw content instead of a saved version. */
    promptVersionId: text("prompt_version_id").references(() => promptVersions.id, {
      onDelete: "cascade",
    }),
    /** Ad-hoc prompt content (when no promptVersionId). */
    content: text("content"),
    status: text("status")
      .$type<"queued" | "running" | "completed" | "failed">()
      .notNull()
      .default("queued"),
    models: text("models").array().notNull(),
    errorMessage: text("error_message"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    ...createdAtOnly,
  },
  (t) => [index("compare_jobs_workspace_id_idx").on(t.workspaceId)],
);

export const compareResults = pgTable(
  "compare_results",
  {
    id: idColumn("cmr"),
    compareJobId: text("compare_job_id")
      .notNull()
      .references(() => compareJobs.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    runId: text("run_id")
      .notNull()
      .references(() => runs.id, { onDelete: "cascade" }),
    /** Computed badges, e.g. { best: true, cheapest: false, fastest: false }. */
    rankHints: jsonb("rank_hints"),
    ...createdAtOnly,
  },
  (t) => [
    index("compare_results_job_id_idx").on(t.compareJobId),
    index("compare_results_workspace_id_idx").on(t.workspaceId),
  ],
);
