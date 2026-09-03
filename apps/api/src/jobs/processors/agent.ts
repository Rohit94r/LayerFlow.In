import type { Job } from "bullmq";
import { and, asc, eq, sql } from "drizzle-orm";
import { getModel } from "@layerflow/model-registry";
import { logger } from "../../config/logger";
import { db } from "../../db/client";
import {
  agentApprovals,
  agentMemories,
  agentRuns,
  agents,
  agentSteps,
  applicationRecords,
  emptyAgentMetrics,
  recruiterContacts,
  type AgentMetricsJson,
  type AgentRow,
  type AgentRunRow,
} from "../../db/schema/agents";
import { executeRun } from "../../services/runs/execute";
import { hasUsableProviderKey } from "../../services/chat/health";
import { recordActivity } from "../../services/workspace/activity";
import { createNotification } from "../../services/notifications/notifications";
import { workspaces } from "../../db/schema/tenancy";
import { createId } from "../../db/schema/_helpers";
import {
  executeTool,
  executeToolChain,
  getToolSpecs,
  type ToolContext,
  type ToolInput,
} from "../../services/agents/tools";
import {
  AgentStateMachine,
  agentStartedEvent,
  agentCompletedEvent,
  agentFailedEvent,
} from "../../services/agents/state-machine";
import { broadcastEvent } from "../../routes/ws/ws";

export interface AgentJobPayload {
  agentRunId: string;
  agentId: string;
  workspaceId: string;
  userId?: string;
}

/** Fallback when the agent has no model and "auto" is unserviceable. */
const DEFAULT_AGENT_MODEL = "gpt-4o-mini";

/**
 * Best-effort run notification. Never throws — a notification failure must
 * not fail the run job. Scheduled runs carry no userId, so fall back to the
 * workspace owner as the recipient.
 */
async function notifyRunFinished(input: {
  runId: string;
  agentId: string;
  agentName: string;
  workspaceId: string;
  userId?: string;
  status: "agent_run_completed" | "agent_run_failed";
  message?: string;
}): Promise<void> {
  try {
    const workspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.id, input.workspaceId),
      columns: { ownerUserId: true },
    });
    const recipientId = input.userId ?? workspace?.ownerUserId ?? null;
    if (!recipientId) return;
    await createNotification({
      workspaceId: input.workspaceId,
      userId: recipientId,
      kind: input.status,
      title:
        input.status === "agent_run_completed"
          ? `Agent "${input.agentName}" completed a run`
          : `Agent "${input.agentName}" run failed`,
      body: input.message?.slice(0, 300) ?? null,
      agentId: input.agentId,
    });
  } catch (err) {
    logger.warn(
      { agentRunId: input.runId, err: err instanceof Error ? err.message : String(err) },
      "notification creation failed",
    );
  }
}

/**
 * Preferred agent models in priority order. Picks the first one whose
 * provider has a usable key so agents work out of the box, or uses the
 * agent's own modelId when set.
 */
const AGENT_MODEL_PRIORITY: { model: string; provider: string }[] = [
  { model: "gpt-4o-mini", provider: "openai" },
  { model: "gemini-flash-latest", provider: "google" },
  { model: "openai/gpt-oss-120b", provider: "groq" },
  { model: "grok-3-mini", provider: "xai" },
  { model: "deepseek-chat", provider: "deepseek" },
  { model: "kimi-k2", provider: "kimi" },
];

async function pickAgentModel(workspaceId: string, modelId?: string | null): Promise<string> {
  if (modelId && getModel(modelId)) return modelId;
  for (const candidate of AGENT_MODEL_PRIORITY) {
    if (await hasUsableProviderKey(workspaceId, candidate.provider as never)) {
      return candidate.model;
    }
  }
  return DEFAULT_AGENT_MODEL;
}

function readString(data: unknown, path: string[], fallback = ""): string {
  let cursor: unknown = data;
  for (const key of path) {
    if (!cursor || typeof cursor !== "object" || Array.isArray(cursor)) return fallback;
    cursor = (cursor as Record<string, unknown>)[key];
  }
  return typeof cursor === "string" && cursor.trim() ? cursor.trim() : fallback;
}

function mergeMetrics(current: unknown, patch: Partial<AgentMetricsJson>): AgentMetricsJson {
  return { ...emptyAgentMetrics, ...(current as Partial<AgentMetricsJson> | undefined), ...patch };
}

