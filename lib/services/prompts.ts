// ─────────────────────────────────────────────────────────────
// Prompt library service.
//
// Mock-backed today (lib/data/prompts.ts). To move to the live
// API, swap the bodies for lib/api/index.ts (listPrompts,
// getPrompt, listPromptVersions, …) without changing the
// signatures.
// ─────────────────────────────────────────────────────────────

import { PROMPTS, PROMPT_BY_ID } from "@/lib/data/prompts";
import type { Prompt } from "@/lib/types";

export interface PromptLibraryService {
  listPrompts(): Promise<Prompt[]>;
  getPrompt(id: string): Promise<Prompt | null>;
  search(query: string): Promise<Prompt[]>;
}

export const promptService: PromptLibraryService = {
  async listPrompts() {
    return PROMPTS;
  },

  async getPrompt(id) {
    return PROMPT_BY_ID[id] ?? null;
  },

  async search(query) {
    const q = query.trim().toLowerCase();
    if (!q) return PROMPTS;
    return PROMPTS.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q)),
    );
  },
};
