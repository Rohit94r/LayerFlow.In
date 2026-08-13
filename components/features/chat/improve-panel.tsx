"use client";

import { useEffect, useState } from "react";
import type { ImprovePromptResponse } from "@layerflow/contracts";
import { Check, Copy, Loader2, Sparkles, Wand2, X } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RadialScore } from "@/components/ui/charts";
import { useCopy } from "@/lib/hooks/use-copy";
import { formatMoney } from "@/lib/data/providers";
import { cn } from "@/lib/utils";

/**
 * Improve-in-Chat panel. Shows the improved prompt, the completeness score
 * (original vs improved), per-axis scores, the diff, and token savings —
 * with "Use in chat" / "Run" actions.
 */
export function ImprovePanel({
  open,
  original,
  result,
  busy,
  error,
  onClose,
  onUse,
  onRun,
  onRetry,
}: {
  open: boolean;
  original: string;
  result: ImprovePromptResponse | null;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onUse: (prompt: string) => void;
  onRun: (prompt: string) => void;
  onRetry: () => void;
}) {
  const [draft, setDraft] = useState("");
  const { copied, copy } = useCopy();

  const [prevResult, setPrevResult] = useState<ImprovePromptResponse | null>(result);
  if (result !== prevResult) {
    setPrevResult(result);
    if (open && result) setDraft(result.improvedPrompt);
  }

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        if (result) onUse(draft);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, result, draft, onClose, onUse]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/40 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-xl flex-col border-l border-border bg-bg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand/10 text-brand">
              <Wand2 className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-ink">Improve prompt</h2>
              <p className="text-[10.5px] text-faint">Low-token, structured, ready to run</p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-faint transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {busy ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-brand" />
              <div>
                <p className="text-sm font-semibold text-ink">Sharpening your prompt…</p>
                <p className="mt-1 text-xs text-faint">Scoring clarity, context, constraints and format</p>
              </div>
              <div className="mt-2 w-56 space-y-2">
                {["Context", "Clarity", "Constraints", "Format"].map((axis) => (
                  <div key={axis} className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full w-1/2 animate-pulse rounded-full bg-brand/30" />
                  </div>
                ))}
              </div>
            </div>
          ) : error ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400">
                <Sparkles className="h-5 w-5" />
              </span>
              <p className="max-w-xs text-sm font-semibold text-ink">Could not improve the prompt</p>
              <p className="max-w-xs text-xs leading-relaxed text-muted">{error}</p>
              <div className="mt-2 flex gap-2">
                <Button variant="outline" size="sm" onClick={onRetry}>
                  Try again
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    onClose();
                    window.location.href = "/keys";
                  }}
                >
                  Add an API key
                </Button>
              </div>
            </div>
          ) : result ? (
            <div className="space-y-5">
              {/* Score */}
              <div className="flex flex-wrap items-center gap-5 rounded-2xl border border-border bg-surface-2/40 p-4">
                <div className="flex items-center gap-4">
                  <RadialScore value={result.promptScore} size={76} label="before" />
                  <div className="flex h-[76px] flex-col items-center justify-center">
                    <span className="text-lg font-bold leading-none text-brand">→</span>
                    <span className="mt-1 text-[9px] font-medium uppercase tracking-wide text-faint">improved</span>
                  </div>
                  <RadialScore value={100} size={76} label="target" />
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  {result.promptScores.map((s) => (
                    <div key={s.label} className="flex items-center gap-2">
                      <span className="w-20 shrink-0 text-[10.5px] font-medium text-muted">{s.label}</span>
                      <Progress value={s.value} className="h-1.5 flex-1" />
                      <span className="w-6 text-right font-mono text-[10.5px] text-ink">{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Token savings */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-border bg-surface-2/40 p-3 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-faint">Before</p>
                  <p className="mt-1 font-mono text-base font-bold text-ink">{result.beforeTokens}</p>
                  <p className="text-[10px] text-faint">tokens</p>
                </div>
                <div className="rounded-xl border border-border bg-surface-2/40 p-3 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-faint">After</p>
                  <p className="mt-1 font-mono text-base font-bold text-ink">{result.afterTokens}</p>
                  <p className="text-[10px] text-faint">tokens</p>
                </div>
                <div
                  className={cn(
                    "rounded-xl border p-3 text-center",
                    result.tokenSavingPct > 0
                      ? "border-brand-2/30 bg-brand-2/5"
                      : "border-border bg-surface-2/40",
                  )}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-faint">Saved</p>
                  <p className={cn("mt-1 font-mono text-base font-bold", result.tokenSavingPct > 0 ? "text-brand-2" : "text-ink")}>
                    {result.tokenSavingPct}%
                  </p>
                  <p className="text-[10px] text-faint">tokens</p>
                </div>
              </div>

              {/* Diff */}
              {result.diff.kept.length + result.diff.removed.length + result.diff.unsure.length > 0 ? (
                <div className="rounded-2xl border border-border bg-surface-2/40 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-faint">What changed</p>
                  <div className="mt-2 space-y-1.5 text-xs">
                    {result.diff.kept.map((item) => (
                      <p key={item} className="flex gap-2 text-brand-2">
                        <span className="font-mono">+</span> {item}
                      </p>
                    ))}
                    {result.diff.removed.map((item) => (
                      <p key={item} className="flex gap-2 text-rose-400">
                        <span className="font-mono">−</span> {item}
                      </p>
                    ))}
                    {result.diff.unsure.map((item) => (
                      <p key={item} className="flex gap-2 text-muted">
                        <span className="font-mono">?</span> {item}
                      </p>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Improved prompt */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-faint">
                    Improved prompt <span className="normal-case">· editable</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => copy(draft)}
                    className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium text-muted transition-colors hover:bg-surface-2 hover:text-ink"
                  >
                    {copied ? <Check className="h-3 w-3 text-brand-2" /> : <Copy className="h-3 w-3" />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={10}
                  className="w-full resize-none rounded-xl border border-border bg-surface-2/40 p-3 font-mono text-[12.5px] leading-relaxed text-ink placeholder:text-faint focus:border-border-strong focus:outline-none"
                />
                <p className="text-right text-[10px] text-faint">
                  ~{Math.max(1, Math.round(draft.length / 4))} tokens · ran on {result.model}
                </p>
              </div>

              {/* Original (collapsed) */}
              <details className="rounded-xl border border-border bg-surface-2/20 px-4 py-3">
                <summary className="cursor-pointer text-[11px] font-semibold text-muted">
                  Original prompt
                </summary>
                <p className="mt-2 whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-faint">
                  {original}
                </p>
              </details>
            </div>
          ) : null}
        </div>

        {/* Footer actions */}
        {result ? (
          <div className="flex items-center gap-2 border-t border-border px-5 py-4">
            <div className="min-w-0 flex-1">
              <p className="text-[10.5px] font-medium text-faint">
                {formatMoney(result.costMicro / 1_000_000)} · {result.latencyMs >= 1000 ? `${(result.latencyMs / 1000).toFixed(1)}s` : `${result.latencyMs}ms`}
              </p>
              <p className="text-[10px] text-faint">⌘⏎ to use</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => onUse(draft)}>
              Use in chat
            </Button>
            <Button
              size="sm"
              icon={<Sparkles className="h-3.5 w-3.5" />}
              onClick={() => onRun(draft)}
              title="Replace the draft and send immediately"
            >
              Improve & run
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
