import { z } from "zod";
import { idSchema, timestampSchema } from "./common";

/**
 * LayerFlow Agents V2.
 *
 * Agents are durable AI workers: onboarding state, scoped permissions, run
 * steps, approvals, memory, documents, and downstream records all live outside
 * the transient model call so work can continue across sessions/devices.
 */

const jsonObjectSchema = z.record(z.string(), z.unknown());

export const agentRoleSchema = z.enum([
  "implement",
  "review",
  "test",
  "custom",
  "job_apply",
  "internship_hunter",
  "linkedin_outreach",
  "research",
  "scholarship",
  "startup_research",
  "content_repurposing",
  "meeting_followup",
]);
export type AgentRole = z.infer<typeof agentRoleSchema>;

export const agentTemplateKeySchema = z.enum([
  "job_applying",
  "internship_hunter",
  "linkedin_outreach",
  "research",
  "scholarship_finder",
  "startup_research",
  "content_repurposing",
  "meeting_followup",
]);
export type AgentTemplateKey = z.infer<typeof agentTemplateKeySchema>;

export const agentStatusSchema = z.enum(["active", "paused"]);
export type AgentStatus = z.infer<typeof agentStatusSchema>;

export const agentRunStatusSchema = z.enum(["queued", "running", "succeeded", "failed"]);
export type AgentRunStatus = z.infer<typeof agentRunStatusSchema>;

export const agentPermissionModeSchema = z.enum(["allow_once", "allow_always", "deny"]);
export type AgentPermissionMode = z.infer<typeof agentPermissionModeSchema>;

export const agentPermissionDefinitionSchema = z.object({
  key: z.string().min(2).max(80),
  label: z.string().min(2).max(140),
  description: z.string().max(500).optional(),
  category: z.string().max(80).optional(),
  mode: agentPermissionModeSchema.default("deny"),
});
export type AgentPermissionDefinition = z.infer<typeof agentPermissionDefinitionSchema>;

export const agentMetricsSchema = z.object({
  jobsFound: z.number().int().nonnegative().default(0),
  jobsApplied: z.number().int().nonnegative().default(0),
  interviewsScheduled: z.number().int().nonnegative().default(0),
  pendingApprovals: z.number().int().nonnegative().default(0),
  responsesReceived: z.number().int().nonnegative().default(0),
  rejections: z.number().int().nonnegative().default(0),
  successScore: z.number().int().min(0).max(100).default(0),
});
export type AgentMetrics = z.infer<typeof agentMetricsSchema>;

