import { and, desc, eq, sql } from "drizzle-orm";
import type {
  AgentMetrics,
  AgentPermissionDefinition,
  AgentSchedule,
  AgentTemplate,
  SetAgentScheduleRequest,
  UploadAgentResumeRequest,
} from "@layerflow/contracts";
import { db } from "../../db/client";
import {
  agentApprovals,
  agentDocuments,
  agentMemories,
  agentPermissions,
  agentRuns,
  agents,
  agentSteps,
  applicationRecords,
  emptyAgentMetrics,
  type AgentApprovalRow,
  type AgentDocumentRow,
  type AgentMemoryRow,
  type AgentMetricsJson,
  type AgentRow,
  type AgentStepRow,
  type ApplicationRecordRow,
} from "../../db/schema/agents";
import { enqueue, syncAgentSchedule } from "../../jobs/queues";
import { AppError } from "../../middleware/app-error";
import { recordActivity } from "../workspace/activity";

/**
 * Agents — V2 CRUD + durable orchestration support. The full execution engine
 * still lives in jobs/processors/agent.ts; this service owns persistence,
 * marketplace metadata, progress projections, approvals, and document links.
 */

export const AGENT_MARKETPLACE_TEMPLATES: AgentTemplate[] = [
  {
    key: "job_applying",
    name: "Job Applying Agent",
    description: "Finds matching roles, scores fit, prepares applications, and pauses before every submission.",
    category: "Career",
    estimatedCost: "$3-$12 per active search week",
    expectedOutcome: "A tracked pipeline of matching jobs, approval-ready applications, and follow-ups.",
    defaultSchedule: "Weekdays at 09:00, 13:00, and 18:00 in your time zone",
    permissions: [
      {
        key: "browse_jobs",
        label: "Browse job websites",
        description: "Search public listings and open external job pages.",
        category: "Discovery",
        mode: "allow_always",
      },
      {
        key: "open_external_pages",
        label: "Open external pages",
        description: "Visit job posts and company career pages inside safe browser boundaries.",
        category: "Discovery",
        mode: "allow_always",
      },
      {
        key: "upload_resume",
        label: "Upload resume",
        description: "Attach your selected resume to applications after approval.",
        category: "Documents",
        mode: "allow_once",
      },
      {
        key: "submit_applications",
        label: "Submit applications",
        description: "Never runs silently; each application requires human approval.",
        category: "High risk",
        mode: "deny",
      },
      {
        key: "generate_cover_letters",
        label: "Generate cover letters",
        description: "Draft tailored cover letters from your resume and the job description.",
        category: "Writing",
        mode: "allow_always",
      },
      {
        key: "send_follow_up_emails",
        label: "Send follow-up emails",
        description: "Prepare follow-ups and request approval before sending.",
        category: "Communication",
        mode: "deny",
      },
      {
        key: "store_job_history",
        label: "Store job history",
        description: "Remember applications, recruiter replies, and rejected companies.",
        category: "Memory",
        mode: "allow_always",
      },
    ],
  },
  {
    key: "internship_hunter",
    name: "Internship Hunter",
    description: "Tracks internship openings, deadlines, eligibility, and shortlists the best fits.",
    category: "Career",
    estimatedCost: "$2-$8 per active search week",
    expectedOutcome: "A deadline-aware internship shortlist with applications ready for approval.",
    defaultSchedule: "Daily at 10:00",
    permissions: [
      { key: "browse_jobs", label: "Browse internship boards", category: "Discovery", mode: "allow_always" },
      { key: "store_job_history", label: "Store internship history", category: "Memory", mode: "allow_always" },
      { key: "submit_applications", label: "Submit applications", category: "High risk", mode: "deny" },
    ],
  },
  {
    key: "linkedin_outreach",
    name: "LinkedIn Outreach Agent",
    description: "Researches people, drafts personal outreach, and queues messages for approval.",
    category: "Growth",
    estimatedCost: "$4-$15 per campaign week",
    expectedOutcome: "A warm outreach queue with context, drafts, and follow-up reminders.",
    defaultSchedule: "Weekdays at 11:00",
    permissions: [
      { key: "open_external_pages", label: "Open LinkedIn/company pages", category: "Research", mode: "allow_once" },
      { key: "send_follow_up_emails", label: "Send outreach", category: "High risk", mode: "deny" },
      { key: "store_job_history", label: "Store relationship notes", category: "Memory", mode: "allow_always" },
    ],
  },
  {
    key: "research",
    name: "Research Agent",
    description: "Collects sources, summarizes findings, and keeps a living research brief up to date.",
    category: "Research",
    estimatedCost: "$1-$6 per research loop",
    expectedOutcome: "A cited research memo with open questions and next actions.",
    defaultSchedule: "On demand",
    permissions: [
      { key: "open_external_pages", label: "Open source pages", category: "Research", mode: "allow_once" },
      { key: "store_job_history", label: "Store research memory", category: "Memory", mode: "allow_always" },
    ],
  },
  {
    key: "scholarship_finder",
    name: "Scholarship Finder",
    description: "Finds scholarships, checks eligibility, tracks deadlines, and prepares drafts.",
    category: "Education",
    estimatedCost: "$2-$10 per active week",
    expectedOutcome: "An eligibility-ranked scholarship pipeline with upcoming deadlines.",
    defaultSchedule: "Daily at 08:30",
    permissions: [
      { key: "open_external_pages", label: "Open scholarship pages", category: "Discovery", mode: "allow_always" },
      { key: "upload_resume", label: "Upload documents", category: "Documents", mode: "allow_once" },
      { key: "submit_applications", label: "Submit applications", category: "High risk", mode: "deny" },
    ],
  },
  {
    key: "startup_research",
    name: "Startup Research Agent",
    description: "Builds company maps, founder notes, market signals, and opportunity briefs.",
    category: "Research",
    estimatedCost: "$3-$12 per scan",
    expectedOutcome: "A ranked startup list with funding, hiring, and outreach signals.",
    defaultSchedule: "Twice weekly",
    permissions: [
      { key: "open_external_pages", label: "Open company pages", category: "Research", mode: "allow_always" },
      { key: "store_job_history", label: "Store company memory", category: "Memory", mode: "allow_always" },
    ],
  },
  {
    key: "content_repurposing",
    name: "Content Repurposing Agent",
    description: "Turns long-form ideas into posts, threads, newsletters, and scheduled drafts.",
    category: "Content",
    estimatedCost: "$1-$5 per content batch",
    expectedOutcome: "A reviewable content queue with channel-specific variants.",
    defaultSchedule: "On demand",
    permissions: [
      { key: "generate_cover_letters", label: "Generate drafts", category: "Writing", mode: "allow_always" },
      { key: "send_follow_up_emails", label: "Publish/send content", category: "High risk", mode: "deny" },
    ],
  },
  {
    key: "meeting_followup",
    name: "Meeting Follow-up Agent",
    description: "Summarizes meetings, extracts commitments, drafts follow-ups, and tracks owners.",
    category: "Operations",
    estimatedCost: "$1-$4 per meeting",
    expectedOutcome: "A clean action ledger with drafts and reminders.",
    defaultSchedule: "After each uploaded meeting note",
    permissions: [
      { key: "store_job_history", label: "Store meeting memory", category: "Memory", mode: "allow_always" },
      { key: "send_follow_up_emails", label: "Send follow-ups", category: "High risk", mode: "deny" },
    ],
  },
  {
    key: "content_repurposing",
    name: "Content Repurposing Agent",
    description: "Turns long-form ideas into posts, threads, newsletters, and scheduled drafts.",
    category: "Content",
    estimatedCost: "$1-$5 per content batch",
    expectedOutcome: "A reviewable content queue with channel-specific variants.",
    defaultSchedule: "On demand",
    permissions: [
      { key: "generate_cover_letters", label: "Generate drafts", category: "Writing", mode: "allow_always" },
      { key: "send_follow_up_emails", label: "Publish/send content", category: "High risk", mode: "deny" },
    ],
  },
  {
    key: "meeting_followup",
    name: "Meeting Follow-up Agent",
    description: "Summarizes meetings, extracts commitments, drafts follow-ups, and tracks owners.",
    category: "Operations",
    estimatedCost: "$1-$4 per meeting",
    expectedOutcome: "A clean action ledger with drafts and reminders.",
    defaultSchedule: "After each uploaded meeting note",
    permissions: [
      { key: "store_job_history", label: "Store meeting memory", category: "Memory", mode: "allow_always" },
      { key: "send_follow_up_emails", label: "Send follow-ups", category: "High risk", mode: "deny" },
    ],
  },
  {
    key: "teacher_assistant",
    name: "Teacher Assistant Agent",
    description: "Helps teachers grade assignments, track student progress, and prepare lesson plans.",
    category: "Education",
    estimatedCost: "$2-$8 per week",
    expectedOutcome: "Organized gradebooks, progress reports, and lesson plan drafts ready for review.",
    defaultSchedule: "Weekdays at 07:00 and 16:00",
    permissions: [
      { key: "store_job_history", label: "Store student progress", category: "Memory", mode: "allow_always" },
      { key: "generate_cover_letters", label: "Generate lesson drafts", category: "Writing", mode: "allow_always" },
      { key: "open_external_pages", label: "Open curriculum resources", category: "Research", mode: "allow_once" },
      { key: "send_follow_up_emails", label: "Send parent emails", category: "High risk", mode: "deny" },
    ],
  },
  {
    key: "student_study",
    name: "Student Study Agent",
    description: "Creates study plans, flashcards, practice quizzes, and tracks exam deadlines.",
    category: "Education",
    estimatedCost: "$1-$5 per week",
    expectedOutcome: "A personalized study schedule with active recall materials and deadline reminders.",
    defaultSchedule: "Daily at 08:00",
    permissions: [
      { key: "store_job_history", label: "Store study progress", category: "Memory", mode: "allow_always" },
      { key: "generate_cover_letters", label: "Generate study materials", category: "Writing", mode: "allow_always" },
      { key: "open_external_pages", label: "Open research sources", category: "Research", mode: "allow_once" },
    ],
  },
  {
    key: "freelancer_pipeline",
    name: "Freelancer Pipeline Agent",
    description: "Finds freelance gigs, tracks proposals, manages client relationships, and follows up.",
    category: "Career",
    estimatedCost: "$3-$10 per week",
    expectedOutcome: "A pipeline of freelance opportunities with proposal drafts and follow-up reminders.",
    defaultSchedule: "Weekdays at 09:00 and 15:00",
    permissions: [
      { key: "browse_jobs", label: "Browse freelance platforms", category: "Discovery", mode: "allow_always" },
      { key: "open_external_pages", label: "Open gig listings", category: "Discovery", mode: "allow_always" },
      { key: "generate_cover_letters", label: "Generate proposals", category: "Writing", mode: "allow_always" },
      { key: "submit_applications", label: "Submit proposals", category: "High risk", mode: "deny" },
      { key: "send_follow_up_emails", label: "Send follow-ups", category: "Communication", mode: "deny" },
      { key: "store_job_history", label: "Store client history", category: "Memory", mode: "allow_always" },
    ],
  },
  {
    key: "research_paper",
    name: "Research Paper Agent",
    description: "Collects academic sources, summarizes papers, tracks citations, and drafts literature reviews.",
    category: "Research",
    estimatedCost: "$2-$8 per research session",
    expectedOutcome: "A cited literature review with source summaries and research gap analysis.",
    defaultSchedule: "On demand",
    permissions: [
      { key: "open_external_pages", label: "Open academic papers", category: "Research", mode: "allow_always" },
      { key: "generate_cover_letters", label: "Generate summaries", category: "Writing", mode: "allow_always" },
      { key: "store_job_history", label: "Store citation memory", category: "Memory", mode: "allow_always" },
    ],
  },
  {
    key: "sales_outreach",
    name: "Sales Outreach Agent",
    description: "Researches prospects, personalizes outreach, tracks responses, and manages follow-ups.",
    category: "Growth",
    estimatedCost: "$4-$12 per campaign week",
    expectedOutcome: "A qualified prospect list with personalized outreach drafts and response tracking.",
    defaultSchedule: "Weekdays at 10:00",
    permissions: [
      { key: "open_external_pages", label: "Research prospects", category: "Discovery", mode: "allow_always" },
      { key: "generate_cover_letters", label: "Personalize outreach", category: "Writing", mode: "allow_always" },
      { key: "send_follow_up_emails", label: "Send outreach emails", category: "High risk", mode: "deny" },
      { key: "store_job_history", label: "Store prospect memory", category: "Memory", mode: "allow_always" },
    ],
  },
];

