import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createdAtOnly, idColumn, timestamps } from "./_helpers";
import { users } from "./auth";
import { promptVersions } from "./prompts";
import { workspaces } from "./tenancy";

// Learning content is platform-global (no workspace_id); submissions are tenant-owned.

export const learningPaths = pgTable("learning_paths", {
  id: idColumn("lp"),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  level: text("level").$type<"beginner" | "intermediate" | "advanced">().notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  published: boolean("published").notNull().default(false),
  ...timestamps,
});

export const lessons = pgTable(
  "lessons",
  {
    id: idColumn("les"),
    pathId: text("path_id")
      .notNull()
      .references(() => learningPaths.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (t) => [uniqueIndex("lessons_path_slug_uq").on(t.pathId, t.slug)],
);

export const challenges = pgTable(
  "challenges",
  {
    id: idColumn("chl"),
    lessonId: text("lesson_id").references(() => lessons.id, { onDelete: "cascade" }),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    instructions: text("instructions").notNull(),
    difficulty: text("difficulty").$type<"easy" | "medium" | "hard">().notNull(),
    ...timestamps,
  },
  (t) => [index("challenges_lesson_id_idx").on(t.lessonId)],
);

export const challengeSubmissions = pgTable(
  "challenge_submissions",
  {
    id: idColumn("chs"),
    challengeId: text("challenge_id")
      .notNull()
      .references(() => challenges.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    promptVersionId: text("prompt_version_id").references(() => promptVersions.id, {
      onDelete: "set null",
    }),
    body: text("body"),
    status: text("status")
      .$type<"submitted" | "passed" | "failed">()
      .notNull()
      .default("submitted"),
    /** 0-100. */
    score: integer("score"),
    feedback: jsonb("feedback"),
    ...createdAtOnly,
  },
  (t) => [
    index("challenge_submissions_workspace_id_idx").on(t.workspaceId),
    index("challenge_submissions_user_id_idx").on(t.userId),
  ],
);
