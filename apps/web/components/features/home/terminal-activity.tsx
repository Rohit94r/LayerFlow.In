import Link from "next/link";
import type { Run } from "@layerflow/contracts";
import { Badge } from "@/components/ui/badge";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { TerminalSquare, ArrowRight, CheckCircle2, AlertTriangle, Loader2, Clock } from "@/components/ui/icons";
import { formatMoney, timeAgo } from "@/lib/data/providers";
import type { SyncOperation } from "@/lib/services/sync";

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

function shortEntity(entity: string): string {
  return entity.charAt(0).toUpperCase() + entity.slice(1);
}

export async function TerminalActivity({
  runs,
  ops,
}: {
  runs: Run[] | null;
  ops: SyncOperation[] | null;
}) {
  const hasOps = !!ops && ops.length > 0;

  return (
    <Panel>
      <PanelHeader
        title={
          <span className="inline-flex items-center gap-2">
            <TerminalSquare className="h-4 w-4 text-brand" />
            Terminal Activity
          </span>
        }
        description="Real sessions synced from the lf CLI on your devices — every command you run lands here."
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
        {hasOps ? (
          <ul className="divide-y divide-border">
            {ops.slice(0, 6).map((op) => (
              <li key={op.op_id} className="flex items-center gap-4 px-5 py-3.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-brand">
                  <TerminalSquare className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[13px] font-semibold text-ink">
                      {shortEntity(op.entity)} {op.entity_id.slice(0, 8)}
                    </p>
                    <Badge tone={op.state === "synced" ? "mint" : op.state === "conflict" ? "rose" : "amber"}>
                      {op.state}
                    </Badge>
                  </div>
                  <p className="mt-0.5 truncate text-[11px] text-faint">
                    Device {op.device_id.slice(0, 8)} · tick {op.op_tick} · {timeAgo(op.created_at)}
                  </p>
                </div>
                <span className="hidden items-center gap-1 rounded-full border border-mint/30 bg-mint/10 px-2 py-0.5 text-[10px] font-medium text-mint md:inline-flex">
                  <CheckCircle2 className="h-3 w-3" /> From lf CLI
                </span>
              </li>
            ))}
          </ul>
        ) : runs && runs.length > 0 ? (
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
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="px-5 py-8">
            <p className="text-sm font-medium text-ink">Your terminal sessions will live here</p>
            <p className="mt-1 max-w-md font-mono text-xs leading-relaxed text-faint">
              Run <span className="rounded bg-surface-2 px-1.5 py-0.5 text-brand">curl -fsSL https://layerflow.dev/install | bash</span>
              (Windows: <span className="rounded bg-surface-2 px-1.5 py-0.5 text-brand">irm https://layerflow.dev/install.ps1 | iex</span>)
              to connect your machine&apos;s CLI — commands you type there appear here in real time.
            </p>
          </div>
        )}
      </PanelBody>
    </Panel>
  );
}