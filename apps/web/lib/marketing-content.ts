export const site = {
  name: "LayerFlow",
  headline: "Stop surprise AI bills. Cap spend per project in 2 minutes.",
  subtitle:
    "The AI spend firewall. Route every model call through one OpenAI-compatible gateway — your keys, hard budget caps, alerts at 50/80/100%, and usage history you can trust.",
  tagline: "AI Spend Firewall",
  workspaceHref: "/home",
  signInHref: "/sign-in",
  pricingHref: "/pricing",
};

export const proofPoints = [
  "Hard budget caps",
  "Your keys, zero markup",
  "Alerts at 50/80/100%",
  "Per-project spend",
  "Usage history",
  "OpenAI-compatible gateway",
];

export const journeySteps = [
  "Rescue",
  "Compress",
  "Improve",
  "Summarize",
  "Continue",
];

export type NavItem = {
  label: string;
  href: string;
  menu?: "features";
};

export const nav: NavItem[] = [
  { label: "Features", href: "/#features", menu: "features" },
  { label: "Terminal", href: "/#terminal" },
  { label: "Models", href: "/#models" },
  { label: "Pricing", href: "/pricing" },
  { label: "Docs", href: "/docs" },
  { label: "Blog", href: "/blog" },
];

export type FeatureMenuItem = {
  title: string;
  description: string;
  href: string;
  icon:
    | "rescue"
    | "compress"
    | "improve"
    | "continue"
    | "summary"
    | "prompts"
    | "search"
    | "memory"
    | "ledger"
    | "cost"
    | "models"
    | "byok"
    | "code"
    | "terminal"
    | "agents"
    | "sessions";
};

export type FeatureMenuSection = {
  title: string;
  items: FeatureMenuItem[];
};

/** Navbar + mobile menu — grouped around the AI spend firewall. */
export const featureMenu: FeatureMenuSection[] = [
  {
    title: "Spend",
    items: [
      {
        title: "Hard Budget Caps",
        description: "Set a monthly cap per workspace — requests hard-block at the limit.",
        href: "/costs",
        icon: "cost",
      },
      {
        title: "Alerts at 50/80/100%",
        description: "Email alerts at each tier so you course-correct before you overshoot.",
        href: "/costs",
        icon: "summary",
      },
      {
        title: "Usage History",
        description: "Every gateway request accounted — model, tokens, project, cost.",
        href: "/history",
        icon: "ledger",
      },
      {
        title: "Per-Project Cost",
        description: "Tag any client or project with one header — spend is attributed instantly.",
        href: "/costs",
        icon: "cost",
      },
    ],
  },
  {
    title: "Keys",
    items: [
      {
        title: "BYOK",
        description: "Your keys, your billing — LayerFlow is control, not markup.",
        href: "/keys",
        icon: "byok",
      },
      {
        title: "Gateway Keys",
        description: "Platform keys with plan gating — or bring your own provider keys.",
        href: "/keys",
        icon: "prompts",
      },
      {
        title: "Direct Mode",
        description: "Any OpenAI-compatible client can talk to LayerFlow or your provider directly.",
        href: "/keys",
        icon: "terminal",
      },
    ],
  },
  {
    title: "Models",
    items: [
      {
        title: "All Models",
        description: "One OpenAI-compatible API in front of every major provider.",
        href: "/models",
        icon: "models",
      },
      {
        title: "Pricing Truth",
        description: "Live registry pricing — cost to the 4th decimal, never under-charged.",
        href: "/models",
        icon: "improve",
      },
      {
        title: "Models & Routing",
        description: "Pick a model per workspace or per request — no lock-in.",
        href: "/models",
        icon: "sessions",
      },
    ],
  },
  {
    title: "Chat",
    items: [
      {
        title: "Chat",
        description: "One thread across Claude, ChatGPT, Gemini and DeepSeek.",
        href: "/chat",
        icon: "continue",
      },
      {
        title: "Cost Aware",
        description: "Token and cost figures on every reply — you always know the price.",
        href: "/costs",
        icon: "search",
      },
      {
        title: "Rescue Chat",
        description: "Paste a dead chat — get a clean, working prompt.",
        href: "/chat",
        icon: "rescue",
      },
    ],
  },
];

export const heroBadges = proofPoints.map((label) => ({ label }));
