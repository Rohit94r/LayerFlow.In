/**
 * Static demo fixtures for UI prototypes / docs. Live app routes do not import
 * this file — they use the API + Better Auth. Do not treat this as production
 * defaults, and do not sync it into Neon via `db:seed` on production.
 */
import type {
  ActivityItem,
  ApiKey,
  Budget,
  DashboardStats,
  Domain,
  Folder,
  GatewayConfig,
  KeyBudget,
  Project,
  ProjectBudget,
  Prompt,
  PromptSession,
  PromptSpendItem,
  RoutingRule,
  User,
  WorkspaceSettings,
} from "./types";
import { compareResults } from "./compare-results";

export { compareResults };

export const demoUser: User = {
  id: "user_1",
  name: "Alex Chen",
  email: "alex@layerflow.dev",
  avatarInitials: "AC",
  plan: "pro",
};

export const workspaceSettings: WorkspaceSettings = {
  preferCheap: true,
  executionMode: "suggest",
  defaultModel: "gemini-2.5-flash",
};

export const routingRules: RoutingRule[] = [
  { id: "rule_1", condition: "Coding tasks", model: "claude-sonnet-4", enabled: true },
  { id: "rule_2", condition: "Budget under $5/day", model: "deepseek-v3", enabled: true },
  { id: "rule_3", condition: "Bulk classify", model: "gemini-2.5-flash", enabled: true },
  { id: "rule_4", condition: "Long reasoning", model: "gpt-4o", enabled: false },
];

export const domains: Domain[] = [
  { id: "coding", name: "Coding", description: "Dev prompts, debugging, and code generation", icon: "Code2", color: "#44edbc", projectCount: 4, promptCount: 28 },
  { id: "marketing", name: "Marketing", description: "Copy, SEO, social, and campaign ideas", icon: "Megaphone", color: "#f59e0b", projectCount: 2, promptCount: 14 },
  { id: "study", name: "Study", description: "Learning, summaries, and exam prep", icon: "GraduationCap", color: "#60a5fa", projectCount: 3, promptCount: 19 },
  { id: "business", name: "Business", description: "Strategy, ops, and decision support", icon: "Briefcase", color: "#a78bfa", projectCount: 2, promptCount: 11 },
  { id: "research", name: "Research", description: "Literature review and analysis", icon: "Microscope", color: "#f472b6", projectCount: 1, promptCount: 8 },
  { id: "resume", name: "Resume", description: "CV, cover letters, and interview prep", icon: "FileText", color: "#34d399", projectCount: 1, promptCount: 6 },
  { id: "clients", name: "Clients", description: "Client deliverables and proposals", icon: "Users", color: "#fb923c", projectCount: 2, promptCount: 9 },
  { id: "school", name: "School", description: "Assignments and coursework help", icon: "BookOpen", color: "#38bdf8", projectCount: 2, promptCount: 12 },
  { id: "personal", name: "Personal", description: "Side projects and experiments", icon: "Sparkles", color: "#e879f9", projectCount: 3, promptCount: 15 },
];

export const projects: Project[] = [
  { id: "proj_layerflow", domainId: "coding", name: "LayerFlow App", description: "Core product prompts and experiments", folderCount: 3, promptCount: 12, updatedAt: "2026-07-16T14:30:00Z" },
  { id: "proj_nextjs", domainId: "coding", name: "Next.js SaaS", description: "Boilerplate and feature prompts", folderCount: 2, promptCount: 8, updatedAt: "2026-07-14T09:15:00Z" },
  { id: "proj_api", domainId: "coding", name: "API Design", description: "REST and GraphQL patterns", folderCount: 1, promptCount: 5, updatedAt: "2026-07-10T18:00:00Z" },
  { id: "proj_launch", domainId: "marketing", name: "Product Launch", description: "Launch copy and landing pages", folderCount: 2, promptCount: 9, updatedAt: "2026-07-15T11:00:00Z" },
  { id: "proj_seo", domainId: "marketing", name: "SEO Content", description: "Blog posts and meta descriptions", folderCount: 1, promptCount: 5, updatedAt: "2026-07-08T16:45:00Z" },
  { id: "proj_ml", domainId: "study", name: "ML Fundamentals", description: "Concept explanations and exercises", folderCount: 2, promptCount: 11, updatedAt: "2026-07-12T20:30:00Z" },
  { id: "proj_resume", domainId: "resume", name: "Job Search 2026", description: "Resume and cover letter prompts", folderCount: 2, promptCount: 6, updatedAt: "2026-07-17T10:00:00Z" },
];

