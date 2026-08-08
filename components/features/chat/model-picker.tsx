"use client";

import { useState } from "react";
import type { ChatKeyHealth } from "@layerflow/contracts";
import { Check, ChevronDown, Cpu, Sparkles, Zap } from "@/components/ui/icons";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import { PICKER_MODELS, STATUS_META, providerLabel, providerStatus } from "./chat-models";

const KIND_LABELS: Record<string, { label: string; cls: string }> = {
  cheap: { label: "Cheap & fast", cls: "border-border bg-surface-2/40 text-faint" },
  balanced: { label: "Balanced", cls: "border-border bg-surface-2/40 text-faint" },
  flagship: { label: "Flagship", cls: "border-border bg-surface-2/40 text-faint" },
};

export function ModelPicker({
  open,
  onClose,
  health,
  current,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  health: ChatKeyHealth[];
  current: string | null;
  onSelect: (model: string) => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Choose the model"
      description="Each message can use a different AI. Auto picks a working one and switches when a key runs out."
      className="max-w-lg"
    >
      <div className="max-h-[55vh] space-y-1 overflow-y-auto pr-1">
        {PICKER_MODELS.map((m) => {
          const status = m.auto ? null : providerStatus(health, m.provider);
          const meta = status ? STATUS_META[status] : null;
          const disabled = !m.auto && status === "missing";
          const active = (current ?? "auto") === m.id;
          return (
            <button
              key={m.id}
              type="button"
              disabled={disabled}
              onClick={() => {
                onSelect(m.id);
                onClose();
              }}
              onMouseEnter={() => setHovered(m.id)}
              onMouseLeave={() => setHovered(null)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors",
                active
                  ? "border-brand/40 bg-brand/[0.07]"
                  : "border-border bg-surface-2/30 hover:border-border-strong hover:bg-surface-2/70",
                disabled && "cursor-not-allowed opacity-45",
              )}
            >
              {m.auto ? (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-ink">
                  <Sparkles className="h-4 w-4" />
                </span>
              ) : (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-sm font-bold text-ink">
                  {providerLabel(m.provider).charAt(0)}
                </span>
              )}

              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold text-ink">{m.label}</span>
                  {!m.auto && m.kind && m.kind !== "balanced" ? (
                    <span
                      className={cn(
                        "shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                        KIND_LABELS[m.kind].cls,
                      )}
                    >
                      {KIND_LABELS[m.kind].label}
                    </span>
                  ) : null}
                </span>
                <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-faint">
                  {m.auto ? (
                    "Router picks — cheapest working key, auto-failover on"
                  ) : (
                    <>
                      {providerLabel(m.provider)}
                      <span className="flex items-center gap-1">
                        <span className={cn("h-1.5 w-1.5 rounded-full", meta?.dot)} />
                        {meta?.label}
                      </span>
                    </>
                  )}
                </span>
              </span>

              {active ? (
                <Check className="h-4 w-4 shrink-0 text-brand" />
              ) : hovered === m.id && !disabled ? (
                <ChevronDown className="h-4 w-4 shrink-0 -rotate-90 text-muted" />
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-xl border border-border bg-surface-2/40 p-3 text-[11px] leading-relaxed text-muted">
        <Cpu className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
        <p>
          <strong className="font-semibold text-ink">Need a key?</strong> Add OpenAI, Claude, Gemini,
          DeepSeek, Groq, Grok or Kimi keys under <em>Models → BYOK Vault</em>. LayerFlow also uses
          platform keys when available.
        </p>
      </div>
      <div className="mt-2 flex items-center gap-2 text-[10.5px] text-faint">
        <Zap className="h-3 w-3" /> Auto-switch is on for this chat — when a key dies, the next
        working model takes over automatically.
      </div>
    </Modal>
  );
}