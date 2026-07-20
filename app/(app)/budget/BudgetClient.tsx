"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import BudgetMeter from "@/components/workspace/BudgetMeter";
import CostOptimizerBanner from "@/components/workspace/CostOptimizerBanner";
import PageHeader from "@/components/workspace/PageHeader";
import RoutingRules from "@/components/workspace/RoutingRules";
import { ErrorState, LoadingState } from "@/components/workspace/DataState";
import { useAsyncData, errorMessage } from "@/lib/hooks/use-async-data";
import {
  getCurrentBudget,
  updateBudget,
  listBudgetScopes,
  listProjects,
  listApiKeys,
  listRoutingRules,
  updateRoutingRule,
  getUsageSummary,
  getSavings,
  getWorkspaceSettings,
  updateWorkspaceSettings,
} from "@/lib/api";
import {
  mapBudget,
  mapProject,
  mapApiKey,
  mapProjectBudgets,
  mapKeyBudgets,
  mapRoutingRule,
  mapSettings,
} from "@/lib/api/mappers";
import { microToUsd, usdToMicro } from "@/lib/api/money";

async function loadBudgetPage() {
  const [
    budgetRes,
    scopesRes,
    projectsRes,
    keysRes,
    rulesRes,
    usageRes,
    savingsRes,
    settingsRes,
  ] = await Promise.all([
    getCurrentBudget(),
    listBudgetScopes(),
    listProjects(),
    listApiKeys(),
    listRoutingRules(),
    getUsageSummary({ groupBy: "model" }),
    getSavings().catch(() => null),
    getWorkspaceSettings(),
  ]);

  const projects = projectsRes.projects.map((p) => mapProject(p));
  const keys = keysRes.keys.map(mapApiKey);
  const budget = mapBudget(budgetRes);
  return {
    budget,
    budgetRaw: budgetRes,
    projectBudgets: mapProjectBudgets(scopesRes.scopes, projects),
    keyBudgets: mapKeyBudgets(scopesRes.scopes, keys),
    rules: rulesRes.rules.map(mapRoutingRule),
    spendByModel: usageRes.buckets
      .filter((b) => b.model)
      .map((b) => ({
        model: b.model!,
        spent: microToUsd(b.costMicro),
        requests: b.requests,
      })),
    savings: savingsRes
      ? {
          actual: microToUsd(savingsRes.actualCostMicro),
          optimized: microToUsd(savingsRes.optimizedCostMicro),
        }
      : { actual: budget.spent, optimized: budget.spent * 0.3 },
    settings: mapSettings(settingsRes.settings),
  };
}

