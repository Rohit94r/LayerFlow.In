"use client";

import { useEffect, useRef, useState } from "react";
import { Search, BookUser, Library, Folder, Brain, Clock } from "@/components/ui/icons";
import { PageHeader } from "@/components/shared/page-header";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Row } from "@/components/shared/row";
import { ToolChip } from "@/components/ui/tool-logo";
import { EmptyState } from "@/components/ui/empty-state";
import { searchService, type SearchResults } from "@/lib/services/search";
import type { AiTool } from "@/lib/types";
import { timeAgo } from "@/lib/data/providers";

const EMPTY: SearchResults = { prompts: [], passports: [], projects: [], learnings: [], events: [], total: 0 };

const GROUPS = [
  { key: "projects", label: "Projects", icon: Folder, href: (id: string) => `/workspace/${id}` },
  { key: "prompts", label: "Prompts", icon: Library, href: (id: string) => `/prompts/${id}` },
  { key: "passports", label: "Passports", icon: BookUser, href: (id: string) => `/passports/${id}` },
  { key: "learnings", label: "Learnings", icon: Brain },
  { key: "events", label: "Ledger events", icon: Clock },
] as const;

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [results, setResults] = useState<SearchResults>(EMPTY);
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
    searchService.search(debounced).then((r) => {
      if (alive) setResults(r);
    });
    return () => {
      alive = false;
    };
  }, [debounced]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Search"
        description="One search across projects, prompts, passports, learnings and the work ledger."
      />

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint"
        />
        <input
          ref={inputRef}
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
                    const it = item as {
                      id: string;
                      title?: string;
                      name?: string;
                      content?: string;
                      description?: string;
                      source?: string;
                      summary?: string;
                      createdAt?: string;
                      meta?: { sourceTool: AiTool };
                    };
                    const title = it.title ?? it.name ?? it.content?.slice(0, 60) ?? "";
                    const subtitle = it.description ?? it.source ?? it.summary?.slice(0, 60);
                    const sub = it.createdAt
                      ? `${timeAgo(it.createdAt)}${subtitle ? ` · ${subtitle}` : ""}`
                      : subtitle;
                    return (
                      <Row
                        key={it.id}
                        href={"href" in g ? g.href(it.id) : undefined}
                        title={title}
                        subtitle={sub}
                        trailing={
                          it.meta ? <ToolChip tool={it.meta.sourceTool} /> : undefined
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
