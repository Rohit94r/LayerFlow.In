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
      ? "bg-[var(--color-brand)]"
      : "bg-[var(--color-brand-2)]";

  if (compact) {
    return (
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="text-[var(--color-muted)]">Monthly budget</span>
          <span
            className={
              budget.blocked
                ? "font-medium text-red-400"
                : "text-[var(--color-ink)]"
            }
          >
            {formatUsd(budget.spent)} / {formatUsd(budget.monthlyLimit)}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-2)]">
          <div
            className={`h-full rounded-full transition-all ${barColor}`}
            style={{ width: `${Math.min(budget.percentUsed, 100)}%` }}
          />
        </div>
        {budget.blocked && (
          <p className="mt-1.5 text-xs font-medium text-red-400">Blocked</p>
        )}
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-[var(--color-ink)]">
            Monthly Budget
          </h3>
          <p className="mt-0.5 text-sm text-[var(--color-muted)]">
            Resets {new Date(budget.resetDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </p>
        </div>
        {budget.blocked ? (
          <span className="rounded-full bg-red-500/15 px-2.5 py-0.5 text-xs font-medium text-red-400">
            Blocked
          </span>
        ) : isWarning ? (
          <span className="rounded-full bg-[var(--color-brand)]/15 px-2.5 py-0.5 text-xs font-medium text-[var(--color-brand)]">
            {budget.alertThreshold}% alert
          </span>
        ) : (
          <span className="rounded-full bg-[var(--color-brand-2)]/15 px-2.5 py-0.5 text-xs font-medium text-[var(--color-brand-2)]">
            On track
          </span>
        )}
      </div>

      <div className="mb-2 h-3 overflow-hidden rounded-full bg-[var(--color-surface-2)]">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.min(budget.percentUsed, 100)}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-[var(--color-muted)]">
          {budget.percentUsed.toFixed(1)}% used
        </span>
        <span className="font-medium text-[var(--color-ink)]">
          {formatUsd(budget.remaining)} remaining
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-[var(--color-surface-2)] px-3 py-2.5">
          <p className="text-xs text-[var(--color-faint)]">Spent</p>
          <p className="text-lg font-semibold text-[var(--color-ink)]">
            {formatUsd(budget.spent)}
          </p>
        </div>
        <div className="rounded-lg bg-[var(--color-surface-2)] px-3 py-2.5">
          <p className="text-xs text-[var(--color-faint)]">Limit</p>
          <p className="text-lg font-semibold text-[var(--color-ink)]">
            {formatUsd(budget.monthlyLimit)}
          </p>
        </div>
        <div className="rounded-lg bg-[var(--color-surface-2)] px-3 py-2.5">
          <p className="text-xs text-[var(--color-faint)]">Remaining</p>
          <p
            className={`text-lg font-semibold ${
              budget.blocked ? "text-red-400" : "text-[var(--color-brand-2)]"
            }`}
          >
            {formatUsd(budget.remaining)}
          </p>
        </div>
      </div>

      {budget.blocked && (
        <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
          <p className="text-sm font-medium text-red-400">
            Budget exceeded — API calls blocked
          </p>
          <p className="mt-1 text-xs text-red-400/80">
            Increase your limit or wait until {new Date(budget.resetDate).toLocaleDateString()} to resume.
          </p>
        </div>
      )}
    </div>
  );
}