export default function BudgetClient() {
  const state = useAsyncData(loadBudgetPage, []);
  const [preferCheap, setPreferCheap] = useState<boolean | null>(null);
  const [rules, setRules] = useState<ReturnType<typeof mapRoutingRule>[] | null>(null);
  const [monthlyLimit, setMonthlyLimit] = useState<string>("");
  const [dailyLimit, setDailyLimit] = useState<string>("");
  const [alertAt, setAlertAt] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (state.status !== "success" || !state.data) return;
    const { budget } = state.data;
    setMonthlyLimit(String(budget.monthlyLimit));
    setDailyLimit(String(budget.dailyLimit));
    setAlertAt(String(budget.alertThreshold));
  }, [state.status, state.data]);

  if (state.status === "loading") return <LoadingState label="Loading budget…" />;
  if (state.status === "error") {
    return <ErrorState message={errorMessage(state.error)} onRetry={state.reload} />;
  }

  const data = state.data;
  const currentPrefer = preferCheap ?? data.settings.preferCheap;
  const currentRules = rules ?? data.rules;
  const totalModelSpend = data.spendByModel.reduce((s, m) => s + m.spent, 0) || 1;

  const toggleRule = async (id: string) => {
    const rule = currentRules.find((r) => r.id === id);
    if (!rule) return;
    const nextEnabled = !rule.enabled;
    setRules(currentRules.map((r) => (r.id === id ? { ...r, enabled: nextEnabled } : r)));
    try {
      await updateRoutingRule(id, { enabled: nextEnabled });
    } catch (err) {
      setError(errorMessage(err));
      state.reload();
    }
  };

  const savePreferCheap = async (value: boolean) => {
    setPreferCheap(value);
    try {
      await updateWorkspaceSettings({ preferCheap: value });
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const saveBudget = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await updateBudget({
        monthlyLimitMicro: usdToMicro(Number(monthlyLimit) || 0),
        dailyLimitMicro: dailyLimit === "" ? null : usdToMicro(Number(dailyLimit) || 0),
        alertAtPct: Number(alertAt) || 80,
        hardBlock: true,
      });
      setMessage("Budget updated");
      state.reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Cost control"
        title="Cost / Budget"
        description="Hard limits that block API calls when exceeded — daily, monthly, per-project, per-key."
      />

      <CostOptimizerBanner
        actualSpent={data.savings.actual}
        optimizedSpent={data.savings.optimized}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <BudgetMeter budget={data.budget} />
        <div className="card p-6">
          <h3 className="text-base font-semibold text-ink">Daily budget</h3>
          <p className="mt-0.5 text-sm text-muted">
            ${data.budget.dailySpent.toFixed(2)} of ${data.budget.dailyLimit.toFixed(2)} today
          </p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-ink/25"
              style={{
                width: `${
                  data.budget.dailyLimit > 0
                    ? Math.min(
                        (data.budget.dailySpent / data.budget.dailyLimit) * 100,
                        100,
                      )
                    : 0
                }%`,
              }}
            />
          </div>
          <div className="mt-4 flex items-center justify-between rounded-lg border border-border px-4 py-3">
            <div>
              <p className="text-sm font-medium text-ink">Prefer cheap mode</p>
              <p className="text-xs text-muted">Bias to Flash / mini / Haiku for simple tasks</p>
            </div>
            <button
              type="button"
              onClick={() => savePreferCheap(!currentPrefer)}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                currentPrefer ? "bg-brand" : "bg-surface-2"
              }`}
              aria-label="Toggle prefer cheap"
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                  currentPrefer ? "left-[22px]" : "left-0.5"
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="text-base font-semibold text-ink">Update limits</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-xs text-muted">Monthly ($)</label>
            <input
              type="number"
              value={monthlyLimit}
              onChange={(e) => setMonthlyLimit(e.target.value)}
              className="workspace-input"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-muted">Daily ($)</label>
            <input
              type="number"
              value={dailyLimit}
              onChange={(e) => setDailyLimit(e.target.value)}
              className="workspace-input"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-muted">Alert at (%)</label>
            <input
              type="number"
              value={alertAt}
              onChange={(e) => setAlertAt(e.target.value)}
              className="workspace-input"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={saveBudget}
          disabled={saving}
          className="btn-primary mt-4 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save budget"}
        </button>
        {message && <p className="mt-2 text-sm text-brand">{message}</p>}
        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h3 className="text-base font-semibold text-ink">Per-project budgets</h3>
          <p className="mt-0.5 text-sm text-muted">Isolate spend by project.</p>
          <div className="mt-4 space-y-3">
            {data.projectBudgets.length === 0 ? (
              <p className="text-sm text-muted">No project scopes configured yet.</p>
            ) : (
              data.projectBudgets.map((item) => (
                <div key={item.projectId}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-muted">{item.projectName}</span>
                    <span className="font-medium text-ink">
                      ${item.spent.toFixed(2)} / ${item.limit.toFixed(0)}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className={`h-full rounded-full ${item.percentUsed >= 80 ? "bg-brand" : "bg-ink/20"}`}
                      style={{ width: `${Math.min(item.percentUsed, 100)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-base font-semibold text-ink">Per-key budgets</h3>
          <p className="mt-0.5 text-sm text-muted">Cap gateway keys individually.</p>
          <div className="mt-4 space-y-3">
            {data.keyBudgets.length === 0 ? (
              <p className="text-sm text-muted">No key scopes configured yet.</p>
            ) : (
              data.keyBudgets.map((item) => (
                <div key={item.keyId}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-muted">{item.keyName}</span>
                    <span className="font-medium text-ink">
                      ${item.spent.toFixed(2)} / ${item.limit.toFixed(0)}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full bg-ink/20"
                      style={{ width: `${Math.min(item.percentUsed, 100)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="text-base font-semibold text-ink">Spend by model</h3>
        <div className="mt-4 space-y-3">
          {data.spendByModel.length === 0 ? (
            <p className="text-sm text-muted">No usage yet this period.</p>
          ) : (
            data.spendByModel.map((item) => (
              <div key={item.model}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-mono text-xs text-muted">{item.model}</span>
                  <span className="text-xs text-faint">
                    {item.requests} runs · ${item.spent.toFixed(2)}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full bg-ink/20"
                    style={{ width: `${(item.spent / totalModelSpend) * 100}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="card p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-ink">Routing rules</h3>
            <p className="mt-0.5 text-sm text-muted">Toggle rules that steer Auto Mode.</p>
          </div>
          <Link href="/settings" className="section-link text-sm">
            Manage in settings
          </Link>
        </div>
        <RoutingRules rules={currentRules} onToggle={toggleRule} />
      </div>
    </div>
  );
}
