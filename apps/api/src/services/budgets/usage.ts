import { and, eq, gte, sql } from "drizzle-orm";
import type {
  SavingsResponse,
  UsageAlert,
  UsageSummaryBucket,
  UsageSummaryQuery,
} from "@layerflow/contracts";
import { currentPeriod, getLiveDailySpent, getLiveMonthlySpent } from "../../budgets/enforce";
import { db } from "../../db/client";
import { usageLedger, usageRollups } from "../../db/schema/cost";
import { getOrCreateCurrentBudget } from "./current";

function defaultFromTo(): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString().slice(0, 10);
  const fromDate = new Date(now);
  fromDate.setUTCDate(fromDate.getUTCDate() - 30);
  return { from: fromDate.toISOString().slice(0, 10), to };
}

export async function getUsageSummary(
  workspaceId: string,
  query: UsageSummaryQuery,
): Promise<{ buckets: UsageSummaryBucket[]; source: "rollups" | "ledger" }> {
  const { from, to } = {
    from: query.from ?? defaultFromTo().from,
    to: query.to ?? defaultFromTo().to,
  };

  const rollups = await db.query.usageRollups.findMany({
    where: (r, { and, eq, gte, lte }) =>
      and(eq(r.workspaceId, workspaceId), gte(r.day, from), lte(r.day, to)),
  });

  if (rollups.length > 0) {
    return { buckets: aggregateRollups(rollups, query.groupBy), source: "rollups" };
  }

  // Fallback: aggregate from immutable ledger.
  const ledger = await db.query.usageLedger.findMany({
    where: (l, { and, eq, gte, lte }) =>
      and(
        eq(l.workspaceId, workspaceId),
        gte(l.createdAt, new Date(`${from}T00:00:00.000Z`)),
        lte(l.createdAt, new Date(`${to}T23:59:59.999Z`)),
      ),
  });

  const map = new Map<string, UsageSummaryBucket>();
  for (const row of ledger) {
    const day = row.createdAt.toISOString().slice(0, 10);
    const key = bucketKey(query.groupBy, {
      day,
      projectId: row.projectId,
      model: row.model,
      apiKeyId: row.apiKeyId,
    });
    const prev = map.get(key) ?? emptyBucket(query.groupBy, {
      day,
      projectId: row.projectId,
      model: row.model,
      apiKeyId: row.apiKeyId,
    });
    prev.requests += 1;
    prev.inputTokens += row.inputTokens;
    prev.outputTokens += row.outputTokens;
    prev.costMicro += row.costMicro;
    map.set(key, prev);
  }
  return { buckets: [...map.values()], source: "ledger" };
}

function aggregateRollups(
  rows: (typeof usageRollups.$inferSelect)[],
  groupBy: UsageSummaryQuery["groupBy"],
): UsageSummaryBucket[] {
  const map = new Map<string, UsageSummaryBucket>();
  for (const row of rows) {
    const dims = {
      day: row.day,
      projectId: row.projectId,
      model: row.model,
      apiKeyId: row.apiKeyId,
    };
    const key = bucketKey(groupBy, dims);
    const prev = map.get(key) ?? emptyBucket(groupBy, dims);
    prev.requests += row.requests;
    prev.inputTokens += row.inputTokens;
    prev.outputTokens += row.outputTokens;
    prev.costMicro += row.costMicro;
    map.set(key, prev);
  }
  return [...map.values()];
}

function bucketKey(
  groupBy: UsageSummaryQuery["groupBy"],
  dims: {
    day: string | null;
    projectId: string | null;
    model: string | null;
    apiKeyId: string | null;
  },
): string {
  switch (groupBy) {
    case "day":
      return `day:${dims.day ?? ""}`;
    case "project":
      return `project:${dims.projectId ?? ""}`;
    case "model":
      return `model:${dims.model ?? ""}`;
    case "key":
      return `key:${dims.apiKeyId ?? ""}`;
  }
}

function emptyBucket(
  groupBy: UsageSummaryQuery["groupBy"],
  dims: {
    day: string | null;
    projectId: string | null;
    model: string | null;
    apiKeyId: string | null;
  },
): UsageSummaryBucket {
  const base: UsageSummaryBucket = {
    requests: 0,
    inputTokens: 0,
    outputTokens: 0,
    costMicro: 0,
  };
  if (groupBy === "day") base.day = dims.day;
  if (groupBy === "project") base.projectId = dims.projectId;
  if (groupBy === "model") base.model = dims.model;
  if (groupBy === "key") base.apiKeyId = dims.apiKeyId;
  return base;
}

export async function getUsageAlerts(workspaceId: string): Promise<UsageAlert[]> {
  const budget = await getOrCreateCurrentBudget(workspaceId);
  const liveSpent = (await getLiveMonthlySpent(workspaceId, budget.period)) ?? budget.spentMicro;
  const alerts: UsageAlert[] = [];

  const pct =
    budget.monthlyLimitMicro > 0 ? (liveSpent / budget.monthlyLimitMicro) * 100 : 0;

  if (pct >= 100) {
    alerts.push({
      level: "blocked",
      scope: "workspace_monthly",
      percentUsed: pct,
      spentMicro: liveSpent,
      limitMicro: budget.monthlyLimitMicro,
      message: "Monthly budget fully consumed",
    });
  } else if (pct >= budget.alertAtPct) {
    alerts.push({
      level: "warning",
      scope: "workspace_monthly",
      percentUsed: pct,
      spentMicro: liveSpent,
      limitMicro: budget.monthlyLimitMicro,
      message: `Monthly budget at ${Math.floor(pct)}% (alert at ${budget.alertAtPct}%)`,
    });
  }

  if (budget.dailyLimitMicro != null) {
    const daily = (await getLiveDailySpent(workspaceId)) ?? 0;
    const dailyPct = (daily / budget.dailyLimitMicro) * 100;
    if (dailyPct >= 100) {
      alerts.push({
        level: "blocked",
        scope: "workspace_daily",
        percentUsed: dailyPct,
        spentMicro: daily,
        limitMicro: budget.dailyLimitMicro,
        message: "Daily budget fully consumed",
      });
    } else if (dailyPct >= budget.alertAtPct) {
      alerts.push({
        level: "warning",
        scope: "workspace_daily",
        percentUsed: dailyPct,
        spentMicro: daily,
        limitMicro: budget.dailyLimitMicro,
        message: `Daily budget at ${Math.floor(dailyPct)}%`,
      });
    }
  }

  return alerts;
}

export async function getSavings(workspaceId: string): Promise<SavingsResponse> {
  const period = currentPeriod();
  const insight = await db.query.savingsInsights.findFirst({
    where: (s, { and, eq }) => and(eq(s.workspaceId, workspaceId), eq(s.period, period)),
  });
  if (insight) {
    return {
      period,
      actualCostMicro: insight.actualCostMicro,
      optimizedCostMicro: insight.optimizedCostMicro,
      savedMicro: insight.savedMicro,
      source: "insights",
    };
  }

  // Stub: actual = ledger sum this month; "optimized" = 80% of actual (illustrative).
  const start = new Date(`${period}-01T00:00:00.000Z`);
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${usageLedger.costMicro}), 0)` })
    .from(usageLedger)
    .where(and(eq(usageLedger.workspaceId, workspaceId), gte(usageLedger.createdAt, start)));

  const actual = Number(row?.total ?? 0);
  const optimized = Math.floor(actual * 0.8);
  return {
    period,
    actualCostMicro: actual,
    optimizedCostMicro: optimized,
    savedMicro: Math.max(0, actual - optimized),
    source: "computed",
  };
}
