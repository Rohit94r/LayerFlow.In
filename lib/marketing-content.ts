export const site = {
  name: "LayerFlow",
  headline: "The Workspace for Everything You Do With AI",
  subtitle:
    "Save prompts, compare models, control costs, organize AI projects, and connect every LLM in one place.",
  tagline: "The AI workspace for prompts, models, and cost",
  docsCommand: "npm install @layerflow/sdk",
  workspaceHref: "/workspace",
  pricingHref: "/pricing",
};

export const proofPoints = [
  "Hard budgets",
  "Prompt Timeline",
  "Compare",
  "Domains",
  "BYOK + SDK",
];

export const journeySteps = [
  "Prompt",
  "Experiment",
  "Compare",
  "Save",
  "Share",
  "Build",
  "Deploy",
];

export type NavItem = {
  label: string;
  href: string;
  menu?: "features";
};

export const nav: NavItem[] = [
  { label: "Features", href: "/#features", menu: "features" },
  { label: "Docs", href: "/docs" },
  { label: "Pricing", href: "/pricing" },
  { label: "About", href: "/about" },
];

export type FeatureMenuItem = {
  title: string;
  description: string;
  href: string;
  icon:
    | "workspace"
    | "domains"
    | "timeline"
    | "compare"
    | "budget"
    | "analytics"
    | "alerts"
    | "byok"
    | "gateway"
    | "sdk"
    | "keys";
};

export type FeatureMenuSection = {
  title: string;
  items: FeatureMenuItem[];
};

/** Navbar + mobile menu — grouped from features.md positioning (AI Workspace first). */
export const featureMenu: FeatureMenuSection[] = [
  {
    title: "Workspace",
    items: [
      {
        title: "Prompt Workspace",
        description: "One place for everything you do with AI.",
        href: "/workspace",
        icon: "workspace",
      },
      {
        title: "Domains & Projects",
        description: "Marketing, coding, school — each in its lane.",
        href: "/#domains",
        icon: "domains",
      },
      {
        title: "Prompt Timeline",
        description: "Git for prompts — every version, cost, and output.",
        href: "/prompts",
        icon: "timeline",
      },
      {
        title: "Compare",
        description: "Best, cheapest, or fastest — see it in one run.",
        href: "/compare",
        icon: "compare",
      },
    ],
  },
  {
    title: "Cost & control",
    items: [
      {
        title: "Hard Budget Limits",
        description: "Never wake up to an AI bill you didn't approve.",
        href: "/budget",
        icon: "budget",
      },
      {
        title: "Cost Analytics",
        description: "See spend by project, key, and model before invoice shock.",
        href: "/budget",
        icon: "analytics",
      },
      {
        title: "Budget Alerts",
        description: "Warn at ~80% and catch spikes before they hurt.",
        href: "/budget",
        icon: "alerts",
      },
      {
        title: "BYOK",
        description: "Your keys, your billing — LayerFlow is control, not markup.",
        href: "/settings",
        icon: "byok",
      },
    ],
  },
  {
    title: "Build",
    items: [
      {
        title: "AI Gateway",
        description: "One OpenAI-compatible integration → every major LLM.",
        href: "/gateway",
        icon: "gateway",
      },
      {
        title: "SDK & API",
        description: "TypeScript, Python, and drop-in OpenAI-style endpoints.",
        href: "/gateway",
        icon: "sdk",
      },
      {
        title: "API Keys",
        description: "Separate keys per project — costs and limits stay isolated.",
        href: "/settings",
        icon: "keys",
      },
    ],
  },
];

export const heroBadges = proofPoints.map((label) => ({ label }));