function normalizeMetrics(input?: Partial<AgentMetrics> | null): AgentMetricsJson {
  return { ...emptyAgentMetrics, ...(input ?? {}) };
}

function asJsonObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export async function listAgentTemplates(): Promise<AgentTemplate[]> {
  return AGENT_MARKETPLACE_TEMPLATES;
}

export async function listAgents(
  workspaceId: string,
  opts: { limit?: number; offset?: number } = {},
): Promise<AgentRow[]> {
  return db.query.agents.findMany({
    where: eq(agents.workspaceId, workspaceId),
    orderBy: [desc(agents.createdAt)],
    limit: opts.limit,
    offset: opts.offset,
  });
}

export async function getAgent(workspaceId: string, id: string): Promise<AgentRow | null> {
  const row = await db.query.agents.findFirst({
    where: and(eq(agents.id, id), eq(agents.workspaceId, workspaceId)),
  });
  return row ?? null;
}

export async function createAgent(
  workspaceId: string,
  input: {
    userId?: string;
    name: string;
    role: string;
    templateKey?: string | null;
    goal?: string | null;
    systemPrompt: string;
    modelId?: string | null;
    temperature?: number | null;
    tools?: string[];
    schedule?: string | null;
    scheduleCron?: string | null;
    scheduleTz?: string | null;
    schedulingEnabled?: boolean;
    expectedActivity?: string | null;
    estimatedUsage?: string | null;
    onboarding?: Record<string, unknown>;
    metrics?: Partial<AgentMetrics>;
    permissions?: AgentPermissionDefinition[];
  },
): Promise<AgentRow> {
  const [agent] = await db
    .insert(agents)
    .values({
      workspaceId,
      name: input.name,
      role: input.role as AgentRow["role"],
      templateKey: (input.templateKey ?? null) as AgentRow["templateKey"],
      goal: input.goal ?? null,
      systemPrompt: input.systemPrompt,
      modelId: input.modelId ?? null,
      temperature: input.temperature ?? null,
      tools: input.tools ?? [],
      schedule: input.schedule ?? null,
      scheduleCron: input.scheduleCron ?? null,
      scheduleTz: input.scheduleTz ?? null,
      schedulingEnabled: input.schedulingEnabled ?? false,
      expectedActivity: input.expectedActivity ?? null,
      estimatedUsage: input.estimatedUsage ?? null,
      onboarding: input.onboarding ?? {},
      metrics: normalizeMetrics(input.metrics),
    })
    .returning();

  if (input.permissions?.length) {
    await db.insert(agentPermissions).values(
      input.permissions.map((permission) => ({
        agentId: agent.id,
        workspaceId,
        key: permission.key,
        label: permission.label,
        description: permission.description ?? null,
        category: permission.category ?? null,
        mode: permission.mode,
        grantedByUserId: permission.mode === "deny" ? null : input.userId ?? null,
        grantedAt: permission.mode === "deny" ? null : new Date(),
      })),
    );
  }

  if (agent.templateKey === "job_applying") {
    await db.insert(agentMemories).values({
      agentId: agent.id,
      workspaceId,
      kind: "instruction",
      title: "Initial hiring brief",
      body: input.goal ?? "Find relevant job opportunities and pause before applications.",
      data: input.onboarding ?? {},
      importance: 5,
    });
  }

  await recordActivity({
    workspaceId,
    userId: input.userId,
    type: "agent.created",
    title: `Created agent "${input.name}"`,
    meta: { agentId: agent.id, role: agent.role, templateKey: agent.templateKey },
  });

  return agent;
}

