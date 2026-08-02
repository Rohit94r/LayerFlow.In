export const site = {
  name: "LayerFlow",
  headline: "Code with AI — in your browser or terminal",
  subtitle:
    "The AI coding platform with a rescue workflow. Write plain English, click Improve, and run working prompts — or open the terminal and let multiple agents build with you. Rescue dead chats, carry context between tools and models, and control every penny you spend on AI.",
  tagline: "The AI Coding Platform",
  workspaceHref: "/home",
  signInHref: "/sign-in",
  pricingHref: "/pricing",
};

export const proofPoints = [
  "Coding Agents",
  "Plain-English Improve",
  "Browser Terminal",
  "Multi-Agent",
  "Context Passport",
  "Cost Check",
];

export const journeySteps = [
  "Rescue",
  "Compress",
  "Improve",
  "Passport",
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
    | "passport"
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
        description: "Web code editor — plain English in, working code out.",
        href: "/code",
        icon: "code",
      },
      {
        title: "Browser Terminal",
        description: "An opencode-style terminal that runs in your browser.",
        href: "/code?tab=terminal",
        icon: "terminal",
      },
      {
        title: "Multi-Agent",
        description: "Implement, review and test agents working in parallel.",
        href: "/code?tab=agents",
        icon: "agents",
      },
      {
        title: "Run Sessions",
        description: "Every run saved as a passport — resume anywhere.",
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
        href: "/rescue",
        icon: "rescue",
      },
      {
        title: "Smart Compress",
        description: "Squeeze long conversations into tiny context.",
        href: "/rescue?mode=compress",
        icon: "compress",
      },
      {
        title: "Improve Prompt",
        description: "Turn vague asks into precise, reliable prompts.",
        href: "/rescue?mode=prompt",
        icon: "improve",
      },
      {
        title: "Continue Pack",
        description: "Pick up where a session ended — no re-explaining.",
        href: "/rescue?mode=continue",
        icon: "continue",
      },
    ],
  },
  {
    title: "Context",
    items: [
      {
        title: "Context Passport",
        description: "Your reusable context card — tools read it, models use it.",
        href: "/passports",
        icon: "passport",
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
