import type { Job } from "bullmq";
import { logger } from "../../config/logger";
import { evaluateBudgetAlerts } from "../../services/email/notifications";

/**
 * `budget-alerts` job: evaluate every workspace budget for the current
 * period and email owners at the warning (alertAtPct, default 80%) and
 * blocked (100%) thresholds. Duplicate suppression is DB-backed
 * (email_events.dedupe_key), so this can run as often as needed.
 */
export async function processBudgetAlerts(job: Job): Promise<void> {
  const outcomes = await evaluateBudgetAlerts();
  const sent = outcomes.filter((o) => o.sent).length;
  const deduped = outcomes.filter((o) => o.deduped).length;
  logger.info({ jobId: job.id, evaluated: outcomes.length, sent, deduped }, "budget alerts done");
}
