/** Money helpers: API uses integer micro-dollars ($1 = 1_000_000). */

export const MICRO = 1_000_000;

export function microToUsd(micro: number): number {
  return micro / MICRO;
}

export function usdToMicro(usd: number): number {
  return Math.round(usd * MICRO);
}

export function formatUsd(amount: number, digits = 2): string {
  return `$${amount.toFixed(digits)}`;
}

export function formatMicroAsUsd(micro: number, digits = 2): string {
  return formatUsd(microToUsd(micro), digits);
}