export async function updateAgent(
  workspaceId: string,
  id: string,
  input: Partial<{
    name: string;
    role: string;
    templateKey: string | null;
    goal: string | null;
    systemPrompt: string;
    modelId: string | null;
    temperature: number | null;
    tools: string[];
    schedule: string | null;
    scheduleCron: string | null;
    scheduleTz: string | null;
    schedulingEnabled: boolean;
    expectedActivity: string | null;
    estimatedUsage: string | null;
    onboarding: Record<string, unknown>;
    metrics: Partial<AgentMetrics>;
    status: "active" | "paused";
  }>,
): Promise<AgentRow | null> {
  const patch: Partial<typeof agents.$inferInsert> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.role !== undefined) patch.role = input.role as AgentRow["role"];
  if (input.templateKey !== undefined) patch.templateKey = input.templateKey as AgentRow["templateKey"];
  if (input.goal !== undefined) patch.goal = input.goal;
  if (input.systemPrompt !== undefined) patch.systemPrompt = input.systemPrompt;
  if (input.modelId !== undefined) patch.modelId = input.modelId;
  if (input.temperature !== undefined) patch.temperature = input.temperature;
  if (input.tools !== undefined) patch.tools = input.tools;
  if (input.schedule !== undefined) patch.schedule = input.schedule;
  if (input.scheduleCron !== undefined) patch.scheduleCron = input.scheduleCron;
  if (input.scheduleTz !== undefined) patch.scheduleTz = input.scheduleTz;
  if (input.schedulingEnabled !== undefined) patch.schedulingEnabled = input.schedulingEnabled;
  if (input.expectedActivity !== undefined) patch.expectedActivity = input.expectedActivity;
  if (input.estimatedUsage !== undefined) patch.estimatedUsage = input.estimatedUsage;
  if (input.onboarding !== undefined) patch.onboarding = input.onboarding;
  if (input.metrics !== undefined) patch.metrics = normalizeMetrics(input.metrics);
  if (input.status !== undefined) patch.status = input.status;

  const rows = await db
    .update(agents)
    .set(patch)
    .where(and(eq(agents.id, id), eq(agents.workspaceId, workspaceId)))
    .returning();
  const updated = rows[0] ?? null;
  // Keep the BullMQ scheduler in sync when the schedule/env flag changes.
  if (updated && (input.scheduleCron !== undefined || input.scheduleTz !== undefined || input.schedulingEnabled !== undefined)) {
    await syncAgentSchedule(updated, patch.schedulingEnabled);
  }
  return updated;
}

