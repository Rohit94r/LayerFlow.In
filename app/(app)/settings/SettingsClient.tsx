"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check, Loader2, Trash2 } from "lucide-react";
import PageHeader from "@/components/workspace/PageHeader";
import ExecutionModeToggle from "@/components/workspace/ExecutionModeToggle";
import RoutingRules from "@/components/workspace/RoutingRules";
import { ErrorState, LoadingState } from "@/components/workspace/DataState";
import { useAuth } from "@/lib/auth-provider";
import { useAsyncData, errorMessage } from "@/lib/hooks/use-async-data";
import type { ExecutionMode } from "@/lib/types";
import {
  getWorkspaceSettings,
  updateWorkspaceSettings,
  listRoutingRules,
  updateRoutingRule,
  listApiKeys,
  createApiKey,
  deleteApiKey,
  listProviderKeys,
  createProviderKey,
  deleteProviderKey,
  getCurrentBudget,
  updateBudget,
} from "@/lib/api";
import { mapSettings, mapRoutingRule, mapApiKey, mapBudget } from "@/lib/api/mappers";
import { usdToMicro } from "@/lib/api/money";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

async function loadSettings() {
  const [settingsRes, rulesRes, keysRes, providerRes, budgetRes] = await Promise.all([
    getWorkspaceSettings(),
    listRoutingRules(),
    listApiKeys(),
    listProviderKeys(),
    getCurrentBudget(),
  ]);
  return {
    settings: mapSettings(settingsRes.settings),
    rules: rulesRes.rules.map(mapRoutingRule),
    keys: keysRes.keys.map(mapApiKey),
    providerKeys: providerRes.keys,
    budget: mapBudget(budgetRes),
  };
}

