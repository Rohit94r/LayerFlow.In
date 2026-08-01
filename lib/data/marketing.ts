import type { Plan, Testimonial, FaqItem, RoadmapPhase, UseCase } from "@/lib/types";

export const site = {
  name: "LayerFlow",
  tagline: "The AI Context Operating System",
  url: "https://layerflow.dev",
  workspaceHref: "/app",
  signupHref: "/sign-in",
};

// ── Pricing ──────────────────────────────────────────────────

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "/month",
    description: "Rescue a few chats and feel the workflow. No card required.",
    features: [
      "3 Rescue Reports / month",
      "3 Context Passports",
      "Smart Compress + Context Diff",
      "Improve Prompt (5 / month)",
      "Basic Prompt Library",
      "Markdown export",
      "Community support",
    ],
    cta: "Start free",
    href: "/sign-in",
    highlighted: false,
  },
  {
    id: "starter",
    name: "Starter",
    price: "$5",
    period: "/month",
    description: "For people who switch models weekly and never want to re-explain work.",
    features: [
      "30 Rescue Reports / month",
      "Unlimited Context Passports",
      "Smart Compress + Context Diff",
      "Unlimited Improve Prompt",
      "Cost Check on every report",
      "BYOK — bring your own keys",
      "Prompt Library with scores",
      "Workspace + context search",
      "AI Work Ledger",
    ],
    cta: "Start 14-day trial",
    href: "/sign-in",
    highlighted: true,
    badge: "Most popular",
  },
  {
    id: "pro",
    name: "Pro",
    price: "$14",
    period: "/month",
    description: "Heavy AI users who want the full workflow, priority speed, and exports.",
    features: [
      "Everything in Starter",
      "Unlimited Rescue Reports",
      "Advanced Cost Analytics",
      "Best Model Suggestion + routing",
      "Large passports (up to 100k words)",
      "Priority processing queue",
      "CSV / JSON / Markdown exports",
      "Early access: browser companion",
    ],
    cta: "Go Pro",
    href: "/sign-in",
    highlighted: false,
  },
];

// ── Testimonials (mock) ──────────────────────────────────────

export const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "I hit the Claude limit at 11pm with a design doc half-written. LayerFlow rebuilt the whole context in 20 seconds and I finished on Gemini Flash. Cost me $0.01.",
    name: "Aarav Mehta",
    role: "Founder, Shipyard Labs",
    initials: "AM",
    color: "#f59e0b",
  },
  {
    quote:
      "The Context Passport is the first thing that actually captures *why* we made decisions. My co-founder picks up work from a passport and it's like we never switched tools.",
    name: "Sofia Reyes",
    role: "CTO, Loopline",
    initials: "SR",
    color: "#44edbc",
  },
  {
    quote:
      "Cost Check paid for itself in a week. I moved summaries from Opus to Gemini Flash and saved roughly $140/month without noticing any quality difference.",
    name: "Daniel Kim",
    role: "Indie hacker",
    initials: "DK",
    color: "#8b7cf8",
  },
  {
    quote:
      "I switched ChatGPT → Claude → Gemini constantly for client work. Continue Pack means I never have to re-paste a 9,000-word brief ever again.",
    name: "Priya Sharma",
    role: "Marketing consultant",
    initials: "PS",
    color: "#f472b6",
  },
  {
    quote:
      "Prompt Score stopped me from shipping vague prompts. My improved prompt for webhook design got a 94 and the Claude output genuinely needed zero rewrites.",
    name: "Marcus Chen",
    role: "Staff engineer, Northwind",
    initials: "MC",
    color: "#38bdf8",
  },
  {
    quote:
      "As a student, hitting the ChatGPT cap mid-essay was my whole week. LayerFlow rescued the essay, improved my next prompt, and I finished in DeepSeek for free.",
    name: "Ananya Iyer",
    role: "CS student",
    initials: "AI",
    color: "#a3e635",
  },
];

// ── FAQ ──────────────────────────────────────────────────────

export const FAQS: FaqItem[] = [
  {
    question: "What exactly is a Context Passport?",
    answer:
      "It's a portable memory package for one AI task. It captures your goal, current state, key decisions, constraints, what worked, what failed, and the next action — so any AI model can continue your work without you re-explaining everything.",
  },
  {
    question: "Do I have to paste my whole chat history?",
    answer:
      "No. Paste whatever you have — even a partial thread. LayerFlow's Smart Compress finds the useful context, shows you what it removed (Context Diff), and only keeps what matters for continuing the work.",
  },
  {
    question: "Which AI tools does LayerFlow work with?",
    answer:
      "Any conversation you can copy-paste: ChatGPT, Claude, Gemini, DeepSeek, Kimi, Groq, OpenRouter, Perplexity — or plain text. Source detection is automatic, and Continue Packs are model-agnostic.",
  },
  {
    question: "Is my conversation stored?",
    answer:
      "Only what you save. Unsaved analysis is discarded when you leave the page. Saved passports are private to your workspace, and a private/no-storage mode is on the roadmap. Raw chat is never sent to third-party analytics.",
  },
  {
    question: "What does BYOK mean?",
    answer:
      "Bring Your Own Key. Connect your own OpenAI, Anthropic, Google, DeepSeek, Kimi, or Groq API keys and LayerFlow uses them directly — you pay your provider's prices and we never resell tokens. Your keys are encrypted.",
  },
  {
    question: "How does Cost Check work?",
    answer:
      "LayerFlow estimates the tokens in your compressed context, applies real provider price sheets, and shows you the dollar cost per model — plus a recommendation of the cheapest model that's 'good enough' for the task.",
  },
  {
    question: "Can I really continue in another AI after a limit?",
    answer:
      "Yes — that's the whole point. Generate a Continue Pack, copy it, paste it into ChatGPT, Claude, Gemini, DeepSeek, or Kimi. The pack contains everything that model needs to continue exactly where you stopped.",
  },
  {
    question: "Is there a free plan forever?",
    answer:
      "Yes. Free includes 3 Rescue Reports a month with no card. Upgrade when the workflow is saving you real time — the plan is priced on workflow value, never on unlimited AI credits.",
  },
];