export async function deleteAgent(workspaceId: string, id: string): Promise<boolean> {
  const rows = await db
    .delete(agents)
    .where(and(eq(agents.id, id), eq(agents.workspaceId, workspaceId)))
    .returning({ id: agents.id });
  return rows.length > 0;
}

/** Run usage summary per agent (count, total cost, last run status). */
export async function agentUsage(workspaceId: string): Promise<
  Map<string, { runCount: number; totalCostMicro: number; lastRunStatus: string | null }>
> {
  const rows = await db
    .select({
      agentId: agentRuns.agentId,
      runCount: sql<number>`count(*)::int`,
      totalCostMicro: sql<number>`coalesce(sum(cost_micro), 0)`,
      lastRunStatus: sql<string | null>`(
        SELECT status FROM ai_agent_runs last_r
        WHERE last_r.agent_id = ai_agent_runs.agent_id
          AND last_r.workspace_id = ai_agent_runs.workspace_id
        ORDER BY last_r.created_at DESC, last_r.id DESC
        LIMIT 1
      )`,
    })
    .from(agentRuns)
    .where(eq(agentRuns.workspaceId, workspaceId))
    .groupBy(agentRuns.agentId);

  return new Map(
    rows.map((r) => [r.agentId, { ...r, lastRunStatus: r.lastRunStatus ?? null }]),
  );
}

