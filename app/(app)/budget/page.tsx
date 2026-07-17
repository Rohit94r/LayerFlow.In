import BudgetMeter from "@/components/workspace/BudgetMeter";
import { budget, blockedBudget } from "@/lib/mock-data";

export const metadata = {
  title: "Budget",
};

const spendByModel = [
  { model: "gpt-4o", spent: 14.28, pct: 37 },
  { model: "claude-sonnet-4", spent: 11.52, pct: 30 },
  { model: "gemini-2.5-pro", spent: 7.84, pct: 20 },
  { model: "deepseek-v3", spent: 4.78, pct: 13 },
];

export default function BudgetPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--color-ink)]">
          Budget & Costs
        </h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Hard limits that block API calls when exceeded — never wake up to a
          surprise bill.
        </p>
      </div>

      <BudgetMeter budget={budget} />

      <div className="card p-6">
        <h3 className="mb-4 text-base font-semibold text-[var(--color-ink)]">
          Spend by model
        </h3>
        <div className="space-y-3">
          {spendByModel.map((item) => (
            <div key={item.model}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-[var(--color-muted)]">{item.model}</span>
                <span className="font-medium text-[var(--color-ink)]">
                  ${item.spent.toFixed(2)}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[var(--color-surface-2)]">
                <div
                  className="h-full rounded-full bg-[var(--color-brand-2)]"
                  style={{ width: `${item.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-muted)]">
          Preview: blocked state
        </h2>
        <BudgetMeter budget={blockedBudget} />
      </section>
    </div>
  );
}
