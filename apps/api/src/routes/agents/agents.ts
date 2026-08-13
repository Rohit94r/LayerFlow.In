import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { and, desc, eq } from "drizzle-orm";
import {
  agentApprovalDecisionRequestSchema,
  agentMetricsSchema,
  createAgentRequestSchema,
  createAgentRunRequestSchema,
  listAgentRunsQuerySchema,
  paginationQuerySchema,
  setAgentScheduleRequestSchema,
  updateAgentRequestSchema,
  uploadAgentResumeRequestSchema,
  type Agent,
  type AgentApproval,
  type AgentApprovalDecisionResponse,
  type AgentDocument,
  type AgentLogsResponse,
  type AgentMemory,
  type AgentProgressResponse,
  type AgentRun,
  type AgentStep,
  type AgentWithUsage,
  type ApplicationRecord,
  type CreateAgentResponse,
  type CreateAgentRunResponse,
  type DeleteAgentResponse,
  type GetAgentResponse,
  type GetAgentRunResponse,
  type ListAgentRunsResponse,
  type ListAgentsResponse,
  type ListAgentTemplatesResponse,
  type SetAgentScheduleResponse,
  type StartAgentResponse,
  type UpdateAgentResponse,
  type UploadAgentResumeResponse,
} from "@layerflow/contracts";
import { requireAuth } from "../../middleware/auth";
import { AppError } from "../../middleware/app-error";
import { rateLimit } from "../../middleware/rate-limit";
import {
  agentUsage,
  createAgent,
  decideAgentApproval,
  deleteAgent,
  getAgent,
  getAgentProgress,
  getAgentRun,
  getAgentSchedule,
  listAgentLogs,
  listAgentRuns,
  listAgents,
  listAgentTemplates,
  queueAgentRun,
  recordAgentResume,
  setAgentSchedule,
  startAgent,
  updateAgent,
} from "../../services/agents/agents";
import { db } from "../../db/client";
import {
  agentNotifications,
  type AgentApprovalRow,
  type AgentDocumentRow,
  type AgentMemoryRow,
  type AgentRow,
  type AgentStepRow,
  type ApplicationRecordRow,
} from "../../db/schema/agents";
import type { AppEnv } from "../../types";

export const agentsRouter = new Hono<AppEnv>();
agentsRouter.use(requireAuth);

function iso(date?: Date | null): string | null {
  return date ? date.toISOString() : null;
}

