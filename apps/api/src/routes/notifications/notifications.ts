import { Hono } from "hono";
import {
  listNotificationsQuerySchema,
  type ListNotificationsResponse,
  type MarkNotificationsReadResponse,
  type UnreadNotificationsResponse,
  markNotificationsReadRequestSchema,
} from "@layerflow/contracts";
import { requireAuth } from "../../middleware/auth";
import { rateLimit } from "../../middleware/rate-limit";
import {
  listNotifications,
  markNotificationsRead,
  unreadCount,
} from "../../services/notifications/notifications";
import type { AppEnv } from "../../types";

export const notificationsRouter = new Hono<AppEnv>();
notificationsRouter.use(requireAuth);
notificationsRouter.use(rateLimit({ requestsPerMinute: 60 }));

// GET /api/notifications — newest first
notificationsRouter.get("/", async (c) => {
  const workspaceId = c.get("workspaceId");
  const userId = c.get("userId");
  const query = listNotificationsQuerySchema.parse(c.req.query());
  const result = await listNotifications(workspaceId, userId, {
    limit: query.limit,
    offset: query.offset,
  });
  const response: ListNotificationsResponse = result;
  return c.json(response);
});

// PATCH /api/notifications/read — marks all when ids is omitted
notificationsRouter.patch("/read", async (c) => {
  const workspaceId = c.get("workspaceId");
  const userId = c.get("userId");
  const body = markNotificationsReadRequestSchema.parse(await c.req.json());
  const updated = await markNotificationsRead(workspaceId, userId, body.ids);
  const response: MarkNotificationsReadResponse = { updated };
  return c.json(response);
});

// GET /api/notifications/unread-count
notificationsRouter.get("/unread-count", async (c) => {
  const workspaceId = c.get("workspaceId");
  const userId = c.get("userId");
  const response: UnreadNotificationsResponse = { count: await unreadCount(workspaceId, userId) };
  return c.json(response);
});