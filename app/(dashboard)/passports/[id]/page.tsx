import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, BookmarkPlus } from "@/components/ui/icons";
import { Panel, PanelHeader, PanelBody } from "@/components/ui/panel";
import { Badge, Dot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Stat } from "@/components/shared/stat";
import { ToolChip } from "@/components/ui/tool-logo";
import { PassportActions } from "@/components/features/passports/passport-actions";
import { passportService } from "@/lib/services/passports";
import { workspaceService } from "@/lib/services/workspace";
import { MODEL_BY_ID, formatMoney, timeAgo } from "@/lib/data/providers";

export default async function PassportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const passport = await passportService.getPassport(id);
  if (!passport) notFound();

  const project = passport.meta.projectId ? await workspaceService.getProject(passport.meta.projectId) : null;

  const rows = [
    { label: "Goal", value: passport.fields.goal },
    { label: "Current state", value: passport.fields.currentState },
    { label: "Output format", value: passport.fields.outputFormat },
    { label: "Next action", value: passport.fields.nextAction },
  ];
  const lists = [
    { label: "Key decisions", items: passport.fields.decisions, color: "#f59e0b" },
    { label: "Constraints", items: passport.fields.constraints, color: "#38bdf8" },
    { label: "What worked", items: passport.fields.successes, color: "#44edbc" },
    { label: "What failed", items: passport.fields.failures, color: "#f472b6" },
    { label: "Missing info", items: passport.fields.missingInfo, color: "#a3a3a3" },
  ];

  const packText = [
    `Goal: ${passport.fields.goal}`,
    `Current state: ${passport.fields.currentState}`,
    `Key decisions: ${passport.fields.decisions.join("; ")}`,
    `Constraints: ${passport.fields.constraints.join("; ")}`,
    `What worked: ${passport.fields.successes.join("; ")}`,
    `What failed: ${passport.fields.failures.join("; ")}`,
    `Preferred output: ${passport.fields.outputFormat}`,
    `Next action: ${passport.fields.nextAction}`,
  ].join("\n");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href="/passports"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Passports
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <ToolChip tool={passport.meta.sourceTool} />
            <Badge tone="neutral">{passport.meta.sourceModel}</Badge>
            {project ? (
              <Link href={`/workspace/${project.id}`}>
                <Badge tone="violet">{project.name}</Badge>
              </Link>
            ) : null}
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink">{passport.title}</h1>
          <p className="mt-1.5 text-xs text-faint">
            Created {timeAgo(passport.createdAt)} · updated {timeAgo(passport.updatedAt)} · used {passport.usageCount}× ·{" "}
            {passport.wordCount.toLocaleString()} words
          </p>
        </div>
        <PassportActions packText={packText} />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Next run cost" value={`~${formatMoney(passport.meta.estimatedNextCost)}`} />
        <Stat label="Best model" value={MODEL_BY_ID["gemini-flash"]?.name.split(" ").slice(0, 2).join(" ")} />
        <Stat label="Tags" value={passport.meta.tags.length.toString()} />
        <Stat label="Usage" value={`${passport.usageCount}×`} />
      </div>

      <Panel>
        <PanelHeader
          title="Passport fields"
          description="Everything below is what a new AI needs to continue your work"
          action={
            <Button variant="ghost" size="sm" icon={<Pencil className="h-3.5 w-3.5" />}>
              Edit
            </Button>
          }
        />
        <PanelBody>
          <div className="grid gap-4 lg:grid-cols-2">
            {rows.map((r) => (
              <div key={r.label} className="rounded-xl border border-border bg-surface-2/40 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-faint">{r.label}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-ink/90">{r.value}</p>
              </div>
            ))}
            {lists.map((l) => (
              <div key={l.label} className="rounded-xl border border-border bg-surface-2/40 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-faint">{l.label}</p>
                <ul className="mt-1.5 space-y-1">
                  {l.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-muted">
                      <Dot color={l.color} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </PanelBody>
      </Panel>

      <div className="flex flex-wrap items-center gap-1.5">
        {passport.meta.tags.map((t) => (
          <Badge key={t} tone="neutral">
            #{t}
          </Badge>
        ))}
        <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] text-faint">
          <BookmarkPlus className="h-3.5 w-3.5" /> saved to workspace
        </span>
      </div>
    </div>
  );
}