export const folders: Folder[] = [
  { id: "fld_ui", projectId: "proj_layerflow", name: "UI Components", promptCount: 4 },
  { id: "fld_api", projectId: "proj_layerflow", name: "API Routes", promptCount: 3 },
  { id: "fld_prompts", projectId: "proj_layerflow", name: "Prompt Engineering", promptCount: 5 },
  { id: "fld_auth", projectId: "proj_nextjs", name: "Auth", promptCount: 3 },
  { id: "fld_billing", projectId: "proj_nextjs", name: "Billing", promptCount: 5 },
  { id: "fld_resume", projectId: "proj_resume", name: "Resume", promptCount: 3 },
  { id: "fld_cover", projectId: "proj_resume", name: "Cover Letters", promptCount: 3 },
];

export const prompts: Prompt[] = [
  {
    id: "prompt_sidebar",
    projectId: "proj_layerflow",
    folderId: "fld_ui",
    domainId: "coding",
    title: "App Sidebar Navigation",
    description: "Design a responsive sidebar for the AI workspace shell.",
    content: "Design a responsive sidebar for an AI workspace app. Include nav items for Workspace, Projects, Prompts, Compare, Budget, Settings, and Gateway. Use dark theme with subtle borders.",
    tags: ["ui", "navigation", "react"],
    favorite: true,
    variables: [{ name: "theme", defaultValue: "dark", description: "Color theme" }],
    notes: "Reference Linear/Cursor aesthetic. Keep groups: Workspace, Intelligence, Build.",
    createdAt: "2026-07-01T10:00:00Z",
    updatedAt: "2026-07-16T14:30:00Z",
    model: "gpt-4o",
    provider: "OpenAI",
    cost: 0.051,
    tokensIn: 215,
    tokensOut: 1340,
    versions: [
      { id: "v1", version: 1, content: "Create a sidebar with links to main sections of an AI prompt management app.", model: "gpt-4o", provider: "OpenAI", cost: 0.012, tokensIn: 45, tokensOut: 320, output: "Here's a basic sidebar structure with nav links and a user profile section at the bottom...", createdAt: "2026-07-01T10:00:00Z", note: "Initial draft" },
      { id: "v2", version: 2, content: "Design a responsive sidebar for an AI workspace app. Include nav items for Workspace, Projects, Prompts, Compare, Budget, Settings, and Gateway.", model: "claude-sonnet-4", provider: "Anthropic", cost: 0.018, tokensIn: 78, tokensOut: 480, output: "I'll create a polished sidebar with icon+label nav items, active state highlighting, and a collapsible mobile drawer...", createdAt: "2026-07-10T15:20:00Z", note: "Added responsive behavior" },
      { id: "v3", version: 3, content: "Design a responsive sidebar for an AI workspace app. Include nav items for Workspace, Projects, Prompts, Compare, Budget, Settings, and Gateway. Use dark theme with subtle borders.", model: "gpt-4o", provider: "OpenAI", cost: 0.021, tokensIn: 92, tokensOut: 540, output: "Final sidebar design with dark theme tokens, border-subtle styling, budget meter widget, and domain quick-switch...", createdAt: "2026-07-16T14:30:00Z", note: "Dark theme polish" },
    ],
  },
  {
    id: "prompt_budget",
    projectId: "proj_layerflow",
    folderId: "fld_ui",
    domainId: "coding",
    title: "Hard Budget Meter UI",
    description: "Budget meter with block state when limit exceeded.",
    content: "Build a budget meter component showing monthly spend, remaining balance, progress bar, and blocked state when limit exceeded.",
    tags: ["ui", "budget", "cost"],
    favorite: true,
    variables: [],
    createdAt: "2026-07-05T08:00:00Z",
    updatedAt: "2026-07-14T11:00:00Z",
    model: "gpt-4o-mini",
    provider: "OpenAI",
    cost: 0.003,
    tokensIn: 32,
    tokensOut: 180,
    versions: [
      { id: "v1", version: 1, content: "Create a progress bar showing AI spend vs monthly budget.", model: "gpt-4o-mini", provider: "OpenAI", cost: 0.003, tokensIn: 32, tokensOut: 180, output: "Simple progress bar with percentage and dollar amounts...", createdAt: "2026-07-05T08:00:00Z" },
    ],
  },
  {
    id: "prompt_compare",
    projectId: "proj_layerflow",
    folderId: "fld_prompts",
    domainId: "coding",
    title: "Multi-Model Compare Panel",
    description: "Side-by-side model comparison with badges.",
    content: "Run the same prompt across GPT-4o, Claude Sonnet, Gemini Pro, and DeepSeek. Show output, cost, latency side by side.",
    tags: ["compare", "multi-model"],
    favorite: false,
    variables: [{ name: "prompt", description: "Prompt to compare" }],
    createdAt: "2026-07-08T12:00:00Z",
    updatedAt: "2026-07-12T16:00:00Z",
    model: "claude-sonnet-4",
    provider: "Anthropic",
    cost: 0.015,
    tokensIn: 55,
    tokensOut: 290,
    versions: [
      { id: "v1", version: 1, content: "Run the same prompt across GPT-4o, Claude Sonnet, Gemini Pro, and DeepSeek.", model: "claude-sonnet-4", provider: "Anthropic", cost: 0.015, tokensIn: 55, tokensOut: 290, output: "Compare panel with 4 columns, each showing model output and metrics...", createdAt: "2026-07-08T12:00:00Z" },
    ],
  },
  {
    id: "prompt_api_route",
    projectId: "proj_layerflow",
    folderId: "fld_api",
    domainId: "coding",
    title: "OpenAI-Compatible Proxy Route",
    description: "Gateway proxy with cost tracking.",
    content: "Implement a Next.js API route that proxies /v1/chat/completions to multiple providers with cost tracking.",
    tags: ["api", "gateway"],
    favorite: false,
    variables: [],
    createdAt: "2026-07-11T09:00:00Z",
    updatedAt: "2026-07-13T17:00:00Z",
    model: "gpt-4o",
    provider: "OpenAI",
    cost: 0.028,
    tokensIn: 120,
    tokensOut: 650,
    versions: [
      { id: "v1", version: 1, content: "Proxy chat completions to OpenAI with cost tracking.", model: "gpt-4o", provider: "OpenAI", cost: 0.028, tokensIn: 120, tokensOut: 650, output: "export async function POST(req) { ... }", createdAt: "2026-07-11T09:00:00Z" },
    ],
  },
  {
    id: "prompt_hero",
    projectId: "proj_launch",
    domainId: "marketing",
    title: "Landing Hero Copy",
    description: "MVP headline and subtitle for landing page.",
    content: "Write hero headline and subtitle for an AI workspace product. Emphasize prompts, compare, and hard budgets.",
    tags: ["copy", "landing"],
    favorite: true,
    variables: [{ name: "tone", defaultValue: "confident" }],
    createdAt: "2026-07-03T14:00:00Z",
    updatedAt: "2026-07-15T11:00:00Z",
    model: "gpt-4o",
    provider: "OpenAI",
    cost: 0.008,
    tokensIn: 40,
    tokensOut: 150,
    versions: [
      { id: "v1", version: 1, content: "Write hero copy for an AI prompt management tool.", model: "gpt-4o", provider: "OpenAI", cost: 0.008, tokensIn: 40, tokensOut: 150, output: "The Workspace for Everything You Do With AI...", createdAt: "2026-07-03T14:00:00Z" },
    ],
  },
  {
    id: "prompt_resume_summary",
    projectId: "proj_resume",
    folderId: "fld_resume",
    domainId: "resume",
    title: "Resume Summary Bullets",
    description: "Turn experience into impact bullets.",
    content: "Rewrite my work experience as 3-4 resume bullets with metrics. Role: {{role}} at {{company}}. Achievements: {{achievements}}",
    tags: ["resume", "career"],
    favorite: true,
    variables: [
      { name: "role", defaultValue: "Software Engineer" },
      { name: "company", defaultValue: "Acme Corp" },
      { name: "achievements", description: "Raw notes about what you did" },
    ],
    createdAt: "2026-07-16T09:00:00Z",
    updatedAt: "2026-07-17T10:00:00Z",
    model: "gemini-2.5-flash",
    provider: "Google",
    cost: 0.002,
    tokensIn: 85,
    tokensOut: 210,
    versions: [
      { id: "v1", version: 1, content: "Rewrite my work experience as resume bullets with metrics.", model: "gpt-4o", provider: "OpenAI", cost: 0.012, tokensIn: 60, tokensOut: 180, output: "• Led migration of legacy API serving 2M daily requests...", createdAt: "2026-07-16T09:00:00Z", note: "First draft" },
      { id: "v2", version: 2, content: "Rewrite my work experience as 3-4 resume bullets with metrics. Role: {{role}} at {{company}}.", model: "gemini-2.5-flash", provider: "Google", cost: 0.002, tokensIn: 72, tokensOut: 195, output: "• Architected microservices platform reducing deploy time 60%...", createdAt: "2026-07-17T08:00:00Z", note: "Added variables" },
      { id: "v3", version: 3, content: "Rewrite my work experience as 3-4 resume bullets with metrics. Role: {{role}} at {{company}}. Achievements: {{achievements}}", model: "gemini-2.5-flash", provider: "Google", cost: 0.002, tokensIn: 85, tokensOut: 210, output: "• Drove 40% cost reduction via model routing optimization...", createdAt: "2026-07-17T10:00:00Z", note: "Final template" },
    ],
  },
  {
    id: "prompt_cover_letter",
    projectId: "proj_resume",
    folderId: "fld_cover",
    domainId: "resume",
    title: "Cover Letter Draft",
    description: "Tailored cover letter from job description.",
    content: "Write a cover letter for {{role}} at {{company}}. My background: {{background}}. Job description highlights: {{jd_highlights}}",
    tags: ["resume", "cover-letter"],
    favorite: false,
    variables: [
      { name: "role" },
      { name: "company" },
      { name: "background" },
      { name: "jd_highlights" },
    ],
    createdAt: "2026-07-17T11:00:00Z",
    updatedAt: "2026-07-17T11:30:00Z",
    model: "claude-sonnet-4",
    provider: "Anthropic",
    cost: 0.018,
    tokensIn: 120,
    tokensOut: 450,
    versions: [
      { id: "v1", version: 1, content: "Write a cover letter for {{role}} at {{company}}.", model: "claude-sonnet-4", provider: "Anthropic", cost: 0.018, tokensIn: 120, tokensOut: 450, output: "Dear Hiring Manager, I am excited to apply for the Senior Engineer role...", createdAt: "2026-07-17T11:30:00Z" },
    ],
  },
];

