import type { Job } from "bullmq";
import { logger } from "../../config/logger";
import { sendWeeklyDigests } from "../../services/email/notifications";

/**
 * `weekly-digest` job: one usage summary email per workspace per ISO week.
 * Deduped in Postgres (email_events), safe to re-run.
 */
export async function processWeeklyDigest(job: Job): Promise<void> {
  const sent = await sendWeeklyDigests();
  logger.info({ jobId: job.id, sent }, "weekly digest done");
}
