# Blog publish schedule

Day-by-day auto-publish for the LayerFlow SEO corpus.

## How it works

- Source of truth for **order**: [`content/blog/publish-schedule.ts`](../content/blog/publish-schedule.ts) (`publishOrder`)
- At load time, each post’s `publishedAt` is overwritten from the schedule (existing article bodies stay intact)
- **`POSTS_PER_DAY`** slugs unlock per calendar day — currently **5/day**
- The 50-post Search Console corpus uses **`DAY_OVERRIDES`**: **10/day** on Aug 11–15, 2026
- Public surfaces use `getPublishedPosts(now)` — only posts with `publishedAt` calendar day ≤ editorial **today** (`Asia/Kolkata`)
- Unpublished slug URLs return **404** (still in `generateStaticParams` so builds stay stable)
- Sitemap includes **published posts only**
- Blog routes use `revalidate = 3600` so scheduled posts unlock within about an hour without a full redeploy

## Calendar

Start: **2026-07-29** (Day 0). **5 posts per day**, 155 posts total, running through **2026-08-28**. Then the 50-post Search Console corpus at **10/day**, Aug 11–15 (overlapping the trending tail).

- Indices **0–44** — original 50-post corpus part 1 (Jul 29 – Aug 6)
- Indices **45–49** — 5 big blogs, live Aug 7 (Search Console top queries)
- Indices **50–54** — original corpus part 2 (Aug 8)
- Indices **55–154** — 100-post trending SEO corpus, 5/day Aug 9 – Aug 28
- **Search Console corpus** — `content/blog/searchconsole/corpus-1.ts` … `corpus-5.ts`, 50 posts, 10/day Aug 11 – Aug 15 (dates via `DAY_OVERRIDES` in `publish-schedule.ts`)

