"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Library, Search, Star } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadialScore } from "@/components/ui/charts";
import { PROMPTS } from "@/lib/data/prompts";
import { timeAgo } from "@/lib/data/providers";
import { cn } from "@/lib/utils";

const FILTERS = ["All", "≥90", "80–89", "Favorites"];

export default function PromptsClient() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");

  const filtered = PROMPTS.filter((p) => {
    if (filter === "Favorites" && !p.favorite) return false;
    if (filter === "≥90" && p.score < 90) return false;
    if (filter === "80–89" && (p.score < 80 || p.score >= 90)) return false;
    const haystack = `${p.title} ${p.description} ${p.tags.join(" ")} ${p.content}`.toLowerCase();
    return !query || haystack.includes(query.toLowerCase());
  });

  return (
    <div>
      <PageHeader
        title="Prompt Library"
        description="Improved prompts, scored and versioned. Copy any prompt in one click."
        actions={
          <Link href="/rescue?mode=prompt">
            <Button icon={<Plus className="h-4 w-4" />}>Improve a prompt</Button>
          </Link>
        }
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
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
        <div className="card flex flex-col items-center px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-surface-2 text-faint">
            <Library className="h-6 w-6" />
          </span>
          <h3 className="mt-5 text-base font-semibold text-ink">No prompts found</h3>
          <p className="mt-1.5 max-w-sm text-sm text-muted">
            Paste a weak prompt and let LayerFlow improve and score it.
          </p>
          <Link href="/rescue?mode=prompt" className="mt-5">
            <Button variant="secondary" size="sm">Improve a prompt</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((p) => (
            <Link key={p.id} href={`/prompts/${p.id}`} className="card card-hover group flex gap-5 p-5">
              <RadialScore value={p.score} size={64} className="mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-ink">{p.title}</h3>
                  {p.favorite ? (
                    <Star className="h-3.5 w-3.5 shrink-0 fill-brand text-brand" aria-label="Favorite" />
                  ) : null}
                </div>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">{p.description}</p>
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {p.tags.slice(0, 3).map((t) => (
                    <Badge key={t} tone="neutral">#{t}</Badge>
                  ))}
                  <span className="ml-auto text-[10px] text-faint">
                    v{p.version} · {timeAgo(p.updatedAt)} · {p.usageCount} uses
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
