import { z } from "zod";
import { idSchema, microDollarsSchema, timestampSchema } from "./common";

export const promptSessionStatusSchema = z.enum(["active", "completed", "paused"]);
export type PromptSessionStatus = z.infer<typeof promptSessionStatusSchema>;

export const promptSessionSchema = z.object({
  id: idSchema,
  workspaceId: idSchema,
  domainId: idSchema.nullish(),
  projectId: idSchema.nullish(),
  title: z.string(),
  description: z.string().nullish(),
  status: promptSessionStatusSchema,
  totalCostMicro: microDollarsSchema,
  totalTokens: z.number().int().nonnegative(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export type PromptSession = z.infer<typeof promptSessionSchema>;

export const sessionMessageRoleSchema = z.enum(["user", "assistant", "system"]);
export type SessionMessageRole = z.infer<typeof sessionMessageRoleSchema>;

export const sessionMessageSchema = z.object({
  id: idSchema,
  sessionId: idSchema,
  role: sessionMessageRoleSchema,
  body: z.string(),
  promptId: idSchema.nullish(),
  promptVersionId: idSchema.nullish(),
  runId: idSchema.nullish(),
  position: z.number().int().nonnegative(),
  createdAt: timestampSchema,
});

export type SessionMessage = z.infer<typeof sessionMessageSchema>;

export const createSessionRequestSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  domainId: idSchema.optional(),
  projectId: idSchema.optional(),
});

export type CreateSessionRequest = z.infer<typeof createSessionRequestSchema>;

/** PATCH /api/sessions/:id */
export const updateSessionRequestSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(500).optional(),
  status: promptSessionStatusSchema.optional(),
});

export type UpdateSessionRequest = z.infer<typeof updateSessionRequestSchema>;

/** POST /api/sessions/:id/messages — append to the conversation chain. */
export const appendSessionMessageRequestSchema = z.object({
  role: sessionMessageRoleSchema,
  body: z.string().min(1),
  promptId: idSchema.optional(),
  promptVersionId: idSchema.optional(),
});

export type AppendSessionMessageRequest = z.infer<typeof appendSessionMessageRequestSchema>;

/** GET /api/sessions?projectId=&status= */
export const listSessionsQuerySchema = z.object({
  projectId: idSchema.optional(),
  domainId: idSchema.optional(),
  status: promptSessionStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

export type ListSessionsQuery = z.infer<typeof listSessionsQuerySchema>;

export const listSessionsResponseSchema = z.object({
  sessions: z.array(promptSessionSchema),
});

export type ListSessionsResponse = z.infer<typeof listSessionsResponseSchema>;

/** POST /api/sessions and PATCH /api/sessions/:id */
export const sessionResponseSchema = z.object({
  session: promptSessionSchema,
});

export type SessionResponse = z.infer<typeof sessionResponseSchema>;

/** GET /api/sessions/:id — session plus its ordered messages. */
export const sessionDetailResponseSchema = z.object({
  session: promptSessionSchema,
  messages: z.array(sessionMessageSchema),
});

export type SessionDetailResponse = z.infer<typeof sessionDetailResponseSchema>;

/** POST /api/sessions/:id/messages */
export const sessionMessageResponseSchema = z.object({
  message: sessionMessageSchema,
});

export type SessionMessageResponse = z.infer<typeof sessionMessageResponseSchema>;
