"use client";

import { useState } from "react";
import { Play, Clock, DollarSign, Zap } from "lucide-react";
import type { CompareResult } from "@/lib/types";

interface ComparePanelProps {
  results: CompareResult[];
  defaultPrompt?: string;
}

const providerColors: Record<string, string> = {
  OpenAI: "#10a37f",
  Anthropic: "#d97757",
  Google: "#4285f4",
  DeepSeek: "#4d6bfe",
};

export default function ComparePanel({
  results,
  defaultPrompt = "Explain what LayerFlow does in one sentence.",
}: ComparePanelProps) {
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [running, setRunning] = useState(false);

  const handleRun = () => {
    setRunning(true);
    setTimeout(() => setRunning(false), 1500);
  };

  const cheapest = results.reduce((a, b) => (a.cost < b.cost ? a : b));
  const fastest = results.reduce((a, b) => (a.latencyMs < b.latencyMs ? a : b));

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <label className="mb-2 block text-xs font-medium text-[var(--color-muted)]">
          Prompt to compare
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="mb-3 w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5 font-mono text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-border-strong)]"
          rows={3}
        />
        <button
          onClick={handleRun}
          disabled={running}
          className="btn-primary flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60"
        >
          <Play className="h-4 w-4" />
          {running ? "Running across 4 models…" : "Compare all models"}
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {results.map((result) => {
          const color = providerColors[result.provider] ?? "#888";
          const isCheapest = result.model === cheapest.model;
          const isFastest = result.model === fastest.model;

          return (
            <div
              key={result.model}
              className={`card overflow-hidden ${running ? "opacity-50" : ""}`}
            >
              <div
                className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3"
                style={{ borderTopColor: color, borderTopWidth: 2 }}
              >
                <div>
                  <p className="text-sm font-semibold text-[var(--color-ink)]">
                    {result.model}
                  </p>
                  <p className="text-xs text-[var(--color-faint)]">
                    {result.provider}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  {isCheapest && (
                    <span className="rounded-full bg-[var(--color-brand-2)]/15 px-2 py-0.5 text-xs font-medium text-[var(--color-brand-2)]">
                      Cheapest
                    </span>
                  )}
                  {isFastest && (
                    <span className="rounded-full bg-[var(--color-brand)]/15 px-2 py-0.5 text-xs font-medium text-[var(--color-brand)]">
                      Fastest
                    </span>
                  )}
                </div>
              </div>

              <div className="px-4 py-3">
                <p className="text-sm leading-relaxed text-[var(--color-muted)]">
                  {result.output}
                </p>
              </div>

              <div className="flex items-center gap-4 border-t border-[var(--color-border)] px-4 py-2.5 text-xs text-[var(--color-faint)]">
                <span className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  ${result.cost.toFixed(3)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {result.latencyMs}ms
                </span>
                <span className="flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  {result.tokensIn + result.tokensOut} tokens
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
