import Link from "next/link";
import {
  ArrowUpRight,
  LifeBuoy,
  Library,
  Plus,
  TerminalSquare,
} from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Row } from "@/components/shared/row";
import { Section } from "@/components/shared/section";
import { Reveal } from "@/components/shared/reveal";
import { ContinuePackCard } from "@/components/features/home/continue-pack-card";
import { workspaceService } from "@/lib/services/workspace";
import { passportService } from "@/lib/services/passports";
import { promptService } from "@/lib/services/prompts";
import { modelService } from "@/lib/services/models";
import { AGENTS } from "@/lib/data/code";
import type { AgentStatus } from "@/lib/data/code";
import { cn } from "@/lib/utils";

const today = new Date().toLocaleDateString("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
});

const AGENT_DOT: Record<AgentStatus, string> = {
  running: "bg-brand",
  reviewing: "bg-amber-400",
  done: "bg-brand-2",
  idle: "bg-surface-2",
};

const TERMINAL_HISTORY = [
  { id: "t1", cmd: "lf run --model claude-sonnet-4 --task 'migration'", when: "2h ago", meta: "1m 12s · 8.4k tokens" },
  { id: "t2", cmd: "lf pack --latest --copy", when: "5h ago", meta: "0m 4s" },
  { id: "t3", cmd: "lf agent mesh --workers 3", when: "yesterday", meta: "3m 41s" },
  { id: "t4", cmd: "lf prompt improve --id p-004", when: "2 days ago", meta: "0m 9s" },
];

/** Tight sidebar widget — right utility panel framing. */
function Widget({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Panel>
      <PanelHeader
        title={title}
        action={
          action ? (
            <span className="text-[11px] font-medium text-muted">{action}</span>
          ) : undefined
        }
      />
      <PanelBody className="space-y-3.5">{children}</PanelBody>
    </Panel>
  );
}

