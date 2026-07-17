import type {
  ApiKey,
  Budget,
  CompareResult,
  Domain,
  Folder,
  GatewayConfig,
  Project,
  Prompt,
  User,
} from "./types";

export const demoUser: User = {
  id: "user_1",
  name: "Alex Chen",
  email: "alex@layerflow.dev",
  avatarInitials: "AC",
  plan: "pro",
};

export const domains: Domain[] = [
  {
    id: "coding",
    name: "Coding",
    description: "Dev prompts, debugging, and code generation",
    icon: "Code2",
    color: "#44edbc",
    projectCount: 4,
    promptCount: 28,
  },
  {
    id: "marketing",
    name: "Marketing",
    description: "Copy, SEO, social, and campaign ideas",
    icon: "Megaphone",
    color: "#f59e0b",
    projectCount: 2,
    promptCount: 14,
  },
  {
    id: "study",
    name: "Study",
    description: "Learning, summaries, and exam prep",
    icon: "GraduationCap",
    color: "#60a5fa",
    projectCount: 3,
    promptCount: 19,
  },
  {
    id: "business",
    name: "Business",
    description: "Strategy, ops, and decision support",
    icon: "Briefcase",
    color: "#a78bfa",
    projectCount: 2,
    promptCount: 11,
  },
  {
    id: "research",
    name: "Research",
    description: "Literature review and analysis",
    icon: "Microscope",
    color: "#f472b6",
    projectCount: 1,
    promptCount: 8,
  },
  {
    id: "resume",
    name: "Resume",
    description: "CV, cover letters, and interview prep",
    icon: "FileText",
    color: "#34d399",
    projectCount: 1,
    promptCount: 6,
  },
  {
    id: "clients",
    name: "Clients",
    description: "Client deliverables and proposals",
    icon: "Users",
    color: "#fb923c",
    projectCount: 2,
    promptCount: 9,
  },
  {
    id: "school",
    name: "School",
    description: "Assignments and coursework help",
    icon: "BookOpen",
    color: "#38bdf8",
    projectCount: 2,
    promptCount: 12,
  },
  {
    id: "personal",
    name: "Personal",
    description: "Side projects and experiments",
    icon: "Sparkles",
    color: "#e879f9",
    projectCount: 3,
    promptCount: 15,
  },
];

export const projects: Project[] = [
  {
    id: "proj_layerflow",
    domainId: "coding",
    name: "LayerFlow App",
    description: "Core product prompts and experiments",
    folderCount: 3,
    promptCount: 12,
    updatedAt: "2026-07-16T14:30:00Z",
  },
  {
    id: "proj_nextjs",
    domainId: "coding",
    name: "Next.js SaaS",
    description: "Boilerplate and feature prompts",
    folderCount: 2,
    promptCount: 8,
    updatedAt: "2026-07-14T09:15:00Z",
  },
  {
    id: "proj_api",
    domainId: "coding",
    name: "API Design",
    description: "REST and GraphQL patterns",
    folderCount: 1,
    promptCount: 5,
    updatedAt: "2026-07-10T18:00:00Z",
  },
  {
    id: "proj_launch",
    domainId: "marketing",
    name: "Product Launch",
    description: "Launch copy and landing pages",
    folderCount: 2,
    promptCount: 9,
    updatedAt: "2026-07-15T11:00:00Z",
  },
  {
    id: "proj_seo",
    domainId: "marketing",
    name: "SEO Content",
    description: "Blog posts and meta descriptions",
    folderCount: 1,
    promptCount: 5,
    updatedAt: "2026-07-08T16:45:00Z",
  },
  {
    id: "proj_ml",
    domainId: "study",
    name: "ML Fundamentals",
    description: "Concept explanations and exercises",
    folderCount: 2,
    promptCount: 11,
    updatedAt: "2026-07-12T20:30:00Z",
  },
];

export const folders: Folder[] = [
  { id: "fld_ui", projectId: "proj_layerflow", name: "UI Components", promptCount: 4 },
  { id: "fld_api", projectId: "proj_layerflow", name: "API Routes", promptCount: 3 },
  { id: "fld_prompts", projectId: "proj_layerflow", name: "Prompt Engineering", promptCount: 5 },
  { id: "fld_auth", projectId: "proj_nextjs", name: "Auth", promptCount: 3 },
  { id: "fld_billing", projectId: "proj_nextjs", name: "Billing", promptCount: 5 },
];

