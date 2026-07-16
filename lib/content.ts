export const site = {
  name: "LayerFlow",
  tagline: "The AI workspace for prompts, models, and cost",
  docsCommand: "npm install @layerflow/workspace",
};

export const nav = [
  {
    label: "Platform",
    items: [
      { title: "Prompt Studio", desc: "Write, version, and organize prompts.", href: "#prompt-studio" },
      { title: "AI Playground", desc: "Compare outputs across GPT, Claude, Gemini.", href: "#playground" },
      { title: "Cost Analytics", desc: "Track spend per model, project, and prompt.", href: "#cost" },
      { title: "Version Control", desc: "Git-like diff for every prompt change.", href: "#versions" },
      { title: "Prompt Library", desc: "Organize prompts into projects and folders.", href: "#library" },
      { title: "Budget Limits", desc: "Hard caps that stop runaway AI spend.", href: "#budget" },
      { title: "Team Sharing", desc: "Shared prompt libraries with your team.", href: "#sharing" },
      { title: "History & Results", desc: "Full execution history per prompt.", href: "#history" },
      { title: "Analytics", desc: "Which prompt and model perform best.", href: "#analytics" },
      { title: "Workspace Dashboard", desc: "Everything in one place.", href: "#dashboard" },
    ],
  },
  { label: "Pricing", href: "#faq" },
  { label: "Blog", href: "#blog" },
  {
    label: "Docs",
    items: [
      { title: "Quickstart", desc: "Create your first project in under 5 minutes.", href: "#docs" },
      { title: "Workspace Guide", desc: "Projects, prompts, and model setup.", href: "#docs" },
      { title: "API Reference", desc: "Manage prompts, projects, and keys via API.", href: "#docs" },
    ],
  },
  {
    label: "Resources",
    items: [
      { title: "FAQ", desc: "Common questions about LayerFlow.", href: "#faq" },
      { title: "Contact", desc: "Talk to the LayerFlow team.", href: "#faq" },
    ],
  },
];

export const heroBadges = [
  { label: "Prompt versioning with diff" },
  { label: "Compare GPT · Claude · Gemini" },
  { label: "Hard budget limits" },
];

export const providers = [
  { name: "OpenAI", src: "/images/openai.svg" },
  { name: "Anthropic", src: "/images/anthropic.svg" },
  { name: "Gemini", src: "/images/google-gemini.svg" },
  { name: "LangChain", src: "/images/langchain.svg" },
  { name: "Databricks", src: "/images/databricks.svg" },
];

export type Feature = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  bullets: string[];
  cta: { label: string; href: string }[];
  code: { lang: string; lines: string[] };
  reverse?: boolean;
};

