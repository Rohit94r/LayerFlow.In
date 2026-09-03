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

/**
 * Static model list used as fallback when /api/models is unreachable.
 * The UI should prefer loading models from the live /api/models endpoint.
 */
export const FALLBACK_PICKER_MODELS: PickerModel[] = [
  { id: "auto", provider: "auto", label: "Auto (best available)", auto: true },
  { id: "gpt-4o-mini", provider: "openai", label: "GPT-4o mini", kind: "cheap" },
  { id: "gpt-4o", provider: "openai", label: "GPT-4o", kind: "balanced" },
  { id: "gemini-flash-latest", provider: "google", label: "Gemini Flash", kind: "cheap" },
  { id: "gemini-2.5-pro", provider: "google", label: "Gemini 2.5 Pro", kind: "flagship" },
  { id: "claude-sonnet-4", provider: "anthropic", label: "Claude Sonnet 4", kind: "flagship" },
  { id: "claude-3-5-haiku", provider: "anthropic", label: "Claude 3.5 Haiku", kind: "cheap" },
  { id: "deepseek-chat", provider: "deepseek", label: "DeepSeek Chat", kind: "cheap" },
  { id: "openai/gpt-oss-120b", provider: "groq", label: "GPT-OSS 120B (Groq)", kind: "cheap" },
  { id: "grok-3-mini", provider: "xai", label: "Grok 3 mini", kind: "cheap" },
  { id: "grok-3", provider: "xai", label: "Grok 3", kind: "flagship" },
  { id: "kimi-k2", provider: "kimi", label: "Kimi K2", kind: "balanced" },
];

/**
 * Dynamically resolve the picker model list.
 *
 * In browser environments, this fetches from /api/models to get the
 * live model catalog with availability status. Falls back to the static
 * list when the network is unavailable or the request fails.
 *
 * On the server side or when the API is unreachable, returns the fallback list.
 */
let cachedModels: PickerModel[] | null = null;
let lastFetch = 0;
const CACHE_TTL_MS = 60_000;

export async function getPickerModels(): Promise<PickerModel[]> {
  // Return cached models if still valid
  if (cachedModels && Date.now() - lastFetch < CACHE_TTL_MS) {
    return cachedModels;
  }

  // Attempt to fetch from the live API endpoint
  try {
    const baseUrl = typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_API_URL ?? "";

    const res = await fetch(`${baseUrl}/api/models`, {
      signal: AbortSignal.timeout(5_000),
    });

    if (!res.ok) {
      throw new Error(`API returned ${res.status}`);
    }

    const data = await res.json() as { models: Array<{
      id: string;
      provider: string;
      displayName: string;
      available: boolean;
      contextWindow: number;
    }> };

    if (!data.models || !Array.isArray(data.models)) {
      throw new Error("Invalid API response");
    }

    // Transform API response to picker format, filtering out unavailable models
    const models: PickerModel[] = [
      { id: "auto", provider: "auto", label: "Auto (best available)", auto: true },
      ...data.models
        .filter((m) => m.available)
        .map((m) => ({
          id: m.id,
          provider: m.provider,
          label: m.displayName,
          kind: classifyModel(m.id, m.contextWindow),
        })),
    ];

    cachedModels = models;
    lastFetch = Date.now();
    return models;
  } catch {
    // Network or parsing error — return fallback
    return FALLBACK_PICKER_MODELS;
  }
}

/**
 * Classify a model into cheap/balanced/flagship based on its ID and context window.
 */
function classifyModel(modelId: string, contextWindow: number): "cheap" | "balanced" | "flagship" {
  const id = modelId.toLowerCase();

  // Flagship models
  if (
    id.includes("sonnet") ||
    id.includes("opus") ||
    id.includes("pro") && (id.includes("gemini") || id.includes("claude")) ||
    contextWindow >= 128_000 && (id.includes("gpt-4") || id.includes("claude") || id.includes("gemini"))
  ) {
    return "flagship";
  }

  // Cheap models
  if (
    id.includes("mini") ||
    id.includes("flash") ||
    id.includes("haiku") ||
    id.includes("small") ||
    id.includes("light") ||
    contextWindow <= 32_000
  ) {
    return "cheap";
  }

  // Default to balanced
  return "balanced";
}

/**
 * Synchronous fallback for cases where async getPickerModels() can't be used.
 */
export const PICKER_MODELS: PickerModel[] = FALLBACK_PICKER_MODELS;

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