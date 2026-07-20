import type { SimilarHit } from "@layerflow/contracts";
import { db } from "../../db/client";
import { AppError } from "../../middleware/app-error";
import { embedText } from "../../search/embeddings";
import {
  findSimilarMemories,
  memoriesByIds,
} from "../memory/embed";
import { toMemoryDto } from "../memory/memory";

/**
 * Semantic similarity over memory_embeddings.
 * Accepts either a free-text query or a prompt ID (whose title + current
 * version body become the query text). Throws when pgvector is unavailable
 * so the route can return a clear 503 instead of a silent empty list.
 */
export async function findSimilar(opts: {
  workspaceId: string;
  promptId?: string;
  text?: string;
  limit: number;
}): Promise<{ results: SimilarHit[]; embeddingModel: string }> {
  let queryText = opts.text?.trim() ?? "";
  let excludeMemoryId: string | undefined;

  if (opts.promptId) {
    const prompt = await db.query.prompts.findFirst({
      where: (p, { and, eq }) =>
        and(eq(p.id, opts.promptId!), eq(p.workspaceId, opts.workspaceId)),
    });
    if (!prompt) throw new AppError(404, "not_found", "Prompt not found");

    let body = "";
    if (prompt.currentVersionId) {
      const version = await db.query.promptVersions.findFirst({
        where: (v, { eq }) => eq(v.id, prompt.currentVersionId!),
      });
      body = version?.body ?? "";
    }
    queryText = `${prompt.title}\n\n${body}`.trim();

    // Prefer excluding a memory that was distilled from this same prompt.
    const sourceMemory = await db.query.memories.findFirst({
      where: (m, { and, eq }) =>
        and(
          eq(m.workspaceId, opts.workspaceId),
          eq(m.sourceType, "prompt"),
          eq(m.sourceId, opts.promptId!),
        ),
    });
    excludeMemoryId = sourceMemory?.id;
  }

  if (!queryText) {
    throw new AppError(400, "validation_error", "Nothing to compare — provide text or a prompt with a body");
  }

  const { vector, model } = await embedText(opts.workspaceId, queryText);
  const lookup = await findSimilarMemories({
    workspaceId: opts.workspaceId,
    vector,
    model,
    limit: opts.limit,
    excludeMemoryId,
  });

  if (!lookup.ok) {
    throw new AppError(
      503,
      "semantic_unavailable",
      "Vector similarity is unavailable in this environment. Keyword search still works via GET /api/search.",
    );
  }

  const rows = await memoriesByIds(lookup.hits.map((h) => h.memoryId));
  const byId = new Map(rows.map((r) => [r.id, r]));

  const results: SimilarHit[] = [];
  for (const hit of lookup.hits) {
    const row = byId.get(hit.memoryId);
    if (!row || row.workspaceId !== opts.workspaceId) continue;
    const dto = toMemoryDto(row);
    results.push({
      memoryId: dto.id,
      title: dto.title,
      body: dto.body,
      sourceType: dto.sourceType,
      sourceId: dto.sourceId,
      score: hit.score,
    });
  }

  return { results, embeddingModel: model };
}
