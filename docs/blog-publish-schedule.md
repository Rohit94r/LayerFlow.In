# Blog publish schedule

Day-by-day auto-publish for the LayerFlow SEO corpus.

## How it works

- Source of truth for **order**: [`content/blog/publish-schedule.ts`](../content/blog/publish-schedule.ts) (`publishOrder`)
- At load time, each post’s `publishedAt` is overwritten from the schedule (existing article bodies stay intact)
- Public surfaces use `getPublishedPosts(now)` — only posts with `publishedAt` calendar day ≤ editorial **today** (`Asia/Kolkata`)
- Unpublished slug URLs return **404** (still in `generateStaticParams` so builds stay stable)
- Sitemap includes **published posts only**
- Blog routes use `revalidate = 3600` so scheduled posts unlock within about an hour without a full redeploy

## Calendar

Start: **2026-07-29** (Week 1 Day 1). One new post per day.

| Day | Date | Slug | Notes |
|-----|------|------|-------|
| 0 | 2026-07-29 | `organize-ai-prompts-workspace` | Week 1 · SEO Blog 2 — how to organize ai prompts |
| 1 | 2026-07-30 | `model-routing-latency-cost-quality` | Week 1 · SEO Blog 22 — AI cost vs quality |
| 2 | 2026-07-31 | `bring-your-own-keys-byok` | Week 1 · SEO Blog 25 — what is BYOK |
| 3 | 2026-08-01 | `what-is-llm-gateway` | Week 1 · SEO Blog 27 — LLM gateway |
| 4 | 2026-08-02 | `gpt-vs-claude-vs-gemini-vs-deepseek-2026` | Week 1 · SEO Blog 9 — GPT vs Claude vs Gemini |
| 5 | 2026-08-03 | `stop-surprise-ai-bills-budget-alerts` | Week 2 · SEO Blog 17 — surprise OpenAI bill |
| 6 | 2026-08-04 | `how-to-compare-llm-outputs-side-by-side` | Week 2 · SEO Blog 10 — compare LLM outputs |
| 7 | 2026-08-05 | `best-model-for-coding-2026` | Week 2 · SEO Blog 36 — best AI models 2026 |
| 8 | 2026-08-06 | `prompt-engineering-best-practices-teams-2026` | Week 2 · SEO Blog 31 — prompt engineering 2026 |
| 9 | 2026-08-07 | `token-cost-optimization-guide` | Week 2 · SEO Blog 20 — reduce OpenAI bill |
| 10 | 2026-08-08 | `from-chatgpt-history-to-workspace` | From ChatGPT History to a Real Prompt Workspace |
| 11 | 2026-08-09 | `domain-based-prompt-organization` | Domain-Based Prompt Organization: Marketing, Coding, Study |
| 12 | 2026-08-10 | `building-personal-prompt-library` | Building a Personal Prompt Library That Actually Scales |
| 13 | 2026-08-11 | `prompt-version-control-timeline-2026` | Prompt Version Control: Why Your AI Workflow Needs a Timeline in 2026 |
| 14 | 2026-08-12 | `why-prompt-notebooks-fail` | Why Prompt Notebooks Fail (And What to Use Instead) |
| 15 | 2026-08-13 | `best-ai-workspace-tools-2026` | Best AI Workspace Tools for Developers (2026 Guide) |
| 16 | 2026-08-14 | `prompt-timeline-best-practices` | Prompt Timeline Best Practices for Long-Running Projects |
| 17 | 2026-08-15 | `cheap-mode-routing-flash-vs-frontier` | Cheap Mode Routing: When to Use Flash vs Frontier Models |
| 18 | 2026-08-16 | `ai-workspace-for-developers` | AI Workspace for Developers: PR Reviews, Docs, and Debug |
| 19 | 2026-08-17 | `best-model-for-marketing-copy` | Best Model for Marketing Copy: Compare Before You Commit |
| 20 | 2026-08-18 | `how-to-multi-model-comparison` | How to Run Your First Multi-Model Comparison |
| 21 | 2026-08-19 | `prompt-diffing-track-changes` | Prompt Diffing: Track Every Change Across Model Runs |
| 22 | 2026-08-20 | `ai-spend-analytics-project-key-model` | AI Spend Analytics: Track Cost by Project, Key, and Model |
| 23 | 2026-08-21 | `ai-cost-control-hard-budget-limits` | AI Cost Control: How to Set Hard Budget Limits for LLMs |
| 24 | 2026-08-22 | `setting-up-hard-budgets` | Setting Up Hard Budgets Before Your First Prompt |
| 25 | 2026-08-23 | `startup-founder-ai-cost-playbook` | Startup Founder Playbook: Control AI Costs Early |
| 26 | 2026-08-24 | `connecting-byok-providers` | Connecting BYOK Providers to One Workspace |
| 27 | 2026-08-25 | `openai-compatible-api-gateway` | OpenAI-Compatible API Gateway for Multi-Provider Apps |
| 28 | 2026-08-26 | `langsmith-alternatives-prompt-tooling` | LangSmith Alternatives for Prompt Tooling in 2026 |
| 29 | 2026-08-27 | `managing-multiple-llm-api-keys` | Managing Multiple LLM API Keys Without Chaos |
| 30 | 2026-08-28 | `secure-ai-key-management` | Secure AI Key Management for Developers and Teams |
| 31 | 2026-08-29 | `prompt-management-vs-observability` | Prompt Management vs Observability Platforms: What's Different |
| 32 | 2026-08-30 | `sharing-prompt-versions-team` | Sharing Prompt Versions with Your Team |
| 33 | 2026-08-31 | `get-started-layerflow-10-minutes` | How to Get Started with LayerFlow in 10 Minutes |
| 34 | 2026-09-01 | `ai-prompt-workflows-marketing-teams` | AI Prompt Workflows for Marketing Teams |
| 35 | 2026-09-02 | `student-guide-study-prompts` | Student Guide: Organize Study Prompts Without Overspend |
| 36 | 2026-09-03 | `agency-workflow-client-domains` | Agency Workflow: Client Domains and Isolated Budgets |
| 37 | 2026-09-04 | `building-apps-ai-gateway-sdk` | Building Production Apps with an AI Gateway SDK |
| 38 | 2026-09-05 | `teams-collaborate-ai-prompts` | How Teams Collaborate on AI Prompts Without Slack Chaos |
| 39 | 2026-09-06 | `complete-guide-ai-workspace-cost-control` | The Complete Guide to AI Workspace Cost Control in 2026 |

## Changing the schedule

1. Edit `publishOrder` in `content/blog/publish-schedule.ts`
2. Optionally tweak title/meta/keywords on the rematched post in `content/blog/posts.ts`
3. Do **not** mass-rewrite article bodies unless intentionally expanding a priority post

## Verify

```bash
npx tsx -e "
import { getPublishedPosts, getPublishedPostBySlug } from ./lib/blog;
const today = new Date(2026-07-29T08:00:00+05:30);
const tomorrow = new Date(2026-07-30T08:00:00+05:30);
console.log(getPublishedPosts(today).map(p => p.slug));
console.log(!!getPublishedPostBySlug(model-routing-latency-cost-quality, today)); // false
console.log(!!getPublishedPostBySlug(model-routing-latency-cost-quality, tomorrow)); // true
"
```
