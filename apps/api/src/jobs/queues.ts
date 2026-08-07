import { Queue } from "bullmq";
import { createBullConnection } from "../redis/client";

/**
 * BullMQ job plumbing. All jobs go through one "default" queue and are
 * dispatched by job name to a processor in src/jobs/processors/.
 *
 * NOTE: deviation from docs — we use BullMQ on Redis instead of Upstash
 * QStash + a separate worker app. See apps/api/README.md.
 */
export const DEFAULT_QUEUE = "layerflow";

/** Job names — add new ones here and register a processor for them. */
export type JobName =
  | "example"
  | "compare"
  | "embeddings"
  | "usage-rollup"
  | "budget-alerts"
  | "weekly-digest"
  | "rescue";

let queue: Queue | undefined;

function getQueue(): Queue {
  if (!queue) {
    queue = new Queue(DEFAULT_QUEUE, { connection: createBullConnection() });
  }
  return queue;
}

/** Enqueue a job for the worker (src/worker.ts). */
export async function enqueue<T extends object>(name: JobName, payload: T): Promise<string> {
  const job = await getQueue().add(name, payload, {
    attempts: 3,
    backoff: { type: "exponential", delay: 2_000 },
    removeOnComplete: { count: 1_000 },
    removeOnFail: { count: 5_000 },
  });
  return job.id ?? "";
}

/**
 * Register repeatable jobs (idempotent — upsert by scheduler id). Called by
 * the worker on startup so exactly one schedule exists per job regardless of
 * how many workers run.
 *
 *   usage-rollup   hourly at :15  — recompute rollups + reconcile Redis
 *   budget-alerts  every 15 min   — 80% / 100% owner emails (DB-deduped)
 *   weekly-digest  Mondays 09:00Z — per-workspace usage summary (DB-deduped)
 */
export async function registerScheduledJobs(): Promise<void> {
  const q = getQueue();
  await q.upsertJobScheduler("usage-rollup-hourly", { pattern: "15 * * * *" }, {
    name: "usage-rollup",
    data: {},
  });
  await q.upsertJobScheduler("budget-alerts-15min", { pattern: "*/15 * * * *" }, {
    name: "budget-alerts",
    data: {},
  });
  await q.upsertJobScheduler("weekly-digest-monday", { pattern: "0 9 * * 1" }, {
    name: "weekly-digest",
    data: {},
  });
}

/** Graceful shutdown helper. */
export async function closeQueues(): Promise<void> {
  if (queue) await queue.close();
}
