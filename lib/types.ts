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
  title: string;
  content: string;
  tags: string[];
  favorite: boolean;
  versions: PromptVersion[];
  updatedAt: string;
  createdAt: string;
}

export interface CompareResult {
  model: string;
  provider: string;
  output: string;
  cost: number;
  latencyMs: number;
  tokensIn: number;
  tokensOut: number;
}

export interface Budget {
  monthlyLimit: number;
  spent: number;
  remaining: number;
  percentUsed: number;
  blocked: boolean;
  alertThreshold: number;
  resetDate: string;
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

export type NavItem = {
  href: string;
  label: string;
  icon: string;
};
