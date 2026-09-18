import type { Job } from "bullmq";
import { logger } from "../../config/logger";
import { requeueUnembeddedMemories } from "../../services/memory/embed";

/**
 * `embeddings-backfill` job: DB-side retry sweep for the embedding queue.
 *
 * BullMQ retries a failed `embeddings` job 3× with backoff; this job covers
 * the case where no embedding row ever got created (enqueue when Redis was
 * down, purged after final failure, etc.). Runs on a schedule — safe to
 * overlap because each memory's embed is idempotent.
 */
export async function processEmbeddingsBackfill(job: Job): Promise<void> {
  const requeued = await requeueUnembeddedMemories();
  logger.info({ jobId: job.id, requeued }, "embeddings backfill sweep done");
}