"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  ArrowRight,
  FileText,
  FolderKanban,
  MessageSquare,
  DollarSign,
  Cpu,
  Sparkles,
  Activity,
  PiggyBank,
} from "lucide-react";
import DomainCard from "@/components/workspace/DomainCard";
import PromptList from "@/components/workspace/PromptList";
import BudgetMeter from "@/components/workspace/BudgetMeter";
import DashboardCard from "@/components/workspace/DashboardCard";
import SessionList from "@/components/workspace/SessionList";
import CostOptimizerBanner from "@/components/workspace/CostOptimizerBanner";
import PageHeader from "@/components/workspace/PageHeader";
import { ErrorState, LoadingState } from "@/components/workspace/DataState";
import { useAsyncData, errorMessage } from "@/lib/hooks/use-async-data";
import {
  listDomains,
  listProjects,
  listPrompts,
  listSessions,
  listActivity,
  getCurrentBudget,
  getUsageSummary,
  getSavings,
  createPrompt,
} from "@/lib/api";
import {
  mapDomain,
  mapProject,
  mapPrompt,
  mapSession,
  mapBudget,
  mapActivity,
} from "@/lib/api/mappers";
import { microToUsd } from "@/lib/api/money";

function formatActivityTime(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function loadWorkspaceHome() {
  const [
    domainsRes,
    projectsRes,
    promptsRes,
    sessionsRes,
    activityRes,
    budgetRes,
    usageRes,
    savingsRes,
  ] = await Promise.all([
    listDomains(),
    listProjects(),
    listPrompts({ limit: 50 }),
    listSessions(),
    listActivity({ limit: 10 }),
    getCurrentBudget(),
    getUsageSummary({ groupBy: "model" }),
    getSavings().catch(() => null),
  ]);

  const projects = projectsRes.projects.map((p) => mapProject(p));
  const prompts = promptsRes.prompts.map((p) => mapPrompt(p, null, []));
  const domains = domainsRes.domains.map((d) => {
    const domainProjects = projects.filter((p) => p.domainId === d.id);
    const domainPrompts = prompts.filter((p) => p.domainId === d.id);
    return mapDomain(d, {
      projectCount: domainProjects.length,
      promptCount: domainPrompts.length,
    });
  });
  const sessions = sessionsRes.sessions.map((s) => mapSession(s));
  const budget = mapBudget(budgetRes);
  const activity = activityRes.events.map(mapActivity);

  const modelUsage = usageRes.buckets
    .filter((b) => b.model)
    .map((b) => ({
      model: b.model!,
      count: b.requests,
      cost: microToUsd(b.costMicro),
    }))
    .sort((a, b) => b.count - a.count);

  const today = new Date().toISOString().slice(0, 10);
  const todayPrompts = prompts.filter((p) => p.updatedAt.slice(0, 10) === today).length;

  const savings =
    savingsRes != null
      ? {
          actual: microToUsd(savingsRes.actualCostMicro),
          optimized: microToUsd(savingsRes.optimizedCostMicro),
        }
      : { actual: budget.spent, optimized: Math.max(0, budget.spent * 0.3) };

  return {
    domains,
    projects,
    prompts,
    sessions,
    activity,
    budget,
    modelUsage,
    todayPrompts,
    savings,
    cacheSaved: savingsRes ? microToUsd(savingsRes.savedMicro) : 0,
  };
}

export default function WorkspaceClient() {
  const router = useRouter();
  const state = useAsyncData(loadWorkspaceHome, []);

  if (state.status === "loading") return <LoadingState label="Loading workspace…" />;
  if (state.status === "error") {
    return <ErrorState message={errorMessage(state.error)} onRetry={state.reload} />;
  }

  const data = state.data;
  const recentPrompts = [...data.prompts]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 4);
  const recentSessions = [...data.sessions]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 3);

  const handleNewPrompt = async () => {
    const coding = data.domains.find((d) => d.slug === "coding") ?? data.domains[0];
    const project =
      data.projects.find((p) => p.domainId === coding?.id) ?? data.projects[0];
    const res = await createPrompt({
      title: "Untitled prompt",
      body: "Write your prompt here…",
      domainId: coding?.id,
      projectId: project?.id,
    });
    router.push(`/prompts/${res.prompt.id}`);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="AI Workspace"
        title="Home"
        description="Your prompt workspace — organize, compare, and control costs."
        actions={
          <button
            type="button"
            onClick={handleNewPrompt}
            className="btn-primary flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            New prompt
          </button>
        }
      />

      <CostOptimizerBanner
        actualSpent={data.savings.actual}
        optimizedSpent={data.savings.optimized}
        variant="compact"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardCard
          label="Today's prompts"
          value={data.todayPrompts}
          subtext="Edited or run today"
          icon={<FileText className="h-4 w-4" />}
        />
        <DashboardCard
          label="Projects"
          value={data.projects.length}
          subtext={`${data.prompts.length} prompts total`}
          icon={<FolderKanban className="h-4 w-4" />}
        />
        <DashboardCard
          label="Monthly cost"
          value={`$${data.budget.spent.toFixed(2)}`}
          subtext={`$${data.budget.remaining.toFixed(2)} remaining`}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <DashboardCard
          label="Cache saved"
          value={`$${data.cacheSaved.toFixed(2)}`}
          subtext="Exact-match hits"
          icon={<PiggyBank className="h-4 w-4" />}
        />
        <DashboardCard
          label="Prompt count"
          value={data.prompts.length}
          subtext="Across all domains"
          icon={<FileText className="h-4 w-4" />}
        />
        <DashboardCard
          label="Most used model"
          value={data.modelUsage[0]?.model ?? "—"}
          subtext={`${data.modelUsage[0]?.count ?? 0} runs this month`}
          icon={<Cpu className="h-4 w-4" />}
        />
        <DashboardCard
          label="Active sessions"
          value={data.sessions.filter((s) => s.status === "active").length}
          subtext={`${data.sessions.length} total sessions`}
          icon={<MessageSquare className="h-4 w-4" />}
        />
        <DashboardCard
          label="Model usage"
          value={`${data.modelUsage.length} models`}
          subtext="This month"
          icon={<Sparkles className="h-4 w-4" />}
        />
      </div>

      <BudgetMeter budget={data.budget} />

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="section-label flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Recent activity
            </h2>
          </div>
          <div className="card divide-y divide-border">
            {data.activity.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted">No activity yet</p>
            ) : (
              data.activity.slice(0, 5).map((item) => (
                <div key={item.id} className="px-4 py-3">
                  <p className="text-sm font-medium text-ink">{item.title}</p>
                  {item.description && (
                    <p className="mt-0.5 text-xs text-muted">{item.description}</p>
                  )}
                  <div className="mt-1 flex items-center gap-2 text-xs text-faint">
                    <span>{formatActivityTime(item.timestamp)}</span>
                    {item.meta && <span>· {item.meta}</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="section-label">Model usage</h2>
            <Link href="/budget" className="section-link">
              Cost details
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="card space-y-3 p-4">
            {data.modelUsage.length === 0 ? (
              <p className="text-sm text-muted">No runs yet this period</p>
            ) : (
              data.modelUsage.map((item) => {
                const max = data.modelUsage[0]?.count || 1;
                return (
                  <div key={item.model}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-mono text-xs text-muted">{item.model}</span>
                      <span className="text-xs text-faint">
                        {item.count} runs · ${item.cost.toFixed(2)}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                      <div
                        className="h-full rounded-full bg-ink/20"
                        style={{ width: `${(item.count / max) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="section-label">Recent sessions</h2>
          <Link href="/sessions" className="section-link">
            All sessions
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <SessionList sessions={recentSessions} domains={data.domains} />
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="section-label">Today&apos;s prompts</h2>
          <Link href="/prompts" className="section-link">
            View all
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <PromptList
          prompts={recentPrompts}
          domains={data.domains}
          projects={data.projects}
        />
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="section-label">Domains</h2>
          <Link href="/projects" className="section-link">
            All projects
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.domains.slice(0, 6).map((domain) => (
            <DomainCard key={domain.id} domain={domain} />
          ))}
        </div>
      </section>
    </div>
  );
}
