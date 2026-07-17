import Link from "next/link";
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
import {
  domains,
  prompts,
  budget,
  dashboardStats,
  recentActivity,
  sessions,
} from "@/lib/mock-data";

export const metadata = {
  title: "Workspace",
};

function formatActivityTime(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function WorkspacePage() {
  const recentPrompts = [...prompts]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 4);

  const recentSessions = [...sessions]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 3);

  const latestOutputs = prompts
    .flatMap((p) =>
      p.versions.slice(-1).map((v) => ({
        promptTitle: p.title,
        promptId: p.id,
        output: v.output,
        model: v.model,
        cost: v.cost,
      }))
    )
    .slice(0, 3);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="AI Workspace"
        title="Home"
        description="Your prompt workspace — organize, compare, and control costs."
        actions={
          <button type="button" className="btn-primary flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium">
            <Plus className="h-4 w-4" />
            New prompt
          </button>
        }
      />

      <CostOptimizerBanner actualSpent={42} optimizedSpent={11} variant="compact" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardCard
          label="Today's prompts"
          value={dashboardStats.todayPrompts}
          subtext="Edited or run today"
          icon={<FileText className="h-4 w-4" />}
        />
        <DashboardCard
          label="Projects"
          value={dashboardStats.totalProjects}
          subtext={`${dashboardStats.totalPrompts} prompts total`}
          icon={<FolderKanban className="h-4 w-4" />}
        />
        <DashboardCard
          label="Monthly cost"
          value={`$${dashboardStats.monthlyCost.toFixed(2)}`}
          subtext={`$${budget.remaining.toFixed(2)} remaining`}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <DashboardCard
          label="Cache saved"
          value={`$${dashboardStats.cacheSaved.toFixed(2)}`}
          subtext="Exact-match hits"
          icon={<PiggyBank className="h-4 w-4" />}
        />
        <DashboardCard
          label="Prompt count"
          value={dashboardStats.totalPrompts}
          subtext="Across all domains"
          icon={<FileText className="h-4 w-4" />}
        />
        <DashboardCard
          label="Most used model"
          value={dashboardStats.mostUsedModel}
          subtext={`${dashboardStats.modelUsage[0]?.count ?? 0} runs this month`}
          icon={<Cpu className="h-4 w-4" />}
        />
        <DashboardCard
          label="Active sessions"
          value={sessions.filter((s) => s.status === "active").length}
          subtext={`${sessions.length} total sessions`}
          icon={<MessageSquare className="h-4 w-4" />}
        />
        <DashboardCard
          label="Model usage"
          value={`${dashboardStats.modelUsage.length} models`}
          subtext="This month"
          icon={<Sparkles className="h-4 w-4" />}
        />
      </div>

      <BudgetMeter budget={budget} />

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="section-label flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Recent activity
            </h2>
          </div>
          <div className="card divide-y divide-border">
            {recentActivity.slice(0, 5).map((item) => (
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
            ))}
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
          <div className="card p-4 space-y-3">
            {dashboardStats.modelUsage.map((item) => (
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
                    style={{ width: `${(item.count / 18) * 100}%` }}
                  />
                </div>
              </div>
            ))}
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
        <SessionList sessions={recentSessions} />
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="section-label">Today's prompts</h2>
          <Link href="/prompts" className="section-link">
            View all
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <PromptList prompts={recentPrompts} />
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="section-label">Recent outputs</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {latestOutputs.map((item) => (
            <Link
              key={item.promptId}
              href={`/prompts/${item.promptId}`}
              className="card card-hover p-4"
            >
              <p className="text-sm font-medium text-ink">{item.promptTitle}</p>
              <p className="mt-1 line-clamp-2 text-xs text-muted">{item.output}</p>
              <p className="mt-2 text-xs text-faint">
                {item.model} · ${item.cost.toFixed(3)}
              </p>
            </Link>
          ))}
        </div>
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
          {domains.slice(0, 6).map((domain) => (
            <DomainCard key={domain.id} domain={domain} />
          ))}
        </div>
      </section>
    </div>
  );
}
