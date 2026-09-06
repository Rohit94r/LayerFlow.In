// ─────────────────────────────────────────────────────────────
// Prompt library service — live Hono API (apps/api/src/routes/prompts).
// ─────────────────────────────────────────────────────────────

import {
  listPromptsResponseSchema,
  promptResponseSchema,
  type Prompt as PromptDto,
} from "@layerflow/contracts";
import type { z } from "zod";
import { apiFetch, getServerCookieHeader } from "@/lib/api/client";
import type { Prompt } from "@/lib/types";

export interface PromptLibraryService {
  listPrompts(): Promise<Prompt[]>;
  getPrompt(id: string): Promise<Prompt | null>;
  search(query: string): Promise<Prompt[]>;
}

async function authedFetch<T>(path: string, schema?: z.ZodType<T>): Promise<T> {
  const headers = await getServerCookieHeader();
  return apiFetch<T>(path, { ...(headers.Cookie ? { headers } : {}) }, schema);
}

function mapPromptDto(prompt: PromptDto, content = ""): Prompt {
  return {
    id: prompt.id,
    title: prompt.title,
    description: prompt.description ?? "",
    content,
    tags: prompt.tags,
    favorite: prompt.favorite,
    usageCount: prompt.runCount,
    source: prompt.source,
    createdAt: prompt.createdAt,
    updatedAt: prompt.updatedAt,
  };
}

export const promptService: PromptLibraryService = {
  async listPrompts() {
    const res = await authedFetch("/api/prompts?limit=100", listPromptsResponseSchema);
    return res.prompts.map((p) => mapPromptDto(p));
  },

  async getPrompt(id) {
    try {
      const res = await authedFetch(`/api/prompts/${id}`, promptResponseSchema);
      return mapPromptDto(res.prompt, res.currentVersion?.body ?? "");
    } catch {
      return null;
    }
  },

  async search(query) {
    const q = query.trim();
    if (!q) return this.listPrompts();
    const res = await authedFetch(`/api/prompts?q=${encodeURIComponent(q)}&limit=100`, listPromptsResponseSchema);
    return res.prompts.map((p) => mapPromptDto(p));
  },
};