export async function listAgentRuns(
  workspaceId: string,
  agentId: string,
  limit = 30,
  offset = 0,
) {
  return db.query.agentRuns.findMany({
    where: and(eq(agentRuns.agentId, agentId), eq(agentRuns.workspaceId, workspaceId)),
    orderBy: [desc(agentRuns.createdAt)],
    limit,
    offset,
  });
}

export async function getAgentRun(workspaceId: string, runId: string) {
  return db.query.agentRuns.findFirst({
    where: and(eq(agentRuns.id, runId), eq(agentRuns.workspaceId, workspaceId)),
  });
}

/** Create a queued run row and enqueue the worker job. */
export async function queueAgentRun(input: {
  workspaceId: string;
  userId: string;
  agentId: string;
  content: string;
}) {
  const agent = await getAgent(input.workspaceId, input.agentId);
  if (!agent) throw new AppError(404, "not_found", "Agent not found");
  if (agent.status === "paused") {
    throw new AppError(409, "agent_paused", "Agent is paused - resume it before running.");
  }

  const [run] = await db
    .insert(agentRuns)
    .values({
      agentId: input.agentId,
      workspaceId: input.workspaceId,
      input: input.content,
      status: "queued",
    })
    .returning();

  await enqueue("agent", {
    agentRunId: run.id,
    agentId: input.agentId,
    workspaceId: input.workspaceId,
    userId: input.userId,
  });

  return run;
}

