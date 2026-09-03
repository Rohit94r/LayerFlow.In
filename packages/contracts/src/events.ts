import { z } from "zod";
import { idSchema, microDollarsSchema, timestampSchema } from "./common";

/**
 * LayerFlow Event System — shared event protocol consumed by both web and
 * terminal. Every event is a discriminated union on `type`, making them
 * safe to serialise over SSE, WebSocket, or a message queue.
 *
 * Usage (producer):
 *   const event: AgentEvent = { type: "agent.started", agentId, runId, ts };
 *
 * Usage (consumer):
 *   switch (event.type) { case "session.created": ... }
 */

// ── Session lifecycle ──────────────────────────────────────────

export const sessionCreatedEventSchema = z.object({
  type: z.literal("session.created"),
  sessionId: idSchema,
  workspaceId: idSchema,
  userId: idSchema,
  ts: timestampSchema,
});
export type SessionCreatedEvent = z.infer<typeof sessionCreatedEventSchema>;

// ── Chat / message events ──────────────────────────────────────

export const messageUserEventSchema = z.object({
  type: z.literal("message.user"),
  messageId: idSchema,
  sessionId: idSchema,
  content: z.string(),
  ts: timestampSchema,
});
export type MessageUserEvent = z.infer<typeof messageUserEventSchema>;

export const messageAssistantDeltaEventSchema = z.object({
  type: z.literal("message.assistant.delta"),
  messageId: idSchema,
  sessionId: idSchema,
  delta: z.string(),
  ts: timestampSchema,
});
export type MessageAssistantDeltaEvent = z.infer<typeof messageAssistantDeltaEventSchema>;

export const messageAssistantCompletedEventSchema = z.object({
  type: z.literal("message.assistant.completed"),
  messageId: idSchema,
  sessionId: idSchema,
  model: z.string(),
  provider: z.string(),
  tokensIn: z.number().int().nonnegative(),
  tokensOut: z.number().int().nonnegative(),
  cost: z.number().nonnegative(),
  latencyMs: z.number().int().nonnegative().nullish(),
  ts: timestampSchema,
});
export type MessageAssistantCompletedEvent = z.infer<typeof messageAssistantCompletedEventSchema>;

// ── Tool lifecycle ─────────────────────────────────────────────

export const toolRequestedEventSchema = z.object({
  type: z.literal("tool.requested"),
  toolCallId: z.string(),
  agentId: idSchema.nullish(),
  runId: idSchema.nullish(),
  name: z.string(),
  args: z.record(z.string(), z.unknown()),
  ts: timestampSchema,
});
export type ToolRequestedEvent = z.infer<typeof toolRequestedEventSchema>;

export const toolStartedEventSchema = z.object({
  type: z.literal("tool.started"),
  toolCallId: z.string(),
  ts: timestampSchema,
});
export type ToolStartedEvent = z.infer<typeof toolStartedEventSchema>;

export const toolCompletedEventSchema = z.object({
  type: z.literal("tool.completed"),
  toolCallId: z.string(),
  ok: z.boolean(),
  output: z.string(),
  error: z.string().nullish(),
  ts: timestampSchema,
});
export type ToolCompletedEvent = z.infer<typeof toolCompletedEventSchema>;

// ── Approval events ────────────────────────────────────────────

export const approvalRequestedEventSchema = z.object({
  type: z.literal("approval.requested"),
  approvalId: idSchema,
  agentId: idSchema,
  runId: idSchema.nullish(),
  title: z.string(),
  description: z.string().nullish(),
  ts: timestampSchema,
});
export type ApprovalRequestedEvent = z.infer<typeof approvalRequestedEventSchema>;

export const approvalApprovedEventSchema = z.object({
  type: z.literal("approval.approved"),
  approvalId: idSchema,
  agentId: idSchema,
  userId: idSchema,
  note: z.string().nullish(),
  ts: timestampSchema,
});
export type ApprovalApprovedEvent = z.infer<typeof approvalApprovedEventSchema>;