| # | Date | Slug | Notes |
|---|------|------|-------|
| 0 | 2026-07-29 | `organize-ai-prompts-workspace` | |
| 1 | 2026-07-29 | `model-routing-latency-cost-quality` | |
| 2 | 2026-07-29 | `bring-your-own-keys-byok` | |
| 3 | 2026-07-29 | `what-is-llm-gateway` | |
| 4 | 2026-07-29 | `gpt-vs-claude-vs-gemini-vs-deepseek-2026` | |
| 5 | 2026-07-30 | `stop-surprise-ai-bills-budget-alerts` | |
| 6 | 2026-07-30 | `how-to-compare-llm-outputs-side-by-side` | |
| 7 | 2026-07-30 | `best-model-for-coding-2026` | |
| 8 | 2026-07-30 | `prompt-engineering-best-practices-teams-2026` | |
| 9 | 2026-07-30 | `token-cost-optimization-guide` | |
| 10 | 2026-07-31 | `ai-prompt-organizer-tools-2026` | |
| 11 | 2026-07-31 | `layered-ai-prompts-system-context-task` | |
| 12 | 2026-07-31 | `ai-api-token-management-guide` | |
| 13 | 2026-07-31 | `private-key-workflows-software-teams` | |
| 14 | 2026-07-31 | `ai-prompt-directory-curated-libraries` | |
| 15 | 2026-08-01 | `byok-in-windsurf-guide` | |
| 16 | 2026-08-01 | `openai-system-prompt-best-practices-2026` | |
| 17 | 2026-08-01 | `llm-vergleich-2026` | |
| 18 | 2026-08-01 | `prompt-regression-testing-guide` | |
| 19 | 2026-08-01 | `50-winning-prompts-2026` | |
| 20 | 2026-08-02 | `from-chatgpt-history-to-workspace` | |
| 21 | 2026-08-02 | `domain-based-prompt-organization` | |
| 22 | 2026-08-02 | `building-personal-prompt-library` | |
| 23 | 2026-08-02 | `prompt-version-control-timeline-2026` | |
| 24 | 2026-08-02 | `why-prompt-notebooks-fail` | |
| 25 | 2026-08-03 | `best-ai-workspace-tools-2026` | |
| 26 | 2026-08-03 | `prompt-timeline-best-practices` | |
| 27 | 2026-08-03 | `cheap-mode-routing-flash-vs-frontier` | |
| 28 | 2026-08-03 | `ai-workspace-for-developers` | |
| 29 | 2026-08-03 | `best-model-for-marketing-copy` | |
| 30 | 2026-08-04 | `how-to-multi-model-comparison` | |
| 31 | 2026-08-04 | `prompt-diffing-track-changes` | |
| 32 | 2026-08-04 | `ai-spend-analytics-project-key-model` | |
| 33 | 2026-08-04 | `ai-cost-control-hard-budget-limits` | |
| 34 | 2026-08-04 | `setting-up-hard-budgets` | |
| 35 | 2026-08-05 | `startup-founder-ai-cost-playbook` | |
| 36 | 2026-08-05 | `connecting-byok-providers` | |
| 37 | 2026-08-05 | `openai-compatible-api-gateway` | |
| 38 | 2026-08-05 | `langsmith-alternatives-prompt-tooling` | |
| 39 | 2026-08-05 | `managing-multiple-llm-api-keys` | |
| 40 | 2026-08-06 | `secure-ai-key-management` | |
| 41 | 2026-08-06 | `prompt-management-vs-observability` | |
| 42 | 2026-08-06 | `sharing-prompt-versions-team` | |
| 43 | 2026-08-06 | `get-started-layerflow-10-minutes` | |
| 44 | 2026-08-06 | `ai-prompt-workflows-marketing-teams` | |
| 45 | 2026-08-07 | `layered-ai-prompts-practical-guide` | 5 big blogs — Search Console top queries |
| 46 | 2026-08-07 | `organize-ai-prompts-step-by-step` | 5 big blogs — Search Console top queries |
| 47 | 2026-08-07 | `best-ai-prompt-organizers-2026` | 5 big blogs — Search Console top queries |
| 48 | 2026-08-07 | `llm-routing-formula-explained` | 5 big blogs — Search Console top queries |
| 49 | 2026-08-07 | `ai-api-token-management-playbook` | 5 big blogs — Search Console top queries |
| 50 | 2026-08-08 | `student-guide-study-prompts` | |
| 51 | 2026-08-08 | `agency-workflow-client-domains` | |
| 52 | 2026-08-08 | `building-apps-ai-gateway-sdk` | |
| 53 | 2026-08-08 | `teams-collaborate-ai-prompts` | |
| 54 | 2026-08-08 | `complete-guide-ai-workspace-cost-control` | |
| 55 | 2026-08-09 | `model-context-protocol-mcp-guide` | Trending corpus |
| 56 | 2026-08-09 | `what-is-rag-guide` | Trending corpus |
| 57 | 2026-08-09 | `llm-prompt-injection-security` | Trending corpus |
| 58 | 2026-08-09 | `best-ai-coding-assistants-2026` | Trending corpus |
| 59 | 2026-08-09 | `ai-agent-frameworks-comparison` | Trending corpus |
| 60 | 2026-08-10 | `vector-database-comparison-2026` | Trending corpus |
| 61 | 2026-08-10 | `llm-fine-tuning-vs-prompting` | Trending corpus |
| 62 | 2026-08-10 | `token-calculator-guide` | Trending corpus |
| 63 | 2026-08-10 | `chatgpt-vs-claude-vs-gemini-2026` | Trending corpus |
| 64 | 2026-08-10 | `embedding-models-comparison` | Trending corpus |
| 65 | 2026-08-11 | `streaming-llm-responses-guide` | Trending corpus |
| 66 | 2026-08-11 | `structured-outputs-json-guide` | Trending corpus |
| 67 | 2026-08-11 | `function-calling-llm-guide` | Trending corpus |
| 68 | 2026-08-11 | `llm-rate-limits-retry-guide` | Trending corpus |
| 69 | 2026-08-11 | `prompt-caching-guide` | Trending corpus |
| 70 | 2026-08-12 | `temperature-vs-top-p-explained` | Trending corpus |
| 71 | 2026-08-12 | `context-window-optimization` | Trending corpus |
| 72 | 2026-08-12 | `rag-vs-fine-tuning` | Trending corpus |
| 73 | 2026-08-12 | `ai-search-engine-tools-2026` | Trending corpus |
| 74 | 2026-08-12 | `best-llm-gateways-2026` | Trending corpus |
| 75 | 2026-08-13 | `openrouter-vs-lite-llm` | Trending corpus |
| 76 | 2026-08-13 | `llm-observability-tools-2026` | Trending corpus |
| 77 | 2026-08-13 | `eval-llm-prompts-systematic` | Trending corpus |
| 78 | 2026-08-13 | `ai-productivity-tools-2026` | Trending corpus |
| 79 | 2026-08-13 | `deepseek-vs-openai-2026` | Trending corpus |
| 80 | 2026-08-14 | `model-context-protocol-servers-list` | Trending corpus |
| 81 | 2026-08-14 | `ai-agents-guide-2026` | Trending corpus |
| 82 | 2026-08-14 | `prompt-engineering-for-agents` | Trending corpus |
| 83 | 2026-08-14 | `llm-security-best-practices` | Trending corpus |
| 84 | 2026-08-14 | `cost-per-token-explained` | Trending corpus |
| 85 | 2026-08-15 | `open-source-llms-2026` | Trending corpus |
| 86 | 2026-08-15 | `on-device-llms-guide` | Trending corpus |
| 87 | 2026-08-15 | `ai-search-optimization-seo-2026` | Trending corpus |
| 88 | 2026-08-15 | `multi-agent-systems-guide` | Trending corpus |
| 89 | 2026-08-15 | `llm-context-compression` | Trending corpus |
| 90 | 2026-08-16 | `prompt-template-systems` | Trending corpus |
| 91 | 2026-08-16 | `llm-workflow-automation-tools` | Trending corpus |
| 92 | 2026-08-16 | `ai-for-seo-content-writing` | Trending corpus |
| 93 | 2026-08-16 | `llm-apis-pricing-comparison-2026` | Trending corpus |
| 94 | 2026-08-16 | `batch-api-llm-guide` | Trending corpus |
| 95 | 2026-08-17 | `reasoning-models-guide-2026` | Trending corpus |
| 96 | 2026-08-17 | `small-language-models-2026` | Trending corpus |
| 97 | 2026-08-17 | `ai-chatbot-api-integration` | Trending corpus |
| 98 | 2026-08-17 | `llm-caching-strategies` | Trending corpus |
| 99 | 2026-08-17 | `prompt-evaluation-metrics` | Trending corpus |
| 100 | 2026-08-18 | `knowledge-bases-llm-apps` | Trending corpus |
| 101 | 2026-08-18 | `ai-document-summarization-apis` | Trending corpus |
| 102 | 2026-08-18 | `autonomous-ai-agents-2026` | Trending corpus |
| 103 | 2026-08-18 | `llm-routing-policy-guide` | Trending corpus |
| 104 | 2026-08-18 | `cost-optimization-llm-apps` | Trending corpus |
| 105 | 2026-08-19 | `mcp-tutorial-build-server` | Trending corpus |
| 106 | 2026-08-19 | `ai-meeting-notes-tools-2026` | Trending corpus |
| 107 | 2026-08-19 | `prompt-injection-defenses` | Trending corpus |
| 108 | 2026-08-19 | `llm-latency-optimization` | Trending corpus |
| 109 | 2026-08-19 | `ai-model-hallucinations` | Trending corpus |
| 110 | 2026-08-20 | `token-budget-planning` | Trending corpus |
| 111 | 2026-08-20 | `ai-email-automation-2026` | Trending corpus |
| 112 | 2026-08-20 | `llm-versioning-model-swap` | Trending corpus |
| 113 | 2026-08-20 | `customer-support-chatbot-llm` | Trending corpus |
| 114 | 2026-08-20 | `ai-code-review-tools-2026` | Trending corpus |
| 115 | 2026-08-21 | `knowledge-graph-vs-rag` | Trending corpus |
| 116 | 2026-08-21 | `llm-quantization-guide` | Trending corpus |
| 117 | 2026-08-21 | `ai-voice-agents-2026` | Trending corpus |
| 118 | 2026-08-21 | `prompt-hub-enterprise` | Trending corpus |
| 119 | 2026-08-21 | `ai-content-detection-2026` | Trending corpus |
| 120 | 2026-08-22 | `llm-context-window-costs` | Trending corpus |
| 121 | 2026-08-22 | `best-api-key-management-tools` | Trending corpus |
| 122 | 2026-08-22 | `ai-research-assistants-2026` | Trending corpus |
| 123 | 2026-08-22 | `llm-evals-vs-human-review` | Trending corpus |
| 124 | 2026-08-22 | `ai-marketing-automation-guide` | Trending corpus |
| 125 | 2026-08-23 | `model-registry-llm-governance` | Trending corpus |
| 126 | 2026-08-23 | `ai-for-customer-research` | Trending corpus |
| 127 | 2026-08-23 | `llm-cost-per-month-budget` | Trending corpus |
| 128 | 2026-08-23 | `ai-writing-assistants-2026` | Trending corpus |
| 129 | 2026-08-23 | `fine-tuning-open-source-llm` | Trending corpus |
| 130 | 2026-08-24 | `mcp-vs-api-guide` | Trending corpus |
| 131 | 2026-08-24 | `ai-screenshot-to-code-tools` | Trending corpus |
| 132 | 2026-08-24 | `llm-output-validation-schemas` | Trending corpus |
| 133 | 2026-08-24 | `ai-analytics-dashboards-2026` | Trending corpus |
| 134 | 2026-08-24 | `multi-provider-llm-apps` | Trending corpus |
| 135 | 2026-08-25 | `llm-provider-failover-guide` | Trending corpus |
| 136 | 2026-08-25 | `ai-recruiting-tools-2026` | Trending corpus |
| 137 | 2026-08-25 | `prompt-design-patterns-library` | Trending corpus |
| 138 | 2026-08-25 | `llm-usage-monitoring-alerts` | Trending corpus |
| 139 | 2026-08-25 | `ai-document-processing-guide` | Trending corpus |
| 140 | 2026-08-26 | `model-choice-decision-framework` | Trending corpus |
| 141 | 2026-08-26 | `ai-project-management-tools-2026` | Trending corpus |
| 142 | 2026-08-26 | `llm-context-window-upgrade-costs` | Trending corpus |
| 143 | 2026-08-26 | `ai-customer-onboarding-chatbots` | Trending corpus |
| 144 | 2026-08-26 | `prompt-versioning-teams-guide` | Trending corpus |
| 145 | 2026-08-27 | `llm-latency-sla-architecture` | Trending corpus |
| 146 | 2026-08-27 | `ai-for-content-saas` | Trending corpus |
| 147 | 2026-08-27 | `embedding-cost-optimization` | Trending corpus |
| 148 | 2026-08-27 | `ai-support-ticketing-2026` | Trending corpus |
| 149 | 2026-08-27 | `llm-scaling-guide` | Trending corpus |
| 150 | 2026-08-28 | `ai-ppt-generation-tools-2026` | Trending corpus |
| 151 | 2026-08-28 | `llm-accuracy-benchmarks-2026` | Trending corpus |
| 152 | 2026-08-28 | `ai-sentiment-analysis-guide` | Trending corpus |
| 153 | 2026-08-28 | `llm-cost-monitoring-open-source` | Trending corpus |
| 154 | 2026-08-28 | `ai-automation-playbook-2026` | |
| 155 | 2026-08-11 | `organize-ai-prompts-2026-system` | Search Console corpus 1 — prompt org |
| 156 | 2026-08-11 | `layered-ai-prompts-layers-explained` | Search Console corpus 1 — prompt org |
| 157 | 2026-08-11 | `ai-prompt-organizer-checklist` | Search Console corpus 1 — prompt org |
| 158 | 2026-08-11 | `prompt-library-best-practices` | Search Console corpus 1 — prompt org |
| 159 | 2026-08-11 | `prompts-as-code-workflow` | Search Console corpus 1 — prompt org |
| 160 | 2026-08-11 | `prompt-folder-structure-design` | Search Console corpus 1 — prompt org |
| 161 | 2026-08-11 | `ai-prompt-workspace-vs-tools` | Search Console corpus 1 — prompt org |
| 162 | 2026-08-11 | `find-prompt-fast-search` | Search Console corpus 1 — prompt org |
| 163 | 2026-08-11 | `prompt-management-enterprise-guide` | Search Console corpus 1 — prompt org |
| 164 | 2026-08-11 | `ai-chat-rescue-continue-sessions` | Search Console corpus 1 — prompt org |
| 165 | 2026-08-12 | `context-engineering-guide` | Search Console corpus 2 — context |
| 166 | 2026-08-12 | `ai-context-loss-problem` | Search Console corpus 2 — context |
| 167 | 2026-08-12 | `context-portability-models` | Search Console corpus 2 — context |
| 168 | 2026-08-12 | `context-compression-techniques` | Search Console corpus 2 — context |
| 169 | 2026-08-12 | `claude-code-md-project-context` | Search Console corpus 2 — context |
| 170 | 2026-08-12 | `multi-model-workflow-design` | Search Console corpus 2 — context |
| 171 | 2026-08-12 | `ai-project-memory-guide` | Search Console corpus 2 — context |
| 172 | 2026-08-12 | `context-window-budgeting` | Search Console corpus 2 — context |
| 173 | 2026-08-12 | `ai-conversation-handoff-team` | Search Console corpus 2 — context |
| 174 | 2026-08-12 | `long-context-vs-compression` | Search Console corpus 2 — context |
| 175 | 2026-08-13 | `llm-routing-implementation-guide` | Search Console corpus 3 — routing/cost |
| 176 | 2026-08-13 | `llm-cost-per-task-analysis` | Search Console corpus 3 — routing/cost |
| 177 | 2026-08-13 | `reduce-llm-spend-15-ways` | Search Console corpus 3 — routing/cost |
| 178 | 2026-08-13 | `llm-gateway-vs-direct-api` | Search Console corpus 3 — routing/cost |
| 179 | 2026-08-13 | `startup-ai-stack-guide` | Search Console corpus 3 — routing/cost |
| 180 | 2026-08-13 | `llm-pricing-comparison-2026` | Search Console corpus 3 — routing/cost |
| 181 | 2026-08-13 | `semantic-caching-guide` | Search Console corpus 3 — routing/cost |
| 182 | 2026-08-13 | `ai-spend-analytics-dashboard` | Search Console corpus 3 — routing/cost |
| 183 | 2026-08-13 | `hard-budgets-ai-teams` | Search Console corpus 3 — routing/cost |
| 184 | 2026-08-13 | `model-fallback-strategies-guide` | Search Console corpus 3 — routing/cost |
| 185 | 2026-08-14 | `byok-for-beginners-guide` | Search Console corpus 4 — BYOK/keys |
| 186 | 2026-08-14 | `byok-vs-platform-credits` | Search Console corpus 4 — BYOK/keys |
| 187 | 2026-08-14 | `llm-api-key-management-guide` | Search Console corpus 4 — BYOK/keys |
| 188 | 2026-08-14 | `team-api-keys-security` | Search Console corpus 4 — BYOK/keys |
| 189 | 2026-08-14 | `software-private-key-workflows-2026` | Search Console corpus 4 — BYOK/keys |
| 190 | 2026-08-14 | `ai-tool-security-audit` | Search Console corpus 4 — BYOK/keys |
| 191 | 2026-08-14 | `api-key-rotation-automation` | Search Console corpus 4 — BYOK/keys |
| 192 | 2026-08-14 | `data-privacy-ai-tools-byok` | Search Console corpus 4 — BYOK/keys |
| 193 | 2026-08-14 | `ai-governance-small-teams` | Search Console corpus 4 — BYOK/keys |
| 194 | 2026-08-14 | `ai-cost-per-client-tracking` | Search Console corpus 4 — BYOK/keys |
| 195 | 2026-08-15 | `compare-llm-outputs-tools-2026` | Search Console corpus 5 — comparison/news |
| 196 | 2026-08-15 | `llm-evals-workflow-guide` | Search Console corpus 5 — comparison/news |
| 197 | 2026-08-15 | `ai-model-benchmarks-2026` | Search Console corpus 5 — comparison/news |
| 198 | 2026-08-15 | `best-model-per-task-2026` | Search Console corpus 5 — comparison/news |
| 199 | 2026-08-15 | `prompt-engineering-news-2026` | Search Console corpus 5 — comparison/news |
| 200 | 2026-08-15 | `llm-market-news-2026` | Search Console corpus 5 — comparison/news |
| 201 | 2026-08-15 | `ai-for-students-guide-2026` | Search Console corpus 5 — comparison/news |
| 202 | 2026-08-15 | `freelancer-ai-workflow-2026` | Search Console corpus 5 — comparison/news |
| 203 | 2026-08-15 | `ai-for-non-developers-guide` | Search Console corpus 5 — comparison/news |
| 204 | 2026-08-15 | `layerflow-workspace-tour` | Search Console corpus 5 — comparison/news |

## Changing the schedule

1. Edit `publishOrder` in `content/blog/publish-schedule.ts`
2. For non-uniform pacing (e.g. 10/day bursts), add the slug to `DAY_OVERRIDES` with the day number (0-indexed from `BLOG_SCHEDULE_START`)
3. Optionally tweak title/meta/keywords on the rematched post in `content/blog/posts.ts`
4. Do **not** mass-rewrite article bodies unless intentionally expanding a priority post

## Verify

```bash
npx tsx -e "
import { getPublishedPosts, getPublishedPostBySlug } from './lib/blog';
const today = new Date('2026-07-29T08:00:00+05:30');
const tomorrow = new Date('2026-07-30T08:00:00+05:30');
console.log(getPublishedPosts(today).map(p => p.slug));
console.log(!!getPublishedPostBySlug('model-routing-latency-cost-quality', today)); // false
console.log(!!getPublishedPostBySlug('model-routing-latency-cost-quality', tomorrow)); // true
"
```
