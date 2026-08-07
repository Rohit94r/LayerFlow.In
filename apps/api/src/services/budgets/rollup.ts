import { and, eq, gte, lt, sql } from "drizzle-orm";
import type Redis from "ioredis";
import { logger } from "../../config/logger";
import { db } from "../../db/client";
import { usageLedger, usageRollups } from "../../db/schema/cost";
import { budgets } from "../../db/schema/cost";
import { redis as defaultRedis } from "../../redis/client";
import { currentPeriod, monthlyKey } from "./redis-keys";

/**
 * Usage rollups + reconciliation.
 *
 * The immutable `usage_ledger` is the source of truth. `usage_rollups` is a
 * derived, pre-aggregated view (also written synchronously at settle time as
 * an optimization). `rollupUsageForDay` recomputes a whole UTC day from the
 * ledger and REPLACES the derived rows, so it is idempotent and self-healing:
 * run it as often as you like, the result converges to the ledger.
 */

export interface RollupDayResult {
  day: string;
  workspaces: number;
  rows: number;
}

/** Recompute usage_rollups for one UTC day (YYYY-MM-DD) from the ledger. */
export async function rollupUsageForDay(day: string): Promise<RollupDayResult> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    throw new Error(`rollupUsageForDay: invalid day "${day}" (expected YYYY-MM-DD)`);
  }
  const start = new Date(`${day}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  const aggregated = await db
    .select({
      workspaceId: usageLedger.workspaceId,
      projectId: usageLedger.projectId,
      model: usageLedger.model,
      apiKeyId: usageLedger.apiKeyId,
      requests: sql<string>`count(*)::text`,
      inputTokens: sql<string>`coalesce(sum(${usageLedger.inputTokens}), 0)::text`,
      outputTokens: sql<string>`coalesce(sum(${usageLedger.outputTokens}), 0)::text`,
      costMicro: sql<string>`coalesce(sum(${usageLedger.costMicro}), 0)::text`,
    })
    .from(usageLedger)
    .where(and(gte(usageLedger.createdAt, start), lt(usageLedger.createdAt, end)))
    .groupBy(
      usageLedger.workspaceId,
      usageLedger.projectId,
      usageLedger.model,
      usageLedger.apiKeyId,
    );

  await db.transaction(async (tx) => {
    await tx.delete(usageRollups).where(eq(usageRollups.day, day));
    if (aggregated.length > 0) {
      await tx.insert(usageRollups).values(
        aggregated.map((row) => ({
          workspaceId: row.workspaceId,
          day,
          projectId: row.projectId,
          model: row.model,
          apiKeyId: row.apiKeyId,
          requests: Number(row.requests),
          inputTokens: Number(row.inputTokens),
          outputTokens: Number(row.outputTokens),
          costMicro: Number(row.costMicro),
        })),
      );
    }
  });

  const workspaceCount = new Set(aggregated.map((r) => r.workspaceId)).size;
  logger.info({ day, rows: aggregated.length, workspaces: workspaceCount }, "usage rollup complete");
  return { day, workspaces: workspaceCount, rows: aggregated.length };
}

/** Yesterday + today (UTC) — the default window for the scheduled job. */
export function defaultRollupDays(now = new Date()): string[] {
  const today = now.toISOString().slice(0, 10);
  const y = new Date(now);
  y.setUTCDate(y.getUTCDate() - 1);
  return [y.toISOString().slice(0, 10), today];
}

export interface ReconciliationRow {
  workspaceId: string;
  period: string;
  ledgerMicro: number;
  redisMicro: number | null;
  budgetRowMicro: number;
  driftMicro: number | null;
  healed: boolean;
}

/**
 * Compare live Redis monthly counters against the Postgres ledger for the
 * current period, and sync `budgets.spent_micro` to the ledger.
 *
 * `heal: true` also rewrites the Redis counter to the ledger sum when drift
 * exceeds `toleranceMicro`. Note: Redis intentionally runs slightly ahead of
 * the ledger while calls are in flight (reservations), so healing uses a
 * tolerance instead of demanding exact equality.
 */
export async function reconcileBudgets(options?: {
  period?: string;
  heal?: boolean;
  toleranceMicro?: number;
  redis?: Redis;
}): Promise<ReconciliationRow[]> {
  const period = options?.period ?? currentPeriod();
  const heal = options?.heal ?? false;
  const tolerance = options?.toleranceMicro ?? 50_000; // $0.05
  const client = options?.redis ?? defaultRedis;

  const budgetRows = await db.query.budgets.findMany({
    where: (b, { eq }) => eq(b.period, period),
  });

  const start = new Date(`${period}-01T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);

  const results: ReconciliationRow[] = [];
  for (const budget of budgetRows) {
    const [ledger] = await db
      .select({ total: sql<string>`coalesce(sum(${usageLedger.costMicro}), 0)::text` })
      .from(usageLedger)
      .where(
        and(
          eq(usageLedger.workspaceId, budget.workspaceId),
          gte(usageLedger.createdAt, start),
          lt(usageLedger.createdAt, end),
        ),
      );
    const ledgerMicro = Number(ledger?.total ?? 0);

    let redisMicro: number | null = null;
    try {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("redis timeout")), 1_000),
      );
      if (client.status !== "ready") {
        await Promise.race([client.connect().catch(() => undefined), timeout]);
      }
      const raw = await Promise.race([client.get(monthlyKey(budget.workspaceId, period)), timeout]);
      redisMicro = raw != null ? Number(raw) : 0;
    } catch {
      redisMicro = null; // Redis down — report only
    }

    const driftMicro = redisMicro == null ? null : redisMicro - ledgerMicro;
    let healed = false;

    // Durable mirror in Postgres always follows the ledger.
    if (budget.spentMicro !== ledgerMicro) {
      await db
        .update(budgets)
        .set({ spentMicro: ledgerMicro })
        .where(eq(budgets.id, budget.id));
    }

    if (heal && driftMicro != null && Math.abs(driftMicro) > tolerance) {
      try {
        await client.set(monthlyKey(budget.workspaceId, period), String(ledgerMicro));
        healed = true;
        logger.warn(
          { workspaceId: budget.workspaceId, period, driftMicro, ledgerMicro },
          "reconciliation healed redis budget counter",
        );
      } catch (err) {
        logger.error({ err, workspaceId: budget.workspaceId }, "reconciliation heal failed");
      }
    } else if (driftMicro != null && Math.abs(driftMicro) > tolerance) {
      logger.warn(
        { workspaceId: budget.workspaceId, period, driftMicro, ledgerMicro, redisMicro },
        "reconciliation drift detected (run with heal to fix)",
      );
    }

    results.push({
      workspaceId: budget.workspaceId,
      period,
      ledgerMicro,
      redisMicro,
      budgetRowMicro: budget.spentMicro,
      driftMicro,
      healed,
    });
  }

  return results;
}
