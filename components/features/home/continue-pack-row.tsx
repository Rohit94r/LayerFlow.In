"use client";

import { Check, Copy } from "@/components/ui/icons";
import { useCopy } from "@/lib/hooks";

/**
 * ContinuePackRow — one quiet row with a copy-to-clipboard action.
 * Replaces the large Continue Pack card on the hub.
 */
export function ContinuePackRow({
  title,
  source,
  fields,
}: {
  title: string;
  source: string;
  fields: { label: string; value: string }[];
}) {
  const { copied, copy } = useCopy();

  return (
    <div className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5">
      <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-brand-2" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-ink">{title}</span>
        <span className="mt-0.5 block truncate text-xs text-faint">{source}</span>
      </span>
      <button
        type="button"
        onClick={() => void copy(fields.map((f) => `${f.label}: ${f.value}`).join("\n"))}
        className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 text-xs font-medium text-muted transition-colors duration-150 hover:border-border-strong hover:text-ink"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-brand-2" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Copied" : "Copy pack"}
      </button>
    </div>
  );
}
