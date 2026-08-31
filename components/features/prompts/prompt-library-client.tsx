"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Library, Search } from "@/components/ui/icons";
import { PageHeader } from "@/components/shared/page-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PromptCard } from "@/components/features/prompts/prompt-card";
import type { Prompt } from "@/lib/types";
import { cn } from "@/lib/utils";

const FILTERS = ["All", "Favorites"] as const;

const SORTS = ["Most run", "Newest", "A–Z"] as const;

export default function PromptLibraryClient({ prompts }: { prompts: Prompt[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [sort, setSort] = useState<(typeof SORTS)[number]>("Most run");

  const filtered = useMemo(() => {
    const matches = prompts.filter((p) => {
      if (filter === "Favorites" && !p.favorite) return false;
      const haystack = `${p.title} ${p.description} ${p.tags.join(" ")} ${p.content}`.toLowerCase();
      return !query || haystack.includes(query.toLowerCase());
    });
    return [...matches].sort((a, b) => {
      if (sort === "Most run") return b.usageCount - a.usageCount;
      if (sort === "Newest") return b.updatedAt.localeCompare(a.updatedAt);
      return a.title.localeCompare(b.title);
    });
  }, [prompts, query, filter, sort]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Prompt Library"
        description="Improved prompts, scored and versioned. Copy any prompt in one click."
        action={
          <Link href="/chat">
            <Button size="sm" icon={<Plus className="h-4 w-4" />}>
              Improve a prompt
            </Button>
          </Link>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <Input
            type="search"
            placeholder="Search prompts…"
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn("filter-pill", filter === f && "filter-pill-active")}
            >
              {f}
            </button>
          ))}
        </div>
        <select
          aria-label="Sort prompts"
          value={sort}
          onChange={(e) => setSort(e.target.value as (typeof SORTS)[number])}
          className="h-8 rounded-lg border border-border bg-surface px-2 text-[11px] font-medium text-muted focus:border-border-strong focus:outline-none"
        >
          {SORTS.map((s) => (
            <option key={s} value={s}>
              Sort: {s}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Library className="h-5 w-5" />}
          title="No prompts found"
          description="Paste a weak prompt and let LayerFlow improve and score it."
          action={
            <Link href="/chat">
              <Button variant="secondary" size="sm">
                Improve a prompt
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => (
            <PromptCard key={p.id} prompt={p} />
          ))}
        </div>
      )}
    </div>
  );
}
