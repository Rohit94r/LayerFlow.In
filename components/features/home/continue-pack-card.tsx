"use client";

import { Check, Copy, TerminalSquare } from "@/components/ui/icons";
import { useCopy } from "@/lib/hooks";

export interface ContinuePackLine {
  label: string;
  value: string;
}

/**
 * Latest Continue Pack — the single most useful card on the hub:
 * shows the pack fields and copies them into the clipboard in one click.
 */
export function ContinuePackCard({
  title,
  meta,
  fields,
  href,
}: {
  title: string;
  meta: string;
  fields: ContinuePackLine[];
  href: string;
}) {
  const { copied, copy } = useCopy();

  const packText = fields.map((f) => `${f.label}: ${f.value}`).join("\n");

  return (
    <div className="card-lift flex h-full flex-col rounded-2xl border border-border bg-surface/60 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-ink">{title}</p>
          <p className="mt-0.5 truncate font-mono text-[10px] text-faint">{meta}</p>
        </div>
        <button
          type="button"
          onClick={() => void copy(packText)}
          className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-2.5 text-[11px] font-medium text-muted transition-colors duration-150 hover:border-border-strong hover:text-ink"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-brand-2" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy pack"}
        </button>
      </div>

      <div className="mt-4 min-w-0 flex-1 space-y-2.5">
        {fields.map((f) => (
          <div key={f.label} className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-faint">{f.label}</p>
            <p className="mt-0.5 line-clamp-2 text-[12px] leading-relaxed text-muted">{f.value}</p>
          </div>
        ))}
      </div>

      <a
        href={href}
        className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-medium text-brand transition-colors hover:text-brand-2"
      >
        <TerminalSquare className="h-3.5 w-3.5" />
        Open full report
      </a>
    </div>
  );
}
