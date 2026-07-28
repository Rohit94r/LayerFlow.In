export const site = {
  name: "LayerFlow",
  headline: "The Workspace for Everything You Do With AI",
  subtitle:
    "Save prompts, compare models, control costs, organize AI projects, and connect every LLM in one place.",
  tagline: "The AI workspace for prompts, models, and cost",
  docsCommand: "curl https://layerflow.dev/v1/chat/completions",
  workspaceHref: "/workspace",
  signInHref: "/sign-in",
  pricingHref: "/pricing",
};

export const proofPoints = [
  "Hard budgets",
  "Prompt Timeline",
  "Compare",
  "Domains",
  "BYOK + Gateway",
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
  { label: "Blog", href: "/blog" },
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
        title: "Gateway & API",
        description: "OpenAI-compatible /v1 today; first-party SDK planned.",
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
      lang: "text",
      lines: [
        "Prompt: support-triage",
        "  v1  claude-sonnet-4   $0.012  · first draft",
        "  v2  gpt-4o-mini      $0.003  · shorter tone",
        "  v3  claude-sonnet-4   $0.011  ← restored",
        "",
        "# Save in the workspace — Timeline keeps every version",
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
      lang: "text",
      lines: [
        "Compare · Summarize Q3 earnings",
        "  gpt-4o             Best     $0.042  1.8s",
        "  claude-sonnet-4             $0.038  2.1s",
        "  gemini-2.0-flash   Fastest  $0.004  0.6s",
        "  deepseek-v3        Cheapest $0.002  1.2s",
        "",
        "# Ranked in /compare — worker required",
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
      lang: "text",
      lines: [
        "Budget · Monthly hard cap",
        "  limit:     $50.00",
        "  spent:     $37.60",
        "  remaining: $12.40",
        "  alert:     80%  · onExceeded: block",
        "",
        "# Gateway returns 402 when the cap is hit",
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
      lang: "text",
      lines: [
        "Workspace",
        "  Marketing",
        "    SEO Blog / Drafts",
        "    Ad Copy / Meta · Google",
        "  Coding",
        "    PR review / Checklists",
        "",
        "# Domains → projects → folders in the app",
      ],
    },
  },
  {
    id: "byok",
    eyebrow: "BYOK + Gateway",
    title: "Your keys, every LLM, one workspace",
    body: "Bring your own provider keys — LayerFlow is control, not markup. When you're ready to build, call the OpenAI-compatible gateway with an lf_ key. A first-party SDK is coming; use HTTP today.",
    bullets: [
      "BYOK: you keep provider billing",
      "OpenAI-compatible /v1 for drop-in apps",
      "Official SDK planned — not on npm yet",
    ],
    cta: [
      { label: "Connect keys", href: "/workspace" },
      { label: "View pricing", href: "/pricing" },
    ],
    code: {
      lang: "typescript",
      lines: [
        "import OpenAI from 'openai'",
        "",
        "const client = new OpenAI({",
        "  apiKey: process.env.LAYERFLOW_API_KEY, // lf_…",
        "  baseURL: 'https://layerflow.dev/v1',",
        "})",
        "",
        "await client.chat.completions.create({",
        "  model: 'gpt-4o-mini',",
        "  messages: [{ role: 'user', content: 'Hi' }],",
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
    title: "BYOK + Gateway",
    desc: "Your keys, your billing. Call /v1 with an lf_ key when you build — gateway is one feature, not the whole product.",
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
    lang: "bash",
    code: ["open https://layerflow.dev/prompts"],
    time: "~2 minutes",
  },
  {
    n: 3,
    title: "Compare and connect",
    desc: "Pick the best model in the workspace, then call the gateway from your app with curl or the OpenAI SDK.",
    lang: "bash",
    code: [
      "curl https://layerflow.dev/v1/chat/completions \\",
      "  -H \"Authorization: Bearer lf_…\" \\",
      "  -H \"Content-Type: application/json\" \\",
      "  -d '{\"model\":\"gpt-4o-mini\",\"messages\":[{\"role\":\"user\",\"content\":\"Hi\"}]}'",
    ],
    time: "~1 minute",
  },
];

export const faqs = [
  {
    q: "What is LayerFlow?",
    a: "LayerFlow is the AI workspace for prompts, models, and cost control. Save prompts, compare models, set hard budgets, and organize projects — with BYOK and an OpenAI-compatible gateway when you're ready to build.",
  },
  {
    q: "Who is LayerFlow for?",
    a: "Developers and AI power users who live in prompts, models, and tools. Students, marketers, and teams come later — we're focused on the people who need this workspace today.",
  },
  {
    q: "Is LayerFlow an infrastructure platform?",
    a: "No. LayerFlow is a workspace first. The OpenAI-compatible gateway (and a planned first-party SDK) is one feature for developers who build and deploy — not the whole product.",
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

/** Homepage teaser posts — sourced from the full blog corpus at runtime in Blog.tsx */

export type PricingTier = {
  name: string;
  /** Displayed amount users pay now (₹0 while launch pricing is free). */
  price: string;
  /** Original list price — shown struck through when launch pricing is free. */
  originalPrice?: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  href: string;
  highlighted: boolean;
  /** When true, plan is not available yet — no payment, no signup CTA. */
  comingSoon?: boolean;
};

export const pricingTiers: PricingTier[] = [
  {
    name: "Basic",
    originalPrice: "₹499",
    price: "₹0",
    period: "/ month",
    description: "Personal workspace to organize prompts and stay under budget.",
    features: [
      "Unlimited personal projects",
      "Prompt Timeline & Compare",
      "1,000 runs / month",
      "Basic cost tracking",
      "Hard budget limits",
    ],
    cta: "Start free",
    href: "/sign-in",
    highlighted: false,
  },
  {
    name: "Pro",
    originalPrice: "₹1,999",
    price: "₹0",
    period: "/ month",
    description: "For developers and AI power users who live in prompts.",
    features: [
      "Unlimited personal runs",
      "Advanced budget alerts",
      "Full version history",
      "BYOK + OpenAI-compatible gateway",
      "Priority support",
    ],
    cta: "Get Pro free",
    href: "/sign-in",
    highlighted: true,
  },
  {
    name: "Advanced",
    originalPrice: "₹4,999",
    price: "₹0",
    period: "/ month",
    description: "Shared workspace, teams, and advanced controls — launching soon.",
    features: [
      "Everything in Pro",
      "Shared prompt libraries",
      "Multi-key management",
      "Team cost dashboard",
      "Role-based access",
    ],
    cta: "Coming soon",
    href: "#",
    highlighted: false,
    comingSoon: true,
  },
];

export const aboutValues = [
  {
    title: "Workspace first",
    desc: "Prompt organization and cost control are the product. Gateway and HTTP API are how you build — not the headline.",
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
      { label: "Blog", href: "/blog" },
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