export const providers = [
  { name: "OpenAI", src: "/images/openai.svg" },
  { name: "Anthropic", src: "/images/anthropic.svg" },
  { name: "Gemini", src: "/images/google-gemini.svg" },
  { name: "Mistral", src: "/images/mistral.svg" },
  { name: "Groq", src: "/images/groq.svg" },
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
    id: "timeline",
    eyebrow: "Prompt Timeline",
    title: "Git for prompts — every version in one place",
    body: "Each edit saves a version with model, cost, output, and date. Roll back to what worked. Never lose a prompt in Notion, Docs, or ChatGPT history again.",
    bullets: [
      "v1 → v2 → v3 with model, cost, and output per version",
      "Diff view shows exactly what changed",
      "Link versions to comparison runs and results",
    ],
    cta: [
      { label: "Open workspace", href: "/workspace" },
      { label: "See pricing", href: "/pricing" },
    ],
    code: {
      lang: "typescript",
      lines: [
        "// Every prompt edit is a version",
        "await lf.prompts.save({",
        "  name: 'support-triage',",
        "  content: 'You are a senior support agent...',",
        "  model: 'claude-sonnet-4',",
        "})",
        "",
        "// Timeline: v1 → v2 → v3 with cost + output",
        "await lf.prompts.timeline('support-triage')",
      ],
    },
  },
  {
    id: "compare",
    eyebrow: "Compare",
    title: "Best, cheapest, or fastest — one run",
    body: "Run the same prompt across GPT, Claude, Gemini, and DeepSeek. See outputs, cost, and latency side by side. Pick the winner without switching tabs.",
    bullets: [
      "Same prompt → every major model in one view",
      "Cost and latency shown per model per run",
      "Save the winning version to your workspace",
    ],
    cta: [
      { label: "Try Compare", href: "/workspace" },
      { label: "View pricing", href: "/pricing" },
    ],
    reverse: true,
    code: {
      lang: "typescript",
      lines: [
        "const results = await lf.compare.run({",
        "  prompt: 'Summarize Q3 earnings',",
        "  models: [",
        "    'gpt-4o',",
        "    'claude-sonnet-4',",
        "    'gemini-2.0-flash',",
        "    'deepseek-v3',",
        "  ],",
        "})",
        "",
        "// Pick best · cheapest · fastest",
      ],
    },
  },
  {
    id: "budget",
    eyebrow: "Hard Budgets",
    title: "Never wake up to an AI bill you didn't approve",
    body: "Set monthly limits with a progress bar and remaining balance. LayerFlow blocks requests when you hit the cap — the feature users ask for most.",
    bullets: [
      "Monthly progress bar with remaining $",
      "Auto-block when budget is exceeded",
      "Alerts at ~80% so you catch spikes early",
    ],
    cta: [
      { label: "Set a budget", href: "/workspace" },
      { label: "See pricing", href: "/pricing" },
    ],
    code: {
      lang: "typescript",
      lines: [
        "await lf.budgets.set({",
        "  monthly: 50,           // $50 hard cap",
        "  onExceeded: 'block',    // stop requests",
        "  alertAt: 0.8,          // warn at 80%",
        "})",
        "",
        "// Remaining: $12.40 · blocked at $0",
      ],
    },
  },
  {
    id: "domains",
    eyebrow: "Workspace Domains",
    title: "Marketing, coding, school — each in its lane",
    body: "Organize prompts by how you actually work. Domains, projects, and folders keep your AI work structured — not one flat dump.",
    bullets: [
      "Domains: Marketing, Coding, Study, Business, and more",
      "Projects and folders under each domain",
      "Find any prompt without digging through notes",
    ],
    cta: [{ label: "Create workspace", href: "/workspace" }],
    reverse: true,
    code: {
      lang: "typescript",
      lines: [
        "await lf.domains.create({",
        "  name: 'Marketing',",
        "  projects: [",
        "    { name: 'SEO Blog', folders: ['Drafts'] },",
        "    { name: 'Ad Copy', folders: ['Meta', 'Google'] },",
        "  ],",
        "})",
      ],
    },
  },
  {
    id: "byok",
    eyebrow: "BYOK + SDK",
    title: "Your keys, every LLM, one workspace",
    body: "Bring your own provider keys — LayerFlow is control, not markup. When you're ready to build, connect apps with the SDK or OpenAI-compatible API.",
    bullets: [
      "BYOK: you keep provider billing",
      "OpenAI-compatible API for drop-in apps",
      "TypeScript and Python SDK",
    ],
    cta: [
      { label: "Connect keys", href: "/workspace" },
      { label: "View pricing", href: "/pricing" },
    ],
    code: {
      lang: "typescript",
      lines: [
        "import LayerFlow from '@layerflow/sdk'",
        "",
        "const lf = new LayerFlow({",
        "  apiKey: process.env.LF_KEY,",
        "  // OpenAI-compatible endpoint",
        "  baseURL: 'https://api.layerflow.dev/v1',",
        "})",
      ],
    },
  },
];

export const whyChoose = [
  {
    iconKey: "integration",
    title: "Prompt Workspace",
    desc: "One place for everything you do with AI — not scattered across Notion, Docs, and Slack.",
  },
  {
    iconKey: "unlock",
    title: "Multi-Model Compare",
    desc: "GPT, Claude, Gemini, DeepSeek side by side. Pick the best model for each task.",
  },
  {
    iconKey: "shield",
    title: "Prompt Timeline",
    desc: "Git-like versions with cost and output per run. Roll back any version instantly.",
  },
  {
    iconKey: "chart",
    title: "Hard Budget Limits",
    desc: "Monthly caps that actually block spend. Peace of mind before the invoice arrives.",
  },
  {
    iconKey: "zap",
    title: "Workspace Domains",
    desc: "Organize by Marketing, Coding, Study, Clients — the way you already think about work.",
  },
  {
    iconKey: "test",
    title: "BYOK + SDK",
    desc: "Your keys, your billing. Connect apps when you build — gateway is one feature, not the whole product.",
  },
];

