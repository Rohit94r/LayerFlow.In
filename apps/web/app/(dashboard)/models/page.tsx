"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Cpu,
  KeyRound,
  Check,
  AlertTriangle,
  Plus,
  Zap,
  Award,
  DollarSign,
  Trash2,
} from "@/components/ui/icons";
import { PageHeader } from "@/components/shared/page-header";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { MODELS, formatMoney } from "@/lib/data/providers";
import { modelService } from "@/lib/services/models";
import { apiFetch, getServerCookieHeader } from "@/lib/api/client";
import { recommendResponseSchema } from "@layerflow/contracts";
import type { ModelClass, ProviderKey } from "@/lib/types";
import { cn } from "@/lib/utils";

const RECOMMEND_TASK = "Summarize and continue a long multi-tool AI chat conversation";
const MODEL_LABELS: Record<string, string> = {
  "gpt-4o": "GPT-4o",
  "gpt-4o-mini": "GPT-4o mini",
  "claude-sonnet-4": "Claude Sonnet 4",
  "claude-3-5-haiku": "Claude Haiku 3.5",
  "deepseek-chat": "DeepSeek Chat",
  "gemini-flash-latest": "Gemini Flash",
  "openai/gpt-oss-120b": "GPT-OSS 120B (Groq)",
  "openai/gpt-oss-20b": "GPT-OSS 20B (Groq)",
  "grok-3-mini": "Grok 3 mini",
  "kimi-k2": "Kimi K2",
};

const PROVIDER_LABELS: { slug: string; label: string }[] = [
  { slug: "openai", label: "OpenAI" },
  { slug: "anthropic", label: "Anthropic" },
  { slug: "google", label: "Google (Gemini)" },
  { slug: "deepseek", label: "DeepSeek" },
  { slug: "groq", label: "Groq" },
  { slug: "xai", label: "xAI (Grok)" },
  { slug: "kimi", label: "Kimi (Moonshot)" },
  { slug: "openrouter", label: "OpenRouter" },
];

