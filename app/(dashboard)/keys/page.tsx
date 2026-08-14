"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  KeyRound,
  Plus,
  Trash2,
  ArrowUpRight,
  AlertTriangle,
  Loader2,
  Check,
  Copy,
  Globe,
  Lock,
} from "@/components/ui/icons";
import { PageHeader } from "@/components/shared/page-header";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { ErrorState } from "@/components/ui/error-state";
import { modelService } from "@/lib/services/models";
import { PROVIDER_LABELS, timeAgo } from "@/lib/data/providers";
import type { PlatformKey, ProviderKey } from "@/lib/types";
import { cn } from "@/lib/utils";

const PROVIDERS = Object.entries(PROVIDER_LABELS);

type Tab = "platform" | "byok";

export default function KeysPage() {
  const [tab, setTab] = useState<Tab>("platform");

  return (
    <div className="space-y-6">
      <PageHeader
        title="API Keys"
        description="Two kinds of keys: platform keys let the CLI talk to LayerFlow's hosted gateway (like opencode), and private own keys bring your own provider accounts."
      />

      {/* Tab switcher */}
      <div className="flex gap-1.5 rounded-xl border border-border bg-surface-2/40 p-1.5">
        <TabButton
          active={tab === "platform"}
          onClick={() => setTab("platform")}
          icon={<Globe className="h-3.5 w-3.5" />}
          label="Platform keys"
          hint="lf_live_…"
        />
        <TabButton
          active={tab === "byok"}
          onClick={() => setTab("byok")}
          icon={<Lock className="h-3.5 w-3.5" />}
          label="Private own keys"
          hint="BYOK"
        />
      </div>

      {tab === "platform" ? <PlatformKeysPanel /> : <PrivateOwnKeysPanel />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
        active ? "bg-surface-2 text-ink shadow-sm" : "text-muted hover:text-ink",
      )}
    >
      {icon}
      {label}
      <span className={cn("font-mono text-[10px]", active ? "text-brand" : "text-faint")}>{hint}</span>
    </button>
  );
}

// ── Tab 1: Platform keys (lf_live_...) — LayerFlow-hosted, like opencode ──

