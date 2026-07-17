"use client";

import { useState } from "react";
import PageHeader from "@/components/workspace/PageHeader";
import ExecutionModeToggle from "@/components/workspace/ExecutionModeToggle";
import RoutingRules from "@/components/workspace/RoutingRules";
import { demoUser, apiKeys, workspaceSettings, routingRules } from "@/lib/mock-data";
import type { ExecutionMode } from "@/lib/types";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function SettingsClient() {
  const [preferCheap, setPreferCheap] = useState(workspaceSettings.preferCheap);
  const [executionMode, setExecutionMode] = useState<ExecutionMode>(
    workspaceSettings.executionMode
  );
  const [rules, setRules] = useState(routingRules);

  const toggleRule = (id: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace"
        title="Settings"
        description="Account, execution defaults, API keys, and routing preferences."
      />

      <div className="card p-6">
        <h3 className="text-base font-semibold text-ink">Profile</h3>
        <div className="mt-4 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-surface-2 text-lg font-medium text-brand">
            {demoUser.avatarInitials}
          </div>
          <div>
            <p className="font-medium text-ink">{demoUser.name}</p>
            <p className="text-sm text-muted">{demoUser.email}</p>
            <span className="mt-1 inline-block rounded-full border border-brand/30 bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">
              {demoUser.plan === "pro" ? "Pro plan" : "Free plan"}
            </span>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="text-base font-semibold text-ink">Execution defaults</h3>
        <p className="mt-0.5 text-sm text-muted">Default mode for new prompts and runs.</p>

        <div className="mt-4 flex items-center justify-between rounded-lg border border-border px-4 py-3">
          <div>
            <p className="text-sm font-medium text-ink">Prefer cheap mode</p>
            <p className="text-xs text-muted">Route simple tasks to budget tier models</p>
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

        <div className="mt-4">
          <label className="mb-2 block text-xs text-muted">Default execution mode</label>
          <ExecutionModeToggle value={executionMode} onChange={setExecutionMode} />
        </div>

        <div className="mt-4">
          <label className="mb-1.5 block text-xs text-muted">Default model</label>
          <select className="workspace-input" defaultValue={workspaceSettings.defaultModel}>
            <option value="gemini-2.5-flash">gemini-2.5-flash</option>
            <option value="gpt-4o">gpt-4o</option>
            <option value="claude-sonnet-4">claude-sonnet-4</option>
            <option value="deepseek-v3">deepseek-v3</option>
          </select>
        </div>

        <button type="button" className="btn-primary mt-4 rounded-lg px-4 py-2 text-sm font-medium">
          Save preferences
        </button>
      </div>

      <div className="card p-6">
        <h3 className="text-base font-semibold text-ink">Routing rules</h3>
        <p className="mt-0.5 text-sm text-muted">Simple model routing — mock.</p>
        <div className="mt-4">
          <RoutingRules rules={rules} onToggle={toggleRule} />
        </div>
      </div>

      <div className="card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-ink">API keys</h3>
          <button type="button" className="btn-primary rounded-lg px-3 py-1.5 text-xs font-medium">
            Create key
          </button>
        </div>
        <div className="space-y-2">
          {apiKeys.map((key) => (
            <div
              key={key.id}
              className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-ink">{key.name}</p>
                <p className="font-mono text-xs text-faint">{key.prefix}••••••••</p>
              </div>
              <div className="text-right text-xs text-faint">
                <p>Created {formatDate(key.createdAt)}</p>
                {key.lastUsed && <p>Last used {formatDate(key.lastUsed)}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-6">
        <h3 className="text-base font-semibold text-ink">Budget defaults</h3>
        <p className="mt-0.5 text-sm text-muted">Default hard limits for new projects.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs text-muted">Monthly limit ($)</label>
            <input type="number" defaultValue={50} className="workspace-input" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-muted">Daily limit ($)</label>
            <input type="number" defaultValue={5} className="workspace-input" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-muted">Alert at (%)</label>
            <input type="number" defaultValue={80} className="workspace-input" />
          </div>
        </div>
        <button type="button" className="btn-primary mt-4 rounded-lg px-4 py-2 text-sm font-medium">
          Save budget defaults
        </button>
      </div>
    </div>
  );
}
