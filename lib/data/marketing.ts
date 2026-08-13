import type { Plan, Testimonial, FaqItem, RoadmapPhase, UseCase } from "@/lib/types";

export const site = {
  name: "LayerFlow",
  tagline: "The AI Coding Platform",
  url: "https://layerflow.dev",
  workspaceHref: "/home",
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
      "Chat + model auto-switch (2 models)",
      "3 Rescue Reports / month",
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
      "Unlimited chat + auto model switching",
      "30 Rescue Reports / month",
      "AI Memory + context search",
      "Unlimited Improve Prompt",
      "BYOK — encrypted provider keys",
      "Terminal sync (lf CLI)",
      "Hard budget caps + cost analytics",
      "Prompt Library with scores",
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
    description: "Heavy AI users who want agents, team workspaces, and the full workflow.",
    features: [
      "Everything in Starter",
      "Unlimited Rescue Reports",
      "Autonomous Agents + approvals",
      "Team workspaces (roles + invitations)",
      "Best Model routing",
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
      "Claude hit its limit while I was writing a design document. LayerFlow rebuilt everything in seconds.",
    name: "Alfonso Roa Redondo",
    role: "Full-stack developer",
    initials: "AR",
    color: "#f59e0b",
    photo: "/images/doodles/groovy.svg",
    highlights: ["rebuilt everything in seconds"],
  },
  {
    quote:
      "I switched from GPT to Gemini without losing any project context.",
    name: "Hadil Affes",
    role: "Frontend engineer",
    initials: "HA",
    color: "#44edbc",
    photo: "/images/doodles/selfie.svg",
    highlights: ["without losing any project context"],
  },
  {
    quote:
      "My AI costs dropped because LayerFlow recommended the cheapest model.",
    name: "Alvin Rindra Fazrie",
    role: "Indie hacker",
    initials: "AF",
    color: "#8b7cf8",
    photo: "/images/doodles/reading-side.svg",
    highlights: ["recommended the cheapest model"],
  },
  {
    quote:
      "I stopped storing prompts everywhere — Notion, ChatGPT, random files. Now everything lives in LayerFlow.",
    name: "Imen Selmi",
    role: "AI tinkerer",
    initials: "IS",
    color: "#f472b6",
    photo: "/images/doodles/meditating.svg",
    highlights: ["stopped storing prompts everywhere"],
  },
  {
    quote:
      "Half my work happens at 1am across three AIs. LayerFlow keeps the thread intact between all of them.",
    name: "Aman Kumar",
    role: "Founder",
    initials: "AK",
    color: "#38bdf8",
    photo: "/images/doodles/sitting-reading.svg",
    highlights: ["keeps the thread intact"],
  },
  {
    quote:
      "My teammate picked up my entire project from one AI summary — zero re-explaining.",
    name: "Hamza usman ghani",
    role: "Freelance developer",
    initials: "HG",
    color: "#a3e635",
    photo: "/images/doodles/coffee.svg",
    highlights: ["zero re-explaining"],
  },
];

// ── FAQ ──────────────────────────────────────────────────────

