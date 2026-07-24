"use client";

import Link from "next/link";
import PageHeader from "@/components/workspace/PageHeader";
import CostOptimizerBanner from "@/components/workspace/CostOptimizerBanner";
import ExecutionModeToggle from "@/components/workspace/ExecutionModeToggle";
import RoutingRules from "@/components/workspace/RoutingRules";
import { ErrorState, LoadingState } from "@/components/workspace/DataState";
import { useAsyncData, errorMessage } from "@/lib/hooks/use-async-data";
import {
  getWorkspaceSettings,
  updateWorkspaceSettings,
  listRoutingRules,
  updateRoutingRule,
  getSavings,
  getUsageSummary,
} from "@/lib/api";
import { mapSettings, mapRoutingRule } from "@/lib/api/mappers";
import { microToUsd } from "@/lib/api/money";
import type { ExecutionMode } from "@/lib/types";
import { useEffect, useState } from "react";

async function loadOptimizer() {
  const [settingsRes, rulesRes, savingsRes, usageRes] = await Promise.all([
    getWorkspaceSettings(),
    listRoutingRules(),
    getSavings().catch(() => null),
    getUsageSummary({ groupBy: "model" }),
  ]);
  return {
    settings: mapSettings(settingsRes.settings),
    rules: rulesRes.rules.map(mapRoutingRule),
    savings: savingsRes
      ? {
          actual: microToUsd(savingsRes.actualCostMicro),
          optimized: microToUsd(savingsRes.optimizedCostMicro),
          saved: microToUsd(savingsRes.savedMicro),
        }
      : null,
    modelUsage: usageRes.buckets
      .filter((b) => b.model)
      .map((b) => ({
        model: b.model!,
        cost: microToUsd(b.costMicro),
        requests: b.requests,
      })),
  };
}

export default function OptimizerClient() {
  const state = useAsyncData(loadOptimizer, []);
  const [mode, setMode] = useState<ExecutionMode>("suggest");
  const [preferCheap, setPreferCheap] = useState(false);
  const [tokenSaver, setTokenSaver] = useState(false);
  const [rules, setRules] = useState<ReturnType<typeof mapRoutingRule>[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (state.status === "success") {
      setMode(state.data.settings.executionMode);
      setPreferCheap(state.data.settings.preferCheap);
      setTokenSaver(state.data.settings.tokenSaver);
      setRules(state.data.rules);
    }
  }, [state]);

  if (state.status === "loading") return <LoadingState label="Loading optimizer…" />;
  if (state.status === "error") {
    return <ErrorState message={errorMessage(state.error)} onRetry={state.reload} />;
  }

  const data = state.data;

  const onModeChange = async (next: ExecutionMode) => {
    setMode(next);
    try {
      await updateWorkspaceSettings({ executionMode: next });
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const onPreferCheapChange = async (next: boolean) => {
    setPreferCheap(next);
    try {
      await updateWorkspaceSettings({ preferCheap: next });
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const onTokenSaverChange = async (next: boolean) => {
    setTokenSaver(next);
    try {
      await updateWorkspaceSettings({ tokenSaver: next });
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const toggleRule = async (id: string) => {
    const rule = rules.find((r) => r.id === id);
    if (!rule) return;
    const next = !rule.enabled;
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, enabled: next } : r)));
    try {
      await updateRoutingRule(id, { enabled: next });
    } catch (err) {
      setError(errorMessage(err));
      state.reload();
    }
  };

  const suggestions = data.modelUsage
    .filter((m) => /gpt-4o$|claude-sonnet|gemini-2\.5-pro/i.test(m.model))
    .slice(0, 3)
    .map((m) => ({
      title: `Review spend on ${m.model}`,
      body: `${m.requests} runs · $${m.cost.toFixed(2)}. Prefer Flash/mini for drafts when quality allows.`,
    }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Intelligence"
        title="Cost optimizer"
        description="See savings, tune execution mode, and keep routing rules aligned with budget."
      />

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">
          {error}
        </p>
      )}

      <CostOptimizerBanner
        actualSpent={data.savings?.actual ?? 0}
        optimizedSpent={data.savings?.optimized ?? 0}
      />

      <div className="card p-6">
        <h3 className="text-base font-semibold text-ink">Execution mode</h3>
        <p className="mt-0.5 text-sm text-muted">
          Controls how LayerFlow picks models for runs.
        </p>
        <div className="mt-4">
          <ExecutionModeToggle value={mode} onChange={onModeChange} />
        </div>
        <div className="mt-5 space-y-3 border-t border-border pt-4">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={preferCheap}
              onChange={(e) => onPreferCheapChange(e.target.checked)}
              className="mt-1"
            />
            <span>
              <span className="block text-sm font-medium text-ink">Prefer cheap</span>
              <span className="text-xs text-muted">
                Bias runs toward budget-tier models when quality allows.
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={tokenSaver}
              onChange={(e) => onTokenSaverChange(e.target.checked)}
              className="mt-1"
            />
            <span>
              <span className="block text-sm font-medium text-ink">Token saver</span>
              <span className="text-xs text-muted">
                Compress long history and cap max tokens for shorter answers.
              </span>
            </span>
          </label>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="text-base font-semibold text-ink">Suggestions</h3>
        <div className="mt-4 space-y-3">
          {suggestions.length === 0 ? (
            <p className="text-sm text-muted">
              Run a few prompts to unlock spend-based suggestions.{" "}
              <Link href="/settings" className="text-brand hover:underline">
                Add provider keys
              </Link>{" "}
              if you have not yet.
            </p>
          ) : (
            suggestions.map((s) => (
              <div key={s.title} className="rounded-lg border border-border px-4 py-3">
                <p className="text-sm font-medium text-ink">{s.title}</p>
                <p className="mt-1 text-xs text-muted">{s.body}</p>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="card p-6">
        <h3 className="text-base font-semibold text-ink">Routing rules</h3>
        <div className="mt-4">
          <RoutingRules rules={rules} onToggle={toggleRule} />
        </div>
      </div>
    </div>
  );
}