export const features: Feature[] = [
  {
    id: "prompt-studio",
    eyebrow: "Prompt Studio",
    title: "Write, version, and organize every prompt",
    body: "A dedicated workspace to craft, test, and store your prompts. Each prompt gets full version history — like GitHub for your AI instructions. Never lose a working prompt again.",
    bullets: [
      "Full version lineage: v1 → v2 → v3 with one-click rollback",
      "Diff view shows exactly what changed between versions",
      "Organize prompts into projects, folders, and categories",
    ],
    cta: [
      { label: "Quickstart", href: "#docs" },
      { label: "View workspace", href: "#demo" },
    ],
    code: {
      lang: "typescript",
      lines: [
        "// Create a new prompt version in your workspace",
        "const prompt = await lf.prompts.create({",
        "  project: 'customer-support',",
        "  name: 'triage-v3',",
        "  content: 'You are a support agent...',",
        "  variables: ['orderId', 'issue'],",
        "})",
        "",
        "// Diff against previous version",
        "await lf.prompts.diff('triage-v2', 'triage-v3')",
      ],
    },
  },
  {
    id: "playground",
    eyebrow: "AI Playground",
    title: "Compare every model side by side",
    body: "Run the same prompt across GPT-4o, Claude 3.5 Sonnet, Gemini 2.0, and DeepSeek — see results, costs, and latency in one view. Find the best model for every task without switching tabs.",
    bullets: [
      "Side-by-side output comparison across all major models",
      "Cost and latency shown per model per run",
      "Save comparison results to share with your team",
    ],
    cta: [
      { label: "Open playground", href: "#docs" },
      { label: "View demo", href: "#demo" },
    ],
    reverse: true,
    code: {
      lang: "typescript",
      lines: [
        "// Compare the same prompt across models",
        "const results = await lf.playground.compare({",
        "  prompt: 'Summarize: Q3 earnings report',",
        "  models: [",
        "    'gpt-4o',",
        "    'claude-3-5-sonnet',",
        "    'gemini-2.0-flash',",
        "  ],",
        "})",
        "",
        "// results.cost, results.latency, results.outputs",
      ],
    },
  },
  {
    id: "cost",
    eyebrow: "Cost Analytics",
    title: "Know exactly where every dollar goes",
    body: "Real-time cost tracking broken down by model, project, prompt, and team member. Set hard daily and monthly budgets that stop runaway spend before it happens — the feature users love most.",
    bullets: [
      "Per-model, per-project, and per-prompt cost breakdown",
      "Hard budget limits enforced at the edge (HTTP 402)",
      "Alerts at 80% budget, daily email summaries",
    ],
    cta: [
      { label: "Quickstart", href: "#docs" },
      { label: "View dashboard", href: "#demo" },
    ],
    code: {
      lang: "typescript",
      lines: [
        "const lf = new LayerFlow({",
        "  apiKey: process.env.LF_KEY,",
        "  budget: {",
        "    daily: 50,       // $50 / day hard cap",
        "    monthly: 500,    // $500 / month hard cap",
        "    perPrompt: 0.1,  // $0.10 per prompt run",
        "    onExceeded: 'error',",
        "  },",
        "})",
      ],
    },
  },
  {
    id: "versions",
    eyebrow: "Version Control",
    title: "Git-like diff for every prompt change",
    body: "Every time you edit a prompt, LayerFlow saves a version. See exactly what changed — added lines, removed lines, parameter tweaks. Roll back any version in one click. No more 'final_v3_really_final'.",
    bullets: [
      "Semantic diff shows exact changes between versions",
      "Link prompt versions to their output results",
      "Rollback to any previous version instantly",
    ],
    cta: [
      { label: "Quickstart", href: "#docs" },
      { label: "View versions", href: "#demo" },
    ],
    reverse: true,
    code: {
      lang: "bash",
      lines: [
        "# Compare two prompt versions",
        "lf diff triage-v2 triage-v3",
        "",
        "# Output:",
        "# - You are a helpful agent",
        "# + You are a senior support agent",
        "# - max_tokens: 500",
        "# + max_tokens: 800",
      ],
    },
  },
  {
    id: "library",
    eyebrow: "Prompt Library",
    title: "Organize prompts like documents",
    body: "Group prompts into projects, tag them by use case, and find anything instantly. Marketing prompts, coding prompts, research prompts, email prompts — all organized in one workspace.",
    bullets: [
      "Projects and folders for prompt organization",
      "Tags and search to find prompts instantly",
      "Clone and fork prompts as templates",
    ],
    cta: [{ label: "Quickstart", href: "#docs" }],
    code: {
      lang: "typescript",
      lines: [
        "// Organize prompts by project",
        "const project = await lf.projects.create({",
        "  name: 'Marketing Campaign',",
        "  prompts: [",
        "    { name: 'seo-blog', tags: ['seo', 'blog'] },",
        "    { name: 'ad-copy', tags: ['ads', 'social'] },",
        "    { name: 'email-sequence', tags: ['email'] },",
        "  ],",
        "})",
      ],
    },
  },
  {
    id: "budget",
    eyebrow: "Budget Limits",
    title: "Hard caps that stop runaway AI spend",
    body: "Set daily, weekly, or monthly budgets per project, per team member, or globally. LayerFlow enforces them at the edge — no surprise $2,000 bills. The feature our users ask for most.",
    bullets: [
      "Daily, weekly, and monthly hard budget caps",
      "Per-project and per-user budget allocation",
      "HTTP 402 when budget exceeded — instant, no drift",
    ],
    cta: [{ label: "Quickstart", href: "#docs" }],
    reverse: true,
    code: {
      lang: "typescript",
      lines: [
        "// Budgets that actually stop spend",
        "budget: {",
        "  daily: 50,",
        "  monthly: 1000,",
        "  perProject: {",
        "    'marketing': 200,",
        "    'research': 500,",
        "  },",
        "  onExceeded: 'error',  // HTTP 402",
        "}",
      ],
    },
  },
  {
    id: "sharing",
    eyebrow: "Team Sharing",
    title: "Share prompts, not Slack messages",
    body: "Build a shared prompt library for your team. Everyone uses the same versions, templates, and best practices. No more prompts lost in Slack threads or outdated copies in Google Docs.",
    bullets: [
      "Shared prompt libraries with role-based access",
      "Team-wide prompt templates and best practices",
      "Activity feed — see who changed what and when",
    ],
    cta: [{ label: "Quickstart", href: "#docs" }],
    code: {
      lang: "typescript",
      lines: [
        "// Share a prompt library with your team",
        "const library = await lf.libraries.create({",
        "  name: 'Sales Team Prompts',",
        "  members: ['alice@co', 'bob@co'],",
        "  prompts: ['outreach-v2', 'followup-v1'],",
        "  permissions: 'read-write',",
        "})",
      ],
    },
  },
  {
    id: "history",
    eyebrow: "History & Results",
    title: "Full execution history per prompt",
    body: "Every time a prompt runs, its input, output, model, cost, and latency are saved. Go back weeks later and see exactly what happened — the perfect audit trail for your AI workflows.",
    bullets: [
      "Complete run history with input/output payloads",
      "Cost and latency logged per execution",
      "Filter by model, date range, and project",
    ],
    cta: [
      { label: "Quickstart", href: "#docs" },
      { label: "View history", href: "#demo" },
    ],
    reverse: true,
    code: {
      lang: "bash",
      lines: [
        "# View execution history for a prompt",
        "GET /v1/history?prompt=triage-v3&from=2026-07-01",
        "",
        "# Response includes:",
        "# { prompt, model, output,",
        "#   cost, latencyMs, timestamp }",
      ],
    },
  },
  {
    id: "analytics",
    eyebrow: "Analytics",
    title: "Which prompt and model perform best",
    body: "See which prompt versions produce the best results, which models are most cost-effective, and how your team's AI usage trends over time. Data-driven prompt engineering.",
    bullets: [
      "Prompt performance scores across versions",
      "Model cost-effectiveness comparison charts",
      "Usage trends per project, team, and time period",
    ],
    cta: [
      { label: "Quickstart", href: "#docs" },
      { label: "View analytics", href: "#demo" },
    ],
    code: {
      lang: "typescript",
      lines: [
        "// Analytics dashboard",
        "const stats = await lf.analytics.query({",
        "  project: 'customer-support',",
        "  metric: 'cost_per_prompt',",
        "  groupBy: 'model',",
        "  from: '2026-06-01',",
        "  to: '2026-07-01',",
        "})",
      ],
    },
  },
  {
    id: "dashboard",
    eyebrow: "Workspace Dashboard",
    title: "Your AI workspace in one place",
    body: "Projects, prompts, models, costs, team members, and analytics — all from a single dashboard. See your active projects, recent prompt runs, budget status, and team activity at a glance.",
    bullets: [
      "Real-time budget and cost overview",
      "Recent prompt runs and execution history",
      "Team activity feed and quick-access libraries",
    ],
    cta: [{ label: "Open dashboard", href: "#demo" }],
    reverse: true,
    code: {
      lang: "bash",
      lines: [
        "# Your workspace is ready",
        "open https://app.layerflow.dev/workspace",
        "",
        "# Browse projects",
        "GET /v1/projects",
      ],
    },
  },
];

