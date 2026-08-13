// ─────────────────────────────────────────────────────────────
// Global search service — backed by GET /api/search
// (apps/api/src/routes/search/search.ts), which keyword-searches
// prompts and prompt sessions. Only fields the API actually
// returns are surfaced; nothing is invented on the client.
// ─────────────────────────────────────────────────────────────

import {
  searchResponseSchema,
  type SearchResult,
} from "@layerflow/contracts";
import { apiFetch, getServerCookieHeader } from "@/lib/api/client";

export interface SearchResults {
  prompts: SearchResult[];
  sessions: SearchResult[];
  total: number;
}

export interface SearchService {
  search(query: string): Promise<SearchResults>;
}

export const searchService: SearchService = {
  async search(query) {
    const q = query.trim();
    if (!q) {
      return { prompts: [], sessions: [], total: 0 };
    }

    const headers = await getServerCookieHeader();
    const res = await apiFetch(
      `/api/search?q=${encodeURIComponent(q)}&limit=50`,
      { ...(headers.Cookie ? { headers } : {}) },
      searchResponseSchema,
    );

    const prompts: SearchResult[] = [];
    const sessions: SearchResult[] = [];
    for (const hit of res.results) {
      if (hit.type === "prompt") prompts.push(hit);
      else sessions.push(hit);
    }

    return {
      prompts,
      sessions,
      total: prompts.length + sessions.length,
    };
  },
};

export function isPromptHit(hit: SearchResult): hit is Extract<SearchResult, { type: "prompt" }> {
  return hit.type === "prompt";
}