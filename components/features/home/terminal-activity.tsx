import Link from "next/link";
import type { Run } from "@layerflow/contracts";
import { Badge } from "@/components/ui/badge";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { TerminalSquare, ArrowRight, CheckCircle2, AlertTriangle, Loader2, Clock } from "@/components/ui/icons";
import { formatMoney, timeAgo } from "@/lib/data/providers";

const STATUS_BADGE: Record<Run["status"], { label: string; tone: "neutral" | "amber" | "mint" | "rose" | "red" }> = {
  pending: { label: "Queued", tone: "neutral" },
  running: { label: "Running", tone: "amber" },
  succeeded: { label: "Succeeded", tone: "mint" },
  failed: { label: "Failed", tone: "rose" },
  blocked: { label: "Blocked", tone: "red" },
};

const STATUS_ICON: Record<Run["status"], typeof CheckCircle2> = {
  pending: Clock,
  running: Loader2,
  succeeded: CheckCircle2,
  failed: AlertTriangle,
  blocked: AlertTriangle,
};

function nameModel(model: string): string {
  // "openai/gpt-4o" -> "gpt-4o"
  const slash = model.lastIndexOf("/");
  return slash >= 0 ? model.slice(slash + 1) : model;
}

export async function TerminalActivity({ runs }: { runs: Run[] | null }) {
  return (
    <Panel>
      <PanelHeader
        title={
          <span className="inline-flex items-center gap-2">
            <TerminalSquare className="h-4 w-4 text-brand" />
            Terminal Activity
          </span>
        }
        description="Synced from lf — your CLI sessions appear here in real time."
        action={
          <Link
            href="/terminal"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-brand hover:underline"
          >
            Open terminal
            <ArrowRight className="h-3 w-3" />
          </Link>
        }
      />
      <PanelBody className="p-0">
        {runs && runs.length > 0 ? (
          <ul className="divide-y divide-border">
            {runs.map((run) => {
              const badge = STATUS_BADGE[run.status];
              const Icon = STATUS_ICON[run.status];
              const isRunning = run.status === "running";
              return (
                <li key={run.id} className="flex items-center gap-4 px-5 py-3.5">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      isRunning ? "bg-amber/10 text-amber" : "bg-surface-2 text-brand"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isRunning ? "animate-spin" : ""}`} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-mono text-[13px] font-medium text-ink">{nameModel(run.model)}</p>
                      <Badge tone={badge.tone}>{badge.label}</Badge>
                      <span className="hidden font-mono text-[10px] text-faint sm:inline">{run.provider}</span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-faint">
                      {timeAgo(run.createdAt)} · {formatMoney(run.costMicro / 1_000_000)} · {run.inputTokens + run.outputTokens} tokens
                    </p>
                  </div>
                  <span className="hidden items-center gap-1 rounded-full border border-mint/30 bg-mint/10 px-2 py-0.5 text-[10px] font-medium text-mint md:inline-flex">
                    <CheckCircle2 className="h-3 w-3" /> Synced
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="px-5 py-8">
            <p className="text-sm font-medium text-ink">Your terminal sessions will live here</p>
            <p className="mt-1 max-w-md font-mono text-xs leading-relaxed text-faint">
              Run <span className="rounded bg-surface-2 px-1.5 py-0.5 text-brand">curl -fsSL https://layerflow.dev/install | bash</span> to
              sync sessions, branches, git state and token usage — landing with the V2 terminal release.
            </p>
            <p className="mt-3 text-[11px] text-faint">Showing live agent runs meanwhile.</p>
          </div>
        )}
      </PanelBody>
    </Panel>
  );
}