export const whyChoose = [
  {
    iconKey: "integration",
    title: "Prompt Workspace",
    desc: "One place to write, version, organize, and run all your prompts. No more scattered across Notion, Docs, and Slack.",
  },
  {
    iconKey: "unlock",
    title: "Multi-Model Freedom",
    desc: "Compare GPT, Claude, Gemini, and more side by side. Pick the best model for each task without switching tools.",
  },
  {
    iconKey: "shield",
    title: "Version Control",
    desc: "Full Git-like diff for every prompt change. Roll back any version in one click. Never lose a working prompt.",
  },
  {
    iconKey: "chart",
    title: "Cost Under Control",
    desc: "Hard budget limits that actually stop spend. Per-model, per-project cost breakdowns with real-time alerts.",
  },
  {
    iconKey: "zap",
    title: "Team Collaboration",
    desc: "Shared prompt libraries, team templates, and activity feeds. Replace Slack prompts with a real workspace.",
  },
  {
    iconKey: "test",
    title: "No Lock-in",
    desc: "Bring your own API keys. Switch models, providers, and tools freely. LayerFlow works with your setup.",
  },
];

export const integrations = [
  { name: "OpenAI", src: "/images/openai.svg" },
  { name: "Anthropic", src: "/images/anthropic.svg" },
  { name: "Gemini", src: "/images/google-gemini.svg" },
  { name: "LangChain", src: "/images/langchain.svg" },
  { name: "Databricks", src: "/images/databricks.svg" },
];

