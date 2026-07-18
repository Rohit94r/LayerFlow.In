import type { Job } from "bullmq";
import { logger } from "../../config/logger";

/**
 * No-op example processor showing the pattern: one file per job, exporting
 * a handler. Register it in processors/index.ts under its job name.
 */
export async function processExample(job: Job): Promise<void> {
  logger.info({ jobId: job.id, data: job.data }, "example job processed");
}
