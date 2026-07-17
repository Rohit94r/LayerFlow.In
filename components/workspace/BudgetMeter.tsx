import type { Budget } from "@/lib/types";

interface BudgetMeterProps {
  budget: Budget;
  compact?: boolean;
}

function formatUsd(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export default function BudgetMeter({ budget, compact = false }: BudgetMeterProps) {
  const isWarning =
    !budget.blocked && budget.percentUsed >= budget.alertThreshold;
  const barColor = budget.blocked
    ? "bg-red-500"
    : isWarning
      ? "bg-brand"
      : "bg-ink/25";

  if (compact) {
    return (
      <div className="rounded-lg border border-border bg-surface p-3">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="text-muted">Monthly budget</span>
          <span
            className={
              budget.blocked ? "font-medium text-red-500" : "text-ink"
            }
          >
            {formatUsd(budget.spent)} / {formatUsd(budget.monthlyLimit)}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
          <div
            className={`h-full rounded-full transition-all ${barColor}`}
            style={{ width: `${Math.min(budget.percentUsed, 100)}%` }}
          />
        </div>
        {budget.blocked && (
          <p className="mt-1.5 text-xs font-medium text-red-500">Blocked</p>
        )}
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <p className="text-sm text-brand">Hard budget limit</p>
          <h3 className="mt-1 text-base font-semibold text-ink">
            Monthly spend
          </h3>
          <p className="mt-0.5 text-sm text-muted">
            Resets{" "}
            {new Date(budget.resetDate).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </p>
        </div>
        {budget.blocked ? (
          <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-0.5 text-xs font-medium text-red-500">
            Blocked
          </span>
        ) : isWarning ? (
          <span className="rounded-full border border-brand/30 bg-brand/10 px-2.5 py-0.5 text-xs font-medium text-brand">
            {budget.alertThreshold}% alert
          </span>
        ) : (
          <span className="rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-muted">
            On track
          </span>
        )}
      </div>

      <div className="mb-2 h-3 overflow-hidden rounded-full bg-surface-2">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.min(budget.percentUsed, 100)}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted">{budget.percentUsed.toFixed(1)}% used</span>
        <span className="font-medium text-ink">
          {formatUsd(budget.remaining)} remaining
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="workspace-stat">
          <p className="workspace-stat-label">Spent</p>
          <p className="workspace-stat-value">{formatUsd(budget.spent)}</p>
        </div>
        <div className="workspace-stat">
          <p className="workspace-stat-label">Limit</p>
          <p className="workspace-stat-value">
            {formatUsd(budget.monthlyLimit)}
          </p>
        </div>
        <div className="workspace-stat">
          <p className="workspace-stat-label">Remaining</p>
          <p
            className={`workspace-stat-value ${
              budget.blocked ? "text-red-500" : ""
            }`}
          >
            {formatUsd(budget.remaining)}
          </p>
        </div>
      </div>

      {budget.blocked && (
        <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
          <p className="text-sm font-medium text-red-500">
            Budget exceeded — API calls blocked
          </p>
          <p className="mt-1 text-xs text-red-500/80">
            Increase your limit or wait until{" "}
            {new Date(budget.resetDate).toLocaleDateString()} to resume.
          </p>
        </div>
      )}
    </div>
  );
}
