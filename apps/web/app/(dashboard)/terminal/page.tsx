"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
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
import { chatService } from "@/lib/services/chat";
import { TerminalRepl } from "@/components/features/terminal/terminal-repl";
import { RemoteControlPanel } from "@/components/features/terminal/remote-control-panel";
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
  const [sessionCount, setSessionCount] = useState<number | null>(null);
  const [usableProviders, setUsableProviders] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [runsRes, opsRes, sessionsRes, keysRes] = await Promise.allSettled([
        runsService.list({ limit: 50 }),
        syncService.operations({ limit: 30 }),
        chatService.list({ limit: 1 }),
        chatService.keysHealth(),
      ]);
      if (runsRes.status === "fulfilled") setRuns(runsRes.value.runs);
      if (opsRes.status === "fulfilled") setOps(opsRes.value.operations);
      if (sessionsRes.status === "fulfilled") setSessionCount(sessionsRes.value.sessions.length);
      if (keysRes.status === "fulfilled") {
        const usable = keysRes.value.providers.filter(
          (p) => p.status === "healthy" || p.status === "degrading",
        ).length;
        setUsableProviders(usable);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load terminal data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    void (async () => {
      try {
        const [runsRes, opsRes, sessionsRes, keysRes] = await Promise.allSettled([
          runsService.list({ limit: 50 }),
          syncService.operations({ limit: 30 }),
          chatService.list({ limit: 1 }),
          chatService.keysHealth(),
        ]);
        if (ignore) return;
        if (runsRes.status === "fulfilled") setRuns(runsRes.value.runs);
        if (opsRes.status === "fulfilled") setOps(opsRes.value.operations);
        if (sessionsRes.status === "fulfilled") setSessionCount(sessionsRes.value.sessions.length);
        if (keysRes.status === "fulfilled") {
          setUsableProviders(
            keysRes.value.providers.filter(
              (p) => p.status === "healthy" || p.status === "degrading",
            ).length,
          );
        }
        setError(null);
      } catch (err) {
        if (ignore) return;
        setError(err instanceof Error ? err.message : "Could not load terminal data.");
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

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

      {/* Quick-access helpers */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { href: "/docs", label: "Docs" },
          { href: "/keys", label: "API Keys", hint: "manage providers" },
          { href: "/costs", label: "Usage", hint: "tokens & spend" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-ink transition-colors hover:border-brand/50 hover:bg-brand/5 hover:text-brand"
          >
            <span className="font-semibold text-brand">{item.href === "/docs" ? "›" : "→"}</span>
            <span>{item.label}</span>
            {item.hint && <span className="text-faint">· {item.hint}</span>}
          </Link>
        ))}
      </div>

      {/* Session / provider stats strip */}
      {!loading && !error && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Chat sessions", value: sessionCount?.toLocaleString() ?? "—" },
            { label: "Providers ready", value: `${usableProviders ?? "—"}/8` },
            { label: "Recent runs", value: runs.length.toLocaleString() },
            { label: "Sync operations", value: ops.length.toLocaleString() },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-border bg-surface p-4 text-center shadow-sm"
            >
              <p className="text-lg font-semibold tracking-tight text-ink">{stat.value}</p>
              <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-faint">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      )}

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
          <TerminalRepl />

          <RemoteControlPanel />

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