/**
 * Parse tool calls from an AI response string.
 * Looks for patterns like: TOOL_CALL: toolName({"arg": "value"})
 * or structured JSON tool call blocks.
 */
function parseToolCallsFromOutput(output: string): ToolInput[] {
  const tools: ToolInput[] = [];
  // Match TOOL_CALL: name({"arg": "value", ...}) patterns
  const regex = /TOOL_CALL:\s*(\w+)\s*\(\s*(\{.*?\})\s*\)/gs;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(output)) !== null) {
    try {
      const args = JSON.parse(match[2]);
      tools.push({ name: match[1], args });
    } catch {
      // Skip malformed tool calls
    }
  }
  // Also check for JSON code blocks with tool_calls array
  const jsonBlockRegex = /```(?:json)?\s*\n?(\{[\s\S]*?"tool_calls"[\s\S]*?\})\n?```/g;
  while ((match = jsonBlockRegex.exec(output)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      if (Array.isArray(parsed.tool_calls)) {
        for (const tc of parsed.tool_calls) {
          if (tc.name && tc.args) {
            tools.push({ name: tc.name, args: tc.args });
          }
        }
      }
    } catch {
      // Skip malformed JSON
    }
  }
  return tools;
}

/**
 * Record an agent step in the database.
 */
async function recordAgentStep(input: {
  agentId: string;
  workspaceId: string;
  agentRunId: string;
  type: string;
  title: string;
  description?: string;
  status?: string;
  severity?: string;
  data?: Record<string, unknown>;
}): Promise<void> {
  try {
    await db.insert(agentSteps).values({
      agentId: input.agentId,
      workspaceId: input.workspaceId,
      runId: input.agentRunId,
      type: input.type,
      title: input.title,
      description: input.description ?? null,
      status: (input.status ?? "completed") as "queued" | "running" | "waiting" | "completed" | "failed",
      severity: (input.severity ?? "info") as "info" | "success" | "warning" | "danger",
      data: input.data ?? {},
    });
  } catch (err) {
    logger.warn({ agentRunId: input.agentRunId, err }, "failed to record agent step");
  }
}

/**
 * Structured-output contract appended to the job agent prompt so each run
 * produces parseable discovery data through the real model pipeline.
 */
const JOB_AGENT_OUTPUT_SCHEMA = [
  "",
  "Respond with ONLY one JSON object - no markdown, no code fences, no commentary - in this exact shape:",
  '{',
  '  "summary": "One short paragraph describing this discovery cycle.",',
  '  "jobs": [',
  '    {',
  '      "company": "Company name",',
  '      "roleTitle": "Exact role title",',
  '      "location": "City or Remote",',
  '      "source": "LinkedIn | Company careers | Wellfound | Other",',
  '      "jobUrl": "https://...",',
  '      "resumeScore": 0,',
  '      "coverLetter": "One short tailored paragraph."',
  '    }',
  '  ]',
  '}',
  "Rules:",
  "- List at most 5 realistic roles matching the candidate profile and preferred locations.",
  "- resumeScore is an integer 0-100 computed strictly from the candidate profile in the system prompt.",
  "- Only include roles the search target locations support.",
].join("\n");

