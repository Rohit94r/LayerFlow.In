import { and, eq } from "drizzle-orm";
import type { Budget, CurrentBudgetResponse } from "@layerflow/contracts";
import { getLiveDailySpent, getLiveMonthlySpent, currentPeriod } from "../../budgets/enforce";
import { db } from "../../db/client";
import { budgets } from "../../db/schema/cost";
import { AppError } from "../../middleware/error";

function toBudgetDto(row: typeof budgets.$inferSelect): Budget {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    period: row.period,
    monthlyLimitMicro: row.monthlyLimitMicro,
    dailyLimitMicro: row.dailyLimitMicro,
    spentMicro: row.spentMicro,
    alertAtPct: row.alertAtPct,
    hardBlock: row.hardBlock,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Load (or create) the budget row for the current YYYY-MM period. */
export async function getOrCreateCurrentBudget(workspaceId: string) {
  const period = currentPeriod();
  let row = await db.query.budgets.findFirst({
    where: (b, { and, eq }) => and(eq(b.workspaceId, workspaceId), eq(b.period, period)),
  });
  if (!row) {
    const prior = await db.query.budgets.findFirst({
      where: (b, { eq }) => eq(b.workspaceId, workspaceId),
      orderBy: (b, { desc }) => [desc(b.period)],
    });
    const [created] = await db
      .insert(budgets)
      .values({
        workspaceId,
        period,
        monthlyLimitMicro: prior?.monthlyLimitMicro ?? 10_000_000,
        dailyLimitMicro: prior?.dailyLimitMicro ?? null,
        alertAtPct: prior?.alertAtPct ?? 80,
        hardBlock: prior?.hardBlock ?? true,
        spentMicro: 0,
      })
      .onConflictDoNothing()
      .returning();
    row =
      created ??
      (await db.query.budgets.findFirst({
        where: (b, { and, eq }) => and(eq(b.workspaceId, workspaceId), eq(b.period, period)),
      }));
  }
  if (!row) throw new AppError(500, "budget_missing", "Could not load workspace budget");
  return row;
}

export async function buildCurrentBudgetResponse(
  workspaceId: string,
): Promise<CurrentBudgetResponse> {
  const row = await getOrCreateCurrentBudget(workspaceId);
  const liveSpent = await getLiveMonthlySpent(workspaceId, row.period);
  const spentMicro = liveSpent ?? row.spentMicro;
  const remainingMicro = Math.max(0, row.monthlyLimitMicro - spentMicro);
  const percentUsed =
    row.monthlyLimitMicro > 0 ? (spentMicro / row.monthlyLimitMicro) * 100 : 0;
  const blocked = row.hardBlock && spentMicro >= row.monthlyLimitMicro;

  const dailySpent = await getLiveDailySpent(workspaceId);
  const dailyRemainingMicro =
    row.dailyLimitMicro != null && dailySpent != null
      ? Math.max(0, row.dailyLimitMicro - dailySpent)
      : row.dailyLimitMicro != null
        ? null
        : null;

  return {
    budget: { ...toBudgetDto(row), spentMicro },
    remainingMicro,
    percentUsed,
    blocked,
    dailySpentMicro: dailySpent ?? undefined,
    dailyRemainingMicro,
  };
}

export async function updateCurrentBudget(
  workspaceId: string,
  patch: {
    monthlyLimitMicro: number;
    dailyLimitMicro?: number | null;
    alertAtPct?: number;
    hardBlock?: boolean;
  },
): Promise<CurrentBudgetResponse> {
  const row = await getOrCreateCurrentBudget(workspaceId);
  const [updated] = await db
    .update(budgets)
    .set({
      monthlyLimitMicro: patch.monthlyLimitMicro,
      ...(patch.dailyLimitMicro !== undefined ? { dailyLimitMicro: patch.dailyLimitMicro } : {}),
      ...(patch.alertAtPct !== undefined ? { alertAtPct: patch.alertAtPct } : {}),
      ...(patch.hardBlock !== undefined ? { hardBlock: patch.hardBlock } : {}),
    })
    .where(and(eq(budgets.id, row.id), eq(budgets.workspaceId, workspaceId)))
    .returning();
  if (!updated) throw new AppError(404, "not_found", "Budget not found");
  return buildCurrentBudgetResponse(workspaceId);
}

export { toBudgetDto };