// ── Roadmap ──────────────────────────────────────────────────

export const ROADMAP: RoadmapPhase[] = [
  {
    phase: "Phase 1",
    title: "Rescue Reports",
    description: "Paste any chat and get a clean, compressed, priced, ready-to-continue report.",
    status: "live",
    items: ["Limit Rescue", "Context Passport", "Smart Compress", "Context Diff", "Improve Prompt", "Cost Check", "Best Model Suggestion", "Continue Pack"],
  },
  {
    phase: "Phase 2",
    title: "The Workspace",
    description: "Your AI work becomes an organized, searchable library that compounds.",
    status: "building",
    items: ["Projects", "Context Passport library", "Prompt Library", "Context Search", "Learning Memory", "AI Work Ledger", "Cost Analytics", "BYOK vault"],
  },
  {
    phase: "Phase 3",
    title: "Companion",
    description: "Capture and continue without leaving your AI tool of the moment.",
    status: "planned",
    items: ["Browser companion", "One-click chat capture", "Continue Pack injection", "Quick Cost Check", "Private / no-storage mode"],
  },
  {
    phase: "Phase 4",
    title: "Developer layer",
    description: "Repo-scale context passports that work with Cursor, Claude Code, and friends.",
    status: "planned",
    items: ["lf CLI: init, context, cost, suggest", "LAYERFLOW.md", "Repo Context Passports", "Git change story", "Export to any coding agent"],
  },
];

// ── Use cases ────────────────────────────────────────────────

export const USE_CASES: UseCase[] = [
  {
    title: "Limit Rescue",
    description: "Hit the ChatGPT or Claude cap mid-task? Paste the thread and continue in another model in under a minute.",
    example: "Rescued a 6,400-word outreach sequence after the GPT-5 limit at email 3.",
    icon: "lifebuoy",
  },
  {
    title: "Switch tools weekly",
    description: "Work in ChatGPT, think in Claude, summarize in Gemini — without re-explaining your project every time.",
    example: "7 passports for the webhook API; each model picks up the same decisions.",
    icon: "shuffle",
  },
  {
    title: "Cut AI spend",
    description: "Cost Check surfaces the cheapest model that's good enough for the task. Most users save 60–90% per run.",
    example: "$0.08 → $0.007 per webhook design run with DeepSeek.",
    icon: "piggy-bank",
  },
  {
    title: "Keep client work alive",
    description: "Freelancers and agencies never lose a brief, a brand voice, or an approved direction between sessions.",
    example: "A 9,000-word brand brief fits in a passport that any model can continue.",
    icon: "briefcase",
  },
  {
    title: "Studying & research",
    description: "Preserve the thread of your research across models, including what failed so you don't retry dead ends.",
    example: "Essay rescue after the cap — finished in DeepSeek with all citations intact.",
    icon: "graduation-cap",
  },
  {
    title: "Team handoff",
    description: "Share a project's context so the next person (or AI) starts from decisions, not from zero.",
    example: "Co-founder opens a passport and continues a design doc without a 30-minute brief.",
    icon: "users",
  },
];

// ── Problem section copy ─────────────────────────────────────

export const PROBLEM_POINTS = [
  {
    title: "You re-explain everything",
    description:
      "Every model switch starts with a blank chat. By the time the new model understands your project, you've burned 20 minutes and a chunk of your limit.",
  },
  {
    title: "Limits kill momentum",
    description:
      "The cap always lands mid-task — on a deadline, at 11pm, right before the good answer. The work sits in a chat you can't even reopen.",
  },
  {
    title: "Decisions get lost",
    description:
      "The 'why' behind choices lives in scrollback. A week later, even you don't know why the idempotency table exists — and the AI definitely doesn't.",
  },
  {
    title: "You pay for repeated context",
    description:
      "Re-pasting the same 8,000-word context into every model isn't just slow — it's dollars. Most users burn 60–90% of their spend on context they've already shown another AI.",
  },
];

// ── Comparison table ─────────────────────────────────────────

export const COMPARISON_ROWS: { label: string; layerflow: boolean; rawChat: boolean; extension: string }[] = [
  { label: "Continue work after a limit", layerflow: true, rawChat: false, extension: "Partial" },
  { label: "Portable memory package", layerflow: true, rawChat: false, extension: "Basic" },
  { label: "Tells you what context it removed", layerflow: true, rawChat: false, extension: "No" },
  { label: "Improves your next prompt", layerflow: true, rawChat: false, extension: "Rarely" },
  { label: "Shows dollar cost per model", layerflow: true, rawChat: false, extension: "No" },
  { label: "Recommends a model + explains why", layerflow: true, rawChat: false, extension: "No" },
  { label: "Searchable project memory", layerflow: true, rawChat: false, extension: "Limited" },
  { label: "Learning memory that compounds", layerflow: true, rawChat: false, extension: "No" },
  { label: "Works with every AI tool", layerflow: true, rawChat: true, extension: "Depends" },
  { label: "No extension install required", layerflow: true, rawChat: true, extension: "No" },
];