function objectOrEmpty(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function toAgentDto(row: AgentRow): Agent {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    name: row.name,
    role: row.role,
    templateKey: row.templateKey,
    goal: row.goal,
    systemPrompt: row.systemPrompt,
    modelId: row.modelId,
    temperature: row.temperature,
    status: row.status,
    tools: row.tools ?? [],
    schedule: row.schedule,
    scheduleCron: row.scheduleCron,
    scheduleTz: row.scheduleTz,
    schedulingEnabled: row.schedulingEnabled,
    expectedActivity: row.expectedActivity,
    estimatedUsage: row.estimatedUsage,
    onboarding: objectOrEmpty(row.onboarding),
    metrics: agentMetricsSchema.parse(row.metrics ?? {}),
    isDemo: row.isDemo,
    lastRunAt: iso(row.lastRunAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toAgentRunDto(row: {
  id: string;
  agentId: string;
  workspaceId: string;
  input: string;
  output: string | null;
  status: string;
  errorMessage: string | null;
  provider: string | null;
  model: string | null;
  inputTokens: number;
  outputTokens: number;
  costMicro: number;
  runLatencyMs: number | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): AgentRun {
  return {
    id: row.id,
    agentId: row.agentId,
    workspaceId: row.workspaceId,
    input: row.input,
    output: row.output,
    status: row.status as AgentRun["status"],
    errorMessage: row.errorMessage,
    provider: row.provider,
    model: row.model,
    inputTokens: row.inputTokens,
    outputTokens: row.outputTokens,
    cost: (row.costMicro ?? 0) / 1_000_000,
    costMicro: row.costMicro ?? 0,
    runLatencyMs: row.runLatencyMs,
    startedAt: iso(row.startedAt),
    completedAt: iso(row.completedAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toStepDto(row: AgentStepRow): AgentStep {
  return {
    id: row.id,
    agentId: row.agentId,
    workspaceId: row.workspaceId,
    runId: row.runId,
    type: row.type,
    title: row.title,
    description: row.description,
    status: row.status,
    severity: row.severity,
    data: objectOrEmpty(row.data),
    occurredAt: row.occurredAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

function toApprovalDto(row: AgentApprovalRow): AgentApproval {
  return {
    id: row.id,
    agentId: row.agentId,
    workspaceId: row.workspaceId,
    runId: row.runId,
    targetType: row.targetType,
    targetId: row.targetId,
    title: row.title,
    description: row.description,
    riskLevel: row.riskLevel,
    status: row.status,
    payload: objectOrEmpty(row.payload),
    decisionNote: row.decisionNote,
    decidedByUserId: row.decidedByUserId,
    decidedAt: iso(row.decidedAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toMemoryDto(row: AgentMemoryRow): AgentMemory {
  return {
    id: row.id,
    agentId: row.agentId,
    workspaceId: row.workspaceId,
    kind: row.kind,
    title: row.title,
    body: row.body,
    data: objectOrEmpty(row.data),
    importance: row.importance,
    lastUsedAt: iso(row.lastUsedAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toDocumentDto(row: AgentDocumentRow): AgentDocument {
  return {
    id: row.id,
    agentId: row.agentId,
    workspaceId: row.workspaceId,
    fileId: row.fileId,
    documentType: row.documentType,
    title: row.title,
    fileName: row.fileName,
    mimeType: row.mimeType,
    status: row.status,
    encrypted: row.encrypted,
    extraction: objectOrEmpty(row.extraction),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toApplicationDto(row: ApplicationRecordRow): ApplicationRecord {
  return {
    id: row.id,
    agentId: row.agentId,
    workspaceId: row.workspaceId,
    approvalId: row.approvalId,
    company: row.company,
    roleTitle: row.roleTitle,
    location: row.location,
    jobUrl: row.jobUrl,
    source: row.source,
    status: row.status,
    resumeScore: row.resumeScore,
    coverLetter: row.coverLetter,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function progressDto(workspaceId: string, agentId: string): Promise<AgentProgressResponse> {
  const progress = await getAgentProgress(workspaceId, agentId);
  return {
    agent: toAgentDto(progress.agent),
    overview: {
      status: progress.overview.status,
      startedAt: iso(progress.overview.startedAt),
      lastAction: progress.overview.lastAction,
      nextAction: progress.overview.nextAction,
    },
    metrics: agentMetricsSchema.parse(progress.agent.metrics ?? {}),
    timeline: progress.timeline.map(toStepDto),
    pendingApprovals: progress.pendingApprovals.map(toApprovalDto),
    applications: progress.applications.map(toApplicationDto),
    memories: progress.memories.map(toMemoryDto),
    documents: progress.documents.map(toDocumentDto),
  };
}

// GET /api/agents/templates — marketplace cards
agentsRouter.get("/templates", async (c) => {
  const response: ListAgentTemplatesResponse = { templates: await listAgentTemplates() };
  return c.json(response);
});

// GET /api/agents — list with usage summary
agentsRouter.get("/", async (c) => {
  const workspaceId = c.get("workspaceId");
  const query = paginationQuerySchema.parse(c.req.query());
  const [agents, usage] = await Promise.all([
    listAgents(workspaceId, { limit: query.limit, offset: query.offset }),
    agentUsage(workspaceId),
  ]);
  const withUsage: AgentWithUsage[] = agents.map((a) => {
    const u = usage.get(a.id);
    return {
      ...toAgentDto(a),
      runCount: u?.runCount ?? 0,
      totalCost: (u?.totalCostMicro ?? 0) / 1_000_000,
      lastRunStatus: (u?.lastRunStatus as AgentWithUsage["lastRunStatus"]) ?? null,
    };
  });
  const response: ListAgentsResponse = { agents: withUsage };
  return c.json(response);
});

// GET /api/agents/runs/:runId — single run (registered before /:id)
agentsRouter.get("/runs/:runId", async (c) => {
  const workspaceId = c.get("workspaceId");
  const run = await getAgentRun(workspaceId, c.req.param("runId"));
  if (!run) throw new AppError(404, "not_found", "Agent run not found");
  const response: GetAgentRunResponse = { run: toAgentRunDto(run) };
  return c.json(response);
});

// POST /api/agents
agentsRouter.post("/", async (c) => {
  const workspaceId = c.get("workspaceId");
  const userId = c.get("userId");
  const body = createAgentRequestSchema.parse(await c.req.json());
  const agent = await createAgent(workspaceId, {
    userId,
    name: body.name,
    role: body.role ?? "custom",
    templateKey: body.templateKey,
    goal: body.goal,
    systemPrompt: body.systemPrompt,
    modelId: body.modelId,
    temperature: body.temperature,
    tools: body.tools ?? [],
    schedule: body.schedule,
    expectedActivity: body.expectedActivity,
    estimatedUsage: body.estimatedUsage,
    onboarding: body.onboarding,
    metrics: body.metrics,
    permissions: body.permissions ?? [],
  });
  const response: CreateAgentResponse = { agent: toAgentDto(agent) };
  return c.json(response, 201);
});

// GET /api/agents/:id — detail incl. recent runs
agentsRouter.get("/:id", async (c) => {
  const workspaceId = c.get("workspaceId");
  const [agent, runs] = await Promise.all([
    getAgent(workspaceId, c.req.param("id")),
    listAgentRuns(workspaceId, c.req.param("id"), 30, 0),
  ]);
  if (!agent) throw new AppError(404, "not_found", "Agent not found");
  const response: GetAgentResponse = {
    agent: toAgentDto(agent),
    runs: runs.map(toAgentRunDto),
  };
  return c.json(response);
});

// PATCH /api/agents/:id
agentsRouter.patch("/:id", async (c) => {
  const workspaceId = c.get("workspaceId");
  const body = updateAgentRequestSchema.parse(await c.req.json());
  const agent = await updateAgent(workspaceId, c.req.param("id"), body);
  if (!agent) throw new AppError(404, "not_found", "Agent not found");
  const response: UpdateAgentResponse = { agent: toAgentDto(agent) };
  return c.json(response);
});

// POST /api/agents/:id/start — queue the next background cycle
agentsRouter.post("/:id/start", async (c) => {
  const workspaceId = c.get("workspaceId");
  const userId = c.get("userId");
  const run = await startAgent({ workspaceId, userId, agentId: c.req.param("id") });
  const agent = await getAgent(workspaceId, c.req.param("id"));
  if (!agent) throw new AppError(404, "not_found", "Agent not found");
  const response: StartAgentResponse = { agent: toAgentDto(agent), run: toAgentRunDto(run) };
  return c.json(response, 202);
});

// POST /api/agents/:id/pause — stop new runs from being queued
agentsRouter.post("/:id/pause", async (c) => {
  const workspaceId = c.get("workspaceId");
  const agent = await updateAgent(workspaceId, c.req.param("id"), { status: "paused" });
  if (!agent) throw new AppError(404, "not_found", "Agent not found");
  const response: UpdateAgentResponse = { agent: toAgentDto(agent) };
  return c.json(response);
});

// POST /api/agents/:id/resume
agentsRouter.post("/:id/resume", async (c) => {
  const workspaceId = c.get("workspaceId");
  const agent = await updateAgent(workspaceId, c.req.param("id"), { status: "active" });
  if (!agent) throw new AppError(404, "not_found", "Agent not found");
  const response: UpdateAgentResponse = { agent: toAgentDto(agent) };
  return c.json(response);
});

// GET /api/agents/:id/progress — dashboard snapshot
agentsRouter.get("/:id/progress", async (c) => {
  return c.json(await progressDto(c.get("workspaceId"), c.req.param("id")));
});

// GET /api/agents/:id/stream — SSE progress feed for live dashboards
agentsRouter.get("/:id/stream", async (c) => {
  const workspaceId = c.get("workspaceId");
  const agentId = c.req.param("id");
  return streamSSE(c, async (stream) => {
    for (let i = 0; i < 60; i += 1) {
      const snapshot = await progressDto(workspaceId, agentId);
      await stream.writeSSE({
        event: "progress",
        data: JSON.stringify(snapshot),
        id: `${Date.now()}`,
      });
      await stream.sleep(2_000);
    }
  });
});

// GET /api/agents/:id/logs — chronological durable events
agentsRouter.get("/:id/logs", async (c) => {
  const steps = await listAgentLogs(c.get("workspaceId"), c.req.param("id"), 200);
  const response: AgentLogsResponse = { steps: steps.map(toStepDto) };
  return c.json(response);
});

// POST /api/agents/:id/approve — approve/reject/edit one pending action
agentsRouter.post("/:id/approve", rateLimit({ requestsPerMinute: 30 }), async (c) => {
  const workspaceId = c.get("workspaceId");
  const userId = c.get("userId");
  const body = agentApprovalDecisionRequestSchema.parse(await c.req.json());
  const result = await decideAgentApproval({
    workspaceId,
    userId,
    agentId: c.req.param("id"),
    approvalId: body.approvalId,
    decision: body.decision,
    note: body.note,
    editedPayload: body.editedPayload,
  });
  const response: AgentApprovalDecisionResponse = {
    approval: toApprovalDto(result.approval),
    agent: toAgentDto(result.agent),
  };
  return c.json(response);
});

// POST /api/agents/:id/upload-resume — link parsed resume metadata to agent
agentsRouter.post("/:id/upload-resume", rateLimit({ requestsPerMinute: 10 }), async (c) => {
  const workspaceId = c.get("workspaceId");
  const userId = c.get("userId");
  const body = uploadAgentResumeRequestSchema.parse(await c.req.json());
  const document = await recordAgentResume({
    workspaceId,
    userId,
    agentId: c.req.param("id"),
    body,
  });
  const response: UploadAgentResumeResponse = { document: toDocumentDto(document) };
  return c.json(response, 201);
});

// GET /api/agents/:id/schedule — read the agent's repeatable schedule
agentsRouter.get("/:id/schedule", async (c) => {
  const schedule = await getAgentSchedule(c.get("workspaceId"), c.req.param("id"));
  return c.json({ schedule });
});

// POST /api/agents/:id/schedule — set/update the repeatable cron schedule
agentsRouter.post("/:id/schedule", async (c) => {
  const workspaceId = c.get("workspaceId");
  const body = setAgentScheduleRequestSchema.parse(await c.req.json());
  const result = await setAgentSchedule(workspaceId, c.req.param("id"), body);
  const response: SetAgentScheduleResponse = {
    agent: toAgentDto(result.agent),
    schedule: result.schedule,
  };
  return c.json(response);
});

// DELETE /api/agents/:id
agentsRouter.delete("/:id", async (c) => {
  const workspaceId = c.get("workspaceId");
  const deleted = await deleteAgent(workspaceId, c.req.param("id"));
  if (!deleted) throw new AppError(404, "not_found", "Agent not found");
  const response: DeleteAgentResponse = { id: c.req.param("id"), deleted: true };
  return c.json(response);
});

// POST /api/agents/:id/runs — queue an ad hoc run
agentsRouter.post("/:id/runs", rateLimit({ requestsPerMinute: 20 }), async (c) => {
  const workspaceId = c.get("workspaceId");
  const userId = c.get("userId");
  const body = createAgentRunRequestSchema.parse(await c.req.json());
  const run = await queueAgentRun({
    workspaceId,
    userId,
    agentId: c.req.param("id"),
    content: body.input,
  });
  const response: CreateAgentRunResponse = { run: toAgentRunDto(run) };
  return c.json(response, 202);
});

// GET /api/agents/:id/runs
agentsRouter.get("/:id/runs", async (c) => {
  const workspaceId = c.get("workspaceId");
  const query = listAgentRunsQuerySchema.parse(c.req.query());
  const runs = await listAgentRuns(workspaceId, c.req.param("id"), query.limit, query.offset);
  const response: ListAgentRunsResponse = { runs: runs.map(toAgentRunDto) };
  return c.json(response);
});

// GET /api/agents/:id/notifications — agent-scoped notifications
agentsRouter.get("/:id/notifications", async (c) => {
  const workspaceId = c.get("workspaceId");
  const agentId = c.req.param("id");
  const notifications = await db.query.agentNotifications.findMany({
    where: and(
      eq(agentNotifications.agentId, agentId),
      eq(agentNotifications.workspaceId, workspaceId),
    ),
    orderBy: [desc(agentNotifications.createdAt)],
    limit: 50,
  });
  return c.json({
    notifications: notifications.map((n) => ({
      id: n.id,
      agentId: n.agentId,
      type: n.type,
      title: n.title,
      body: n.body,
      status: n.status,
      data: objectOrEmpty(n.data),
      createdAt: n.createdAt.toISOString(),
    })),
  });
});

// POST /api/agents/:id/notifications/:notificationId/read
agentsRouter.post("/:id/notifications/:notificationId/read", async (c) => {
  const workspaceId = c.get("workspaceId");
  const agentId = c.req.param("id");
  const notificationId = c.req.param("notificationId");
  const [updated] = await db
    .update(agentNotifications)
    .set({ status: "read" })
    .where(
      and(
        eq(agentNotifications.id, notificationId),
        eq(agentNotifications.agentId, agentId),
        eq(agentNotifications.workspaceId, workspaceId),
        eq(agentNotifications.status, "unread"),
      ),
    )
    .returning();
  if (!updated) throw new AppError(404, "not_found", "Notification not found or already read");
  return c.json({ notification: { id: updated.id, status: updated.status } });
});