export const steps = [
  {
    n: 1,
    title: "Create a project",
    desc: "Set up a workspace for your prompts. Name it, pick your models, set a budget.",
    lang: "bash",
    code: ["npx create-layerflow@latest my-workspace"],
    time: "~30 seconds",
  },
  {
    n: 2,
    title: "Write your first prompt",
    desc: "Draft a prompt, add variables, and pick which models to test against.",
    lang: "typescript",
    code: [
      "import { LayerFlow } from '@layerflow/workspace'",
      "",
      "const lf = new LayerFlow({ apiKey: 'lf_...' })",
      "await lf.prompts.create({",
      "  project: 'my-app',",
      "  name: 'summarize',",
      "  content: 'Summarize the following: {{text}}',",
      "  models: ['gpt-4o', 'claude-3-5-sonnet'],",
      "})",
    ],
    time: "~2 minutes",
  },
  {
    n: 3,
    title: "Compare and iterate",
    desc: "Run your prompt across models, compare outputs and costs, and save the winning version.",
    lang: "typescript",
    code: [
      "const result = await lf.playground.run({",
      "  prompt: 'summarize',",
      "  variables: { text: 'Q3 earnings...' },",
      "})",
      "",
      "// Compare outputs side by side",
      "// Pick the best → save as new version",
    ],
    time: "~1 minute",
  },
];

export const stats = [
  { value: "10+", label: "Supported models" },
  { value: "<5ms", label: "Prompt retrieval" },
  { value: "4", label: "Workspace features" },
  { value: "1", label: "Workspace for everything" },
];

export const faqs = [
  {
    q: "What is LayerFlow?",
    a: "LayerFlow is the AI workspace for prompts, models, and cost management. It helps you write, version, organize, and compare prompts across GPT, Claude, Gemini, and more — all with built-in cost tracking and hard budget limits.",
  },
  {
    q: "Who is LayerFlow for?",
    a: "Anyone who writes prompts. Developers, students, marketers, content writers, researchers, agencies, and prompt engineers. If you use AI tools daily and need to manage prompts better, LayerFlow is for you.",
  },
  {
    q: "Is LayerFlow free?",
    a: "Yes. The Free plan includes unlimited personal projects, 1,000 prompt runs per month, version history, and basic cost tracking. Paid plans add more runs, team features, longer history, and advanced analytics.",
  },
  {
    q: "Can I compare different AI models?",
    a: "Yes. LayerFlow's AI Playground lets you run the same prompt across GPT-4o, Claude 3.5 Sonnet, Gemini 2.0, DeepSeek, and more — side by side. See outputs, costs, and latency in one view.",
  },
  {
    q: "Do I need to change my existing setup?",
    a: "No. LayerFlow works with your existing API keys and models. Bring your own keys (BYOK), create a workspace, and start organizing prompts. No code changes required to start using the workspace.",
  },
];

export const posts = [
  {
    date: "Jul 10, 2026",
    title: "Why you need version control for your AI prompts",
    tag: "Product",
  },
  {
    date: "Jun 28, 2026",
    title: "Hard budget limits: the feature that saved us $2,000",
    tag: "Engineering",
  },
  {
    date: "Jun 5, 2026",
    title: "GPT vs Claude vs Gemini: which model wins for your use case?",
    tag: "Tutorial",
  },
];

export const footerCols = [
  {
    title: "Platform",
    links: ["Prompt Studio", "AI Playground", "Cost Analytics", "Version Control", "Budget Limits"],
  },
  {
    title: "Developers",
    links: ["Documentation", "SDK Reference", "API Reference", "Changelog", "Status"],
  },
  {
    title: "Company",
    links: ["About", "Blog", "Pricing", "Careers", "Contact"],
  },
  {
    title: "Community",
    links: ["Discord", "X / Twitter", "LinkedIn", "YouTube"],
  },
];
