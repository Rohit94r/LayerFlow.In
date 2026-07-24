import { computeCostMicro } from "@layerflow/model-registry";
import type { RunSavings } from "@layerflow/contracts";

export interface EstimateSavingsInput {
  originalInputTokens: number;
  compressedInputTokens: number;
  /** Expected / actual output tokens for cost math. */
  outputTokens: number;
  modelUsed: string;
  /** Model the caller would have used without Prefer-cheap / Auto routing. */
  expensiveAlternative?: string | null;
  cacheHit?: boolean;
  compressionApplied?: boolean;
  maxTokensCapped?: number | null;
  /** Actual billed cost (0 on cache hit). */
  actualCostMicro?: number;
}

/**
 * Compute per-run savings vs an uncompressed + (optional) expensive-model baseline.
 * Uses @layerflow/model-registry pricing. Never negative.
 */
export function estimateRunSavings(input: EstimateSavingsInput): RunSavings {
  const out = Math.max(0, input.outputTokens);
  const origIn = Math.max(0, input.originalInputTokens);
  const compIn = Math.max(0, input.compressedInputTokens);
  const tokensSaved = Math.max(0, origIn - compIn);

  const actualCost =
    input.actualCostMicro ??
    (input.cacheHit ? 0 : (computeCostMicro(input.modelUsed, compIn, out) ?? 0));

  // Baseline: same call on the expensive model (or same model) with original input size.
  const baselineModel = input.expensiveAlternative?.trim() || input.modelUsed;
  const baselineCost =
    computeCostMicro(baselineModel, origIn, out) ??
    computeCostMicro(input.modelUsed, origIn, out) ??
    actualCost;

  const costSavedMicro = Math.max(0, baselineCost - actualCost);

  return {
    originalInputTokens: origIn,
    compressedInputTokens: compIn,
    tokensSaved,
    costSavedMicro,
    modelChosen: input.modelUsed,
    expensiveAlternative:
      input.expensiveAlternative && input.expensiveAlternative !== input.modelUsed
        ? input.expensiveAlternative
        : null,
    alternativeCostMicro:
      input.expensiveAlternative && input.expensiveAlternative !== input.modelUsed
        ? (computeCostMicro(input.expensiveAlternative, compIn, out) ?? null)
        : null,
    cacheHit: Boolean(input.cacheHit),
    compressionApplied: Boolean(input.compressionApplied ?? tokensSaved > 0),
    maxTokensCapped: input.maxTokensCapped ?? null,
  };
}

/** Human-readable UI fragment: "Saved ~1.2k tokens · ~$0.004". */
export function formatSavingsLine(savings: Pick<RunSavings, "tokensSaved" | "costSavedMicro">): string | null {
  if (savings.tokensSaved <= 0 && savings.costSavedMicro <= 0) return null;
  const tok =
    savings.tokensSaved >= 1000
      ? `${(savings.tokensSaved / 1000).toFixed(savings.tokensSaved >= 10_000 ? 0 : 1)}k`
      : String(savings.tokensSaved);
  const dollars = savings.costSavedMicro / 1_000_000;
  const money =
    dollars >= 0.01 ? `$${dollars.toFixed(2)}` : dollars > 0 ? `$${dollars.toFixed(4)}` : "$0";
  return `Saved ~${tok} tokens · ~${money}`;
}
