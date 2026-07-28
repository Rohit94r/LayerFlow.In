/**
 * Day-by-day SEO publish schedule for LayerFlow blog.
 *
 * One slug per calendar day starting at BLOG_SCHEDULE_START (editorial TZ).
 * Order follows the founder SEO priority queue (Week 1 → Week 2 → remaining topics),
 * remapped onto the existing ~40-post corpus (no mass rewrites).
 *
 * See docs/blog-publish-schedule.md for the human-readable calendar.
 */

/** Editorial timezone for “today” vs publishedAt calendar-day checks */
export const BLOG_TZ = "Asia/Kolkata";

/** Day 0 / Week 1 Day 1 — Wednesday Jul 29, 2026 */
export const BLOG_SCHEDULE_START = "2026-07-29";

/**
 * Publish order (index 0 = schedule start date).
 * Comments cite SEO topic numbers from the founder list where rematched.
 */
export const publishOrder = [
  // Week 1 — already-ranking keywords
  "organize-ai-prompts-workspace", // Blog 2 / “how to organize ai prompts”
  "model-routing-latency-cost-quality", // Blog 22 cost vs quality
  "bring-your-own-keys-byok", // Blog 25 what is BYOK
  "what-is-llm-gateway", // Blog 27 LLM gateway
  "gpt-vs-claude-vs-gemini-vs-deepseek-2026", // Blog 9 GPT vs Claude vs Gemini
  // Week 2
  "stop-surprise-ai-bills-budget-alerts", // Blog 17 surprise OpenAI bill
  "how-to-compare-llm-outputs-side-by-side", // Blog 10 compare LLM outputs
  "best-model-for-coding-2026", // Blog 36 best AI models 2026
  "prompt-engineering-best-practices-teams-2026", // Blog 31 prompt engineering 2026
  "token-cost-optimization-guide", // Blog 20 reduce OpenAI bill
  // Remaining corpus — SEO affinity order, 1/day
  "from-chatgpt-history-to-workspace", // scattered prompts / ChatGPT history
  "domain-based-prompt-organization", // developer prompt management
  "building-personal-prompt-library", // personal prompt library
  "prompt-version-control-timeline-2026", // git for prompts
  "why-prompt-notebooks-fail", // stop Notion notebooks
  "best-ai-workspace-tools-2026", // best prompt organizers / workspaces
  "prompt-timeline-best-practices", // templates / long-running prompts
  "cheap-mode-routing-flash-vs-frontier", // cheapest / flash vs frontier
  "ai-workspace-for-developers", // coding workflows
  "best-model-for-marketing-copy", // model pick for a vertical
  "how-to-multi-model-comparison", // LLM comparison guide
  "prompt-diffing-track-changes", // iteration / change tracking
  "ai-spend-analytics-project-key-model", // cost calculator / analytics
  "ai-cost-control-hard-budget-limits", // hard budget limits
  "setting-up-hard-budgets", // budgets before first prompt
  "startup-founder-ai-cost-playbook", // startup AI spend
  "connecting-byok-providers", // BYOK vs managed setup
  "openai-compatible-api-gateway", // gateway / multi-provider
  "langsmith-alternatives-prompt-tooling", // gateway / tooling alternatives
  "managing-multiple-llm-api-keys", // multiple providers
  "secure-ai-key-management",
  "prompt-management-vs-observability",
  "sharing-prompt-versions-team",
  "get-started-layerflow-10-minutes",
  "ai-prompt-workflows-marketing-teams",
  "student-guide-study-prompts",
  "agency-workflow-client-domains",
  "building-apps-ai-gateway-sdk", // AI dev tools / gateway apps
  "teams-collaborate-ai-prompts",
  "complete-guide-ai-workspace-cost-control", // pricing / cost control guide
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
  return addUtcDays(BLOG_SCHEDULE_START, idx);
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
