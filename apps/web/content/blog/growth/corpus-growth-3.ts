import type { BlogPost } from "@/lib/blog/types";

export const growthPosts3: BlogPost[] = [
  {
    slug: "llm-routing-cost-latency-formula-basics",
    title: "LLM Routing Basics: The Cost, Latency, Quality Tradeoff",
    metaTitle: "LLM Routing Basics: Cost vs Latency vs Quality",
    description:
      "LLM routing picks the right model per request. Learn the cost, latency, and quality tradeoff, when cheap routing wins, and where a router saves you 40-60%.",
    publishedAt: "2026-09-12",
    category: "AI gateway",
    tags: ["LLM routing", "model routing", "cost optimization"],
    primaryKeyword: "LLM routing basics",
    secondaryKeywords: ["model routing cost latency quality", "LLM router explainer", "cheap mode routing"],
    readingTime: "7 min read",
    author: "LayerFlow Team",
    coverImage: "https://picsum.photos/seed/llm-routing-basics/1200/630",
    relatedSlugs: ["model-routing-latency-cost-quality", "llm-routing-formula-explained", "cheap-mode-routing-flash-vs-frontier"],
    blocks: [
      { type: "p", text: "LLM routing is the practice of sending each request to the model that best fits it — not your most expensive flagship for everything. It is the single highest-leverage cost optimization in AI right now, and it is not as complicated as the tooling suggests." },
      { type: "p", text: "This is the explainer version: what routing is, what the cost/latency/quality tradeoff looks like, and where you should start." },
      { type: "h2", id: "the-tradeoff", text: "The cost/latency/quality tradeoff" },
      { type: "ul", items: [
        "Cost: frontier models cost 10-50x small ones per million tokens.",
        "Latency: bigger and reasoning models are slower to first token.",
        "Quality: hard tasks need the frontier; easy tasks do not.",
        "A router scores each request and routes it to the cheapest/fastest model that clears your quality bar."
      ] },
      { type: "h2", id: "when-routing-wins", text: "When routing wins big" },
      { type: "p", text: "Routing shines on workloads with a wide spread of difficulty: summaries, classifications, support replies, extracted fields. Most traffic is easy and cheap; a small slice is hard and expensive. Routing lets cheap models absorb the majority." },
      { type: "h2", id: "simple-start", text: "A simple starting point" },
      { type: "ol", items: [
        "Classify requests by difficulty (rule-based or via a cheap model).",
        "Route easy requests to a fast, cheap model.",
        "Route hard requests to a frontier model.",
        "Measure cost per task before and after.",
        "Tighten or loosen the classification based on quality complaints."
      ] },
      { type: "callout", text: "Do not build a router from scratch. Use a gateway that already does classification-based routing and spend analytics — then focus on your classification rules, not the plumbing." },
      { type: "h2", id: "faq", text: "FAQ" },
      { type: "faq", items: [
        { q: "What is LLM routing?", a: "LLM routing is sending each request to the model that best fits it in cost, latency, and quality, instead of using one model for all traffic." },
        { q: "How much can routing save?", a: "Typical savings are 40-60% on mixed workloads, because a majority of request traffic only needs a cheap model." },
        { q: "Does routing hurt quality?", a: "Only if you route the wrong requests to small models. A classification step with monitoring keeps quality stable." }
      ] }
    ]
  },
  {
    slug: "gpt-4o-mini-cost-per-million-tokens",
    title: "GPT-4o-mini Cost Per Million Tokens and When to Use It",
    metaTitle: "GPT-4o-mini Cost Per Million Tokens (2026)",
    description:
      "GPT-4o-mini cost per million tokens in 2026, typical use cases, and when its cheap price hides real quality or latency tradeoffs compared to reasoning models.",
    publishedAt: "2026-09-12",
    category: "Cost control",
    tags: ["GPT-4o-mini", "OpenAI pricing", "cheap models"],
    primaryKeyword: "GPT-4o-mini cost per million tokens",
    secondaryKeywords: ["GPT-4o-mini price", "cheapest OpenAI model", "4o-mini vs 4o cost"],
    readingTime: "6 min read",
    author: "LayerFlow Team",
    coverImage: "https://picsum.photos/seed/gpt4o-mini-cost/1200/630",
    relatedSlugs: ["cost-per-token-explained", "token-cost-optimization-guide", "small-language-models-2026"],
    blocks: [
      { type: "p", text: "GPT-4o-mini is OpenAI's cheap workhorse: roughly $0.10-0.40 per million input tokens and around $0.40-1.60 per million output tokens in 2026, depending on volume and caching. That is an order of magnitude cheaper than the flagship 4o-class models." },
      { type: "p", text: "Cheap prices invite a question: is it good enough? The honest answer is 'for most tasks, yes' — with limits." },
      { type: "h2", id: "where-it-excels", text: "Where GPT-4o-mini excels" },
      { type: "ul", items: [
        "Classification and extraction with structured outputs.",
        "High-volume summarization of short documents.",
        "Chatbots and support automation that need snappy replies.",
        "Prototyping and internal tooling where cost dominates."
      ] },
      { type: "h2", id: "where-it-falls-short", text: "Where it falls short" },
      { type: "p", text: "Complex multi-step reasoning, long creative writing, and subtle code generation are where mini-class models drift from flagship quality. That is exactly what routing fixes: let mini models handle the bulk, escalate the hard 10%." },
      { type: "h2", id: "cost-practice", text: "Cost in practice" },
      { type: "p", text: "A support app doing 10,000 requests/day of ~2,000 tokens on 4o-mini can cost single-digit dollars a day — versus triple digits on a flagship. Add prompt caching and the effective input cost drops further." },
      { type: "callout", text: "Use OpenAI's batch endpoint for 4o-mini jobs that are not time-sensitive: background processing at roughly half the rate turns the cheapest model into a rounding error." },
      { type: "h2", id: "faq", text: "FAQ" },
      { type: "faq", items: [
        { q: "How much does GPT-4o-mini cost per million tokens?", a: "Roughly $0.10-0.40 per million input and $0.40-1.60 per million output tokens in 2026, with caching and batch discounts available." },
        { q: "Is GPT-4o-mini good enough for production?", a: "For classification, extraction, summarization, and support chat, yes. For complex reasoning, escalate to a flagship via routing." },
        { q: "How do I get the cheapest GPT rate?", a: "Use caching for stable prefixes and the batch endpoint for async work — combined they can cut effective cost to a fraction." }
      ] }
    ]
  },
  {
    slug: "deepseek-r1-cost-per-million-tokens",
    title: "DeepSeek Cost Per Million Tokens: R1 Pricing in 2026",
    metaTitle: "DeepSeek Cost Per Million Tokens: R1 Pricing (2026)",
    description:
      "DeepSeek cost per million tokens for the R1 reasoning series in 2026: pricing vs OpenAI/Claude, output-heavy reasoning tradeoffs, and whether it fits production.",
    publishedAt: "2026-09-11",
    category: "Cost control",
    tags: ["DeepSeek", "reasoning models", "pricing"],
    primaryKeyword: "DeepSeek cost per million tokens",
    secondaryKeywords: ["DeepSeek R1 pricing", "DeepSeek vs OpenAI cost", "cheap reasoning model"],
    readingTime: "6 min read",
    author: "LayerFlow Team",
    coverImage: "https://picsum.photos/seed/deepseek-pricing/1200/630",
    relatedSlugs: ["deepseek-vs-openai-2026", "cost-per-token-explained", "reasoning-models-guide-2026"],
    blocks: [
      { type: "p", text: "DeepSeek's reasoning models undercut Western frontier pricing by roughly 90% in many cases — commonly well under $1 per million input tokens and a few dollars per million output tokens in 2026. That pricing reshaped reasoning-model economics." },
      { type: "p", text: "The caveat is reasoning output: R1-class models generate long 'thinking' tokens before answering, so actual spend depends on their verbosity, not just the rate card." },
      { type: "h2", id: "deepseek-pricing", text: "DeepSeek pricing in context" },
      { type: "ul", items: [
        "Input: typically $0.25-0.60 per million tokens in 2026.",
        "Output: typically $1.50-2.50 per million tokens.",
        "Cached input: a further deep discount on repeated prefixes.",
        "That is 10-20x cheaper than comparable frontier reasoning from US providers."
      ] },
      { type: "h2", id: "reasoning-token-caveat", text: "The reasoning-token caveat" },
      { type: "p", text: "Reasoning models emit many hidden tokens. A DeepSeek call that returns 300 visible tokens may actually consume 2,000 thinking tokens. Compare total tokens, not visible output, when estimating cost." },
      { type: "h2", id: "fit-for-production", text: "Is DeepSeek a production fit?" },
      { type: "p", text: "For cost-sensitive workloads with moderate reasoning needs and no strict data-residency requirement, yes. For regulated data or teams that need a single-support contract, the savings may not justify it. A gateway routes per request so you keep both options." },
      { type: "callout", text: "Benchmark DeepSeek against your reference model on a sample of real tasks — measuring cost per successful task, not cost per token, tells you if the price gap is real for your workload." },
      { type: "h2", id: "faq", text: "FAQ" },
      { type: "faq", items: [
        { q: "How much does DeepSeek cost per million tokens?", a: "Around $0.25-0.60 input and $1.50-2.50 output in 2026, plus big discounts for cached input." },
        { q: "Is DeepSeek cheaper than OpenAI?", a: "Yes, usually 5-20x cheaper per token, though reasoning models generate extra thinking tokens you must count." },
        { q: "When should I use DeepSeek in production?", a: "When cost matters, reasoning needs are moderate, and data-residency or single-vendor support is not a blocker." }
      ] }
    ]
  },
  {
    slug: "claude-api-cost-per-million-tokens",
    title: "Claude API Cost Per Million Tokens: Anthropic Pricing in 2026",
    metaTitle: "Claude API Cost Per Million Tokens (2026)",
    description:
      "Claude API cost per million tokens in 2026: input/output rates, prompt caching discounts, and when Claude's premium price is worth it for code and writing.",
    publishedAt: "2026-09-11",
    category: "Cost control",
    tags: ["Claude API", "Anthropic pricing", "token cost"],
    primaryKeyword: "Claude API cost per million tokens",
    secondaryKeywords: ["Claude pricing 2026", "Anthropic API price", "Claude vs GPT cost"],
    readingTime: "6 min read",
    author: "LayerFlow Team",
    coverImage: "https://picsum.photos/seed/claude-api-pricing/1200/630",
    relatedSlugs: ["chatgpt-vs-claude-vs-gemini-2026", "llm-apis-pricing-comparison-2026", "cost-per-token-explained"],
    blocks: [
      { type: "p", text: "Anthropic's Claude API runs at frontier pricing in 2026 — around $3 per million input tokens and $15 per million output tokens, with its signature advantage: large, deeply discounted prompt caches." },
      { type: "p", text: "Claude is frequently favored for code generation and long-form writing, so the cost question should be framed as 'cost for excellent output,' not raw token price." },
      { type: "h2", id: "claude-rates", text: "Representative Claude API rates in 2026" },
      { type: "ul", items: [
        "Newer generation models: ~$3 input, ~$15 output per million tokens.",
        "Cached input: often stored at ~$0.30-0.50 per million — a consistent Claude advantage.",
        "Cheaper Claude tiers exist for simpler tasks at a fraction of those rates.",
        "Output is the expensive direction, as with every provider."
      ] },
      { type: "h2", id: "when-claude-is-worth-it", text: "When Claude is worth the premium" },
      { type: "p", text: "Claude tends to win on sophisticated code generation, nuanced writing, and long-context comprehension. If your workload is one of those and quality directly affects revenue, paying more per token is rational." },
      { type: "h2", id: "cutting-claude-cost", text: "Cutting Claude costs" },
      { type: "ol", items: [
        "Cache your system prompt and any stable instructions — caching is where Claude saves the most.",
        "Route routine tasks to cheaper models and reserve Claude for hard ones.",
        "Cap max output tokens on generations that only need a paragraph.",
        "Track cost per task, not per token, in your analytics."
      ] },
      { type: "callout", text: "Claude's prompt caching is its biggest hidden discount. Move large stable context out of the variable part of your prompt and watch effective input cost collapse." },
      { type: "h2", id: "faq", text: "FAQ" },
      { type: "faq", items: [
        { q: "How much does the Claude API cost per million tokens?", a: "Roughly $3 per million input and $15 per million output tokens in 2026, with cached input dramatically cheaper." },
        { q: "Is Claude more expensive than GPT?", a: "Comparable at the frontier for input, with output pricing in the same range; Claude's caching is notably aggressive on input discounts." },
        { q: "How do I reduce Anthropic API costs?", a: "Cache stable prefixes, route easy tasks to cheaper models, and cap output length." }
      ] }
    ]
  },
  {
    slug: "cheap-llm-routing-flash-frontier",
    title: "Cheap LLM Routing: Flash vs Frontier Models for Everyday Tasks",
    metaTitle: "Cheap LLM Routing: Flash vs Frontier (2026)",
    description:
      "Cheap LLM routing with flash-class models for everyday tasks and frontier escalation for the hard 10%. How to split traffic, set thresholds, and measure savings.",
    publishedAt: "2026-09-10",
    category: "Cost control",
    tags: ["cheap mode", "flash models", "routing"],
    primaryKeyword: "cheap LLM routing",
    secondaryKeywords: ["flash vs frontier models", "cheap mode routing", "small model routing"],
    readingTime: "7 min read",
    author: "LayerFlow Team",
    coverImage: "https://picsum.photos/seed/cheap-routing/1200/630",
    relatedSlugs: ["cheap-mode-routing-flash-vs-frontier", "llm-routing-cost-latency-formula-basics", "small-language-models-2026"],
    blocks: [
      { type: "p", text: "Cheap LLM routing is the practice of answering the easy 90% of requests with fast, flash-class models and reserving frontier models for the hard 10%. The split alone typically halves your bill, and you can tune it with a quality threshold." },
      { type: "p", text: "This guide is the practical how-to: how to define easy vs hard, where to set the threshold, and how to measure before you trust it." },
      { type: "h2", id: "define-easy", text: "Define 'easy' for your workload" },
      { type: "ul", items: [
        "Classification and extraction are usually easy: structured, short, low risk.",
        "Summarization is easy when the source is short and the format is fixed.",
        "Creative, multi-step, or code-heavy tasks are usually hard.",
        "Reputation defines difficulty better than length does."
      ] },
      { type: "h2", id: "split-and-threshold", text: "The split and the threshold" },
      { type: "ol", items: [
        "Route clearly easy traffic to a flash model by default.",
        "Escalate when a cheap model signals low confidence (score thresholds, schema failures).",
        "Add a fallback: retry failures automatically on the frontier model.",
        "Monitor quality complaints vs cost saved each week.",
        "Adjust the threshold until the quality-cost balance fits."
      ] },
      { type: "h2", id: "expected-savings", text: "Expected savings" },
      { type: "p", text: "On mixed workloads, 40-60% savings is a safe estimate when 80-90% of traffic is easy. If your traffic is mostly hard, routing saves little — which is useful information by itself." },
      { type: "callout", text: "Start the split at 80/20 and let fallback handle the misses. You will learn the real difficulty mix from data within a week." },
      { type: "h2", id: "faq", text: "FAQ" },
      { type: "faq", items: [
        { q: "What is cheap LLM routing?", a: "Sending the easy majority of requests to cheap flash-class models and only escalating hard tasks to expensive frontier models." },
        { q: "How much does cheap routing save?", a: "Typically 40-60% on mixed workloads where most traffic is easy." },
        { q: "Does cheap routing hurt quality?", a: "Not if you set a confidence threshold and add automatic frontier fallback for failures." }
      ] }
    ]
  },
];