export const integrations = providers;

export const stats = [
  { value: "9", label: "Workspace domains" },
  { value: "4+", label: "Model providers" },
  { value: "Git-like", label: "Prompt versions" },
  { value: "Hard $", label: "Budget limits" },
];

export const steps = [
  {
    n: 1,
    title: "Create your workspace",
    desc: "Sign up, pick domains, and set a monthly budget before your first prompt.",
    lang: "bash",
    code: ["open https://layerflow.dev/workspace"],
    time: "~30 seconds",
  },
  {
    n: 2,
    title: "Write and experiment",
    desc: "Draft a prompt, run it across models, and save versions as you iterate.",
    lang: "typescript",
    code: [
      "await lf.prompts.create({",
      "  domain: 'coding',",
      "  name: 'code-review',",
      "  content: 'Review this PR: {{diff}}',",
      "})",
    ],
    time: "~2 minutes",
  },
  {
    n: 3,
    title: "Compare and deploy",
    desc: "Pick the best model, share the prompt, and connect your app via SDK when ready.",
    lang: "typescript",
    code: [
      "const winner = await lf.compare.pick({",
      "  prompt: 'code-review',",
      "  criteria: 'cheapest',",
      "})",
      "",
      "// Share · build · deploy",
    ],
    time: "~1 minute",
  },
];

export const faqs = [
  {
    q: "What is LayerFlow?",
    a: "LayerFlow is the AI workspace for prompts, models, and cost control. Save prompts, compare models, set hard budgets, and organize projects — with BYOK and an SDK when you're ready to build.",
  },
  {
    q: "Who is LayerFlow for?",
    a: "Developers and AI power users who live in prompts, models, and tools. Students, marketers, and teams come later — we're focused on the people who need this workspace today.",
  },
  {
    q: "Is LayerFlow an infrastructure platform?",
    a: "No. LayerFlow is a workspace first. Gateway, SDK, and OpenAI-compatible API are one feature for developers who build and deploy — not the whole product.",
  },
  {
    q: "How do hard budgets work?",
    a: "Set a monthly limit with a progress bar and remaining balance. When you hit the cap, LayerFlow blocks new requests. Alerts warn you at ~80% so there are no surprise bills.",
  },
  {
    q: "Can I use my own API keys?",
    a: "Yes. BYOK is core to LayerFlow. You keep provider billing; LayerFlow gives you organization, comparison, and cost control in one workspace.",
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
    title: "Hard budget limits: peace of mind for AI spend",
    tag: "Product",
  },
  {
    date: "Jun 5, 2026",
    title: "GPT vs Claude vs Gemini: compare in one workspace",
    tag: "Tutorial",
  },
];

export const pricingTiers = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Generous personal workspace for getting started.",
    features: [
      "Unlimited personal projects",
      "Prompt Timeline & Compare",
      "1,000 runs / month",
      "Basic cost tracking",
      "Hard budget limits",
    ],
    cta: "Start free",
    href: "/workspace",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$19",
    period: "/ month",
    description: "For developers and AI power users who live in prompts.",
    features: [
      "Unlimited personal runs",
      "Advanced budget alerts",
      "Full version history",
      "BYOK + SDK access",
      "Priority support",
    ],
    cta: "Get Pro",
    href: "/workspace",
    highlighted: true,
  },
  {
    name: "Team",
    price: "$49",
    period: "/ month",
    description: "Shared workspace when your team is ready.",
    features: [
      "Everything in Pro",
      "Shared prompt libraries",
      "Multi-key management",
      "Team cost dashboard",
      "Role-based access",
    ],
    cta: "Contact us",
    href: "/about",
    highlighted: false,
  },
];

export const aboutValues = [
  {
    title: "Workspace first",
    desc: "Prompt organization and cost control are the product. Gateway and SDK are how you build — not the headline.",
  },
  {
    title: "Hard budgets matter",
    desc: "Few tools productize spend limits simply. We make it front and center because surprise bills are real.",
  },
  {
    title: "Your keys, your data",
    desc: "BYOK keeps provider billing with you. LayerFlow is control and organization, not markup.",
  },
  {
    title: "Power users first",
    desc: "We ship for developers and AI power users who already live in prompts. Everyone else follows when retention proves out.",
  },
];

export const footerCols = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/#features" },
      { label: "Pricing", href: "/pricing" },
      { label: "Workspace", href: "/workspace" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Blog", href: "/#blog" },
      { label: "Contact", href: "/about" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "#" },
      { label: "Terms", href: "#" },
      { label: "Security", href: "#" },
    ],
  },
];