function extractJsonObject(output: string): Record<string, unknown> | null {
  const fenced = output.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced?.[1] ?? output;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const parsed: unknown = JSON.parse(candidate.slice(start, end + 1));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

interface JobCandidateFound {
  company: string;
  roleTitle: string;
  location: string;
  source: string;
  jobUrl: string;
  resumeScore: number;
  coverLetter: string;
}

function parseJobCandidates(value: unknown): JobCandidateFound[] {
  if (!Array.isArray(value)) return [];
  const jobs: JobCandidateFound[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const job = raw as Record<string, unknown>;
    const company = typeof job.company === "string" ? job.company.trim() : "";
    const roleTitle = typeof job.roleTitle === "string" ? job.roleTitle.trim() : "";
    if (!company || !roleTitle) continue;
    const rawScore = typeof job.resumeScore === "number" ? job.resumeScore : Number(job.resumeScore);
    const score = Number.isFinite(rawScore) ? Math.max(0, Math.min(100, Math.round(rawScore))) : 0;
    const jobUrl = typeof job.jobUrl === "string" && /^https?:\/\//i.test(job.jobUrl.trim()) ? job.jobUrl.trim() : "";
    jobs.push({
      company,
      roleTitle,
      location: typeof job.location === "string" ? job.location.trim() : "",
      source: typeof job.source === "string" && job.source.trim() ? job.source.trim() : "Job board",
      jobUrl,
      resumeScore: score,
      coverLetter: typeof job.coverLetter === "string" ? job.coverLetter.trim() : "",
    });
  }
  return jobs;
}

async function processJobApplyingAgent(input: {
  run: AgentRunRow;
  agent: AgentRow;
  workspaceId: string;
  userId?: string;
}): Promise<void> {
  const { run, agent, workspaceId, userId } = input;
  const started = Date.now();
  const onboarding = agent.onboarding ?? {};
  const role =
    readString(onboarding, ["goalDiscovery", "role"]) ||
    readString(onboarding, ["goalDiscovery", "experienceLevel"], "Software Engineer Intern");
  const location = readString(onboarding, ["goalDiscovery", "locations"], "Remote");
  const roleTitle = role.toLowerCase().includes("intern") ? role : `${role} Intern`;

  await db.insert(agentSteps).values({
    agentId: agent.id,
    workspaceId,
    runId: run.id,
    type: "discovery.started",
    title: "Scanning for matching roles",
    description: `Running a discovery cycle for ${roleTitle} in ${location}.`,
    status: "running",
    severity: "info",
    data: { location, roleTitle },
  });

  const existing = await db.query.applicationRecords.findMany({
    where: and(eq(applicationRecords.agentId, agent.id), eq(applicationRecords.workspaceId, workspaceId)),
  });
  const existingKeys = new Set(existing.map((row) => `${row.company.toLowerCase()}|${row.roleTitle.toLowerCase()}`));

  const model = await pickAgentModel(workspaceId, agent.modelId);

  let output: string;
  let executed: Awaited<ReturnType<typeof executeRun>>["run"];
  try {
    const result = await executeRun({
      workspaceId,
      userId: userId ?? "system",
      model,
      source: "agent",
      messages: [
        { role: "system", content: `${agent.systemPrompt}\n\n${JOB_AGENT_OUTPUT_SCHEMA}` },
        { role: "user", content: run.input },
      ],
      routingReason: "agent",
      allowRouting: false,
    });
    if (result.run.status !== "succeeded" || !result.run.output) {
      throw new Error(result.run.errorMessage ?? "Agent run did not produce output");
    }
    output = result.run.output;
    executed = result.run;
  } catch (err) {
    await db.insert(agentSteps).values({
      agentId: agent.id,
      workspaceId,
      runId: run.id,
      type: "discovery.failed",
      title: "Discovery cycle failed",
      description: err instanceof Error ? err.message : "Discovery cycle failed",
      status: "failed",
      severity: "danger",
      data: {},
    });
    throw err;
  }

  const parsed = extractJsonObject(output);
  const discovered = parsed ? parseJobCandidates(parsed.jobs) : [];
  const candidates = discovered.filter(
    (job) => !existingKeys.has(`${job.company.toLowerCase()}|${job.roleTitle.toLowerCase()}`),
  );
  const summary =
    parsed && typeof parsed.summary === "string" && parsed.summary.trim()
      ? parsed.summary.trim()
      : `Discovery finished for ${roleTitle} in ${location}.`;

  await db.insert(agentSteps).values({
    agentId: agent.id,
    workspaceId,
    runId: run.id,
    type: "discovery.completed",
    title: candidates.length ? `Found ${candidates.length} matching roles` : "No new non-duplicate roles found",
    description: candidates.length
      ? `Scored ${candidates.length} roles against the candidate profile; deduped ${discovered.length - candidates.length} already-seen listings.`
      : "Duplicate detection prevented repeated applications.",
    status: "completed",
    severity: candidates.length ? "success" : "info",
    data: { discovered: discovered.length, candidates: candidates.length, deduped: existing.length },
  });

  if (!candidates.length) {
    const metrics = mergeMetrics(agent.metrics, {
      jobsFound: Math.max((agent.metrics as AgentMetricsJson | undefined)?.jobsFound ?? 0, existing.length),
      pendingApprovals: await pendingApprovalCount(workspaceId, agent.id),
    });
    await db
      .update(agents)
      .set({ metrics, lastRunAt: new Date() })
      .where(eq(agents.id, agent.id));
    await db
      .update(agentRuns)
      .set({
        status: "succeeded",
        output: summary,
        provider: executed.provider,
        model: executed.model,
        inputTokens: executed.inputTokens ?? 0,
        outputTokens: executed.outputTokens ?? 0,
        costMicro: executed.costMicro ?? 0,
        runLatencyMs: Date.now() - started,
        completedAt: new Date(),
      })
      .where(eq(agentRuns.id, run.id));
    await notifyRunFinished({
      runId: run.id,
      agentId: agent.id,
      agentName: agent.name,
      workspaceId,
      userId,
      status: "agent_run_completed",
      message: summary,
    });
    return;
  }

  const inserted = await db
    .insert(applicationRecords)
    .values(
      candidates.map((candidate, index) => ({
        agentId: agent.id,
        workspaceId,
        company: candidate.company,
        roleTitle: candidate.roleTitle,
        location: candidate.location,
        jobUrl: candidate.jobUrl,
        source: candidate.source,
        status: (index === 0 ? "needs_approval" : "matched") as "needs_approval" | "matched",
        resumeScore: candidate.resumeScore,
        coverLetter: candidate.coverLetter,
      })),
    )
    .returning();

  const top = [...inserted].sort((a, b) => (b.resumeScore ?? 0) - (a.resumeScore ?? 0))[0] ?? inserted[0];

  await db.insert(agentSteps).values([
    {
      agentId: agent.id,
      workspaceId,
      runId: run.id,
      type: "resume.matching",
      title: "Resume score calculated",
      description: `${top.company} ${top.roleTitle}: ${top.resumeScore ?? 0}% match.`,
      status: "completed",
      severity: "success",
      data: { applicationId: top.id, score: top.resumeScore ?? 0 },
    },
    {
      agentId: agent.id,
      workspaceId,
      runId: run.id,
      type: "cover_letter.generated",
      title: "Cover letter generated",
      description: `Prepared a tailored draft for ${top.company}.`,
      status: "completed",
      severity: "success",
      data: { applicationId: top.id },
    },
  ]);

  const [approval] = await db
    .insert(agentApprovals)
    .values({
      agentId: agent.id,
      workspaceId,
      runId: run.id,
      targetType: "application",
      targetId: top.id,
      title: `Apply to ${top.company} ${top.roleTitle}?`,
      description: "High-risk action paused. Review the job, resume score, and generated cover letter before submission.",
      riskLevel: "high",
      status: "pending",
      payload: {
        company: top.company,
        roleTitle: top.roleTitle,
        location: top.location,
        jobUrl: top.jobUrl,
        resumeScore: top.resumeScore,
        coverLetter: top.coverLetter,
      },
    })
    .returning();

  await db
    .update(applicationRecords)
    .set({ approvalId: approval.id })
    .where(eq(applicationRecords.id, top.id));

  await db.insert(agentSteps).values({
    agentId: agent.id,
    workspaceId,
    runId: run.id,
    type: "approval.requested",
    title: "Waiting for approval",
    description: approval.title,
    status: "waiting",
    severity: "warning",
    data: { approvalId: approval.id, applicationId: top.id },
  });

  await db.insert(agentMemories).values({
    agentId: agent.id,
    workspaceId,
    kind: "application_history",
    title: `Shortlisted ${top.company}`,
    body: `${top.company} ${top.roleTitle} matched at ${top.resumeScore ?? 0}%. Awaiting approval before submission.`,
    data: { approvalId: approval.id, applicationId: top.id },
    importance: 4,
  });

  await db.insert(recruiterContacts).values({
    agentId: agent.id,
    workspaceId,
    company: top.company,
    relationshipStage: "application_prepared",
  });

  const metrics = mergeMetrics(agent.metrics, {
    jobsFound: existing.length + inserted.length,
    jobsApplied: (agent.metrics as AgentMetricsJson | undefined)?.jobsApplied ?? 0,
    pendingApprovals: await pendingApprovalCount(workspaceId, agent.id),
    successScore: Math.max((agent.metrics as AgentMetricsJson | undefined)?.successScore ?? 0, top.resumeScore ?? 0),
  });

  await db
    .update(agents)
    .set({
      metrics,
      expectedActivity: "Discover jobs, dedupe matches, prepare applications, and wait for approval before submission.",
      lastRunAt: new Date(),
    })
    .where(eq(agents.id, agent.id));

  await db
    .update(agentRuns)
    .set({
      status: "succeeded",
      output: [
        summary,
        `Top match: ${top.company} ${top.roleTitle} (${top.resumeScore ?? 0}% resume score).`,
        "Generated a cover letter and paused before submitting the application.",
      ].join("\n"),
      provider: executed.provider,
      model: executed.model,
      inputTokens: executed.inputTokens ?? 0,
      outputTokens: executed.outputTokens ?? 0,
      costMicro: executed.costMicro ?? 0,
      runLatencyMs: Date.now() - started,
      completedAt: new Date(),
    })
    .where(eq(agentRuns.id, run.id));

  await notifyRunFinished({
    runId: run.id,
    agentId: agent.id,
    agentName: agent.name,
    workspaceId,
    userId,
    status: "agent_run_completed",
    message: `Found ${candidates.length} matching roles. Top match: ${top.company} (${top.resumeScore ?? 0}%).`,
  });

  await recordActivity({
    workspaceId,
    userId,
    type: "agent.approval.requested",
    title: `Agent "${agent.name}" needs approval`,
    description: approval.title,
    meta: { agentId: agent.id, agentRunId: run.id, approvalId: approval.id },
  });

  logger.info({ agentRunId: run.id, agentId: agent.id, approvalId: approval.id }, "job applying agent paused for approval");
}

async function pendingApprovalCount(workspaceId: string, agentId: string): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(agentApprovals)
    .where(
      and(
        eq(agentApprovals.workspaceId, workspaceId),
        eq(agentApprovals.agentId, agentId),
        eq(agentApprovals.status, "pending"),
      ),
    );
  return rows[0]?.count ?? 0;
}

