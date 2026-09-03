"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Wallet, PiggyBank, Gauge, BarChart3, AlertTriangle, Loader2 } from "@/components/ui/icons";
import { PageHeader } from "@/components/shared/page-header";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Field, Input } from "@/components/ui/input";
import { BarChart, DonutChart, ChartLegend, Sparkline } from "@/components/ui/charts";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { workspaceService } from "@/lib/services/workspace";
import { PROVIDER_LABELS, formatMoney, formatTokens } from "@/lib/data/providers";
import { microToUsd, usdToMicro } from "@/lib/api/money";
import type { CurrentBudgetResponse, UsageAlert } from "@layerflow/contracts";
import type { CostAnalytics, SavingsSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

function CostStat({
  label,
  value,
  deltaLabel,
  icon,
  accent,
  spark,
}: {
  label: string;
  value: string;
  deltaLabel: string;
  icon: React.ElementType;
  accent: string;
  spark?: number[];
}) {
  const Icon = icon;
  return (
    <Panel className="p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-faint">{label}</p>
        <span style={{ color: accent }}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-ink">{value}</p>
      <div className="mt-2 flex items-end justify-between gap-2">
        <span className="inline-flex items-center gap-1 font-mono text-[11px] text-faint">{deltaLabel}</span>
        {spark && spark.length > 1 ? <Sparkline data={spark} width={72} height={26} color={accent} /> : null}
      </div>
    </Panel>
  );
}

const PROVIDER_BY_PREFIX: [string, string][] = [
  ["claude-", "anthropic"],
  ["gpt-", "openai"],
  ["o1-", "openai"],
  ["o3-", "openai"],
  ["gemini-", "google"],
  ["deepseek-", "deepseek"],
  ["grok-", "xai"],
  ["kimi-", "kimi"],
  ["llama-", "groq"],
];

/** Group a model id under its provider slug (backend has no provider dimension). */
function providerForModel(model: string): string {
  const m = model.toLowerCase().trim();
  if (PROVIDER_LABELS[m]) return PROVIDER_LABELS[m];
  for (const [prefix, slug] of PROVIDER_BY_PREFIX) {
    if (m.startsWith(prefix) || m.endsWith(`/${prefix}`) || m.endsWith(`:${prefix}`)) {
      return PROVIDER_LABELS[slug] ?? slug;
    }
  }
  const bare = m.split(/[/:\s]/)[0];
  return PROVIDER_LABELS[bare] ?? bare.charAt(0).toUpperCase() + bare.slice(1);
}

function AlertRow({ alert }: { alert: UsageAlert }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-border bg-surface-2/40 p-3">
      <AlertTriangle
        className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", alert.level === "blocked" ? "text-rose-400" : "text-amber-400")}
      />
      <div className="min-w-0">
        <p className="text-xs leading-relaxed text-ink/90">{alert.message}</p>
        <p className="mt-0.5 font-mono text-[10px] text-faint">
          {alert.scope} · {alert.percentUsed.toFixed(0)}% used
        </p>
      </div>
    </div>
  );
}

interface CostDashboard {
  analytics: CostAnalytics;
  savings: SavingsSummary | null;
  budget: CurrentBudgetResponse | null;
  alerts: UsageAlert[];
}

async function fetchCosts(): Promise<CostDashboard> {
  const [analytics, savings, budget, alerts] = await Promise.all([
    workspaceService.getCostAnalytics(),
    workspaceService.getSavingsSummary(),
    workspaceService.getCurrentBudget(),
    workspaceService.listUsageAlerts().catch(() => [] as UsageAlert[]),
  ]);
  return { analytics, savings, budget, alerts };
}

