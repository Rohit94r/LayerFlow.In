"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { KeyRound, Plus, Trash2, ArrowUpRight, AlertTriangle, Loader2 } from "@/components/ui/icons";
import { PageHeader } from "@/components/shared/page-header";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { ErrorState } from "@/components/ui/error-state";
import { modelService } from "@/lib/services/models";
import { PROVIDER_LABELS, timeAgo } from "@/lib/data/providers";
import type { ProviderKey } from "@/lib/types";
import { cn } from "@/lib/utils";

const PROVIDERS = Object.entries(PROVIDER_LABELS);

export default function KeysPage() {
  const [keys, setKeys] = useState<ProviderKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [provider, setProvider] = useState(PROVIDERS[0]?.[0] ?? "");
  const [secret, setSecret] = useState("");
  const [label, setLabel] = useState("");
  const secretRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    modelService
      .listProviderKeys()
      .then((ks) => {
        if (!cancelled) setKeys(ks);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load provider keys.");
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
    modelService
      .listProviderKeys()
      .then(setKeys)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load provider keys."))
      .finally(() => setLoading(false));
  }

  async function createKey() {
    if (!secret.trim() || busy) return;
    setBusy(true);
    setFormError(null);
    try {
      const created = await modelService.createProviderKey({
        provider,
        secret: secret.trim(),
        label: label.trim() || undefined,
      });
      setKeys((ks) => [created, ...ks]);
      setSecret("");
      setLabel("");
      setProvider(PROVIDERS[0]?.[0] ?? "");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not create the key.");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    if (busy) return;
    setBusy(true);
    setFormError(null);
    try {
      await modelService.revokeProviderKey(id);
      setKeys((ks) => ks.filter((k) => k.id !== id));
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not revoke the key.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="API Keys"
        description="BYOK keys for the rescue pipeline, Cost Check and Continue Packs. Keep them secret."
        action={
          <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => secretRef.current?.focus()}>
            Add a key
          </Button>
        }
      />

      {loading ? (
        <div className="space-y-2.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-surface-2/60" />
          ))}
        </div>
      ) : error ? (
        <ErrorState
          title="Could not load your keys"
          description={error}
          onRetry={retry}
        />
      ) : (
        <Panel>
          <PanelHeader
            title="Provider keys"
            description="Encrypted in your workspace vault — only the last 4 characters are stored as a hint"
            action={<Badge tone="mint">{keys.length} active</Badge>}
          />
          <PanelBody className="space-y-2.5">
            {keys.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-surface-2 text-muted">
                  <KeyRound className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink">No provider keys yet</p>
                  <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-muted">
                    Add a key for any provider to unlock Chat, Rescue and Improve. DeepSeek is the
                    cheapest for prompt improvement — add it first to keep Improve runs at a fraction
                    of a cent.
                  </p>
                </div>
                <Button asChild variant="outline" size="sm" icon={<ArrowUpRight className="h-3.5 w-3.5" />}>
                  <Link href="/models">Browse providers</Link>
                </Button>
              </div>
            ) : (
              keys.map((k) => (
                <div
                  key={k.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface-2/40 p-4"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                    <KeyRound className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-ink">{k.label}</p>
                      <Badge tone="green">connected</Badge>
                    </div>
                    <p className="mt-0.5 font-mono text-[11px] text-faint">
                      {PROVIDER_LABELS[k.provider] ?? k.provider} · …{k.keyHint}
                      {k.addedAt ? <span className="text-faint/70"> · added {timeAgo(k.addedAt)}</span> : null}
                    </p>
                    {k.lastUsed ? (
                      <p className="mt-0.5 text-[11px] text-faint">last used {timeAgo(k.lastUsed)}</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      aria-label="Revoke key"
                      disabled={busy}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-rose-400 disabled:opacity-50"
                      onClick={() => void revoke(k.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}

            <div className="mt-2 grid gap-3 rounded-xl border border-dashed border-border p-4 sm:grid-cols-[1fr_1fr_1fr_auto]">
              <Field label="Provider">
                <select
                  className="workspace-input"
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                >
                  {PROVIDERS.map(([slug, name]) => (
                    <option key={slug} value={slug}>
                      {name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Secret" hint="stored encrypted — shown as a 4-char hint only">
                <Input
                  ref={secretRef}
                  type="password"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void createKey()}
                  placeholder="sk-…"
                  autoComplete="new-password"
                />
              </Field>
              <Field label="Label (optional)">
                <Input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void createKey()}
                  placeholder="e.g. work account"
                />
              </Field>
              <div className="flex items-end">
                <Button size="sm" disabled={!secret.trim() || busy} onClick={() => void createKey()}>
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  {busy ? "Saving…" : "Save key"}
                </Button>
              </div>
            </div>

            {formError ? (
              <p className="flex items-center gap-1.5 text-[11px] text-rose-400">
                <AlertTriangle className="h-3 w-3" /> {formError}
              </p>
            ) : (
              <p className={cn("text-[11px] leading-relaxed text-faint")}>
                Secrets are encrypted at rest with your workspace KEK and validated against the
                registry on every call. The API never returns the full secret — only the last 4
                characters, as the hint displayed above.
              </p>
            )}
          </PanelBody>
        </Panel>
      )}
    </div>
  );
}