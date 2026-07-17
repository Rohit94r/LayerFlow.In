"use client";

import type { RoutingRule } from "@/lib/types";

interface RoutingRulesProps {
  rules: RoutingRule[];
  onToggle?: (id: string) => void;
}

export default function RoutingRules({ rules, onToggle }: RoutingRulesProps) {
  return (
    <div className="space-y-2">
      {rules.map((rule) => (
        <div
          key={rule.id}
          className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
        >
          <div>
            <p className="text-sm font-medium text-ink">{rule.condition}</p>
            <p className="font-mono text-xs text-faint">→ {rule.model}</p>
          </div>
          <button
            type="button"
            onClick={() => onToggle?.(rule.id)}
            className={`relative h-6 w-11 rounded-full transition-colors ${
              rule.enabled ? "bg-brand" : "bg-surface-2"
            }`}
            aria-label={`Toggle ${rule.condition}`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                rule.enabled ? "left-[22px]" : "left-0.5"
              }`}
            />
          </button>
        </div>
      ))}
      <button type="button" className="btn-secondary w-full py-2 text-sm">
        Add routing rule
      </button>
    </div>
  );
}
