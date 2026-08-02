"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Wallet,
  PiggyBank,
  BookUser,
  CopyCheck,
  ArrowRight,
  Cpu,
  Sparkles,
} from "@/components/ui/icons";
import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { QuickActions } from "@/components/app/quick-actions";
import { PassportCard } from "@/components/app/passport-card";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AreaChart, DonutChart, ChartLegend, RadialScore } from "@/components/ui/charts";
import { useSession } from "@/lib/auth-client";
import { DASHBOARD_STATS, PROJECTS, TIMELINE } from "@/lib/data/workspace";
import { PASSPORTS, RESCUE_REPORTS } from "@/lib/data/passports";
import { PROMPTS } from "@/lib/data/prompts";
import { MODELS, MODEL_BY_ID, formatMoney } from "@/lib/data/providers";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const session = useSession();
  const user = session.data?.user;
  const firstName = (user?.name ?? "there").split(" ")[0];

  const recentPassports = [...PASSPORTS]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 3);
  const recentProjects = [...PROJECTS]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 3);
  const bestPrompt = PROMPTS[0];
  const bestReport = RESCUE_REPORTS[0];
  const recommendedModel = MODEL_BY_ID[bestReport.recommendedModelId];
  const cheapestRun = bestReport.costs[0];

  return (
    <div>
      <PageHeader
        title={`Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}, ${firstName}`}
        description="Here's where your AI context stands today."
      />

      {/* ── Top cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Today's AI usage"
          value={`$${DASHBOARD_STATS.todayUsage.toFixed(2)}`}
          delta={DASHBOARD_STATS.todayUsageDelta}
          deltaLabel="vs yesterday"
          icon={Wallet}
          accent="#f59e0b"
          spark={[1.4, 1.1, 1.6, 0.9, 2.1, 1.7, 1.42]}
          goodWhenDown
        />
        <StatCard
          label="Money saved"
          value={`$${DASHBOARD_STATS.moneySaved.toFixed(1)}`}
          delta={DASHBOARD_STATS.moneySavedDelta}
          deltaLabel="this month"
          icon={PiggyBank}
          accent="#44edbc"
          spark={[12, 18, 15, 24, 30, 36, 42.6]}
        />
        <StatCard
          label="Contexts saved"
          value={DASHBOARD_STATS.contextsSaved.toLocaleString()}
          delta={DASHBOARD_STATS.contextsSavedDelta}
          deltaLabel="this week"
          icon={BookUser}
          accent="#8b7cf8"
          spark={[88, 96, 101, 110, 115, 121, 128]}
        />
        <StatCard
          label="Continue Packs"
          value={DASHBOARD_STATS.continuePacks.toString()}
          delta={DASHBOARD_STATS.continuePacksDelta}
          deltaLabel="this week"
          icon={CopyCheck}
          accent="#38bdf8"
          spark={[12, 15, 18, 22, 27, 31, 37]}
        />
      </div>

      {/* ── Charts row ── */}
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Weekly AI usage"
            description="Estimated spend, last 7 days"
            action={<Badge tone="amber">$10.42 total</Badge>}
          />
          <CardBody>
            <AreaChart data={DASHBOARD_STATS.weeklyUsage} height={170} />
            <div className="mt-3 flex items-center justify-between">
              <ChartLegend items={[{ label: "Spend ($)", color: "#f59e0b" }]} />
              <span className="text-[11px] text-faint">
                saved <span className="font-semibold text-emerald-400">${DASHBOARD_STATS.weeklySavings.reduce((s, d) => s + d.value, 0).toFixed(1)}</span> via model switches
              </span>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Model mix" description="Spend by provider" />
          <CardBody className="flex flex-col items-center">
            <DonutChart
              data={DASHBOARD_STATS.modelMix.map((m) => ({ label: m.provider, value: m.value }))}
              centerValue="$10.4"
              centerLabel="this week"
            />
            <div className="mt-4 grid w-full grid-cols-2 gap-x-4 gap-y-1.5">
              {DASHBOARD_STATS.modelMix.map((m) => (
                <span key={m.provider} className="flex items-center justify-between text-[11px]">
                  <span className="text-muted">{m.provider}</span>
                  <span className="font-semibold text-ink">{m.value}%</span>
                </span>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* ── Quick actions ── */}
      <div className="mt-8">
        <h2 className="section-label mb-3">Quick actions</h2>
        <QuickActions />
      </div>

      {/* ── Main grid ── */}
      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        {/* Recent passports */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Recent Context Passports"
            description="Your portable memory, most recent first"
            action={
              <Link href="/passports" className="section-link">
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          <CardBody className="space-y-3">
            {recentPassports.map((p) => (
              <PassportCard key={p.id} passport={p} />
            ))}
          </CardBody>
        </Card>

        {/* Model recommendation */}
        <div className="space-y-5">
          <Card className="gradient-border">
            <CardHeader
              title="Best model suggestion"
              action={<Cpu className="h-4 w-4 text-brand" />}
            />
            <CardBody>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-emerald-400 text-lg font-bold text-[#0e1416]">
                  {recommendedModel.provider.charAt(0)}
                </span>
                <div>
                  <p className="text-sm font-bold text-ink">{recommendedModel.name}</p>
                  <p className="text-[11px] text-faint">for “{bestReport.title}”</p>
                </div>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-muted">
                {bestReport.recommendedReason}
              </p>
              <div className="mt-4 flex items-center justify-between rounded-xl border border-border bg-surface-2/60 px-3.5 py-2.5">
                <span className="text-[11px] text-faint">Est. run</span>
                <span className="text-sm font-bold text-emerald-400">
                  {formatMoney(cheapestRun.cost)}
                </span>
                <span className="text-[11px] text-faint">
                  vs {formatMoney(bestReport.costs[bestReport.costs.length - 1].cost)} on {MODELS.find((m) => m.id === bestReport.costs[bestReport.costs.length - 1].modelId)?.provider}
                </span>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Prompt score" action={<Sparkles className="h-4 w-4 text-brand-2" />} />
            <CardBody className="flex items-center gap-4">
              <RadialScore value={bestPrompt.score} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{bestPrompt.title}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-faint">
                  Best improved prompt this week · v{bestPrompt.version}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {bestPrompt.tags.slice(0, 2).map((t) => (
                    <Badge key={t} tone="neutral">#{t}</Badge>
                  ))}
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* ── Recent projects + ledger strip ── */}
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Recent projects"
            action={
              <Link href="/workspace" className="section-link">
                Open workspace <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          <CardBody>
            <div className="space-y-2">
              {recentProjects.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                >
                  <Link
                    href={`/app/workspace/${p.id}`}
                    className="flex items-center gap-3 rounded-xl border border-border bg-surface-2/40 px-4 py-3 transition-colors hover:border-border-strong hover:bg-surface-2"
                  >
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: p.color }} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">{p.name}</p>
                      <p className="truncate text-[11px] text-faint">{p.description}</p>
                    </div>
                    <span className="shrink-0 text-[10px] font-medium text-faint">
                      {p.passportCount + p.promptCount} items
                    </span>
                  </Link>
                </motion.div>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="AI Work Ledger"
            description="Latest activity"
            action={
              <Link href="/workspace" className="section-link">
                Timeline <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          <CardBody>
            <div className="space-y-0">
              {TIMELINE.slice(0, 4).map((evt, i) => (
                <div key={evt.id} className="relative flex gap-3 pb-4 last:pb-0">
                  {i < 3 ? (
                    <span className="absolute left-[5px] top-4 h-full w-px bg-border" aria-hidden />
                  ) : null}
                  <span
                    className={cn(
                      "relative mt-1 h-[11px] w-[11px] shrink-0 rounded-full border-2 border-surface",
                      evt.type === "rescue" && "bg-amber-400",
                      evt.type === "prompt" && "bg-emerald-400",
                      evt.type === "learning" && "bg-violet-400",
                      evt.type === "decision" && "bg-rose-400",
                      evt.type === "cost" && "bg-sky-400",
                      evt.type === "model" && "bg-pink-400",
                      evt.type === "passport" && "bg-slate-400",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-ink">{evt.title}</p>
                    <p className="truncate text-[11px] text-faint">{evt.meta}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