/**
 * Execute one agent run: load run + agent → model pick → state machine →
 * tool-augmented LLM loop → persist output/cost/latency. Fails the run row
 * (with a clear message) when the provider call errors.
 */
export async function processAgent(job: Job<AgentJobPayload>): Promise<void> {
  const { agentRunId, agentId, workspaceId, userId } = job.data;

  const run = await db.query.agentRuns.findFirst({
    where: and(eq(agentRuns.id, agentRunId), eq(agentRuns.workspaceId, workspaceId)),
  });
  if (!run) {
    logger.warn({ agentRunId }, "agent run missing");
    return;
  }

  const agent = await db.query.agents.findFirst({
    where: and(eq(agents.id, agentId), eq(agents.workspaceId, workspaceId)),
  });
  if (!agent) {
    logger.warn({ agentId }, "agent missing");
    return;
  }

  await db
    .update(agentRuns)
    .set({ status: "running", startedAt: new Date() })
    .where(eq(agentRuns.id, agentRunId));

  if (agent.templateKey === "job_applying") {
    await processJobApplyingAgent({ run, agent, workspaceId, userId });
    return;
  }

  const model = await pickAgentModel(workspaceId, agent.modelId);

  // Initialize the state machine for this run
  const stateMachine = new AgentStateMachine(agentId, agentRunId, workspaceId, 25);
  stateMachine.start();

  // Broadcast agent.started event
  try {
    broadcastEvent(agentStartedEvent(agentId, agentRunId, workspaceId, run.input) as any);
  } catch { /* best-effort */ }

  await recordAgentStep({
    agentId, workspaceId, agentRunId,
    type: "agent.started",
    title: `Agent "${agent.name}" started`,
    description: run.input.slice(0, 240),
    status: "running",
    severity: "info",
    data: { model, goal: run.input },
  });

  // Tool context for this run
  const toolCtx: ToolContext = {
    workspaceId,
    agentId,
    agentRunId,
  };

  const MAX_ITERATIONS = 10;
  let iterationCount = 0;
  let finalOutput = "";
  const conversationHistory: { role: string; content: string }[] = [
    { role: "system", content: agent.systemPrompt },
    { role: "user", content: run.input },
  ];

  try {
    while (iterationCount < MAX_ITERATIONS) {
      iterationCount++;

      // --- PLAN / ACT phase ---
      stateMachine.transition("acting", `iteration ${iterationCount}`);
      await recordAgentStep({
        agentId, workspaceId, agentRunId,
        type: "agent.acting",
        title: `Iteration ${iterationCount}`,
        status: "running",
        severity: "info",
        data: { iteration: iterationCount },
      });

      // Call the LLM with current conversation
      const { run: executed } = await executeRun({
        workspaceId,
        userId: userId ?? "system",
        model,
        source: "agent",
        messages: conversationHistory as any,
        routingReason: "agent",
        allowRouting: false,
      });

      if (executed.status !== "succeeded" || !executed.output) {
        throw new Error(executed.errorMessage ?? "Agent run did not produce output");
      }

      const output = executed.output;
      conversationHistory.push({ role: "assistant", content: output });

      // --- OBSERVE phase ---
      stateMachine.transition("observing", "checking for tool calls");
      const toolCalls = parseToolCallsFromOutput(output);

      if (toolCalls.length === 0) {
        // No tool calls — agent is done
        finalOutput = output;
        await recordAgentStep({
          agentId, workspaceId, agentRunId,
          type: "agent.completed",
          title: "Agent completed the run",
          description: output.slice(0, 240),
          status: "completed",
          severity: "success",
          data: { iterations: iterationCount, output: output.slice(0, 1000) },
        });
        break;
      }

      // --- DECIDE phase ---
      stateMachine.transition("deciding", `executing ${toolCalls.length} tool(s)`);

      // --- ACT (tools) phase ---
      for (const toolInput of toolCalls) {
        await recordAgentStep({
          agentId, workspaceId, agentRunId,
          type: "tool.call",
          title: `Tool: ${toolInput.name}`,
          description: JSON.stringify(toolInput.args).slice(0, 240),
          status: "running",
          severity: "info",
          data: { tool: toolInput.name, args: toolInput.args },
        });

        const result = await executeTool(toolCtx, toolInput);
        const resultStr = result.ok
          ? `Result: ${result.output.slice(0, 2000)}`
          : `Error: ${result.error ?? "Unknown error"}`;

        conversationHistory.push({ role: "tool", content: resultStr });

        await recordAgentStep({
          agentId, workspaceId, agentRunId,
          type: "tool.result",
          title: `Tool ${toolInput.name} ${result.ok ? "succeeded" : "failed"}`,
          description: resultStr.slice(0, 240),
          status: result.ok ? "completed" : "failed",
          severity: result.ok ? "info" : "error",
          data: { tool: toolInput.name, ok: result.ok, output: result.output.slice(0, 1000) },
        });
      }

      // Trim conversation history to prevent token overflow
      if (conversationHistory.length > 20) {
        conversationHistory.splice(1, conversationHistory.length - 15);
      }
    }

    // If we ran out of iterations, mark as done with whatever we have
    if (!finalOutput) {
      finalOutput = conversationHistory[conversationHistory.length - 1]?.content ?? "";
      stateMachine.transition("done", "max iterations reached");
    }

    // Persist the run result
    await db
      .update(agentRuns)
      .set({
        status: "succeeded",
        output: finalOutput,
        provider: null,
        model,
        inputTokens: 0,
        outputTokens: 0,
        costMicro: 0,
        runLatencyMs: 0,
        errorMessage: null,
        completedAt: new Date(),
      })
      .where(eq(agentRuns.id, agentRunId));

    await db
      .update(agents)
      .set({ lastRunAt: new Date() })
      .where(eq(agents.id, agentId));

    // Broadcast agent.completed event
    try {
      broadcastEvent(agentCompletedEvent(agentId, agentRunId, true, finalOutput.slice(0, 240)) as any);
    } catch { /* best-effort */ }

    await recordActivity({
      workspaceId,
      userId,
      type: "agent.run.completed",
      title: `Agent "${agent.name}" completed a run`,
      description: finalOutput.slice(0, 240),
      meta: { agentId, agentRunId, model, iterations: iterationCount },
    });

    await notifyRunFinished({
      runId: agentRunId,
      agentId,
      agentName: agent.name,
      workspaceId,
      userId,
      status: "agent_run_completed",
      message: finalOutput.slice(0, 240),
    });

    logger.info({ agentRunId, agentId, model, iterations: iterationCount }, "agent run completed");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Agent run failed";
    stateMachine.fail(message);

    // Broadcast agent.failed event
    try {
      broadcastEvent(agentFailedEvent(agentId, agentRunId, message) as any);
    } catch { /* best-effort */ }

    await db
      .update(agentRuns)
      .set({ status: "failed", errorMessage: message, completedAt: new Date() })
      .where(eq(agentRuns.id, agentRunId));

    await recordAgentStep({
      agentId, workspaceId, agentRunId,
      type: "agent.failed",
      title: "Agent run failed",
      description: message.slice(0, 240),
      status: "failed",
      severity: "error",
      data: { error: message },
    });

    await notifyRunFinished({
      runId: agentRunId,
      agentId,
      agentName: agent.name,
      workspaceId,
      userId,
      status: "agent_run_failed",
      message,
    });

    logger.warn({ agentRunId, err: message }, "agent run failed");
    throw err;
  }
}
