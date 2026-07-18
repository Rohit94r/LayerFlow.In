import { index, integer, pgTable, text } from "drizzle-orm/pg-core";
import { createdAtOnly, idColumn, microDollars, timestamps } from "./_helpers";
import { prompts, promptVersions } from "./prompts";
import { domains, projects } from "./workspace";
import { workspaces } from "./tenancy";

/** A prompt session: an ordered conversation chain of prompts and outputs. */
export const promptSessions = pgTable(
  "prompt_sessions",
  {
    id: idColumn("sess"),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    domainId: text("domain_id").references(() => domains.id, { onDelete: "set null" }),
    projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    description: text("description"),
    status: text("status")
      .$type<"active" | "completed" | "paused">()
      .notNull()
      .default("active"),
    totalCostMicro: microDollars("total_cost_micro").notNull().default(0),
    totalTokens: integer("total_tokens").notNull().default(0),
    ...timestamps,
  },
  (t) => [index("prompt_sessions_workspace_id_idx").on(t.workspaceId)],
);

export const sessionMessages = pgTable(
  "session_messages",
  {
    id: idColumn("smsg"),
    sessionId: text("session_id")
      .notNull()
      .references(() => promptSessions.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    role: text("role").$type<"user" | "assistant" | "system">().notNull(),
    body: text("body").notNull(),
    promptId: text("prompt_id").references(() => prompts.id, { onDelete: "set null" }),
    promptVersionId: text("prompt_version_id").references(() => promptVersions.id, {
      onDelete: "set null",
    }),
    // runs.id — plain text (no FK) to avoid a circular import with runs.ts.
    runId: text("run_id"),
    /** Order within the session. */
    position: integer("position").notNull(),
    ...createdAtOnly,
  },
  (t) => [
    index("session_messages_session_id_idx").on(t.sessionId),
    index("session_messages_workspace_id_idx").on(t.workspaceId),
  ],
);
