"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Library, Search, Star } from "@/components/ui/icons";
import { PageHeader } from "@/components/shared/page-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PromptCard } from "@/components/features/prompts/prompt-card";
import type { Prompt } from "@/lib/types";
import { cn } from "@/lib/utils";

const FILTERS = ["All", "≥90", "80–89", "Favorites"] as const;

export default function PromptLibraryClient({ prompts }: { prompts: Prompt[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");

  const filtered = useMemo(() => {
    return prompts.filter((p) => {
      if (filter === "Favorites" && !p.favorite) return false;
      if (filter === "≥90" && p.score < 90) return false;
      if (filter === "80–89" && (p.score < 80 || p.score >= 90)) return false;
      const haystack = `${p.title} ${p.description} ${p.tags.join(" ")} ${p.content}`.toLowerCase();
      return !query || haystack.includes(query.toLowerCase());
    });
  }, [prompts, query, filter]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Prompt Library"
        description="Improved prompts, scored and versioned. Copy any prompt in one click."
        action={
          <Link href="/rescue?mode=prompt">
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
        <div className="flex flex-wrap gap-1.5">
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
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Library className="h-5 w-5" />}
          title="No prompts found"
          description="Paste a weak prompt and let LayerFlow improve and score it."
          action={
            <Link href="/rescue?mode=prompt">
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
