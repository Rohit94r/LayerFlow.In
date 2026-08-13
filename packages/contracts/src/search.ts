import { z } from "zod";
import { idSchema, timestampSchema } from "./common";

/** What kinds of entities /api/search looks through. */
export const searchTypeSchema = z.enum(["prompt", "session", "all"]);
export type SearchType = z.infer<typeof searchTypeSchema>;

/** GET /api/search?q=&type= */
export const searchQuerySchema = z.object({
  q: z.string().min(1).max(500),
  type: searchTypeSchema.default("all"),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type SearchQuery = z.infer<typeof searchQuerySchema>;

export const promptSearchResultSchema = z.object({
  type: z.literal("prompt"),
  id: idSchema,
  title: z.string(),
  description: z.string().nullish(),
  /** Short excerpt of the matching body text (current version). */
  snippet: z.string().nullish(),
  projectId: idSchema.nullish(),
  updatedAt: timestampSchema,
});
export type PromptSearchResult = z.infer<typeof promptSearchResultSchema>;

export const sessionSearchResultSchema = z.object({
  type: z.literal("session"),
  id: idSchema,
  title: z.string(),
  description: z.string().nullish(),
  status: z.enum(["active", "completed", "paused"]),
  updatedAt: timestampSchema,
});
export type SessionSearchResult = z.infer<typeof sessionSearchResultSchema>;

export const searchResultSchema = z.discriminatedUnion("type", [
  promptSearchResultSchema,
  sessionSearchResultSchema,
]);
export type SearchResult = z.infer<typeof searchResultSchema>;

export const searchResponseSchema = z.object({
  query: z.string(),
  results: z.array(searchResultSchema),
});
export type SearchResponse = z.infer<typeof searchResponseSchema>;

/** GET /api/similar?promptId= or ?text= (exactly one of the two). */
export const similarQuerySchema = z
  .object({
    promptId: idSchema.optional(),
    text: z.string().min(1).max(20_000).optional(),
    limit: z.coerce.number().int().min(1).max(50).default(10),
  })
  .refine((q) => Boolean(q.promptId) !== Boolean(q.text), {
    message: "Provide exactly one of promptId or text",
  });
export type SimilarQuery = z.infer<typeof similarQuerySchema>;

/** A semantically similar memory (may be a prompt-derived memory). */
export const similarHitSchema = z.object({
  memoryId: idSchema,
  title: z.string(),
  body: z.string(),
  sourceType: z.enum(["prompt", "session", "run", "manual", "chat"]),
  /** For sourceType "prompt" this is the prompt ID to link back to. */
  sourceId: idSchema.nullish(),
  /** Cosine similarity, 1 = identical direction, 0 = unrelated. */
  score: z.number(),
});
export type SimilarHit = z.infer<typeof similarHitSchema>;

export const similarResponseSchema = z.object({
  results: z.array(similarHitSchema),
  /** Embedding model that produced the query vector, e.g. "local-hash-v1". */
  embeddingModel: z.string(),
});
export type SimilarResponse = z.infer<typeof similarResponseSchema>;
