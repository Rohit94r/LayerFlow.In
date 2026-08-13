import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { timeAgo } from "@/lib/data/providers";
import type { Prompt } from "@/lib/types";

export function PromptCard({ prompt }: { prompt: Prompt }) {
  return (
    <Link
      href={`/prompts/${prompt.id}`}
      className="group flex flex-col rounded-2xl border border-border bg-surface/40 p-5 transition-colors duration-150 hover:border-border-strong hover:bg-surface-2/50"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand/25 bg-brand/10 font-mono text-sm font-bold text-brand">
          {prompt.score}
        </span>
        <span className="text-right font-mono text-[10px] text-faint">v{prompt.version}</span>
      </div>
      <h3 className="mt-4 text-sm font-semibold text-ink transition-colors duration-150 group-hover:text-brand">
        {prompt.title}
      </h3>
      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">{prompt.description}</p>
      <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-border pt-3">
        {prompt.source !== "manual" ? (
          <Badge tone={prompt.source === "improve" ? "violet" : "mint"}>
            {prompt.source === "improve" ? "From improve" : "Imported from chat"}
          </Badge>
        ) : null}
        {prompt.tags.slice(0, 2).map((t) => (
          <Badge key={t} tone="neutral">
            #{t}
          </Badge>
        ))}
        <span className="ml-auto text-[10px] text-faint">
          {prompt.usageCount} uses · {timeAgo(prompt.updatedAt)}
        </span>
      </div>
    </Link>
  );
}
