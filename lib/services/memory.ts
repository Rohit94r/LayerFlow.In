import {
  createMemoryRequestSchema,
  listMemoriesResponseSchema,
  memoryResponseSchema,
  type CreateMemoryRequest,
  type ListMemoriesResponse,
  type MemoryResponse,
} from "@layerflow/contracts";
import { apiFetch, getServerCookieHeader } from "@/lib/api/client";

/**
 * Memory service — POST /api/memory saves a permanent workspace memory
 * (searchable via /api/memory/search). Used by Chat's "Save to memory" action.
 */
export const memoryService = {
  create: async (body: CreateMemoryRequest): Promise<MemoryResponse> =>
    apiFetch<MemoryResponse>(
      "/api/memory",
      { method: "POST", body: createMemoryRequestSchema.parse(body) },
      memoryResponseSchema,
    ),

  /** GET /api/memory — workspace memories, newest first (RSC-safe). */
  list: async (params?: { limit?: number; offset?: number }): Promise<ListMemoriesResponse> => {
    const headers = await getServerCookieHeader();
    return apiFetch<ListMemoriesResponse>(
      "/api/memory",
      { query: params, ...(headers.Cookie ? { headers } : {}) },
      listMemoriesResponseSchema,
    );
  },
};