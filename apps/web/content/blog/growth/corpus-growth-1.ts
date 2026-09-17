import type { BlogPost } from "@/lib/blog/types";

export const growthPosts1: BlogPost[] = [
  {
    slug: "what-is-layerflow",
    title: "What Is LayerFlow? The AI Workspace with BYOK, Prompts, and Budgets",
    metaTitle: "What Is LayerFlow? BYOK AI Workspace Explained",
    description:
      "LayerFlow is a bring-your-own-key (BYOK) AI workspace where you connect your own OpenAI, Anthropic, Google, and DeepSeek keys, organize prompts, and set hard budget limits. Here's what it does and why it matters in 2026.",
    publishedAt: "2026-09-16",
    category: "Getting started",
    tags: ["LayerFlow", "BYOK", "AI workspace"],
    primaryKeyword: "what is LayerFlow",
    secondaryKeywords: ["LayerFlow explained", "layer flow", "layerd flow", "layred flow"],
    readingTime: "7 min read",
    author: "LayerFlow Team",
    coverImage: "https://picsum.photos/seed/what-is-layerflow/1200/630",
    relatedSlugs: [
      "get-started-layerflow-10-minutes",
      "what-is-llm-gateway",
      "bring-your-own-keys-byok",
    ],
    blocks: [
      { type: "p", text: "LayerFlow is a bring-your-own-key (BYOK) AI workspace. You connect the API keys you already have — OpenAI, Anthropic, Google, DeepSeek, and hundreds more — and LayerFlow gives you one place to write prompts, route across models, set hard budget limits, and track spend. It is the layer between you and your LLM providers." },
      { type: "p", text: "Most people use ChatGPT or Claude through hosted subscriptions. Others start scripting against raw APIs and quickly end up with key sprawl, scattered prompts in chat history, and surprise bills. LayerFlow solves the middle ground: full control over which model you call, with the guardrails that keep spend sane." },
      { type: "h2", id: "what-layerflow-does", text: "What LayerFlow actually does" },
      { type: "ul", items: [
        "BYOK gateway: connect your own keys and route every call through one OpenAI-compatible API.",
        "Prompt workspace: organize, version, and share prompts instead of digging through chat history.",
        "Hard budget limits: set a monthly cap and LayerFlow blocks requests before you overspend.",
        "Spend analytics: see cost per project, per key, per model, and per prompt.",
        "Multi-model routing: pick the cheapest or fastest model per task automatically."
      ] },
      { type: "h2", id: "why-bring-your-own-keys", text: "Why bring-your-own-key matters" },
      { type: "p", text: "With a hosted subscription you get one model family and a fixed price. With BYOK, you bring your own keys, pay the provider directly at their rates, and choose whichever model fits the task. LayerFlow never resells tokens — it optimizes how your own keys are used." },
      { type: "h2", id: "is-layerflow-right-for-you", text: "Is LayerFlow right for you?" },
      { type: "p", text: "LayerFlow fits three kinds of users: developers building AI features who want a managed gateway, freelancers and teams that want a shared prompt library, and anyone tired of surprise AI bills who wants hard budget limits without building them from scratch." },
      { type: "callout", text: "You can start free with your existing keys in about ten minutes — no migration, no new provider accounts, no upfront setup." },
      { type: "h2", id: "getting-started", text: "Getting started" },
      { type: "ol", items: [
        "Create a LayerFlow workspace.",
        "Connect your OpenAI, Anthropic, Google, or DeepSeek API key.",
        "Open the prompt workspace and draft your first prompt.",
        "Set a monthly budget limit.",
        "Call LayerFlow's OpenAI-compatible API from your app."
      ] },
      { type: "h2", id: "faq", text: "FAQ" },
      { type: "faq", items: [
        { q: "What is LayerFlow?", a: "LayerFlow is a BYOK AI workspace and LLM gateway where you connect your own model API keys, organize prompts, route across providers, and enforce hard budget limits." },
        { q: "What does BYOK mean?", a: "BYOK stands for bring-your-own-key. It means you supply your own OpenAI, Anthropic, or other provider API keys instead of paying for a hosted AI subscription." },
        { q: "Is LayerFlow a model provider?", a: "No. LayerFlow does not train or host models. It sits on top of the providers you already use and makes them cheaper, safer, and easier to manage." },
        { q: "Who is LayerFlow for?", a: "Developers, freelancers, and small teams who want structured prompts, spend control, and multi-model routing without vendor lock-in." }
      ] }
    ]
  },
  {
    slug: "what-does-byok-mean",
    title: "What Does BYOK Mean? Bring Your Own Key in AI, Explained",
    metaTitle: "What Does BYOK Mean? Bring Your Own Key Explained",
    description:
      "What does BYOK mean in AI tools? Bring-your-own-key lets you use your own API keys instead of a shared subscription. Here's how it works, what it costs, and when it saves you money.",
    publishedAt: "2026-09-16",
    category: "AI gateway",
    tags: ["BYOK", "API keys", "LLM gateway"],
    primaryKeyword: "what does BYOK mean",
    secondaryKeywords: ["BYOK meaning", "bring your own key AI", "BYOK explained", "BYOK API key"],
    readingTime: "6 min read",
    author: "LayerFlow Team",
    coverImage: "https://picsum.photos/seed/what-does-byok-mean/1200/630",
    relatedSlugs: [
      "byok-for-beginners-guide",
      "bring-your-own-keys-byok",
      "byok-vs-platform-credits",
    ],
    blocks: [
      { type: "p", text: "BYOK stands for bring-your-own-key, and in AI tools it means exactly what it sounds like: you bring your own API key from a provider like OpenAI, Anthropic, or Google instead of paying for a hosted AI subscription. The tool you use routes your requests through that key, and your provider bills you directly." },
      { type: "p", text: "BYOK has exploded in popularity because it fixes two problems at once. First, you avoid overlapping subscriptions — if you already pay for an OpenAI key, you do not need a separate $20 or $200 monthly plan on top. Second, you stay in control: your key, your cap, your usage." },
      { type: "h2", id: "how-byok-works", text: "How BYOK works" },
      { type: "ol", items: [
        "You sign up for an API key on a provider's platform (OpenAI, Anthropic, Google, etc.).",
        "You paste that key into a BYOK app or workspace like LayerFlow.",
        "The app calls the provider on your behalf with your key.",
        "The provider bills you for tokens used, at their published rates.",
        "You can revoke or rotate the key any time from the provider dashboard."
      ] },
      { type: "h2", id: "byok-vs-hosted-plan", text: "BYOK vs a hosted plan" },
      { type: "p", text: "A hosted plan (like ChatGPT Plus or per-seat AI tools) bundles access into one fixed price and hides keys from you. BYOK is usage-based: you get the provider's developer pricing, which can be far cheaper for light use and far more predictable if you set budget limits." },
      { type: "h2", id: "when-byok-saves-money", text: "When BYOK saves you money" },
      { type: "ul", items: [
        "You only pay for tokens you actually use — no monthly fee during quiet weeks.",
        "Cheaper models are available per task; a simple classification does not need the flagship model.",
        "Hard budget limits stop the runaway-call bill you might get with an open key.",
        "Prompts that repeat (system prompts, stored context) can be cached and billed at a discount."
      ] },
      { type: "callout", text: "The biggest BYOK risk is a leaked key. Always use a gateway or workspace that lets you set budget alerts and rotate keys, and never paste keys into a plain prompt." },
      { type: "h2", id: "faq", text: "FAQ" },
      { type: "faq", items: [
        { q: "What does BYOK mean?", a: "BYOK means bring-your-own-key: you supply your own model provider API key to an AI tool instead of relying on a hosted subscription." },
        { q: "Is BYOK cheaper than a subscription?", a: "Usually, for light and medium usage. You pay per token at provider developer rates, so you never pay for idle seats." },
        { q: "Can BYOK get me banned?", a: "No — using your own key in a supported tool is normal. Just avoid services that ask you to share or pool keys." }
      ] }
    ]
  },
  {
    slug: "layerflow-vs-openrouter",
    title: "LayerFlow vs OpenRouter: Which AI Gateway Is Right for You?",
    metaTitle: "LayerFlow vs OpenRouter: AI Gateway Comparison",
    description:
      "OpenRouter gives you one API to many models; LayerFlow adds your own keys, prompt workspaces, and hard budget limits. Compare LayerFlow vs OpenRouter for cost, control, and teams.",
    publishedAt: "2026-09-16",
    category: "AI gateway",
    tags: ["OpenRouter", "LayerFlow", "AI gateway"],
    primaryKeyword: "LayerFlow vs OpenRouter",
    secondaryKeywords: ["OpenRouter alternative", "AI gateway comparison", "BYOK vs OpenRouter"],
    readingTime: "7 min read",
    author: "LayerFlow Team",
    coverImage: "https://picsum.photos/seed/layerflow-vs-openrouter/1200/630",
    relatedSlugs: ["openrouter-vs-lite-llm", "what-is-llm-gateway", "openai-compatible-api-gateway"],
    blocks: [
      { type: "p", text: "OpenRouter is a hosted gateway that gives you one API to hundreds of models; you pay OpenRouter per token. LayerFlow is a bring-your-own-key (BYOK) workspace — your keys, your provider billing, plus prompt management and hard budget limits on top of an OpenAI-compatible gateway." },
      { type: "p", text: "Both solve a real problem: you do not want to integrate ten different provider APIs. But they differ in billing, control, and the extra tooling that comes with each." },
      { type: "h2", id: "billing-models", text: "Billing models: one invoice vs your own keys" },
      { type: "p", text: "OpenRouter resells access: it has its own credits and bills you a small markup on top of provider rates. LayerFlow uses your own keys, so your provider bills you directly at their published rates — no middleman markup, and you keep existing rate limits, features, and discounts." },
      { type: "h2", id: "key-differences", text: "Key differences at a glance" },
      { type: "ul", items: [
        "Pricing: OpenRouter adds a markup; LayerFlow uses your own keys at direct provider rates.",
        "Control: LayerFlow gives you hard budget limits and spend analytics per project and key.",
        "Prompts: LayerFlow includes a prompt workspace with versioning; OpenRouter is API-only.",
        "Teams: LayerFlow includes shared prompt libraries and access control for teams.",
        "Features: LayerFlow supports chat completions, structured outputs, caching, and streaming like OpenRouter."
      ] },
      { type: "h2", id: "when-to-pick-each", text: "When to pick each" },
      { type: "p", text: "Pick OpenRouter if you want instant access to many models with one new account and a single invoice. Pick LayerFlow if you already have provider keys, care about per-model cost control, want a prompt library, and prefer direct billing with no markup." },
      { type: "callout", text: "You can test LayerFlow's OpenAI-compatible endpoint by pointing any existing OpenAI SDK at it — no code changes needed to compare the experience." },
      { type: "h2", id: "faq", text: "FAQ" },
      { type: "faq", items: [
        { q: "Is LayerFlow cheaper than OpenRouter?", a: "LayerFlow uses your own API keys with direct provider billing, so you avoid OpenRouter's per-token markup for equivalent usage." },
        { q: "Can I use LayerFlow as an OpenRouter replacement?", a: "Yes. LayerFlow exposes an OpenAI-compatible API, so apps built for OpenRouter can point to LayerFlow and keep working." },
        { q: "Does LayerFlow support many models?", a: "It routes to OpenAI, Anthropic, Google, DeepSeek, and other providers through your keys — hundreds of models through one API." }
      ] }
    ]
  },
  {
    slug: "layerflow-vs-langsmith",
    title: "LayerFlow vs LangSmith: Prompt Management, Cost, and Observability",
    metaTitle: "LayerFlow vs LangSmith: Prompt Workspace vs AI Platform",
    description:
      "LangSmith is a full AI observability and evaluation platform; LayerFlow is a BYOK workspace for prompts, budgets, and routing. Compare them for cost control, prompt versioning, and team workflows.",
    publishedAt: "2026-09-15",
    category: "AI gateway",
    tags: ["LangSmith", "prompt management", "observability"],
    primaryKeyword: "LayerFlow vs LangSmith",
    secondaryKeywords: ["LangSmith alternative", "prompt workspace", "AI observability"],
    readingTime: "8 min read",
    author: "LayerFlow Team",
    coverImage: "https://picsum.photos/seed/layerflow-vs-langsmith/1200/630",
    relatedSlugs: ["langsmith-alternatives-prompt-tooling", "prompt-management-vs-observability", "llm-observability-tools-2026"],
    blocks: [
      { type: "p", text: "LangSmith is LangChain's platform for tracing, evaluating, and monitoring LLM apps. LayerFlow is a bring-your-own-key AI workspace focused on prompts, budgets, and model routing. They overlap on prompt versioning but serve different primary jobs." },
      { type: "p", text: "The honest framing: LangSmith is built for teams with an observability-first culture; LayerFlow is built for people and teams who want to actually use prompts across models while keeping spend under control. This guide compares them on the dimensions that matter." },
      { type: "h2", id: "primary-focus", text: "Primary focus: observe vs use" },
      { type: "p", text: "LangSmith's home turf is tracing every request and running eval suites, which is essential when you are iterating on agent pipelines. LayerFlow's home turf is the day-to-day: write a prompt, pick a model, cap the budget, share it with the team, and call it from an app." },
      { type: "h2", id: "comparison-table", text: "LayerFlow vs LangSmith at a glance" },
      { type: "ul", items: [
        "Prompt library: both version prompts; LayerFlow adds tags, folders, and team sharing.",
        "Budget control: LayerFlow has hard budget limits; LangSmith tracks cost but is not a budget blocker.",
        "BYOK: LayerFlow routes your own keys direct; LangSmith sits on top of your existing stack.",
        "Observability: LangSmith has deep tracing and evals; LayerFlow focuses on routing and spend analytics.",
        "Coding: LangSmith is language-framework-centric (LangChain); LayerFlow is an OpenAI-compatible API."
      ] },
      { type: "h2", id: "how-they-complement", text: "How they can complement each other" },
      { type: "p", text: "Many teams use both: LayerFlow for BYOK routing, prompts, and budgets, and LangSmith for deep tracing of the most complex agent flows. Start with LayerFlow for cost and prompts; add LangSmith only when you need fine-grained evaluation on top." },
      { type: "callout", text: "If you are using raw OpenAI or Anthropic APIs today, LayerFlow replaces the DIY gateway you were about to build — prompts, budgets, and routing in one workspace." },
      { type: "h2", id: "faq", text: "FAQ" },
      { type: "faq", items: [
        { q: "Is LayerFlow a LangSmith alternative?", a: "For cost control, prompt management, and BYOK routing, yes. For deep tracing and evals, LangSmith is the more specialized tool." },
        { q: "Can LayerFlow and LangSmith be used together?", a: "Yes. LayerFlow handles routing, prompts, and budgets while LangSmith can trace your most complex agent workflows." },
        { q: "Does LayerFlow require LangChain?", a: "No. LayerFlow exposes an OpenAI-compatible API, so it works with any SDK, with or without LangChain." }
      ] }
    ]
  },
  {
    slug: "shared-prompt-libraries-teams",
    title: "Shared Prompt Libraries for Teams: How to Build One That Actually Gets Used",
    metaTitle: "Shared Prompt Libraries for Teams (2026 Guide)",
    description:
      "Team prompt libraries fail when nobody can edit, search, or trust them. Here's how to set up a shared prompt library with versioning, permissions, and model wiring that teams actually use.",
    publishedAt: "2026-09-15",
    category: "Productivity",
    tags: ["prompt library", "team productivity", "AI workspace"],
    primaryKeyword: "shared prompt libraries teams",
    secondaryKeywords: ["team prompt library", "shared prompt libraries", "prompt sharing for teams"],
    readingTime: "8 min read",
    author: "LayerFlow Team",
    coverImage: "https://picsum.photos/seed/shared-prompt-libraries/1200/630",
    relatedSlugs: ["prompt-library-best-practices", "sharing-prompt-versions-team", "prompt-versioning-teams-guide"],
    blocks: [
      { type: "p", text: "A shared prompt library is a team-accessible collection of prompts that are saved, versioned, searchable, and wired to real models. Done right, it stops your team from rewriting the same customer-research or support prompt every week. Done wrong, it becomes a folder nobody opens." },
      { type: "p", text: "Most failed prompt libraries have the same root cause: they are read-only documents. A Notion page of prompts cannot be tested, diffed, or integrated. This guide covers what a working shared library actually requires." },
      { type: "h2", id: "what-a-good-library-has", text: "What a good shared prompt library has" },
      { type: "ul", items: [
        "Versioning: every edit creates a new version with a diff, not a silent overwrite.",
        "Search: filter by tag, model, use case, or text so people find what they need fast.",
        "Permissions: separate viewers, editors, and publishers.",
        "Model wiring: prompts run against a real model inside the library, not just text.",
        "Metadata: usage counts, cost-per-run, last output, and owner."
      ] },
      { type: "h2", id: "steps-to-build", text: "How to set one up" },
      { type: "ol", items: [
        "Start with 10 reusable prompts from real workflows — not templates you copy from the internet.",
        "Tag everything by use case and team so it is filterable.",
        "Publish the top 3 prompts and test them in real work.",
        "Encourage edits as new versions instead of creating duplicates.",
        "Review monthly: keep winners, archive stale ones, measure cost per run."
      ] },
      { type: "h2", id: "ensuring-adoption", text: "How to make the team actually use it" },
      { type: "p", text: "Adoption comes from convenience, not mandates. The library must be part of the daily flow — the same place people run prompts — and it must show better results: cleaner output, lower cost, shared context. When a teammate lands a win with a shared prompt, adoption spreads on its own." },
      { type: "callout", text: "Make two rules: prompts are versioned (never silently overwritten) and every prompt shows its cost per run. Those two rules keep the library trustworthy and cost-aware." },
      { type: "h2", id: "faq", text: "FAQ" },
      { type: "faq", items: [
        { q: "What is a shared prompt library?", a: "A team-accessible catalog of prompts that are versioned, searchable, and wired to real models, with permissions and usage metadata." },
        { q: "Should prompt libraries be in docs or in a tool?", a: "In a tool that can run the prompts. Docs-only libraries do not test the prompt or track cost, so they fall out of date fast." },
        { q: "How many prompts should a team library start with?", a: "Ten or fewer, from real workflows. A small live library beats a large dead one." }
      ] }
    ]
  },
];