export async function startAgent(input: {
  workspaceId: string;
  userId: string;
  agentId: string;
}) {
  const agent = await getAgent(input.workspaceId, input.agentId);
  if (!agent) throw new AppError(404, "not_found", "Agent not found");
  const goal = agent.goal ?? "Start the agent's next background work cycle.";
  return queueAgentRun({
    workspaceId: input.workspaceId,
    userId: input.userId,
    agentId: input.agentId,
    content: `Start background execution.\n\nGoal: ${goal}`,
  });
}

export async function listAgentLogs(workspaceId: string, agentId: string, limit = 100): Promise<AgentStepRow[]> {
  return db.query.agentSteps.findMany({
    where: and(eq(agentSteps.agentId, agentId), eq(agentSteps.workspaceId, workspaceId)),
    orderBy: [desc(agentSteps.occurredAt), desc(agentSteps.createdAt)],
    limit,
  });
}

export async function getAgentProgress(workspaceId: string, agentId: string): Promise<{
  agent: AgentRow;
  timeline: AgentStepRow[];
  pendingApprovals: AgentApprovalRow[];
  applications: ApplicationRecordRow[];
  memories: AgentMemoryRow[];
  documents: AgentDocumentRow[];
  overview: {
    status: string;
    startedAt: Date | null;
    lastAction: string | null;
    nextAction: string | null;
  };
}> {
  const agent = await getAgent(workspaceId, agentId);
  if (!agent) throw new AppError(404, "not_found", "Agent not found");

  const [timeline, pendingApprovals, applications, memories, documents] = await Promise.all([
    listAgentLogs(workspaceId, agentId, 100),
    db.query.agentApprovals.findMany({
      where: and(
        eq(agentApprovals.agentId, agentId),
        eq(agentApprovals.workspaceId, workspaceId),
        eq(agentApprovals.status, "pending"),
      ),
      orderBy: [desc(agentApprovals.createdAt)],
      limit: 20,
    }),
    db.query.applicationRecords.findMany({
      where: and(eq(applicationRecords.agentId, agentId), eq(applicationRecords.workspaceId, workspaceId)),
      orderBy: [desc(applicationRecords.createdAt)],
      limit: 30,
    }),
    db.query.agentMemories.findMany({
      where: and(eq(agentMemories.agentId, agentId), eq(agentMemories.workspaceId, workspaceId)),
      orderBy: [desc(agentMemories.importance), desc(agentMemories.createdAt)],
      limit: 12,
    }),
    db.query.agentDocuments.findMany({
      where: and(eq(agentDocuments.agentId, agentId), eq(agentDocuments.workspaceId, workspaceId)),
      orderBy: [desc(agentDocuments.createdAt)],
      limit: 12,
    }),
  ]);

  const latest = timeline[0] ?? null;
  const earliest = timeline[timeline.length - 1] ?? null;
  const activeStep = timeline.find((step) => step.status === "running" || step.status === "waiting");
  const nextAction =
    pendingApprovals[0]?.title ??
    activeStep?.title ??
    (agent.templateKey === "job_applying" ? "Continue scheduled job discovery" : "Queue the next run");
  const status =
    agent.status === "paused"
      ? "Paused"
      : pendingApprovals.length > 0
        ? "Waiting for approval"
        : activeStep?.status === "running"
          ? "Running"
          : latest
            ? "Active"
            : "Ready";

  return {
    agent,
    timeline,
    pendingApprovals,
    applications,
    memories,
    documents,
    overview: {
      status,
      startedAt: earliest?.occurredAt ?? agent.createdAt ?? null,
      lastAction: latest?.title ?? null,
      nextAction,
    },
  };
}

