"use client";

import { useState } from "react";
import Link from "next/link";
import BudgetMeter from "@/components/workspace/BudgetMeter";
import CostOptimizerBanner from "@/components/workspace/CostOptimizerBanner";
import PageHeader from "@/components/workspace/PageHeader";
import RoutingRules from "@/components/workspace/RoutingRules";
import {
  budget,
  blockedBudget,
  projectBudgets,
  keyBudgets,
  promptSpend,
  routingRules,
} from "@/lib/mock-data";

const spendByModel = [
  { model: "gpt-4o", spent: 14.28, pct: 37 },
  { model: "claude-sonnet-4", spent: 11.52, pct: 30 },
  { model: "gemini-2.5-pro", spent: 7.84, pct: 20 },
  { model: "deepseek-v3", spent: 4.78, pct: 13 },
];

export default function BudgetClient() {
  const [preferCheap, setPreferCheap] = useState(true);
  const [rules, setRules] = useState(routingRules);

  const toggleRule = (id: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Cost control"
        title="Cost / Budget"
        description="Hard limits that block API calls when exceeded — daily, monthly, per-project, per-key."
      />

      <CostOptimizerBanner actualSpent={42} optimizedSpent={11} />

      <div className="grid gap-4 lg:grid-cols-2">
        <BudgetMeter budget={budget} />
        <div className="card p-6">
          <h3 className="text-base font-semibold text-ink">Daily budget</h3>
          <p className="mt-0.5 text-sm text-muted">
            ${budget.dailySpent.toFixed(2)} of ${budget.dailyLimit.toFixed(2)} today
          </p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-ink/25"
              style={{ width: `${(budget.dailySpent / budget.dailyLimit) * 100}%` }}
            />
          </div>
          <div className="mt-4 flex items-center justify-between rounded-lg border border-border px-4 py-3">
            <div>
              <p className="text-sm font-medium text-ink">Prefer cheap mode</p>
              <p className="text-xs text-muted">Bias to Flash / mini / Haiku for simple tasks</p>
            </div>
            <button
              type="button"
              onClick={() => setPreferCheap(!preferCheap)}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                preferCheap ? "bg-brand" : "bg-surface-2"
              }`}
              aria-label="Toggle prefer cheap"
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                  preferCheap ? "left-[22px]" : "left-0.5"
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h3 className="text-base font-semibold text-ink">Per-project budgets</h3>
          <p className="mt-0.5 text-sm text-muted">Isolate spend by project.</p>
          <div className="mt-4 space-y-3">
            {projectBudgets.map((item) => (
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
                    style={{ width: `${item.percentUsed}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-base font-semibold text-ink">Per-key budgets</h3>
          <p className="mt-0.5 text-sm text-muted">Cap spend per API key.</p>
          <div className="mt-4 space-y-3">
            {keyBudgets.map((item) => (
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
                    style={{ width: `${item.percentUsed}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="text-base font-semibold text-ink">Spend by model</h3>
        <p className="mt-0.5 text-sm text-muted">Where your monthly budget goes.</p>
        <div className="mt-4 space-y-3">
          {spendByModel.map((item) => (
            <div key={item.model}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-mono text-xs text-muted">{item.model}</span>
                <span className="font-medium text-ink">${item.spent.toFixed(2)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full bg-ink/20" style={{ width: `${item.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-6">
        <h3 className="text-base font-semibold text-ink">Token & cost estimator</h3>
        <p className="mt-0.5 text-sm text-muted">Estimate before you run.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-xs text-muted">Prompt length (chars)</label>
            <input type="number" defaultValue={500} className="workspace-input" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-muted">Model</label>
            <select className="workspace-input">
              <option>gemini-2.5-flash</option>
              <option>gpt-4o</option>
              <option>claude-sonnet-4</option>
              <option>deepseek-v3</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-muted">Estimated cost</label>
            <p className="workspace-input flex items-center font-mono text-sm">~$0.0024</p>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="text-base font-semibold text-ink">Per-prompt spend</h3>
        <p className="mt-0.5 text-sm text-muted">Know which prompts burn the most.</p>
        <div className="mt-4 divide-y divide-border">
          {promptSpend.map((item) => (
            <Link
              key={item.promptId}
              href={`/prompts/${item.promptId}`}
              className="flex items-center justify-between py-3 transition-colors hover:text-brand"
            >
              <div>
                <p className="text-sm font-medium text-ink">{item.title}</p>
                <p className="text-xs text-faint">
                  {item.projectName} · {item.runCount} runs · {item.lastModel}
                </p>
              </div>
              <span className="font-mono text-sm text-ink">${item.totalCost.toFixed(3)}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="card p-6">
        <h3 className="text-base font-semibold text-ink">Routing rules</h3>
        <p className="mt-0.5 text-sm text-muted">Simple model routing — mock.</p>
        <div className="mt-4">
          <RoutingRules rules={rules} onToggle={toggleRule} />
        </div>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-medium text-muted">Preview: blocked state</h2>
        <BudgetMeter budget={blockedBudget} />
      </section>
    </div>
  );
}