function PlatformKeysPanel() {
  const [keys, setKeys] = useState<PlatformKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [created, setCreated] = useState<{ key: PlatformKey; secret: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    modelService
      .listPlatformKeys()
      .then((ks) => {
        if (!cancelled) setKeys(ks);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load platform keys.");
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
      .listPlatformKeys()
      .then(setKeys)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load platform keys."))
      .finally(() => setLoading(false));
  }

  async function createKey() {
    if (!name.trim() || busy) return;
    setBusy(true);
    setFormError(null);
    try {
      const res = await modelService.createPlatformKey(name.trim());
      setKeys((ks) => [res.key, ...ks]);
      setCreated(res);
      setName("");
      setCopied(false);
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
      await modelService.revokePlatformKey(id);
      setKeys((ks) => ks.filter((k) => k.id !== id));
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not revoke the key.");
    } finally {
      setBusy(false);
    }
  }

  function copySecret() {
    if (!created) return;
    navigator.clipboard?.writeText(created.secret).catch(() => undefined);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <Panel>
      <PanelHeader
        title="Platform keys"
        description="LayerFlow-hosted keys (lf_live_…) for the CLI and gateway — like opencode's own key. Paste into `lf login` or use as a Bearer token. No provider account needed."
        action={<Badge tone="mint">{keys.length} active</Badge>}
      />
      <PanelBody className="space-y-3">
        {/* New key — secret shown once */}
        <div className="rounded-xl border border-dashed border-border p-4">
          <p className="flex items-center gap-2 text-xs font-semibold text-ink">
            <Plus className="h-3.5 w-3.5 text-brand" />
            Create a platform key
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
            <Field label="Name">
              <Input
                ref={nameRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void createKey()}
                placeholder="e.g. my laptop"
                autoComplete="off"
              />
            </Field>
            <div className="flex items-end">
              <Button size="sm" disabled={!name.trim() || busy} onClick={() => void createKey()}>
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                {busy ? "Creating…" : "Create key"}
              </Button>
            </div>
          </div>
          {formError ? (
            <p className="mt-2 flex items-center gap-1.5 text-[11px] text-rose-400">
              <AlertTriangle className="h-3 w-3" /> {formError}
            </p>
          ) : (
            <p className="mt-2 text-[11px] text-faint">
              The full key is shown only once. Anyone with it can use your LayerFlow plan — treat it like a
              password.
            </p>
          )}
        </div>

        {/* Freshly created secret */}
        {created ? (
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4">
            <p className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
              <Check className="h-3.5 w-3.5" />
              Key created — copy it now, it won&apos;t be shown again
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <code className="max-w-full overflow-x-auto rounded-lg border border-border bg-surface-2 px-3 py-2 font-mono text-xs text-ink">
                {created.secret}
              </code>
              <button
                type="button"
                onClick={copySecret}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-[11px] font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/20"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy key"}
              </button>
            </div>
            <p className="mt-2 text-[11px] text-faint">
              Then authenticate the CLI:{" "}
              <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-ink">
                curl -fsSL https://layerflow.dev/install | bash
              </code>
              {" · Windows: "}
              <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-ink">
                irm https://layerflow.dev/install.ps1 | iex
              </code>
              {" · "}
              <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-ink">lf login</code>
            </p>
          </div>
        ) : null}

        {/* Key list */}
        {loading ? (
          <div className="space-y-2.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-surface-2/60" />
            ))}
          </div>
        ) : error ? (
          <ErrorState title="Could not load your keys" description={error} onRetry={retry} />
        ) : keys.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-surface-2 text-muted">
              <KeyRound className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">No platform keys yet</p>
              <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-muted">
                Create one above, then run <code className="font-mono text-[11px]">lf login</code> in your
                terminal to connect the CLI. Your usage is billed through your LayerFlow plan.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {keys.map((k) => (
              <div
                key={k.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface-2/40 p-4"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                  <Globe className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-ink">{k.name}</p>
                    <Badge tone="green">active</Badge>
                  </div>
                  <p className="mt-0.5 font-mono text-[11px] text-faint">
                    {k.prefix}…
                    {k.createdAt ? <span className="text-faint/70"> · created {timeAgo(k.createdAt)}</span> : null}
                  </p>
                  {k.lastUsed ? (
                    <p className="mt-0.5 text-[11px] text-faint">last used {timeAgo(k.lastUsed)}</p>
                  ) : (
                    <p className="mt-0.5 text-[11px] text-faint">never used yet</p>
                  )}
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
            ))}
          </div>
        )}

        <p className="pt-1 text-[11px] leading-relaxed text-faint">
          Platform keys are hashed with HMAC-SHA256 at rest — LayerFlow never stores the raw key. Revoking a key
          immediately blocks new gateway requests made with it.
        </p>
      </PanelBody>
    </Panel>
  );
}

// ── Tab 2: Private own keys (BYOK) — bring your own provider accounts ──

function PrivateOwnKeysPanel() {
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
    <Panel>
      <PanelHeader
        title="Private own keys"
        description="Bring your own provider accounts (OpenAI, Anthropic, Gemini…) — encrypted at rest in your workspace vault, used directly by the rescue pipeline, Cost Check and Continue Packs."
        action={<Badge tone="mint">{keys.length} active</Badge>}
      />
      <PanelBody className="space-y-2.5">
        {loading ? (
          <div className="space-y-2.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-surface-2/60" />
            ))}
          </div>
        ) : error ? (
          <ErrorState title="Could not load your keys" description={error} onRetry={retry} />
        ) : (
          <>
            {keys.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-surface-2 text-muted">
                  <KeyRound className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink">No private keys yet</p>
                  <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-muted">
                    Add a key for any provider to unlock Chat, Rescue and Improve. DeepSeek is the cheapest for
                    prompt improvement — add it first to keep Improve runs at a fraction of a cent.
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
              <p className="text-[11px] leading-relaxed text-faint">
                Secrets are encrypted at rest with your workspace KEK and validated against the registry on every
                call. The API never returns the full secret — only the last 4 characters, as the hint displayed
                above.
              </p>
            )}
          </>
        )}
      </PanelBody>
    </Panel>
  );
}