export const agentSchema = z.object({
  id: idSchema,
  workspaceId: idSchema,
  name: z.string(),
  role: agentRoleSchema,
  templateKey: agentTemplateKeySchema.nullish(),
  goal: z.string().nullish(),
  systemPrompt: z.string(),
  modelId: z.string().nullish(),
  temperature: z.number().min(0).max(2).nullish(),
  status: agentStatusSchema,
  tools: z.array(z.string()),
  schedule: z.string().nullish(),
  scheduleCron: z.string().nullish(),
  scheduleTz: z.string().nullish(),
  schedulingEnabled: z.boolean().nullish(),
  expectedActivity: z.string().nullish(),
  estimatedUsage: z.string().nullish(),
  onboarding: jsonObjectSchema,
  metrics: agentMetricsSchema,
  isDemo: z.boolean().default(false),
  lastRunAt: timestampSchema.nullish(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});
export type Agent = z.infer<typeof agentSchema>;

/** Agent + run summary for list views. */
export const agentWithUsageSchema = agentSchema.extend({
  runCount: z.number().int().nonnegative(),
  /** Total run cost in USD. */
  totalCost: z.number().nonnegative(),
  lastRunStatus: agentRunStatusSchema.nullish(),
});
export type AgentWithUsage = z.infer<typeof agentWithUsageSchema>;

export const agentRunSchema = z.object({
  id: idSchema,
  agentId: idSchema,
  workspaceId: idSchema,
  input: z.string(),
  output: z.string().nullish(),
  status: agentRunStatusSchema,
  errorMessage: z.string().nullish(),
  provider: z.string().nullish(),
  model: z.string().nullish(),
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  /** Cost in USD (converted from micro-dollars). */
  cost: z.number().nonnegative(),
  /** Cost in micro-dollars (1e-6 USD) — for charts. */
  costMicro: z.number().int().nonnegative(),
  runLatencyMs: z.number().int().nonnegative().nullish(),
  startedAt: timestampSchema.nullish(),
  completedAt: timestampSchema.nullish(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});
export type AgentRun = z.infer<typeof agentRunSchema>;

export const agentTemplateSchema = z.object({
  key: agentTemplateKeySchema,
  name: z.string(),
  description: z.string(),
  category: z.string(),
  permissions: z.array(agentPermissionDefinitionSchema),
  estimatedCost: z.string(),
  expectedOutcome: z.string(),
  defaultSchedule: z.string(),
});
export type AgentTemplate = z.infer<typeof agentTemplateSchema>;

export const agentPermissionSchema = z.object({
  id: idSchema,
  agentId: idSchema,
  workspaceId: idSchema,
  key: z.string(),
  label: z.string(),
  description: z.string().nullish(),
  category: z.string().nullish(),
  mode: agentPermissionModeSchema,
  grantedByUserId: z.string().nullish(),
  grantedAt: timestampSchema.nullish(),
  expiresAt: timestampSchema.nullish(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});
export type AgentPermission = z.infer<typeof agentPermissionSchema>;

export const agentStepStatusSchema = z.enum(["queued", "running", "waiting", "completed", "failed"]);
export type AgentStepStatus = z.infer<typeof agentStepStatusSchema>;

export const agentStepSchema = z.object({
  id: idSchema,
  agentId: idSchema,
  workspaceId: idSchema,
  runId: idSchema.nullish(),
  type: z.string(),
  title: z.string(),
  description: z.string().nullish(),
  status: agentStepStatusSchema,
  severity: z.enum(["info", "success", "warning", "danger"]).default("info"),
  data: jsonObjectSchema,
  occurredAt: timestampSchema,
  createdAt: timestampSchema,
});
export type AgentStep = z.infer<typeof agentStepSchema>;

export const agentApprovalStatusSchema = z.enum(["pending", "approved", "rejected", "edited"]);
export type AgentApprovalStatus = z.infer<typeof agentApprovalStatusSchema>;

export const agentApprovalSchema = z.object({
  id: idSchema,
  agentId: idSchema,
  workspaceId: idSchema,
  runId: idSchema.nullish(),
  targetType: z.string(),
  targetId: z.string().nullish(),
  title: z.string(),
  description: z.string().nullish(),
  riskLevel: z.enum(["low", "medium", "high"]),
  status: agentApprovalStatusSchema,
  payload: jsonObjectSchema,
  decisionNote: z.string().nullish(),
  decidedByUserId: z.string().nullish(),
  decidedAt: timestampSchema.nullish(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});
export type AgentApproval = z.infer<typeof agentApprovalSchema>;

export const agentMemorySchema = z.object({
  id: idSchema,
  agentId: idSchema,
  workspaceId: idSchema,
  kind: z.string(),
  title: z.string(),
  body: z.string(),
  data: jsonObjectSchema,
  importance: z.number().int().min(1).max(5),
  lastUsedAt: timestampSchema.nullish(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});
export type AgentMemory = z.infer<typeof agentMemorySchema>;

export const agentDocumentSchema = z.object({
  id: idSchema,
  agentId: idSchema,
  workspaceId: idSchema,
  fileId: idSchema.nullish(),
  documentType: z.enum(["resume", "cover_letter", "portfolio", "certificate", "other"]),
  title: z.string(),
  fileName: z.string().nullish(),
  mimeType: z.string().nullish(),
  status: z.enum(["uploaded", "parsed", "failed"]),
  encrypted: z.boolean(),
  extraction: jsonObjectSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});
export type AgentDocument = z.infer<typeof agentDocumentSchema>;

export const applicationRecordSchema = z.object({
  id: idSchema,
  agentId: idSchema,
  workspaceId: idSchema,
  approvalId: idSchema.nullish(),
  company: z.string(),
  roleTitle: z.string(),
  location: z.string().nullish(),
  jobUrl: z.string().nullish(),
  source: z.string().nullish(),
  status: z.enum([
    "discovered",
    "matched",
    "needs_approval",
    "submitted",
    "interview",
    "rejected",
    "withdrawn",
  ]),
  resumeScore: z.number().int().min(0).max(100).nullish(),
  coverLetter: z.string().nullish(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});
export type ApplicationRecord = z.infer<typeof applicationRecordSchema>;

export const interviewRecordSchema = z.object({
  id: idSchema,
  agentId: idSchema,
  workspaceId: idSchema,
  applicationId: idSchema.nullish(),
  company: z.string(),
  roleTitle: z.string(),
  scheduledAt: timestampSchema.nullish(),
  timeZone: z.string().nullish(),
  format: z.string().nullish(),
  status: z.enum(["scheduled", "completed", "cancelled"]),
  feedback: z.string().nullish(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});
export type InterviewRecord = z.infer<typeof interviewRecordSchema>;

export const recruiterContactSchema = z.object({
  id: idSchema,
  agentId: idSchema,
  workspaceId: idSchema,
  company: z.string(),
  name: z.string().nullish(),
  email: z.string().nullish(),
  linkedinUrl: z.string().nullish(),
  relationshipStage: z.string().nullish(),
  lastContactAt: timestampSchema.nullish(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});
export type RecruiterContact = z.infer<typeof recruiterContactSchema>;

/** POST /api/agents */
export const createAgentRequestSchema = z.object({
  name: z.string().min(2).max(80),
  role: agentRoleSchema.optional(),
  templateKey: agentTemplateKeySchema.nullish(),
  goal: z.string().max(2_000).nullish(),
  systemPrompt: z.string().min(10).max(30_000),
  modelId: z.string().max(100).nullish(),
  temperature: z.number().min(0).max(2).nullish(),
  tools: z.array(z.string().max(40)).max(16).optional(),
  schedule: z.string().max(300).nullish(),
  scheduleCron: z.string().max(64).nullish(),
  scheduleTz: z.string().max(64).nullish(),
  schedulingEnabled: z.boolean().optional(),
  expectedActivity: z.string().max(1_000).nullish(),
  estimatedUsage: z.string().max(500).nullish(),
  onboarding: jsonObjectSchema.optional(),
  metrics: agentMetricsSchema.partial().optional(),
  permissions: z.array(agentPermissionDefinitionSchema).max(24).optional(),
});
export type CreateAgentRequest = z.infer<typeof createAgentRequestSchema>;

export const createAgentResponseSchema = z.object({ agent: agentSchema });
export type CreateAgentResponse = z.infer<typeof createAgentResponseSchema>;

/** PATCH /api/agents/:id */
export const updateAgentRequestSchema = createAgentRequestSchema
  .partial()
  .extend({ status: agentStatusSchema.optional() });
export type UpdateAgentRequest = z.infer<typeof updateAgentRequestSchema>;

export const updateAgentResponseSchema = z.object({ agent: agentSchema });
export type UpdateAgentResponse = z.infer<typeof updateAgentResponseSchema>;

/** GET /api/agents/templates */
export const listAgentTemplatesResponseSchema = z.object({
  templates: z.array(agentTemplateSchema),
});
export type ListAgentTemplatesResponse = z.infer<typeof listAgentTemplatesResponseSchema>;

/** GET /api/agents */
export const listAgentsResponseSchema = z.object({
  agents: z.array(agentWithUsageSchema),
});
export type ListAgentsResponse = z.infer<typeof listAgentsResponseSchema>;

/** GET /api/agents/:id */
export const getAgentResponseSchema = z.object({
  agent: agentSchema,
  runs: z.array(agentRunSchema),
});
export type GetAgentResponse = z.infer<typeof getAgentResponseSchema>;

/** DELETE /api/agents/:id */
export const deleteAgentResponseSchema = z.object({
  id: idSchema,
  deleted: z.literal(true),
});
export type DeleteAgentResponse = z.infer<typeof deleteAgentResponseSchema>;

/** POST /api/agents/:id/start and POST /api/agents/:id/runs */
export const createAgentRunRequestSchema = z.object({
  input: z.string().min(1).max(24_000),
});
export type CreateAgentRunRequest = z.infer<typeof createAgentRunRequestSchema>;

export const createAgentRunResponseSchema = z.object({ run: agentRunSchema });
export type CreateAgentRunResponse = z.infer<typeof createAgentRunResponseSchema>;

export const startAgentResponseSchema = z.object({
  agent: agentSchema,
  run: agentRunSchema,
});
export type StartAgentResponse = z.infer<typeof startAgentResponseSchema>;

/** GET /api/agents/:id/runs */
export const listAgentRunsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(30),
  offset: z.coerce.number().int().min(0).default(0),
});
export type ListAgentRunsQuery = z.infer<typeof listAgentRunsQuerySchema>;

export const listAgentRunsResponseSchema = z.object({
  runs: z.array(agentRunSchema),
});
export type ListAgentRunsResponse = z.infer<typeof listAgentRunsResponseSchema>;

/** GET /api/agents/runs/:runId */
export const getAgentRunResponseSchema = z.object({ run: agentRunSchema });
export type GetAgentRunResponse = z.infer<typeof getAgentRunResponseSchema>;

export const agentProgressOverviewSchema = z.object({
  status: z.string(),
  startedAt: timestampSchema.nullish(),
  lastAction: z.string().nullish(),
  nextAction: z.string().nullish(),
});
export type AgentProgressOverview = z.infer<typeof agentProgressOverviewSchema>;

/** GET /api/agents/:id/progress */
export const agentProgressResponseSchema = z.object({
  agent: agentSchema,
  overview: agentProgressOverviewSchema,
  metrics: agentMetricsSchema,
  timeline: z.array(agentStepSchema),
  pendingApprovals: z.array(agentApprovalSchema),
  applications: z.array(applicationRecordSchema),
  memories: z.array(agentMemorySchema),
  documents: z.array(agentDocumentSchema),
});
export type AgentProgressResponse = z.infer<typeof agentProgressResponseSchema>;

/** GET /api/agents/:id/logs */
export const agentLogsResponseSchema = z.object({
  steps: z.array(agentStepSchema),
});
export type AgentLogsResponse = z.infer<typeof agentLogsResponseSchema>;

/** POST /api/agents/:id/approve */
export const agentApprovalDecisionRequestSchema = z.object({
  approvalId: idSchema,
  decision: z.enum(["approve", "reject", "edit", "approve_similar"]),
  note: z.string().max(2_000).optional(),
  editedPayload: jsonObjectSchema.optional(),
});
export type AgentApprovalDecisionRequest = z.infer<typeof agentApprovalDecisionRequestSchema>;

export const agentApprovalDecisionResponseSchema = z.object({
  approval: agentApprovalSchema,
  agent: agentSchema,
});
export type AgentApprovalDecisionResponse = z.infer<typeof agentApprovalDecisionResponseSchema>;

/** POST /api/agents/:id/upload-resume */
export const uploadAgentResumeRequestSchema = z.object({
  fileId: idSchema.nullish(),
  fileName: z.string().min(1).max(240),
  mimeType: z.string().max(120).nullish(),
  sizeBytes: z.number().int().nonnegative().optional(),
  extraction: jsonObjectSchema.optional(),
});
export type UploadAgentResumeRequest = z.infer<typeof uploadAgentResumeRequestSchema>;

export const uploadAgentResumeResponseSchema = z.object({
  document: agentDocumentSchema,
});
export type UploadAgentResumeResponse = z.infer<typeof uploadAgentResumeResponseSchema>;

/** GET/POST /api/agents/:id/schedule */
export const agentScheduleSchema = z.object({
  cron: z.string().nullish(),
  timezone: z.string().nullish(),
  enabled: z.boolean(),
});
export type AgentSchedule = z.infer<typeof agentScheduleSchema>;

export const setAgentScheduleRequestSchema = z.object({
  cron: z.string().min(3).max(64),
  timezone: z.string().min(1).max(64).default("UTC"),
  enabled: z.boolean().optional(),
});
export type SetAgentScheduleRequest = z.infer<typeof setAgentScheduleRequestSchema>;

export const getAgentScheduleResponseSchema = z.object({ schedule: agentScheduleSchema });
export type GetAgentScheduleResponse = z.infer<typeof getAgentScheduleResponseSchema>;

export const setAgentScheduleResponseSchema = z.object({
  agent: agentSchema,
  schedule: agentScheduleSchema,
});
export type SetAgentScheduleResponse = z.infer<typeof setAgentScheduleResponseSchema>;
