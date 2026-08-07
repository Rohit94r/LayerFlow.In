// ─────────────────────────────────────────────────────────────
// Global search service — backed by GET /api/search
// (apps/api/src/routes/search.ts), which looks through prompts
// and sessions. Memorable fields the API doesn't cover yet
// (passports, learnings, timeline) fall back to empty.
// ─────────────────────────────────────────────────────────────

import { searchResponseSchema, type SearchResult } from "@layerflow/contracts";
import { apiFetch, getServerCookieHeader } from "@/lib/api/client";
import type { ContextPassport, Learning, Project, Prompt, TimelineEvent } from "@/lib/types";

export interface SearchResults {
  prompts: Prompt[];
  passports: ContextPassport[];
  projects: Project[];
  learnings: Learning[];
  events: TimelineEvent[];
  total: number;
}

export interface SearchService {
  search(query: string): Promise<SearchResults>;
}

export const searchService: SearchService = {
  async search(query) {
    const q = query.trim();
    if (!q) {
      return { prompts: [], passports: [], projects: [], learnings: [], events: [], total: 0 };
    }

    const headers = await getServerCookieHeader();
    const res = await apiFetch(
      `/api/search?q=${encodeURIComponent(q)}&limit=50`,
      { ...(headers.Cookie ? { headers } : {}) },
      searchResponseSchema,
    );

    const prompts: Prompt[] = [];
    const passports: ContextPassport[] = [];
    for (const hit of res.results) {
      if (hit.type === "prompt") {
        prompts.push({
          id: hit.id,
          title: hit.title,
          description: hit.description ?? "",
          content: hit.snippet ?? "",
          score: 50,
          tags: [],
          model: "gpt-4o",
          version: 1,
          favorite: false,
          usageCount: 0,
          createdAt: hit.updatedAt,
          updatedAt: hit.updatedAt,
        });
      } else if (hit.type === "session") {
        passports.push({
          id: hit.id,
          title: hit.title,
          fields: {
            goal: hit.title,
            currentState: hit.description ?? "",
            decisions: [],
            constraints: [],
            failures: [],
            successes: [],
            missingInfo: [],
            outputFormat: "",
            nextAction: "",
          },
          meta: { sourceTool: "generic", sourceModel: "unknown", tags: [], estimatedNextCost: 0 },
          createdAt: hit.updatedAt,
          updatedAt: hit.updatedAt,
          favorite: false,
          usageCount: 0,
          wordCount: 0,
        });
      }
    }

    return {
      prompts,
      passports,
      projects: [],
      learnings: [],
      events: [],
      total: prompts.length + passports.length,
    };
  },
};

export function isPromptHit(hit: SearchResult): hit is Extract<SearchResult, { type: "prompt" }> {
  return hit.type === "prompt";
}
