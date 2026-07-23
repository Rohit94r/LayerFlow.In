/**
 * LayerFlow SEO keyword strategy — market search terms mapped to content themes.
 * Primary keywords are assigned 1:1 to posts in content/blog/posts.ts.
 */

export const keywordClusters = {
  promptWorkspace: [
    "AI prompt management",
    "prompt workspace",
    "prompt version control",
    "prompt library",
    "prompt organization",
    "prompt timeline",
    "prompt diff",
    "prompt engineering best practices",
    "save AI prompts",
    "prompt versioning tool",
  ],
  costControl: [
    "AI cost control",
    "LLM budget limits",
    "hard budget limits AI",
    "token cost optimization",
    "AI spend tracking",
    "prevent surprise AI bills",
    "LLM cost analytics",
    "cheap mode LLM routing",
    "reduce GPT API costs",
    "AI budget alerts",
  ],
  modelComparison: [
    "compare GPT Claude Gemini",
    "GPT vs Claude vs Gemini vs DeepSeek",
    "multi-model comparison",
    "best LLM for coding 2026",
    "best LLM for marketing",
    "LLM model routing",
    "side by side LLM comparison",
    "pick cheapest AI model",
    "LLM latency comparison",
    "frontier vs flash models",
  ],
  gatewayByok: [
    "LLM gateway",
    "OpenAI compatible API gateway",
    "AI API gateway",
    "bring your own keys BYOK",
    "BYOK LLM",
    "multi provider LLM API",
    "manage LLM API keys",
    "AI key management",
    "OpenAI compatible proxy",
    "unified LLM API",
  ],
  alternatives: [
    "LangSmith alternatives",
    "prompt tooling",
    "AI workspace for teams",
    "AI workspace for developers",
    "ChatGPT prompt organizer",
    "prompt observability vs workspace",
    "best prompt management tools 2026",
    "AI playground with budgets",
  ],
  gettingStarted: [
    "how to compare AI models",
    "how to set AI budget limits",
    "LayerFlow tutorial",
    "get started AI workspace",
    "BYOK setup guide",
  ],
  useCases: [
    "AI workspace for marketers",
    "AI prompts for students",
    "startup AI cost control",
    "agency AI workflow",
    "developer AI prompt workflow",
  ],
  /** High commercial intent — surprise bills & hard caps (Cluster B wedge) */
  hardBudgets: [
    "hard budget limits AI",
    "hard budget limits LLM",
    "prevent surprise OpenAI bill",
    "stop surprise AI bills",
    "OpenAI bill shock",
    "LLM spend caps",
    "AI monthly budget limit",
    "block LLM requests over budget",
  ],
  /** Everyday / non-dev search intent underserved by gateway tools */
  everydayUsers: [
    "organize ChatGPT prompts",
    "save Claude prompts",
    "ChatGPT prompt library",
    "where to store AI prompts",
    "prompt manager for ChatGPT",
    "Notion AI prompt library alternative",
    "ChatGPT Teams prompt organizer",
  ],
  /** Mid-funnel alternatives — secondary to workspace SEO */
  gatewayAlternatives: [
    "OpenRouter alternative",
    "OpenRouter vs BYOK",
    "Portkey alternatives",
    "LiteLLM alternative hosted",
    "Helicone alternatives",
    "best LLM gateway for individuals",
  ],
} as const;

export const allKeywords = Object.values(keywordClusters).flat();

/** Category → cluster mapping for editorial planning */
export const categoryKeywordFocus: Record<string, keyof typeof keywordClusters> = {
  "Prompt engineering": "promptWorkspace",
  "Cost control": "costControl",
  "Model comparison": "modelComparison",
  "AI gateway": "gatewayByok",
  Productivity: "alternatives",
  "Getting started": "gettingStarted",
  "Use cases": "useCases",
  /** Editorial: map new posts into these when authored */
  Budgets: "hardBudgets",
  Everyday: "everydayUsers",
  Alternatives: "gatewayAlternatives",
};
