import { and, desc, eq, ilike, isNull, or } from "drizzle-orm";
import type { SearchResult, SearchType } from "@layerflow/contracts";
import { db } from "../../db/client";
import { prompts, promptVersions } from "../../db/schema/prompts";
import { promptSessions } from "../../db/schema/sessions";

/**
 * Keyword search over prompts + sessions using Postgres ILIKE.
 * No special indexes required — works on Docker Postgres and the PGlite
 * test database. See src/search/README.md for the embedding/semantic half.
 */
export async function keywordSearch(opts: {
  workspaceId: string;
  query: string;
  type: SearchType;
  limit: number;
}): Promise<SearchResult[]> {
  // Strip ILIKE wildcards from user input so "%" can't become a broad match.
  const safe = opts.query.replace(/[%_]/g, "").trim();
  if (!safe) return [];
  const pattern = `%${safe}%`;
  const results: SearchResult[] = [];

  if (opts.type === "prompt" || opts.type === "all") {
    // Join current version body so title/description/body are all searchable.
    const promptRows = await db
      .select({
        id: prompts.id,
        title: prompts.title,
        description: prompts.description,
        projectId: prompts.projectId,
        updatedAt: prompts.updatedAt,
        body: promptVersions.body,
      })
      .from(prompts)
      .leftJoin(promptVersions, eq(promptVersions.id, prompts.currentVersionId))
      .where(
        and(
          eq(prompts.workspaceId, opts.workspaceId),
          isNull(prompts.archivedAt),
          or(
            ilike(prompts.title, pattern),
            ilike(prompts.description, pattern),
            ilike(promptVersions.body, pattern),
          ),
        ),
      )
      .orderBy(desc(prompts.updatedAt))
      .limit(opts.limit);

    for (const row of promptRows) {
      results.push({
        type: "prompt",
        id: row.id,
        title: row.title,
        description: row.description,
        snippet: snippetAround(row.body, safe),
        projectId: row.projectId,
        updatedAt: row.updatedAt.toISOString(),
      });
    }
  }

  if (opts.type === "session" || opts.type === "all") {
    const remaining = opts.limit - results.length;
    if (remaining > 0) {
      const sessionRows = await db
        .select({
          id: promptSessions.id,
          title: promptSessions.title,
          description: promptSessions.description,
          status: promptSessions.status,
          updatedAt: promptSessions.updatedAt,
        })
        .from(promptSessions)
        .where(
          and(
            eq(promptSessions.workspaceId, opts.workspaceId),
            or(
              ilike(promptSessions.title, pattern),
              ilike(promptSessions.description, pattern),
            ),
          ),
        )
        .orderBy(desc(promptSessions.updatedAt))
        .limit(remaining);

      for (const row of sessionRows) {
        results.push({
          type: "session",
          id: row.id,
          title: row.title,
          description: row.description,
          status: row.status,
          updatedAt: row.updatedAt.toISOString(),
        });
      }
    }
  }

  return results;
}

/** Pull a short excerpt around the first occurrence of `needle` in `text`. */
function snippetAround(text: string | null, needle: string, radius = 60): string | null {
  if (!text) return null;
  const lower = text.toLowerCase();
  const idx = lower.indexOf(needle.toLowerCase());
  if (idx < 0) {
    return text.length > radius * 2 ? `${text.slice(0, radius * 2)}…` : text;
  }
  const start = Math.max(0, idx - radius);
  const end = Math.min(text.length, idx + needle.length + radius);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < text.length ? "…" : "";
  return `${prefix}${text.slice(start, end)}${suffix}`;
}

/** Strip ILIKE wildcards from user input. */
export function escapeIlike(query: string): string {
  return query.replace(/[%_]/g, "");
}
