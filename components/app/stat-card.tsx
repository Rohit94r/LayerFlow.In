"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Sparkline } from "@/components/ui/charts";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  delta,
  deltaLabel,
  icon: Icon,
  accent,
  spark,
  goodWhenDown,
}: {
  label: string;
  value: string;
  delta: number;
  deltaLabel: string;
  icon: LucideIcon;
  accent: string;
  spark: number[];
  goodWhenDown?: boolean;
}) {
  const positive = goodWhenDown ? delta < 0 : delta > 0;
  const showDown = goodWhenDown ? delta > 0 : delta < 0;

  return (
    <div className="card card-hover group relative overflow-hidden p-5">
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: accent }}
        aria-hidden
      />
      <div className="flex items-start justify-between">
        <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface-2" style={{ color: accent }}>
          <Icon className="h-4.5 w-4.5" />
        </div>
        <Sparkline data={spark} color={accent} className="opacity-70" />
      </div>
      <p className="stat-value mt-4">{value}</p>
      <div className="mt-1.5 flex items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold",
            positive ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400",
          )}
        >
          {showDown ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
          {Math.abs(delta)}%
        </span>
        <span className="text-[11px] text-faint">{deltaLabel}</span>
      </div>
      <p className="mt-2 text-xs font-medium text-muted">{label}</p>
    </div>
  );
}
