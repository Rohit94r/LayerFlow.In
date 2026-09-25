import type { Plan, Testimonial, FaqItem, RoadmapPhase, UseCase } from "@/lib/types";
import { doodleForName } from "@/lib/doodles";

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
    price: "₹0",
    period: "/month",
    description: "Cap spend and route through LayerFlow. No card required.",
    features: [
      "OpenAI-compatible gateway",
      "BYOK — your provider keys",
      "20 gateway messages/day (hard-capped)",
      "Hard budget caps + 50/80/100% alerts",
      "Usage history",
      "Community support",
    ],
    cta: "Start free",
    href: "/sign-in",
    highlighted: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "$9",
    period: "/month",
    description: "For solo devs and freelancers who want real AI spend control without markup.",
    features: [
      "Unlimited gateway requests (no daily cap)",
      "BYOK vault — provider keys + custom base URLs",
      "Per-project spend with a single header",
      "Hard budget caps + email alerts at 50/80/100%",
      "Usage history — model, tokens, project, cost",
      "Usage history exports (CSV / JSON / PDF)",
      "lf CLI direct mode + lf config",
      "Loose-key mode — keys never stored or logged",
    ],
    cta: "Go Pro",
    href: "/sign-in",
    highlighted: true,
    badge: "Most popular",
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
    photo: doodleForName("Alfonso Roa Redondo"),
    highlights: ["rebuilt everything in seconds"],
  },
  {
    quote:
      "I switched from GPT to Gemini without losing any project context.",
    name: "Hadil Affes",
    role: "Frontend engineer",
    initials: "HA",
    color: "#44edbc",
    photo: doodleForName("Hadil Affes"),
    highlights: ["without losing any project context"],
  },
  {
    quote:
      "My AI costs dropped because LayerFlow recommended the cheapest model.",
    name: "Alvin Rindra Fazrie",
    role: "Indie hacker",
    initials: "AF",
    color: "#8b7cf8",
    photo: doodleForName("Alvin Rindra Fazrie"),
    highlights: ["recommended the cheapest model"],
  },
  {
    quote:
      "I stopped storing prompts everywhere — Notion, ChatGPT, random files. Now everything lives in LayerFlow.",
    name: "Imen Selmi",
    role: "AI tinkerer",
    initials: "IS",
    color: "#f472b6",
    photo: doodleForName("Imen Selmi"),
    highlights: ["stopped storing prompts everywhere"],
  },
  {
    quote:
      "Half my work happens at 1am across three AIs. LayerFlow keeps the thread intact between all of them.",
    name: "Aman Kumar",
    role: "Founder",
    initials: "AK",
    color: "#38bdf8",
    photo: doodleForName("Aman Kumar"),
    highlights: ["keeps the thread intact"],
  },
  {
    quote:
      "My teammate picked up my entire project from one AI summary — zero re-explaining.",
    name: "Hamza usman ghani",
    role: "Freelance developer",
    initials: "HG",
    color: "#a3e635",
    photo: doodleForName("Hamza usman ghani"),
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
    title: "Gateway & Keys",
    description: "One OpenAI-compatible endpoint in front of every major provider, with your own keys and zero markup.",
    status: "live",
    items: ["OpenAI-compatible gateway", "BYOK provider keys", "Platform keys", "Demo mode with daily caps"],
  },
  {
    phase: "Phase 2",
    title: "Spend Control",
    description: "See and control every dollar: budgets, alerts, and per-project attribution.",
    status: "live",
    items: ["Hard budget caps", "Alerts at 50/80/100%", "Per-project spend", "Usage history"],
  },
  {
    phase: "Phase 3",
    title: "CLI & Direct Mode",
    description: "Use lf from any shell — through the gateway for budgets, or direct to your provider.",
    status: "live",
    items: ["lf chat direct mode", "lf config", "Custom base URLs", "Provider env keys"],
  },
  {
    phase: "Phase 4",
    title: "Developer layer",
    description: "Repo-scale context and spend controls that work with Cursor, Claude Code, and friends.",
    status: "building",
    items: ["Gateway SDK + docs", "LAYERFLOW.md", "Repo AI Summaries", "Git change story", "Export to any coding agent"],
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