export default function CostClient() {
  const [data, setData] = useState<CostDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [limitDollars, setLimitDollars] = useState("");
  const [savingLimit, setSavingLimit] = useState(false);
  const [limitMsg, setLimitMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchCosts()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load cost data.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function retry() {
    setLoading(true);
    setError(null);
    fetchCosts()
      .then(setData)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load cost data."))
      .finally(() => setLoading(false));
  }

  async function saveLimit() {
    const usd = parseFloat(limitDollars);
    if (!Number.isFinite(usd) || usd <= 0) {
      setLimitMsg({ kind: "err", text: "Enter a positive dollar amount." });
      return;
    }
    setSavingLimit(true);
    setLimitMsg(null);
    try {
      const res = await workspaceService.updateBudget({ monthlyLimitMicro: usdToMicro(usd) });
      setData((d) => (d ? { ...d, budget: res } : d));
      setLimitDollars("");
      setLimitMsg({ kind: "ok", text: "Budget limit updated." });
    } catch (err) {
      setLimitMsg({ kind: "err", text: err instanceof Error ? err.message : "Could not update the budget." });
    } finally {
      setSavingLimit(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-8 w-56 animate-pulse rounded-xl bg-surface-2/60" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-surface-2/60" />
          ))}
        </div>
        <div className="h-60 animate-pulse rounded-2xl bg-surface-2/60" />
        <div className="h-60 animate-pulse rounded-2xl bg-surface-2/60" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Cost Analytics"
          description="Every dollar you spend with AI — and every dollar LayerFlow saves you."
        />
        <ErrorState
          title="Could not load cost data"
          description={error ?? "The usage API did not respond. Try again."}
          onRetry={retry}
        />
      </div>
    );
  }

  const { analytics, savings, budget, alerts } = data;
  const totalRuns = analytics.spendByModel.reduce((s, m) => s + m.runs, 0);
  const spendByProvider = new Map<string, number>();
  for (const m of analytics.spendByModel) {
    const provider = providerForModel(m.modelId);
    spendByProvider.set(provider, (spendByProvider.get(provider) ?? 0) + m.spend);
  }
  const providerData = [...spendByProvider.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
  const totalSpend = analytics.monthlySpend;
  const budgetPct = budget ? budget.percentUsed : 0;
  const budgetLimit = budget ? microToUsd(budget.budget.monthlyLimitMicro) : 0;
  const spentInBudget = budget ? microToUsd(budget.budget.spentMicro) : 0;

  if (totalRuns === 0 && totalSpend === 0) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Cost Analytics"
          description="Every dollar you spend with AI — and every dollar LayerFlow saves you."
        />
        <EmptyState
          icon={<Wallet className="h-5 w-5" />}
          title="No spend yet"
          description="Start chatting with any AI model and your cost breakdown will appear here — per model, per provider, with savings tracking."
          action={
            <Button onClick={() => window.location.href='/chat'}>Start chatting</Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Cost Analytics"
        description="Every dollar you spend with AI — and every dollar LayerFlow saves you."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CostStat
          label="Monthly spend"
          value={formatMoney(totalSpend)}
          deltaLabel="this period"
          icon={Wallet}
          accent="#f59e0b"
          spark={analytics.dailySpend}
        />
        <CostStat
          label="Monthly savings"
          value={formatMoney(analytics.monthlySavings)}
          deltaLabel="vs unbilled rates"
          icon={PiggyBank}
          accent="#44edbc"
        />
        <CostStat
          label="Avg run cost"
          value={formatMoney(analytics.averageRunCost)}
          deltaLabel="across all runs"
          icon={Gauge}
          accent="#8b7cf8"
        />
        <CostStat
          label="Total runs"
          value={totalRuns.toLocaleString()}
          deltaLabel="this period"
          icon={BarChart3}
          accent="#38bdf8"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <PanelHeader
            title="Spend by model"
            description="Live usage rollups, grouped by model"
          />
          <PanelBody>
            {analytics.byModel.length ? (
              <>
                <BarChart data={analytics.byModel} height={180} color="#f59e0b" />
                <div className="mt-3 flex items-center justify-between">
                  <ChartLegend items={[{ label: "Spend ($)", color: "#f59e0b" }]} />
                  <span className="text-[11px] text-faint">
                    savings:{" "}
                    <span className="font-semibold text-brand-2">{formatMoney(analytics.monthlySavings)}</span>{" "}
                    this period
                  </span>
                </div>
              </>
            ) : (
              <EmptyState
                icon={<BarChart3 className="h-5 w-5" />}
                title="No usage yet"
                description="Once your first run lands, model spend shows up here."
              />
            )}
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader title="Budget" description="Monthly cap" />
          <PanelBody>
            {budget ? (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-2xl font-bold text-ink">
                    {formatMoney(spentInBudget)}
                    <span className="text-sm font-medium text-faint"> / {formatMoney(budgetLimit)}</span>
                  </p>
                  <Badge tone={budgetPct > 85 ? "red" : budgetPct > 50 ? "amber" : "green"}>
                    {budgetPct.toFixed(0)}%
                  </Badge>
                </div>
                <Progress
                  value={Math.min(100, budgetPct)}
                  className="mt-3 h-2.5"
                  barClassName="bg-gradient-to-r from-amber-500 to-brand-2"
                />
                <p className="mt-3 text-[11px] leading-relaxed text-faint">
                  {budget.blocked
                    ? "Hard block is on — requests are rejected once the cap is hit."
                    : budgetPct < 50
                      ? "Well under budget. Model routing is doing its job."
                      : budgetPct < 85
                        ? "Healthy headroom. Watch the flagship runs."
                        : "Approaching the cap — consider routing more work to cheaper models."}
                </p>
                <div className="mt-4 space-y-3 rounded-xl border border-border bg-surface-2/40 p-3">
                  <Field label="Monthly limit ($)" hint="Applies to the current period">
                    <Input
                      type="number"
                      min={1}
                      step="any"
                      value={limitDollars}
                      onChange={(e) => setLimitDollars(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && void saveLimit()}
                      placeholder={budgetLimit.toFixed(2)}
                    />
                  </Field>
                  <Button size="sm" disabled={savingLimit || !limitDollars.trim()} onClick={() => void saveLimit()}>
                    {savingLimit ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    {savingLimit ? "Saving…" : "Update limit"}
                  </Button>
                  {limitMsg ? (
                    <p className={cn("text-[11px]", limitMsg.kind === "ok" ? "text-brand-2" : "text-rose-400")}>
                      {limitMsg.text}
                    </p>
                  ) : null}
                </div>
              </>
            ) : (
              <EmptyState
                icon={<Gauge className="h-5 w-5" />}
                title="No budget set"
                description="Set a monthly cap and LayerFlow warns you as you approach it."
              />
            )}
          </PanelBody>
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel>
          <PanelHeader title="Spend by provider" />
          <PanelBody className="flex flex-col items-center">
            {providerData.length ? (
              <DonutChart
                data={providerData}
                centerValue={formatMoney(totalSpend)}
                centerLabel="total"
              />
            ) : (
              <EmptyState
                icon={<Wallet className="h-5 w-5" />}
                title="No spend"
                description="Provider breakdown appears once there are usage rollups."
              />
            )}
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader title="Alerts" description="Budget warnings from usage rollups" />
          <PanelBody>
            {alerts.length ? (
              <div className="space-y-2.5">
                {alerts.map((a, i) => (
                  <AlertRow key={i} alert={a} />
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-faint">
                No alerts — you&apos;re clear of every budget threshold.
              </p>
            )}
          </PanelBody>
        </Panel>

        <Panel className="lg:col-span-2">
          <PanelHeader title="Spend by model" description="Sorted by cost — live usage rollups" />
          <PanelBody>
            {analytics.spendByModel.length ? (
              <div className="space-y-2.5">
                {analytics.spendByModel.map((m) => {
                  const pct = totalSpend > 0 ? (m.spend / totalSpend) * 100 : 0;
                  return (
                    <div key={m.modelId} className="rounded-xl border border-border bg-surface-2/40 p-3.5">
                      <div className="flex items-center justify-between">
                        <p className="text-[13px] font-semibold text-ink">
                          {providerForModel(m.modelId)} · {m.model}
                        </p>
                        <p className="text-sm font-bold text-ink">{formatMoney(m.spend)}</p>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[10px] text-faint">
                        <span>
                          {m.runs} runs · {formatTokens(m.tokensIn)} in / {formatTokens(m.tokensOut)} out
                        </span>
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
            ) : (
              <EmptyState
                icon={<BarChart3 className="h-5 w-5" />}
                title="Nothing to break down yet"
                description="Model-level spend appears once usage is recorded."
              />
            )}
          </PanelBody>
        </Panel>
      </div>

      <Panel>
        <PanelHeader
          title="Savings this period"
          description={
            savings
              ? `${savings.period} · actual vs the cost those runs would have billed`
              : "What model routing avoided"
          }
        />
        <PanelBody>
          {savings ? (
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-border bg-surface-2/40 p-4 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-faint">Actual cost</p>
                <p className="mt-1 font-mono text-lg font-bold text-ink">{formatMoney(savings.actualCost)}</p>
              </div>
              <div className="rounded-xl border border-border bg-surface-2/40 p-4 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-faint">Optimized cost</p>
                <p className="mt-1 font-mono text-lg font-bold text-ink">{formatMoney(savings.optimizedCost)}</p>
              </div>
              <div className="rounded-xl border border-brand-2/30 bg-brand-2/5 p-4 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-faint">Saved</p>
                <p className="mt-1 font-mono text-lg font-bold text-brand-2">{formatMoney(savings.saved)}</p>
              </div>
              <div className="rounded-xl border border-border bg-surface-2/40 p-4 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-faint">Tokens saved</p>
                <p className="mt-1 font-mono text-lg font-bold text-ink">{formatTokens(savings.tokensSaved)}</p>
              </div>
              <p className="col-span-full text-center text-[11px] text-faint">
                source: {savings.source} · exact provider invoices always win
              </p>
            </div>
          ) : (
            <EmptyState
              icon={<PiggyBank className="h-5 w-5" />}
              title="No savings data yet"
              description="Savings estimates appear after the routing pipeline has something to compare."
            />
          )}
        </PanelBody>
      </Panel>

      {budget ? (
        <p className="pb-2 text-center text-[11px] text-faint">
          Usage rolls up live from the ledger · budget alerts at {budget.budget.alertAtPct}% ·{" "}
          <Link href="/billing" className="text-brand hover:underline">
            manage billing
          </Link>
        </p>
      ) : null}
    </div>
  );
}