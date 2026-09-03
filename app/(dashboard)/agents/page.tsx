"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AgentTemplate, AgentWithUsage } from "@layerflow/contracts";
import {
  ArrowRight,
  Bot,
  Brain,
  Briefcase,
  Clock,
  FileCode2,
  GraduationCap,
  Loader2,
  Minus,
  Play,
  Plus,
  ShieldCheck,
  Sparkles,
  Users,
} from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatMoney, timeAgo } from "@/lib/data/providers";
import { agentsService } from "@/lib/services/agents";
import { cn } from "@/lib/utils";

const TEMPLATE_ICONS: Record<string, typeof Bot> = {
  job_applying: Briefcase,
  internship_hunter: GraduationCap,
  linkedin_outreach: Users,
  research: Brain,
  scholarship_finder: GraduationCap,
  startup_research: Sparkles,
  content_repurposing: FileCode2,
  meeting_followup: Clock,
  teacher_assistant: GraduationCap,
  student_study: GraduationCap,
  freelancer_pipeline: Briefcase,
  research_paper: Brain,
  sales_outreach: Users,
};

const RUN_STATUS: Record<string, { label: string; className: string }> = {
  queued: { label: "Queued", className: "bg-surface-2 text-muted" },
  running: { label: "Running", className: "bg-emerald-500/10 text-emerald-400" },
  succeeded: { label: "Updated", className: "bg-sky-500/10 text-sky-400" },
  failed: { label: "Needs review", className: "bg-rose-500/10 text-rose-400" },
};

function encodeNewAgentUrl(templateKey: string, goal?: string) {
  const params = new URLSearchParams({ template: templateKey });
  if (goal?.trim()) params.set("goal", goal.trim());
  return `/agents/new?${params.toString()}`;
}

