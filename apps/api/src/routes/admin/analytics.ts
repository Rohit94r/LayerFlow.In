import { Hono } from "hono";
import type { AdminAnalyticsResponse } from "@layerflow/contracts";
import { requireAuth } from "../../middleware/auth";
import { requireAdminEmail } from "../../middleware/admin";
import { getAdminAnalytics } from "../../services/admin/analytics";
import type { AppEnv } from "../../types";

export const adminRouter = new Hono<AppEnv>();
adminRouter.use(requireAuth);
adminRouter.use(requireAdminEmail);

// GET /api/admin/analytics
adminRouter.get("/analytics", async (c) => {
  const response: AdminAnalyticsResponse = await getAdminAnalytics();
  return c.json(response);
});