export const sessions: PromptSession[] = [
  {
    id: "session_resume_builder",
    title: "Resume Builder",
    description: "Chained prompts to build a complete job application package.",
    domainId: "resume",
    projectId: "proj_resume",
    promptIds: ["prompt_resume_summary", "prompt_cover_letter", "prompt_hero"],
    status: "active",
    totalCost: 0.032,
    totalTokens: 1245,
    createdAt: "2026-07-16T09:00:00Z",
    updatedAt: "2026-07-17T11:30:00Z",
  },
  {
    id: "session_launch_copy",
    title: "Product Launch Copy",
    description: "Landing page and marketing copy workflow.",
    domainId: "marketing",
    projectId: "proj_launch",
    promptIds: ["prompt_hero", "prompt_compare"],
    status: "completed",
    totalCost: 0.023,
    totalTokens: 890,
    createdAt: "2026-07-03T14:00:00Z",
    updatedAt: "2026-07-15T11:00:00Z",
  },
  {
    id: "session_ui_sprint",
    title: "UI Component Sprint",
    description: "Design and implement workspace UI components.",
    domainId: "coding",
    projectId: "proj_layerflow",
    promptIds: ["prompt_sidebar", "prompt_budget", "prompt_compare"],
    status: "paused",
    totalCost: 0.089,
    totalTokens: 2810,
    createdAt: "2026-07-01T10:00:00Z",
    updatedAt: "2026-07-16T14:30:00Z",
  },
];

