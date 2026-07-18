import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createdAtOnly, idColumn, microDollars, timestamps } from "./_helpers";
import { promptVersions } from "./prompts";
import { workspaces } from "./tenancy";

export const promptAnalyses = pgTable(
  "prompt_analyses",
  {
    id: idColumn("pan"),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    promptVersionId: text("prompt_version_id")
      .notNull()
      .references(() => promptVersions.id, { onDelete: "cascade" }),
    taskType: text("task_type").notNull(),
    complexity: text("complexity").$type<"low" | "medium" | "high">().notNull(),
    estimatedInputTokens: integer("estimated_input_tokens").notNull(),
    estimatedOutputTokens: integer("estimated_output_tokens").notNull(),
    estimatedCostMicro: microDollars("estimated_cost_micro").notNull(),
    /** Full analysis payload (why-bullets, signals, classifier output). */
    details: jsonb("details"),
    ...createdAtOnly,
  },
  (t) => [
    index("prompt_analyses_workspace_id_idx").on(t.workspaceId),
    index("prompt_analyses_version_id_idx").on(t.promptVersionId),
  ],
);

export const modelRecommendations = pgTable(
  "model_recommendations",
  {
    id: idColumn("rec"),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    promptVersionId: text("prompt_version_id").references(() => promptVersions.id, {
      onDelete: "cascade",
    }),
    recommendedModel: text("recommended_model").notNull(),
    alternativeModel: text("alternative_model"),
    /** Required explanation — Auto Mode never picks silently. */
    reason: text("reason").notNull(),
    source: text("source").$type<"heuristic" | "llm" | "rule">().notNull(),
    accepted: boolean("accepted"),
    ...createdAtOnly,
  },
  (t) => [index("model_recommendations_workspace_id_idx").on(t.workspaceId)],
);

export const routingRules = pgTable(
  "routing_rules",
  {
    id: idColumn("rule"),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    /** Human-readable condition, e.g. "Coding tasks". */
    condition: text("condition").notNull(),
    /** Structured condition for the router (task type, budget, token count...). */
    conditionConfig: jsonb("condition_config"),
    targetModel: text("target_model").notNull(),
    priority: integer("priority").notNull().default(0),
    enabled: boolean("enabled").notNull().default(true),
    ...timestamps,
  },
  (t) => [index("routing_rules_workspace_id_idx").on(t.workspaceId)],
);

export const workspaceSettings = pgTable(
  "workspace_settings",
  {
    id: idColumn("wset"),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    executionMode: text("execution_mode")
      .$type<"manual" | "suggest" | "auto-cheapest" | "auto-fastest" | "auto-best" | "auto-balanced">()
      .notNull()
      .default("suggest"),
    preferCheap: boolean("prefer_cheap").notNull().default(false),
    defaultModel: text("default_model").notNull().default("gpt-4o-mini"),
    ...timestamps,
  },
  (t) => [uniqueIndex("workspace_settings_workspace_id_uq").on(t.workspaceId)],
);

/**
 * Versioned pricing with effective dates, so historical runs keep the price
 * that was true when they happened. Seeded from @layerflow/model-registry.
 */
export const modelPricing = pgTable(
  "model_pricing",
  {
    id: idColumn("mp"),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull(),
    inputPricePerMTokMicro: microDollars("input_price_per_mtok_micro").notNull(),
    outputPricePerMTokMicro: microDollars("output_price_per_mtok_micro").notNull(),
    cachedInputPricePerMTokMicro: microDollars("cached_input_price_per_mtok_micro"),
    contextWindow: integer("context_window"),
    capabilities: jsonb("capabilities"),
    ...createdAtOnly,
  },
  (t) => [uniqueIndex("model_pricing_provider_model_from_uq").on(t.provider, t.model, t.effectiveFrom)],
);

/** Aggregated per-workspace model performance, learned from real runs. */
export const modelPerformance = pgTable(
  "model_performance",
  {
    id: idColumn("perf"),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    model: text("model").notNull(),
    taskType: text("task_type").notNull().default("general"),
    sampleCount: integer("sample_count").notNull().default(0),
    avgLatencyMs: integer("avg_latency_ms"),
    avgCostMicro: microDollars("avg_cost_micro"),
    /** 0-100 from compare wins / user overrides. */
    qualityScore: integer("quality_score"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("model_performance_ws_model_task_uq").on(t.workspaceId, t.model, t.taskType),
  ],
);

export const savingsInsights = pgTable(
  "savings_insights",
  {
    id: idColumn("sav"),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    /** Period key, e.g. "2026-07". */
    period: text("period").notNull(),
    actualCostMicro: microDollars("actual_cost_micro").notNull(),
    optimizedCostMicro: microDollars("optimized_cost_micro").notNull(),
    savedMicro: microDollars("saved_micro").notNull().default(0),
    details: jsonb("details"),
    ...timestamps,
  },
  (t) => [uniqueIndex("savings_insights_workspace_period_uq").on(t.workspaceId, t.period)],
);