export const prompts: Prompt[] = [
  {
    id: "prompt_sidebar",
    projectId: "proj_layerflow",
    folderId: "fld_ui",
    title: "App Sidebar Navigation",
    content:
      "Design a responsive sidebar for an AI workspace app. Include nav items for Workspace, Projects, Prompts, Compare, Budget, Settings, and Gateway. Use dark theme with subtle borders.",
    tags: ["ui", "navigation", "react"],
    favorite: true,
    createdAt: "2026-07-01T10:00:00Z",
    updatedAt: "2026-07-16T14:30:00Z",
    versions: [
      {
        id: "v1",
        version: 1,
        content:
          "Create a sidebar with links to main sections of an AI prompt management app.",
        model: "gpt-4o",
        provider: "OpenAI",
        cost: 0.012,
        tokensIn: 45,
        tokensOut: 320,
        output:
          "Here's a basic sidebar structure with nav links and a user profile section at the bottom...",
        createdAt: "2026-07-01T10:00:00Z",
        note: "Initial draft",
      },
      {
        id: "v2",
        version: 2,
        content:
          "Design a responsive sidebar for an AI workspace app. Include nav items for Workspace, Projects, Prompts, Compare, Budget, Settings, and Gateway.",
        model: "claude-sonnet-4",
        provider: "Anthropic",
        cost: 0.018,
        tokensIn: 78,
        tokensOut: 480,
        output:
          "I'll create a polished sidebar with icon+label nav items, active state highlighting, and a collapsible mobile drawer...",
        createdAt: "2026-07-10T15:20:00Z",
        note: "Added responsive behavior",
      },
      {
        id: "v3",
        version: 3,
        content:
          "Design a responsive sidebar for an AI workspace app. Include nav items for Workspace, Projects, Prompts, Compare, Budget, Settings, and Gateway. Use dark theme with subtle borders.",
        model: "gpt-4o",
        provider: "OpenAI",
        cost: 0.021,
        tokensIn: 92,
        tokensOut: 540,
        output:
          "Final sidebar design with dark theme tokens, border-subtle styling, budget meter widget, and domain quick-switch...",
        createdAt: "2026-07-16T14:30:00Z",
        note: "Dark theme polish",
      },
    ],
  },
  {
    id: "prompt_budget",
    projectId: "proj_layerflow",
    folderId: "fld_ui",
    title: "Hard Budget Meter UI",
    content:
      "Build a budget meter component showing monthly spend, remaining balance, progress bar, and blocked state when limit exceeded.",
    tags: ["ui", "budget", "cost"],
    favorite: true,
    createdAt: "2026-07-05T08:00:00Z",
    updatedAt: "2026-07-14T11:00:00Z",
    versions: [
      {
        id: "v1",
        version: 1,
        content: "Create a progress bar showing AI spend vs monthly budget.",
        model: "gpt-4o-mini",
        provider: "OpenAI",
        cost: 0.003,
        tokensIn: 32,
        tokensOut: 180,
        output: "Simple progress bar with percentage and dollar amounts...",
        createdAt: "2026-07-05T08:00:00Z",
      },
    ],
  },
  {
    id: "prompt_compare",
    projectId: "proj_layerflow",
    folderId: "fld_prompts",
    title: "Multi-Model Compare Panel",
    content:
      "Run the same prompt across GPT-4o, Claude Sonnet, Gemini Pro, and DeepSeek. Show output, cost, latency side by side.",
    tags: ["compare", "multi-model"],
    favorite: false,
    createdAt: "2026-07-08T12:00:00Z",
    updatedAt: "2026-07-12T16:00:00Z",
    versions: [
      {
        id: "v1",
        version: 1,
        content:
          "Run the same prompt across GPT-4o, Claude Sonnet, Gemini Pro, and DeepSeek.",
        model: "claude-sonnet-4",
        provider: "Anthropic",
        cost: 0.015,
        tokensIn: 55,
        tokensOut: 290,
        output: "Compare panel with 4 columns, each showing model output and metrics...",
        createdAt: "2026-07-08T12:00:00Z",
      },
    ],
  },
  {
    id: "prompt_api_route",
    projectId: "proj_layerflow",
    folderId: "fld_api",
    title: "OpenAI-Compatible Proxy Route",
    content:
      "Implement a Next.js API route that proxies /v1/chat/completions to multiple providers with cost tracking.",
    tags: ["api", "gateway"],
    favorite: false,
    createdAt: "2026-07-11T09:00:00Z",
    updatedAt: "2026-07-13T17:00:00Z",
    versions: [
      {
        id: "v1",
        version: 1,
        content: "Proxy chat completions to OpenAI with cost tracking.",
        model: "gpt-4o",
        provider: "OpenAI",
        cost: 0.028,
        tokensIn: 120,
        tokensOut: 650,
        output: "export async function POST(req) { ... }",
        createdAt: "2026-07-11T09:00:00Z",
      },
    ],
  },
  {
    id: "prompt_hero",
    projectId: "proj_launch",
    title: "Landing Hero Copy",
    content:
      "Write hero headline and subtitle for an AI workspace product. Emphasize prompts, compare, and hard budgets.",
    tags: ["copy", "landing"],
    favorite: true,
    createdAt: "2026-07-03T14:00:00Z",
    updatedAt: "2026-07-15T11:00:00Z",
    versions: [
      {
        id: "v1",
        version: 1,
        content: "Write hero copy for an AI prompt management tool.",
        model: "gpt-4o",
        provider: "OpenAI",
        cost: 0.008,
        tokensIn: 40,
        tokensOut: 150,
        output: "The Workspace for Everything You Do With AI...",
        createdAt: "2026-07-03T14:00:00Z",
      },
    ],
  },
];

