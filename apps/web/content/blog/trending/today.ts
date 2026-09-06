import type { BlogPost } from "@/lib/blog/types";

export const todayPosts: BlogPost[] = [
  {
    "slug": "layered-ai-prompts-practical-guide",
    "title": "Layered AI Prompts: The Practical System, Context, Task Guide",
    "metaTitle": "Layered AI Prompts | System, Context, Task Guide (2026)",
    "description": "Learn the layered AI prompts method — system, context, task — with copy-paste templates and examples that get better results from GPT, Claude, Gemini, and DeepSeek.",
    "publishedAt": "2026-08-07",
    "category": "Prompt engineering",
    "tags": [
      "layered ai prompts",
      "system context task",
      "prompt engineering"
    ],
    "primaryKeyword": "layered ai prompts",
    "secondaryKeywords": [
      "system context task prompts",
      "prompt layers",
      "structured prompting"
    ],
    "readingTime": "7 min read",
    "author": "LayerFlow Team",
    "relatedSlugs": [
      "layered-ai-prompts-system-context-task",
      "organize-ai-prompts-step-by-step",
      "prompt-engineering-best-practices-teams-2026"
    ],
    "blocks": [
      {
        "type": "p",
        "text": "Layered AI prompts are the difference between a one-sentence question and a repeatable system that produces consistent, high-quality output. The idea is simple: instead of dumping every instruction into one giant prompt, you split it into layers — a system layer that sets rules, a context layer that provides background, and a task layer that asks for specific work."
      },
      {
        "type": "p",
        "text": "This guide shows you the exact layered prompt structure, gives you copy-paste templates for each layer, and walks through real examples you can adapt today for coding, marketing, analysis, and research tasks."
      },
      {
        "type": "h2",
        "id": "what-are-layered-ai-prompts",
        "text": "What are layered AI prompts?"
      },
      {
        "type": "p",
        "text": "A layered prompt organizes instructions into distinct sections so the model can weigh them correctly. The three core layers are:"
      },
      {
        "type": "ul",
        "items": [
          "System layer: who the model is, tone, constraints, and rules that apply to everything.",
          "Context layer: background information, examples, data, and assumptions the model needs.",
          "Task layer: the specific request, the desired output format, and success criteria."
        ]
      },
      {
        "type": "p",
        "text": "Why does this work? Models like GPT-4o, Claude, and Gemini pay more attention to structure than most people assume. Clear layers reduce ambiguity, make it obvious what each part of the prompt means, and give you a place to iterate when output quality dips."
      },
      {
        "type": "h2",
        "id": "the-three-layer-template",
        "text": "The three-layer template you can copy"
      },
      {
        "type": "p",
        "text": "Here is a generic layered prompt template. Fill in the brackets and keep each layer visually separated with headings or delimiters."
      },
      {
        "type": "callout",
        "text": "SYSTEM — You are a senior [role]. Use [tone] language. Follow these rules: [2-4 rules]. Do not [thing to avoid].\n\nCONTEXT — Here is what you need to know: [background]. The audience is [audience]. Relevant data: [data].\n\nTASK — [Specific request]. Output as [format]. Success looks like: [criteria]. Ask clarifying questions before starting if anything is ambiguous."
      },
      {
        "type": "h2",
        "id": "real-example-coding",
        "text": "Real example: debugging code"
      },
      {
        "type": "ul",
        "items": [
          "System: you are a senior TypeScript engineer. Explain reasoning before code. Prefer minimal changes.",
          "Context: this is a Next.js app using Hono on the API side. The error occurs in production only.",
          "Task: find why this request 500s, show the root cause, and give a patch that fits the existing style."
        ]
      },
      {
        "type": "p",
        "text": "The model now knows exactly who it is, what constraints matter, and what success looks like. Compare that to “fix my error” — the layered version gets you to a working fix in one round trip."
      },
      {
        "type": "h2",
        "id": "real-example-marketing",
        "text": "Real example: marketing copy"
      },
      {
        "type": "ol",
        "items": [
          "System: you are a B2B SaaS copywriter. Write short sentences. No hype words. Emphasize outcomes.",
          "Context: product saves dev teams on LLM API costs with hard budgets. Audience: engineering leaders. Competitors: manual key tracking and spreadsheets.",
          "Task: write a 3-line hero for the pricing page, plus one CTA. Match this voice: calm, specific, technical."
        ]
      },
      {
        "type": "h2",
        "id": "common-layer-mistakes",
        "text": "Common layered prompt mistakes"
      },
      {
        "type": "ul",
        "items": [
          "Mixing task and system: putting one-off requests into the system layer bloats it and weakens rules.",
          "No context for new domains: the model guesses when background is missing.",
          "Vague success criteria: “make it good” is not measurable.",
          "Putting the task first: when the task precedes the system, some models weight it less."
        ]
      },
      {
        "type": "h2",
        "id": "beyond-3-layers",
        "text": "Beyond three layers"
      },
      {
        "type": "p",
        "text": "For complex work, add optional layers: an examples layer (few-shot demonstrations), a constraints layer (output length, format, cost ceiling), and a feedback layer (how to handle criticism or revise). Keep the total prompt under the model context window and trim layers you don't need for simple requests."
      },
      {
        "type": "p",
        "text": "Layered prompts also compose well with a prompt workspace: save the system layer once, reuse it across tasks, and version it when rules change. Tools like LayerFlow let you keep layers as reusable templates with cost and model comparisons built in."
      },
      {
        "type": "h2",
        "id": "faq",
        "text": "FAQ"
      },
      {
        "type": "faq",
        "items": [
          {
            "q": "Does the order of prompt layers matter?",
            "a": "Yes. Put the system layer first, then context, then the task. This matches how models weight instructions and makes iteration predictable."
          },
          {
            "q": "Are layered prompts better than one long prompt?",
            "a": "Usually. Separation reduces ambiguity and gives you places to edit. A single paragraph can work for trivial requests, but layered structure wins for complex or repeated work."
          },
          {
            "q": "How long should each layer be?",
            "a": "As short as possible while still being unambiguous. System and context usually matter most; the task layer should be concrete and measurable."
          }
        ]
      }
    ]
  },
  {
    "slug": "organize-ai-prompts-step-by-step",
    "title": "How to Organize AI Prompts: The Step-by-Step System",
    "metaTitle": "How to Organize AI Prompts | Step-by-Step System (2026)",
    "description": "A step-by-step system to organize AI prompts with folders, tags, naming conventions, and versioning — so you stop losing winning prompts in chat history.",
    "publishedAt": "2026-08-07",
    "category": "Prompt engineering",
    "tags": [
      "organize ai prompts",
      "prompt organization",
      "prompt library"
    ],
    "primaryKeyword": "organize ai prompts",
    "secondaryKeywords": [
      "how to organize ai prompts",
      "prompt management system",
      "prompt folders and tags"
    ],
    "readingTime": "6 min read",
    "author": "LayerFlow Team",
    "relatedSlugs": [
      "organize-ai-prompts-workspace",
      "building-personal-prompt-library",
      "domain-based-prompt-organization"
    ],
    "blocks": [
      {
        "type": "p",
        "text": "Organizing AI prompts is the skill that separates people who get consistent AI output from people who re-type the same prompt every week. A good organization system means the winning version is findable in seconds, the best model for the task is obvious, and nothing important is buried in a chat log."
      },
      {
        "type": "p",
        "text": "This guide walks through a step-by-step system you can set up today — no complicated tools required."
      },
      {
        "type": "h2",
        "id": "step-1-choose-your-structure",
        "text": "Step 1: Choose your folder structure"
      },
      {
        "type": "ul",
        "items": [
          "By domain: Marketing, Coding, Study, Clients, Personal — the default that matches how most people work.",
          "By workflow: Ideation, Drafting, Review, Polish — good when you run the same pipeline repeatedly.",
          "By model: GPT, Claude, Gemini — only if your prompt library is model-specific."
        ]
      },
      {
        "type": "p",
        "text": "Pick one primary structure and stay consistent. Domain-first is the easiest to maintain because a prompt rarely changes domain, while it often changes workflow stage."
      },
      {
        "type": "h2",
        "id": "step-2-use-tags-not-files",
        "text": "Step 2: Use tags, not just folders"
      },
      {
        "type": "p",
        "text": "Folders create hierarchy; tags create connections. A single prompt can live in the Coding folder while carrying tags for Claude, cold email, and long-form. Search by tag when you need the intersection: a Claude-optimized prompt for summarizing research."
      },
      {
        "type": "h2",
        "id": "step-3-set-a-naming-convention",
        "text": "Step 3: Set a naming convention"
      },
      {
        "type": "ol",
        "items": [
          "Start with the action: summarize, draft, compare, rewrite, extract.",
          "Add the subject: research-paper, landing-page, git-diff, customer-ticket.",
          "Add the variant only when needed: v2, -short, -strict.",
          "Example: summarize-research-paper-v2"
        ]
      },
      {
        "type": "h2",
        "id": "step-4-store-with-output-context",
        "text": "Step 4: Store prompts with output context"
      },
      {
        "type": "p",
        "text": "A prompt without context is just text. Record which model it ran on, what the output quality was, and any tweaks. This is how you know prompt A beats prompt B — because you have evidence, not vibes."
      },
      {
        "type": "callout",
        "text": "Pro tip: when you save a prompt, save the model, the cost of the run, and a 1-line note on what changed. Six months later that note tells you exactly why this version won."
      },
      {
        "type": "h2",
        "id": "step-5-version-your-prompts",
        "text": "Step 5: Version your prompts"
      },
      {
        "type": "p",
        "text": "Winning prompts evolve. Keep the history: v1 was good, v2 added constraints, v3 removed a broken rule. Versioning lets you roll back when a rewrite quietly hurts quality and gives the team a shared source of truth."
      },
      {
        "type": "h2",
        "id": "step-6-review-monthly",
        "text": "Step 6: Do a monthly review"
      },
      {
        "type": "ul",
        "items": [
          "Delete prompts you haven't touched in 90 days.",
          "Merge near-duplicates into one canonical prompt.",
          "Update prompts that reference outdated models or pricing.",
          "Archive domain folders you've stopped using."
        ]
      },
      {
        "type": "h2",
        "id": "tools-that-help",
        "text": "Tools that make this easier"
      },
      {
        "type": "p",
        "text": "You can run this system in a notes app, but dedicated prompt workspaces add the parts notes apps lack: side-by-side model comparison, cost tracking, and version history. LayerFlow is built exactly for this — folders, tags, comparison, and hard budgets in one place."
      },
      {
        "type": "h2",
        "id": "faq",
        "text": "FAQ"
      },
      {
        "type": "faq",
        "items": [
          {
            "q": "Where should I store my AI prompts?",
            "a": "Anywhere with search, tags, and version history. A dedicated prompt workspace is best; a notes app works if you commit to the naming and tagging rules."
          },
          {
            "q": "How many folders should I have?",
            "a": "Start with 3-5 domains. If a folder holds fewer than 5 prompts, merge it into a parent until it earns its own space."
          },
          {
            "q": "Should I organize prompts by model?",
            "a": "Only if a prompt only works on one model. Most prompts are portable; tag the model instead of building model folders."
          }
        ]
      }
    ]
  },
  {
    "slug": "best-ai-prompt-organizers-2026",
    "title": "Best AI Prompt Organizers in 2026: Tested and Compared",
    "metaTitle": "Best AI Prompt Organizers 2026 | Compared and Rated",
    "description": "We tested the best AI prompt organizers in 2026 — prompt libraries, workspaces, and managers for ChatGPT, Claude, and Gemini users. See which fits your workflow.",
    "publishedAt": "2026-08-07",
    "category": "Prompt engineering",
    "tags": [
      "ai prompt organizer",
      "prompt manager",
      "prompt library tools"
    ],
    "primaryKeyword": "ai prompt organizer",
    "secondaryKeywords": [
      "best prompt organizer tools",
      "prompt manager app",
      "prompt library software"
    ],
    "readingTime": "8 min read",
    "author": "LayerFlow Team",
    "relatedSlugs": [
      "ai-prompt-organizer-tools-2026",
      "best-ai-workspace-tools-2026",
      "ai-prompt-directory-curated-libraries"
    ],
    "blocks": [
      {
        "type": "p",
        "text": "An AI prompt organizer is the difference between a scattered pile of copied text and a searchable, versioned library you actually reuse. We tested the main options in 2026 — from simple notes-based managers to full prompt workspaces — and compared them on search, tagging, versioning, model comparison, and cost control."
      },
      {
        "type": "h2",
        "id": "what-to-look-for",
        "text": "What to look for in a prompt organizer"
      },
      {
        "type": "ul",
        "items": [
          "Fast search across title, body, and tags.",
          "Tagging plus at least one hierarchy level (folders or domains).",
          "Version history with rollback.",
          "Model comparison: run the same prompt across providers.",
          "Cost visibility: how much each run and each model costs.",
          "Import/export so you are never locked in."
        ]
      },
      {
        "type": "h2",
        "id": "notes-apps",
        "text": "Notes apps (Notion, OneNote, Obsidian)"
      },
      {
        "type": "p",
        "text": "Notes apps are the starting point for most people. They are free, familiar, and good at storing text. The gaps: no built-in model comparison, no cost tracking, and versioning is manual. If you have fewer than 20 prompts, a well-tagged Notion database is fine."
      },
      {
        "type": "h2",
        "id": "prompt-library-plugins",
        "text": "Prompt library plugins and browser extensions"
      },
      {
        "type": "p",
        "text": "Browser extensions and ChatGPT plugins add a prompt library next to your chat. Great for quick access; weaker on structure, collaboration, and cost. They tend to store prompts per-account, which fragments a team's library."
      },
      {
        "type": "h2",
        "id": "dedicated-prompt-workspaces",
        "text": "Dedicated prompt workspaces (LayerFlow, and similar)"
      },
      {
        "type": "p",
        "text": "Dedicated workspaces treat prompts as a system: folders, tags, versioning, side-by-side model comparison, and hard budget limits. This is the category for anyone with a serious prompt library or a team that shares prompts."
      },
      {
        "type": "ul",
        "items": [
          "Versioned prompt timeline with diffs — see exactly what changed.",
          "Compare GPT, Claude, Gemini, and DeepSeek on the same prompt.",
          "Budgets and alerts so experiments cannot blow up the bill.",
          "BYOK: bring your own provider keys and keep billing with your provider."
        ]
      },
      {
        "type": "h2",
        "id": "how-they-compare",
        "text": "Side-by-side comparison"
      },
      {
        "type": "callout",
        "text": "Notes app: free, simple, no versioning/comparison. Plugin: quick access, fragmented. Workspace: best for search + versioning + comparison + budgets, takes 10 minutes to set up."
      },
      {
        "type": "h2",
        "id": "which-one-should-you-choose",
        "text": "Which one should you choose?"
      },
      {
        "type": "ol",
        "items": [
          "Fewer than 20 prompts, solo, no cost worries: a tagged notes app.",
          "Frequent prompting, want to compare models: a prompt workspace.",
          "Team shares prompts and needs budgets: a workspace with versioning and hard caps.",
          "Building apps on top of prompts: a workspace with an OpenAI-compatible gateway."
        ]
      },
      {
        "type": "h2",
        "id": "faq",
        "text": "FAQ"
      },
      {
        "type": "faq",
        "items": [
          {
            "q": "Is an AI prompt organizer worth it?",
            "a": "If you re-type or re-find prompts regularly, yes. Organizers turn a pile of text into a searchable, versioned library and add model comparison and cost control."
          },
          {
            "q": "Can I use a free AI prompt organizer?",
            "a": "Yes — tagged notes apps work for small libraries. Free tiers of dedicated workspaces are also common and cover the essentials."
          },
          {
            "q": "Do prompt organizers work with ChatGPT and Claude?",
            "a": "Most work alongside them: you store and compare prompts in the organizer, then copy into any chat app. Some add integrations for direct sending."
          }
        ]
      }
    ]
  },
  {
    "slug": "llm-routing-formula-explained",
    "title": "The LLM Routing Formula: Cost × Latency × Quality, Explained",
    "metaTitle": "LLM Routing Formula | Cost Latency Quality Explained",
    "description": "The LLM routing formula balances cost, latency, and quality. Learn how to pick the right model per request with a simple scoring system that saves money.",
    "publishedAt": "2026-08-07",
    "category": "Cost control",
    "tags": [
      "llm routing",
      "model routing",
      "cost latency quality"
    ],
    "primaryKeyword": "llm routing cost latency quality formula",
    "secondaryKeywords": [
      "model routing formula",
      "LLM cost optimization",
      "cheapest model routing"
    ],
    "readingTime": "7 min read",
    "author": "LayerFlow Team",
    "relatedSlugs": [
      "model-routing-latency-cost-quality",
      "cheap-mode-routing-flash-vs-frontier",
      "llm-routing-policy-guide"
    ],
    "blocks": [
      {
        "type": "p",
        "text": "The LLM routing formula is how you decide which model handles a request: cost, latency, and quality all matter, and the right answer changes per request. This guide breaks the formula into a practical scoring system you can apply today."
      },
      {
        "type": "h2",
        "id": "the-three-factors",
        "text": "The three factors"
      },
      {
        "type": "ul",
        "items": [
          "Cost: price per million input/output tokens for the model you call.",
          "Latency: how fast the model responds — matters for chat, agents, and API callers.",
          "Quality: correctness on your task — judge with evals, not intuition."
        ]
      },
      {
        "type": "p",
        "text": "Every routing decision is a trade between these three. A flash model is cheap and fast but may fail complex tasks; a frontier model nails hard tasks but costs 10-30x more and responds slower."
      },
      {
        "type": "h2",
        "id": "the-formula",
        "text": "The formula"
      },
      {
        "type": "callout",
        "text": "score = (quality_needed × quality_score) - (cost_penalty × cost) - (latency_penalty × latency)\n\nPick the model with the highest score. When quality_needed is high, quality dominates. When the task is trivial, cost and latency drive the decision."
      },
      {
        "type": "h2",
        "id": "step-1-classify-requests",
        "text": "Step 1: Classify your requests"
      },
      {
        "type": "ol",
        "items": [
          "Critical: coding reasoning, legal/medical content, production logic — quality first.",
          "Standard: summaries, drafts, extraction — balance quality and cost.",
          "Cheap: classifications, formatting, simple Q&A — cost and latency first."
        ]
      },
      {
        "type": "h2",
        "id": "step-2-map-models",
        "text": "Step 2: Map models to tiers"
      },
      {
        "type": "p",
        "text": "Typical tiers: cheap/fast (flash-class models like GPT-4o-mini or Gemini Flash), mid (balanced), and frontier (GPT-5, Claude Opus-class, Gemini Pro). Route critical requests to frontier, cheap requests to flash, and benchmark mid-tier for everything else."
      },
      {
        "type": "h2",
        "id": "step-3-add-fallbacks",
        "text": "Step 3: Add fallbacks"
      },
      {
        "type": "p",
        "text": "Routing is not a single pick — it's a ladder. Try cheap first; escalate to a bigger model when confidence is low or the task needs it. Some gateways do this automatically with threshold rules."
      },
      {
        "type": "h2",
        "id": "real-world-savings",
        "text": "What this saves in practice"
      },
      {
        "type": "p",
        "text": "Teams that route aggressively cut LLM spend by 50-80% because most requests are simple. The key is measuring quality so you don't route away correctness. Run the same prompt set through each tier once a month and compare."
      },
      {
        "type": "h2",
        "id": "tools-for-routing",
        "text": "Tools for routing"
      },
      {
        "type": "p",
        "text": "LayerFlow gives you side-by-side comparison to build the evidence base for routing, plus budgets so the experiment stays cheap. For production, use its OpenAI-compatible gateway with provider keys you bring yourself."
      },
      {
        "type": "h2",
        "id": "faq",
        "text": "FAQ"
      },
      {
        "type": "faq",
        "items": [
          {
            "q": "What is model routing in LLMs?",
            "a": "Model routing is choosing which LLM handles a request based on cost, latency, and quality. Simple requests go to cheap fast models; hard ones go to frontier models."
          },
          {
            "q": "How much does LLM routing save?",
            "a": "Most teams report 50-80% cost reduction because the majority of requests are simple enough for cheap models. Savings depend on your task mix."
          },
          {
            "q": "Can routing hurt quality?",
            "a": "Only if quality isn't measured. Build a small eval set, route, and re-check monthly so cheap models can't silently degrade output."
          }
        ]
      }
    ]
  },
  {
    "slug": "ai-api-token-management-playbook",
    "title": "AI API Token Management: The Complete Playbook",
    "metaTitle": "AI API Token Management | Complete Playbook (2026)",
    "description": "The complete AI API token management playbook: track tokens per project and model, set budgets, and avoid surprise bills with practical workflows.",
    "publishedAt": "2026-08-07",
    "category": "Cost control",
    "tags": [
      "ai api token management",
      "token tracking",
      "LLM cost management"
    ],
    "primaryKeyword": "ai api token management",
    "secondaryKeywords": [
      "LLM token budget",
      "track API tokens",
      "prevent surprise AI bills"
    ],
    "readingTime": "7 min read",
    "author": "LayerFlow Team",
    "relatedSlugs": [
      "ai-api-token-management-guide",
      "token-cost-optimization-guide",
      "ai-cost-control-hard-budget-limits"
    ],
    "blocks": [
      {
        "type": "p",
        "text": "AI API token management is the discipline of knowing exactly what every request costs, where spend is going, and how to stop it before it runs away. Without it, surprise OpenAI or Anthropic bills are a matter of when, not if."
      },
      {
        "type": "p",
        "text": "This playbook covers token tracking, budget setting, and the workflows teams use to keep LLM spend predictable."
      },
      {
        "type": "h2",
        "id": "know-your-unit-costs",
        "text": "Know your unit costs"
      },
      {
        "type": "p",
        "text": "Every LLM is billed per token, with separate input and output prices. Output tokens are typically 2-10x the input price. Before anything else, write down the per-million-token price for each model you use, input and output."
      },
      {
        "type": "callout",
        "text": "Example: if a model costs $3/M input and $15/M output, a 2,000-token request with 1,000 output tokens costs about $0.021. A background job running it hourly is $15/month. Small numbers compound."
      },
      {
        "type": "h2",
        "id": "track-per-project-and-model",
        "text": "Track per project and model"
      },
      {
        "type": "ul",
        "items": [
          "Per project: which feature or client is driving spend.",
          "Per model: whether cheap routing is actually happening.",
          "Per key: spot a leaked or shared key fast.",
          "Per day: notice anomalies before they become month-end shocks."
        ]
      },
      {
        "type": "h2",
        "id": "set-budgets-before-you-scale",
        "text": "Set budgets before you scale"
      },
      {
        "type": "ol",
        "items": [
          "Set a monthly hard budget per project or team.",
          "Add an alert at 80% of the budget.",
          "Block requests when the hard cap is hit — not just warn.",
          "Review budget allocations monthly against actual usage."
        ]
      },
      {
        "type": "p",
        "text": "Hard caps that block requests are the single most effective protection against surprise bills. A dashboard that only warns does not stop an overnight runaway job."
      },
      {
        "type": "h2",
        "id": "optimize-without-breaking-quality",
        "text": "Optimize without breaking quality"
      },
      {
        "type": "ul",
        "items": [
          "Trim context: send only what the task needs.",
          "Route simple requests to cheap models.",
          "Use prompt caching where supported for repeated prefixes.",
          "Reduce output token ceilings; many tasks overgenerate.",
          "Batch async jobs at off-peak rates if the API offers discounts."
        ]
      },
      {
        "type": "h2",
        "id": "review-monthly",
        "text": "The monthly review"
      },
      {
        "type": "p",
        "text": "Once a month, look at spend by project, model, and key. Kill abandoned jobs, renegotiate model tiers, and tighten budgets for projects that overran. This 30-minute review is what keeps token management from drifting."
      },
      {
        "type": "h2",
        "id": "tooling",
        "text": "Tooling that does the work"
      },
      {
        "type": "p",
        "text": "A spreadsheet breaks down past a handful of keys. Token-aware workspaces like LayerFlow track spend per project and model, enforce hard budgets, and keep your own keys — so management is automatic instead of manual."
      },
      {
        "type": "h2",
        "id": "faq",
        "text": "FAQ"
      },
      {
        "type": "faq",
        "items": [
          {
            "q": "What is AI API token management?",
            "a": "It's tracking how many tokens your app or team consumes, what it costs per model, and enforcing budgets so LLM usage stays predictable."
          },
          {
            "q": "Why are my API costs so high?",
            "a": "Usually from large context windows, frontier models on simple tasks, or background jobs running unoptimized prompts on a loop. Track per project and model to find the culprit."
          },
          {
            "q": "How do I stop surprise AI bills?",
            "a": "Set hard budget caps that block requests, alerts at 80%, and review spend monthly. A dashboard alone is not enough."
          }
        ]
      }
    ]
  }
];
