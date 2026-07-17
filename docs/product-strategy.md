# LayerFlow — Product Strategy

## Vision
LayerFlow is **The AI Workspace for Everyone** — an **AI Operating System** / **AI Workspace** — not an AI Infrastructure Platform, and not "another gateway."

The heart of the product is the **AI Workspace** (Module 1). Gateway, SDK, and OpenAI-compatible API are one feature surface (Module 4) for developers who build and deploy — not the homepage and not the whole product.

Landing direction: *"The AI Workspace for Everything You Do With AI"* — save prompts, compare models, control costs, organize AI projects, never lose your best AI work, and connect every LLM in one place.

## Core Insight
People store prompts in Notion, Google Docs, Notes, Obsidian, GitHub Gists, WhatsApp, Telegram. That's terrible. Nobody manages prompts well. The problem isn't gateway infrastructure — it's workflow organization + cost control.

## Journey
```
Workspace → Prompt Management → AI Memory → Model Intelligence → Cost Intelligence → Compare → Gateway → Deploy
```

## Product Direction

### Five modules (MVP = 1–4)

| # | Module | Role |
|---|--------|------|
| 1 | **AI Workspace** | Core — prompts, domains, projects, Timeline, Sessions, Compare, Memory |
| 2 | **AI Cost Manager** | Primary differentiator — hard budgets, analytics, savings insight |
| 3 | **AI Model Intelligence** | Recommendations with WHY; Manual / Suggest / Auto modes |
| 4 | **AI Gateway** | BYOK, OpenAI-compatible API, SDK — enable apps, not homepage |
| 5 | AI Learning | Phase 2 — Academy, Challenges, Certifications (not MVP) |

Full module specs, flows, and data models: see [features.md](features.md).

### What LayerFlow IS
- AI Workspace for prompts, models, projects, sessions, and spend
- Domains (Marketing, Coding, Study, Business, Research, Resume, Clients, School, Personal)
- Prompt Timeline (auto version on edit; rollback, replay, compare, export)
- Prompt Sessions (ChatGPT-like conversation groups)
- Multi-model Compare (best / cheapest / fastest)
- AI Cost Manager with **Hard Budget UI** (block when exceeded) + savings insight
- AI Model Intelligence (recommendations always explain WHY)
- SDK + OpenAI-compatible API (important — keep, don't over-center)

### What LayerFlow IS NOT
- Not "AI Infrastructure Platform"
- Not another LangSmith / Portkey / LiteLLM
- Not gateway-first (gateway is step 7 in the flow)
- No SOC2, HIPAA, Enterprise Audit, SSO, RBAC until companies ask

## Target Users

### Day one (MVP)
- **Developers** building AI apps
- **AI power users** who live in prompts, models, and tools

### Later
- Students / learners
- Marketers, recruiters, writers, designers, researchers
- Agencies and small teams

## Key Differentiators
1. **AI Cost Manager** — hard budgets + "spent $42, could have been $11 with Auto Mode"
2. **Prompt Timeline + Sessions** — Git-like versions + conversation groups; never lose what worked
3. **AI Model Intelligence** — cheapest / fastest / best with explanation, not black-box routing
4. **Compare** — same prompt across GPT / Claude / Gemini / DeepSeek
5. **Workspace domains** — organize by how people actually work

## Out of MVP
Prompt Score, AI Notebook, Collections Marketplace, Browser Extension, Team Library, Enterprise Dashboard, SOC2, HIPAA, Audit, RBAC, SSO, OpenTelemetry, Prompt Injection, PII, Security Guardrails, Enterprise Evaluation. Full list: [features.md § Out of MVP](features.md#3-out-of-mvp).

## Guiding principle — build order
```
Workspace first → Cost → Model Intelligence → Gateway → Enterprise much later
```

## MVP (4 weeks)
| Week | Ship | Module |
|------|------|--------|
| 1 | Workspace, Projects, Prompts, Folders, Sessions shell | 1 |
| 2 | Timeline, Compare, Memory, Search | 1 |
| 3 | Budget, Cost analytics, Model Intelligence, Token/Cost estimator | 2 + 3 |
| 4 | Gateway, SDK, API keys, BYOK | 4 |

Detail, success criteria, and route map: see [features.md](features.md).

## Monetization
- Free tier: generous personal usage
- Pro: unlimited personal use, budget limits, Auto Mode
- Team: multi-key, team dashboard (Phase 3)
- Enterprise: custom — only when companies ask

## Resources
- [Features Spec](features.md) — **source of truth** (MVP modules, flows, out-of-scope list)
- [Completed Features & Backend Handoff](completedfeatauresandbackend.md) — what's done in the UI vs what backend to build next
- [Backend Plan](backend.md) — stack, domain model, API, gateway
- [Codebase Structure](codebase-structure.md) — folder map for learning the repo
- [Competitive Analysis](competitive-analysis.md)
- [Original Strategy](layerflow.md) (reference only — older "infrastructure" framing)

---

*Strategy aligned with founder positioning. July 2026.*
