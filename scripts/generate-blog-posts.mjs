/**
 * Generates content/blog/posts.ts with 40 SEO blog posts.
 * Run: node scripts/generate-blog-posts.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function id(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function p(text) {
  return { type: "p", text };
}
function h2(text) {
  return { type: "h2", id: id(text), text };
}
function h3(text) {
  return { type: "h3", id: id(text), text };
}
function ul(items) {
  return { type: "ul", items };
}
function ol(items) {
  return { type: "ol", items };
}
function callout(text) {
  return { type: "callout", text };
}
function faq(items) {
  return { type: "faq", items };
}

const AUTHOR = "LayerFlow Team";

const defs = [
  {
    slug: "prompt-version-control-timeline-2026",
    title: "Prompt Version Control: Why Your AI Workflow Needs a Timeline in 2026",
    metaTitle: "Prompt Version Control & Timeline Guide (2026)",
    description:
      "Learn why prompt version control matters, how a prompt timeline works like git for AI, and how to stop losing winning prompts in ChatGPT history.",
    publishedAt: "2026-07-18",
    category: "Prompt engineering",
    tags: ["prompt versioning", "prompt timeline", "prompt management"],
    primaryKeyword: "prompt version control",
    secondaryKeywords: ["prompt timeline", "prompt versioning tool", "git for prompts"],
    related: ["prompt-diffing-track-changes", "organize-ai-prompts-workspace", "prompt-timeline-best-practices"],
  },
  {
    slug: "organize-ai-prompts-workspace",
    title: "How to Organize AI Prompts Like a Pro Workspace",
    metaTitle: "How to Organize AI Prompts | Prompt Workspace Guide",
    description:
      "Stop dumping prompts in Notion and Notes. Build a domain-based AI prompt workspace with projects, folders, and searchable libraries.",
    publishedAt: "2026-07-16",
    category: "Prompt engineering",
    tags: ["prompt organization", "AI workspace", "prompt library"],
    primaryKeyword: "AI prompt management",
    secondaryKeywords: ["prompt workspace", "prompt organization", "prompt library"],
    related: ["domain-based-prompt-organization", "building-personal-prompt-library", "from-chatgpt-history-to-workspace"],
  },
  {
    slug: "prompt-engineering-best-practices-teams-2026",
    title: "Best Prompt Engineering Practices for Teams in 2026",
    metaTitle: "Prompt Engineering Best Practices for Teams (2026)",
    description:
      "Team-ready prompt engineering practices: versioning, review, shared libraries, model comparison, and cost guardrails that scale.",
    publishedAt: "2026-07-14",
    category: "Prompt engineering",
    tags: ["prompt engineering", "teams", "best practices"],
    primaryKeyword: "prompt engineering best practices",
    secondaryKeywords: ["AI workspace for teams", "shared prompt libraries", "prompt review"],
    related: ["teams-collaborate-ai-prompts", "sharing-prompt-versions-team", "langsmith-alternatives-prompt-tooling"],
  },
  {
    slug: "prompt-diffing-track-changes",
    title: "Prompt Diffing: Track Every Change Across Model Runs",
    metaTitle: "Prompt Diffing Guide | Track Prompt Changes",
    description:
      "Use prompt diffs to see exactly what changed between versions, link edits to cost and output, and roll back with confidence.",
    publishedAt: "2026-07-12",
    category: "Prompt engineering",
    tags: ["prompt diff", "prompt timeline", "debugging"],
    primaryKeyword: "prompt diff",
    secondaryKeywords: ["prompt versioning", "track prompt changes", "prompt timeline"],
    related: ["prompt-version-control-timeline-2026", "prompt-timeline-best-practices", "how-to-multi-model-comparison"],
  },
  {
    slug: "building-personal-prompt-library",
    title: "Building a Personal Prompt Library That Actually Scales",
    metaTitle: "Build a Scalable Personal Prompt Library",
    description:
      "Design a personal prompt library with domains, naming conventions, tags, and version history so your best prompts stay findable.",
    publishedAt: "2026-07-10",
    category: "Prompt engineering",
    tags: ["prompt library", "productivity", "organization"],
    primaryKeyword: "prompt library",
    secondaryKeywords: ["save AI prompts", "prompt organization", "personal AI workspace"],
    related: ["organize-ai-prompts-workspace", "domain-based-prompt-organization", "student-guide-study-prompts"],
  },
  {
    slug: "ai-cost-control-hard-budget-limits",
    title: "AI Cost Control: How to Set Hard Budget Limits for LLMs",
    metaTitle: "AI Cost Control & Hard Budget Limits for LLMs",
    description:
      "Set hard monthly budget limits that block LLM requests when you hit the cap. Stop surprise AI bills with real spend control.",
    publishedAt: "2026-07-08",
    category: "Cost control",
    tags: ["budgets", "cost control", "LLM spend"],
    primaryKeyword: "AI cost control",
    secondaryKeywords: ["LLM budget limits", "hard budget limits AI", "prevent surprise AI bills"],
    related: ["stop-surprise-ai-bills-budget-alerts", "token-cost-optimization-guide", "setting-up-hard-budgets"],
  },
  {
    slug: "token-cost-optimization-guide",
    title: "Token Cost Optimization Guide for GPT, Claude, and Gemini",
    metaTitle: "Token Cost Optimization for GPT, Claude & Gemini",
    description:
      "Practical token cost optimization: shorter prompts, cheaper models, caching patterns, and routing strategies that cut LLM spend.",
    publishedAt: "2026-07-06",
    category: "Cost control",
    tags: ["tokens", "cost optimization", "routing"],
    primaryKeyword: "token cost optimization",
    secondaryKeywords: ["reduce GPT API costs", "cheap mode LLM routing", "LLM cost analytics"],
    related: ["cheap-mode-routing-flash-vs-frontier", "ai-spend-analytics-project-key-model", "gpt-vs-claude-vs-gemini-vs-deepseek-2026"],
  },
  {
    slug: "stop-surprise-ai-bills-budget-alerts",
    title: "Stop Surprise AI Bills: Budget Alerts That Actually Work",
    metaTitle: "AI Budget Alerts to Stop Surprise Bills",
    description:
      "Configure AI budget alerts at 80% spend, track spikes by key and model, and pair alerts with hard caps for real protection.",
    publishedAt: "2026-07-04",
    category: "Cost control",
    tags: ["budget alerts", "AI bills", "cost control"],
    primaryKeyword: "AI budget alerts",
    secondaryKeywords: ["prevent surprise AI bills", "AI spend tracking", "LLM budget limits"],
    related: ["ai-cost-control-hard-budget-limits", "ai-spend-analytics-project-key-model", "startup-founder-ai-cost-playbook"],
  },
  {
    slug: "cheap-mode-routing-flash-vs-frontier",
    title: "Cheap Mode Routing: When to Use Flash vs Frontier Models",
    metaTitle: "Cheap Mode LLM Routing: Flash vs Frontier",
    description:
      "Learn model routing strategies that send drafts to flash models and reserve frontier LLMs for final quality — without guessing.",
    publishedAt: "2026-07-02",
    category: "Cost control",
    tags: ["model routing", "cheap mode", "flash models"],
    primaryKeyword: "cheap mode LLM routing",
    secondaryKeywords: ["frontier vs flash models", "LLM model routing", "token cost optimization"],
    related: ["model-routing-latency-cost-quality", "token-cost-optimization-guide", "how-to-multi-model-comparison"],
  },
  {
    slug: "ai-spend-analytics-project-key-model",
    title: "AI Spend Analytics: Track Cost by Project, Key, and Model",
    metaTitle: "AI Spend Analytics by Project, Key & Model",
    description:
      "See LLM cost broken down by project, API key, and model before the invoice hits. Build a cost analytics habit that sticks.",
    publishedAt: "2026-06-30",
    category: "Cost control",
    tags: ["analytics", "cost tracking", "API keys"],
    primaryKeyword: "LLM cost analytics",
    secondaryKeywords: ["AI spend tracking", "AI cost control", "manage LLM API keys"],
    related: ["ai-cost-control-hard-budget-limits", "managing-multiple-llm-api-keys", "complete-guide-ai-workspace-cost-control"],
  },
  {
    slug: "gpt-vs-claude-vs-gemini-vs-deepseek-2026",
    title: "GPT vs Claude vs Gemini vs DeepSeek: 2026 Comparison Guide",
    metaTitle: "GPT vs Claude vs Gemini vs DeepSeek (2026)",
    description:
      "Compare GPT, Claude, Gemini, and DeepSeek on quality, cost, and latency — and learn how to pick winners per task in one workspace.",
    publishedAt: "2026-06-28",
    category: "Model comparison",
    tags: ["GPT", "Claude", "Gemini", "DeepSeek"],
    primaryKeyword: "GPT vs Claude vs Gemini vs DeepSeek",
    secondaryKeywords: ["compare GPT Claude Gemini", "multi-model comparison", "best LLM for coding 2026"],
    related: ["how-to-compare-llm-outputs-side-by-side", "best-model-for-coding-2026", "best-model-for-marketing-copy"],
  },
  {
    slug: "how-to-compare-llm-outputs-side-by-side",
    title: "How to Compare LLM Outputs Side by Side",
    metaTitle: "Compare LLM Outputs Side by Side | Guide",
    description:
      "A practical workflow to run the same prompt across models, score outputs, and save the winning version with cost and latency.",
    publishedAt: "2026-06-26",
    category: "Model comparison",
    tags: ["compare", "evaluation", "workflow"],
    primaryKeyword: "side by side LLM comparison",
    secondaryKeywords: ["multi-model comparison", "compare GPT Claude Gemini", "pick cheapest AI model"],
    related: ["how-to-multi-model-comparison", "gpt-vs-claude-vs-gemini-vs-deepseek-2026", "prompt-diffing-track-changes"],
  },
  {
    slug: "best-model-for-coding-2026",
    title: "Best Model for Coding in 2026: A Multi-Model Benchmark Approach",
    metaTitle: "Best LLM for Coding 2026 | Benchmark Approach",
    description:
      "Stop guessing the best coding model. Benchmark GPT, Claude, Gemini, and DeepSeek on your real repos with cost and latency.",
    publishedAt: "2026-06-24",
    category: "Model comparison",
    tags: ["coding", "benchmarks", "developers"],
    primaryKeyword: "best LLM for coding 2026",
    secondaryKeywords: ["multi-model comparison", "developer AI prompt workflow", "GPT vs Claude coding"],
    related: ["ai-workspace-for-developers", "gpt-vs-claude-vs-gemini-vs-deepseek-2026", "building-apps-ai-gateway-sdk"],
  },
  {
    slug: "best-model-for-marketing-copy",
    title: "Best Model for Marketing Copy: Compare Before You Commit",
    metaTitle: "Best LLM for Marketing Copy | Compare First",
    description:
      "Compare LLMs for ads, landing pages, and SEO drafts. Pick the best marketing model per campaign without tab-hopping.",
    publishedAt: "2026-06-22",
    category: "Model comparison",
    tags: ["marketing", "copywriting", "compare"],
    primaryKeyword: "best LLM for marketing",
    secondaryKeywords: ["AI workspace for marketers", "side by side LLM comparison", "prompt library"],
    related: ["ai-prompt-workflows-marketing-teams", "gpt-vs-claude-vs-gemini-vs-deepseek-2026", "how-to-compare-llm-outputs-side-by-side"],
  },
  {
    slug: "model-routing-latency-cost-quality",
    title: "Model Routing Strategies for Latency, Cost, and Quality",
    metaTitle: "LLM Model Routing for Latency, Cost & Quality",
    description:
      "Design model routing rules that balance latency, cost, and quality — including fallbacks, cheap mode, and task-based selection.",
    publishedAt: "2026-06-20",
    category: "Model comparison",
    tags: ["routing", "architecture", "performance"],
    primaryKeyword: "LLM model routing",
    secondaryKeywords: ["cheap mode LLM routing", "LLM latency comparison", "OpenAI compatible API gateway"],
    related: ["cheap-mode-routing-flash-vs-frontier", "what-is-llm-gateway", "openai-compatible-api-gateway"],
  },
  {
    slug: "what-is-llm-gateway",
    title: "What Is an LLM Gateway? OpenAI-Compatible APIs Explained",
    metaTitle: "What Is an LLM Gateway? OpenAI-Compatible Explained",
    description:
      "Understand LLM gateways, OpenAI-compatible APIs, and when a unified gateway helps — without confusing gateway with your whole AI workflow.",
    publishedAt: "2026-06-18",
    category: "AI gateway",
    tags: ["gateway", "API", "architecture"],
    primaryKeyword: "LLM gateway",
    secondaryKeywords: ["OpenAI compatible API gateway", "AI API gateway", "unified LLM API"],
    related: ["openai-compatible-api-gateway", "bring-your-own-keys-byok", "building-apps-ai-gateway-sdk"],
  },
  {
    slug: "bring-your-own-keys-byok",
    title: "Bring Your Own Keys (BYOK): Why It Matters for AI Tools",
    metaTitle: "BYOK for AI Tools | Bring Your Own Keys Guide",
    description:
      "BYOK keeps provider billing with you. Learn why bring-your-own-keys matters for cost control, portability, and trust in AI tools.",
    publishedAt: "2026-06-16",
    category: "AI gateway",
    tags: ["BYOK", "API keys", "billing"],
    primaryKeyword: "bring your own keys BYOK",
    secondaryKeywords: ["BYOK LLM", "AI key management", "manage LLM API keys"],
    related: ["connecting-byok-providers", "managing-multiple-llm-api-keys", "secure-ai-key-management"],
  },
  {
    slug: "openai-compatible-api-gateway",
    title: "OpenAI-Compatible API Gateway for Multi-Provider Apps",
    metaTitle: "OpenAI-Compatible API Gateway for Multi-Provider Apps",
    description:
      "Drop in an OpenAI-compatible base URL, route to multiple providers, and keep your app code simple while you compare and control costs.",
    publishedAt: "2026-06-14",
    category: "AI gateway",
    tags: ["OpenAI compatible", "gateway", "SDK"],
    primaryKeyword: "OpenAI compatible API gateway",
    secondaryKeywords: ["OpenAI compatible proxy", "multi provider LLM API", "unified LLM API"],
    related: ["what-is-llm-gateway", "building-apps-ai-gateway-sdk", "model-routing-latency-cost-quality"],
  },
  {
    slug: "managing-multiple-llm-api-keys",
    title: "Managing Multiple LLM API Keys Without Chaos",
    metaTitle: "Manage Multiple LLM API Keys Without Chaos",
    description:
      "Separate keys per project, track spend per key, and rotate credentials safely across OpenAI, Anthropic, Gemini, and more.",
    publishedAt: "2026-06-12",
    category: "AI gateway",
    tags: ["API keys", "security", "ops"],
    primaryKeyword: "manage LLM API keys",
    secondaryKeywords: ["AI key management", "BYOK LLM", "AI spend tracking"],
    related: ["secure-ai-key-management", "bring-your-own-keys-byok", "ai-spend-analytics-project-key-model"],
  },
  {
    slug: "secure-ai-key-management",
    title: "Secure AI Key Management for Developers and Teams",
    metaTitle: "Secure AI Key Management for Developers & Teams",
    description:
      "Practical AI key management: env isolation, least privilege, rotation, and workspace patterns that keep secrets out of Slack.",
    publishedAt: "2026-06-10",
    category: "AI gateway",
    tags: ["security", "API keys", "teams"],
    primaryKeyword: "AI key management",
    secondaryKeywords: ["manage LLM API keys", "bring your own keys BYOK", "secure LLM access"],
    related: ["managing-multiple-llm-api-keys", "bring-your-own-keys-byok", "agency-workflow-client-domains"],
  },
  {
    slug: "langsmith-alternatives-prompt-tooling",
    title: "LangSmith Alternatives for Prompt Tooling in 2026",
    metaTitle: "LangSmith Alternatives for Prompt Tooling (2026)",
    description:
      "Looking for LangSmith alternatives? Compare prompt tooling focused on workspace, versioning, budgets, and day-to-day prompt work.",
    publishedAt: "2026-06-08",
    category: "Productivity",
    tags: ["LangSmith", "alternatives", "tooling"],
    primaryKeyword: "LangSmith alternatives",
    secondaryKeywords: ["prompt tooling", "best prompt management tools 2026", "prompt observability vs workspace"],
    related: ["prompt-management-vs-observability", "best-ai-workspace-tools-2026", "prompt-engineering-best-practices-teams-2026"],
  },
  {
    slug: "best-ai-workspace-tools-2026",
    title: "Best AI Workspace Tools for Developers (2026 Guide)",
    metaTitle: "Best AI Workspace Tools for Developers (2026)",
    description:
      "What to look for in an AI workspace: prompt library, compare, budgets, BYOK, and gateway — not another chat tab.",
    publishedAt: "2026-06-06",
    category: "Productivity",
    tags: ["tools", "developers", "AI workspace"],
    primaryKeyword: "AI workspace for developers",
    secondaryKeywords: ["best prompt management tools 2026", "AI playground with budgets", "prompt workspace"],
    related: ["ai-workspace-for-developers", "langsmith-alternatives-prompt-tooling", "get-started-layerflow-10-minutes"],
  },
  {
    slug: "prompt-management-vs-observability",
    title: "Prompt Management vs Observability Platforms: What's Different",
    metaTitle: "Prompt Management vs Observability Platforms",
    description:
      "Prompt management is how you create and iterate. Observability is how you monitor production. You often need both — know the difference.",
    publishedAt: "2026-06-04",
    category: "Productivity",
    tags: ["observability", "prompt management", "architecture"],
    primaryKeyword: "prompt observability vs workspace",
    secondaryKeywords: ["prompt tooling", "LangSmith alternatives", "AI prompt management"],
    related: ["langsmith-alternatives-prompt-tooling", "prompt-version-control-timeline-2026", "what-is-llm-gateway"],
  },
  {
    slug: "why-prompt-notebooks-fail",
    title: "Why Prompt Notebooks Fail (And What to Use Instead)",
    metaTitle: "Why Prompt Notebooks Fail | Better Alternatives",
    description:
      "Notion and Docs notebooks break for prompts: no cost, no model context, no diffs. Here's what a real prompt workspace adds.",
    publishedAt: "2026-06-02",
    category: "Productivity",
    tags: ["Notion", "productivity", "workflow"],
    primaryKeyword: "ChatGPT prompt organizer",
    secondaryKeywords: ["prompt workspace", "save AI prompts", "prompt organization"],
    related: ["from-chatgpt-history-to-workspace", "organize-ai-prompts-workspace", "building-personal-prompt-library"],
  },
  {
    slug: "from-chatgpt-history-to-workspace",
    title: "From ChatGPT History to a Real Prompt Workspace",
    metaTitle: "Migrate from ChatGPT History to a Prompt Workspace",
    description:
      "Migrate valuable prompts out of ChatGPT history into a structured workspace with versions, domains, compare, and budgets.",
    publishedAt: "2026-05-30",
    category: "Productivity",
    tags: ["ChatGPT", "migration", "workspace"],
    primaryKeyword: "save AI prompts",
    secondaryKeywords: ["ChatGPT prompt organizer", "prompt workspace", "prompt library"],
    related: ["why-prompt-notebooks-fail", "organize-ai-prompts-workspace", "get-started-layerflow-10-minutes"],
  },
  {
    slug: "get-started-layerflow-10-minutes",
    title: "How to Get Started with LayerFlow in 10 Minutes",
    metaTitle: "Get Started with LayerFlow in 10 Minutes",
    description:
      "Create a workspace, save your first prompt, set a budget, and run a multi-model comparison — LayerFlow quickstart for 2026.",
    publishedAt: "2026-05-28",
    category: "Getting started",
    tags: ["tutorial", "quickstart", "LayerFlow"],
    primaryKeyword: "get started AI workspace",
    secondaryKeywords: ["LayerFlow tutorial", "how to compare AI models", "how to set AI budget limits"],
    related: ["how-to-multi-model-comparison", "setting-up-hard-budgets", "connecting-byok-providers"],
  },
  {
    slug: "how-to-multi-model-comparison",
    title: "How to Run Your First Multi-Model Comparison",
    metaTitle: "How to Run a Multi-Model LLM Comparison",
    description:
      "Step-by-step: write one prompt, run GPT/Claude/Gemini/DeepSeek, compare cost and quality, and save the winner.",
    publishedAt: "2026-05-26",
    category: "Getting started",
    tags: ["tutorial", "compare", "models"],
    primaryKeyword: "how to compare AI models",
    secondaryKeywords: ["multi-model comparison", "side by side LLM comparison", "LayerFlow tutorial"],
    related: ["how-to-compare-llm-outputs-side-by-side", "get-started-layerflow-10-minutes", "gpt-vs-claude-vs-gemini-vs-deepseek-2026"],
  },
  {
    slug: "setting-up-hard-budgets",
    title: "Setting Up Hard Budgets Before Your First Prompt",
    metaTitle: "Set Hard AI Budgets Before Your First Prompt",
    description:
      "Configure monthly hard budget limits and alerts before you experiment — the safest habit for new AI workspaces.",
    publishedAt: "2026-05-24",
    category: "Getting started",
    tags: ["tutorial", "budgets", "safety"],
    primaryKeyword: "how to set AI budget limits",
    secondaryKeywords: ["hard budget limits AI", "AI budget alerts", "LayerFlow tutorial"],
    related: ["ai-cost-control-hard-budget-limits", "stop-surprise-ai-bills-budget-alerts", "get-started-layerflow-10-minutes"],
  },
  {
    slug: "connecting-byok-providers",
    title: "Connecting BYOK Providers to One Workspace",
    metaTitle: "Connect BYOK Providers to One AI Workspace",
    description:
      "Add OpenAI, Anthropic, Gemini, and other keys to one workspace. Keep billing with providers while you organize and compare.",
    publishedAt: "2026-05-22",
    category: "Getting started",
    tags: ["BYOK", "tutorial", "providers"],
    primaryKeyword: "BYOK setup guide",
    secondaryKeywords: ["bring your own keys BYOK", "multi provider LLM API", "LayerFlow tutorial"],
    related: ["bring-your-own-keys-byok", "managing-multiple-llm-api-keys", "get-started-layerflow-10-minutes"],
  },
  {
    slug: "sharing-prompt-versions-team",
    title: "Sharing Prompt Versions with Your Team",
    metaTitle: "Share Prompt Versions with Your Team",
    description:
      "Share specific prompt versions — not messy chat threads — so teammates reuse what works with model and cost context intact.",
    publishedAt: "2026-05-20",
    category: "Getting started",
    tags: ["collaboration", "teams", "versions"],
    primaryKeyword: "AI workspace for teams",
    secondaryKeywords: ["shared prompt libraries", "prompt versioning", "teams collaborate"],
    related: ["teams-collaborate-ai-prompts", "prompt-engineering-best-practices-teams-2026", "prompt-version-control-timeline-2026"],
  },
  {
    slug: "ai-workspace-for-developers",
    title: "AI Workspace for Developers: PR Reviews, Docs, and Debug",
    metaTitle: "AI Workspace for Developers | PRs, Docs, Debug",
    description:
      "Use an AI workspace for code review prompts, docs generation, and debugging loops — with versions, compare, and spend caps.",
    publishedAt: "2026-05-18",
    category: "Use cases",
    tags: ["developers", "coding", "use case"],
    primaryKeyword: "developer AI prompt workflow",
    secondaryKeywords: ["AI workspace for developers", "best LLM for coding 2026", "prompt library"],
    related: ["best-model-for-coding-2026", "building-apps-ai-gateway-sdk", "best-ai-workspace-tools-2026"],
  },
  {
    slug: "ai-prompt-workflows-marketing-teams",
    title: "AI Prompt Workflows for Marketing Teams",
    metaTitle: "AI Prompt Workflows for Marketing Teams",
    description:
      "Marketing prompt workflows for campaigns, SEO, and ads — organized by domain with compare and budget guardrails.",
    publishedAt: "2026-05-16",
    category: "Use cases",
    tags: ["marketing", "workflows", "teams"],
    primaryKeyword: "AI workspace for marketers",
    secondaryKeywords: ["best LLM for marketing", "prompt organization", "AI cost control"],
    related: ["best-model-for-marketing-copy", "domain-based-prompt-organization", "agency-workflow-client-domains"],
  },
  {
    slug: "student-guide-study-prompts",
    title: "Student Guide: Organize Study Prompts Without Overspend",
    metaTitle: "Student Guide to Study Prompts Without Overspend",
    description:
      "Students: organize study prompts by course, use cheaper models for drafts, and set hard budgets so AI doesn't blow your month.",
    publishedAt: "2026-05-14",
    category: "Use cases",
    tags: ["students", "education", "budgets"],
    primaryKeyword: "AI prompts for students",
    secondaryKeywords: ["token cost optimization", "prompt library", "hard budget limits AI"],
    related: ["building-personal-prompt-library", "cheap-mode-routing-flash-vs-frontier", "setting-up-hard-budgets"],
  },
  {
    slug: "startup-founder-ai-cost-playbook",
    title: "Startup Founder Playbook: Control AI Costs Early",
    metaTitle: "Startup Playbook: Control AI Costs Early",
    description:
      "Founders: set AI budgets early, separate keys by product surface, and compare models before you lock in expensive defaults.",
    publishedAt: "2026-05-12",
    category: "Use cases",
    tags: ["startups", "founders", "cost"],
    primaryKeyword: "startup AI cost control",
    secondaryKeywords: ["AI cost control", "LLM budget limits", "cheap mode LLM routing"],
    related: ["ai-cost-control-hard-budget-limits", "complete-guide-ai-workspace-cost-control", "ai-spend-analytics-project-key-model"],
  },
  {
    slug: "agency-workflow-client-domains",
    title: "Agency Workflow: Client Domains and Isolated Budgets",
    metaTitle: "Agency AI Workflow: Domains & Isolated Budgets",
    description:
      "Agencies: isolate client prompts into domains, use separate keys and budgets, and compare models without mixing client IP.",
    publishedAt: "2026-05-10",
    category: "Use cases",
    tags: ["agency", "clients", "budgets"],
    primaryKeyword: "agency AI workflow",
    secondaryKeywords: ["AI workspace for teams", "manage LLM API keys", "domain-based organization"],
    related: ["domain-based-prompt-organization", "managing-multiple-llm-api-keys", "ai-prompt-workflows-marketing-teams"],
  },
  {
    slug: "building-apps-ai-gateway-sdk",
    title: "Building Production Apps with an AI Gateway SDK",
    metaTitle: "Build Production Apps with an AI Gateway SDK",
    description:
      "Connect your app with an OpenAI-compatible SDK, keep workspace-side prompts and budgets, and ship without rewriting providers.",
    publishedAt: "2026-05-08",
    category: "Use cases",
    tags: ["SDK", "production", "gateway"],
    primaryKeyword: "AI API gateway",
    secondaryKeywords: ["OpenAI compatible API gateway", "unified LLM API", "LLM gateway"],
    related: ["openai-compatible-api-gateway", "what-is-llm-gateway", "ai-workspace-for-developers"],
  },
  {
    slug: "domain-based-prompt-organization",
    title: "Domain-Based Prompt Organization: Marketing, Coding, Study",
    metaTitle: "Domain-Based Prompt Organization Guide",
    description:
      "Organize prompts by domains that match how you work — Marketing, Coding, Study, Clients — with projects and folders underneath.",
    publishedAt: "2026-05-06",
    category: "Prompt engineering",
    tags: ["domains", "organization", "workspace"],
    primaryKeyword: "prompt organization",
    secondaryKeywords: ["prompt workspace", "AI prompt management", "prompt library"],
    related: ["organize-ai-prompts-workspace", "agency-workflow-client-domains", "building-personal-prompt-library"],
  },
  {
    slug: "prompt-timeline-best-practices",
    title: "Prompt Timeline Best Practices for Long-Running Projects",
    metaTitle: "Prompt Timeline Best Practices for Projects",
    description:
      "Keep long projects healthy with naming, milestones, linked comparisons, and rollback rules on your prompt timeline.",
    publishedAt: "2026-05-04",
    category: "Prompt engineering",
    tags: ["timeline", "best practices", "projects"],
    primaryKeyword: "prompt timeline",
    secondaryKeywords: ["prompt version control", "prompt versioning tool", "prompt diff"],
    related: ["prompt-version-control-timeline-2026", "prompt-diffing-track-changes", "sharing-prompt-versions-team"],
  },
  {
    slug: "teams-collaborate-ai-prompts",
    title: "How Teams Collaborate on AI Prompts Without Slack Chaos",
    metaTitle: "Team Prompt Collaboration Without Slack Chaos",
    description:
      "Replace pasted prompts in Slack with shared versions, comments on diffs, and a single source of truth for what works.",
    publishedAt: "2026-05-02",
    category: "Productivity",
    tags: ["teams", "collaboration", "Slack"],
    primaryKeyword: "AI workspace for teams",
    secondaryKeywords: ["shared prompt libraries", "prompt engineering best practices", "prompt versioning"],
    related: ["sharing-prompt-versions-team", "prompt-engineering-best-practices-teams-2026", "langsmith-alternatives-prompt-tooling"],
  },
  {
    slug: "complete-guide-ai-workspace-cost-control",
    title: "The Complete Guide to AI Workspace Cost Control in 2026",
    metaTitle: "Complete Guide to AI Workspace Cost Control (2026)",
    description:
      "End-to-end AI cost control: budgets, alerts, analytics, cheap routing, BYOK, and compare — the LayerFlow playbook for 2026.",
    publishedAt: "2026-04-30",
    category: "Cost control",
    tags: ["guide", "cost control", "2026"],
    primaryKeyword: "AI cost control",
    secondaryKeywords: ["LLM budget limits", "token cost optimization", "AI spend tracking"],
    related: ["ai-cost-control-hard-budget-limits", "token-cost-optimization-guide", "startup-founder-ai-cost-playbook"],
  },
];

function readingTimeFromBlocks(blocks) {
  let words = 0;
  for (const b of blocks) {
    if (b.text) words += b.text.split(/\s+/).length;
    if (b.items) {
      if (typeof b.items[0] === "string") words += b.items.join(" ").split(/\s+/).length;
      else words += b.items.reduce((n, i) => n + (i.q + " " + i.a).split(/\s+/).length, 0);
    }
  }
  const mins = Math.max(4, Math.round(words / 220));
  return `${mins} min read`;
}

function buildBlocks(def) {
  const topic = def.primaryKeyword;
  const productLinks =
    "Explore [LayerFlow pricing](/pricing), skim the [docs](/docs), or [sign in](/sign-in) to try the workspace.";

  const blocks = [
    p(
      `${def.title.replace(/:?\s*$/, "")} is no longer a nice-to-have. In 2026, teams that treat ${topic} as a first-class workflow ship faster, waste less money, and actually reuse what works. This guide covers the practical patterns we see across developers, marketers, and power users building with LayerFlow — the AI workspace for prompts, models, and cost.`,
    ),
    p(
      `If your prompts still live in Notion, Google Docs, ChatGPT history, or a random Slack thread, you are paying a hidden tax: lost versions, unknown spend, and no reliable way to compare GPT, Claude, Gemini, or DeepSeek on the same task. ${productLinks}`,
    ),
    h2(`Why ${topic} matters now`),
    p(
      `Model quality jumped. So did model choice. That means the bottleneck is rarely “can the model do it?” — it is “can your team find the winning prompt, prove it is better, and keep cost under a hard cap?” Search interest around ${topic} reflects that shift: people want systems, not more chat tabs.`,
    ),
    p(
      `LayerFlow approaches this as a workspace problem first. Gateway and SDK features help when you build, but day-to-day work is saving prompts, comparing models, and enforcing budgets before experiments turn into invoices.`,
    ),
    ul([
      `Clarity: one place for prompts related to ${topic}, with history you can trust.`,
      `Evidence: side-by-side outputs with cost and latency, not vibes.`,
      `Control: hard budget limits and alerts so spend cannot silently runaway.`,
      `Portability: BYOK keeps provider billing with you while LayerFlow handles organization.`,
    ]),
    h2(`A practical workflow you can copy`),
    ol([
      `Create a domain that matches how you work (Marketing, Coding, Study, Clients).`,
      `Save the prompt as v1 with the model you used and a short note on intent.`,
      `Run a compare across at least two providers before you call anything “best.”`,
      `Set or confirm a monthly hard budget and an alert around 80% spend.`,
      `Share the winning version — not a screenshot — with teammates who need it.`,
    ]),
    callout(
      `Pro tip: set the budget before the first expensive experiment. Hard caps that block requests are the feature teams ask for most because soft dashboards alone do not stop surprise bills.`,
    ),
    h2(`How LayerFlow maps to ${topic}`),
    h3(`Prompt Timeline and diffs`),
    p(
      `Every edit becomes a version with model, cost, output, and date. Diffs show what changed so you can roll back when a “clever” rewrite quietly tanks quality. This is git-for-prompts energy without forcing you into a repo for every marketing line.`,
    ),
    h3(`Compare: best, cheapest, or fastest`),
    p(
      `Run the same prompt across GPT, Claude, Gemini, and DeepSeek. Pick the winner for quality, cost, or latency — then save that version into your library. Comparison is how ${def.secondaryKeywords[0] || topic} becomes measurable instead of anecdotal.`,
    ),
    h3(`Hard budgets, alerts, and analytics`),
    p(
      `Monthly progress bars with remaining balance, auto-block at the cap, and alerts near 80% keep experiments honest. Break down spend by project, key, and model so you know which surface is expensive before finance asks.`,
    ),
    h3(`BYOK, gateway, and keys`),
    p(
      `Bring your own provider keys when you want billing to stay with OpenAI, Anthropic, Google, and others. When you are ready to ship an app, use the OpenAI-compatible gateway and SDK — without pretending infrastructure is the whole product.`,
    ),
    h2(`Common mistakes to avoid`),
    ul([
      `Treating chat history as a system of record.`,
      `Declaring a “best model” without a same-prompt comparison.`,
      `Sharing keys in Slack or reusing one key across every client/project.`,
      `Optimizing prompts forever without a budget ceiling.`,
      `Confusing production observability tools with day-to-day prompt workspaces.`,
    ]),
    h2(`Internal next steps`),
    p(
      `If you are evaluating tooling, read our related posts on ${def.related
        .slice(0, 2)
        .map((s) => {
          const related = defs.find((d) => d.slug === s);
          const label = related?.metaTitle?.replace(/\s*\(2026\)\s*$/, "").replace(/\s*\|.*$/, "").trim() || related?.title || s;
          return `[${label}](/blog/${s})`;
        })
        .join(" and ")}. For product context, see [About LayerFlow](/about) and the feature deep-dives on the [homepage](/#features).`,
    ),
    p(
      `Ready to try the workflow? ${productLinks} The free launch plans are designed so you can organize prompts and set budgets before you scale spend.`,
    ),
    h2(`FAQ`),
    faq([
      {
        q: `What is the fastest way to improve ${topic}?`,
        a: `Start with structure and evidence: save prompts with versions, compare at least two models on the same task, and put a hard monthly budget in place. Those three habits beat another prompt tip list.`,
      },
      {
        q: `Do I need an LLM gateway to manage prompts?`,
        a: `No. A gateway helps when you integrate apps. Most people first need a prompt workspace with timeline, compare, and cost control. LayerFlow includes gateway/SDK when you are ready to build.`,
      },
      {
        q: `Can I keep using my own API keys?`,
        a: `Yes. BYOK is core to LayerFlow: you keep provider billing; LayerFlow gives organization, comparison, and hard budget controls in one workspace.`,
      },
      {
        q: `How does this help teams?`,
        a: `Teams stop pasting prompts into Slack. They share versions with model and cost context, reuse libraries by domain, and isolate keys/budgets per project or client.`,
      },
    ]),
  ];

  // Extra depth sections unique-ish per category
  if (def.category === "Cost control") {
    blocks.splice(
      8,
      0,
      h2(`Budget design patterns that work`),
      p(
        `Use a personal monthly ceiling for exploration, separate project caps for shipping surfaces, and alert thresholds that page a human before the hard block. Pair cheap-mode routing (flash/draft models) with frontier models only on final passes.`,
      ),
      ul([
        `Exploration budget: small, hard-capped, intentionally burnable.`,
        `Production budget: keyed separately, monitored daily.`,
        `Compare budget: reserved for evaluation runs so tests do not steal prod quota.`,
      ]),
    );
  }
  if (def.category === "Model comparison") {
    blocks.splice(
      8,
      0,
      h2(`How to score models without bias`),
      p(
        `Write a short rubric before you look at outputs: correctness, tone, completeness, and cost. Blind the model names when possible. Record latency. Prefer the cheapest model that meets the bar — not the most expensive that “feels smart.”`,
      ),
    );
  }
  if (def.category === "AI gateway") {
    blocks.splice(
      8,
      0,
      h2(`Gateway vs workspace: keep the roles clear`),
      p(
        `A gateway unifies API access. A workspace unifies human workflow. You can use either alone, but the durable setup is both: humans iterate in the workspace; apps call the OpenAI-compatible endpoint with the same cost controls and keys.`,
      ),
    );
  }
  if (def.category === "Use cases") {
    blocks.splice(
      8,
      0,
      h2(`Role-specific checklist`),
      ol([
        `Name the domain and project the same way your team already talks.`,
        `Seed 5–10 prompts that you reuse weekly.`,
        `Attach a budget that matches real monthly tolerance.`,
        `Schedule a weekly compare on your highest-cost prompt.`,
      ]),
    );
  }

  return blocks;
}

const posts = defs.map((def) => {
  const blocks = buildBlocks(def);
  return {
    slug: def.slug,
    title: def.title,
    metaTitle: def.metaTitle,
    description: def.description,
    publishedAt: def.publishedAt,
    category: def.category,
    tags: def.tags,
    primaryKeyword: def.primaryKeyword,
    secondaryKeywords: def.secondaryKeywords,
    readingTime: readingTimeFromBlocks(blocks),
    author: AUTHOR,
    relatedSlugs: def.related,
    blocks,
  };
});

const outPath = path.join(root, "content/blog/posts.ts");
const header = `import type { BlogPost } from "@/lib/blog/types";

/**
 * LayerFlow blog corpus — 40 SEO posts.
 * Generated/maintained for ranking on prompt workspace, cost control, compare, gateway, and BYOK keywords.
 */
