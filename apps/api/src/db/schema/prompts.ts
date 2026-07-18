import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createdAtOnly, idColumn, microDollars, timestamps } from "./_helpers";
import { users } from "./auth";
import { files } from "./files";
import { domains, folders, projects } from "./workspace";
import { workspaces } from "./tenancy";

export const prompts = pgTable(
  "prompts",
  {
    id: idColumn("prm"),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    domainId: text("domain_id").references(() => domains.id, { onDelete: "set null" }),
    projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
    folderId: text("folder_id").references(() => folders.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    description: text("description"),
    notes: text("notes"),
    // Points at prompt_versions.id. Plain text (no FK) to avoid a circular
    // constraint between prompts and prompt_versions.
    currentVersionId: text("current_version_id"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("prompts_workspace_id_idx").on(t.workspaceId),
    index("prompts_project_id_idx").on(t.projectId),
    index("prompts_folder_id_idx").on(t.folderId),
  ],
);

/** Immutable prompt history. Edits always insert a new row; never update body. */
export const promptVersions = pgTable(
  "prompt_versions",
  {
    id: idColumn("pv"),
    promptId: text("prompt_id")
      .notNull()
      .references(() => prompts.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    body: text("body").notNull(),
    note: text("note"),
    /** Model the author had selected when saving, e.g. "gpt-4o". */
    modelHint: text("model_hint"),
    createdByUserId: text("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    ...createdAtOnly,
  },
  (t) => [
    uniqueIndex("prompt_versions_prompt_version_uq").on(t.promptId, t.version),
    index("prompt_versions_workspace_id_idx").on(t.workspaceId),
  ],
);

export const promptVariables = pgTable(
  "prompt_variables",
  {
    id: idColumn("pvar"),
    promptId: text("prompt_id")
      .notNull()
      .references(() => prompts.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    defaultValue: text("default_value"),
    description: text("description"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("prompt_variables_prompt_name_uq").on(t.promptId, t.name),
    index("prompt_variables_workspace_id_idx").on(t.workspaceId),
  ],
);

export const promptTags = pgTable(
  "prompt_tags",
  {
    id: idColumn("ptag"),
    promptId: text("prompt_id")
      .notNull()
      .references(() => prompts.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    tag: text("tag").notNull(),
    ...createdAtOnly,
  },
  (t) => [
    uniqueIndex("prompt_tags_prompt_tag_uq").on(t.promptId, t.tag),
    index("prompt_tags_workspace_tag_idx").on(t.workspaceId, t.tag),
  ],
);

export const promptAttachments = pgTable(
  "prompt_attachments",
  {
    id: idColumn("patt"),
    promptId: text("prompt_id")
      .notNull()
      .references(() => prompts.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    fileId: text("file_id")
      .notNull()
      .references(() => files.id, { onDelete: "cascade" }),
    ...createdAtOnly,
  },
  (t) => [
    index("prompt_attachments_prompt_id_idx").on(t.promptId),
    index("prompt_attachments_workspace_id_idx").on(t.workspaceId),
  ],
);

/** A stored model output for a prompt version (shown in the Timeline UI). */
export const promptOutputs = pgTable(
  "prompt_outputs",
  {
    id: idColumn("pout"),
    promptVersionId: text("prompt_version_id")
      .notNull()
      .references(() => promptVersions.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    // runs.id — plain text (no FK) to avoid a circular import with runs.ts.
    runId: text("run_id"),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    body: text("body").notNull(),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    costMicro: microDollars("cost_micro").notNull().default(0),
    ...createdAtOnly,
  },
  (t) => [
    index("prompt_outputs_version_id_idx").on(t.promptVersionId),
    index("prompt_outputs_workspace_id_idx").on(t.workspaceId),
  ],
);

export const favorites = pgTable(
  "favorites",
  {
    id: idColumn("fav"),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    promptId: text("prompt_id")
      .notNull()
      .references(() => prompts.id, { onDelete: "cascade" }),
    ...createdAtOnly,
  },
  (t) => [
    uniqueIndex("favorites_user_prompt_uq").on(t.userId, t.promptId),
    index("favorites_workspace_id_idx").on(t.workspaceId),
  ],
);