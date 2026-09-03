/**
 * Shared Context Engine
 *
 * Provides unified context building used by web chat, terminal, AND agents.
 * Uses keyword + vector search to find relevance, token-budgeted selection.
 *
 * This engine is the single source of truth for "what context should we
 * include with this request?" regardless of the surface area (chat, agent,
 * terminal, rescue).
 */

import { logger } from "../../config/logger";
import { estimateTokens } from "../intelligence/analyze";

// -- Types ------------------------------------------------------------------

export interface ContextSource {
  /** Unique identifier of the source */
  id: string;
  /** Type of context source */
  type: "file" | "memory" | "message" | "search" | "document" | "custom";
  /** Relevance score 0-1 */
  relevance: number;
  /** Content text */
  content: string;
  /** Token count of the content */
  tokens: number;
  /** Source metadata */
  metadata: Record<string, unknown>;
}

export interface ContextRequest {
  workspaceId: string;
  /** The query or goal text to build context around */
  query: string;
  /** Token budget for the complete context */
  maxTokens: number;
  /** Types of sources to include */
  includeTypes?: ContextSource["type"][];
  /** Specific session or agent IDs to scope context */
  sessionId?: string;
  agentId?: string;
  /** Minimum relevance threshold */
  minRelevance?: number;
}

export interface ContextResult {
  sources: ContextSource[];
  totalTokens: number;
  truncated: boolean;
  query: string;
}

// -- Context Sources ---------------------------------------------------------

/**
 * Context Provider Interface.
 * Each source type implements this to contribute context.
 */
export interface ContextProvider {
  type: ContextSource["type"];
  priority: number; // Higher = included first when budget is tight
  fetch(request: ContextRequest): Promise<ContextSource[]>;
}

const providers: ContextProvider[] = [];

/**
 * Register a context provider.
 */
export function registerProvider(provider: ContextProvider): void {
  providers.push(provider);
  providers.sort((a, b) => b.priority - a.priority);
}

// -- Core Engine -------------------------------------------------------------

/**
 * Build context by querying all registered providers and selecting the most
 * relevant sources within the token budget.
 */
export async function buildContext(request: ContextRequest): Promise<ContextResult> {
  const { query, maxTokens, includeTypes, minRelevance = 0.3 } = request;

  // Gather sources from all matching providers.
  let allSources: ContextSource[] = [];
  for (const provider of providers) {
    if (includeTypes && !includeTypes.includes(provider.type)) continue;
    try {
      const sources = await provider.fetch(request);
      allSources.push(...sources);
    } catch (err) {
      logger.warn({ provider: provider.type, err }, "context provider failed");
    }
  }

  // Filter by relevance.
  allSources = allSources.filter((s) => s.relevance >= minRelevance);

  // Sort by relevance descending, then by priority ascending (tiebreaker).
  allSources.sort((a, b) => {
    const relDiff = b.relevance - a.relevance;
    if (relDiff !== 0) return relDiff;
    return a.tokens - b.tokens; // Prefer smaller sources when relevance is equal
  });

  // Select sources within the token budget.
  const selected: ContextSource[] = [];
  let totalTokens = 0;
  let truncated = false;

  for (const source of allSources) {
    if (totalTokens + source.tokens > maxTokens) {
      truncated = true;
      continue;
    }
    selected.push(source);
    totalTokens += source.tokens;
  }

  logger.debug(
    { query: query.slice(0, 100), totalTokens, sources: selected.length, truncated },
    "context built",
  );

  return {
    sources: selected,
    totalTokens,
    truncated,
    query,
  };
}

/**
 * Format context sources into a single string suitable for LLM injection.
 */
export function formatContextForPrompt(result: ContextResult): string {
  if (result.sources.length === 0) return "";

  const parts = result.sources.map((source, i) =>
    `[${source.type.toUpperCase()} ${i + 1}]${source.metadata?.path ? ` (${source.metadata.path})` : ""}\n${source.content}`,
  );

  return `<context>\n${parts.join("\n\n")}\n</context>`;
}

