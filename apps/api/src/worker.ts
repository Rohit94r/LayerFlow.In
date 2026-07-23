import "./db/prefer-ipv4";
import { Worker } from "bullmq";
import { logger } from "./config/logger";
import { processors } from "./jobs/processors";
import { closeQueues, DEFAULT_QUEUE, registerScheduledJobs, type JobName } from "./jobs/queues";
import {
  captureException,
  flushSentry,
  initSentry,
  installProcessErrorHandlers,
} from "./observability/sentry";
import { createBullConnection } from "./redis/client";

/**
 * Job worker entrypoint (`npm run worker`). Second process next to the API;
 * consumes the BullMQ queue and dispatches to processors by job name.
 * Also owns the repeatable schedules (rollups, alerts, digests).
 */
initSentry();
installProcessErrorHandlers();

const worker = new Worker(
  DEFAULT_QUEUE,
  async (job) => {
    const processor = processors[job.name as JobName];
    if (!processor) {
      throw new Error(`No processor registered for job "${job.name}"`);
    }
    await processor(job);
  },
  {
    connection: createBullConnection(),
    concurrency: 5,
  },
);

worker.on("completed", (job) => {
  logger.info({ jobId: job.id, name: job.name }, "job completed");
});

worker.on("failed", (job, err) => {
  logger.error({ jobId: job?.id, name: job?.name, err }, "job failed");
  captureException(err, { jobId: job?.id, jobName: job?.name });
});

registerScheduledJobs()
  .then(() => logger.info("repeatable jobs registered (usage-rollup, budget-alerts, weekly-digest)"))
  .catch((err) => {
    logger.error({ err }, "failed to register repeatable jobs");
    captureException(err);
  });

logger.info({ queue: DEFAULT_QUEUE }, "worker started");

let shuttingDown = false;
async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info("worker shutting down");
  await worker.close();
  await closeQueues().catch(() => undefined);
  await flushSentry();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
