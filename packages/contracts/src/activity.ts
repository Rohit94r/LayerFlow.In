import { z } from "zod";
import { idSchema, timestampSchema } from "./common";

/**
 * A workspace activity feed entry ("Alex created prompt X").
 * `type` is a dotted event name like "prompt.created" or "project.updated".
 */
export const activityEventSchema = z.object({
  id: idSchema,
  workspaceId: idSchema,
  userId: idSchema.nullish(),
  type: z.string(),
  title: z.string(),
  description: z.string().nullish(),
  meta: z.record(z.string(), z.unknown()).nullish(),
  createdAt: timestampSchema,
});

export type ActivityEvent = z.infer<typeof activityEventSchema>;

/** GET /api/activity */
export const listActivityQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(30),
  offset: z.coerce.number().int().min(0).default(0),
});

export type ListActivityQuery = z.infer<typeof listActivityQuerySchema>;

export const listActivityResponseSchema = z.object({
  events: z.array(activityEventSchema),
});

export type ListActivityResponse = z.infer<typeof listActivityResponseSchema>;
