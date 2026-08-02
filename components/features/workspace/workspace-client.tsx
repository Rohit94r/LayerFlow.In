"use client";

import { useMemo, useState } from "react";
import { FolderKanban, History, Brain, Search, Plus, Pin } from "@/components/ui/icons";
import { PageHeader } from "@/components/shared/page-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { ProjectCard } from "@/components/features/workspace/project-card";
import { Timeline } from "@/components/features/history/timeline";
import { workspaceService } from "@/lib/services/workspace";
import { timeAgo } from "@/lib/data/providers";
import { cn } from "@/lib/utils";

type WorkspaceClientProps = {
  projects: Awaited<ReturnType<typeof workspaceService.listProjects>>;
  timeline: Awaited<ReturnType<typeof workspaceService.listTimeline>>;
  learnings: Awaited<ReturnType<typeof workspaceService.listLearnings>>;
};

export default function WorkspaceClient({ projects, timeline, learnings }: WorkspaceClientProps) {
  const [tab, setTab] = useState("projects");
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState("All");

  const allTags = useMemo(
    () => ["All", ...Array.from(new Set(learnings.flatMap((l) => l.tags)))],
    [learnings],
  );

  const filteredLearnings = useMemo(() => {
    return learnings.filter(
      (l) => (tag === "All" || l.tags.includes(tag)) && (!query || l.content.toLowerCase().includes(query.toLowerCase())),
    );
  }, [learnings, tag, query]);

  const filteredTimeline = useMemo(
    () => timeline.filter((e) => !query || e.title.toLowerCase().includes(query.toLowerCase())),
    [timeline, query],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description="Projects, the AI Work Ledger, and your Learning Memory — everything your AI work has produced."
        action={
          <Button size="sm" icon={<Plus className="h-4 w-4" />}>
            New project
          </Button>
        }
      />

      <Tabs
        items={[
          { id: "projects", label: "Projects", icon: <FolderKanban className="h-3.5 w-3.5" /> },
          { id: "timeline", label: "AI Work Ledger", icon: <History className="h-3.5 w-3.5" /> },
          { id: "learnings", label: "Learning Memory", icon: <Brain className="h-3.5 w-3.5" /> },
        ]}
        active={tab}
        onChange={setTab}
      />

      <div className="relative max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
        <Input
          type="search"
          placeholder="Search projects, ledger, learnings…"
          className="pl-9"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {tab === "projects" ? (
        projects.length === 0 ? (
          <EmptyState
            icon={<FolderKanban className="h-5 w-5" />}
            title="No projects yet"
            description="Create a project to group passports, prompts and learnings."
            action={
              <Button size="sm" icon={<Plus className="h-4 w-4" />}>
                New project
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        )
      ) : null}

      {tab === "timeline" ? (
        filteredTimeline.length === 0 ? (
          <EmptyState icon={<History className="h-5 w-5" />} title="Nothing in the ledger yet" />
        ) : (
          <div className="rounded-2xl border border-border bg-surface/40 p-5">
            <Timeline events={filteredTimeline} />
          </div>
        )
      ) : null}

      {tab === "learnings" ? (
        <div>
          <div className="mb-4 flex flex-wrap gap-1.5">
            {allTags.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTag(t)}
                className={cn("filter-pill", tag === t && "filter-pill-active")}
              >
                {t}
              </button>
            ))}
          </div>
          {filteredLearnings.length === 0 ? (
            <EmptyState icon={<Brain className="h-5 w-5" />} title="No learnings found" />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredLearnings.map((l) => (
                <div
                  key={l.id}
                  className={cn(
                    "rounded-2xl border border-border bg-surface/40 p-5",
                    l.pinned && "border-brand/30",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm leading-relaxed text-ink/90">{l.content}</p>
                    {l.pinned ? (
                      <Pin className="h-3.5 w-3.5 shrink-0 fill-brand text-brand" aria-label="Pinned" />
                    ) : null}
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-1.5">
                    {l.tags.map((t) => (
                      <Badge key={t} tone="neutral">
                        #{t}
                      </Badge>
                    ))}
                    <span className="ml-auto text-[10px] text-faint">{timeAgo(l.createdAt)}</span>
                  </div>
                  <p className="mt-1.5 text-[10px] text-faint">{l.source}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
