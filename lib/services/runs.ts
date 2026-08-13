// ─────────────────────────────────────────────────────────────
// Runs service — GET /api/runs (apps/api/src/routes/runs).
// One model call = one run row. Forwards the session cookie so
// server components can call it (same-origin Hono API).
// ─────────────────────────────────────────────────────────────

import {
  listRunsResponseSchema,
  type ListRunsResponse,
} from "@layerflow/contracts";
import { apiFetch, getServerCookieHeader } from "@/lib/api/client";

export interface RunsService {
  list(params?: { limit?: number; offset?: number }): Promise<ListRunsResponse>;
}

export const runsService: RunsService = {
  async list(params) {
    const headers = await getServerCookieHeader();
    return apiFetch<ListRunsResponse>(
      "/api/runs",
      {
        query: { limit: params?.limit, offset: params?.offset },
        ...(headers.Cookie ? { headers } : {}),
      },
      listRunsResponseSchema,
    );
  },
};