export const FAQS: FaqItem[] = [
  {
    question: "What exactly is an AI conversation summary?",
    answer:
      "It's the extracted memory of one rescued AI task. LayerFlow distills your chat into goal, current state, key decisions, constraints, what worked, what failed, and the next action — so any AI model can continue your work without you re-explaining everything.",
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
      "Only what you save. Unsaved analysis is discarded when you leave the page. Saved summaries are private to your workspace, and a private/no-storage mode is on the roadmap. Raw chat is never sent to third-party analytics.",
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
    title: "Rescue & Chat",
    description: "Chat across any model with automatic failover, and rescue dead conversations instead of restarting them.",
    status: "live",
    items: ["Multi-model Chat", "Limit Rescue", "Auto model switching", "Improve Prompt", "Conversation summaries"],
  },
  {
    phase: "Phase 2",
    title: "Workspace & Memory",
    description: "Your AI work becomes an organized, searchable memory that compounds across sessions.",
    status: "live",
    items: ["AI Memory", "Context Search", "Prompt Library", "Cost Analytics", "BYOK vault"],
  },
  {
    phase: "Phase 3",
    title: "Agents, Team & Terminal",
    description: "Autonomous agents with approvals, team workspaces, budgets, and a CLI that syncs with the web app.",
    status: "live",
    items: ["Autonomous Agents", "Approvals + schedules", "Team workspaces", "Terminal sync", "Hard budget caps"],
  },
  {
    phase: "Phase 4",
    title: "Developer layer",
    description: "Repo-scale context that works with Cursor, Claude Code, and friends.",
    status: "building",
    items: ["lf CLI: run, sync, rescue", "LAYERFLOW.md", "Repo AI Summaries", "Git change story", "Export to any coding agent"],
  },
];

// ── Use cases ────────────────────────────────────────────────

export const USE_CASES: UseCase[] = [
  {
    title: "Code without coding",
    description: "Build features using natural language without losing context.",
    example: "\"build me a landing page\" → improved prompt (92/100) → 3 agents → committed in one session.",
    icon: "code",
  },
  {
    title: "Limit Rescue",
    description: "Continue after ChatGPT or Claude usage limits.",
    example: "Rescued a 6,400-word outreach sequence after the GPT-5 limit at email 3.",
    icon: "lifebuoy",
  },
  {
    title: "Switch tools freely",
    description: "Move between GPT, Claude and Gemini with zero context loss.",
    example: "7 AI summaries for the webhook API; each model picks up the same decisions.",
    icon: "shuffle",
  },
  {
    title: "Reduce AI costs",
    description: "Automatically choose the cheapest model for the same task.",
    example: "$0.08 → $0.007 per webhook design run with DeepSeek.",
    icon: "piggy-bank",
  },
  {
    title: "Keep client work alive",
    description: "Never rewrite project context again.",
    example: "A 9,000-word brand brief fits in one AI summary that any model can continue.",
    icon: "briefcase",
  },
  {
    title: "Study & research",
    description: "Turn conversations into searchable knowledge.",
    example: "Essay rescue after the cap — finished in DeepSeek with all citations intact.",
    icon: "graduation-cap",
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

// ── Supported AI models (Free / Paid) ─────────────────────────

export const SUPPORTED_MODELS: {
  group: "Free" | "Paid";
  note: string;
  items: { name: string; provider: string }[];
}[] = [
  {
    group: "Free",
    note: "Zero-cost models for everyday runs — chat, summarization, compression, prompts, quick fixes.",
    items: [
      { name: "DeepSeek V3", provider: "DeepSeek" },
      { name: "Gemini Flash", provider: "Google" },
      { name: "GPT-4o mini", provider: "OpenAI" },
      { name: "Claude 3.5 Haiku", provider: "Anthropic" },
      { name: "Kimi K2", provider: "Moonshot" },
      { name: "Llama 3.3 70B", provider: "Groq" },
      { name: "Grok 3 Mini", provider: "xAI" },
    ],
  },
  {
    group: "Paid",
    note: "Frontier models for deep reasoning, writing, review and final output — you pay providers directly with BYOK.",
    items: [
      { name: "Claude Sonnet 4", provider: "Anthropic" },
      { name: "Claude Opus 4", provider: "Anthropic" },
      { name: "GPT-4o", provider: "OpenAI" },
      { name: "GPT-4.1", provider: "OpenAI" },
      { name: "o3-mini", provider: "OpenAI" },
      { name: "Gemini 2.5 Pro", provider: "Google" },
      { name: "DeepSeek R1", provider: "DeepSeek" },
      { name: "Grok 3", provider: "xAI" },
      { name: "Kimi K2 Thinking", provider: "Moonshot" },
    ],
  },
];
