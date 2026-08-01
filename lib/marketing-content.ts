export const site = {
  name: "LayerFlow",
  headline: "Never lose AI context again",
  subtitle:
    "The AI Context Operating System — rescue dead chats, carry context between tools and models, compress conversations, improve prompts, and control every penny you spend on AI.",
  tagline: "The AI Context Operating System",
  docsCommand: "lf rescue dead-chat.md --to prompt",
  workspaceHref: "/home",
  signInHref: "/sign-in",
  pricingHref: "/pricing",
};

export const proofPoints = [
  "Context Passport",
  "Limit Rescue",
  "Smart Compress",
  "Improve Prompt",
  "Cost Check",
  "BYOK",
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
  { label: "Blog", href: "/blog" },
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
    | "byok";
};

export type FeatureMenuSection = {
  title: string;
  items: FeatureMenuItem[];
};

/** Navbar + mobile menu — grouped by the AI Context OS pillars. */
export const featureMenu: FeatureMenuSection[] = [
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
