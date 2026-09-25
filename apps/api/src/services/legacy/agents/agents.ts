import { and, desc, eq, sql } from "drizzle-orm";
import type {
  AgentMetrics,
  AgentPermissionDefinition,
  AgentSchedule,
  AgentTemplate,
  SetAgentScheduleRequest,
  UploadAgentResumeRequest,
} from "@layerflow/contracts";
import { db } from "../../../db/client";
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
} from "../../../db/schema/agents";
import { enqueue, syncAgentSchedule } from "../../../jobs/queues";
import { AppError } from "../../../middleware/app-error";
import { recordActivity } from "../../workspace/activity";

/**
 * Agents — V2 CRUD + durable orchestration support. The full execution engine
 * still lives in jobs/processors/agent.ts; this service owns persistence,
 * marketplace metadata, progress projections, approvals, and document links.
 */

export const AGENT_MARKETPLACE_TEMPLATES: AgentTemplate[] = [
  {
    key: "common_assistant",
    name: "Common Assistant",
    description: "The everyday helper — research, drafting, summaries, and quick tasks for anyone. Start here.",
    category: "General",
    estimatedCost: "~$0.50 per task",
    expectedOutcome: "A reliable AI worker that researches, drafts, and answers with your saved tools.",
    defaultSchedule: "On demand",
    permissions: [
      { key: "search", label: "Search the web", description: "Run web searches to find current information.", category: "Research", mode: "allow_always" },
      { key: "fetch_url", label: "Open pages", description: "Visit and read web pages in a safe sandbox.", category: "Research", mode: "allow_always" },
      { key: "read_file", label: "Read files", description: "Read project files you point it at.", category: "Your machine", mode: "allow_always" },
      { key: "write_file", label: "Save drafts", description: "Write draft files only after you approve once.", category: "Your machine", mode: "allow_once" },
      { key: "shell", label: "Run commands", description: "Never runs shell commands automatically.", category: "High risk", mode: "deny" },
    ],
  },
  {
    key: "freelancer_pipeline",
    name: "Freelance Prospector",
    description: "Finds freelance gigs and clients, drafts tailored proposals, and tracks follow-ups — built for freelancing, not job boards.",
    category: "Freelancing",
    estimatedCost: "$2-$8 per active week",
    expectedOutcome: "A pipeline of freelance opportunities with proposal drafts and follow-up reminders.",
    defaultSchedule: "Weekdays at 09:00 and 15:00",
    permissions: [
      { key: "search", label: "Find gigs & clients", description: "Search freelance platforms and client opportunities.", category: "Discovery", mode: "allow_always" },
      { key: "fetch_url", label: "Read listings", description: "Open gig and client listings to extract requirements.", category: "Discovery", mode: "allow_always" },
      { key: "read_file", label: "Read portfolio", description: "Read your portfolio/rates file when shaping proposals.", category: "Your machine", mode: "allow_once" },
      { key: "write_file", label: "Draft proposals", description: "Write proposal drafts for your review.", category: "Writing", mode: "allow_always" },
      { key: "shell", label: "Run commands", description: "Never runs shell commands.", category: "High risk", mode: "deny" },
    ],
  },
  {
    key: "job_finder",
    name: "Job Finder",
    description: "Searches job listings, scores fit against your resume, and prepares applications that always wait for your approval.",
    category: "Career",
    estimatedCost: "$3-$12 per active search week",
    expectedOutcome: "A tracked pipeline of matching jobs with approval-ready applications.",
    defaultSchedule: "Weekdays at 09:00, 13:00, and 18:00",
    permissions: [
      { key: "search", label: "Search jobs", description: "Search public job listings.", category: "Discovery", mode: "allow_always" },
      { key: "fetch_url", label: "Read job posts", description: "Open job posts and company career pages.", category: "Discovery", mode: "allow_always" },
      { key: "read_file", label: "Read resume", description: "Read your resume to score fit.", category: "Your machine", mode: "allow_once" },
      { key: "write_file", label: "Draft applications", description: "Draft cover letters and applications for review.", category: "Writing", mode: "allow_always" },
      { key: "shell", label: "Run commands", description: "Never runs shell commands or auto-submits applications.", category: "High risk", mode: "deny" },
    ],
  },
  {
    key: "product_finder",
    name: "Product Finder",
    description: "Finds products, suppliers, and leads; compares specs and prices; and builds a shortlist you can act on fast.",
    category: "Research",
    estimatedCost: "$2-$8 per scan",
    expectedOutcome: "A ranked product/supplier shortlist with specs, pricing, and notes.",
    defaultSchedule: "On demand",
    permissions: [
      { key: "search", label: "Search products", description: "Search marketplaces, suppliers, and price sources.", category: "Discovery", mode: "allow_always" },
      { key: "fetch_url", label: "Open listings", description: "Open product and supplier listing pages.", category: "Discovery", mode: "allow_always" },
      { key: "read_file", label: "Read requirements", description: "Read your requirements list.", category: "Your machine", mode: "allow_once" },
      { key: "write_file", label: "Save shortlist", description: "Save the shortlist as a file for review.", category: "Your machine", mode: "allow_once" },
      { key: "shell", label: "Run commands", description: "Never runs shell commands.", category: "High risk", mode: "deny" },
    ],
  },
  {
    key: "content_creator",
    name: "Content Creator",
    description: "Turns your ideas into posts, threads, and newsletters with on-brand drafts ready to publish after your review.",
    category: "Content",
    estimatedCost: "$1-$5 per content batch",
    expectedOutcome: "A reviewable content queue with channel-specific variants.",
    defaultSchedule: "On demand",
    permissions: [
      { key: "search", label: "Research topics", description: "Research trends and references for the content.", category: "Research", mode: "allow_always" },
      { key: "fetch_url", label: "Read sources", description: "Open source articles and trend pages.", category: "Research", mode: "allow_always" },
      { key: "read_file", label: "Read tone guide", description: "Read your brand/tone notes if you upload one.", category: "Your machine", mode: "allow_once" },
      { key: "write_file", label: "Save drafts", description: "Write drafts for your review.", category: "Writing", mode: "allow_always" },
      { key: "shell", label: "Run commands", description: "Never runs shell commands or post automatically.", category: "High risk", mode: "deny" },
    ],
  },
  {
    key: "startup_research",
    name: "Startup Research",
    description: "Builds company and market maps, competitor signals, and opportunity briefs for founders and freelancers.",
    category: "Research",
    estimatedCost: "$3-$12 per scan",
    expectedOutcome: "A ranked startup list with funding, hiring, and opportunity signals.",
    defaultSchedule: "Twice weekly",
    permissions: [
      { key: "search", label: "Search companies", description: "Search companies, founders, and market signals.", category: "Research", mode: "allow_always" },
      { key: "fetch_url", label: "Open company pages", description: "Open company and funding pages.", category: "Research", mode: "allow_always" },
      { key: "read_file", label: "Read notes", description: "Read your existing notes and prompts.", category: "Your machine", mode: "allow_once" },
      { key: "write_file", label: "Save briefs", description: "Save briefs and reports for review.", category: "Your machine", mode: "allow_once" },
      { key: "shell", label: "Run commands", description: "Never runs shell commands.", category: "High risk", mode: "deny" },
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
      totalCostMicro: sql<number>`coalesce(sum(cost_micro), 0)::int`,
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
    rows.map((r) => [
      r.agentId,
      {
        runCount: Number(r.runCount || 0),
        totalCostMicro: Number(r.totalCostMicro || 0),
        lastRunStatus: r.lastRunStatus ?? null,
      },
    ]),
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

  try {
    await enqueue("agent", {
      agentRunId: run.id,
      agentId: input.agentId,
      workspaceId: input.workspaceId,
      userId: input.userId,
    });
  } catch {
    /* Queue unavailable - fallback to direct execution */
  }

  // Fallback in-process execution trigger after 1.5s if still queued
  void (async () => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    try {
      const currentRun = await db.query.agentRuns.findFirst({
        where: eq(agentRuns.id, run.id),
      });
      if (currentRun && currentRun.status === "queued") {
        const { processAgent } = await import("../../../jobs/processors/agent");
        await processAgent({
          data: {
            agentRunId: run.id,
            agentId: input.agentId,
            workspaceId: input.workspaceId,
            userId: input.userId,
          },
        } as any);
      }
    } catch {
      /* processAgent handles state update */
    }
  })();

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
