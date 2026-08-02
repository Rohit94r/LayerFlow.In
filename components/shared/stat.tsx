import type { ReactNode } from "react";
import { Panel } from "@/components/ui/panel";
import { cn } from "@/lib/utils";

/** Compact metric tile used across dashboard pages. */
export function Stat({
  label,
  value,
  hint,
  icon,
  trend,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  /** Direction-aware accent for deltas. */
  trend?: { direction: "up" | "down" | "flat"; text: string };
  className?: string;
}) {
  return (
    <Panel className={cn("p-5", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-faint">{label}</p>
        {icon ? <span className="text-muted">{icon}</span> : null}
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-ink">{value}</p>
      <div className="mt-1.5 flex items-center gap-2">
        {trend ? (
          <span
            className={cn(
              "font-mono text-[11px]",
              trend.direction === "up" ? "text-emerald-400" : trend.direction === "down" ? "text-brand" : "text-faint",
            )}
          >
            {trend.direction === "up" ? "↑" : trend.direction === "down" ? "↓" : "·"} {trend.text}
          </span>
        ) : null}
        {hint ? <span className="text-[11px] text-faint">{hint}</span> : null}
      </div>
    </Panel>
  );
}