const CLASS_META: Record<ModelClass, { label: string; cls: string }> = {
  flagship: { label: "Flagship", cls: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
  balanced: { label: "Balanced", cls: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  cheap: { label: "Cheap & fast", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
};

export default function ModelsClient() {
  const [keys, setKeys] = useState<ProviderKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [provider, setProvider] = useState("openai");
  const [secret, setSecret] = useState("");
  const [label, setLabel] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<{
    recommendedModel: string;
    reason: string;
  } | null>(null);
  const [recError, setRecError] = useState<string | null>(null);
  const [liveProviders, setLiveProviders] = useState<{ slug: string; label: string }[]>(PROVIDER_LABELS);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const headers = await getServerCookieHeader();
        // Fetch live provider list from the API
        const modelsRes = await apiFetch<{ models: Array<{ provider: string; displayName: string }> }>(
          "/api/models",
          { ...(headers.Cookie ? { headers } : {}) },
        );
        if (!cancelled && modelsRes?.models) {
          const seen = new Set<string>();
          const providers: { slug: string; label: string }[] = [];
          for (const m of modelsRes.models) {
            if (!seen.has(m.provider)) {
              seen.add(m.provider);
              const label = PROVIDER_LABELS.find((p) => p.slug === m.provider)?.label ?? m.provider;
              providers.push({ slug: m.provider, label });
            }
          }
          if (providers.length > 0) setLiveProviders(providers);
        }
      } catch {
        // fall back to static list
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const headers = await getServerCookieHeader();
        const res = await apiFetch(
          "/api/intelligence/recommend",
          {
            method: "POST",
            body: { content: RECOMMEND_TASK, persist: false },
            ...(headers.Cookie ? { headers } : {}),
          },
          recommendResponseSchema,
        );
        if (!cancelled) setRecommendation(res.recommendation);
      } catch {
        if (!cancelled) setRecError("Recommendation unavailable right now.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = useCallback(async () => {
    try {
      const ks = await modelService.listProviderKeys();
      setKeys(ks);
    } catch {
      setKeys([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const ks = await modelService.listProviderKeys();
        if (!cancelled) setKeys(ks);
      } catch {
        if (!cancelled) setKeys([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const keyFor = (slug: string) => keys.find((k) => k.provider === slug);

  async function saveKey() {
    if (!secret.trim() || busy) return;
    setBusy("save");
    setSaveError(null);
    try {
      await modelService.createProviderKey({
        provider,
        secret: secret.trim(),
        label: label.trim() || undefined,
      });
      setSecret("");
      setLabel("");
      await refresh();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not save the key.");
    } finally {
      setBusy(null);
    }
  }

  async function revoke(id: string, providerSlug: string) {
    if (busy) return;
    setBusy(providerSlug);
    try {
      await modelService.revokeProviderKey(id);
      await refresh();
    } catch {
      setSaveError("Could not revoke the key.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Models"
        description="Every model LayerFlow can route your work to — with costs, and your BYOK keys."
      />

      {/* ── Best model suggestion ── */}
      {recommendation ? (
        <Panel className="gradient-border mb-6">
          <PanelHeader
            title="Best Model Suggestion"
            description="Recommended by your routing rules and workspace settings"
            action={<Cpu className="h-4 w-4 text-brand" />}
          />
          <PanelBody>
            <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
              <div className="flex flex-wrap items-center gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-emerald-400 text-lg font-bold text-[#0e1416]">
                  {MODEL_LABELS[recommendation.recommendedModel]?.[0] ?? "?"}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-base font-bold text-ink">
                      {MODEL_LABELS[recommendation.recommendedModel] ?? recommendation.recommendedModel}
                    </p>
                    <Badge tone="green">
                      <Award className="h-3 w-3" /> recommended
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-muted">
                    For your most common task type: summarization + continuation
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-sm font-bold text-ink">{recommendation.recommendedModel}</p>
                  <p className="text-[10px] text-faint">model id</p>
                </div>
              </div>
            </div>
            <p className="mt-4 rounded-xl border border-border bg-surface-2/40 p-3.5 text-xs leading-relaxed text-muted">
              <strong className="font-semibold text-ink">Why:</strong> {recommendation.reason}
            </p>
          </PanelBody>
        </Panel>
      ) : recError ? (
        <Panel className="mb-6">
          <PanelBody>
            <p className="flex items-center gap-2 text-xs text-muted">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400" /> {recError}
            </p>
          </PanelBody>
        </Panel>
      ) : null}

      {/* ── Model table ── */}
      <Panel className="mb-6">
        <PanelHeader title="Model registry" description="Price sheet used by Cost Check" />
        <PanelBody>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-[10px] font-bold uppercase tracking-widest text-faint">
                  <th className="pb-3 pr-4">Model</th>
                  <th className="pb-3 pr-4">Class</th>
                  <th className="pb-3 pr-4">Quality</th>
                  <th className="pb-3 pr-4">In / 1M</th>
                  <th className="pb-3 pr-4">Out / 1M</th>
                  <th className="pb-3 pr-4">Speed</th>
                  <th className="pb-3">Best for</th>
                </tr>
              </thead>
              <tbody>
                {MODELS.map((m) => {
                  const meta = CLASS_META[m.class];
                  return (
                    <tr key={m.id} className="border-b border-border last:border-0">
                      <td className="py-3 pr-4">
                        <p className="font-semibold text-ink">{m.provider}</p>
                        <p className="text-[11px] text-faint">{m.name}</p>
                      </td>
                      <td className="py-3 pr-4">
                        <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium", meta.cls)}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-muted">{m.quality}</td>
                      <td className="py-3 pr-4 font-mono text-[12px] text-muted">${m.costIn.toFixed(2)}</td>
                      <td className="py-3 pr-4 font-mono text-[12px] text-muted">${m.costOut.toFixed(2)}</td>
                      <td className="py-3 pr-4">
                        <span className="inline-flex items-center gap-1 text-[11px] text-muted">
                          <Zap className="h-3 w-3 text-brand" /> {m.speed}/10
                        </span>
                      </td>
                      <td className="py-3 text-[11px] text-faint">{m.bestFor}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </PanelBody>
      </Panel>

      {/* ── BYOK ── */}
      <Panel>
        <PanelHeader
          title="BYOK Vault"
          description="Bring your own API keys — encrypted with your workspace KEK, and used directly by the rescue pipeline, Cost Check and Continue Packs."
          action={<KeyRound className="h-4 w-4 text-brand-2" />}
        />
        <PanelBody>
          <div className="grid gap-3 sm:grid-cols-2">
            {liveProviders.map((p) => {
              const key = keyFor(p.slug);
              const connected = Boolean(key);
              return (
                <div
                  key={p.slug}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-2/40 p-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">{p.label}</p>
                    <p className="text-[11px] text-faint">
                      {connected
                        ? `connected${key?.lastUsed ? ` · last used ${key.lastUsed}` : ""}`
                        : "not added"}
                    </p>
                  </div>
                  {connected ? (
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => key && revoke(key.id, p.slug)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-400 transition-colors hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-400"
                    >
                      {busy === p.slug ? <Zap className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                      {busy === p.slug ? "…" : "Connected"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setProvider(p.slug)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-[11px] font-semibold text-muted transition-colors hover:border-border-strong hover:text-ink"
                    >
                      <Plus className="h-3 w-3" /> Add key
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-5 rounded-xl border border-dashed border-border p-4">
            <p className="flex items-center gap-2 text-xs font-semibold text-ink">
              <DollarSign className="h-3.5 w-3.5 text-brand" />
              Add a provider key
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
              <Field label="Provider">
                <select className="workspace-input" value={provider} onChange={(e) => setProvider(e.target.value)}>
                  {liveProviders.map((p) => (
                    <option key={p.slug} value={p.slug}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="API key">
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder="sk-…"
                />
              </Field>
              <Field label="Label (optional)">
                <Input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. work account"
                />
              </Field>
              <div className="flex items-end">
                <Button size="sm" disabled={!secret.trim() || busy !== null} onClick={saveKey}>
                  {busy === "save" ? <Zap className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  Save key
                </Button>
              </div>
            </div>
            {saveError ? (
              <p className="mt-2 flex items-center gap-1.5 text-[11px] text-rose-400">
                <AlertTriangle className="h-3 w-3" /> {saveError}
              </p>
            ) : (
              <p className="mt-3 text-[11px] text-faint">
                Keys are encrypted at rest with your workspace&apos;s KEK and never leave your
                workspace vault. The last 4 characters are stored as a hint only.
                {loading ? " Loading keys…" : ` ${keys.length} active key${keys.length === 1 ? "" : "s"} in this vault.`}
              </p>
            )}
          </div>
        </PanelBody>
      </Panel>
    </div>
  );
}
