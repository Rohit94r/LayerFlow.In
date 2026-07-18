import { Worker } from "bullmq";
import { logger } from "./config/logger";
import { processors } from "./jobs/processors";
import { DEFAULT_QUEUE, type JobName } from "./jobs/queues";
import { createBullConnection } from "./redis/client";

/**
 * Job worker entrypoint (`npm run worker`). Second process next to the API;
 * consumes the BullMQ queue and dispatches to processors by job name.
 */
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
});

logger.info({ queue: DEFAULT_QUEUE }, "worker started");

async function shutdown() {
  await worker.close();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
