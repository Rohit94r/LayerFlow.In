/**
 * Day-by-day SEO publish schedule for LayerFlow blog.
 *
 * POSTS_PER_DAY slugs are published per calendar day starting at
 * BLOG_SCHEDULE_START (editorial TZ). Order follows the founder SEO
 * priority queue, then the Search Console top queries (Aug 2026), then
 * the 100-post trending SEO corpus (5/day for 20 days).
 *
 * See docs/blog-publish-schedule.md for the human-readable calendar.
 */

/** Editorial timezone for “today” vs publishedAt calendar-day checks */
export const BLOG_TZ = "Asia/Kolkata";

/** How many posts unlock per calendar day */
export const POSTS_PER_DAY = 5;

/** Day 0 — Wednesday Jul 29, 2026 */
export const BLOG_SCHEDULE_START = "2026-07-29";

/**
 * Publish order (index i → day floor(i / POSTS_PER_DAY)).
 * Indices 0-44: original 50-post corpus part 1 (days 0-8, Jul 29 - Aug 6).
 * Indices 45-49: 5 big blogs for TODAY (Aug 7) — Search Console top queries.
 * Indices 50-54: original corpus part 2 (5 posts, Aug 8).
 * Indices 55-154: 100-post trending SEO corpus, 5/day Aug 9 - Aug 28.
 */
