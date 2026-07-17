import CostOptimizerBanner from "@/components/workspace/CostOptimizerBanner";
import ExecutionModeToggle from "@/components/workspace/ExecutionModeToggle";
import PageHeader from "@/components/workspace/PageHeader";
import RoutingRules from "@/components/workspace/RoutingRules";
import { routingRules, workspaceSettings, dashboardStats } from "@/lib/mock-data";

export const metadata = {
  title: "Optimizer",
};

const suggestions = [
  {
    prompt: "Resume Summary Bullets",
    current: "gpt-4o",
    suggested: "gemini-2.5-flash",
    saved: 0.01,
    quality: 92,
  },
  {
    prompt: "App Sidebar Navigation",
    current: "gpt-4o",
    suggested: "gemini-2.5-flash",
    saved: 0.018,
    quality: 90,
  },
  {
    prompt: "Multi-Model Compare Panel",
    current: "claude-sonnet-4",
    suggested: "deepseek-v3",
    saved: 0.011,
    quality: 87,
  },
];

export default function OptimizerPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Model Intelligence"
        title="Optimizer"
        description="See where Auto Mode would have saved money — and tune routing defaults."
      />

      <CostOptimizerBanner actualSpent={42} optimizedSpent={11} />

      <div className="card p-6">
        <h3 className="text-base font-semibold text-ink">Execution mode default</h3>
        <p className="mt-0.5 text-sm text-muted">
          Manual · Suggest · Auto (Cheapest / Fastest / Best / Balanced)
        </p>
        <div className="mt-4">
          <ExecutionModeToggle value={workspaceSettings.executionMode} />
        </div>
      </div>

      <div className="card p-6">
        <h3 className="text-base font-semibold text-ink">Optimization suggestions</h3>
        <p className="mt-0.5 text-sm text-muted">
          Prompts that could run cheaper with similar quality.
        </p>
        <div className="mt-4 divide-y divide-border">
          {suggestions.map((item) => (
            <div key={item.prompt} className="flex items-center justify-between py-4">
              <div>
                <p className="text-sm font-medium text-ink">{item.prompt}</p>
                <p className="mt-0.5 font-mono text-xs text-faint">
                  {item.current} → {item.suggested}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-brand">Save ${item.saved.toFixed(3)}</p>
                <p className="text-xs text-faint">{item.quality}% quality</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-6">
        <h3 className="text-base font-semibold text-ink">Model mix this month</h3>
        <div className="mt-4 space-y-3">
          {dashboardStats.modelUsage.map((item) => (
            <div key={item.model} className="flex items-center justify-between text-sm">
              <span className="font-mono text-xs text-muted">{item.model}</span>
              <span className="text-faint">
                {item.count} runs · ${item.cost.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-6">
        <h3 className="text-base font-semibold text-ink">Routing rules</h3>
        <p className="mt-0.5 text-sm text-muted">Coding → Claude, Budget under $5 → DeepSeek</p>
        <div className="mt-4">
          <RoutingRules rules={routingRules} />
        </div>
      </div>
    </div>
  );
}
