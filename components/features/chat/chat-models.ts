import type { ChatKeyHealth } from "@layerflow/contracts";
import { PROVIDER_LABELS } from "@/lib/data/providers";

/**
 * Models offered by the chat model picker. "auto" delegates to the backend
 * router (first provider with a usable key, with failover down the chain).
 */
export interface PickerModel {
  id: string;
  provider: string;
  label: string;
  kind?: "cheap" | "balanced" | "flagship";
  auto?: boolean;
}

export const PICKER_MODELS: PickerModel[] = [
  { id: "auto", provider: "auto", label: "Auto (best available)", auto: true },
  { id: "gpt-4o-mini", provider: "openai", label: "GPT-4o mini", kind: "cheap" },
  { id: "gpt-4o", provider: "openai", label: "GPT-4o", kind: "balanced" },
  { id: "gemini-flash-latest", provider: "google", label: "Gemini Flash", kind: "cheap" },
  { id: "gemini-2.5-pro", provider: "google", label: "Gemini 2.5 Pro", kind: "flagship" },
  { id: "claude-sonnet-4", provider: "anthropic", label: "Claude Sonnet 4", kind: "flagship" },
  { id: "claude-3-5-haiku", provider: "anthropic", label: "Claude 3.5 Haiku", kind: "cheap" },
  { id: "deepseek-chat", provider: "deepseek", label: "DeepSeek Chat", kind: "cheap" },
  { id: "llama-3.3-70b-versatile", provider: "groq", label: "Llama 3.3 70B (Groq)", kind: "cheap" },
  { id: "grok-3-mini", provider: "xai", label: "Grok 3 mini", kind: "cheap" },
  { id: "grok-3", provider: "xai", label: "Grok 3", kind: "flagship" },
  { id: "kimi-k2", provider: "kimi", label: "Kimi K2", kind: "balanced" },
];

export function providerLabel(provider: string): string {
  return PROVIDER_LABELS[provider] ?? provider;
}

/** Health lookup: worst-case status for a provider across its entries. */
export function providerStatus(
  health: ChatKeyHealth[],
  provider: string,
): ChatKeyHealth["status"] {
  const entries = health.filter((h) => h.provider === provider);
  if (entries.length === 0) return "missing";
  const rank: Record<string, number> = {
    healthy: 0,
    degrading: 1,
    expired: 2,
    dead: 3,
    missing: 4,
  };
  return entries.reduce((worst, e) =>
    rank[e.status] > rank[worst.status] ? e : worst,
  ).status;
}

export const STATUS_META: Record<
  ChatKeyHealth["status"],
  { label: string; dot: string; text: string }
> = {
  healthy: { label: "Works", dot: "bg-emerald-400", text: "text-emerald-500" },
  degrading: { label: "Rate-limited", dot: "bg-amber-400", text: "text-amber-400" },
  expired: { label: "Quota out", dot: "bg-rose-400", text: "text-rose-400" },
  dead: { label: "Key invalid", dot: "bg-rose-400", text: "text-rose-400" },
  missing: { label: "No key", dot: "bg-zinc-500", text: "text-faint" },
};

export type ClientHealth = ChatKeyHealth;