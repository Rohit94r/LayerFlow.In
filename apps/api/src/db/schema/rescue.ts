import { integer, jsonb, pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { idColumn, timestamps } from "./_helpers";
import { workspaces } from "./tenancy";
import { promptSessions } from "./sessions";
import { projects } from "./workspace";

/**
 * A rescue report: one pasted conversation (or prompt) processed by the
 * worker into a structured Continue Pack. All AI-derived fields are JSONB —
 * the shapes are defined once in @layerflow/contracts (rescue.ts).
 */
export const rescueReports = pgTable(
  "rescue_reports",
  {
    id: idColumn("resc"),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    sessionId: text("session_id").references(() => promptSessions.id, { onDelete: "set null" }),
    projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
    sourceTool: text("source_tool").notNull(),
    sourceModel: text("source_model").notNull().default("unknown"),
    status: text("status").notNull().default("queued"),
    errorMessage: text("error_message"),
    summary: text("summary").notNull().default(""),
    /** AI-extracted conversation summary (goal, decisions, constraints, next action — shape in @layerflow/contracts). */
    context: jsonb("context").notNull().default({}),
    improvedPrompt: text("improved_prompt").notNull().default(""),
    promptScore: integer("prompt_score"),
    promptScores: jsonb("prompt_scores").notNull().default([]),
    diff: jsonb("diff").notNull().default({}),
    costs: jsonb("costs").notNull().default([]),
    recommendedModelId: text("recommended_model_id").notNull().default(""),
    recommendedReason: text("recommended_reason").notNull().default(""),
    continuePack: jsonb("continue_pack").notNull().default([]),
    originalWords: integer("original_words").notNull().default(0),
    compressedWords: integer("compressed_words").notNull().default(0),
    compressionPercent: integer("compression_percent").notNull().default(0),
    saved: integer("saved").notNull().default(0),
    ...timestamps,
  },
  (t) => [
    index("rescue_reports_workspace_idx").on(t.workspaceId),
    index("rescue_reports_updated_idx").on(t.updatedAt),
  ],
);

export type RescueReportRow = typeof rescueReports.$inferSelect;
