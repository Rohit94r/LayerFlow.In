export type DomainId =
  | "marketing"
  | "coding"
  | "study"
  | "business"
  | "research"
  | "resume"
  | "clients"
  | "school"
  | "personal";

export interface Domain {
  id: DomainId;
  name: string;
  description: string;
  icon: string;
  color: string;
  projectCount: number;
  promptCount: number;
}

export interface Project {
  id: string;
  domainId: DomainId;
  name: string;
  description: string;
  folderCount: number;
  promptCount: number;
  updatedAt: string;
  archived?: boolean;
}

export interface Folder {
  id: string;
  projectId: string;
  name: string;
  promptCount: number;
}

export interface PromptVariable {
  name: string;
  defaultValue?: string;
  description?: string;
}

export interface PromptAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
}

export interface PromptVersion {
  id: string;
  version: number;
  content: string;
  model: string;
  provider: string;
  cost: number;
  tokensIn: number;
  tokensOut: number;
  output: string;
  createdAt: string;
  note?: string;
}

export interface Prompt {
  id: string;
  projectId: string;
  folderId?: string;
  domainId: DomainId;
  title: string;
  description?: string;
  content: string;
  tags: string[];
  favorite: boolean;
  variables: PromptVariable[];
  versions: PromptVersion[];
  notes?: string;
  attachments?: PromptAttachment[];
  model: string;
  provider: string;
  cost: number;
  tokensIn: number;
  tokensOut: number;
  updatedAt: string;
  createdAt: string;
}

export interface PromptSession {
  id: string;
  title: string;
  description?: string;
  domainId: DomainId;
  projectId?: string;
  promptIds: string[];
  status: "active" | "completed" | "paused";
  totalCost: number;
  totalTokens: number;
  createdAt: string;
  updatedAt: string;
}

export interface CompareResult {
  model: string;
  provider: string;
  output: string;
  cost: number;
  latencyMs: number;
  tokensIn: number;
  tokensOut: number;
  qualityScore?: number;
}

export interface Budget {
  monthlyLimit: number;
  dailyLimit: number;
  spent: number;
  dailySpent: number;
  remaining: number;
  percentUsed: number;
  blocked: boolean;
  alertThreshold: number;
  resetDate: string;
}

export interface ProjectBudget {
  projectId: string;
  projectName: string;
  limit: number;
  spent: number;
  percentUsed: number;
}

export interface KeyBudget {
  keyId: string;
  keyName: string;
  limit: number;
  spent: number;
  percentUsed: number;
}

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  projectId?: string;
  createdAt: string;
  lastUsed?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatarInitials: string;
  plan: "free" | "pro";
}

export interface GatewayConfig {
  baseUrl: string;
  apiKey: string;
  defaultModel: string;
}

export type ExecutionMode =
  | "manual"
  | "suggest"
  | "auto-cheapest"
  | "auto-fastest"
  | "auto-best"
  | "auto-balanced";

export interface WorkspaceSettings {
  preferCheap: boolean;
  executionMode: ExecutionMode;
  defaultModel: string;
}

export interface RoutingRule {
  id: string;
  condition: string;
  model: string;
  enabled: boolean;
}

export interface PromptAnalysis {
  estimatedTokensIn: number;
  estimatedTokensOut: number;
  estimatedCost: number;
  recommended: {
    model: string;
    provider: string;
    qualityPercent: number;
    cheaperPercent: number;
    label: string;
  };
  alternative: {
    model: string;
    provider: string;
    label: string;
  };
  why: string[];
  taskType: string;
}

export interface ActivityItem {
  id: string;
  type: "prompt_saved" | "compare_run" | "session_started" | "budget_alert" | "cache_hit";
  title: string;
  description?: string;
  timestamp: string;
  meta?: string;
}

export interface DashboardStats {
  todayPrompts: number;
  totalProjects: number;
  totalPrompts: number;
  monthlyCost: number;
  cacheSaved: number;
  mostUsedModel: string;
  modelUsage: { model: string; count: number; cost: number }[];
}

export interface PromptSpendItem {
  promptId: string;
  title: string;
  projectName: string;
  totalCost: number;
  runCount: number;
  lastModel: string;
}

export type NavItem = {
  href: string;
  label: string;
  icon: string;
};
