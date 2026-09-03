import "./db/prefer-ipv4";
import { Worker } from "bullmq";
import { Hono } from "hono";
import { logger } from "./config/logger";
import { processors } from "./jobs/processors";
import { closeQueues, DEFAULT_QUEUE, getQueue, registerScheduledJobs, type JobName } from "./jobs/queues";
import {
  captureException,
  flushSentry,
  initSentry,
  installProcessErrorHandlers,
} from "./observability/sentry";
import { createBullConnection } from "./redis/client";
import { redis } from "./redis/client";

/**
 * Job worker entrypoint (`npm run worker`). Second process next to the API;
 * consumes the BullMQ queue and dispatches to processors by job name.
 * Also owns the repeatable schedules (rollups, alerts, digests).
 */
initSentry();
installProcessErrorHandlers();

// ── Health HTTP endpoint ──────────────────────────────────────
const healthApp = new Hono();

healthApp.get("/health", async (c) => {
  const checks: { redis: boolean; queueDepth: number } = { redis: false, queueDepth: 0 };
  try {
    const pong = await redis.ping();
    checks.redis = pong === "PONG";
  } catch {
    checks.redis = false;
  }
  try {
    const queue = getQueue();
    const jobCounts = await queue.getJobCounts("waiting", "active", "delayed");
    checks.queueDepth = (jobCounts.waiting ?? 0) + (jobCounts.active ?? 0);
  } catch {
    checks.queueDepth = -1;
  }
  const ok = checks.redis;
  return c.json({ status: ok ? "ok" : "degraded", checks }, ok ? 200 : 503);
});

// Start health server on a separate port so the worker's health is reachable
// independently of the API process.
const HEALTH_PORT = Number(process.env.WORKER_HEALTH_PORT ?? 9091);
import { serve } from "@hono/node-server";
serve({ fetch: healthApp.fetch, port: HEALTH_PORT }, (info) => {
  logger.info({ port: info.port }, "worker health endpoint started");
});

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