export default async function HomePage() {
  const [projects, timeline, stats, costs, passports, prompts, reports, models, providerKeys] =
    await Promise.all([
      workspaceService.listProjects(),
      workspaceService.listTimeline(),
      workspaceService.getDashboardStats(),
      workspaceService.getCostAnalytics(),
      passportService.listPassports(),
      promptService.listPrompts(),
      passportService.listRescueReports(),
      modelService.listModels(),
      modelService.listProviderKeys(),
    ]);

  const recentProjects = [...projects]
    .filter((p) => p.stage !== "done")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const pinnedProject = recentProjects[0];
  const recentEvents = [...timeline].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  const latestEvent = recentEvents[0];

  const latestReport = [...reports].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const currentPassport = [...passports].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];

  const recentPrompts = [...prompts].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const pinnedPrompts = prompts.filter((p) => p.favorite).sort((a, b) => b.score - a.score);

  const connectedProviders = providerKeys.filter((k) => k.status === "connected").length;
  const totalSpend = stats.weeklyUsage.reduce((sum, p) => sum + p.value, 0);
  const spendPct = Math.round((costs.monthlySpend / costs.budgetLimit) * 100);
  const needsAttention = providerKeys.filter((k) => k.status === "needs_attention").length;
  const lowScorePrompts = prompts.filter((p) => p.score < 70).length;

  const notifications = [
    spendPct >= 50
      ? {
          id: "spend",
          tone: (spendPct > 80 ? "rose" : "amber") as "amber" | "mint" | "rose" | "neutral",
          text: `${spendPct}% of your monthly budget is used`,
          when: "Live",
        }
      : null,
    needsAttention > 0
      ? {
          id: "keys",
          tone: "rose" as const,
          text: `${needsAttention} provider key${needsAttention > 1 ? "s" : ""} need attention`,
          when: "Today",
        }
      : null,
    reports.length > 0
      ? {
          id: "packs",
          tone: "mint" as const,
          text: `${reports.length} Continue Pack${reports.length > 1 ? "s" : ""} ready to paste`,
          when: "This month",
        }
      : null,
    lowScorePrompts > 0
      ? {
          id: "prompts",
          tone: "neutral" as const,
          text: `${lowScorePrompts} saved prompt${lowScorePrompts > 1 ? "s" : ""} could score higher`,
          when: "This week",
        }
      : null,
  ]
    .filter((n): n is NonNullable<typeof n> => n !== null)
    .slice(0, 4);

  const runningAgents = [...AGENTS]
    .sort((a, b) => (a.status === "idle" ? 1 : -1) - (b.status === "idle" ? 1 : -1))
    .slice(0, 4);

  return (
    <div className="space-y-10">
      {/* ── Today's Workspace ─────────────────────────────── */}
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-faint">{today}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink md:text-4xl">
              Today&apos;s Workspace
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
              Nothing is lost — your context, agents and limits are all here. Pick up exactly where
              you left off.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            <Button asChild variant="secondary" icon={<TerminalSquare className="h-4 w-4" />}>
              <Link href="/code">Open terminal</Link>
            </Button>
            <Button asChild icon={<LifeBuoy className="h-4 w-4" />}>
              <Link href="/rescue">New Continue Pack</Link>
            </Button>
          </div>
        </div>
      </Reveal>

      {/* ── Main workspace + right utility panel ──────────── */}
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:gap-8">
        <div className="min-w-0 space-y-8">
          {/* Continue working — big resume cards */}
          <Reveal delay={0.05}>
            <section aria-labelledby="continue-working">
              <div className="mb-3 flex items-baseline justify-between">
                <h2 id="continue-working" className="text-sm font-semibold text-ink">
                  Continue working
                </h2>
                <Link
                  href="/history"
                  className="text-[11px] font-medium text-muted transition-colors hover:text-ink"
                >
                  All sessions
                </Link>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {pinnedProject ? (
                  <Link
                    href={`/workspace/${pinnedProject.id}`}
                    className="card-lift group flex h-full flex-col rounded-2xl border border-border bg-surface/60 p-5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="flex h-8 w-8 items-center justify-center rounded-lg"
                        style={{ background: `${pinnedProject.color}26` }}
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ background: pinnedProject.color }}
                        />
                      </span>
                      <Badge tone={pinnedProject.stage === "active" ? "mint" : "neutral"}>
                        {pinnedProject.stage}
                      </Badge>
                    </div>
                    <h3 className="mt-4 text-[15px] font-semibold tracking-tight text-ink">
                      {pinnedProject.name}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-muted">
                      {pinnedProject.description}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      <span className="chip">{pinnedProject.passportCount} passports</span>
                      <span className="chip">{pinnedProject.promptCount} prompts</span>
                      <span className="chip">{pinnedProject.learningCount} learnings</span>
                    </div>
                    <span className="mt-auto inline-flex items-center gap-1 pt-4 text-[11px] font-medium text-brand">
                      Continue project
                      <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </span>
                  </Link>
                ) : null}

                {latestEvent ? (
                  <Link
                    href="/history"
                    className="card-lift group flex h-full flex-col rounded-2xl border border-border bg-surface/60 p-5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-lg",
                          latestEvent.type === "rescue"
                            ? "bg-brand/15"
                            : latestEvent.type === "prompt"
                              ? "bg-brand-2/15"
                              : "bg-surface-2",
                        )}
                      >
                        <span
                          className={cn(
                            "h-2 w-2 rounded-full",
                            latestEvent.type === "rescue"
                              ? "bg-brand"
                              : latestEvent.type === "prompt"
                                ? "bg-brand-2"
                                : "bg-white/30",
                          )}
                        />
                      </span>
                      <span className="font-mono text-[10px] text-faint">{latestEvent.meta}</span>
                    </div>
                    <h3 className="mt-4 text-[15px] font-semibold tracking-tight text-ink">
                      {latestEvent.title}
                    </h3>
                    <p className="mt-1 line-clamp-3 text-[12px] leading-relaxed text-muted">
                      {latestEvent.description}
                    </p>
                    <span className="mt-auto inline-flex items-center gap-1 pt-4 text-[11px] font-medium text-brand">
                      Open session
                      <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </span>
                  </Link>
                ) : null}

                {latestReport ? (
                  <ContinuePackCard
                    title={latestReport.title}
                    meta={`${latestReport.sourceTool} → ${latestReport.sourceModel} · ${latestReport.compressionPercent}% compressed`}
                    fields={latestReport.continuePack}
                    href="/rescue"
                  />
                ) : null}
              </div>
            </section>
          </Reveal>

          {/* Recent AI sessions */}
          <Reveal delay={0.12}>
            <Panel>
              <PanelHeader
                title="Recent AI sessions"
                description="Every run, one ledger"
                action={
                  <Link
                    href="/history"
                    className="text-[11px] font-medium text-muted transition-colors hover:text-ink"
                  >
                    Full history
                  </Link>
                }
              />
              <PanelBody className="space-y-0.5 pt-2.5">
                {recentEvents.slice(0, 5).map((evt) => (
                  <Row
                    key={evt.id}
                    leading={
                      <span
                        className={cn(
                          "mt-1 h-2 w-2 shrink-0 rounded-full",
                          evt.type === "rescue"
                            ? "bg-brand"
                            : evt.type === "prompt"
                              ? "bg-brand-2"
                              : "bg-white/30",
                        )}
                      />
                    }
                    title={evt.title}
                    subtitle={evt.description}
                    trailing={
                      <span className="font-mono text-[10px] text-faint">{evt.meta}</span>
                    }
                    href="/history"
                  />
                ))}
              </PanelBody>
            </Panel>
          </Reveal>

          {/* Current context */}
          {currentPassport ? (
            <Reveal delay={0.18}>
              <Panel className="gradient-border">
                <PanelHeader
                  title="Current context"
                  description="Most recent context passport"
                  action={<Badge tone="violet">{currentPassport.wordCount.toLocaleString()}w</Badge>}
                />
                <PanelBody>
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <h3 className="text-[15px] font-semibold tracking-tight text-ink">
                        {currentPassport.title}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-muted">
                        {currentPassport.fields.goal}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {currentPassport.meta.tags.slice(0, 5).map((t) => (
                          <span key={t} className="chip">
                            #{t}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-4 lg:max-w-sm">
                      <p className="text-[12px] leading-relaxed text-faint">
                        <span className="font-semibold text-brand-2">Next:</span>{" "}
                        {currentPassport.fields.nextAction}
                      </p>
                      <Button asChild variant="secondary" size="sm">
                        <Link href={`/passports/${currentPassport.id}`}>Open passport</Link>
                      </Button>
                    </div>
                  </div>
                </PanelBody>
              </Panel>
            </Reveal>
          ) : null}
        </div>

        {/* ── Right utility panel ─────────────────────────── */}
        <aside className="min-w-0 space-y-5 xl:sticky xl:top-6">
          <Reveal delay={0.05}>
            <Widget title="Quick actions">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "New Continue Pack", href: "/rescue", icon: LifeBuoy },
                  { label: "New prompt", href: "/prompts", icon: Library },
                  { label: "Open terminal", href: "/code", icon: TerminalSquare },
                  { label: "New project", href: "/workspace", icon: Plus },
                ].map((a) => (
                  <Link
                    key={a.href}
                    href={a.href}
                    className="card-lift flex items-center gap-2 rounded-xl border border-border bg-surface/50 px-3 py-2.5"
                  >
                    <a.icon className="h-3.5 w-3.5 shrink-0 text-brand" />
                    <span className="text-[11px] font-medium leading-tight text-ink">
                      {a.label}
                    </span>
                  </Link>
                ))}
              </div>
            </Widget>
          </Reveal>

          <Reveal delay={0.1}>
            <Widget title="Running agents" action={`${AGENTS.length} total`}>
              {runningAgents.map((agent) => (
                <Link
                  key={agent.id}
                  href="/agents"
                  className="flex items-center gap-2.5 rounded-xl px-1.5 py-1 transition-colors duration-150 hover:bg-surface-2/60"
                >
                  <span className={cn("h-2 w-2 shrink-0 rounded-full", AGENT_DOT[agent.status])} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] font-medium text-ink">
                      {agent.name}
                    </span>
                    <span className="block truncate text-[10px] text-faint">{agent.detail}</span>
                  </span>
                  <span className="shrink-0 font-mono text-[10px] text-faint">{agent.model}</span>
                </Link>
              ))}
            </Widget>
          </Reveal>

          <Reveal delay={0.15}>
            <Widget title="Model usage" action="This week">
              <div className="space-y-3">
                {stats.modelMix.map((m) => (
                  <div key={m.provider}>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted">{m.provider}</span>
                      <span className="font-mono text-faint">{m.value}%</span>
                    </div>
                    <div className="mt-1 h-1 overflow-hidden rounded-full bg-surface-2">
                      <div
                        className="h-full rounded-full bg-brand/70"
                        style={{ width: `${m.value}%` }}
                      />
                    </div>
                  </div>
                ))}
                <p className="pt-0.5 text-[11px] text-faint">
                  ${totalSpend.toFixed(2)} spent · {connectedProviders}/{models.length} providers
                  connected
                </p>
              </div>
            </Widget>
          </Reveal>

          <Reveal delay={0.2}>
            <Widget title="Recent activity" action={`${recentEvents.length} runs`}>
              {recentEvents.slice(0, 4).map((evt) => (
                <div key={evt.id} className="flex items-start gap-2.5 px-1.5">
                  <span
                    className={cn(
                      "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                      evt.type === "rescue"
                        ? "bg-brand"
                        : evt.type === "prompt"
                          ? "bg-brand-2"
                          : "bg-white/30",
                    )}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-medium text-ink">{evt.title}</p>
                    <p className="truncate font-mono text-[10px] text-faint">{evt.meta}</p>
                  </div>
                </div>
              ))}
            </Widget>
          </Reveal>

          <Reveal delay={0.25}>
            <Widget title="Notifications">
              {notifications.length > 0 ? (
                notifications.map((n) => (
                  <div key={n.id} className="flex items-start gap-2.5 px-1.5">
                    <span
                      aria-hidden
                      className={cn(
                        "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                        n.tone === "rose"
                          ? "bg-rose-400"
                          : n.tone === "amber"
                            ? "bg-amber-400"
                            : n.tone === "mint"
                              ? "bg-emerald-400"
                              : "bg-surface-2",
                      )}
                    />
                    <div className="min-w-0">
                      <p className="text-[12px] leading-relaxed text-muted">{n.text}</p>
                      <p className="text-[10px] text-faint">{n.when}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="px-1.5 text-[12px] text-muted">All systems nominal.</p>
              )}
            </Widget>
          </Reveal>

          <Reveal delay={0.3}>
            <Widget title="Upcoming limits">
              <div>
                <div className="flex items-baseline justify-between text-[11px]">
                  <span className="text-muted">Monthly budget</span>
                  <span className="font-mono text-faint">
                    ${costs.monthlySpend.toFixed(2)} / ${costs.budgetLimit.toFixed(0)}
                  </span>
                </div>
                <Progress
                  value={costs.monthlySpend}
                  max={costs.budgetLimit}
                  className="mt-1.5"
                  barClassName={spendPct > 80 ? "bg-rose-500" : "bg-brand"}
                />
              </div>
              <div className="space-y-2 border-t border-border pt-3">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted">Continue Packs exported</span>
                  <span className="font-mono text-faint">{reports.length} / 5</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted">Provider keys connected</span>
                  <span className="font-mono text-faint">
                    {connectedProviders} / {providerKeys.length}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted">Average run cost</span>
                  <span className="font-mono text-faint">${costs.averageRunCost.toFixed(2)}</span>
                </div>
              </div>
            </Widget>
          </Reveal>
        </aside>
      </div>

      {/* ── Bottom grid — varied widths ───────────────────── */}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3 xl:gap-6">
        <Reveal delay={0.05} className="md:col-span-2 xl:col-span-2">
          <Section title="Recent projects" href="/workspace" hrefLabel="All projects">
            <div className="grid gap-3 sm:grid-cols-2">
              {recentProjects.slice(0, 4).map((p) => (
                <Link
                  key={p.id}
                  href={`/workspace/${p.id}`}
                  className="card-lift group flex h-full flex-col rounded-xl border border-border bg-surface/50 p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ background: p.color }}
                      />
                      <span className="truncate text-[13px] font-semibold text-ink">{p.name}</span>
                    </span>
                    <Badge tone={p.stage === "active" ? "mint" : "neutral"}>
                      {p.stage === "active" ? "active" : "paused"}
                    </Badge>
                  </div>
                  <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-muted">
                    {p.description}
                  </p>
                  <span className="mt-auto pt-3 text-[10px] font-mono text-faint">
                    {p.passportCount} passports · {p.promptCount} prompts · {p.learningCount}{" "}
                    learnings
                  </span>
                </Link>
              ))}
            </div>
          </Section>
        </Reveal>

        <Reveal delay={0.1}>
          <Section title="Prompt library" href="/prompts" hrefLabel="All prompts">
            <div className="space-y-0.5">
              {recentPrompts.slice(0, 4).map((p) => (
                <Row
                  key={p.id}
                  href={`/prompts/${p.id}`}
                  leading={<Badge tone="amber">{p.score}</Badge>}
                  title={p.title}
                  subtitle={p.tags.slice(0, 2).map((t) => `#${t}`).join(" ")}
                />
              ))}
            </div>
          </Section>
        </Reveal>

        <Reveal delay={0.05} className="md:col-span-2 xl:col-span-2">
          <Section title="Continue Packs" href="/rescue" hrefLabel="Rescue hub">
            <div className="space-y-0.5">
              {reports.slice(0, 4).map((r) => (
                <Row
                  key={r.id}
                  href="/rescue"
                  leading={
                    <span className="font-mono text-[10px] text-faint">
                      {r.sourceTool} → {r.sourceModel}
                    </span>
                  }
                  title={r.title}
                  subtitle={r.summary}
                  trailing={
                    <Badge tone="mint">{r.compressionPercent}% compressed</Badge>
                  }
                />
              ))}
            </div>
          </Section>
        </Reveal>

        <Reveal delay={0.1}>
          <Section title="Terminal history" href="/code" hrefLabel="Open terminal">
            <div className="space-y-0.5">
              {TERMINAL_HISTORY.map((t) => (
                <div key={t.id} className="rounded-lg px-2 py-2">
                  <p className="truncate font-mono text-[11px] text-ink">$ {t.cmd}</p>
                  <p className="mt-1 text-[10px] text-faint">
                    {t.when} · {t.meta}
                  </p>
                </div>
              ))}
            </div>
          </Section>
        </Reveal>

        <Reveal delay={0.05} className="md:col-span-2 xl:col-span-2">
          <Section title="Context passports" href="/passports" hrefLabel="All passports">
            <div className="grid gap-3 sm:grid-cols-2">
              {passports
                .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
                .slice(0, 4)
                .map((p) => (
                  <Link
                    key={p.id}
                    href={`/passports/${p.id}`}
                    className="card-lift group flex h-full flex-col rounded-xl border border-border bg-surface/50 p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-[13px] font-semibold text-ink">{p.title}</span>
                      <span className="shrink-0 font-mono text-[10px] text-faint">
                        {p.wordCount.toLocaleString()}w
                      </span>
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-muted">
                      {p.fields.goal}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {p.meta.tags.slice(0, 3).map((t) => (
                        <span key={t} className="chip">
                          #{t}
                        </span>
                      ))}
                      <span className="chip">{p.meta.sourceTool} → {p.meta.sourceModel}</span>
                    </div>
                  </Link>
                ))}
            </div>
          </Section>
        </Reveal>

        <Reveal delay={0.1}>
          <Section title="Pinned prompts" href="/prompts" hrefLabel="Prompt library">
            <div className="space-y-0.5">
              {pinnedPrompts.slice(0, 4).map((p) => (
                <Row
                  key={p.id}
                  href={`/prompts/${p.id}`}
                  leading={<Badge tone="violet">★</Badge>}
                  title={p.title}
                  subtitle={`v${p.version} · ${p.usageCount} uses`}
                  trailing={<Badge tone={p.score >= 70 ? "mint" : "amber"}>{p.score}</Badge>}
                />
              ))}
              {pinnedPrompts.length === 0 ? (
                <p className="px-2 py-3 text-[12px] text-muted">No pinned prompts yet.</p>
              ) : null}
            </div>
          </Section>
        </Reveal>
      </div>
    </div>
  );
}
