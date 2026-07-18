import type { Job } from "bullmq";
import { logger } from "../../config/logger";
import {
  defaultRollupDays,
  reconcileBudgets,
  rollupUsageForDay,
} from "../../services/budgets/rollup";

/**
 * `usage-rollup` job: recompute usage_rollups from the immutable ledger and
 * reconcile Redis budget counters against Postgres.
 *
 * Payload (all optional): { days?: string[]; reconcile?: boolean; heal?: boolean }
 * Defaults to [yesterday, today] UTC with healing reconciliation — the whole
 * operation is idempotent, so overlapping runs are harmless.
 */
export async function processUsageRollup(job: Job): Promise<void> {
  const payload = (job.data ?? {}) as { days?: string[]; reconcile?: boolean; heal?: boolean };
  const days = payload.days?.length ? payload.days : defaultRollupDays();

  for (const day of days) {
    await rollupUsageForDay(day);
  }

  if (payload.reconcile !== false) {
    // Wide tolerance: Redis legitimately runs ahead of the ledger while calls
    // are in flight (reservations). Healing only fires on real drift.
    const rows = await reconcileBudgets({ heal: payload.heal ?? true, toleranceMicro: 1_000_000 });
    const drifted = rows.filter((r) => r.driftMicro != null && r.driftMicro !== 0);
    logger.info(
      { jobId: job.id, days, workspaces: rows.length, drifted: drifted.length },
      "usage rollup + reconciliation done",
    );
  }
}
