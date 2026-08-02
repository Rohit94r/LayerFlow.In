"use client";

import { useState } from "react";
import { Wallet, PiggyBank, Gauge, BarChart3 } from "@/components/ui/icons";
import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AreaChart, BarChart, DonutChart, ChartLegend } from "@/components/ui/charts";
import { COST_ANALYTICS, DASHBOARD_STATS } from "@/lib/data/workspace";
import { MODEL_BY_ID, formatMoney, formatTokens } from "@/lib/data/providers";
import { cn } from "@/lib/utils";

export default function CostClient() {
  const [period, setPeriod] = useState("This month");

  const totalRuns = COST_ANALYTICS.spendByModel.reduce((s, m) => s + m.runs, 0);
  const budgetPct = Math.min(100, (COST_ANALYTICS.monthlySpend / COST_ANALYTICS.budgetLimit) * 100);

  return (
    <div>
      <PageHeader
        title="Cost Analytics"
        description="Every dollar you spend with AI — and every dollar LayerFlow saves you."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Monthly spend"
          value={`$${COST_ANALYTICS.monthlySpend.toFixed(1)}`}
          delta={14}
          deltaLabel="vs June"
          icon={Wallet}
          accent="#f59e0b"
          spark={[41, 45, 38, 32, 35, 38.4]}
          goodWhenDown
        />
        <StatCard
          label="Monthly savings"
          value={`$${COST_ANALYTICS.monthlySavings.toFixed(1)}`}
          delta={39}
          deltaLabel="vs May"
          icon={PiggyBank}
          accent="#44edbc"
          spark={[38, 61, 103, 116, 132, 142.8]}
        />
        <StatCard
          label="Avg run cost"
          value={formatMoney(COST_ANALYTICS.averageRunCost)}
          delta={22}
          deltaLabel="cheaper this week"
          icon={Gauge}
          accent="#8b7cf8"
          spark={[0.12, 0.11, 0.1, 0.09, 0.08, 0.07]}
          goodWhenDown
        />
        <StatCard
          label="Total runs"
          value={totalRuns.toLocaleString()}
          delta={9}
          deltaLabel="this month"
          icon={BarChart3}
          accent="#38bdf8"
          spark={[480, 520, 560, 590, 640, 674]}
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Monthly spend"
            description="Estimated usage across all connected providers"
            action={
              <div className="flex gap-1.5">
                {["May", "Jun", "Jul", "Aug"].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPeriod(m)}
                    className={cn("filter-pill", period === m && "filter-pill-active")}
                  >
                    {m}
                  </button>
                ))}
              </div>
            }
          />
          <CardBody>
            <BarChart data={COST_ANALYTICS.byModel} height={180} />
            <div className="mt-3 flex items-center justify-between">
              <ChartLegend items={[{ label: "Spend ($)", color: "#f59e0b" }]} />
              <span className="text-[11px] text-faint">
                savings: <span className="font-semibold text-emerald-400">${COST_ANALYTICS.savingsByMonth[3].value.toFixed(1)}</span> cumulative
              </span>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Budget" description="Monthly cap" />
          <CardBody>
            <div className="flex items-center justify-between">
              <p className="text-2xl font-bold text-ink">
                ${COST_ANALYTICS.monthlySpend.toFixed(1)}
                <span className="text-sm font-medium text-faint"> / ${COST_ANALYTICS.budgetLimit.toFixed(0)}</span>
              </p>
              <Badge tone={budgetPct > 85 ? "red" : "green"}>{budgetPct.toFixed(0)}%</Badge>
            </div>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-700"
                style={{ width: `${budgetPct}%` }}
              />
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-faint">
              {budgetPct < 50 ? "Well under budget. Model routing is doing its job." : budgetPct < 85 ? "Healthy headroom. Watch the Opus runs." : "Approaching the cap — consider routing more work to Gemini Flash."}
            </p>
            <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-center">
              <p className="text-[11px] font-semibold text-emerald-400">
                Route summaries to Gemini Flash → save ~78% next month
              </p>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader title="Spend by provider" />
          <CardBody className="flex flex-col items-center">
            <DonutChart
              data={[
                { label: "Anthropic", value: 63 },
                { label: "OpenAI", value: 27 },
                { label: "Google", value: 6 },
                { label: "DeepSeek", value: 3 },
                { label: "Other", value: 1 },
              ]}
              centerValue="$38.4"
              centerLabel="total"
            />
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Spend by model" description="Sorted by cost, this month" />
          <CardBody>
            <div className="space-y-2.5">
              {COST_ANALYTICS.spendByModel.map((m) => {
                const meta = MODEL_BY_ID[m.modelId];
                const pct = (m.spend / COST_ANALYTICS.monthlySpend) * 100;
                return (
                  <div key={m.modelId} className="rounded-xl border border-border bg-surface-2/40 p-3.5">
                    <div className="flex items-center justify-between">
                      <p className="text-[13px] font-semibold text-ink">{meta?.provider} · {m.model}</p>
                      <p className="text-sm font-bold text-ink">${m.spend.toFixed(1)}</p>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[10px] text-faint">
                      <span>{m.runs} runs · {formatTokens(m.tokensIn)} in / {formatTokens(m.tokensOut)} out</span>
                      <span>{pct.toFixed(0)}% of spend</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          background: `linear-gradient(90deg, #f59e0b, #44edbc)`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="mt-5">
        <Card>
          <CardHeader title="Savings over time" description="What model routing avoided, month by month" />
          <CardBody>
            <AreaChart data={COST_ANALYTICS.savingsByMonth} height={170} color="#44edbc" />
          </CardBody>
        </Card>
      </div>

      <p className="mt-6 text-center text-[11px] text-faint">
        Estimates are based on your compressed context sizes and provider price sheets · {DASHBOARD_STATS.weeklySavings.length} days of history · exact provider invoices always win
      </p>
    </div>
  );
}
