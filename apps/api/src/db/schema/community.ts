import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createdAtOnly, idColumn, timestamps } from "./_helpers";
import { users } from "./auth";
import { prompts } from "./prompts";
import { workspaces } from "./tenancy";

/** Public community profile (opt-in), separate from the auth user record. */
export const profiles = pgTable("profiles", {
  id: idColumn("prof"),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  handle: text("handle").notNull().unique(),
  displayName: text("display_name").notNull(),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  ...timestamps,
});

export const collections = pgTable(
  "collections",
  {
    id: idColumn("col"),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    ownerUserId: text("owner_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    visibility: text("visibility")
      .$type<"private" | "unlisted" | "public">()
      .notNull()
      .default("private"),
    ...timestamps,
  },
  (t) => [index("collections_workspace_id_idx").on(t.workspaceId)],
);

export const collectionItems = pgTable(
  "collection_items",
  {
    id: idColumn("coli"),
    collectionId: text("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    promptId: text("prompt_id")
      .notNull()
      .references(() => prompts.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
    ...createdAtOnly,
  },
  (t) => [uniqueIndex("collection_items_collection_prompt_uq").on(t.collectionId, t.promptId)],
);

export const follows = pgTable(
  "follows",
  {
    id: idColumn("fol"),
    followerUserId: text("follower_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    followedUserId: text("followed_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ...createdAtOnly,
  },
  (t) => [
    uniqueIndex("follows_follower_followed_uq").on(t.followerUserId, t.followedUserId),
    index("follows_followed_user_id_idx").on(t.followedUserId),
  ],
);

export const likes = pgTable(
  "likes",
  {
    id: idColumn("like"),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    subjectType: text("subject_type").$type<"prompt" | "collection" | "comment">().notNull(),
    subjectId: text("subject_id").notNull(),
    ...createdAtOnly,
  },
  (t) => [
    uniqueIndex("likes_user_subject_uq").on(t.userId, t.subjectType, t.subjectId),
    index("likes_subject_idx").on(t.subjectType, t.subjectId),
  ],
);

export const comments = pgTable(
  "comments",
  {
    id: idColumn("cmt"),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    subjectType: text("subject_type").$type<"prompt" | "collection">().notNull(),
    subjectId: text("subject_id").notNull(),
    body: text("body").notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("comments_subject_idx").on(t.subjectType, t.subjectId)],
);

/** Records "clone to my workspace" so authors get attribution. */
export const promptClones = pgTable(
  "prompt_clones",
  {
    id: idColumn("pcl"),
    sourcePromptId: text("source_prompt_id")
      .notNull()
      .references(() => prompts.id, { onDelete: "cascade" }),
    clonedPromptId: text("cloned_prompt_id")
      .notNull()
      .references(() => prompts.id, { onDelete: "cascade" }),
    clonedByUserId: text("cloned_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    ...createdAtOnly,
  },
  (t) => [index("prompt_clones_workspace_id_idx").on(t.workspaceId)],
);

export const notifications = pgTable(
  "notifications",
  {
    id: idColumn("ntf"),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    data: jsonb("data"),
    readAt: timestamp("read_at", { withTimezone: true }),
    ...createdAtOnly,
  },
  (t) => [index("notifications_user_id_idx").on(t.userId)],
);
