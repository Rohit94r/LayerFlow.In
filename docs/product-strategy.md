# LayerFlow — Product Strategy

## Vision
LayerFlow is **The AI Workspace for Everyone** — an **AI Operating System** / **AI Workspace** — not an AI Infrastructure Platform, and not “another gateway.”

The heart of the product is the **Prompt Workspace**. Gateway, SDK, and OpenAI-compatible API are one feature surface for developers who build and deploy — not the whole product.

Landing direction: *“The Workspace for Everything You Do With AI”* — save prompts, compare models, control costs, organize AI projects, and connect every LLM in one place.

## Core Insight
People store prompts in Notion, Google Docs, Notes, Obsidian, GitHub Gists, WhatsApp, Telegram. That's terrible. Nobody manages prompts well. The problem isn't gateway infrastructure — it's workflow organization + cost control.

## Journey
Student → Prompt → Experiment → Compare → Save → Share → Build → Deploy

## Product Direction

### What LayerFlow IS
- AI Workspace / AI OS for prompts, models, projects, and spend
- Workspace with domains (Marketing, Coding, Study, Business, Research, Resume, Clients, School, Personal)
- Prompt Timeline (Git-like versions: model, cost, output, date)
- Multi-model Compare (best / cheapest / fastest)
- Cost analytics and **Hard Budget UI** (progress bar, remaining $, block when exceeded)
- SDK + OpenAI-compatible API (important — keep, don’t over-center)
- Later: AI Memory, Search, Collections, Notebook, Marketplace, browser extension

### What LayerFlow IS NOT
- Not “AI Infrastructure Platform”
- Not another LangSmith / Portkey / LiteLLM
- Not infrastructure-only (gateway is one feature)
- No SOC2, HIPAA, Enterprise Audit, SSO, RBAC until companies ask

## Target Users

### Day one (market here)
- **Developers** building AI apps
- **AI power users** who live in prompts, models, and tools

### Later (product can serve; don’t vague-market “everyone” on day one)
- Students / learners
- Marketers, recruiters, writers, designers, researchers
- Agencies and small teams

## Key Differentiators
1. **Hard Budget UI** — strongest differentiator; emphasize
2. **Prompt Timeline** — Git-like versions with cost/output per version
3. **Compare** — same prompt across GPT / Claude / Gemini / DeepSeek
4. **Workspace domains** — organize by how people work
5. Collections / Marketplace — growth loop after retention (not MVP)

## Features to KEEP
- Prompt Workspace (core)
- Cost Analytics + Hard Budget Limits (killer)
- BYOK + Gateway + SDK + OpenAI-compatible API (one feature set)
- Dashboard (simplified)

## Features to REMOVE / DEFER (MVP)
- Prompt Injection detection, PII scanning
- AI Evaluation / CI testing
- SOC2, HIPAA, Audit, SSO, RBAC, self-host
- Overbuilt observability / enterprise control plane

## MVP (4 weeks)
| Week | Ship |
|------|------|
| 1 | Workspace, Projects, Prompts, Folders |
| 2 | Prompt Versions/Timeline, Compare, History |
| 3 | Budget, Costs, Charts, Alerts |
| 4 | Gateway, SDK, API |

Detail and feature tables: see [features.md](features.md).

## Monetization
- Free tier: generous personal usage
- Pro: unlimited personal use, budget limits
- Team: multi-key, team dashboard
- Enterprise: custom — only when companies ask

## Resources
- [Features Spec](features.md) — **source of truth**
- [Backend Plan](backend.md) — stack, domain model, API, gateway
- [Competitive Analysis](competitive-analysis.md)
- [Original Strategy](layerflow.md) (reference only — older “infrastructure” framing)

---

*Strategy aligned with founder positioning. July 2026.*
