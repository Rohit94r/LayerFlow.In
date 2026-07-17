"use client";

import { useState } from "react";
import { Play, Clock, DollarSign, Zap, Trophy } from "lucide-react";
import type { CompareResult } from "@/lib/types";

interface ComparePanelProps {
  results: CompareResult[];
  defaultPrompt?: string;
}

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
  const best = results.reduce((a, b) =>
    (a.qualityScore ?? 0) > (b.qualityScore ?? 0) ? a : b
  );

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <label className="mb-2 block text-xs font-medium text-muted">
          Prompt to compare
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="workspace-input mb-3 resize-none font-mono"
          rows={3}
        />
        <button
          type="button"
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
          const isCheapest = result.model === cheapest.model;
          const isFastest = result.model === fastest.model;
          const isBest = result.model === best.model;

          return (
            <div
              key={result.model}
              className={`card overflow-hidden ${running ? "opacity-50" : ""}`}
            >
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-ink">{result.model}</p>
                  <p className="text-xs text-faint">{result.provider}</p>
                </div>
                <div className="flex flex-wrap justify-end gap-1.5">
                  {isBest && (
                    <span className="flex items-center gap-1 rounded-full border border-brand/30 bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">
                      <Trophy className="h-3 w-3" />
                      Best
                    </span>
                  )}
                  {isCheapest && (
                    <span className="rounded-full border border-border px-2 py-0.5 text-xs font-medium text-ink">
                      Cheapest
                    </span>
                  )}
                  {isFastest && (
                    <span className="rounded-full border border-border bg-surface-2 px-2 py-0.5 text-xs font-medium text-muted">
                      Fastest
                    </span>
                  )}
                </div>
              </div>

              <div className="px-4 py-3">
                <p className="text-sm leading-relaxed text-muted">{result.output}</p>
              </div>

              <div className="flex items-center gap-4 border-t border-border px-4 py-2.5 text-xs text-faint">
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
                {result.qualityScore && (
                  <span>{result.qualityScore}% quality</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