export const recentActivity: ActivityItem[] = [
  { id: "act_1", type: "prompt_saved", title: "Resume Summary Bullets v3", description: "Saved new version with variables", timestamp: "2026-07-17T10:00:00Z", meta: "gemini-2.5-flash · $0.002" },
  { id: "act_2", type: "session_started", title: "Resume Builder session", description: "Continued step 2 of 3", timestamp: "2026-07-17T11:00:00Z" },
  { id: "act_3", type: "compare_run", title: "Compare: hero copy", description: "4 models compared", timestamp: "2026-07-16T16:00:00Z", meta: "Best: claude-sonnet-4" },
  { id: "act_4", type: "cache_hit", title: "Cache hit: Sidebar prompt", description: "Exact match — reused output", timestamp: "2026-07-16T14:30:00Z", meta: "$0.021 saved" },
  { id: "act_5", type: "budget_alert", title: "Budget at 76%", description: "Monthly spend approaching limit", timestamp: "2026-07-15T09:00:00Z" },
  { id: "act_6", type: "prompt_saved", title: "App Sidebar Navigation v3", description: "Dark theme polish", timestamp: "2026-07-16T14:30:00Z", meta: "gpt-4o · $0.021" },
];

export const dashboardStats: DashboardStats = {
  todayPrompts: 4,
  totalProjects: projects.length,
  totalPrompts: prompts.length,
  monthlyCost: 38.42,
  cacheSaved: 12.47,
  mostUsedModel: "gemini-2.5-flash",
  modelUsage: [
    { model: "gemini-2.5-flash", count: 18, cost: 8.24 },
    { model: "gpt-4o", count: 12, cost: 14.28 },
    { model: "claude-sonnet-4", count: 9, cost: 11.52 },
    { model: "deepseek-v3", count: 6, cost: 4.38 },
  ],
};