/**
 * Format context as a compact summary for display in the UI.
 */
export function formatContextSummary(result: ContextResult): string {
  const counts = new Map<string, number>();
  for (const source of result.sources) {
    counts.set(source.type, (counts.get(source.type) ?? 0) + 1);
  }

  const parts = Array.from(counts.entries())
    .map(([type, count]) => `${count} ${type}`)
    .join(", ");

  return `${result.sources.length} sources (${parts}) - ${result.totalTokens} tokens${result.truncated ? " (truncated)" : ""}`;
}

// -- Built-in Providers ------------------------------------------------------

/**
 * Memory provider: fetches relevant memories from the workspace.
 */
export function createMemoryContextProvider(): ContextProvider {
  return {
    type: "memory",
    priority: 80,
    async fetch(request: ContextRequest): Promise<ContextSource[]> {
      try {
        const { searchMemories } = await import("../memory/memory");
        const { results } = await searchMemories(request.workspaceId, request.query, 10);
        return results.map((hit) => ({
          id: `memory:${hit.memory.id}`,
          type: "memory" as const,
          relevance: hit.score ?? 0.5,
          content: hit.memory.body || hit.memory.title || "",
          tokens: estimateTokens(hit.memory.body || hit.memory.title || ""),
          metadata: {
            memoryId: hit.memory.id,
            title: hit.memory.title,
            sourceType: hit.memory.sourceType,
            matchedBy: hit.matchedBy,
          },
        }));
      } catch (err) {
        logger.warn({ err }, "memory context provider failed");
        return [];
      }
    },
  };
}

/**
 * Session history provider: fetches recent messages from a chat session.
 */
export function createSessionHistoryProvider(): ContextProvider {
  return {
    type: "message",
    priority: 90,
    async fetch(request: ContextRequest): Promise<ContextSource[]> {
      if (!request.sessionId) return [];
      try {
        const { db } = await import("../../db/client");
        const { aiChatMessages } = await import("../../db/schema/chat");
        const { and, eq, asc, desc } = await import("drizzle-orm");

        const rows = await db.query.aiChatMessages.findMany({
          where: and(
            eq(aiChatMessages.sessionId, request.sessionId),
          ),
          orderBy: [asc(aiChatMessages.createdAt)],
          limit: 50,
        });

        return rows.map((row) => ({
          id: `message:${row.id}`,
          type: "message" as const,
          relevance: 0.9,
          content: `${row.role}: ${row.content}`,
          tokens: estimateTokens(row.content),
          metadata: {
            messageId: row.id,
            role: row.role,
            model: row.model,
            createdAt: row.createdAt.toISOString(),
          },
        }));
      } catch (err) {
        logger.warn({ err }, "session history provider failed");
        return [];
      }
    },
  };
}

/**
 * Search provider: performs keyword/vector search across workspace files.
 */
export function createSearchContextProvider(): ContextProvider {
  return {
    type: "search",
    priority: 70,
    async fetch(request: ContextRequest): Promise<ContextSource[]> {
      try {
        const { keywordSearch } = await import("../search/keyword");
        const results = await keywordSearch({
          workspaceId: request.workspaceId,
          query: request.query,
          type: "all",
          limit: 10,
        });

        return results.map((result) => ({
          id: `search:${result.id}`,
          type: "search" as const,
          relevance: 0.6,
          content: result.title + (result.description ? `\n${result.description}` : ""),
          tokens: estimateTokens(result.title + (result.description ? `\n${result.description}` : "")),
          metadata: {
            searchId: result.id,
            type: result.type,
            title: result.title,
          },
        }));
      } catch (err) {
        logger.warn({ err }, "search context provider failed");
        return [];
      }
    },
  };
}

// -- Initialize default providers -------------------------------------------

registerProvider(createMemoryContextProvider());
registerProvider(createSessionHistoryProvider());
registerProvider(createSearchContextProvider());

logger.info("context engine initialized with default providers");
