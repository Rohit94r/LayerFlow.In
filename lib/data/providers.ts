import type { AiTool, ModelInfo, ProviderKey, ModelClass } from "@/lib/types";

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
    name: "Gemini 2.5 Flash",
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
    id: "groq-llama",
    provider: "Groq",
    name: "Llama 4 Maverick",
    class: cl,
    quality: 79,
    costIn: 0.3,
    costOut: 0.6,
    speed: 10,
    bestFor: "Speed-critical interactive tasks",
    supportsByok: true,
  },
];

export const MODEL_BY_ID = Object.fromEntries(MODELS.map((m) => [m.id, m]));

// ── BYOK vault (mock) ────────────────────────────────────────

export const PROVIDER_KEYS: ProviderKey[] = [
  { provider: "Anthropic", label: "Anthropic API", status: "connected", addedAt: "Jul 12, 2026", lastUsed: "2h ago" },
  { provider: "OpenAI", label: "OpenAI API", status: "connected", addedAt: "Jun 30, 2026", lastUsed: "1d ago" },
  { provider: "Google", label: "Gemini API", status: "connected", addedAt: "Jul 2, 2026", lastUsed: "4h ago" },
  { provider: "DeepSeek", label: "DeepSeek API", status: "connected", addedAt: "Jul 20, 2026", lastUsed: "6d ago" },
  { provider: "Moonshot", label: "Kimi API", status: "needs_attention", addedAt: "Jul 8, 2026", lastUsed: "3w ago" },
  { provider: "Groq", label: "Groq API", status: "not_added" },
  { provider: "OpenRouter", label: "OpenRouter", status: "not_added" },
];

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