export default function SettingsClient() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const state = useAsyncData(loadSettings, []);
  const [preferCheap, setPreferCheap] = useState(true);
  const [executionMode, setExecutionMode] = useState<ExecutionMode>("suggest");
  const [defaultModel, setDefaultModel] = useState("gemini-2.5-flash");
  const [rules, setRules] = useState<ReturnType<typeof mapRoutingRule>[]>([]);
  const [keys, setKeys] = useState<ReturnType<typeof mapApiKey>[]>([]);
  const [providerKeys, setProviderKeys] = useState<
    Awaited<ReturnType<typeof listProviderKeys>>["keys"]
  >([]);
  const [monthlyLimit, setMonthlyLimit] = useState("50");
  const [dailyLimit, setDailyLimit] = useState("5");
  const [alertAt, setAlertAt] = useState("80");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [provider, setProvider] = useState("openai");
  const [providerSecret, setProviderSecret] = useState("");
  const [providerLabel, setProviderLabel] = useState("");
  const [keyName, setKeyName] = useState("Default gateway key");

  useEffect(() => {
    if (state.status !== "success" || !state.data) return;
    const data = state.data;
    setPreferCheap(data.settings.preferCheap);
    setExecutionMode(data.settings.executionMode);
    setDefaultModel(data.settings.defaultModel);
    setRules(data.rules);
    setKeys(data.keys);
    setProviderKeys(data.providerKeys);
    setMonthlyLimit(String(data.budget.monthlyLimit));
    setDailyLimit(String(data.budget.dailyLimit));
    setAlertAt(String(data.budget.alertThreshold));
  }, [state.status, state.data]);

  if (state.status === "loading") return <LoadingState label="Loading settings…" />;
  if (state.status === "error") {
    return <ErrorState message={errorMessage(state.error)} onRetry={state.reload} />;
  }

  const savePreferences = async () => {
    setBusy("prefs");
    setError(null);
    setMessage(null);
    try {
      await updateWorkspaceSettings({ preferCheap, executionMode, defaultModel });
      setMessage("Preferences saved");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
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

  const handleCreateKey = async () => {
    setBusy("key");
    setError(null);
    setNewSecret(null);
    try {
      const res = await createApiKey({ name: keyName.trim() || "Gateway key" });
      setKeys((prev) => [mapApiKey(res.key), ...prev]);
      setNewSecret(res.secret);
      setMessage("API key created — copy the secret now; it won’t be shown again.");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const handleDeleteKey = async (id: string) => {
    setBusy(`del-${id}`);
    try {
      await deleteApiKey(id);
      setKeys((prev) => prev.filter((k) => k.id !== id));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const handleAddProviderKey = async () => {
    setBusy("provider");
    setError(null);
    try {
      const res = await createProviderKey({
        provider,
        secret: providerSecret,
        label: providerLabel || undefined,
      });
      setProviderKeys((prev) => [res.key, ...prev]);
      setProviderSecret("");
      setProviderLabel("");
      setMessage("Provider key saved (encrypted).");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const handleDeleteProviderKey = async (id: string) => {
    setBusy(`pdel-${id}`);
    try {
      await deleteProviderKey(id);
      setProviderKeys((prev) => prev.filter((k) => k.id !== id));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const saveBudgetDefaults = async () => {
    setBusy("budget");
    setError(null);
    try {
      await updateBudget({
        monthlyLimitMicro: usdToMicro(Number(monthlyLimit) || 0),
        dailyLimitMicro: usdToMicro(Number(dailyLimit) || 0),
        alertAtPct: Number(alertAt) || 80,
        hardBlock: true,
      });
      setMessage("Budget defaults saved");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace("/sign-in");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace"
        title="Settings"
        description="Account, execution defaults, API keys, and routing preferences."
      />

      {(message || error) && (
        <p
          className={`rounded-lg border px-3 py-2 text-sm ${
            error
              ? "border-red-500/30 bg-red-500/10 text-red-500"
              : "border-brand/30 bg-brand/10 text-brand"
          }`}
        >
          {error ?? message}
        </p>
      )}

      <div className="card p-6">
        <h3 className="text-base font-semibold text-ink">Profile</h3>
        <div className="mt-4 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-surface-2 text-lg font-medium text-brand">
            {user?.avatarInitials ?? "?"}
          </div>
          <div>
            <p className="font-medium text-ink">{user?.name ?? "Signed in"}</p>
            <p className="text-sm text-muted">{user?.email}</p>
            <span className="mt-1 inline-block rounded-full border border-brand/30 bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">
              Google account
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className="btn-secondary mt-4 rounded-lg px-4 py-2 text-sm"
        >
          Sign out
        </button>
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
          <select
            className="workspace-input"
            value={defaultModel}
            onChange={(e) => setDefaultModel(e.target.value)}
          >
            <option value="gemini-2.5-flash">gemini-2.5-flash</option>
            <option value="gpt-4o">gpt-4o</option>
            <option value="gpt-4o-mini">gpt-4o-mini</option>
            <option value="claude-sonnet-4">claude-sonnet-4</option>
            <option value="deepseek-v3">deepseek-v3</option>
          </select>
        </div>

        <button
          type="button"
          onClick={savePreferences}
          disabled={busy === "prefs"}
          className="btn-primary mt-4 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60"
        >
          {busy === "prefs" ? "Saving…" : "Save preferences"}
        </button>
      </div>

      <div className="card p-6">
        <h3 className="text-base font-semibold text-ink">Routing rules</h3>
        <p className="mt-0.5 text-sm text-muted">Rules evaluated by Auto Mode and recommend.</p>
        <div className="mt-4">
          <RoutingRules rules={rules} onToggle={toggleRule} />
        </div>
      </div>

      <div className="card p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-ink">LayerFlow API keys</h3>
            <p className="mt-0.5 text-sm text-muted">
              Gateway keys for <code className="font-mono text-ink">/v1/*</code>. Secret shown once.
            </p>
          </div>
          <div className="flex gap-2">
            <input
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              className="workspace-input max-w-[200px]"
              placeholder="Key name"
            />
            <button
              type="button"
              onClick={handleCreateKey}
              disabled={busy === "key"}
              className="btn-primary rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-60"
            >
              {busy === "key" ? "Creating…" : "Create key"}
            </button>
          </div>
        </div>

        {newSecret && (
          <div className="mb-4 rounded-lg border border-brand/30 bg-brand/10 p-3">
            <p className="text-xs font-medium text-brand">Copy this secret now</p>
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 break-all font-mono text-sm text-ink">{newSecret}</code>
              <button
                type="button"
                className="btn-secondary px-2 py-1 text-xs"
                onClick={async () => {
                  await navigator.clipboard.writeText(newSecret);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {keys.length === 0 ? (
            <p className="text-sm text-muted">No gateway keys yet.</p>
          ) : (
            keys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-ink">{key.name}</p>
                  <p className="font-mono text-xs text-faint">{key.prefix}••••••••</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right text-xs text-faint">
                    <p>Created {formatDate(key.createdAt)}</p>
                    {key.lastUsed && <p>Last used {formatDate(key.lastUsed)}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteKey(key.id)}
                    className="btn-secondary px-2 py-1 text-xs text-red-500"
                    aria-label={`Revoke ${key.name}`}
                  >
                    {busy === `del-${key.id}` ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="card p-6">
        <h3 className="text-base font-semibold text-ink">Provider keys (BYOK)</h3>
        <p className="mt-0.5 text-sm text-muted">
          Encrypted at rest. Used for workspace runs, compare, and gateway.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <select
            className="workspace-input"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
          >
            {["openai", "anthropic", "google", "deepseek", "groq", "xai", "openrouter"].map(
              (p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ),
            )}
          </select>
          <input
            type="password"
            className="workspace-input"
            placeholder="Provider API secret"
            value={providerSecret}
            onChange={(e) => setProviderSecret(e.target.value)}
            autoComplete="off"
          />
          <input
            className="workspace-input"
            placeholder="Label (optional)"
            value={providerLabel}
            onChange={(e) => setProviderLabel(e.target.value)}
          />
        </div>
        <button
          type="button"
          onClick={handleAddProviderKey}
          disabled={busy === "provider" || providerSecret.length < 8}
          className="btn-primary mt-3 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60"
        >
          {busy === "provider" ? "Saving…" : "Add provider key"}
        </button>
        <div className="mt-4 space-y-2">
          {providerKeys.length === 0 ? (
            <p className="text-sm text-muted">No provider keys yet — required to run models.</p>
          ) : (
            providerKeys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-ink">
                    {key.label || key.provider}
                  </p>
                  <p className="font-mono text-xs text-faint">
                    {key.provider} · ••••{key.keyHint}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteProviderKey(key.id)}
                  className="btn-secondary px-2 py-1 text-xs text-red-500"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="card p-6">
        <h3 className="text-base font-semibold text-ink">Budget defaults</h3>
        <p className="mt-0.5 text-sm text-muted">Workspace monthly and daily hard limits.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs text-muted">Monthly limit ($)</label>
            <input
              type="number"
              value={monthlyLimit}
              onChange={(e) => setMonthlyLimit(e.target.value)}
              className="workspace-input"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-muted">Daily limit ($)</label>
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
          onClick={saveBudgetDefaults}
          disabled={busy === "budget"}
          className="btn-primary mt-4 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60"
        >
          {busy === "budget" ? "Saving…" : "Save budget defaults"}
        </button>
      </div>
    </div>
  );
}
