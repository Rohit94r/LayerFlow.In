import type { CostReportQuery } from "@layerflow/contracts";
import { costReportQuerySchema } from "@layerflow/contracts";
import { Hono } from "hono";
import { requireAuth } from "../../middleware/auth";
import { AppError } from "../../middleware/app-error";
import { canExportCostReports } from "../../middleware/plan-limits";
import { costReportCsv, getCostReport } from "../../services/reports/costs";
import type { AppEnv } from "../../types";

/**
 * GET /api/report/costs?format=csv|json&from=YYYY-MM-DD&to=YYYY-MM-DD&projectId=...
 *
 * Pro-gated cost report. CSV is served as an attachment with the full aggregated
 * ledger for the window (one row per date/project/provider/model/source).
 */
export const reportsRouter = new Hono<AppEnv>();
reportsRouter.use(requireAuth);

reportsRouter.get("/costs", async (c) => {
  const parsed = costReportQuerySchema.parse({
    format: c.req.query("format") ?? "csv",
    from: c.req.query("from") ?? undefined,
    to: c.req.query("to") ?? undefined,
    projectId: c.req.query("projectId") ?? undefined,
  });
  const query: CostReportQuery = parsed;

  const workspaceId = c.get("workspaceId");
  const access = await canExportCostReports(workspaceId);
  if (!access.allowed) {
    throw new AppError(402, "plan_required", access.reason ?? "Pro feature");
  }

  const result = await getCostReport(workspaceId, query);

  if (query.format === "json") {
    return c.json({ from: result.from, to: result.to, rows: result.rows });
  }

  const csv = costReportCsv(result.rows);
  return c.newResponse(csv, 200, {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="layerflow-cost-report-${result.from}-${result.to}-${query.format}.csv"`,
  });
});