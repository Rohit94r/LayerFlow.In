import { and, desc, eq, ilike, or } from "drizzle-orm";
import type {
  CreateMemoryRequest,
  Memory,
  MemorySearchHit,
  UpdateMemoryRequest,
} from "@layerflow/contracts";
import { db } from "../../db/client";
import { memories } from "../../db/schema/memory";
import { AppError } from "../../middleware/app-error";
import { embedText } from "../../search/embeddings";
import {
  findSimilarMemories,
  memoriesByIds,
  scheduleMemoryEmbedding,
} from "./embed";

export function toMemoryDto(row: typeof memories.$inferSelect): Memory {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    userId: row.userId,
    sourceType: row.sourceType,
    sourceId: row.sourceId,
    title: row.title,
    body: row.body,
    meta: row.meta,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listMemories(workspaceId: string, limit = 50, offset = 0) {
  const rows = await db.query.memories.findMany({
    where: (m, { eq }) => eq(m.workspaceId, workspaceId),
    orderBy: (m, { desc }) => [desc(m.updatedAt)],
    limit,
    offset,
  });
  return rows.map(toMemoryDto);
}

export async function getMemory(workspaceId: string, id: string) {
  const row = await db.query.memories.findFirst({
    where: (m, { and, eq }) => and(eq(m.id, id), eq(m.workspaceId, workspaceId)),
  });
  if (!row) throw new AppError(404, "not_found", "Memory not found");
  return toMemoryDto(row);
}

export async function createMemory(
  workspaceId: string,
  userId: string,
  input: CreateMemoryRequest,
) {
  const sourceType = input.promptId
    ? ("prompt" as const)
    : (input.sourceType ?? "manual");
  const sourceId = input.promptId ?? input.sourceId ?? null;

  const [row] = await db
    .insert(memories)
    .values({
      workspaceId,
      userId,
      sourceType,
      sourceId,
      title: input.title,
      body: input.body,
      meta: input.meta ?? null,
    })
    .returning();

  await scheduleMemoryEmbedding(row.id, workspaceId);
  return toMemoryDto(row);
}

export async function updateMemory(
  workspaceId: string,
  id: string,
  input: UpdateMemoryRequest,
) {
  const existing = await db.query.memories.findFirst({
    where: (m, { and, eq }) => and(eq(m.id, id), eq(m.workspaceId, workspaceId)),
  });
  if (!existing) throw new AppError(404, "not_found", "Memory not found");

  const [row] = await db
    .update(memories)
    .set({
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.body !== undefined ? { body: input.body } : {}),
      ...(input.meta !== undefined ? { meta: input.meta } : {}),
    })
    .where(and(eq(memories.id, id), eq(memories.workspaceId, workspaceId)))
    .returning();

  // Re-embed when the searchable text changes.
  if (input.title !== undefined || input.body !== undefined) {
    await scheduleMemoryEmbedding(row.id, workspaceId);
  }
  return toMemoryDto(row);
}

export async function deleteMemory(workspaceId: string, id: string) {
  const [row] = await db
    .delete(memories)
    .where(and(eq(memories.id, id), eq(memories.workspaceId, workspaceId)))
    .returning();
  if (!row) throw new AppError(404, "not_found", "Memory not found");
}

/**
 * Hybrid search: keyword ILIKE + semantic cosine similarity.
 * Semantic half is best-effort — if pgvector fails we still return keyword hits.
 */
export async function searchMemories(
  workspaceId: string,
  query: string,
  limit = 20,
): Promise<{
  results: MemorySearchHit[];
  semanticUsed: boolean;
  embeddingModel: string | null;
}> {
  const pattern = `%${query.replace(/[%_]/g, "")}%`;

  const keywordRows = await db
    .select()
    .from(memories)
    .where(
      and(
        eq(memories.workspaceId, workspaceId),
        or(ilike(memories.title, pattern), ilike(memories.body, pattern)),
      ),
    )
    .orderBy(desc(memories.updatedAt))
    .limit(limit);

  let embeddingModel: string | null = null;
  let semanticUsed = false;
  let semanticHits: Array<{ memoryId: string; score: number }> = [];

  const { vector, model } = await embedText(workspaceId, query);
  embeddingModel = model;
  const lookup = await findSimilarMemories({
    workspaceId,
    vector,
    model,
    limit,
  });
  semanticUsed = lookup.ok;
  semanticHits = lookup.hits;

  const byId = new Map<string, MemorySearchHit>();

  for (const row of keywordRows) {
    byId.set(row.id, {
      memory: toMemoryDto(row),
      score: null,
      matchedBy: "keyword",
    });
  }

  if (semanticHits.length > 0) {
    const missing = semanticHits
      .map((h) => h.memoryId)
      .filter((id) => !byId.has(id));
    const fetched = await memoriesByIds(missing);
    const fetchedMap = new Map(fetched.map((r) => [r.id, r]));

    for (const hit of semanticHits) {
      const existing = byId.get(hit.memoryId);
      if (existing) {
        existing.score = hit.score;
        existing.matchedBy = "both";
      } else {
        const row = fetchedMap.get(hit.memoryId);
        if (!row || row.workspaceId !== workspaceId) continue;
        byId.set(hit.memoryId, {
          memory: toMemoryDto(row),
          score: hit.score,
          matchedBy: "semantic",
        });
      }
    }
  }

  // Rank: both > semantic (by score) > keyword.
  const results = Array.from(byId.values())
    .sort((a, b) => {
      const rank = (h: MemorySearchHit) =>
        h.matchedBy === "both" ? 2 : h.matchedBy === "semantic" ? 1 : 0;
      const rankDiff = rank(b) - rank(a);
      if (rankDiff !== 0) return rankDiff;
      return (b.score ?? 0) - (a.score ?? 0);
    })
    .slice(0, limit);

  return { results, semanticUsed, embeddingModel };
}
