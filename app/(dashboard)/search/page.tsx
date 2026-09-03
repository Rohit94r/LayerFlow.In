"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Library, BookUser, Brain, Code2, Bot } from "@/components/ui/icons";
import { PageHeader } from "@/components/shared/page-header";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Row } from "@/components/shared/row";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Badge } from "@/components/ui/badge";
import { searchService, type SearchResults } from "@/lib/services/search";
import { timeAgo } from "@/lib/data/providers";

const EMPTY: SearchResults = { prompts: [], sessions: [], memories: [], files: [], agentRuns: [], total: 0 };

const GROUPS = [
  { key: "prompts", label: "Prompts", icon: Library, href: (id: string) => `/prompts/${id}` },
  { key: "sessions", label: "Sessions", icon: BookUser, href: (id: string) => `/chat/${id}` },
  { key: "memories", label: "Memories", icon: Brain, href: (id: string) => `/memory?id=${id}` },
  { key: "files", label: "Files", icon: Code2, href: (id: string) => `/files/${id}` },
  { key: "agentRuns", label: "Agent Runs", icon: Bot, href: (id: string) => `/agents/runs/${id}` },
] as const;

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [results, setResults] = useState<SearchResults>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const busy = debounced.trim() !== query.trim();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query), 180);
    return () => window.clearTimeout(t);
  }, [query]);

  useEffect(() => {
    let alive = true;
    searchService
      .search(debounced)
      .then((r) => {
        if (alive) {
          setError(null);
          setResults(r);
        }
      })
      .catch((err: unknown) => {
        if (alive) {
          setResults(EMPTY);
          setError(err instanceof Error ? err.message : "Search is unavailable right now.");
        }
      });
    return () => {
      alive = false;
    };
  }, [debounced, retryKey]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Search"
        description="One search across your prompts and sessions."
      />

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint"
        />
        <input
          ref={inputRef}
          aria-label="Search your AI work"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="search your AI work…  (e.g. “webhook”, “images”, “stripe”)"
          className="w-full rounded-2xl border border-border bg-surface-2/60 py-3 pl-10 pr-4 text-sm text-ink outline-none transition-colors placeholder:text-faint focus:border-brand/50"
        />
      </div>

      {busy ? (
        <div className="space-y-2.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-surface-2/60" />
          ))}
        </div>
      ) : error ? (
        <ErrorState
          title="Search failed"
          description={error}
          onRetry={() => setRetryKey((k) => k + 1)}
        />
      ) : query.trim() && results.total === 0 ? (
        <EmptyState
          icon={<Search className="h-5 w-5" />}
          title="Nothing found"
          description={`No matches for “${query.trim()}”. Try a provider, tag or file name.`}
        />
      ) : (
        <div className="space-y-5">
          {GROUPS.map((g) => {
            const items = results[g.key];
            if (!items.length) return null;
            const Icon = g.icon;
            return (
              <Panel key={g.key}>
                <PanelHeader
                  title={
                    <span className="inline-flex items-center gap-2">
                      <Icon className="h-4 w-4 text-faint" /> {g.label}
                    </span>
                  }
                  description={`${items.length} result${items.length === 1 ? "" : "s"}`}
                />
                <PanelBody className="p-2.5">
                  {items.map((item) => {
                    const title = item.title;
                    const subtitle =
                      item.type === "prompt"
                        ? (item.snippet ?? item.description ?? "")
                        : (item.description ?? "");
                    const sub = `${timeAgo(item.updatedAt)}${subtitle ? ` · ${subtitle}` : ""}`;
                    return (
                      <Row
                        key={item.id}
                        href={g.href(item.id)}
                        title={title}
                        subtitle={sub}
                        trailing={
                          item.type === "prompt" ? undefined : (
                            item.type === "session" || item.type === "agent_run" ? (
                              <Badge
                                tone={
                                  item.status === "completed"
                                    ? "green"
                                    : item.status === "failed"
                                      ? "red"
                                      : item.status === "paused"
                                        ? "amber"
                                        : "neutral"
                                }
                              >
                                {item.status}
                              </Badge>
                            ) : undefined
                          )
                        }
                        className="rounded-lg"
                      />
                    );
                  })}
                </PanelBody>
              </Panel>
            );
          })}

          {!query.trim() ? (
            <p className="py-10 text-center text-sm text-faint">
              Type to search across your entire AI work history.
            </p>
          ) : null}

          {query.trim() && results.total > 0 ? (
            <p className="pb-2 text-center text-[11px] text-faint">
              {results.total} matches across {GROUPS.filter((g) => results[g.key].length > 0).length} surfaces
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}