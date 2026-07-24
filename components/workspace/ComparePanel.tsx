"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Play, Clock, DollarSign, Zap, Trophy, Loader2 } from "lucide-react";
import type { CompareResult } from "@/lib/types";
import { createCompare, getCompareJob } from "@/lib/api";
import { mapCompareResults } from "@/lib/api/mappers";
import { errorMessage } from "@/lib/hooks/use-async-data";
import { ApiClientError } from "@/lib/api/client";
import SavingsLine from "@/components/workspace/SavingsLine";

const DEFAULT_MODELS = [
  "gpt-4o",
  "claude-sonnet-4",
  "gemini-2.5-flash",
  "deepseek-chat",
];

interface ComparePanelProps {
  defaultPrompt?: string;
  defaultVersionId?: string | null;
}

export default function ComparePanel({
  defaultPrompt = "Explain what LayerFlow does in one sentence.",
  defaultVersionId = null,
}: ComparePanelProps) {
  const searchParams = useSearchParams();
  const versionId = defaultVersionId ?? searchParams.get("versionId");
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<CompareResult[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRun = async () => {
    setRunning(true);
    setError(null);
    setResults([]);
    setStatus("queued");
    try {
      const created = await createCompare({
        ...(versionId ? { promptVersionId: versionId } : { content: prompt }),
        models: DEFAULT_MODELS,
      });
      setStatus(created.status);

      let attempts = 0;
      while (attempts < 60) {
        await new Promise((r) => setTimeout(r, 1500));
        const job = await getCompareJob(created.jobId);
        setStatus(job.job.status);
        if (job.job.status === "completed") {
          setResults(mapCompareResults(job));
          break;
        }
        if (job.job.status === "failed") {
          throw new Error(job.job.errorMessage ?? "Compare job failed");
        }
        attempts += 1;
      }
      if (attempts >= 60) {
        throw new Error("Compare timed out — check that the API worker is running.");
      }
    } catch (err) {
      if (err instanceof ApiClientError && err.isBudgetExceeded) {
        setError("Budget exceeded — compare was blocked.");
      } else {
        setError(errorMessage(err));
      }
    } finally {
      setRunning(false);
    }
  };

  const cheapest =
    results.length > 0
      ? results.reduce((a, b) => (a.cost < b.cost ? a : b))
      : null;
  const fastest =
    results.length > 0
      ? results.reduce((a, b) => (a.latencyMs < b.latencyMs ? a : b))
      : null;

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <label className="mb-2 block text-xs font-medium text-muted">
          Prompt to compare
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={Boolean(versionId)}
          className="workspace-input mb-3 resize-none font-mono disabled:opacity-70"
          rows={3}
        />
        {versionId && (
          <p className="mb-3 text-xs text-faint">
            Comparing saved version <code className="text-ink">{versionId}</code>
          </p>
        )}
        <button
          type="button"
          onClick={handleRun}
          disabled={running || (!versionId && !prompt.trim())}
          className="btn-primary flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60"
        >
          {running ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          {running
            ? `Comparing… (${status ?? "starting"})`
            : "Compare all models"}
        </button>
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">
          {error}
        </p>
      )}

      {!running && results.length === 0 && !error && (
        <p className="text-sm text-muted">
          Run a compare to see Best / Cheapest / Fastest across models. Requires
          provider keys and a running worker.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {results.map((result) => {
          const isCheapest = cheapest?.model === result.model;
          const isFastest = fastest?.model === result.model;
          const isBest = result.rankHints?.best ?? false;

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
                  {(result.rankHints?.cheapest || isCheapest) && (
                    <span className="rounded-full border border-border px-2 py-0.5 text-xs font-medium text-ink">
                      Cheapest
                    </span>
                  )}
                  {(result.rankHints?.fastest || isFastest) && (
                    <span className="rounded-full border border-border bg-surface-2 px-2 py-0.5 text-xs font-medium text-muted">
                      Fastest
                    </span>
                  )}
                </div>
              </div>

              <div className="px-4 py-3">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted">
                  {result.output || "No output"}
                </p>
              </div>

              <div className="flex flex-col gap-1 border-t border-border px-4 py-2.5 text-xs text-faint">
                <div className="flex items-center gap-4">
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
                    {result.tokensIn + result.tokensOut} tok
                  </span>
                </div>
                <SavingsLine
                  tokensSaved={result.tokensSaved}
                  costSavedUsd={result.costSaved}
                  cacheHit={result.cacheHit}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
