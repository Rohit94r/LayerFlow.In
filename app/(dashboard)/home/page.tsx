import Link from "next/link";
import { LifeBuoy, Library, Plus, TerminalSquare } from "@/components/ui/icons";
import { QuickActions } from "@/components/shared/quick-actions";
import { Section } from "@/components/shared/section";
import { Row } from "@/components/shared/row";
import { Panel } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { workspaceService } from "@/lib/services/workspace";
import { passportService } from "@/lib/services/passports";
import { promptService } from "@/lib/services/prompts";
import { modelService } from "@/lib/services/models";

const today = new Date().toLocaleDateString("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
});

export default async function HomePage() {
  const [projects, timeline, stats, passports, prompts, models, providerKeys] = await Promise.all([
    workspaceService.listProjects(),
    workspaceService.listTimeline(),
    workspaceService.getDashboardStats(),
    passportService.listPassports(),
    promptService.listPrompts(),
    modelService.listModels(),
    modelService.listProviderKeys(),
  ]);

  const recentProjects = [...projects]
    .filter((p) => p.stage !== "done")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 4);

  const recentEvents = [...timeline]
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 5);

  const recentPrompts = [...prompts]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 3);

  const recentPassports = [...passports]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 3);

  const pinnedLearnings = (await workspaceService.listLearnings()).filter((l) => l.pinned);

  const connectedProviders = providerKeys.filter((k) => k.status === "connected").length;
  const totalSpend = stats.weeklyUsage.reduce((sum, p) => sum + p.value, 0);

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-faint">
          {today}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">
          What should I work on?
        </h1>
        <p className="mt-1 text-sm text-muted">
          Everything below is waiting for you — pick up where you left off.
        </p>
      </div>

      {/* Primary actions */}
      <QuickActions
        actions={[
          {
            label: "New Continue Pack",
            description: "Paste a dead chat, keep the work",
            href: "/rescue",
            icon: LifeBuoy,
          },
          {
            label: "New prompt",
            description: "Improve or save a prompt",
            href: "/prompts",
            icon: Library,
          },
          {
            label: "Open terminal",
            description: "lf run — agents, models, context",
            href: "/code",
            icon: TerminalSquare,
          },
          {
            label: "New project",
            description: "Start a project workspace",
            href: "/workspace",
            icon: Plus,
          },
        ]}
      />

      {/* Main grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Continue where you left off */}
        <Section
          title="Pick up where you left off"
          description="Your latest Continue Packs, ready to paste"
          href="/rescue"
          className="lg:col-span-2"
        >
          <div className="space-y-0.5">
            {recentEvents.slice(0, 3).map((evt) => (
              <Row
                key={evt.id}
                leading={
                  <span
                    className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                      evt.type === "rescue"
                        ? "bg-brand"
                        : evt.type === "prompt"
                          ? "bg-brand-2"
                          : "bg-white/30"
                    }`}
                  />
                }
                title={evt.title}
                subtitle={evt.description}
                trailing={<span className="font-mono text-[10px] text-faint">{evt.meta}</span>}
                href="/rescue"
              />
            ))}
          </div>
          <div className="mt-3 border-t border-border pt-3">
            <Link
              href="/rescue"
              className="flex w-full items-center justify-between rounded-xl border border-dashed border-border px-4 py-3 text-left transition-colors duration-150 hover:border-border-strong"
            >
              <span className="text-[13px] font-medium text-muted">Paste a chat that hit a limit</span>
              <Plus className="h-4 w-4 text-brand" />
            </Link>
          </div>
        </Section>

        {/* Model usage — real workflow data */}
        <Section title="Model usage" description="This week, by provider">
          <div className="space-y-3 p-1.5">
            {stats.modelMix.map((m) => (
              <div key={m.provider}>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted">{m.provider}</span>
                  <span className="font-mono text-faint">{m.value}%</span>
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full bg-brand/70" style={{ width: `${m.value}%` }} />
                </div>
              </div>
            ))}
            <p className="pt-1 text-[11px] text-faint">
              ${totalSpend.toFixed(2)} spent · {connectedProviders}/{models.length} providers connected
            </p>
          </div>
        </Section>
      </div>

      {/* Secondary grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Section title="Recent projects" href="/workspace" hrefLabel="All projects">
          <div className="space-y-0.5">
            {recentProjects.map((p) => (
              <Row
                key={p.id}
                href={`/workspace/${p.id}`}
                leading={<span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />}
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

        <Section title="Saved prompts" href="/prompts" hrefLabel="Prompt library">
          <div className="space-y-0.5">
            {recentPrompts.map((p) => (
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

        <Section title="Context passports" href="/passports" hrefLabel="All passports">
          <div className="space-y-0.5">
            {recentPassports.map((p) => (
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
      </div>

      {/* Recent activity */}
      <Section title="Recent activity" description="Every run, one ledger" href="/history" hrefLabel="Full history">
        <div className="space-y-0.5">
          {recentEvents.map((evt) => (
            <Row
              key={evt.id}
              title={evt.title}
              subtitle={evt.description}
              trailing={<span className="font-mono text-[10px] text-faint">{evt.meta}</span>}
            />
          ))}
        </div>
      </Section>

      {/* Pinned learnings */}
      {pinnedLearnings.length > 0 ? (
        <Panel className="p-5">
          <h2 className="text-[13px] font-semibold text-ink">Pinned learnings</h2>
          <div className="mt-3 space-y-3">
            {pinnedLearnings.map((l) => (
              <p key={l.id} className="text-[13px] leading-relaxed text-muted">
                <span className="font-semibold text-brand-2">↳</span> {l.content}
              </p>
            ))}
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
