"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { ArrowLeft, Pencil, BookUser, Library, Brain, Plus } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PassportCard } from "@/components/app/passport-card";
import { PROJECT_BY_ID } from "@/lib/data/workspace";
import { PASSPORTS, RESCUE_REPORTS } from "@/lib/data/passports";
import { PROMPTS } from "@/lib/data/prompts";
import { TIMELINE, LEARNINGS } from "@/lib/data/workspace";
import { timeAgo } from "@/lib/data/providers";
import { cn } from "@/lib/utils";

export default function ProjectDetailClient() {
  const { projectId } = useParams<{ projectId: string }>();
  const project = PROJECT_BY_ID[projectId];
  if (!project) notFound();

  const passports = PASSPORTS.filter((p) => p.meta.projectId === projectId);
  const prompts = PROMPTS.filter((p) =>
    RESCUE_REPORTS.some((r) => r.projectId === projectId && r.title.includes(p.title.split("—")[0].trim())),
  );
  const learnings = LEARNINGS.filter((l) => l.projectId === projectId);
  const events = TIMELINE.filter((e) => e.projectId === projectId);

  return (
    <div>
      <Link
        href="/workspace"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Workspace
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <span
            className="flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-bold"
            style={{ background: `${project.color}26`, color: project.color }}
          >
            {project.name.charAt(0)}
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-ink">{project.name}</h1>
              <Badge tone={project.stage === "active" ? "green" : project.stage === "paused" ? "amber" : "neutral"}>
                {project.stage}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted">{project.description}</p>
            <p className="mt-0.5 text-[11px] text-faint">
              created {timeAgo(project.createdAt)} · updated {timeAgo(project.updatedAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" icon={<Pencil className="h-3.5 w-3.5" />}>
            Edit project
          </Button>
          <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />}>
            Add passport
          </Button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Passports", value: project.passportCount, icon: BookUser },
          { label: "Prompts", value: project.promptCount, icon: Library },
          { label: "Learnings", value: project.learningCount, icon: Brain },
          { label: "Ledger events", value: events.length, icon: null },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-surface-2/40 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-faint">{s.label}</p>
            <p className="mt-0.5 text-xl font-bold text-ink">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader
              title="Context Passports"
              description="Saved context for this project"
              action={
                <Link href="/passports" className="section-link">
                  View library
                </Link>
              }
            />
            <CardBody className="space-y-3">
              {passports.length ? (
                passports.map((p) => <PassportCard key={p.id} passport={p} />)
              ) : (
                <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-faint">
                  No passports yet — rescue a chat and assign it to this project.
                </p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Prompts" />
            <CardBody className="space-y-2">
              {prompts.length ? (
                prompts.map((p) => (
                  <Link
                    key={p.id}
                    href={`/app/prompts/${p.id}`}
                    className="flex items-center gap-3 rounded-xl border border-border bg-surface-2/40 px-4 py-3 transition-colors hover:border-border-strong hover:bg-surface-2"
                  >
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-xs font-bold text-emerald-400">
                      {p.score}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">{p.title}</p>
                      <p className="truncate text-[11px] text-faint">v{p.version} · {p.usageCount} uses</p>
                    </div>
                  </Link>
                ))
              ) : (
                <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-faint">
                  No prompts yet.
                </p>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Learning Memory" />
            <CardBody className="space-y-3">
              {learnings.length ? (
                learnings.map((l) => (
                  <div key={l.id} className="rounded-xl border border-border bg-surface-2/40 p-3.5">
                    <p className="text-xs leading-relaxed text-ink/90">{l.content}</p>
                    <p className="mt-2 text-[10px] text-faint">{l.source}</p>
                  </div>
                ))
              ) : (
                <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-faint">
                  No learnings saved yet.
                </p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Project timeline" />
            <CardBody>
              <div className="space-y-0">
                {events.slice(0, 5).map((evt, i) => (
                  <div key={evt.id} className="relative flex gap-3 pb-4 last:pb-0">
                    {i < Math.min(events.length, 5) - 1 ? (
                      <span className="absolute left-[5px] top-4 h-full w-px bg-border" aria-hidden />
                    ) : null}
                    <span
                      className={cn(
                        "relative mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full border-2 border-surface",
                        evt.type === "rescue" && "bg-amber-400",
                        evt.type === "prompt" && "bg-emerald-400",
                        evt.type === "learning" && "bg-violet-400",
                        evt.type === "decision" && "bg-rose-400",
                        evt.type === "cost" && "bg-sky-400",
                        evt.type === "model" && "bg-pink-400",
                        evt.type === "passport" && "bg-slate-400",
                      )}
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-ink">{evt.title}</p>
                      <p className="text-[10px] text-faint">{timeAgo(evt.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