export default function AgentsPage() {
  const router = useRouter();
  const [agents, setAgents] = useState<AgentWithUsage[]>([]);
  const [templates, setTemplates] = useState<AgentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [pausing, setPausing] = useState<string | null>(null);
  const [goal, setGoal] = useState("I want a Job Applying Agent.");
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [agentRes, templateRes] = await Promise.all([
        agentsService.list(),
        agentsService.templates(),
      ]);
      setAgents(agentRes.agents);
      setTemplates(templateRes.templates);
    } catch {
      setToast("Could not refresh agents right now.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  const totalPendingApprovals = useMemo(
    () => agents.reduce((sum, agent) => sum + agent.metrics.pendingApprovals, 0),
    [agents],
  );

  async function togglePause(agent: AgentWithUsage) {
    if (pausing) return;
    setPausing(agent.id);
    try {
      if (agent.status === "paused") {
        await agentsService.resume(agent.id);
      } else {
        await agentsService.pause(agent.id);
      }
      void load();
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Could not update the agent.");
    } finally {
      setPausing(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="p-6 md:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="neutral">Agents V2</Badge>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-400">
                <ShieldCheck className="h-3.5 w-3.5" />
                Approval-gated automation
              </span>
            </div>
            <h1 className="mt-4 max-w-2xl text-2xl font-semibold tracking-tight text-ink md:text-3xl">
              Hire a digital worker and let it keep moving in the background.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
              Create agents that collect context, remember preferences, report progress, and stop for permission before sensitive actions.
            </p>

            <div className="mt-6 rounded-xl border border-border bg-surface-2 p-2">
              <textarea
                value={goal}
                onChange={(event) => setGoal(event.target.value)}
                rows={3}
                className="min-h-20 w-full resize-none rounded-lg border border-transparent bg-surface px-3 py-3 text-sm leading-6 text-ink outline-none transition focus:border-border-strong"
              />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <span className="px-1 text-[11px] font-medium text-muted">
                  Try: “I want a Freelancer Pipeline Agent” or “Student Study Agent”
                </span>
                <Button
                  onClick={() => router.push(encodeNewAgentUrl("job_applying", goal))}
                  icon={<Sparkles className="h-3.5 w-3.5" />}
                  size="sm"
                >
                  Generate onboarding
                </Button>
              </div>
            </div>
          </div>

          <div className="border-t border-border bg-gradient-to-br from-surface-2 via-surface to-bg p-6 text-ink lg:border-l lg:border-t-0 md:p-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">Workforce pulse</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {[
                ["Agents", agents.length],
                ["Pending approvals", totalPendingApprovals],
                ["Jobs found", agents.reduce((sum, agent) => sum + agent.metrics.jobsFound, 0)],
                ["Applications", agents.reduce((sum, agent) => sum + agent.metrics.jobsApplied, 0)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-border bg-glass-bg p-4">
                  <p className="text-2xl font-semibold tracking-tight">{value}</p>
                  <p className="mt-1 text-[11px] text-muted">{label}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
              <p className="text-sm font-semibold text-amber-300">No silent submissions</p>
              <p className="mt-1 text-xs leading-5 text-amber-300/75">
                Applications, uploads, recruiter messages, and emails become approval cards before the worker continues.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-ink">Agent marketplace</h2>
            <p className="text-xs text-muted">Reusable workers with permissions, cost expectations, and outcomes built in. Anyone can build their own agent — teachers, students, freelancers, and more.</p>
          </div>
          <Button variant="outline" size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => router.push("/agents/new")}>
              Blank agent
            </Button>
        </div>

        {loading && templates.length === 0 ? (
          <div className="flex items-center justify-center rounded-2xl border border-border bg-surface py-16">
            <Loader2 className="h-5 w-5 animate-spin text-faint" />
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {templates.map((template) => {
              const Icon = TEMPLATE_ICONS[template.key] ?? Bot;
              return (
                <Link
                  key={template.key}
                  href={encodeNewAgentUrl(template.key, template.key === "job_applying" ? goal : undefined)}
                  className="group flex min-h-56 flex-col rounded-2xl border border-border bg-surface p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-border-strong hover:bg-surface-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-brand">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="rounded-full bg-surface-2 px-2 py-1 text-[10px] font-semibold text-muted">
                      {template.category}
                    </span>
                  </div>
                  <h3 className="mt-4 text-sm font-semibold text-ink">{template.name}</h3>
                  <p className="mt-2 line-clamp-3 text-xs leading-5 text-muted">{template.description}</p>
                  <div className="mt-auto space-y-2 pt-4">
                    <p className="text-[11px] font-medium text-faint">{template.estimatedCost}</p>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand">
                      Use template
                      <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-ink">Active agents</h2>
          <p className="text-xs text-muted">Live workers, approval queues, and durable progress.</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center rounded-2xl border border-border bg-surface py-16">
            <Loader2 className="h-5 w-5 animate-spin text-faint" />
          </div>
        ) : agents.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
            <Bot className="mx-auto h-7 w-7 text-faint" />
            <h3 className="mt-3 text-sm font-semibold text-ink">No agents hired yet</h3>
            <p className="mt-1 text-xs text-muted">Start with any template — Job Applying, Student Study, Freelancer Pipeline, Teacher Assistant, and more.</p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {agents.map((agent) => {
              const Icon = TEMPLATE_ICONS[agent.templateKey ?? ""] ?? Bot;
              const runStatus = agent.lastRunStatus ? RUN_STATUS[agent.lastRunStatus] : null;
              return (
                <div key={agent.id} className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-ink">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/agents/${agent.id}`}
                        className="flex items-center gap-1.5 text-sm font-semibold text-ink hover:text-brand"
                      >
                        <span className="truncate">{agent.name}</span>
                        <ArrowRight className="h-3.5 w-3.5 text-faint" />
                      </Link>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {runStatus ? (
                          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", runStatus.className)}>
                            {runStatus.label}
                          </span>
                        ) : null}
                        {agent.status === "paused" ? (
                          <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
                            Paused
                          </span>
                        ) : null}
                        {agent.isDemo ? (
                          <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
                            Demo
                          </span>
                        ) : null}
                        {agent.metrics.pendingApprovals > 0 ? (
                          <span className="rounded-full border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-400">
                            {agent.metrics.pendingApprovals} approval
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label={agent.status === "paused" ? "Resume agent" : "Pause agent"}
                      onClick={() => togglePause(agent)}
                      disabled={pausing === agent.id}
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border text-muted transition hover:bg-surface-2 hover:text-ink disabled:opacity-50"
                    >
                      {pausing === agent.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : agent.status === "paused" ? (
                        <Play className="h-3.5 w-3.5" />
                      ) : (
                        <Minus className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>

                  <p className="mt-3 line-clamp-2 text-xs leading-5 text-muted">
                    {agent.goal || agent.expectedActivity || agent.systemPrompt}
                  </p>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {[
                      ["Found", agent.metrics.jobsFound],
                      ["Applied", agent.metrics.jobsApplied],
                      ["Score", `${agent.metrics.successScore}%`],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-xl bg-surface-2 p-3">
                        <p className="text-sm font-semibold text-ink">{value}</p>
                        <p className="mt-0.5 text-[10px] text-muted">{label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-[11px] text-muted">
                    <span>
                      {agent.runCount} run{agent.runCount === 1 ? "" : "s"}
                      {agent.totalCost > 0 ? <> · {formatMoney(agent.totalCost)}</> : null}
                    </span>
                    <span>{agent.lastRunAt ? timeAgo(agent.lastRunAt) : "Ready"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

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