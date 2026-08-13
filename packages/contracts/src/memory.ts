import { z } from "zod";
import { idSchema, timestampSchema } from "./common";

/** Where a memory came from. "manual" = typed in by the user. */
export const memorySourceTypeSchema = z.enum(["prompt", "session", "run", "manual", "chat"]);
export type MemorySourceType = z.infer<typeof memorySourceTypeSchema>;

export const memorySchema = z.object({
  id: idSchema,
  workspaceId: idSchema,
  userId: idSchema.nullish(),
  sourceType: memorySourceTypeSchema,
  sourceId: idSchema.nullish(),
  title: z.string(),
  body: z.string(),
  meta: z.unknown().nullish(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export type Memory = z.infer<typeof memorySchema>;

/** POST /api/memory */
export const createMemoryRequestSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(20_000),
  /** Link this memory to a prompt (sets sourceType "prompt"). */
  promptId: idSchema.optional(),
  sourceType: memorySourceTypeSchema.optional(),
  sourceId: idSchema.optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export type CreateMemoryRequest = z.infer<typeof createMemoryRequestSchema>;

/** PATCH /api/memory/:id */
export const updateMemoryRequestSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  body: z.string().min(1).max(20_000).optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export type UpdateMemoryRequest = z.infer<typeof updateMemoryRequestSchema>;

export const memoryResponseSchema = z.object({ memory: memorySchema });
export type MemoryResponse = z.infer<typeof memoryResponseSchema>;

/** GET /api/memory */
export const listMemoriesResponseSchema = z.object({
  memories: z.array(memorySchema),
});
export type ListMemoriesResponse = z.infer<typeof listMemoriesResponseSchema>;

/** How a memory search hit matched the query. */
export const memoryMatchTypeSchema = z.enum(["keyword", "semantic", "both"]);
export type MemoryMatchType = z.infer<typeof memoryMatchTypeSchema>;

export const memorySearchHitSchema = z.object({
  memory: memorySchema,
  /** Cosine similarity 0..1 for semantic hits; null for keyword-only hits. */
  score: z.number().nullable(),
  matchedBy: memoryMatchTypeSchema,
});
export type MemorySearchHit = z.infer<typeof memorySearchHitSchema>;

/** GET /api/memory/search?q= */
export const memorySearchResponseSchema = z.object({
  query: z.string(),
  results: z.array(memorySearchHitSchema),
  /** False when the vector search failed/was unavailable (keyword-only mode). */
  semanticUsed: z.boolean(),
  /** Embedding model used for the semantic half, e.g. "local-hash-v1". */
  embeddingModel: z.string().nullable(),
});
export type MemorySearchResponse = z.infer<typeof memorySearchResponseSchema>;
