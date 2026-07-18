import { Hono } from "hono";
import {
  usageSummaryQuerySchema,
  type SavingsResponse,
  type UsageAlertsResponse,
  type UsageSummaryResponse,
} from "@layerflow/contracts";
import { requireAuth } from "../../middleware/auth";
import { getSavings, getUsageAlerts, getUsageSummary } from "../../services/budgets/usage";
import type { AppEnv } from "../../types";

export const usageRouter = new Hono<AppEnv>();
usageRouter.use(requireAuth);

// GET /api/usage/summary
usageRouter.get("/summary", async (c) => {
  const query = usageSummaryQuerySchema.parse({
    from: c.req.query("from"),
    to: c.req.query("to"),
    groupBy: c.req.query("groupBy") ?? "day",
  });
  const result = await getUsageSummary(c.get("workspaceId"), query);
  const response: UsageSummaryResponse = result;
  return c.json(response);
});

// GET /api/usage/alerts
usageRouter.get("/alerts", async (c) => {
  const alerts = await getUsageAlerts(c.get("workspaceId"));
  const response: UsageAlertsResponse = { alerts };
  return c.json(response);
});

export const savingsRouter = new Hono<AppEnv>();
savingsRouter.use(requireAuth);

// GET /api/savings
savingsRouter.get("/", async (c) => {
  const response: SavingsResponse = await getSavings(c.get("workspaceId"));
  return c.json(response);
});
