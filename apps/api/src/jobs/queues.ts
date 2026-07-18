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
export type JobName = "example" | "compare" | "embeddings" | "usage-rollup" | "budget-alerts";

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

/** Graceful shutdown helper. */
export async function closeQueues(): Promise<void> {
  if (queue) await queue.close();
}
