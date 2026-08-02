"use client";

import { useState } from "react";
import { KeyRound, Copy, Check, Plus, Trash2, Eye, EyeOff } from "@/components/ui/icons";
import { PageHeader } from "@/components/shared/page-header";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { useCopy } from "@/lib/hooks/use-copy";
import { timeAgo } from "@/lib/data/providers";
import { cn } from "@/lib/utils";

type ApiKey = {
  id: string;
  name: string;
  prefix: string;
  full: string;
  createdAt: string;
  lastUsed: string;
  revoked: boolean;
};

const INITIAL_KEYS: ApiKey[] = [
  {
    id: "key-001",
    name: "CLI — local dev",
    prefix: "lf_9f2e…c41a",
    full: "lf_9f2ec4f0a11b22c33d44e55f66778899aabbccdd00e11223344556677889900aabbc41a",
    createdAt: "2026-07-18T10:00:00Z",
    lastUsed: "2026-08-02T08:12:00Z",
    revoked: false,
  },
  {
    id: "key-002",
    name: "CI pipeline",
    prefix: "lf_71b3…92d0",
    full: "lf_71b34a5f1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f92d0",
    createdAt: "2026-06-02T10:00:00Z",
    lastUsed: "2026-07-29T17:40:00Z",
    revoked: false,
  },
  {
    id: "key-003",
    name: "Staging bot",
    prefix: "lf_3c0a…77be",
    full: "lf_3c0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f77be",
    createdAt: "2026-05-12T10:00:00Z",
    lastUsed: "2026-06-30T09:00:00Z",
    revoked: true,
  },
];

export default function KeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>(INITIAL_KEYS);
  const [name, setName] = useState("");
  const [revealed, setRevealed] = useState<string | null>(null);
  const { copied, copy } = useCopy();

  function createKey() {
    const label = name.trim() || "New key";
    const full = `lf_${Array.from({ length: 40 }, () => Math.random().toString(16)[2]).join("")}`;
    const now = new Date().toISOString();
    setKeys((ks) => [
      { id: `key-${Date.now()}`, name: label, prefix: `${full.slice(0, 8)}…${full.slice(-4)}`, full, createdAt: now, lastUsed: now, revoked: false },
      ...ks,
    ]);
    setName("");
  }

  function revoke(id: string) {
    setKeys((ks) => ks.map((k) => (k.id === id ? { ...k, revoked: true } : k)));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="API Keys"
        description="Keys for the LayerFlow CLI, API and CI pipelines. Keep them secret."
        action={
          <Button size="sm" icon={<Plus className="h-4 w-4" />} disabled={!name.trim()} onClick={createKey}>
            Create key
          </Button>
        }
      />

      <Panel>
        <PanelHeader
          title="Developer keys"
          description="Scoped to your workspace — revoke at any time"
          action={<Badge tone="mint">{keys.filter((k) => !k.revoked).length} active</Badge>}
        />
        <PanelBody className="space-y-2.5">
          {keys.map((k) => (
            <div
              key={k.id}
              className={cn(
                "flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface-2/40 p-4",
                k.revoked && "opacity-50",
              )}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                <KeyRound className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-ink">{k.name}</p>
                  <Badge tone={k.revoked ? "red" : "green"}>{k.revoked ? "revoked" : "active"}</Badge>
                </div>
                <p className="mt-0.5 font-mono text-[11px] text-faint">
                  {revealed === k.id ? k.full : k.prefix}
                  <span className="text-faint/70"> · created {timeAgo(k.createdAt)}</span>
                </p>
                <p className="mt-0.5 text-[11px] text-faint">last used {timeAgo(k.lastUsed)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  aria-label={revealed === k.id ? "Hide key" : "Reveal key"}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-ink"
                  onClick={() => setRevealed((r) => (r === k.id ? null : k.id))}
                >
                  {revealed === k.id ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  aria-label="Copy key"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-ink"
                  onClick={() => copy(k.full)}
                >
                  {copied ? <Check className="h-4 w-4 text-brand-2" /> : <Copy className="h-4 w-4" />}
                </button>
                {!k.revoked ? (
                  <button
                    type="button"
                    aria-label="Revoke key"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-rose-400"
                    onClick={() => revoke(k.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </div>
          ))}

          <Field label="New key name" hint="e.g. “Vercel preview” — keys are shown once">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createKey()}
              placeholder="name this key…"
            />
          </Field>
          <p className="text-[11px] leading-relaxed text-faint">
            Keys are hashed at rest with your workspace KEK and validated against the registry on
            every CLI call. Simulated — these keys are random demo strings.
          </p>
        </PanelBody>
      </Panel>
    </div>
  );
}
