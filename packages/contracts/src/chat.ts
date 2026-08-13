import { z } from "zod";
import { idSchema, timestampSchema } from "./common";

/**
 * Multi-AI chat workspace ("Continue my chat") contracts.
 * Every chat is one thread; messages can be answered by any model the
 * workspace has a key for, with automatic failover when a key dies.
 */

export const chatMessageRoleSchema = z.enum(["system", "user", "assistant"]);
export type ChatMessageRole = z.infer<typeof chatMessageRoleSchema>;

export const chatMessageRecordSchema = z.object({
  id: idSchema,
  sessionId: idSchema,
  role: chatMessageRoleSchema,
  content: z.string(),
  model: z.string().nullish(),
  provider: z.string().nullish(),
  /** Last 4 chars of the key that answered (platform keys: "platform:provider"). */
  keyHint: z.string().nullish(),
  tokensIn: z.number().int().nonnegative(),
  tokensOut: z.number().int().nonnegative(),
  /** Cost in USD (converted from integer micro-dollars). */
  cost: z.number().nonnegative(),
  latencyMs: z.number().int().nonnegative().nullish(),
  switchedFrom: z
    .object({
      fromModel: z.string(),
      toModel: z.string(),
      reason: z.string(),
    })
    .nullish(),
  errorCode: z.string().nullish(),
  errorMessage: z.string().nullish(),
  createdAt: timestampSchema,
});

export type ChatMessageRecord = z.infer<typeof chatMessageRecordSchema>;

export const chatSessionSchema = z.object({
  id: idSchema,
  workspaceId: idSchema,
  title: z.string(),
  source: z.enum(["new", "rescue"]),
  rescueReportId: idSchema.nullish(),
  defaultModel: z.string().nullish(),
  autoSwitch: z.boolean(),
  status: z.enum(["active", "archived"]),
  messageCount: z.number().int().nonnegative(),
  /** Cost of all assistant messages in USD. */
  cost: z.number().nonnegative(),
  lastMessageAt: timestampSchema.nullish(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export type ChatSession = z.infer<typeof chatSessionSchema>;

/** POST /api/chat */
export const createChatSessionRequestSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  defaultModel: z.string().optional(),
  autoSwitch: z.boolean().optional(),
  /** Import a completed rescue report into a new session. */
  rescueReportId: idSchema.optional(),
  /** Short summary to use as the session title when importing. */
  summary: z.string().max(2000).optional(),
});

export type CreateChatSessionRequest = z.infer<typeof createChatSessionRequestSchema>;

export const createChatSessionResponseSchema = z.object({
  session: chatSessionSchema,
});

export type CreateChatSessionResponse = z.infer<typeof createChatSessionResponseSchema>;

/** GET /api/chat */
export const listChatSessionsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  /** Case-insensitive title/content search. */
  q: z.string().max(200).optional(),
});

export const listChatSessionsResponseSchema = z.object({
  sessions: z.array(chatSessionSchema),
});

export type ListChatSessionsResponse = z.infer<typeof listChatSessionsResponseSchema>;

/** GET /api/chat/:id */
export const getChatSessionResponseSchema = z.object({
  session: chatSessionSchema,
  messages: z.array(chatMessageRecordSchema),
});

export type GetChatSessionResponse = z.infer<typeof getChatSessionResponseSchema>;

/** POST /api/chat/:id/messages — answers stream back as SSE events. */
export const sendChatMessageRequestSchema = z.object({
  content: z.string().min(1).max(24_000),
  /** Per-message model override; defaults to the session's default model. */
  model: z.string().optional(),
  autoSwitch: z.boolean().optional(),
});

export type SendChatMessageRequest = z.infer<typeof sendChatMessageRequestSchema>;

/** SSE events pushed by the streaming send endpoint. */
export const chatEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("start"),
    messageId: idSchema,
    model: z.string(),
    provider: z.string(),
    keyHint: z.string().nullable(),
  }),
  z.object({ type: z.literal("delta"), text: z.string() }),
  z.object({
    type: z.literal("switched"),
    fromModel: z.string(),
    toModel: z.string(),
    reason: z.string(),
  }),
  z.object({ type: z.literal("done"), message: chatMessageRecordSchema }),
  z.object({ type: z.literal("error"), code: z.string(), message: z.string() }),
]);

export type ChatEvent = z.infer<typeof chatEventSchema>;

/** POST /api/chat/:id/switch */
export const switchChatModelRequestSchema = z.object({
  model: z.string().min(1),
});

export type SwitchChatModelRequest = z.infer<typeof switchChatModelRequestSchema>;

/** PATCH /api/chat/:id/auto-switch */
export const setChatAutoSwitchRequestSchema = z.object({
  autoSwitch: z.boolean(),
});

export type SetChatAutoSwitchRequest = z.infer<typeof setChatAutoSwitchRequestSchema>;

/** PATCH /api/chat/:id — rename a conversation. */
export const renameChatSessionRequestSchema = z.object({
  title: z.string().trim().min(1).max(200),
});

export type RenameChatSessionRequest = z.infer<typeof renameChatSessionRequestSchema>;

export const renameChatSessionResponseSchema = z.object({
  session: chatSessionSchema,
});

export type RenameChatSessionResponse = z.infer<typeof renameChatSessionResponseSchema>;

export const switchChatModelResponseSchema = z.object({
  session: chatSessionSchema,
});

export type SwitchChatModelResponse = z.infer<typeof switchChatModelResponseSchema>;

/** DELETE /api/chat/:id */
export const archiveChatSessionResponseSchema = z.object({
  id: idSchema,
  archived: z.literal(true),
});

export type ArchiveChatSessionResponse = z.infer<typeof archiveChatSessionResponseSchema>;

/** GET /api/chat/keys-health — status dots for the model picker. */
export const chatKeyHealthSchema = z.object({
  provider: z.string(),
  status: z.enum(["healthy", "degrading", "dead", "expired", "missing"]),
  keyHint: z.string().nullish(),
  source: z.enum(["byok", "platform"]).nullish(),
  lastErrorCode: z.string().nullish(),
  lastErrorAt: timestampSchema.nullish(),
});

export type ChatKeyHealth = z.infer<typeof chatKeyHealthSchema>;

export const chatKeysHealthResponseSchema = z.object({
  providers: z.array(chatKeyHealthSchema),
});

export type ChatKeysHealthResponse = z.infer<typeof chatKeysHealthResponseSchema>;
