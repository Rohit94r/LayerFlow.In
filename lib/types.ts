// ─────────────────────────────────────────────────────────────
// LayerFlow — Core domain types
// The AI Coding Platform — web + terminal, rescue workflow
// ─────────────────────────────────────────────────────────────

export type AiTool =
  | "chatgpt"
  | "claude"
  | "gemini"
  | "deepseek"
  | "kimi"
  | "groq"
  | "grok"
  | "openrouter"
  | "perplexity"
  | "generic";

export type PlanId = "free" | "starter" | "pro";

// ── Rescue Context ───────────────────────────────────────────

/** AI-extracted conversation summary carried by a rescue report. */
export interface RescueContext {
  goal: string;
  currentState: string;
  decisions: string[];
  constraints: string[];
  failures: string[];
  successes: string[];
  missingInfo: string[];
  outputFormat: string;
  nextAction: string;
}

// ── Rescue Report ────────────────────────────────────────────

export interface CostEstimate {
  modelId: string;
  provider: string;
  model: string;
  class: "flagship" | "balanced" | "cheap";
  inputTokens: number;
  outputTokens: number;
  cost: number;
  latency: string;
  recommended: boolean;
}

export interface PromptScoreAxis {
  label: string;
  value: number; // 0-100
}

export interface ContextDiff {
  kept: string[];
  removed: string[];
  unsure: string[];
}

export interface RescueReport {
  id: string;
  title: string;
  status: "queued" | "running" | "completed" | "failed";
  errorMessage?: string;
  sourceTool: AiTool;
  sourceModel: string;
  createdAt: string;
  originalWords: number;
  compressedWords: number;
  compressionPercent: number;
  summary: string;
  context: RescueContext;
  improvedPrompt: string;
  promptScore: number;
  promptScores: PromptScoreAxis[];
  diff: ContextDiff;
  costs: CostEstimate[];
  recommendedModelId: string;
  recommendedReason: string;
  continuePack: { label: string; value: string }[];
  saved: boolean;
  projectId?: string;
  feedback?: "worked" | "missing" | "long" | "model" | "prompt";
}

// ── Prompt Library ───────────────────────────────────────────

export interface Prompt {
  id: string;
  title: string;
  description: string;
  content: string;
  originalContent?: string;
  score: number;
  tags: string[];
  model: string;
  version: number;
  favorite: boolean;
  usageCount: number;
  /** Where the prompt came from: manual, imported from chat, or an Improve run. */
  source: "manual" | "chat" | "improve";
  createdAt: string;
  updatedAt: string;
  sourceTool?: AiTool;
}

// ── Workspace ────────────────────────────────────────────────

export interface Project {
  id: string;
  name: string;
  description: string;
  color: string;
  promptCount: number;
  learningCount: number;
  updatedAt: string;
  createdAt: string;
  stage: "active" | "paused" | "done";
}

export type TimelineEventType =
  | "rescue"
  | "prompt"
  | "learning"
  | "cost"
  | "model"
  | "decision";

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  title: string;
  description: string;
  timestamp: string;
  meta?: string;
  projectId?: string;
}

export interface Learning {
  id: string;
  content: string;
  source: string;
  tags: string[];
  createdAt: string;
  projectId?: string;
  pinned: boolean;
}

// ── Models & BYOK ────────────────────────────────────────────

export type ModelClass = "flagship" | "balanced" | "cheap";

export interface ModelInfo {
  id: string;
  provider: string;
  name: string;
  class: ModelClass;
  quality: number; // 0-100
  costIn: number; // USD per 1M input tokens
  costOut: number; // USD per 1M output tokens
  speed: number; // relative, higher = faster
  bestFor: string;
  supportsByok: boolean;
}

export interface ProviderKey {
  id: string;
  provider: string;
  label: string;
  status: "connected" | "needs_attention" | "not_added";
  /** Last 4 chars of the secret — the only plaintext the API stores. */
  keyHint?: string;
  addedAt?: string;
  lastUsed?: string;
}

/** LayerFlow platform key (lf_live_...) — used by the CLI/gateway, like opencode's hosted key. */
export interface PlatformKey {
  id: string;
  name: string;
  /** Display prefix, e.g. "lf_live_ab12..." — never the full secret. */
  prefix: string;
  projectId?: string;
  createdAt: string;
  lastUsed?: string;
}

export interface ModelSuggestion {
  modelId: string;
  reason: string;
  alternativeModelId: string;
  alternativeReason: string;
  savingsPercent: number;
  costPerRun: number;
  tokensPerRun: number;
  confidence: number;
}

// ── Cost Analytics ───────────────────────────────────────────

export interface CostPoint {
  label: string;
  value: number;
}

export interface ModelSpend {
  modelId: string;
  provider: string;
  model: string;
  spend: number;
  runs: number;
  tokensIn: number;
  tokensOut: number;
}

export interface CostAnalytics {
  monthlySpend: number;
  monthlySavings: number;
  budgetLimit: number;
  averageRunCost: number;
  byModel: CostPoint[];
  savingsByMonth: CostPoint[];
  spendByModel: ModelSpend[];
  /** USD spend per day for the last 7 days, oldest first. */
  dailySpend?: number[];
}

export interface SavingsSummary {
  period: string;
  actualCost: number;
  optimizedCost: number;
  saved: number;
  tokensSaved: number;
  source: string;
}

// ── Dashboard ────────────────────────────────────────────────

export interface DashboardStats {
  todayUsage: number; // dollars spent estimate
  todayUsageDelta: number; // percent vs yesterday
  moneySaved: number;
  moneySavedDelta: number;
  contextsSaved: number;
  contextsSavedDelta: number;
  continuePacks: number;
  continuePacksDelta: number;
  weeklyUsage: CostPoint[];
  weeklySavings: CostPoint[];
  modelMix: { provider: string; value: number }[];
}

// ── Marketing ────────────────────────────────────────────────

export interface Plan {
  id: PlanId;
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  href: string;
  highlighted: boolean;
  badge?: string;
}

export interface Testimonial {
  quote: string;
  name: string;
  role: string;
  initials: string;
  color: string;
  photo?: string;
  highlights?: string[];
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface RoadmapPhase {
  phase: string;
  title: string;
  description: string;
  status: "live" | "building" | "planned";
  items: string[];
}

export interface UseCase {
  title: string;
  description: string;
  example: string;
  icon: string;
}
