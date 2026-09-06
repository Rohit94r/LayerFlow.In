export const site = {
  name: "LayerFlow",
  headline: "Code with AI — in your browser or terminal",
  subtitle:
    "The AI workspace for teams. Chat across any model, rescue dead conversations instead of restarting them, run agents with approvals, sync your terminal sessions, and control every penny you spend — one memory, everywhere.",
  tagline: "The AI Workspace",
  workspaceHref: "/home",
  signInHref: "/sign-in",
  pricingHref: "/pricing",
};

export const proofPoints = [
  "Chat across models",
  "Rescue dead chats",
  "Agents with approvals",
  "Browser + Terminal sync",
  "AI Memory + Search",
  "BYOK + budget caps",
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
  { label: "Blog", href: "/blog" },
  { label: "Docs", href: "/docs" },
  { label: "Pricing", href: "/pricing" },
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

/** Navbar + mobile menu — grouped by product pillars (Code + Context OS). */
export const featureMenu: FeatureMenuSection[] = [
  {
    title: "Code",
    items: [
      {
        title: "Coding Workspace",
        description: "Web code workspace — plain English in, working code out.",
        href: "/workspace",
        icon: "code",
      },
      {
        title: "Improve Prompt",
        description: "One click in chat — your rough prompt becomes a sharp, low-token prompt.",
        href: "/chat",
        icon: "terminal",
      },
      {
        title: "Build Agents",
        description: "Create your own specialist agents — custom prompts, models, budgets.",
        href: "/agents",
        icon: "agents",
      },
      {
        title: "Run Sessions",
        description: "Every run saved with an AI summary — resume anywhere.",
        href: "/workspace",
        icon: "sessions",
      },
    ],
  },
  {
    title: "Rescue",
    items: [
      {
        title: "Rescue Chat",
        description: "Paste a dead chat — get a clean, working prompt.",
        href: "/chat",
        icon: "rescue",
      },
      {
        title: "Smart Compress",
        description: "Squeeze long conversations into tiny context.",
        href: "/chat",
        icon: "compress",
      },
      {
        title: "Continue Pack",
        description: "Pick up where a session ended — no re-explaining.",
        href: "/chat",
        icon: "continue",
      },
    ],
  },
  {
    title: "Context",
    items: [
      {
        title: "AI Conversation Summary",
        description: "Every rescue keeps an AI summary — goal, decisions, constraints, next action.",
        href: "/chat",
        icon: "summary",
      },
      {
        title: "Prompt Library",
        description: "Every prompt you've built, versioned and searchable.",
        href: "/prompts",
        icon: "prompts",
      },
      {
        title: "Context Search",
        description: "Find any past conversation, decision, or snippet.",
        href: "/workspace",
        icon: "search",
      },
      {
        title: "Learning Memory",
        description: "LayerFlow remembers your preferences across tools.",
        href: "/workspace",
        icon: "memory",
      },
    ],
  },
  {
    title: "Workspace & models",
    items: [
      {
        title: "AI Work Ledger",
        description: "Projects and timelines — every run in one record.",
        href: "/workspace",
        icon: "ledger",
      },
      {
        title: "Cost Analytics",
        description: "See spend by project, tool, and model in real time.",
        href: "/costs",
        icon: "cost",
      },
      {
        title: "Models",
        description: "All models, one marketplace — best one suggested.",
        href: "/models",
        icon: "models",
      },
      {
        title: "BYOK",
        description: "Your keys, your billing — LayerFlow is control, not markup.",
        href: "/models",
        icon: "byok",
      },
    ],
  },
];

export const heroBadges = proofPoints.map((label) => ({ label }));
