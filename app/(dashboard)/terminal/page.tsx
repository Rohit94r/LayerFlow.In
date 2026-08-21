"use client";

import { useCallback, useEffect, useState } from "react";
import type { Run } from "@layerflow/contracts";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  TerminalSquare,
} from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatMoney, timeAgo } from "@/lib/data/providers";
import { runsService } from "@/lib/services/runs";
import { syncService } from "@/lib/services/sync";
import type { SyncOperation } from "@/lib/services/sync";
import { cn } from "@/lib/utils";

const RUN_STATUS: Record<Run["status"], { label: string; tone: "neutral" | "amber" | "mint" | "rose" | "red" }> = {
  pending: { label: "Queued", tone: "neutral" },
  running: { label: "Running", tone: "amber" },
  succeeded: { label: "Succeeded", tone: "mint" },
  failed: { label: "Failed", tone: "rose" },
  blocked: { label: "Blocked", tone: "red" },
};

function nameModel(model: string): string {
  const slash = model.lastIndexOf("/");
  return slash >= 0 ? model.slice(slash + 1) : model;
}

export default function TerminalPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [ops, setOps] = useState<SyncOperation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [runsRes, opsRes] = await Promise.allSettled([
        runsService.list({ limit: 50 }),
        syncService.operations({ limit: 30 }),
      ]);
      if (runsRes.status === "fulfilled") setRuns(runsRes.value.runs);
      if (opsRes.status === "fulfilled") setOps(opsRes.value.operations);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load terminal data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function refresh() {
    setRefreshing(true);
    await load();
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 p-5 md:p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-brand">
              <TerminalSquare className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-ink">Terminal</h1>
              <p className="text-xs text-muted">Sessions synced from the lf CLI and API run history.</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refresh()}
            disabled={refreshing}
            icon={<RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />}
          >
            Refresh
          </Button>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-5 text-center">
          <AlertTriangle className="mx-auto h-6 w-6 text-rose-400" />
          <p className="mt-2 text-sm font-medium text-rose-400">{error}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => void refresh()}>
            Try again
          </Button>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-border bg-surface py-16">
          <Loader2 className="h-5 w-5 animate-spin text-faint" />
        </div>
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-base font-semibold tracking-tight text-ink">CLI Sync Activity</h2>
            {ops.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
                <TerminalSquare className="mx-auto h-7 w-7 text-faint" />
                <h3 className="mt-3 text-sm font-semibold text-ink">No terminal syncs yet</h3>
                <p className="mt-1 max-w-md text-xs leading-5 text-muted">
                  Install the lf CLI to sync your terminal sessions, branches, and token usage.
                </p>
                <div className="mt-4 rounded-xl bg-surface-2 p-3">
                  <p className="font-mono text-xs text-brand">
                    curl -fsSL https://layerflow.dev/install | bash
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-surface shadow-sm">
                <ul className="divide-y divide-border">
                  {ops.map((op) => (
                    <li key={op.op_id} className="flex items-center gap-4 px-5 py-3.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-brand">
                        <TerminalSquare className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-ink">
                          {op.entity}/{op.entity_id.slice(0, 8)}
                        </p>
                        <p className="mt-0.5 text-[11px] text-faint">
                          {op.state} · {timeAgo(op.created_at)}
                        </p>
                      </div>
                      <Badge tone={op.state === "synced" ? "mint" : op.state === "pending" ? "amber" : "neutral"}>
                        {op.state}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold tracking-tight text-ink">Recent Runs</h2>
            {runs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
                <Clock className="mx-auto h-7 w-7 text-faint" />
                <h3 className="mt-3 text-sm font-semibold text-ink">No runs yet</h3>
                <p className="mt-1 text-xs text-muted">Start a chat or an agent to see runs here.</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-surface shadow-sm">
                <ul className="divide-y divide-border">
                  {runs.map((run) => {
                    const badge = RUN_STATUS[run.status];
                    const isRunning = run.status === "running";
                    return (
                      <li key={run.id} className="flex items-center gap-4 px-5 py-3.5">
                        <span
                          className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                            isRunning ? "bg-amber-500/10 text-amber-400" : "bg-surface-2 text-brand",
                          )}
                        >
                          {isRunning ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : run.status === "succeeded" ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : run.status === "failed" || run.status === "blocked" ? (
                            <AlertTriangle className="h-4 w-4" />
                          ) : (
                            <Clock className="h-4 w-4" />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate font-mono text-[13px] font-medium text-ink">
                              {nameModel(run.model)}
                            </p>
                            <Badge tone={badge.tone}>{badge.label}</Badge>
                            <span className="hidden font-mono text-[10px] text-faint sm:inline">{run.provider}</span>
                          </div>
                          <p className="mt-0.5 text-[11px] text-faint">
                            {timeAgo(run.createdAt)} · {formatMoney(run.costMicro / 1_000_000)} ·{" "}
                            {run.inputTokens + run.outputTokens} tokens
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
