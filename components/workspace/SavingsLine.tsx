"use client";

/** Compact savings line for run / compare cards. */
export default function SavingsLine({
  tokensSaved,
  costSavedUsd,
  cacheHit,
}: {
  tokensSaved?: number | null;
  costSavedUsd?: number | null;
  cacheHit?: boolean;
}) {
  const tokens = tokensSaved ?? 0;
  const dollars = costSavedUsd ?? 0;
  if (tokens <= 0 && dollars <= 0 && !cacheHit) return null;

  const tok =
    tokens >= 1000
      ? `${(tokens / 1000).toFixed(tokens >= 10_000 ? 0 : 1)}k`
      : String(tokens);
  const money =
    dollars >= 0.01
      ? `$${dollars.toFixed(2)}`
      : dollars > 0
        ? `$${dollars.toFixed(4)}`
        : "$0";

  return (
    <p className="text-xs text-brand">
      {cacheHit ? "Cache hit · " : ""}
      Saved ~{tok} tokens · ~{money}
    </p>
  );
}
