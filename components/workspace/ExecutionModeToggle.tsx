"use client";

import type { ExecutionMode } from "@/lib/types";

const modes: { value: ExecutionMode; label: string; description: string }[] = [
  { value: "manual", label: "Manual", description: "You pick the model every time" },
  { value: "suggest", label: "Suggest", description: "Show recommendations after save" },
  { value: "auto-cheapest", label: "Auto · Cheapest", description: "Route to budget tier automatically" },
  { value: "auto-fastest", label: "Auto · Fastest", description: "Prioritize Groq / Flash latency" },
  { value: "auto-best", label: "Auto · Best Quality", description: "Use frontier models when needed" },
  { value: "auto-balanced", label: "Auto · Balanced", description: "Mix cost and quality" },
];

interface ExecutionModeToggleProps {
  value: ExecutionMode;
  onChange?: (mode: ExecutionMode) => void;
  compact?: boolean;
}

export default function ExecutionModeToggle({
  value,
  onChange,
  compact = false,
}: ExecutionModeToggleProps) {
  if (compact) {
    return (
      <select
        value={value}
        onChange={(e) => onChange?.(e.target.value as ExecutionMode)}
        className="workspace-input py-1.5 text-sm"
      >
        {modes.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {modes.map((mode) => {
        const active = value === mode.value;
        return (
          <button
            key={mode.value}
            type="button"
            onClick={() => onChange?.(mode.value)}
            className={`rounded-lg border px-4 py-3 text-left transition-colors ${
              active
                ? "border-brand/40 bg-brand/10"
                : "border-border bg-surface hover:bg-surface-2"
            }`}
          >
            <p className={`text-sm font-medium ${active ? "text-ink" : "text-muted"}`}>
              {mode.label}
            </p>
            <p className="mt-0.5 text-xs text-faint">{mode.description}</p>
          </button>
        );
      })}
    </div>
  );
}
