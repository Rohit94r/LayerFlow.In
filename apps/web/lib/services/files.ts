import {
  listFilesResponseSchema,
  reindexFileResponseSchema,
  type ListFilesResponse,
  type ReindexFileResponse,
} from "@layerflow/contracts";
import { apiFetch, getServerCookieHeader } from "@/lib/api/client";

/**
 * Files service — workspace file list + RAG re-index + delete.
 * Upload flows call /api/files/upload-url / complete directly.
 */
export const filesService = {
  /** GET /api/files — files with RAG status and chunk counts (RSC-safe). */
  list: async (): Promise<ListFilesResponse> => {
    const headers = await getServerCookieHeader();
    return apiFetch<ListFilesResponse>(
      "/api/files",
      { ...(headers.Cookie ? { headers } : {}) },
      listFilesResponseSchema,
    );
  },

  /** POST /api/files/:id/reindex — rebuild RAG chunks from current bytes. */
  reindex: async (fileId: string): Promise<ReindexFileResponse> =>
    apiFetch<ReindexFileResponse>(
      `/api/files/${fileId}/reindex`,
      { method: "POST" },
      reindexFileResponseSchema,
    ),

  /** DELETE /api/files/:id — remove the file, its bytes and RAG chunks. */
  delete: async (fileId: string): Promise<{ ok: true }> =>
    apiFetch<{ ok: true }>(`/api/files/${fileId}`, { method: "DELETE" }),
};