export const budget: Budget = {
  monthlyLimit: 50,
  dailyLimit: 5,
  spent: 38.42,
  dailySpent: 2.14,
  remaining: 11.58,
  percentUsed: 76.8,
  blocked: false,
  alertThreshold: 80,
  resetDate: "2026-08-01",
};

export const blockedBudget: Budget = {
  monthlyLimit: 25,
  dailyLimit: 3,
  spent: 25.0,
  dailySpent: 3.0,
  remaining: 0,
  percentUsed: 100,
  blocked: true,
  alertThreshold: 80,
  resetDate: "2026-08-01",
};

export const projectBudgets: ProjectBudget[] = [
  { projectId: "proj_layerflow", projectName: "LayerFlow App", limit: 20, spent: 15.82, percentUsed: 79 },
  { projectId: "proj_resume", projectName: "Job Search 2026", limit: 10, spent: 4.32, percentUsed: 43 },
  { projectId: "proj_launch", projectName: "Product Launch", limit: 15, spent: 12.18, percentUsed: 81 },
  { projectId: "proj_nextjs", projectName: "Next.js SaaS", limit: 10, spent: 6.1, percentUsed: 61 },
];

export const keyBudgets: KeyBudget[] = [
  { keyId: "key_1", keyName: "LayerFlow App", limit: 30, spent: 22.4, percentUsed: 75 },
  { keyId: "key_2", keyName: "Side Project", limit: 15, spent: 8.92, percentUsed: 59 },
];

export const promptSpend: PromptSpendItem[] = [
  { promptId: "prompt_sidebar", title: "App Sidebar Navigation", projectName: "LayerFlow App", totalCost: 0.051, runCount: 3, lastModel: "gpt-4o" },
  { promptId: "prompt_api_route", title: "OpenAI-Compatible Proxy Route", projectName: "LayerFlow App", totalCost: 0.028, runCount: 1, lastModel: "gpt-4o" },
  { promptId: "prompt_resume_summary", title: "Resume Summary Bullets", projectName: "Job Search 2026", totalCost: 0.016, runCount: 3, lastModel: "gemini-2.5-flash" },
  { promptId: "prompt_cover_letter", title: "Cover Letter Draft", projectName: "Job Search 2026", totalCost: 0.018, runCount: 1, lastModel: "claude-sonnet-4" },
  { promptId: "prompt_compare", title: "Multi-Model Compare Panel", projectName: "LayerFlow App", totalCost: 0.015, runCount: 1, lastModel: "claude-sonnet-4" },
];

export const apiKeys: ApiKey[] = [
  { id: "key_1", name: "LayerFlow App", prefix: "lf_live_a8f3", projectId: "proj_layerflow", createdAt: "2026-06-15T10:00:00Z", lastUsed: "2026-07-16T14:30:00Z" },
  { id: "key_2", name: "Side Project", prefix: "lf_live_k2m9", createdAt: "2026-07-01T08:00:00Z", lastUsed: "2026-07-10T12:00:00Z" },
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

export function getSession(id: string): PromptSession | undefined {
  return sessions.find((s) => s.id === id);
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

export function getPromptsForSession(sessionId: string): Prompt[] {
  const session = getSession(sessionId);
  if (!session) return [];
  return session.promptIds.map((id) => getPrompt(id)).filter(Boolean) as Prompt[];
}
