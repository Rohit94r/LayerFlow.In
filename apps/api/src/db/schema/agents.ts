import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createdAtOnly, idColumn, microDollars, timestamps } from "./_helpers";
import { users } from "./auth";
import { files } from "./files";
import { workspaces } from "./tenancy";

export type AgentMetricsJson = {
  jobsFound: number;
  jobsApplied: number;
  interviewsScheduled: number;
  pendingApprovals: number;
  responsesReceived: number;
  rejections: number;
  successScore: number;
};

export const emptyAgentMetrics: AgentMetricsJson = {
  jobsFound: 0,
  jobsApplied: 0,
  interviewsScheduled: 0,
  pendingApprovals: 0,
  responsesReceived: 0,
  rejections: 0,
  successScore: 0,
};

/**
 * Build-your-own agents. V2 agents are long-running AI workers with onboarding
 * state, scoped permissions, durable progress, memory, and approval gates.
 */
export const agents = pgTable(
  "ai_agents",
  {
    id: idColumn("ag"),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    role: text("role")
      .$type<
        | "implement"
        | "review"
        | "test"
        | "custom"
        | "job_apply"
        | "internship_hunter"
        | "linkedin_outreach"
        | "research"
        | "scholarship"
        | "startup_research"
        | "content_repurposing"
        | "meeting_followup"
      >()
      .notNull()
      .default("custom"),
    templateKey: text("template_key").$type<
      | "job_applying"
      | "internship_hunter"
      | "linkedin_outreach"
      | "research"
      | "scholarship_finder"
      | "startup_research"
      | "content_repurposing"
      | "meeting_followup"
      | null
    >(),
    goal: text("goal"),
    systemPrompt: text("system_prompt").notNull(),
    /** Model id from the registry; null -> cheapest usable model. */
    modelId: text("model_id"),
    temperature: doublePrecision("temperature"),
    status: text("status").$type<"active" | "paused">().notNull().default("active"),
    tools: text("tools").array().notNull().default([]),
    schedule: text("schedule"),
    /** Parsed schedule for repeatable runs (cron + IANA tz + enable flag). */
    scheduleCron: text("schedule_cron"),
    scheduleTz: text("schedule_tz"),
    schedulingEnabled: boolean("scheduling_enabled").notNull().default(false),
    expectedActivity: text("expected_activity"),
    estimatedUsage: text("estimated_usage"),
    onboarding: jsonb("onboarding").$type<Record<string, unknown>>().notNull().default({}),
    metrics: jsonb("metrics").$type<AgentMetricsJson>().notNull().default(emptyAgentMetrics),
    isDemo: boolean("is_demo").notNull().default(false),
    lastRunAt: timestamp("last_run_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("ai_agents_workspace_id_idx").on(t.workspaceId),
    index("ai_agents_template_key_idx").on(t.templateKey),
  ],
);

/** Reusable marketplace templates. Static app templates can be mirrored here. */
export const agentTemplates = pgTable(
  "agent_templates",
  {
    id: idColumn("agtpl"),
    key: text("key").notNull().unique(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    category: text("category").notNull(),
    permissions: jsonb("permissions").$type<Record<string, unknown>[]>().notNull().default([]),
    estimatedCost: text("estimated_cost").notNull(),
    expectedOutcome: text("expected_outcome").notNull(),
    defaultSchedule: text("default_schedule").notNull(),
    ...timestamps,
  },
  (t) => [index("agent_templates_key_idx").on(t.key)],
);

/** One agent run: queued -> running -> succeeded/failed. */
export const agentRuns = pgTable(
  "ai_agent_runs",
  {
    id: idColumn("agr"),
    agentId: text("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    input: text("input").notNull(),
    output: text("output"),
    status: text("status")
      .$type<"queued" | "running" | "succeeded" | "failed">()
      .notNull()
      .default("queued"),
    errorMessage: text("error_message"),
    provider: text("provider"),
    model: text("model"),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    costMicro: microDollars("cost_micro").notNull().default(0),
    runLatencyMs: integer("run_latency_ms"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("ai_agent_runs_agent_id_idx").on(t.agentId),
    index("ai_agent_runs_workspace_id_idx").on(t.workspaceId),
    index("ai_agent_runs_status_idx").on(t.status),
  ],
);

/** Chronological progress events, suitable for polling or SSE replay. */
export const agentSteps = pgTable(
  "agent_steps",
  {
    id: idColumn("astep"),
    agentId: text("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    runId: text("run_id").references(() => agentRuns.id, { onDelete: "set null" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    status: text("status")
      .$type<"queued" | "running" | "waiting" | "completed" | "failed">()
      .notNull()
      .default("completed"),
    severity: text("severity")
      .$type<"info" | "success" | "warning" | "danger">()
      .notNull()
      .default("info"),
    data: jsonb("data").$type<Record<string, unknown>>().notNull().default({}),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    ...createdAtOnly,
  },
  (t) => [
    index("agent_steps_agent_time_idx").on(t.agentId, t.occurredAt),
    index("agent_steps_workspace_idx").on(t.workspaceId),
  ],
);

/** Explicit action permissions granted per agent. */
export const agentPermissions = pgTable(
  "agent_permissions",
  {
    id: idColumn("aperm"),
    agentId: text("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    label: text("label").notNull(),
    description: text("description"),
    category: text("category"),
    mode: text("mode")
      .$type<"allow_once" | "allow_always" | "deny">()
      .notNull()
      .default("deny"),
    grantedByUserId: text("granted_by_user_id").references(() => users.id, { onDelete: "set null" }),
    grantedAt: timestamp("granted_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("agent_permissions_agent_key_uq").on(t.agentId, t.key),
    index("agent_permissions_workspace_idx").on(t.workspaceId),
  ],
);

/** Durable memory scoped to one agent. */
export const agentMemories = pgTable(
  "agent_memories",
  {
    id: idColumn("amem"),
    agentId: text("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    data: jsonb("data").$type<Record<string, unknown>>().notNull().default({}),
    importance: integer("importance").notNull().default(3),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("agent_memories_agent_idx").on(t.agentId),
    index("agent_memories_workspace_idx").on(t.workspaceId),
  ],
);

/** Agent-owned documents. File bytes remain in encrypted file storage/R2. */
export const agentDocuments = pgTable(
  "agent_documents",
  {
    id: idColumn("adoc"),
    agentId: text("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    fileId: text("file_id").references(() => files.id, { onDelete: "set null" }),
    documentType: text("document_type")
      .$type<"resume" | "cover_letter" | "portfolio" | "certificate" | "other">()
      .notNull(),
    title: text("title").notNull(),
    fileName: text("file_name"),
    mimeType: text("mime_type"),
    status: text("status").$type<"uploaded" | "parsed" | "failed">().notNull().default("uploaded"),
    encrypted: boolean("encrypted").notNull().default(true),
    extraction: jsonb("extraction").$type<Record<string, unknown>>().notNull().default({}),
    ...timestamps,
  },
  (t) => [
    index("agent_documents_agent_idx").on(t.agentId),
    index("agent_documents_workspace_idx").on(t.workspaceId),
  ],
);

/** Human-in-the-loop approvals for high-risk actions. */
export const agentApprovals = pgTable(
  "agent_approvals",
  {
    id: idColumn("appr"),
    agentId: text("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    runId: text("run_id").references(() => agentRuns.id, { onDelete: "set null" }),
    targetType: text("target_type").notNull(),
    targetId: text("target_id"),
    title: text("title").notNull(),
    description: text("description"),
    riskLevel: text("risk_level").$type<"low" | "medium" | "high">().notNull().default("medium"),
    status: text("status")
      .$type<"pending" | "approved" | "rejected" | "edited">()
      .notNull()
      .default("pending"),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    decisionNote: text("decision_note"),
    decidedByUserId: text("decided_by_user_id").references(() => users.id, { onDelete: "set null" }),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("agent_approvals_agent_status_idx").on(t.agentId, t.status),
    index("agent_approvals_workspace_idx").on(t.workspaceId),
  ],
);

export const applicationRecords = pgTable(
  "application_records",
  {
    id: idColumn("apprec"),
    agentId: text("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    approvalId: text("approval_id").references(() => agentApprovals.id, { onDelete: "set null" }),
    company: text("company").notNull(),
    roleTitle: text("role_title").notNull(),
    location: text("location"),
    jobUrl: text("job_url"),
    source: text("source"),
    status: text("status")
      .$type<
        | "discovered"
        | "matched"
        | "needs_approval"
        | "submitted"
        | "interview"
        | "rejected"
        | "withdrawn"
      >()
      .notNull()
      .default("discovered"),
    resumeScore: integer("resume_score"),
    coverLetter: text("cover_letter"),
    ...timestamps,
  },
  (t) => [
    index("application_records_agent_idx").on(t.agentId),
    index("application_records_workspace_status_idx").on(t.workspaceId, t.status),
  ],
);

export const interviewRecords = pgTable(
  "interview_records",
  {
    id: idColumn("intv"),
    agentId: text("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    applicationId: text("application_id").references(() => applicationRecords.id, { onDelete: "set null" }),
    company: text("company").notNull(),
    roleTitle: text("role_title").notNull(),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    timeZone: text("time_zone"),
    format: text("format"),
    status: text("status").$type<"scheduled" | "completed" | "cancelled">().notNull().default("scheduled"),
    feedback: text("feedback"),
    ...timestamps,
  },
  (t) => [
    index("interview_records_agent_idx").on(t.agentId),
    index("interview_records_workspace_idx").on(t.workspaceId),
  ],
);

export const recruiterContacts = pgTable(
  "recruiter_contacts",
  {
    id: idColumn("rec"),
    agentId: text("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    company: text("company").notNull(),
    name: text("name"),
    email: text("email"),
    linkedinUrl: text("linkedin_url"),
    relationshipStage: text("relationship_stage"),
    lastContactAt: timestamp("last_contact_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("recruiter_contacts_agent_idx").on(t.agentId),
    index("recruiter_contacts_workspace_idx").on(t.workspaceId),
  ],
);

export const agentNotifications = pgTable(
  "agent_notifications",
  {
    id: idColumn("anot"),
    agentId: text("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    status: text("status").$type<"unread" | "read" | "dismissed">().notNull().default("unread"),
    data: jsonb("data").$type<Record<string, unknown>>().notNull().default({}),
    ...timestamps,
  },
  (t) => [
    index("agent_notifications_agent_idx").on(t.agentId),
    index("agent_notifications_workspace_status_idx").on(t.workspaceId, t.status),
  ],
);

export type AgentRow = typeof agents.$inferSelect;
export type AgentRunRow = typeof agentRuns.$inferSelect;
export type AgentStepRow = typeof agentSteps.$inferSelect;
export type AgentPermissionRow = typeof agentPermissions.$inferSelect;
export type AgentApprovalRow = typeof agentApprovals.$inferSelect;
export type AgentMemoryRow = typeof agentMemories.$inferSelect;
export type AgentDocumentRow = typeof agentDocuments.$inferSelect;
export type ApplicationRecordRow = typeof applicationRecords.$inferSelect;
