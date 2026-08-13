import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { timeAgo } from "@/lib/data/providers";
import type { TimelineEvent } from "@/lib/types";

const TYPE_COLORS: Record<string, string> = {
  rescue: "bg-brand",
  prompt: "bg-emerald-400",
  learning: "bg-violet-400",
  decision: "bg-rose-400",
  cost: "bg-sky-400",
  model: "bg-pink-400",
};

/** Vertical timeline of AI work events (the Work Ledger). */
export function Timeline({ events, className }: { events: TimelineEvent[]; className?: string }) {
  return (
    <div className={cn("space-y-0", className)}>
      {events.map((evt, i) => (
        <div key={evt.id} className="relative flex gap-4 pb-5 last:pb-0">
          {i < events.length - 1 ? (
            <span className="absolute left-[5px] top-5 h-full w-px bg-border" aria-hidden />
          ) : null}
          <span
            className={cn(
              "relative mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full border-2 border-surface",
              TYPE_COLORS[evt.type] ?? "bg-slate-400",
            )}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-ink">{evt.title}</p>
              <Badge tone="neutral">{evt.type}</Badge>
            </div>
            <p className="mt-0.5 text-xs text-muted">{evt.description}</p>
            <p className="mt-0.5 font-mono text-[10px] text-faint">
              {evt.meta ?? ""} {evt.meta ? "·" : ""} {timeAgo(evt.timestamp)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
