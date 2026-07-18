import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  vector,
} from "drizzle-orm/pg-core";
import { createdAtOnly, idColumn, microDollars, timestamps } from "./_helpers";
import { budgets } from "./cost";
import { projects } from "./workspace";
import { workspaces } from "./tenancy";

/** LayerFlow gateway keys ("lf_live_..."). Only the HMAC hash is stored. */
export const apiKeys = pgTable(
  "api_keys",
  {
    id: idColumn("key"),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** HMAC-SHA256 of the full secret — see services/crypto.ts. */
    keyHash: text("key_hash").notNull(),
    /** Display prefix shown in the UI, e.g. "lf_live_a1b2". */
    keyPrefix: text("key_prefix").notNull(),
    budgetId: text("budget_id").references(() => budgets.id, { onDelete: "set null" }),
    projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
    dailyRequestCap: integer("daily_request_cap"),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    // Core index from docs/backend.md §4: unique hash on api_keys.
    uniqueIndex("api_keys_key_hash_uq").on(t.keyHash),
    index("api_keys_workspace_id_idx").on(t.workspaceId),
  ],
);

/** BYOK provider keys. Ciphertext is AES-256-GCM; plaintext never persists. */
export const providerKeys = pgTable(
  "provider_keys",
  {
    id: idColumn("pk"),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    ciphertext: text("ciphertext").notNull(),
    /** Last 4 chars of the key, for display only. */
    keyHint: text("key_hint").notNull(),
    label: text("label"),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("provider_keys_workspace_id_idx").on(t.workspaceId)],
);

/** Request log for /v1/* traffic (sampled/truncated — never full secrets). */
export const gatewayLogs = pgTable(
  "gateway_logs",
  {
    id: idColumn("gwl"),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    apiKeyId: text("api_key_id").references(() => apiKeys.id, { onDelete: "set null" }),
    runId: text("run_id"),
    method: text("method").notNull(),
    path: text("path").notNull(),
    model: text("model"),
    statusCode: integer("status_code").notNull(),
    latencyMs: integer("latency_ms"),
    errorCode: text("error_code"),
    requestId: text("request_id"),
    ...createdAtOnly,
  },
  (t) => [index("gateway_logs_workspace_created_idx").on(t.workspaceId, t.createdAt)],
);

export const rateLimitPolicies = pgTable(
  "rate_limit_policies",
  {
    id: idColumn("rlp"),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    /** Null = workspace-wide default policy. */
    apiKeyId: text("api_key_id").references(() => apiKeys.id, { onDelete: "cascade" }),
    requestsPerMinute: integer("requests_per_minute").notNull(),
    tokensPerMinute: integer("tokens_per_minute"),
    enabled: boolean("enabled").notNull().default(true),
    ...timestamps,
  },
  (t) => [index("rate_limit_policies_workspace_id_idx").on(t.workspaceId)],
);

/** Exact + semantic response cache. Never shared across workspaces. */
export const cacheEntries = pgTable(
  "cache_entries",
  {
    id: idColumn("che"),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    cacheType: text("cache_type").$type<"exact" | "semantic">().notNull(),
    /** Hash of normalized model + messages + params. */
    keyHash: text("key_hash").notNull(),
    model: text("model").notNull(),
    responseBody: text("response_body").notNull(),
    /** Embedding for semantic lookups (null for exact entries). */
    embedding: vector("embedding", { dimensions: 1536 }),
    hits: integer("hits").notNull().default(0),
    savedMicro: microDollars("saved_micro").notNull().default(0),
    lastHitAt: timestamp("last_hit_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    ...createdAtOnly,
  },
  (t) => [
    uniqueIndex("cache_entries_workspace_key_uq").on(t.workspaceId, t.keyHash),
    index("cache_entries_embedding_idx").using("hnsw", t.embedding.op("vector_cosine_ops")),
  ],
);
