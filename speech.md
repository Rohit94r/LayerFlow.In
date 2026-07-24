# LayerFlow — The AI Workspace for Everything You Do With AI

> Your pitch. Say it in 30 seconds, or dive deep. Pick what fits the room.

---

## 30-Second Elevator Pitch

**LayerFlow is the workspace for everything you do with AI.**

You know how developers use GitHub for code and designers use Figma for design? LayerFlow is that, but for AI prompts. One place to save, organize, compare, and control costs — instead of your prompts scattered across Notion, Google Docs, ChatGPT history, and Slack DMs.

Stop losing your best prompts. Start building your AI workflow.

---

## The Problem We Solve

**Right now, here's where people store their AI prompts:**
- ChatGPT/Claude history (lost in chat threads)
- Notion documents (no versioning, no cost tracking)
- Google Docs (no model comparison)
- Apple Notes (no organization)
- Slack DMs (no search)
- WhatsApp groups (no reuse)

**The result:** You write the same prompts over and over. You don't know which model is cheaper or better. You have no idea what you're spending. And your best prompt work is buried.

---

## What LayerFlow Does (The 5-Minute Walkthrough)

### 1. AI Workspace — Your Prompt Command Center
- **Domains** like Marketing, Coding, Study, Research — organize the way you think
- **Projects & Folders** under each domain — structure your work
- **Prompt Editor** with variables (`{{topic}}`, `{{tone}}`), tags, favorites, notes
- **Timeline** — every edit saved as a version. Git for prompts. Roll back any time.
- **Search** — find any prompt by title, tag, domain, or content

### 2. Multi-Model Compare — Pick the Best Model Every Time
- Run one prompt across **GPT-4o, Claude Sonnet, Gemini, DeepSeek** side by side
- See **Best, Cheapest, Fastest** badges — ranked automatically
- Compare outputs, costs, and latency in one view
- Never wonder "which model is better for this task?" again

### 3. Hard Budget Control — Peace of Mind Before the Invoice
- Set **monthly and daily hard limits** — LayerFlow actually blocks spend, not just warns
- Per-project and per-API-key budgets — control your entire team
- Cost estimator before every run — know the price before you click
- Weekly email digest — top spenders, model mix, savings opportunities
- **AI Cost Optimizer** — shows you how much you'd save with Auto Mode

### 4. Model Intelligence — The Right Model, Every Time
- **Auto-detect** what your prompt is about (Category + Complexity)
- **Recommend** the best model with a clear WHY — "Claude Sonnet because coding task, high complexity"
- **Three modes:** Manual (you pick), Suggest (we recommend, you confirm), Auto (we route for you)
- **Custom routing rules** — "Coding tasks → Claude", "Budget under $5 → DeepSeek"

### 5. AI Gateway — One API, Every Model
- **OpenAI-compatible** endpoint (`/v1/chat/completions`) — drop-in replacement
- **BYOK** — bring your own keys from OpenAI, Anthropic, Google, DeepSeek, Groq, xAI, OpenRouter
- Keys are **AES-256 encrypted** at rest
- **Exact-match cache** — repeated requests are free and instant
- **Rate limiting and budget enforcement** built in
- SDKs for TypeScript and Python

### 6. Prompt Sessions — Chain Your Thinking
- Group related prompts into named sessions
- Build on previous outputs — Prompt 1 → Prompt 2 → Prompt 3
- Resume or replay full chains
- Like ChatGPT conversations, but organized and versioned

### 7. AI Memory & Search
- Save valuable outputs to AI Memory
- Semantic search across all your prompts and memories
- Find similar prompts — never duplicate work

---

## Who Is This For?

| Persona | Why They Love LayerFlow |
|---------|------------------------|
| **AI Power User** | Stop managing prompts in 5 different places. Version, compare, and optimize. |
| **Developer** | OpenAI-compatible gateway, SDK, BYOK — works with your existing stack. |
| **Student / Researcher** | Organize by subject, replay study sessions, budget your API spend. |
| **Marketer / Writer** | Template prompts by campaign, A/B test copy across models, track results. |
| **Agency / Freelancer** | Per-client domains, per-project budgets, billable usage tracking. |
| **Small Team** | Shared prompt library, team budget controls, routing rules everyone follows. |

---

## Why LayerFlow vs. The Alternatives

| Tool | What They Do | What They Miss |
|------|-------------|----------------|
| **LangSmith / Humanloop** | LLM observability for production apps | No prompt workspace, no cost control for individuals |
| **Portkey / OpenRouter** | API gateway + routing | No prompt organization, no versioning, no workspace |
| **LiteLLM** | Proxy with cost tracking | Infrastructure tool, not a user-facing workspace |
| **Notion / Docs / Notes** | Generic note-taking | No model comparison, no budgets, no timeline |
| **ChatGPT / Claude history** | Chat threads | No organization, no reuse, no cost visibility |

**LayerFlow** gives you all of it — workspace + compare + budgets + gateway — in one product.

---

## Our Philosophy

> "GitHub for code meets Vercel for deployment — purpose-built for prompt engineering."

- **Workspace first, not gateway first.** We're not another API proxy. We're where you do your AI work.
- **Hard budgets that actually block.** Not warnings. Not alerts. Actual enforcement.
- **Your keys, your billing.** BYOK means you control your provider relationships.
- **Built for individuals, scales to teams.** Free tier is generous. Pro unlocks everything.

---

## What's Shipping Now (MVP)

Workspace with 9 default domains, timeline versioning, multi-model compare, hard budget enforcement, AI cost optimizer, model intelligence with routing rules, OpenAI-compatible gateway with BYOK, prompt sessions, AI memory with semantic search, email alerts, and weekly digests.

---

## What's Coming

Learning paths and prompt academy, community marketplace, browser extension (save from ChatGPT/Claude), CLI tool, team workspaces, and enterprise features.

---

## One-Liners (Use These)

- "LayerFlow is GitHub for your AI prompts."
- "One workspace. Every model. Zero budget surprises."
- "Stop losing prompts in ChatGPT history. Start your AI workspace."
- "Compare GPT, Claude, Gemini, and DeepSeek side by side — pick best, cheapest, or fastest."
- "Hard budgets that actually block. Not warnings. Actual enforcement."
- "Your AI workflow, organized. Your costs, under control."

---

## The Demo Flow

1. **Sign in** → Google OAuth, instant workspace setup with 9 domains
2. **Create a prompt** → Write in Coding domain, add variables, save. Version 1 created.
3. **Edit it** → Add more context, save. Version 2. See it on the Timeline.
4. **Compare models** → Run v2 across GPT-4o, Claude Sonnet, Gemini Flash, DeepSeek. See Best/Cheapest/Fastest.
5. **Set a budget** → $50/month hard limit. See the progress bar. Try to exceed it — blocked.
6. **Get a gateway key** → Copy `lf_live_...` into any OpenAI-compatible app. Works instantly.
7. **Check the dashboard** → Today's prompts, monthly cost, most-used model, cache savings.

---

## Pricing (Conversational)

- **Free:** Full workspace, 100 prompts, 10 runs/day, one provider key, no gateway
- **Pro ($12/month):** Unlimited prompts, unlimited runs, all providers, gateway access, Auto Mode, extended history
- **Team (coming soon):** Shared workspace, team budgets, admin controls

---

*Built with Hono, Next.js, Postgres (Neon), Redis (Upstash), Drizzle ORM, and Better Auth. Deployed on Vercel + Fly.io.*
