import { index, jsonb, pgTable, text, vector } from "drizzle-orm/pg-core";
import { createdAtOnly, idColumn, timestamps } from "./_helpers";
import { users } from "./auth";
import { workspaces } from "./tenancy";

/** AI Memory: distilled facts/snippets retrieved into future prompts. */
export const memories = pgTable(
  "memories",
  {
    id: idColumn("mem"),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    sourceType: text("source_type")
      .$type<"prompt" | "session" | "run" | "manual">()
      .notNull(),
    /** ID of the source entity (loose reference across types). */
    sourceId: text("source_id"),
    title: text("title").notNull(),
    body: text("body").notNull(),
    meta: jsonb("meta"),
    ...timestamps,
  },
  (t) => [index("memories_workspace_id_idx").on(t.workspaceId)],
);

export const memoryEmbeddings = pgTable(
  "memory_embeddings",
  {
    id: idColumn("memb"),
    memoryId: text("memory_id")
      .notNull()
      .references(() => memories.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    embedding: vector("embedding", { dimensions: 1536 }).notNull(),
    /** Embedding model used, e.g. "text-embedding-3-small". */
    model: text("model").notNull(),
    ...createdAtOnly,
  },
  (t) => [
    index("memory_embeddings_workspace_id_idx").on(t.workspaceId),
    index("memory_embeddings_embedding_idx").using("hnsw", t.embedding.op("vector_cosine_ops")),
  ],
);
