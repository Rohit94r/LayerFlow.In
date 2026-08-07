import Link from "next/link";
import { LifeBuoy, Sparkles, ArrowRight, Library, DollarSign, History as HistoryIcon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Panel, PanelBody } from "@/components/ui/panel";
import { Row } from "@/components/shared/row";
import { NAV_GROUPS } from "@/lib/config/navigation";
import { workspaceService } from "@/lib/services/workspace";
import { passportService } from "@/lib/services/passports";
import { promptService } from "@/lib/services/prompts";

const today = new Date().toLocaleDateString("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
});

export default async function HomePage() {
  const [timeline, costs, reports, prompts] = await Promise.all([
    workspaceService.listTimeline(),
    workspaceService.getCostAnalytics(),
    passportService.listRescueReports(),
    promptService.listPrompts(),
  ]);

  const recentEvents = [...timeline]
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 5);

  const stats = [
    { label: "Continue Packs", value: String(reports.length), icon: LifeBuoy },
    { label: "Prompts saved", value: String(prompts.length), icon: Library },
    { label: "Spent this month", value: `$${costs.monthlySpend.toFixed(2)}`, icon: DollarSign },
  ];

  return (
    <div className="space-y-8">
      {/* ── Header ───────────────────────────────────────── */}
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-faint">{today}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Home</h1>
        <p className="mt-1.5 text-sm text-muted">
          Rescue a dead chat and keep going — every other feature is one click away.
        </p>
      </div>

      {/* ── Main action ───────────────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Panel className="gradient-border lg:col-span-2">
          <PanelBody className="p-7 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-5">
              <div className="max-w-md">
                <p className="font-mono text-sm font-medium tracking-wide text-brand">Your #1 action</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
                  Rescue a dead chat
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  Paste any ChatGPT, Claude or Gemini conversation — get a clean
                  Continue Pack you can take to any model.
                </p>
              </div>
              <Button asChild size="lg" icon={<LifeBuoy className="h-4 w-4" />}>
                <Link href="/rescue">Rescue a chat</Link>
              </Button>
            </div>
            <div className="mt-6 flex flex-wrap gap-3 border-t border-border pt-5">
              <Link
                href="/prompts"
                className="inline-flex items-center gap-2 text-sm font-medium text-ink transition-colors hover:text-brand"
              >
                <Sparkles className="h-4 w-4 text-brand-2" />
                Improve a prompt
              </Link>
              <Link
                href="/models"
                className="inline-flex items-center gap-2 text-sm font-medium text-ink transition-colors hover:text-brand"
              >
                <ArrowRight className="h-4 w-4 text-brand-2" />
                Check model costs
              </Link>
            </div>
          </PanelBody>
        </Panel>

        {/* ── Quick stats ─────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3 lg:grid-cols-1">
          {stats.map((s) => (
            <div key={s.label} className="flex items-center gap-3 rounded-2xl border border-border bg-surface/40 p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-2">
                <s.icon className="h-4 w-4 text-brand" />
              </span>
              <div>
                <p className="text-lg font-semibold tracking-tight text-ink">{s.value}</p>
                <p className="text-[11px] text-faint">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Recent activity ───────────────────────────────── */}
      <div>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold tracking-tight text-ink">Recent activity</h2>
          <Link href="/history" className="inline-flex items-center gap-1.5 text-xs font-medium text-brand hover:underline">
            <HistoryIcon className="h-3.5 w-3.5" />
            View all
          </Link>
        </div>
        <Panel>
          <PanelBody className="space-y-0.5">
            {recentEvents.length ? (
              recentEvents.map((evt) => (
                <Row
                  key={evt.id}
                  href="/history"
                  title={evt.title}
                  subtitle={evt.description}
                  trailing={<span className="font-mono text-[11px] text-faint">{evt.meta}</span>}
                />
              ))
            ) : (
              <p className="px-4 py-8 text-center text-sm text-faint">
                Nothing yet — rescue a chat and your work shows up here.
              </p>
            )}
          </PanelBody>
        </Panel>
      </div>

      {/* ── Everything, in one place ──────────────────────── */}
      <div>
        <h2 className="mb-3 text-sm font-semibold tracking-tight text-ink">Everything in LayerFlow</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="space-y-2">
              <p className="px-1 text-[10px] font-bold uppercase tracking-widest text-faint">{group.label}</p>
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex items-center gap-3 rounded-xl border border-border bg-surface/40 p-3 transition-colors duration-150 hover:border-border-strong hover:bg-surface-2/50"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-2">
                    <item.icon className="h-4 w-4 text-brand" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-ink transition-colors group-hover:text-brand">
                      {item.label}
                    </p>
                    <p className="truncate text-[11px] text-faint">{item.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