export async function decideAgentApproval(input: {
  workspaceId: string;
  userId: string;
  agentId: string;
  approvalId: string;
  decision: "approve" | "reject" | "edit" | "approve_similar";
  note?: string;
  editedPayload?: Record<string, unknown>;
}): Promise<{ approval: AgentApprovalRow; agent: AgentRow }> {
  const approval = await db.query.agentApprovals.findFirst({
    where: and(
      eq(agentApprovals.id, input.approvalId),
      eq(agentApprovals.agentId, input.agentId),
      eq(agentApprovals.workspaceId, input.workspaceId),
    ),
  });
  if (!approval) throw new AppError(404, "not_found", "Approval not found");
  if (approval.status !== "pending") {
    throw new AppError(409, "approval_closed", "This approval has already been decided.");
  }

  const nextStatus =
    input.decision === "reject"
      ? "rejected"
      : input.decision === "edit"
        ? "edited"
        : "approved";

  // Atomic claim: only a still-pending approval can be decided. The WHERE on
  // status is the real guard (action-replay protection) — a second, racing
  // tap on the same approval updates zero rows and gets a 409 instead of
  // double-submitting the application.
  const [updated] = await db
    .update(agentApprovals)
    .set({
      status: nextStatus,
      decisionNote: input.note ?? null,
      decidedByUserId: input.userId,
      decidedAt: new Date(),
      payload: input.editedPayload ? { ...asJsonObject(approval.payload), edited: input.editedPayload } : approval.payload,
    })
    .where(
      and(
        eq(agentApprovals.id, input.approvalId),
        eq(agentApprovals.agentId, input.agentId),
        eq(agentApprovals.workspaceId, input.workspaceId),
        eq(agentApprovals.status, "pending"),
      ),
    )
    .returning();

  if (!updated) {
    throw new AppError(409, "approval_closed", "This approval has already been decided.");
  }

  const agent = await getAgent(input.workspaceId, input.agentId);
  if (!agent) throw new AppError(404, "not_found", "Agent not found");
  const metrics = normalizeMetrics(agent.metrics);
  metrics.pendingApprovals = Math.max(0, metrics.pendingApprovals - 1);

  if (approval.targetType === "application" && approval.targetId) {
    if (input.decision === "reject") {
      await db
        .update(applicationRecords)
        .set({ status: "withdrawn" })
        .where(eq(applicationRecords.id, approval.targetId));
      await db.insert(agentSteps).values({
        agentId: input.agentId,
        workspaceId: input.workspaceId,
        runId: approval.runId ?? null,
        type: "approval.rejected",
        title: "Application rejected by user",
        description: approval.title,
        status: "completed",
        severity: "warning",
        data: { approvalId: approval.id, decision: input.decision },
      });
    } else {
      const payload = asJsonObject(input.editedPayload);
      await db
        .update(applicationRecords)
        .set({
          status: "submitted",
          coverLetter:
            typeof payload.coverLetter === "string"
              ? payload.coverLetter
              : undefined,
        })
        .where(eq(applicationRecords.id, approval.targetId));
      metrics.jobsApplied += 1;
      await db.insert(agentSteps).values({
        agentId: input.agentId,
        workspaceId: input.workspaceId,
        runId: approval.runId ?? null,
        type: "application.submitted",
        title: "Application submitted after approval",
        description: approval.title,
        status: "completed",
        severity: "success",
        data: { approvalId: approval.id, decision: input.decision },
      });
    }
  }

  const [nextAgent] = await db
    .update(agents)
    .set({ metrics, lastRunAt: new Date() })
    .where(and(eq(agents.id, input.agentId), eq(agents.workspaceId, input.workspaceId)))
    .returning();

  await recordActivity({
    workspaceId: input.workspaceId,
    userId: input.userId,
    type: "agent.approval.decided",
    title: `${input.decision === "reject" ? "Rejected" : "Approved"} agent action`,
    description: approval.title,
    meta: { agentId: input.agentId, approvalId: approval.id, decision: input.decision },
  });

  return { approval: updated, agent: nextAgent };
}

