import Link from "next/link";
import { LifeBuoy, Library, Plus, TerminalSquare } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Row } from "@/components/shared/row";
import { Section } from "@/components/shared/section";
import { Reveal } from "@/components/ui/reveal";
import { ContinuePackRow } from "@/components/features/home/continue-pack-row";
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
      <PanelHeader title={title} action={action} />
      <PanelBody className="space-y-3.5 pt-2.5">{children}</PanelBody>
    </Panel>
  );
}

export default async function HomePage() {
  const [projects, timeline, costs, passports, prompts, reports, providerKeys] = await Promise.all([
    workspaceService.listProjects(),
    workspaceService.listTimeline(),
    workspaceService.getCostAnalytics(),
    passportService.listPassports(),
    promptService.listPrompts(),
    passportService.listRescueReports(),
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
  const recentPassports = [...passports].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const connectedProviders = providerKeys.filter((k) => k.status === "connected").length;
  const spendPct = Math.round((costs.monthlySpend / costs.budgetLimit) * 100);
  const runningAgents = [...AGENTS].slice(0, 3);

  const quickActions = [
    { label: "New Continue Pack", description: "Paste a dead chat", href: "/rescue", icon: LifeBuoy },
    { label: "New prompt", description: "Save or improve one", href: "/prompts", icon: Library },
    { label: "Open terminal", description: "lf run, agents, models", href: "/code", icon: TerminalSquare },
    { label: "New project", description: "Start a workspace", href: "/workspace", icon: Plus },
  ];

  return (
    <div className="space-y-10">
      {/* ── Header ───────────────────────────────────────── */}
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-faint">{today}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">
              Today&apos;s Workspace
            </h1>
            <p className="mt-1.5 text-sm text-muted">Pick up where you left off — everything is here.</p>
          </div>
          <Button asChild icon={<LifeBuoy className="h-4 w-4" />}>
            <Link href="/rescue">New Continue Pack</Link>
          </Button>
        </div>
      </Reveal>

      {/* ── Main + utility column ────────────────────────── */}
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-8">
        <div className="min-w-0 space-y-6">
          {/* Continue working */}
          <Reveal delay={0.05}>
            <Section title="Continue working" description="Your next moves, ready to go">
              <div className="space-y-0.5">
                {pinnedProject ? (
                  <Row
                    href={`/workspace/${pinnedProject.id}`}
                    leading={
                      <span
                        className="mt-1 h-2 w-2 shrink-0 rounded-full"
                        style={{ background: pinnedProject.color }}
                      />
                    }
                    title={pinnedProject.name}
                    subtitle={pinnedProject.description}
                    trailing={
                      <Badge tone={pinnedProject.stage === "active" ? "mint" : "neutral"}>
                        {pinnedProject.stage}
                      </Badge>
                    }
                  />
                ) : null}
                {latestEvent ? (
                  <Row
                    href="/history"
                    leading={<span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand" />}
                    title={latestEvent.title}
                    subtitle={latestEvent.description}
                    trailing={<span className="font-mono text-[11px] text-faint">{latestEvent.meta}</span>}
                  />
                ) : null}
                {latestReport ? (
                  <ContinuePackRow
                    title={latestReport.title}
                    source={`${latestReport.sourceTool} → ${latestReport.sourceModel} · ${latestReport.compressionPercent}% compressed`}
                    fields={latestReport.continuePack}
                  />
                ) : null}
              </div>
            </Section>
          </Reveal>

          {/* Current context */}
          {currentPassport ? (
            <Reveal delay={0.1}>
              <Panel>
                <PanelHeader
                  title="Current context"
                  description="Most recent context passport"
                  action={
                    <Button asChild variant="secondary" size="sm">
                      <Link href={`/passports/${currentPassport.id}`}>Open passport</Link>
                    </Button>
                  }
                />
                <PanelBody className="space-y-1.5">
                  <h3 className="text-[15px] font-semibold tracking-tight text-ink">
                    {currentPassport.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted">
                    {currentPassport.fields.goal}
                  </p>
                  <p className="pt-1 text-[13px] leading-relaxed text-faint">
                    <span className="font-medium text-brand-2">Next:</span>{" "}
                    {currentPassport.fields.nextAction}
                  </p>
                </PanelBody>
              </Panel>
            </Reveal>
          ) : null}

          {/* Recent sessions */}
          <Reveal delay={0.15}>
            <Section
              title="Recent sessions"
              description="Every run, one ledger"
              href="/history"
              hrefLabel="Full history"
            >
              <div className="space-y-0.5">
                {recentEvents.slice(0, 5).map((evt) => (
                  <Row
                    key={evt.id}
                    href="/history"
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
                    trailing={<span className="font-mono text-[11px] text-faint">{evt.meta}</span>}
                  />
                ))}
              </div>
            </Section>
          </Reveal>
        </div>

        {/* ── Utility column ─────────────────────────────── */}
        <aside className="min-w-0 space-y-6 xl:sticky xl:top-6">
          <Reveal delay={0.05}>
            <Widget title="Quick actions">
              <div className="space-y-0.5">
                {quickActions.map((a) => (
                  <Row
                    key={a.href}
                    href={a.href}
                    leading={
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-2">
                        <a.icon className="h-4 w-4 text-brand" />
                      </span>
                    }
                    title={a.label}
                    subtitle={a.description}
                  />
                ))}
              </div>
            </Widget>
          </Reveal>

          <Reveal delay={0.1}>
            <Widget title="Running agents" action={`${AGENTS.length} total`}>
              {runningAgents.map((agent) => (
                <Row
                  key={agent.id}
                  href="/agents"
                  leading={
                    <span className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", AGENT_DOT[agent.status])} />
                  }
                  title={agent.name}
                  subtitle={agent.detail}
                  trailing={<span className="font-mono text-[11px] text-faint">{agent.model}</span>}
                />
              ))}
            </Widget>
          </Reveal>

          <Reveal delay={0.15}>
            <Widget title="Upcoming limits">
              <div>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-muted">Monthly budget</span>
                  <span className="font-mono text-faint">
                    ${costs.monthlySpend.toFixed(2)} / ${costs.budgetLimit.toFixed(0)}
                  </span>
                </div>
                <Progress
                  value={costs.monthlySpend}
                  max={costs.budgetLimit}
                  className="mt-2"
                  barClassName={spendPct > 80 ? "bg-rose-500" : "bg-brand"}
                />
              </div>
              <div className="space-y-2.5 border-t border-border pt-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted">Continue Packs exported</span>
                  <span className="font-mono text-faint">{reports.length} / 5</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted">Provider keys connected</span>
                  <span className="font-mono text-faint">
                    {connectedProviders} / {providerKeys.length}
                  </span>
                </div>
              </div>
            </Widget>
          </Reveal>
        </aside>
      </div>

      {/* ── Bottom — one system, four lists ──────────────── */}
      <div className="grid gap-6 md:grid-cols-2">
        <Reveal delay={0.05}>
          <Section title="Recent projects" href="/workspace" hrefLabel="All projects">
            <div className="space-y-0.5">
              {recentProjects.slice(0, 4).map((p) => (
                <Row
                  key={p.id}
                  href={`/workspace/${p.id}`}
                  leading={
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: p.color }} />
                  }
                  title={p.name}
                  subtitle={p.description}
                  trailing={
                    <Badge tone={p.stage === "active" ? "mint" : "neutral"}>
                      {p.stage === "active" ? "active" : "paused"}
                    </Badge>
                  }
                />
              ))}
            </div>
          </Section>
        </Reveal>

        <Reveal delay={0.08}>
          <Section title="Continue Packs" href="/rescue" hrefLabel="Rescue hub">
            <div className="space-y-0.5">
              {reports.slice(0, 4).map((r) => (
                <Row
                  key={r.id}
                  href="/rescue"
                  leading={<span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-2" />}
                  title={r.title}
                  subtitle={`${r.sourceTool} → ${r.sourceModel} · ${r.summary}`}
                  trailing={
                    <span className="font-mono text-[11px] text-faint">
                      {r.compressionPercent}% compressed
                    </span>
                  }
                />
              ))}
            </div>
          </Section>
        </Reveal>

        <Reveal delay={0.05}>
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

        <Reveal delay={0.08}>
          <Section title="Context passports" href="/passports" hrefLabel="All passports">
            <div className="space-y-0.5">
              {recentPassports.slice(0, 4).map((p) => (
                <Row
                  key={p.id}
                  href={`/passports/${p.id}`}
                  leading={<Badge tone="violet">{p.wordCount.toLocaleString()}w</Badge>}
                  title={p.title}
                  subtitle={`${p.meta.sourceTool} → ${p.meta.sourceModel}`}
                />
              ))}
            </div>
          </Section>
        </Reveal>
      </div>
    </div>
  );
}
