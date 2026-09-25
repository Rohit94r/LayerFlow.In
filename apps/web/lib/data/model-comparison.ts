import {
  MODELS as REGISTRY_MODELS,
  PROVIDERS,
  type Provider,
} from "@layerflow/model-registry";

/**
 * SEO price-comparison data, derived from @layerflow/model-registry — the same
 * catalog the API + gateway ship from. Prices are provider list prices in USD
 * per 1 M tokens; this page is read-only.
 */

export const PROVIDER_LABEL: Record<Provider, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
  deepseek: "DeepSeek",
  groq: "Groq",
  xai: "xAI",
  kimi: "Moonshot",
  openrouter: "OpenRouter",
  opencode: "OpenCode Zen",
};

export const PROVIDER_BADGE_COLOR: Record<Provider, string> = {
  openai: "bg-emerald-500",
  anthropic: "bg-orange-500",
  google: "bg-violet-500",
  deepseek: "bg-blue-600",
  groq: "bg-red-500",
  xai: "bg-zinc-600",
  kimi: "bg-amber-500",
  openrouter: "bg-purple-500",
  opencode: "bg-cyan-600",
};

export interface PriceRow {
  id: string;
  provider: Provider;
  providerLabel: string;
  displayName: string;
  inputUSD: number;
  outputUSD: number;
  cachedInputUSD: number | null;
  contextWindow: number;
  maxOutputTokens: number | null;
  toolCalling: boolean;
  vision: boolean;
  reasoning: boolean;
}

function microToUsd(micro: number): number {
  return micro / 1_000_000;
}

export const PRICE_ROWS: PriceRow[] = REGISTRY_MODELS.map((m) => ({
  id: m.id,
  provider: m.provider,
  providerLabel: PROVIDER_LABEL[m.provider],
  displayName: m.displayName,
  inputUSD: microToUsd(m.inputPricePerMTokMicro),
  outputUSD: microToUsd(m.outputPricePerMTokMicro),
  cachedInputUSD:
    m.cachedInputPricePerMTokMicro == null
      ? null
      : microToUsd(m.cachedInputPricePerMTokMicro),
  contextWindow: m.contextWindow,
  maxOutputTokens: m.maxOutputTokens ?? null,
  toolCalling: m.capabilities.toolCalling,
  vision: m.capabilities.vision,
  reasoning: m.capabilities.reasoning,
}));

export const PROVIDER_ROWS = PROVIDERS.map((provider) => ({
  provider,
  label: PROVIDER_LABEL[provider],
  color: PROVIDER_BADGE_COLOR[provider],
  models: PRICE_ROWS.filter((r) => r.provider === provider),
})).filter((p) => p.models.length > 0);

export function sortByInputCost(rows: PriceRow[]): PriceRow[] {
  return [...rows].sort((a, b) => a.inputUSD - b.inputUSD);
}

export function sortByContext(rows: PriceRow[]): PriceRow[] {
  return [...rows].sort((a, b) => b.contextWindow - a.contextWindow);
}

/** USD price for a full 1 M input + 1 M output round trip. */
export function roundTripUSD(row: PriceRow): number {
  return row.inputUSD + row.outputUSD;
}

export type PriceClass = "cheap" | "balanced" | "flagship";

export function classForRow(row: PriceRow): PriceClass {
  if (row.inputUSD <= 0.3) return "cheap";
  if (row.inputUSD <= 0.8) return "balanced";
  return "flagship";
}

export function formatUsd(value: number): string {
  if (value >= 100) return `$${value.toFixed(0)}`;
  if (value >= 1) return `$${value.toFixed(2)}`;
  return `$${value.toFixed(2)}`;
}

export function formatContext(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(0)}k`;
  return `${tokens}`;
}