export async function recordAgentResume(input: {
  workspaceId: string;
  userId: string;
  agentId: string;
  body: UploadAgentResumeRequest;
}): Promise<AgentDocumentRow> {
  const agent = await getAgent(input.workspaceId, input.agentId);
  if (!agent) throw new AppError(404, "not_found", "Agent not found");

  const [document] = await db
    .insert(agentDocuments)
    .values({
      agentId: input.agentId,
      workspaceId: input.workspaceId,
      fileId: input.body.fileId ?? null,
      documentType: "resume",
      title: "Primary resume",
      fileName: input.body.fileName,
      mimeType: input.body.mimeType ?? null,
      status: input.body.extraction ? "parsed" : "uploaded",
      encrypted: true,
      extraction: input.body.extraction ?? {},
    })
    .returning();

  await db.insert(agentSteps).values({
    agentId: input.agentId,
    workspaceId: input.workspaceId,
    type: "document.resume_uploaded",
    title: "Resume added to agent",
    description: input.body.fileName,
    status: "completed",
    severity: "success",
    data: {
      documentId: document.id,
      encrypted: true,
      sizeBytes: input.body.sizeBytes ?? null,
    },
  });

  await recordActivity({
    workspaceId: input.workspaceId,
    userId: input.userId,
    type: "agent.resume.uploaded",
    title: "Resume linked to agent",
    description: input.body.fileName,
    meta: { agentId: input.agentId, documentId: document.id },
  });

  return document;
}

/**
 * Repeatable-run schedule (W3): persist a parsed cron + IANA timezone and keep
 * the BullMQ per-agent scheduler in sync. Reused by GET/POST /:id/schedule.
 */

const CRON_FIELD = /^(\*|[0-9]+(?:[0-9,\-/]*))$/;

export function isValidCron(cron: string): boolean {
  const fields = cron.trim().split(/\s+/);
  if (fields.length !== 5 && fields.length !== 6) return false;
  return fields.every((field) => field === "*" || CRON_FIELD.test(field));
}

export async function getAgentSchedule(
  workspaceId: string,
  id: string,
): Promise<AgentSchedule> {
  const agent = await getAgent(workspaceId, id);
  if (!agent) throw new AppError(404, "not_found", "Agent not found");
  return {
    cron: agent.scheduleCron ?? null,
    timezone: agent.scheduleTz ?? null,
    enabled: agent.schedulingEnabled ?? false,
  };
}

export async function setAgentSchedule(workspaceId: string, id: string, input: SetAgentScheduleRequest) {
  if (!input.cron || !isValidCron(input.cron)) {
    throw new AppError(400, "invalid_cron", "schedule.cron must be a valid 5- or 6-field cron expression");
  }
  const enabled = input.enabled ?? true;
  const [agent] = await db
    .update(agents)
    .set({
      scheduleCron: input.cron,
      scheduleTz: input.timezone,
      schedulingEnabled: enabled,
    })
    .where(and(eq(agents.id, id), eq(agents.workspaceId, workspaceId)))
    .returning();
  if (!agent) throw new AppError(404, "not_found", "Agent not found");

  await syncAgentSchedule(agent, enabled);
  return { agent, schedule: { cron: agent.scheduleCron, timezone: agent.scheduleTz, enabled: agent.schedulingEnabled } };
}
