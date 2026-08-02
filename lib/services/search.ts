// ─────────────────────────────────────────────────────────────
// Global search service — searches every context surface:
// projects, prompts, passports, learnings and timeline events.
//
// Mock-backed today; the live backend exposes a workspace-scoped
// search endpoint (apps/api/src/routes/search.ts).
// ─────────────────────────────────────────────────────────────

import { PROJECTS, TIMELINE, LEARNINGS } from "@/lib/data/workspace";
import { PROMPTS } from "@/lib/data/prompts";
import { PASSPORTS } from "@/lib/data/passports";
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

const matches = (query: string, ...fields: (string | undefined)[]) => {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  return fields.some((f) => f?.toLowerCase().includes(q));
};

export const searchService: SearchService = {
  async search(query) {
    const q = query.trim();
    if (!q) {
      return { prompts: [], passports: [], projects: [], learnings: [], events: [], total: 0 };
    }

    const prompts = PROMPTS.filter(
      (p) => matches(q, p.title, p.description) || p.tags.some((t) => t.toLowerCase().includes(q.toLowerCase())),
    );
    const passports = PASSPORTS.filter(
      (p) => matches(q, p.title) || p.meta.tags.some((t) => t.toLowerCase().includes(q.toLowerCase())),
    );
    const projects = PROJECTS.filter((p) => matches(q, p.name, p.description));
    const learnings = LEARNINGS.filter((l) => matches(q, l.content, l.source) || l.tags.some((t) => t.toLowerCase().includes(q.toLowerCase())));
    const events = TIMELINE.filter((e) => matches(q, e.title, e.description, e.meta));

    return {
      prompts,
      passports,
      projects,
      learnings,
      events,
      total: prompts.length + passports.length + projects.length + learnings.length + events.length,
    };
  },
};