export const publishOrder = [
  // Original corpus — all live by day 9 (Aug 7)
  "organize-ai-prompts-workspace", // how to organize ai prompts
  "model-routing-latency-cost-quality", // LLM routing cost latency quality
  "bring-your-own-keys-byok", // what is BYOK
  "what-is-llm-gateway", // LLM gateway
  "gpt-vs-claude-vs-gemini-vs-deepseek-2026", // GPT vs Claude vs Gemini
  "stop-surprise-ai-bills-budget-alerts", // surprise OpenAI bill
  "how-to-compare-llm-outputs-side-by-side", // compare LLM outputs
  "best-model-for-coding-2026", // best AI models 2026
  "prompt-engineering-best-practices-teams-2026", // prompt engineering 2026
  "token-cost-optimization-guide", // reduce OpenAI bill
  "ai-prompt-organizer-tools-2026", // ai prompt organizer
  "layered-ai-prompts-system-context-task", // layered ai prompts
  "ai-api-token-management-guide", // ai api token management
  "private-key-workflows-software-teams", // software private key workflows
  "ai-prompt-directory-curated-libraries", // ai prompt directory
  "byok-in-windsurf-guide", // byok in windsurf
  "openai-system-prompt-best-practices-2026", // openai system prompt
  "llm-vergleich-2026", // llm vergleich (German)
  "prompt-regression-testing-guide", // promptfoo / prompt testing
  "50-winning-prompts-2026", // winning prompts
  "from-chatgpt-history-to-workspace",
  "domain-based-prompt-organization",
  "building-personal-prompt-library",
  "prompt-version-control-timeline-2026",
  "why-prompt-notebooks-fail",
  "best-ai-workspace-tools-2026",
  "prompt-timeline-best-practices",
  "cheap-mode-routing-flash-vs-frontier",
  "ai-workspace-for-developers",
  "best-model-for-marketing-copy",
  "how-to-multi-model-comparison",
  "prompt-diffing-track-changes",
  "ai-spend-analytics-project-key-model",
  "ai-cost-control-hard-budget-limits",
  "setting-up-hard-budgets",
  "startup-founder-ai-cost-playbook",
  "connecting-byok-providers",
  "openai-compatible-api-gateway",
  "langsmith-alternatives-prompt-tooling",
  "managing-multiple-llm-api-keys",
  "secure-ai-key-management",
  "prompt-management-vs-observability",
  "sharing-prompt-versions-team",
  "get-started-layerflow-10-minutes",
  "ai-prompt-workflows-marketing-teams",
  // 5 big blogs — live today (Aug 7)
  "layered-ai-prompts-practical-guide",
  "organize-ai-prompts-step-by-step",
  "best-ai-prompt-organizers-2026",
  "llm-routing-formula-explained",
  "ai-api-token-management-playbook",
  // Original corpus part 2 — 5 posts (Aug 8)
  "student-guide-study-prompts",
  "agency-workflow-client-domains",
  "building-apps-ai-gateway-sdk",
  "teams-collaborate-ai-prompts",
  "complete-guide-ai-workspace-cost-control",
  // 100-post trending SEO corpus — 5/day from Aug 9
  "model-context-protocol-mcp-guide",
  "what-is-rag-guide",
  "llm-prompt-injection-security",
  "best-ai-coding-assistants-2026",
  "ai-agent-frameworks-comparison",
  "vector-database-comparison-2026",
  "llm-fine-tuning-vs-prompting",
  "token-calculator-guide",
  "chatgpt-vs-claude-vs-gemini-2026",
  "embedding-models-comparison",
  "streaming-llm-responses-guide",
  "structured-outputs-json-guide",
  "function-calling-llm-guide",
  "llm-rate-limits-retry-guide",
  "prompt-caching-guide",
  "temperature-vs-top-p-explained",
  "context-window-optimization",
  "rag-vs-fine-tuning",
  "ai-search-engine-tools-2026",
  "best-llm-gateways-2026",
  "openrouter-vs-lite-llm",
  "llm-observability-tools-2026",
  "eval-llm-prompts-systematic",
  "ai-productivity-tools-2026",
  "deepseek-vs-openai-2026",
  "model-context-protocol-servers-list",
  "ai-agents-guide-2026",
  "prompt-engineering-for-agents",
  "llm-security-best-practices",
  "cost-per-token-explained",
  "open-source-llms-2026",
  "on-device-llms-guide",
  "ai-search-optimization-seo-2026",
  "multi-agent-systems-guide",
  "llm-context-compression",
  "prompt-template-systems",
  "llm-workflow-automation-tools",
  "ai-for-seo-content-writing",
  "llm-apis-pricing-comparison-2026",
  "batch-api-llm-guide",
  "reasoning-models-guide-2026",
  "small-language-models-2026",
  "ai-chatbot-api-integration",
  "llm-caching-strategies",
  "prompt-evaluation-metrics",
  "knowledge-bases-llm-apps",
  "ai-document-summarization-apis",
  "autonomous-ai-agents-2026",
  "llm-routing-policy-guide",
  "cost-optimization-llm-apps",
  "mcp-tutorial-build-server",
  "ai-meeting-notes-tools-2026",
  "prompt-injection-defenses",
  "llm-latency-optimization",
  "ai-model-hallucinations",
  "token-budget-planning",
  "ai-email-automation-2026",
  "llm-versioning-model-swap",
  "customer-support-chatbot-llm",
  "ai-code-review-tools-2026",
  "knowledge-graph-vs-rag",
  "llm-quantization-guide",
  "ai-voice-agents-2026",
  "prompt-hub-enterprise",
  "ai-content-detection-2026",
  "llm-context-window-costs",
  "best-api-key-management-tools",
  "ai-research-assistants-2026",
  "llm-evals-vs-human-review",
  "ai-marketing-automation-guide",
  "model-registry-llm-governance",
  "ai-for-customer-research",
  "llm-cost-per-month-budget",
  "ai-writing-assistants-2026",
  "fine-tuning-open-source-llm",
  "mcp-vs-api-guide",
  "ai-screenshot-to-code-tools",
  "llm-output-validation-schemas",
  "ai-analytics-dashboards-2026",
  "multi-provider-llm-apps",
  "llm-provider-failover-guide",
  "ai-recruiting-tools-2026",
  "prompt-design-patterns-library",
  "llm-usage-monitoring-alerts",
  "ai-document-processing-guide",
  "model-choice-decision-framework",
  "ai-project-management-tools-2026",
  "llm-context-window-upgrade-costs",
  "ai-customer-onboarding-chatbots",
  "prompt-versioning-teams-guide",
  "llm-latency-sla-architecture",
  "ai-for-content-saas",
  "embedding-cost-optimization",
  "ai-support-ticketing-2026",
  "llm-scaling-guide",
  "ai-ppt-generation-tools-2026",
  "llm-accuracy-benchmarks-2026",
  "ai-sentiment-analysis-guide",
  "llm-cost-monitoring-open-source",
  "ai-automation-playbook-2026",
] as const;

export type ScheduledSlug = (typeof publishOrder)[number];

function addUtcDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/** YYYY-MM-DD for a slug in the schedule, or undefined if unscheduled */
export function scheduledPublishDate(slug: string): string | undefined {
  const idx = publishOrder.indexOf(slug as ScheduledSlug);
  if (idx < 0) return undefined;
  return addUtcDays(BLOG_SCHEDULE_START, Math.floor(idx / POSTS_PER_DAY));
}

/** Full slug → date map (for docs / debugging) */
export function getPublishScheduleMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const slug of publishOrder) {
    const date = scheduledPublishDate(slug);
    if (date) map[slug] = date;
  }
  return map;
}

/** Calendar date YYYY-MM-DD in the editorial timezone */
export function toBlogDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BLOG_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
