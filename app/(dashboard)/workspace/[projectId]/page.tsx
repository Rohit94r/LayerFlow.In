import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, Plus, BookUser, Library, Brain, Terminal } from "@/components/ui/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Stat } from "@/components/shared/stat";
import { Section } from "@/components/shared/section";
import { Row } from "@/components/shared/row";
import { ToolChip } from "@/components/ui/tool-logo";
import { workspaceService } from "@/lib/services/workspace";
import { passportService } from "@/lib/services/passports";
import { toolMeta, timeAgo, formatMoney } from "@/lib/data/providers";
import { cn } from "@/lib/utils";

const EVENT_DOT: Record<string, string> = {
  rescue: "bg-amber-400",
  prompt: "bg-brand",
  learning: "bg-brand-2",
  decision: "bg-rose-400",
  cost: "bg-sky-400",
  model: "bg-pink-400",
  passport: "bg-slate-400",
};

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const project = await workspaceService.getProject(projectId);
  if (!project) notFound();

  const [passports, reports, learnings, events] = await Promise.all([
    passportService.listPassports(),
    passportService.listRescueReports(),
    workspaceService.listLearnings(),
    workspaceService.listTimeline(),
  ]);

  const projectPassports = passports.filter((p) => p.meta.projectId === projectId);
  const projectReports = reports.filter((r) => r.projectId === projectId);
  const projectLearnings = learnings.filter((l) => l.projectId === projectId);
  const projectEvents = events.filter((e) => e.projectId === projectId);

  const stats = [
    { label: "Passports", value: projectPassports.length, icon: BookUser },
    { label: "Continue Packs", value: projectReports.length, icon: Terminal },
    { label: "Learnings", value: projectLearnings.length, icon: Brain },
    { label: "Ledger events", value: projectEvents.length, icon: Library },
  ];

  return (
    <div className="space-y-6">
      <Link
        href="/workspace"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted transition-colors hover:text-ink"
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
          <Link href="/rescue">
            <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />}>
              New Continue Pack
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Stat key={s.label} label={s.label} value={s.value} icon={<s.icon className="h-4 w-4" />} />
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Section title="Context Passports" description="Saved context for this project" href="/passports">
            {projectPassports.length ? (
              <div className="space-y-0.5">
                {projectPassports.map((p) => {
                  const meta = toolMeta(p.meta.sourceTool);
                  return (
                    <Row
                      key={p.id}
                      href={`/passports/${p.id}`}
                      leading={
                        <span
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-xs"
                          style={{ background: `${meta.color}1f`, color: meta.color }}
                        >
                          <BookUser className="h-3.5 w-3.5" />
                        </span>
                      }
                      title={p.title}
                      subtitle={`${timeAgo(p.updatedAt)} · ~${formatMoney(p.meta.estimatedNextCost)} next run`}
                      trailing={<ToolChip tool={p.meta.sourceTool} />}
                    />
                  );
                })}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-faint">
                No passports yet — rescue a chat and assign it to this project.
              </p>
            )}
          </Section>

          <Section
            title="Saved Continue Packs"
            description="Rescued chats that belong to this project"
            href="/rescue"
          >
            {projectReports.length ? (
              <div className="space-y-0.5">
                {projectReports.map((r) => (
                  <Row
                    key={r.id}
                    href="/rescue"
                    leading={
                      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-xs font-bold text-brand">
                        {r.promptScore}
                      </span>
                    }
                    title={r.title}
                    subtitle={`${r.compressionPercent}% compression · ${r.summary.slice(0, 72)}…`}
                    trailing={<Badge tone="mint">saved</Badge>}
                  />
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-faint">
                No Continue Packs saved for this project yet.
              </p>
            )}
          </Section>
        </div>

        <div className="space-y-5">
          <Section title="Learning Memory" description="What LayerFlow remembered">
            {projectLearnings.length ? (
              <div className="space-y-3">
                {projectLearnings.map((l) => (
                  <div key={l.id} className="rounded-xl border border-border bg-surface-2/40 p-3.5">
                    <p className="text-xs leading-relaxed text-ink/90">{l.content}</p>
                    <p className="mt-2 text-[10px] text-faint">{l.source}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-faint">
                No learnings saved yet.
              </p>
            )}
          </Section>

          <Section title="Project timeline" href="/history">
            {projectEvents.length ? (
              <div>
                {projectEvents.slice(0, 6).map((evt, i) => (
                  <div key={evt.id} className="relative flex gap-3 pb-4 last:pb-0">
                    {i < Math.min(projectEvents.length, 6) - 1 ? (
                      <span className="absolute left-[5px] top-4 h-full w-px bg-border" aria-hidden />
                    ) : null}
                    <span
                      className={cn(
                        "relative mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full border-2 border-surface",
                        EVENT_DOT[evt.type] ?? "bg-slate-400",
                      )}
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-ink">{evt.title}</p>
                      <p className="text-[10px] text-faint">{timeAgo(evt.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-faint">
                No ledger events yet.
              </p>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}