export const compareResults: CompareResult[] = [
  {
    model: "gpt-4o",
    provider: "OpenAI",
    output:
      "LayerFlow is an AI workspace that helps you organize prompts, compare models, and control costs with hard budget limits.",
    cost: 0.014,
    latencyMs: 1240,
    tokensIn: 48,
    tokensOut: 42,
  },
  {
    model: "claude-sonnet-4",
    provider: "Anthropic",
    output:
      "Think of LayerFlow as your command center for AI work — save prompts, run side-by-side comparisons, and never exceed your budget.",
    cost: 0.019,
    latencyMs: 1580,
    tokensIn: 48,
    tokensOut: 38,
  },
  {
    model: "gemini-2.5-pro",
    provider: "Google",
    output:
      "LayerFlow centralizes prompt management with version history, multi-model testing, and enforced spending caps.",
    cost: 0.011,
    latencyMs: 980,
    tokensIn: 48,
    tokensOut: 35,
  },
  {
    model: "deepseek-v3",
    provider: "DeepSeek",
    output:
      "An all-in-one AI workspace: organize prompts by domain, compare outputs across providers, block spend when budget runs out.",
    cost: 0.004,
    latencyMs: 720,
    tokensIn: 48,
    tokensOut: 40,
  },
];

export const budget: Budget = {
  monthlyLimit: 50,
  spent: 38.42,
  remaining: 11.58,
  percentUsed: 76.8,
  blocked: false,
  alertThreshold: 80,
  resetDate: "2026-08-01",
};

export const blockedBudget: Budget = {
  monthlyLimit: 25,
  spent: 25.0,
  remaining: 0,
  percentUsed: 100,
  blocked: true,
  alertThreshold: 80,
  resetDate: "2026-08-01",
};

export const apiKeys: ApiKey[] = [
  {
    id: "key_1",
    name: "LayerFlow App",
    prefix: "lf_live_a8f3",
    projectId: "proj_layerflow",
    createdAt: "2026-06-15T10:00:00Z",
    lastUsed: "2026-07-16T14:30:00Z",
  },
  {
    id: "key_2",
    name: "Side Project",
    prefix: "lf_live_k2m9",
    createdAt: "2026-07-01T08:00:00Z",
    lastUsed: "2026-07-10T12:00:00Z",
  },
];

export const gatewayConfig: GatewayConfig = {
  baseUrl: "https://api.layerflow.dev/v1",
  apiKey: "lf_live_a8f3••••••••••••",
  defaultModel: "gpt-4o",
};

export function getProject(id: string): Project | undefined {
  return projects.find((p) => p.id === id);
}

export function getPrompt(id: string): Prompt | undefined {
  return prompts.find((p) => p.id === id);
}

export function getFoldersForProject(projectId: string): Folder[] {
  return folders.filter((f) => f.projectId === projectId);
}

export function getPromptsForProject(projectId: string): Prompt[] {
  return prompts.filter((p) => p.projectId === projectId);
}

export function getProjectsForDomain(domainId: string): Project[] {
  return projects.filter((p) => p.domainId === domainId);
}

export function getDomain(id: string): Domain | undefined {
  return domains.find((d) => d.id === id);
}
