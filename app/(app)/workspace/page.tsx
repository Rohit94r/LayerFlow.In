"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  FolderKanban,
  History,
  Brain,
  Search,
  Plus,
  Pin,
  ArrowRight,
} from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { PROJECTS, TIMELINE, LEARNINGS } from "@/lib/data/workspace";
import { timeAgo } from "@/lib/data/providers";
import { cn } from "@/lib/utils";

const TYPE_COLORS: Record<string, string> = {
  rescue: "bg-amber-400",
  prompt: "bg-emerald-400",
  learning: "bg-violet-400",
  decision: "bg-rose-400",
  cost: "bg-sky-400",
  model: "bg-pink-400",
  passport: "bg-slate-400",
};

export default function WorkspaceClient() {
  const [tab, setTab] = useState("projects");
  const [query, setQuery] = useState("");

  const searchResults = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return null;
    const hits: { type: string; title: string; detail: string; href: string }[] = [];
    for (const p of PROJECTS) {
      if (p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)) {
        hits.push({ type: "project", title: p.name, detail: p.description, href: `/app/workspace/${p.id}` });
      }
    }
    for (const t of TIMELINE) {
      if (t.title.toLowerCase().includes(q)) {
        hits.push({ type: "event", title: t.title, detail: t.meta ?? "", href: "/workspace" });
      }
    }
    for (const l of LEARNINGS) {
      if (l.content.toLowerCase().includes(q)) {
        hits.push({ type: "learning", title: l.content.slice(0, 90) + "…", detail: l.source, href: "/workspace" });
      }
    }
    return hits;
  }, [query]);

  return (
    <div>
      <PageHeader
        title="Workspace"
        description="Projects, the AI Work Ledger, and your Learning Memory — everything your AI work has ever produced."
        actions={
          <Button icon={<Plus className="h-4 w-4" />} size="sm">
            New project
          </Button>
        }
      />

      <Tabs
        className="mb-6"
        items={[
          { id: "projects", label: "Projects", icon: <FolderKanban className="h-3.5 w-3.5" /> },
          { id: "timeline", label: "AI Work Ledger", icon: <History className="h-3.5 w-3.5" /> },
          { id: "learnings", label: "Learning Memory", icon: <Brain className="h-3.5 w-3.5" /> },
        ]}
        active={tab}
        onChange={setTab}
      />

      {/* Search */}
      <div className="relative mb-6 max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
        <Input
          type="search"
          placeholder="Search everything — projects, passports, prompts, learnings…"
          className="pl-9"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {searchResults ? (
        <div className="mb-6 space-y-2">
          <p className="text-xs font-semibold text-faint">
            {searchResults.length} result{searchResults.length === 1 ? "" : "s"} for “{query}”
          </p>
          {searchResults.map((r, i) => (
            <Link
              key={`${r.type}-${i}`}
              href={r.href}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface-2/40 px-4 py-3 transition-colors hover:border-border-strong hover:bg-surface-2"
            >
              <Badge tone="amber">{r.type}</Badge>
              <p className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{r.title}</p>
              <p className="hidden truncate text-[11px] text-faint sm:block">{r.detail}</p>
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-faint" />
            </Link>
          ))}
        </div>
      ) : null}

      {tab === "projects" ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {PROJECTS.map((p) => (
            <Link key={p.id} href={`/app/workspace/${p.id}`} className="card card-hover group flex h-full flex-col p-5">
              <div className="flex items-start justify-between">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-[15px] font-bold text-[#0e1416]"
                  style={{ background: `${p.color}33`, color: p.color }}
                >
                  {p.name.charAt(0)}
                </span>
                <Badge
                  tone={p.stage === "active" ? "green" : p.stage === "paused" ? "amber" : "neutral"}
                >
                  {p.stage}
                </Badge>
              </div>
              <h3 className="mt-4 text-sm font-semibold text-ink">{p.name}</h3>
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">{p.description}</p>
              <div className="mt-4 flex items-center gap-3 text-[11px] text-faint">
                <span>{p.passportCount} passports</span>
                <span>·</span>
                <span>{p.promptCount} prompts</span>
                <span>·</span>
                <span>{p.learningCount} learnings</span>
                <span className="ml-auto">updated {timeAgo(p.updatedAt)}</span>
              </div>
            </Link>
          ))}
        </div>
      ) : null}

      {tab === "timeline" ? (
        <Card>
          <CardHeader
            title="AI Work Ledger"
            description="Chronological record of every rescue, prompt, decision and cost"
          />
          <CardBody>
            <div className="space-y-0">
              {TIMELINE.map((evt, i) => (
                <div key={evt.id} className="relative flex gap-4 pb-5 last:pb-0">
                  {i < TIMELINE.length - 1 ? (
                    <span className="absolute left-[5px] top-5 h-full w-px bg-border" aria-hidden />
                  ) : null}
                  <span
                    className={cn(
                      "relative mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full border-2 border-surface",
                      TYPE_COLORS[evt.type] ?? "bg-slate-400",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-ink">{evt.title}</p>
                      <Badge tone="neutral">{evt.type}</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted">{evt.description}</p>
                    <p className="mt-0.5 text-[11px] text-faint">
                      {evt.meta} · {timeAgo(evt.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      ) : null}

      {tab === "learnings" ? (
        <div>
          <div className="mb-4 flex flex-wrap gap-1.5">
            {["All", ...Array.from(new Set(LEARNINGS.flatMap((l) => l.tags)))].map((t) => (
              <button key={t} type="button" className="filter-pill">
                {t}
              </button>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {LEARNINGS.map((l) => (
              <div key={l.id} className={cn("card p-5", l.pinned && "border-brand/30")}>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm leading-relaxed text-ink/90">{l.content}</p>
                  {l.pinned ? (
                    <Pin className="h-3.5 w-3.5 shrink-0 fill-brand text-brand" aria-label="Pinned" />
                  ) : null}
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-1.5">
                  {l.tags.map((t) => (
                    <Badge key={t} tone="neutral">#{t}</Badge>
                  ))}
                  <span className="ml-auto text-[10px] text-faint">{timeAgo(l.createdAt)}</span>
                </div>
                <p className="mt-1.5 text-[10px] text-faint">{l.source}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
