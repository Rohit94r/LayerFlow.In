"use client";

import { Sparkles, TrendingDown, Zap, CheckCircle2 } from "lucide-react";

interface CostOptimizerBannerProps {
  actualSpent: number;
  optimizedSpent: number;
  variant?: "default" | "compact";
}

export default function CostOptimizerBanner({
  actualSpent,
  optimizedSpent,
  variant = "default",
}: CostOptimizerBannerProps) {
  const saved = actualSpent - optimizedSpent;
  const savedPct = Math.round((saved / actualSpent) * 100);

  if (variant === "compact") {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-brand/20 bg-brand/5 px-4 py-3">
        <Sparkles className="h-4 w-4 shrink-0 text-brand" />
        <p className="text-sm text-ink">
          You spent <span className="font-medium">${actualSpent.toFixed(0)}</span> — could have been{" "}
          <span className="font-medium text-brand">${optimizedSpent.toFixed(0)}</span> with Auto Mode
        </p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-border bg-brand/5 px-6 py-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-brand/30 bg-brand/10">
            <Sparkles className="h-5 w-5 text-brand" />
          </div>
          <div>
            <p className="text-sm text-brand">Cost Optimizer</p>
            <h3 className="mt-0.5 text-base font-semibold text-ink">
              You spent ${actualSpent.toFixed(2)} — could have been ${optimizedSpent.toFixed(2)} with Auto Mode
            </h3>
            <p className="mt-1 text-sm text-muted">
              Switch to Auto (Cheapest) or enable Prefer-cheap to save ~{savedPct}% on similar prompts.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-6 sm:grid-cols-3">
        <div className="workspace-stat">
          <p className="workspace-stat-label flex items-center gap-1">
            <TrendingDown className="h-3 w-3" />
            Potential savings
          </p>
          <p className="workspace-stat-value text-brand">${saved.toFixed(2)}</p>
        </div>
        <div className="workspace-stat">
          <p className="workspace-stat-label flex items-center gap-1">
            <Zap className="h-3 w-3" />
            Auto mode picks
          </p>
          <p className="workspace-stat-value">Flash / DeepSeek</p>
        </div>
        <div className="workspace-stat">
          <p className="workspace-stat-label flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Quality retained
          </p>
          <p className="workspace-stat-value">~92%</p>
        </div>
      </div>

      <div className="border-t border-border px-6 py-4">
        <button type="button" className="btn-primary rounded-lg px-4 py-2 text-sm font-medium">
          Enable Auto Mode (Cheapest)
        </button>
      </div>
    </div>
  );
}
