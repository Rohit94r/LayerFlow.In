"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { AgentApproval, AgentProgressResponse, AgentRun } from "@layerflow/contracts";
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  Briefcase,
  Check,
  Clock,
  FileCode2,
  Loader2,
  Minus,
  Play,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatMoney, timeAgo } from "@/lib/data/providers";
import { agentsService } from "@/lib/services/agents";
import { cn } from "@/lib/utils";

const RUN_STATUS: Record<AgentRun["status"], { label: string; className: string }> = {
  queued: { label: "Queued", className: "bg-surface-2 text-muted" },
  running: { label: "Running", className: "bg-emerald-500/10 text-emerald-400" },
  succeeded: { label: "Done", className: "bg-sky-500/10 text-sky-400" },
  failed: { label: "Failed", className: "bg-rose-500/10 text-rose-400" },
};

const STEP_STATUS: Record<string, string> = {
  running: "bg-emerald-500/10 text-emerald-400",
  waiting: "bg-amber-500/10 text-amber-400",
  completed: "bg-surface-2 text-muted",
  failed: "bg-rose-500/10 text-rose-400",
  queued: "bg-surface-2 text-muted",
};

function payloadString(value: unknown) {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}

export default function AgentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const agentId = typeof params?.id === "string" ? params.id : "";

  const [progress, setProgress] = useState<AgentProgressResponse | null>(null);
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [deciding, setDeciding] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [live, setLive] = useState(false);

  const load = useCallback(async () => {
    try {
      const [progressRes, detailRes] = await Promise.all([
        agentsService.progress(agentId),
        agentsService.get(agentId),
      ]);
      setProgress(progressRes);
      setRuns(detailRes.runs);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load this agent.");
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  // Live progress via SSE (/stream). The stream is a snapshot projection that
  // reverts to the DB on reconnect, so a slow fallback poll below covers any
  // gap and refreshes run cost/token details that the SSE payload omits.
  useEffect(() => {
    if (!agentId) return;
    let es: EventSource | null = null;
    let disposed = false;

    const openStream = () => {
      if (disposed) return;
      try {
        es = new EventSource(`/api/agents/${agentId}/stream`);
      } catch {
        es = null;
      }
      if (!es) return;
      es.onopen = () => {
        if (!disposed) setLive(true);
      };
      es.addEventListener("progress", (event: MessageEvent) => {
        if (disposed) return;
        try {
          const data = JSON.parse(event.data) as AgentProgressResponse;
          if (data && data.agent) {
            setProgress(data);
            setLoadError(null);
          }
        } catch {
          // ignore a malformed frame; the poll fallback recovers
        }
      });
      es.onerror = () => {
        setLive(false);
        es?.close();
        es = null;
      };
    };

    openStream();

    const idle = setInterval(() => {
      if (!es || es.readyState === EventSource.CLOSED) {
        es?.close();
        openStream();
      } else {
        void agentsService
          .get(agentId)
          .then((d) => setRuns(d.runs))
          .catch(() => undefined);
      }
    }, 12000);

    return () => {
      disposed = true;
      if (es) es.close();
      clearInterval(idle);
    };
  }, [agentId]);

  const agent = progress?.agent ?? null;
  const timeline = useMemo(() => [...(progress?.timeline ?? [])].reverse(), [progress?.timeline]);
  const recentRuns = runs.slice(0, 5);

  async function start() {
    if (!agent || starting) return;
    setStarting(true);
    try {
      await agentsService.start(agent.id);
      await load();
      setToast("Background cycle started.");
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Could not start this agent.");
    } finally {
      setStarting(false);
    }
  }

  async function togglePause() {
    if (!agent || pausing) return;
    setPausing(true);
    try {
      if (agent.status === "paused") {
        await agentsService.resume(agent.id);
      } else {
        await agentsService.pause(agent.id);
      }
      await load();
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Could not update this agent.");
    } finally {
      setPausing(false);
    }
  }

  async function decide(approval: AgentApproval, decision: "approve" | "reject" | "edit" | "approve_similar") {
    if (!agent || deciding) return;
    setDeciding(approval.id);
    try {
      await agentsService.decideApproval(agent.id, {
        approvalId: approval.id,
        decision,
        note:
          decision === "approve_similar"
            ? "Approved this action and future similar prepared applications."
            : decision === "edit"
              ? "Approved after user edits."
              : undefined,
      });
      await load();
      setToast(decision === "reject" ? "Approval rejected." : "Approval accepted.");
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Could not decide this approval.");
    } finally {
      setDeciding(null);
    }
  }

  async function deleteAgent() {
    if (!agent) return;
    try {
      await agentsService.remove(agent.id);
      router.push("/agents");
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Could not delete this agent.");
      setConfirmDelete(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-faint" />
      </div>
    );
  }

  if (!agent || !progress || loadError) {
    return (
      <div className="space-y-6 text-ink">
        <button
          type="button"
          onClick={() => router.push("/agents")}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted transition hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Agents
        </button>
        <p className="text-sm text-muted">{loadError ?? "Agent not found."}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 text-ink">
      <button
        type="button"
        onClick={() => router.push("/agents")}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted transition hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Agents
      </button>

      <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm md:p-6">
        <div className="flex flex-wrap items-start gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 text-brand">
            <Briefcase className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-ink">{agent.name}</h1>
              <Badge tone="neutral">{agent.templateKey ?? agent.role}</Badge>
              {agent.isDemo ? <Badge tone="amber">Demo</Badge> : null}
              {agent.status === "paused" ? <Badge tone="amber">Paused</Badge> : null}
              {progress.pendingApprovals.length ? <Badge tone="amber">Needs approval</Badge> : null}
              {live ? <Badge tone="mint">Live</Badge> : null}
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              {agent.goal || agent.expectedActivity || "Ready for background execution."}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {agent.tools.map((tool) => (
                <span key={tool} className="rounded-full bg-surface-2 px-2.5 py-1 font-mono text-[10px] font-semibold text-muted">
                  {tool}
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={start}
              disabled={starting || agent.status === "paused"}
              icon={starting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
              size="sm"
            >
              {starting ? "Starting..." : "Start cycle"}
            </Button>
            <Button
              variant="outline"
              onClick={togglePause}
              disabled={pausing}
              icon={pausing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : agent.status === "paused" ? <Play className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
              size="sm"
            >
              {agent.status === "paused" ? "Resume" : "Pause"}
            </Button>
            <Button variant="danger" onClick={() => setConfirmDelete(true)} icon={<Trash2 className="h-3.5 w-3.5" />} size="sm">
              Delete
            </Button>
          </div>
        </div>
      </section>

      {agent.isDemo ? (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
          <p className="text-xs font-semibold text-amber-300">This agent is a demo</p>
          <p className="mt-1 text-xs leading-5 text-amber-300/75">
            This agent is a demo — its results are illustrative, not from your workspace.
          </p>
        </div>
      ) : null}

      <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        {[
          ["Status", progress.overview.status, Bot],
          ["Jobs found", progress.metrics.jobsFound, Briefcase],
          ["Applied", progress.metrics.jobsApplied, Check],
          ["Interviews", progress.metrics.interviewsScheduled, Clock],
          ["Approvals", progress.metrics.pendingApprovals, ShieldCheck],
          ["Score", `${progress.metrics.successScore}%`, Sparkles],
        ].map(([label, value, Icon]) => {
          const StatIcon = Icon as typeof Bot;
          return (
            <div key={String(label)} className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">{String(label)}</p>
                <StatIcon className="h-4 w-4 text-faint" />
              </div>
              <p className="mt-3 truncate text-xl font-semibold tracking-tight text-ink">{String(value)}</p>
            </div>
          );
        })}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-surface shadow-sm">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-sm font-semibold text-ink">Overview</h2>
              <p className="mt-1 text-xs text-muted">Started, last action, and next action are derived from durable steps.</p>
            </div>
            <div className="grid gap-3 p-5 md:grid-cols-3">
              {[
                ["Started at", progress.overview.startedAt ? new Date(progress.overview.startedAt).toLocaleString() : "Not started"],
                ["Last action", progress.overview.lastAction ?? "No activity yet"],
                ["Next action", progress.overview.nextAction ?? "Queue a cycle"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-surface-2 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">{label}</p>
                  <p className="mt-1 text-sm leading-5 text-ink">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface shadow-sm">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-sm font-semibold text-ink">Activity timeline</h2>
              <p className="mt-1 text-xs text-muted">Chronological events replay cleanly after reloads and across devices.</p>
            </div>
            <div className="space-y-0 p-5">
              {timeline.length === 0 ? (
                <p className="py-8 text-center text-xs text-muted">No events yet. Start a background cycle to begin.</p>
              ) : (
                timeline.map((step, index) => (
                  <div key={step.id} className="relative flex gap-3 pb-5 last:pb-0">
                    {index < timeline.length - 1 ? <span className="absolute left-[15px] top-8 h-[calc(100%-2rem)] w-px bg-border" /> : null}
                    <span className={cn("relative z-10 mt-0.5 flex h-8 w-8 items-center justify-center rounded-full", STEP_STATUS[step.status] ?? "bg-surface-2 text-muted")}>
                      {step.status === "waiting" ? <AlertTriangle className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0 flex-1 rounded-xl border border-border bg-surface-2 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-ink">{step.title}</p>
                        <span className="text-[11px] text-muted">{timeAgo(step.occurredAt)}</span>
                      </div>
                      {step.description ? <p className="mt-1 text-xs leading-5 text-muted">{step.description}</p> : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface shadow-sm">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-sm font-semibold text-ink">Application records</h2>
              <p className="mt-1 text-xs text-muted">Deduped opportunities and submission status.</p>
            </div>
            <div className="divide-y divide-border">
              {progress.applications.length === 0 ? (
                <p className="p-5 text-center text-xs text-muted">No applications prepared yet.</p>
              ) : (
                progress.applications.map((application) => (
                  <div key={application.id} className="grid gap-3 p-4 md:grid-cols-[1fr_auto]">
                    <div>
                      <p className="text-sm font-semibold text-ink">{application.company}</p>
                      <p className="mt-1 text-xs text-muted">
                        {application.roleTitle}
                        {application.location ? ` · ${application.location}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 md:justify-end">
                      {application.resumeScore != null ? (
                        <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold text-emerald-400">
                          {application.resumeScore}% match
                        </span>
                      ) : null}
                      <span className="rounded-full bg-surface-2 px-2 py-1 text-[11px] font-semibold text-muted">
                        {application.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <aside className="space-y-5">
          <div className="rounded-2xl border border-border bg-surface shadow-sm">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-sm font-semibold text-ink">Pending approvals</h2>
              <p className="mt-1 text-xs text-muted">High-risk actions wait here.</p>
            </div>
            <div className="space-y-3 p-4">
              {progress.pendingApprovals.length === 0 ? (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs leading-5 text-emerald-400">
                  No pending approvals. Sensitive actions are still gated.
                </div>
              ) : (
                progress.pendingApprovals.map((approval) => {
                  const company = payloadString(approval.payload.company);
                  const roleTitle = payloadString(approval.payload.roleTitle);
                  const coverLetter = payloadString(approval.payload.coverLetter);
                  return (
                    <div key={approval.id} className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
                      <div className="flex items-start gap-3">
                        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
                        <div>
                          <p className="text-sm font-semibold text-ink">{approval.title}</p>
                          <p className="mt-1 text-xs leading-5 text-muted">{approval.description}</p>
                          {company || roleTitle ? (
                            <p className="mt-2 text-[11px] font-semibold text-amber-400">
                              {company} {roleTitle ? `· ${roleTitle}` : ""}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      {coverLetter ? (
                        <details className="mt-3 rounded-xl border border-amber-500/20 bg-surface/70 p-3">
                          <summary className="cursor-pointer text-xs font-semibold text-ink">Cover letter draft</summary>
                          <p className="mt-2 text-xs leading-5 text-muted">{coverLetter}</p>
                        </details>
                      ) : null}
                      <div className="mt-3 grid gap-2">
                        <Button
                          size="sm"
                          onClick={() => decide(approval, "approve")}
                          disabled={deciding === approval.id}
                          icon={deciding === approval.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                        >
                          Approve
                        </Button>
                        <div className="grid grid-cols-3 gap-2">
                          <Button variant="outline" size="sm" onClick={() => decide(approval, "reject")} icon={<X className="h-3.5 w-3.5" />}>
                            Reject
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => decide(approval, "edit")} icon={<FileCode2 className="h-3.5 w-3.5" />}>
                            Edit
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => decide(approval, "approve_similar")} icon={<Sparkles className="h-3.5 w-3.5" />}>
                            Similar
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface shadow-sm">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-sm font-semibold text-ink">Agent memory</h2>
              <p className="mt-1 text-xs text-muted">Preferences and work history survive sessions.</p>
            </div>
            <div className="space-y-2 p-4">
              {progress.memories.length === 0 ? (
                <p className="text-center text-xs text-muted">No memory yet.</p>
              ) : (
                progress.memories.map((memory) => (
                  <div key={memory.id} className="rounded-xl bg-surface-2 p-3">
                    <p className="text-xs font-semibold text-ink">{memory.title}</p>
                    <p className="mt-1 line-clamp-3 text-[11px] leading-5 text-muted">{memory.body}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface shadow-sm">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-sm font-semibold text-ink">Recent runs</h2>
              <p className="mt-1 text-xs text-muted">Worker cycles and costs.</p>
            </div>
            <div className="space-y-2 p-4">
              {recentRuns.length === 0 ? (
                <p className="text-center text-xs text-muted">No runs yet.</p>
              ) : (
                recentRuns.map((run) => {
                  const status = RUN_STATUS[run.status];
                  return (
                    <details key={run.id} className="rounded-xl border border-border bg-surface-2 p-3">
                      <summary className="cursor-pointer text-xs font-semibold text-ink">
                        <span className={cn("mr-2 rounded-full px-2 py-0.5 text-[10px]", status.className)}>
                          {status.label}
                        </span>
                        {timeAgo(run.createdAt)}
                      </summary>
                      <p className="mt-2 text-[11px] leading-5 text-muted" role="status">{run.output || run.errorMessage || run.input}</p>
                      <p className="mt-2 text-[10px] text-faint">
                        {run.inputTokens.toLocaleString()} in · {run.outputTokens.toLocaleString()} out · {formatMoney(run.cost)}
                      </p>
                    </details>
                  );
                })
              )}
            </div>
          </div>
        </aside>
      </section>

      {confirmDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-xl">
            <h2 className="text-sm font-semibold text-ink">Delete this agent?</h2>
            <p className="mt-2 text-xs leading-5 text-muted">
              This removes the agent, runs, memory, approvals, and application records from the workspace.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" onClick={deleteAgent} icon={<Trash2 className="h-3.5 w-3.5" />}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full border border-border bg-surface px-4 py-2 text-xs text-ink shadow-xl" role="status" aria-live="polite">
          {toast}
          <button type="button" aria-label="Dismiss" className="ml-3 text-faint" onClick={() => setToast(null)}>
            x
          </button>
        </div>
      ) : null}
    </div>
  );
}