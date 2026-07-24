/**
 * Token / cost saver knobs. Parsed lazily from process.env so tests can mutate
 * env without re-validating the whole API env schema.
 */
export interface SavingsEnv {
  /** Soft input budget (tokens) before history truncation. */
  inputBudgetTokens: number;
  /** Keep last N non-system messages full when truncating. */
  keepLastTurns: number;
  /** max_tokens when preferCheap or tokenSaver is on. */
  shortMaxTokens: number;
  /** Exact-match response cache TTL (seconds). */
  exactCacheTtlSeconds: number;
  /**
   * When true, older context may be summarized with a cheap model instead of
   * deterministic truncation. Deterministic path is always used when false.
   */
  enableLlmSummary: boolean;
}

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function boolEnv(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw == null || raw === "") return fallback;
  return ["1", "true", "yes", "on"].includes(raw.toLowerCase());
}

export function getSavingsEnv(): SavingsEnv {
  return {
    inputBudgetTokens: intEnv("TOKEN_SAVER_INPUT_BUDGET", 6000),
    keepLastTurns: intEnv("TOKEN_SAVER_KEEP_TURNS", 4),
    shortMaxTokens: intEnv("TOKEN_SAVER_MAX_TOKENS", 512),
    exactCacheTtlSeconds: intEnv("EXACT_CACHE_TTL_SECONDS", 60 * 60),
    enableLlmSummary: boolEnv("TOKEN_SAVER_SUMMARY", false),
  };
}
