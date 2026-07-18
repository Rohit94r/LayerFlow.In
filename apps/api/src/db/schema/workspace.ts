import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { createdAtOnly, idColumn, timestamps } from "./_helpers";
import { users } from "./auth";
import { workspaces } from "./tenancy";

export const domains = pgTable(
  "domains",
  {
    id: idColumn("dom"),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    icon: text("icon"),
    color: text("color"),
    sortOrder: integer("sort_order").notNull().default(0),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("domains_workspace_slug_uq").on(t.workspaceId, t.slug),
    index("domains_workspace_id_idx").on(t.workspaceId),
  ],
);

export const projects = pgTable(
  "projects",
  {
    id: idColumn("proj"),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    domainId: text("domain_id")
      .notNull()
      .references(() => domains.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    status: text("status").$type<"active" | "archived">().notNull().default("active"),
    ...timestamps,
  },
  (t) => [
    index("projects_workspace_id_idx").on(t.workspaceId),
    index("projects_domain_id_idx").on(t.domainId),
  ],
);

export const folders = pgTable(
  "folders",
  {
    id: idColumn("fld"),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    parentFolderId: text("parent_folder_id").references((): AnyPgColumn => folders.id, {
      onDelete: "cascade",
    }),
    name: text("name").notNull(),
    ...timestamps,
  },
  (t) => [
    index("folders_workspace_id_idx").on(t.workspaceId),
    index("folders_project_id_idx").on(t.projectId),
  ],
);

export const activityEvents = pgTable(
  "activity_events",
  {
    id: idColumn("act"),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    meta: jsonb("meta"),
    ...createdAtOnly,
  },
  (t) => [index("activity_events_workspace_created_idx").on(t.workspaceId, t.createdAt)],
);
