import type { AiTool, ModelInfo, ModelClass } from "@/lib/types";
import {
  MODELS as REGISTRY_MODELS,
  computeCostMicro,
  type ModelInfo as RegistryModel,
  type Provider as RegistryProvider,
} from "@layerflow/model-registry";

// ── AI tool brand metadata ───────────────────────────────────

export interface AiToolMeta {
  id: AiTool;
  label: string;
  color: string;
  brand: string;
}

export const AI_TOOLS: Record<AiTool, AiToolMeta> = {
  chatgpt: {
    id: "chatgpt",
    label: "ChatGPT",
    color: "#10a37f",
    brand: "ChatGPT",
  },
  claude: {
    id: "claude",
    label: "Claude",
    color: "#d97757",
    brand: "Claude",
  },
  gemini: {
    id: "gemini",
    label: "Gemini",
    color: "#8b7cf8",
    brand: "Gemini",
  },
  deepseek: {
    id: "deepseek",
    label: "DeepSeek",
    color: "#4d6bfe",
    brand: "DeepSeek",
  },
  kimi: {
    id: "kimi",
    label: "Kimi",
    color: "#f7c948",
    brand: "Kimi",
  },
  groq: {
    id: "groq",
    label: "Groq",
    color: "#f55036",
    brand: "Groq",
  },
  grok: {
    id: "grok",
    label: "xAI (Grok)",
    color: "#26282b",
    brand: "Grok",
  },
  openrouter: {
    id: "openrouter",
    label: "OpenRouter",
    color: "#8b5cf6",
    brand: "OpenRouter",
  },
  perplexity: {
    id: "perplexity",
    label: "Perplexity",
    color: "#20b8cd",
    brand: "Perplexity",
  },
  generic: {
    id: "generic",
    label: "AI Chat",
    color: "#9ca3ab",
    brand: "AI Chat",
  },
};

export function toolMeta(tool: AiTool): AiToolMeta {
  return AI_TOOLS[tool] ?? AI_TOOLS.generic;
}

// ── Model catalog — derived from @layerflow/model-registry (single source of
// truth shared with the API + gateway; never hand-maintained here). The API
// keeps a versioned model_pricing table for effective-dated overrides. ──────

const REGISTRY_PROVIDER_LABELS: Record<RegistryProvider, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
  deepseek: "DeepSeek",
  groq: "Groq",
  xai: "xAI",
  kimi: "Moonshot",
  openrouter: "OpenRouter",
};

/** Relative-speed heuristic per host (Groq is the speed king). */
const PROVIDER_SPEED: Record<RegistryProvider, number> = {
  groq: 10,
  google: 8,
  openai: 6,
  deepseek: 6,
  kimi: 6,
  xai: 5,
  anthropic: 4,
  openrouter: 5,
};

const BEST_FOR: Record<string, string> = {
  "gpt-4o": "General-purpose reasoning with tools and vision",
  "gpt-4o-mini": "High-volume everyday tasks at low cost",
  "gpt-4.1": "Long-context coding and agentic work",
  "gpt-4.1-mini": "Cheap long-context coding",
  "o3-mini": "Step-by-step reasoning on a budget",
  "claude-sonnet-4": "Best-in-class coding and careful analysis",
  "claude-opus-4": "Hardest reasoning and long-form writing",
  "claude-3-5-haiku": "Fast summaries, classification, drafts",
  "gemini-2.5-pro": "Long-context reasoning (1M+ tokens)",
  "gemini-flash-latest": "Summaries, extraction, cheap continuations",
  "deepseek-chat": "Cheap coding and reasoning",
  "deepseek-reasoner": "Deep chain-of-thought problems",
  "llama-3.3-70b-versatile": "Speed-critical interactive tasks",
  "openai/gpt-oss-120b": "Strong open-weight model at Groq speed",
  "openai/gpt-oss-20b": "Cheapest open-weight route for simple work",
  "grok-3": "Fast reasoning, coding, current-events answers",
  "grok-3-mini": "Cheap fast reasoning for everyday tasks",
  "kimi-k2": "Agentic tasks, large context, long chats",
  "kimi-k2-thinking": "Agentic work with visible reasoning",
};

function classForPrice(inputMicroPerMTok: number): ModelClass {
  if (inputMicroPerMTok <= 300_000) return "cheap";
  if (inputMicroPerMTok <= 800_000) return "balanced";
  return "flagship";
}

/** Display quality band per class — a UI heuristic, not a benchmark claim. */
const QUALITY_BY_CLASS: Record<ModelClass, number> = {
  cheap: 84,
  balanced: 90,
  flagship: 96,
};

function toUiModel(m: RegistryModel): ModelInfo {
  const cls = classForPrice(m.inputPricePerMTokMicro);
  return {
    id: m.id,
    provider: REGISTRY_PROVIDER_LABELS[m.provider],
    name: m.displayName,
    class: cls,
    quality: QUALITY_BY_CLASS[cls],
    costIn: m.inputPricePerMTokMicro / 1_000_000,
    costOut: m.outputPricePerMTokMicro / 1_000_000,
    speed: PROVIDER_SPEED[m.provider] ?? 5,
    bestFor: BEST_FOR[m.id] ?? "General chat and analysis",
    supportsByok: true,
  };
}

export const MODELS: ModelInfo[] = REGISTRY_MODELS.map(toUiModel);

export const MODEL_BY_ID = Object.fromEntries(MODELS.map((m) => [m.id, m]));

/** Human labels for backend provider slugs shown in Rescue reports / Cost. */
export const PROVIDER_SLUG_LABELS: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google Gemini",
  deepseek: "DeepSeek",
  groq: "Groq",
  xai: "xAI (Grok)",
  kimi: "Kimi (Moonshot)",
  openrouter: "OpenRouter",
};

/** Back-compat alias — existing imports read PROVIDER_LABELS. */
export const PROVIDER_LABELS = PROVIDER_SLUG_LABELS;

/** Model display names for the backend catalog (model-registry). */
export const RESCUE_MODEL_NAMES: Record<string, string> = Object.fromEntries(
  REGISTRY_MODELS.map((m) => [m.id, m.displayName]),
);

// ── Helpers ──────────────────────────────────────────────────

export function formatMoney(value: number): string {
  if (value >= 100) return `$${value.toFixed(0)}`;
  if (value >= 1) return `$${value.toFixed(2)}`;
  if (value >= 0.01) return `$${value.toFixed(2)}`;
  return `$${value.toFixed(3)}`;
}

export function formatTokens(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
  return `${value}`;
}

export function estimateCost(modelId: string, tokensIn: number, tokensOut: number): number {
  const micro = computeCostMicro(modelId, tokensIn, tokensOut);
  if (micro == null) {
    const m = MODEL_BY_ID[modelId];
    if (!m) return 0;
    return (tokensIn / 1_000_000) * m.costIn + (tokensOut / 1_000_000) * m.costOut;
  }
  return micro / 1_000_000;
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return mins <= 1 ? "just now" : `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}
