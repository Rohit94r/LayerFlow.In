"use client";

import { useState } from "react";
import {
  Cpu,
  KeyRound,
  Check,
  AlertTriangle,
  Plus,
  Zap,
  Award,
  DollarSign,
} from "@/components/ui/icons";
import { PageHeader } from "@/components/shared/page-header";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { MODELS, PROVIDER_KEYS, formatMoney } from "@/lib/data/providers";
import type { ModelClass } from "@/lib/types";
import { cn } from "@/lib/utils";

const CLASS_META: Record<ModelClass, { label: string; cls: string }> = {
  flagship: { label: "Flagship", cls: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
  balanced: { label: "Balanced", cls: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  cheap: { label: "Cheap & fast", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
};

export default function ModelsClient() {
  const [keys, setKeys] = useState(PROVIDER_KEYS);

  function toggleKey(provider: string) {
    setKeys((ks) =>
      ks.map((k) =>
        k.provider === provider
          ? { ...k, status: k.status === "connected" ? "not_added" : "connected" as const }
          : k,
      ),
    );
  }

  return (
    <div>
      <PageHeader
        title="Models"
        description="Every model LayerFlow can route your work to — with costs, and your BYOK keys."
      />

      {/* ── Best model suggestion ── */}
      <Panel className="gradient-border mb-6">
        <PanelHeader
          title="Best Model Suggestion"
          description="For your most common task type: summarization + continuation"
          action={<Cpu className="h-4 w-4 text-brand" />}
        />
        <PanelBody>
          <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
            <div className="flex flex-wrap items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-emerald-400 text-lg font-bold text-[#0e1416]">
                G
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-base font-bold text-ink">Gemini 2.5 Flash</p>
                  <Badge tone="green">
                    <Award className="h-3 w-3" /> recommended
                  </Badge>
                </div>
                <p className="mt-0.5 text-xs text-muted">
                  Summaries, extraction, cheap continuations · 86 quality · fast
                </p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-sm font-bold text-emerald-400">{formatMoney(0.008)}</p>
                <p className="text-[10px] text-faint">per typical run</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-ink">-87%</p>
                <p className="text-[10px] text-faint">vs Claude Sonnet</p>
              </div>
              <Button size="sm">Use for routing</Button>
            </div>
          </div>
          <p className="mt-4 rounded-xl border border-border bg-surface-2/40 p-3.5 text-xs leading-relaxed text-muted">
            <strong className="font-semibold text-ink">Why:</strong> your last 20 rescues were
            summarization and continuation tasks — exactly what Gemini Flash handles cheaply and
            fast. Claude Sonnet stays the default for design docs and polished writing. Confidence
            <span className="font-semibold text-ink"> 92%</span>.
          </p>
        </PanelBody>
      </Panel>

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
          description="Bring your own API keys — encrypted, health-checked, and used directly by Cost Check and Continue Packs."
          action={<KeyRound className="h-4 w-4 text-brand-2" />}
        />
        <PanelBody>
          <div className="grid gap-3 sm:grid-cols-2">
            {keys.map((k) => (
              <div
                key={k.provider}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-2/40 p-4"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{k.label}</p>
                  <p className="text-[11px] text-faint">
                    {k.status === "connected" ? `last used ${k.lastUsed}` : k.status === "needs_attention" ? "health check failing" : "not added"}
                  </p>
                </div>
                {k.status === "connected" ? (
                  <button
                    type="button"
                    onClick={() => toggleKey(k.provider)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/20"
                  >
                    <Check className="h-3 w-3" /> Connected
                  </button>
                ) : k.status === "needs_attention" ? (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold text-amber-400 transition-colors hover:bg-amber-500/20"
                  >
                    <AlertTriangle className="h-3 w-3" /> Needs attention
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => toggleKey(k.provider)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-[11px] font-semibold text-muted transition-colors hover:border-border-strong hover:text-ink"
                  >
                    <Plus className="h-3 w-3" /> Add key
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-xl border border-dashed border-border p-4">
            <p className="flex items-center gap-2 text-xs font-semibold text-ink">
              <DollarSign className="h-3.5 w-3.5 text-brand" />
              Add a provider key
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <Field label="Provider">
                <select className="workspace-input">
                  <option>OpenRouter</option>
                  <option>Groq</option>
                  <option>Local / OpenAI-compatible</option>
                </select>
              </Field>
              <Field label="API key">
                <Input type="password" placeholder="sk-…" />
              </Field>
              <div className="flex items-end">
                <Button size="sm">Save key</Button>
              </div>
            </div>
            <p className="mt-3 text-[11px] text-faint">
              Keys are encrypted at rest with your workspace&apos;s KEK and never leave your workspace
              vault. Simulated — no real keys are stored in this build.
            </p>
          </div>
        </PanelBody>
      </Panel>
    </div>
  );
}