export const posts: BlogPost[] = `;

const body = JSON.stringify(posts, null, 2)
  .replace(/"type":/g, "type:")
  .replace(/"id":/g, "id:")
  .replace(/"text":/g, "text:")
  .replace(/"items":/g, "items:")
  .replace(/"q":/g, "q:")
  .replace(/"a":/g, "a:")
  .replace(/"slug":/g, "slug:")
  .replace(/"title":/g, "title:")
  .replace(/"metaTitle":/g, "metaTitle:")
  .replace(/"description":/g, "description:")
  .replace(/"publishedAt":/g, "publishedAt:")
  .replace(/"category":/g, "category:")
  .replace(/"tags":/g, "tags:")
  .replace(/"primaryKeyword":/g, "primaryKeyword:")
  .replace(/"secondaryKeywords":/g, "secondaryKeywords:")
  .replace(/"readingTime":/g, "readingTime:")
  .replace(/"author":/g, "author:")
  .replace(/"relatedSlugs":/g, "relatedSlugs:")
  .replace(/"blocks":/g, "blocks:");

// Actually JSON.stringify with unquoted keys is messy. Better emit as TS with JSON.parse or just use `as const` with proper JSON.
// Simplest reliable: export as JSON-compatible TS using satisfies.

const ts = `import type { BlogPost } from "@/lib/blog/types";

/**
 * LayerFlow blog corpus — ${posts.length} SEO posts.
 * Keyword strategy: see lib/blog/keywords.ts
 */
export const posts = ${JSON.stringify(posts, null, 2)} as const satisfies readonly BlogPost[];

export default posts;
`;

fs.writeFileSync(outPath, ts);
console.log(`Wrote ${posts.length} posts to ${outPath}`);
const words = posts.reduce((sum, post) => {
  return (
    sum +
    post.blocks.reduce((n, b) => {
      if (b.text) return n + b.text.split(/\s+/).length;
      if (b.items) {
        if (typeof b.items[0] === "string") return n + b.items.join(" ").split(/\s+/).length;
        return n + b.items.reduce((m, i) => m + (i.q + " " + i.a).split(/\s+/).length, 0);
      }
      return n;
    }, 0)
  );
}, 0);
console.log(`Approx total words: ${words}, avg ${Math.round(words / posts.length)}/post`);
