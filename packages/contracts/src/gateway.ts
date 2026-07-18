import { z } from "zod";

/** Minimal OpenAI-compatible chat message. */
export const chatMessageSchema = z.object({
  role: z.enum(["system", "user", "assistant", "tool", "function"]),
  content: z.union([z.string(), z.array(z.unknown()), z.null()]).optional(),
  name: z.string().optional(),
  tool_calls: z.array(z.unknown()).optional(),
  tool_call_id: z.string().optional(),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;

/** POST /v1/chat/completions body (OpenAI-shaped subset). */
export const chatCompletionsRequestSchema = z.object({
  model: z.string().min(1),
  messages: z.array(chatMessageSchema).min(1),
  temperature: z.number().min(0).max(2).optional(),
  top_p: z.number().min(0).max(1).optional(),
  max_tokens: z.number().int().positive().optional(),
  max_completion_tokens: z.number().int().positive().optional(),
  stream: z.boolean().optional(),
  stop: z.union([z.string(), z.array(z.string())]).optional(),
  user: z.string().optional(),
  /** LayerFlow extension: optional project attribution for budget scopes. */
  project_id: z.string().optional(),
});

export type ChatCompletionsRequest = z.infer<typeof chatCompletionsRequestSchema>;

export const gatewayModelSchema = z.object({
  id: z.string(),
  object: z.literal("model"),
  owned_by: z.string(),
  /** True when the workspace has a non-revoked BYOK key for this provider. */
  available: z.boolean(),
});

export type GatewayModel = z.infer<typeof gatewayModelSchema>;

export const listModelsResponseSchema = z.object({
  object: z.literal("list"),
  data: z.array(gatewayModelSchema),
});

export type ListModelsResponse = z.infer<typeof listModelsResponseSchema>;
