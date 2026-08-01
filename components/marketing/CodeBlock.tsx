"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function CodeBlock({ code, prompt = "$" }: { code: string; prompt?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="flex items-center justify-between gap-3 bg-[#0a0e10] px-4 py-3">
      <code className="min-w-0 flex-1 truncate font-mono text-[13px] text-white/90">
        <span className="mr-2 select-none text-brand">{prompt}</span>
        {code}
      </code>
      <button
        type="button"
        onClick={copy}
        aria-label="Copy command"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border text-faint transition-colors hover:border-border-strong hover:text-ink"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}
