import type { RankHints } from "@layerflow/contracts";

export interface RankableResult {
  runId: string;
  status: string;
  costMicro: number;
  latencyMs: number | null;
  /** Heuristic quality proxy: longer successful outputs rank higher when tied. */
  outputLength: number;
}

/**
 * Compute best / cheapest / fastest badges across succeeded compare results.
 * Failed runs never receive a badge.
 */
export function computeRankHints(results: RankableResult[]): Map<string, RankHints> {
  const hints = new Map<string, RankHints>();
  for (const r of results) {
    hints.set(r.runId, { best: false, cheapest: false, fastest: false });
  }

  const succeeded = results.filter((r) => r.status === "succeeded");
  if (succeeded.length === 0) return hints;

  const cheapest = succeeded.reduce((a, b) => (a.costMicro <= b.costMicro ? a : b));
  hints.get(cheapest.runId)!.cheapest = true;

  const withLatency = succeeded.filter((r) => r.latencyMs != null);
  if (withLatency.length > 0) {
    const fastest = withLatency.reduce((a, b) =>
      (a.latencyMs ?? Infinity) <= (b.latencyMs ?? Infinity) ? a : b,
    );
    hints.get(fastest.runId)!.fastest = true;
  }

  // "Best" = longest successful output as a crude quality proxy until we have
  // user ratings / LLM judges. Ties break toward cheaper.
  const best = succeeded.reduce((a, b) => {
    if (b.outputLength !== a.outputLength) {
      return b.outputLength > a.outputLength ? b : a;
    }
    return a.costMicro <= b.costMicro ? a : b;
  });
  hints.get(best.runId)!.best = true;

  return hints;
}
