import { z } from "zod";
import { idSchema, timestampSchema } from "./common";

export const notificationKindSchema = z.enum([
  "agent_run_completed",
  "agent_run_failed",
  "system",
]);
export type NotificationKind = z.infer<typeof notificationKindSchema>;

export const notificationSchema = z.object({
  id: idSchema,
  workspaceId: idSchema.nullish(),
  userId: idSchema,
  kind: notificationKindSchema,
  title: z.string(),
  body: z.string().nullish(),
  agentId: idSchema.nullish(),
  read: z.boolean(),
  createdAt: timestampSchema,
});
export type Notification = z.infer<typeof notificationSchema>;

/** GET /api/notifications */
export const listNotificationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(30),
  offset: z.coerce.number().int().min(0).default(0),
});
export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;

export const listNotificationsResponseSchema = z.object({
  notifications: z.array(notificationSchema),
  total: z.number().int().nonnegative(),
});
export type ListNotificationsResponse = z.infer<typeof listNotificationsResponseSchema>;

/** PATCH /api/notifications/read — mark some (or all) notifications read. */
export const markNotificationsReadRequestSchema = z.object({
  ids: z.array(idSchema).max(100).optional(),
});
export type MarkNotificationsReadRequest = z.infer<typeof markNotificationsReadRequestSchema>;

export const markNotificationsReadResponseSchema = z.object({
  updated: z.number().int().nonnegative(),
});
export type MarkNotificationsReadResponse = z.infer<typeof markNotificationsReadResponseSchema>;

/** GET /api/notifications/unread-count */
export const unreadNotificationsResponseSchema = z.object({
  count: z.number().int().nonnegative(),
});
export type UnreadNotificationsResponse = z.infer<typeof unreadNotificationsResponseSchema>;