export const approvalDeniedEventSchema = z.object({
  type: z.literal("approval.denied"),
  approvalId: idSchema,
  agentId: idSchema,
  userId: idSchema,
  note: z.string().nullish(),
  ts: timestampSchema,
});
export type ApprovalDeniedEvent = z.infer<typeof approvalDeniedEventSchema>;

// ── Agent lifecycle ────────────────────────────────────────────

export const agentStartedEventSchema = z.object({
  type: z.literal("agent.started"),
  agentId: idSchema,
  runId: idSchema,
  workspaceId: idSchema,
  goal: z.string().nullish(),
  ts: timestampSchema,
});
export type AgentStartedEvent = z.infer<typeof agentStartedEventSchema>;

export const agentProgressEventSchema = z.object({
  type: z.literal("agent.progress"),
  agentId: idSchema,
  runId: idSchema,
  step: z.string(),
  status: z.enum(["running", "waiting_approval", "paused"]),
  ts: timestampSchema,
});
export type AgentProgressEvent = z.infer<typeof agentProgressEventSchema>;

export const agentCompletedEventSchema = z.object({
  type: z.literal("agent.completed"),
  agentId: idSchema,
  runId: idSchema,
  success: z.boolean(),
  summary: z.string().nullish(),
  ts: timestampSchema,
});
export type AgentCompletedEvent = z.infer<typeof agentCompletedEventSchema>;

export const agentFailedEventSchema = z.object({
  type: z.literal("agent.failed"),
  agentId: idSchema,
  runId: idSchema,
  error: z.string(),
  ts: timestampSchema,
});
export type AgentFailedEvent = z.infer<typeof agentFailedEventSchema>;

// ── Usage events ───────────────────────────────────────────────

export const usageUpdatedEventSchema = z.object({
  type: z.literal("usage.updated"),
  workspaceId: idSchema,
  period: z.string(),
  spentMicro: microDollarsSchema,
  limitMicro: microDollarsSchema,
  pctUsed: z.number().min(0).max(100),
  ts: timestampSchema,
});
export type UsageUpdatedEvent = z.infer<typeof usageUpdatedEventSchema>;

// ── Discriminated union ────────────────────────────────────────

export const layerFlowEventSchema = z.discriminatedUnion("type", [
  sessionCreatedEventSchema,
  messageUserEventSchema,
  messageAssistantDeltaEventSchema,
  messageAssistantCompletedEventSchema,
  toolRequestedEventSchema,
  toolStartedEventSchema,
  toolCompletedEventSchema,
  approvalRequestedEventSchema,
  approvalApprovedEventSchema,
  approvalDeniedEventSchema,
  agentStartedEventSchema,
  agentProgressEventSchema,
  agentCompletedEventSchema,
  agentFailedEventSchema,
  usageUpdatedEventSchema,
]);

export type LayerFlowEvent = z.infer<typeof layerFlowEventSchema>;

/** A type-level mapping from event type string to its inferred TypeScript type. */
export type LayerFlowEventMap = {
  "session.created": SessionCreatedEvent;
  "message.user": MessageUserEvent;
  "message.assistant.delta": MessageAssistantDeltaEvent;
  "message.assistant.completed": MessageAssistantCompletedEvent;
  "tool.requested": ToolRequestedEvent;
  "tool.started": ToolStartedEvent;
  "tool.completed": ToolCompletedEvent;
  "approval.requested": ApprovalRequestedEvent;
  "approval.approved": ApprovalApprovedEvent;
  "approval.denied": ApprovalDeniedEvent;
  "agent.started": AgentStartedEvent;
  "agent.progress": AgentProgressEvent;
  "agent.completed": AgentCompletedEvent;
  "agent.failed": AgentFailedEvent;
  "usage.updated": UsageUpdatedEvent;
};