import type { AiTool, ModelInfo, ModelClass } from "@/lib/types";

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

// ── Model registry (mock price sheet) ────────────────────────

const cl: ModelClass = "cheap";
const ba: ModelClass = "balanced";
const fl: ModelClass = "flagship";

export const MODELS: ModelInfo[] = [
  {
    id: "claude-opus",
    provider: "Anthropic",
    name: "Claude Opus 4.5",
    class: fl,
    quality: 97,
    costIn: 5.0,
    costOut: 25.0,
    speed: 3,
    bestFor: "Hard reasoning, long-form writing, complex analysis",
    supportsByok: true,
  },
  {
    id: "claude-sonnet",
    provider: "Anthropic",
    name: "Claude Sonnet 4.5",
    class: ba,
    quality: 92,
    costIn: 3.0,
    costOut: 15.0,
    speed: 5,
    bestFor: "Balanced reasoning and writing quality",
    supportsByok: true,
  },
  {
    id: "claude-haiku",
    provider: "Anthropic",
    name: "Claude Haiku 4.5",
    class: cl,
    quality: 82,
    costIn: 1.0,
    costOut: 5.0,
    speed: 8,
    bestFor: "Fast summaries, classification, drafts",
    supportsByok: true,
  },
  {
    id: "gpt-5",
    provider: "OpenAI",
    name: "GPT-5",
    class: fl,
    quality: 94,
    costIn: 1.25,
    costOut: 10.0,
    speed: 4,
    bestFor: "Reasoning-heavy tasks with tools",
    supportsByok: true,
  },
  {
    id: "gpt-5-mini",
    provider: "OpenAI",
    name: "GPT-5 Mini",
    class: cl,
    quality: 84,
    costIn: 0.25,
    costOut: 2.0,
    speed: 7,
    bestFor: "High-volume, simple tasks",
    supportsByok: true,
  },
  {
    id: "gemini-flash",
    provider: "Google",
    name: "Gemini Flash",
    class: cl,
    quality: 86,
    costIn: 0.3,
    costOut: 2.5,
    speed: 9,
    bestFor: "Summaries, extraction, cheap continuations",
    supportsByok: true,
  },
  {
    id: "gemini-pro",
    provider: "Google",
    name: "Gemini 2.5 Pro",
    class: fl,
    quality: 95,
    costIn: 1.25,
    costOut: 10.0,
    speed: 4,
    bestFor: "Long-context reasoning (1M+ tokens)",
    supportsByok: true,
  },
  {
    id: "deepseek-v3",
    provider: "DeepSeek",
    name: "DeepSeek V3.2",
    class: cl,
    quality: 88,
    costIn: 0.27,
    costOut: 1.1,
    speed: 6,
    bestFor: "Cheap coding and reasoning",
    supportsByok: true,
  },
  {
    id: "kimi-k2",
    provider: "Moonshot",
    name: "Kimi K2",
    class: ba,
    quality: 89,
    costIn: 0.6,
    costOut: 2.5,
    speed: 6,
    bestFor: "Agentic tasks, large context, long chats",
    supportsByok: true,
  },
  {
    id: "grok-3",
    provider: "xAI",
    name: "Grok 3",
    class: fl,
    quality: 93,
    costIn: 3.0,
    costOut: 15.0,
    speed: 5,
    bestFor: "Fast reasoning, coding, real-time answers",
    supportsByok: true,
  },
  {
    id: "grok-3-mini",
    provider: "xAI",
    name: "Grok 3 mini",
    class: cl,
    quality: 86,
    costIn: 0.3,
    costOut: 0.5,
    speed: 8,
    bestFor: "Cheap fast reasoning for everyday tasks",
    supportsByok: true,
  },
  {
    id: "llama-3.3-70b-versatile",
    provider: "Groq",
    name: "Llama 3.3 70B (Groq)",
    class: cl,
    quality: 82,
    costIn: 0.59,
    costOut: 0.79,
    speed: 10,
    bestFor: "Speed-critical interactive tasks",
    supportsByok: true,
  },
];

export const MODEL_BY_ID = Object.fromEntries(MODELS.map((m) => [m.id, m]));

/** Human labels for backend provider slugs shown in Rescue reports / Cost. */
export const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google Gemini",
  deepseek: "DeepSeek",
  groq: "Groq",
  xai: "xAI (Grok)",
  kimi: "Kimi (Moonshot)",
  openrouter: "OpenRouter",
};

/** Model display names for the backend model catalog (model-registry). */
export const RESCUE_MODEL_NAMES: Record<string, string> = {
  "gpt-4o": "GPT-4o",
  "gpt-4o-mini": "GPT-4o mini",
  "claude-sonnet-4": "Claude Sonnet 4",
  "claude-3-5-haiku": "Claude 3.5 Haiku",
  "gemini-flash-latest": "Gemini Flash",
  "deepseek-chat": "DeepSeek V3 (chat)",
  "llama-3.3-70b-versatile": "Llama 3.3 70B (Groq)",
  "grok-3-mini": "Grok 3 mini",
  "kimi-k2": "Kimi K2",
};

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
  const m = MODEL_BY_ID[modelId];
  if (!m) return 0;
  return (tokensIn / 1_000_000) * m.costIn + (tokensOut / 1_000_000) * m.costOut;
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
