import type { Job } from "bullmq";
import { logger } from "../../config/logger";
import {
  embedMemory,
  type EmbedMemoryPayload,
} from "../../services/memory/embed";

/**
 * BullMQ processor for the `embeddings` job.
 * Payload: { memoryId, workspaceId }.
 * Writes (or replaces) a row in memory_embeddings for that memory.
 */
export async function processEmbeddings(job: Job<EmbedMemoryPayload>): Promise<void> {
  const { memoryId, workspaceId } = job.data;
  if (!memoryId || !workspaceId) {
    throw new Error("embeddings job requires memoryId and workspaceId");
  }
  await embedMemory(memoryId, workspaceId);
  logger.info({ jobId: job.id, memoryId, workspaceId }, "memory embedded");
}
