import { and, asc, eq, ne } from "drizzle-orm";
import { cosineDistance } from "drizzle-orm/sql/functions/vector";
import { logger } from "../../config/logger";
import { db } from "../../db/client";
import { memoryEmbeddings } from "../../db/schema/memory";
import { enqueue } from "../../jobs/queues";
import { embedText } from "../../search/embeddings";

export interface EmbedMemoryPayload {
  memoryId: string;
  workspaceId: string;
}

/**
 * Embed one memory into memory_embeddings.
 * Replaces any previous rows for the same (memory, model) so re-embeds are idempotent.
 */
export async function embedMemory(memoryId: string, workspaceId: string): Promise<void> {
  const memory = await db.query.memories.findFirst({
    where: (m, { and, eq }) => and(eq(m.id, memoryId), eq(m.workspaceId, workspaceId)),
  });
  if (!memory) {
    logger.warn({ memoryId, workspaceId }, "embed skipped — memory not found");
    return;
  }

  const text = `${memory.title}\n\n${memory.body}`;
  const { vector, model } = await embedText(workspaceId, text);

  // Drop previous vectors for this model so re-embeds don't pile up.
  await db
    .delete(memoryEmbeddings)
    .where(
      and(
        eq(memoryEmbeddings.memoryId, memoryId),
        eq(memoryEmbeddings.workspaceId, workspaceId),
        eq(memoryEmbeddings.model, model),
      ),
    );

  // pgvector expects the literal form "[0.1,0.2,...]" via drizzle's vector type.
  await db.insert(memoryEmbeddings).values({
    memoryId,
    workspaceId,
    embedding: vector,
    model,
  });
}

/**
 * Schedule embedding for a memory. Prefers the BullMQ `embeddings` job so the
 * request path stays fast; if Redis is unreachable (common in bare tests /
 * first-boot), embeds inline so the memory is still searchable.
 *
 * In `NODE_ENV=test` we always embed inline — BullMQ/ioredis will otherwise
 * hang retrying a missing Redis and blow the vitest timeout.
 */
export async function scheduleMemoryEmbedding(
  memoryId: string,
  workspaceId: string,
): Promise<"queued" | "inline"> {
  if (process.env.NODE_ENV === "test") {
    await embedMemory(memoryId, workspaceId);
    return "inline";
  }

  try {
    // Race a short timeout so a down Redis doesn't hang the HTTP request.
    await Promise.race([
      enqueue<EmbedMemoryPayload>("embeddings", { memoryId, workspaceId }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("enqueue timed out after 1s")), 1_000),
      ),
    ]);
    return "queued";
  } catch (err) {
    logger.warn({ err, memoryId }, "queue unavailable; embedding memory inline");
    await embedMemory(memoryId, workspaceId);
    return "inline";
  }
}

export interface SimilarLookup {
  hits: Array<{ memoryId: string; score: number }>;
  /** False when the vector query threw (e.g. pgvector unavailable). */
  ok: boolean;
}

/**
 * Cosine-similarity lookup over memory_embeddings.
 * Returns `{ hits: [], ok: false }` when pgvector isn't usable so callers can
 * fall back to keyword search and report `semanticUsed: false`.
 */
export async function findSimilarMemories(opts: {
  workspaceId: string;
  vector: number[];
  model: string;
  limit: number;
  /** Exclude a specific memory (e.g. the source of a "similar to this" query). */
  excludeMemoryId?: string;
}): Promise<SimilarLookup> {
  try {
    // cosineDistance returns 0 for identical vectors; convert to a 0..1 score.
    const distance = cosineDistance(memoryEmbeddings.embedding, opts.vector);
    const rows = await db
      .select({
        memoryId: memoryEmbeddings.memoryId,
        distance,
      })
      .from(memoryEmbeddings)
      .where(
        and(
          eq(memoryEmbeddings.workspaceId, opts.workspaceId),
          eq(memoryEmbeddings.model, opts.model),
          opts.excludeMemoryId
            ? ne(memoryEmbeddings.memoryId, opts.excludeMemoryId)
            : undefined,
        ),
      )
      .orderBy(asc(distance))
      .limit(opts.limit);

    return {
      ok: true,
      hits: rows.map((r) => ({
        memoryId: r.memoryId,
        score: 1 - Number(r.distance),
      })),
    };
  } catch (err) {
    logger.warn({ err }, "pgvector similarity query failed; skipping semantic results");
    return { hits: [], ok: false };
  }
}

/** Convenience: fetch memory rows for a list of IDs, preserving order. */
export async function memoriesByIds(ids: string[]) {
  if (ids.length === 0) return [];
  const rows = await db.query.memories.findMany({
    where: (m, { inArray }) => inArray(m.id, ids),
  });
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids.map((id) => byId.get(id)).filter((r): r is NonNullable<typeof r> => Boolean(r));
}
