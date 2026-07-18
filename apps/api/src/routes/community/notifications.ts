import { Hono } from "hono";
import {
  markNotificationsReadRequestSchema,
  type ListNotificationsResponse,
  type MarkNotificationsReadResponse,
} from "@layerflow/contracts";
import { requireAuth } from "../../middleware/auth";
import {
  listNotifications,
  markNotificationsRead,
} from "../../services/community/notifications";
import type { AppEnv } from "../../types";

export const notificationsRouter = new Hono<AppEnv>();
notificationsRouter.use(requireAuth);

// GET /api/notifications
notificationsRouter.get("/", async (c) => {
  const result = await listNotifications(c.get("userId"));
  const response: ListNotificationsResponse = result;
  return c.json(response);
});

// POST /api/notifications/read
notificationsRouter.post("/read", async (c) => {
  const body = markNotificationsReadRequestSchema.parse(await c.req.json());
  const updated = await markNotificationsRead(c.get("userId"), body);
  const response: MarkNotificationsReadResponse = { updated };
  return c.json(response);
});
