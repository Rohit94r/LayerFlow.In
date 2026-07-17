# LayerFlow — Features Spec & Product Direction

> Source: founder feedback + `layerflow.md`, `product-strategy.md`, `user-research.md`, `old-projectinfo.md`  
> Last updated: July 2026  
> **This file is the single source of truth** for positioning, features, and MVP scope.

---

## 1. Positioning & vision

### What LayerFlow IS

| Phrase | Use |
|--------|-----|
| **The AI Workspace for Everyone** | Brand / long-form |
| **AI Operating System** | Vision / category |
| **AI Workspace** | Short product name |

**Heart of the product = Prompt Workspace** — not a gateway.

Gateway, SDK, and OpenAI-compatible API are **one feature surface**, not the whole product.

### What LayerFlow is NOT

- Not an “AI Infrastructure Platform”
- Not another LangSmith / Portkey / LiteLLM clone
- Not enterprise-first (SOC2, HIPAA, Audit, SSO, RBAC) until companies ask

### Landing copy direction

| Element | Copy |
|---------|------|
| **Headline** | The Workspace for Everything You Do With AI |
| **Subtitle** | Save prompts, compare models, control costs, organize AI projects, and connect every LLM in one place. |

### User journey

```
Student → Prompt → Experiment → Compare → Save → Share → Build → Deploy
```

Same workspace serves the full loop: learn and organize prompts → compare models → control spend → later build and deploy via gateway/SDK.

### Core insight (validated)

People store prompts in Notion, Docs, Notes, ChatGPT history, Gists, WhatsApp. Nobody manages prompts well. The problem isn’t gateway infrastructure — it’s **workflow organization + cost control**.

### Strongest differentiator

**Hard budget limits** (monthly progress bar, remaining $, auto-block when exceeded) — few competitors productize this simply. Pair with a simple prompt workspace (timeline, compare, domains).

---

## 2. Validation / who first vs who later

### Verdict: **VALID — continue, with a clear day-one wedge**

| Question | Answer |
|----------|--------|
| Is the market real? | **Yes.** Cost shocks, prompt chaos, and model-switching pain are widespread. Acquisitions (Portkey → Palo Alto, Helicone → Mintlify) prove buyers exist. |
| Can you beat LangSmith / Portkey / LiteLLM head-on? | **No.** Don’t try. They win on ecosystem, open source, and enterprise. |
| Is there an underserved gap? | **Yes.** Solo builders and AI power users need a simple prompt + cost workspace — not an enterprise control plane. |
| Who first (day one)? | **Developers and AI power users** — people who already live in prompts, APIs, and tools. Product can serve everyone later; don’t market vaguely “to everyone” on day one. |
| Who later? | Students, marketers, agencies, teams — after retention on the power-user wedge. |
| Strongest differentiator? | **Hard budgets** + **Prompt Workspace** (timeline, compare, domains) — not “another observability stack.” |

### What is validated vs not yet

| Claim | Status | Notes |
|-------|--------|-------|
| Surprise AI bills are a real pain | Validated | Common on Reddit/X; budget limits rarely productized simply |
| Prompts are scattered (Notion, Docs, ChatGPT history) | Validated | Strong research signal |
| Hard budgets convert free → paid | Strong hypothesis | Treat as #1 metric to prove in MVP |
| Power users will adopt workspace before marketplace | Strong hypothesis | Ship core retention before growth loops |
| Prompt marketplace / agencies | Later | Validate after core retention |
| Full gateway + OTel + evals + enterprise at launch | Overbuild | Defer; ship Prompt Workspace + budgets first |

### Risk to avoid

Building a mini-LangSmith while calling yourself a workspace.  
**Fix:** Prompt Workspace is the product. Gateway/SDK is how developers connect apps — same cost + prompt backend.

---

## 3. Previous features (keep / simplify / defer)

Status: **KEEP** · **SIMPLIFY** · **DEFER** · **DROP (MVP)**

### 3.1 Keep for MVP (or soon after)

| Feature | Status | Who benefits | Benefit |
|---------|--------|--------------|---------|
| **Prompt Workspace** (library, projects, folders) | KEEP — **core** | Developers, power users | One place for everything you do with AI |
| **Hard Budget Limits + UI** | KEEP (**killer**) | All | Cap spend; block when exceeded — peace of mind |
| **Real-time Cost Analytics** | KEEP | All | See spend by project / key / model before invoice shock |
| **Budget & Error Alerts** | KEEP | All | Warn at ~80%; catch spikes early |
| **BYOK (Bring Your Own Key)** | KEEP | All | User keeps provider billing; LayerFlow is control, not markup |
| **AI Gateway (OpenAI-compatible API)** | KEEP — **one feature** | Developers | One integration → many providers |
| **TypeScript / Python SDK** | KEEP | Developers | Drop-in for OpenAI-style apps — do not remove |
| **API Key Management** | KEEP | Developers | Separate keys = separate projects, costs, limits |
| **Multi-provider routing** | SIMPLIFY | Developers, power users | Switch GPT / Claude / Gemini / DeepSeek without relearning each SDK |
| **Basic Request Logging / Traces** | SIMPLIFY | Developers | Enough history to debug “what did I send?” — not full OTel |
| **Exact-match Caching** | KEEP (behind flag) | Developers | Free repeat calls; visible “$ saved” |
| **Dashboard (basic)** | KEEP (simple) | All | Costs, keys, budgets, recent activity — 3–5 screens max |

### 3.2 Simplify / expand later

| Feature | Status | Benefit | MVP approach |
|---------|--------|---------|--------------|
| **Smart Model Router** | SIMPLIFY | Cheaper/faster when quality allows | Manual model pick + simple “prefer cheap” |
| **Rate Limiting** | SIMPLIFY | Avoid provider 429s while testing | Soft daily request caps per key |
| **Semantic Caching** | DEFER | Bigger savings on similar prompts | After exact-match proves value |
| **Retries / Fallovers** | DEFER | Reliability when a provider fails | Phase 2 |

### 3.3 Explicitly not building now (enterprise / overbuild)

| Feature | Status | Why |
|---------|--------|-----|
| **SOC2 / HIPAA** | DEFER | Until companies ask |
| **Enterprise Audit logs** | DEFER | Until companies ask |
| **SSO / RBAC / self-host** | DEFER | Until companies ask |
| **Security & Validation** (injection, PII, jailbreak) | DROP (MVP) | Enterprise complexity |
| **AI Evaluation / CI regression** | DROP (MVP) | Heavy for solo/power users |
| **Full OpenTelemetry stack** | DEFER | Overkill for personal cost control |
| **Over-engineered dashboard** | DROP | Keep screens few and useful |

---

## 4. New / expanded features (Prompt Workspace)

Include all previous KEEP items above. These are the workspace features to add or expand.

### 4.1 P0 — ship in MVP window

| Feature | Priority | Audience | Benefit |
|---------|----------|----------|---------|
| **Workspace with domains** | P0 | Developers, power users | Organize by Marketing, Coding, Study, Business, Research, Resume, Clients, School, Personal — not one flat dump |
| **Projects, Prompts, Folders** | P0 | All day-one users | Structure work the way people already think about it |
| **Prompt Timeline** (Git-like versions) | P0 | Developers, power users | v1 → v2 → v3 with model, cost, output, date per version — never lose what worked |
| **Compare** | P0 | Developers, power users | Same prompt → GPT / Claude / Gemini / DeepSeek → pick best / cheapest / fastest |
| **Hard Budget UI** | P0 | All | Monthly progress bar, remaining $, **block when exceeded** — strongest differentiator; emphasize in product and marketing |
| **SDK + OpenAI-compatible API** | P0 | Developers | Connect apps and deploy; important — keep, don’t let it become the whole story |

### 4.2 P1 — next after MVP core

| Feature | Priority | Audience | Benefit |
|---------|----------|----------|---------|
| **AI Collections** | P1 | Power users, later students/marketers | Curated packs (e.g. Web Dev: React/Node/Next; Marketing: SEO/IG/LinkedIn/Email/Ads) — start faster |
| **AI Memory** | P1 | All | Stores outputs, revisions, comments, favorites — Notion-like memory for AI work |
| **AI Search** | P1 | All | Find “that React prompt” instantly across the workspace |
| **Prompt Score** | P1/P2 | Learners, power users | AI rates clarity, variables, output, cost, speed + suggestions — improve prompts with feedback |
| Variables, templates, favorites/tags, share links, export/import | P1 | All | Reuse, share, and own your data |

### 4.3 P2 — growth & depth

| Feature | Priority | Audience | Benefit |
|---------|----------|----------|---------|
| **Browser Extension** | P2 | Power users | Capture ChatGPT → save to LayerFlow in one click |
| **AI Notebook** | P2 | Power users, learners | Everything-AI notes surface — prompts, results, thoughts in one place |
| **Collections Marketplace** | P2 | Growth loop | SEO / Resume / Coding packs with downloads + ratings — viral distribution after retention |
| Team library, agency features | P2+ | Teams | Shared source of truth when teams ask |

### 4.4 Feature → benefit (marketing one-liners)

| Feature | One-line benefit |
|---------|------------------|
| Hard Budget UI | “Never wake up to an AI bill you didn’t approve.” |
| Prompt Timeline | “Git for prompts — every version, cost, and output in one place.” |
| Compare | “Best, cheapest, or fastest — see it in one run.” |
| Workspace domains | “Marketing, coding, school, clients — each in its lane.” |
| AI Memory + Search | “Find the prompt that worked last month in seconds.” |
| BYOK + Gateway/SDK | “Your keys, every LLM, one workspace — and an API when you build.” |
| Collections / Marketplace | “Start from packs that already work.” |

---

## 5. MVP — 4-week plan

Enough for MVP. Do not expand scope until this ships and retains.

| Week | Focus | Ship |
|------|--------|------|
| **Week 1** | Foundation | Workspace, Projects, Prompts, Folders (domains as structure) |
| **Week 2** | Prompt craft | Prompt Versions / Timeline, Compare, History |
| **Week 3** | Cost safety | Budget, Costs, Charts, Alerts (**Hard Budget UI** front and center) |
| **Week 4** | Build path | Gateway, SDK, OpenAI-compatible API |

**MVP success criteria (qualitative):** A developer or AI power user can organize prompts by domain, version and compare them, stay under a hard budget, and call models via SDK/API when they build.

### Success metrics (re-validate after launch)

| Metric | Target (first 90 days) | Why |
|--------|------------------------|-----|
| Signups who create ≥1 prompt / run Compare | Track | Proves workspace engagement |
| Users who set a budget | >25% | Killer feature understood |
| Users blocked by budget ≥1 time | Track % | Pain → value moment |
| WAU returning to Prompt Timeline / library | Growing | Workspace retention |
| Free → Pro conversion | Track | Budgets + workspace drive pay |
| “Would be disappointed if gone” | >40% | PMF signal |

---

## 6. Explicitly NOT building now

Do not schedule these until companies ask or retention is proven:

- SOC2, HIPAA, Enterprise packages  
- Audit logs, SSO, RBAC, self-host  
- Prompt injection / PII / jailbreak suites  
- Full eval CI / regression platforms  
- Full OpenTelemetry / enterprise observability  
- Semantic cache, smart router depth, retries/failovers (beyond basics)  
- Collections Marketplace as a launch dependency (P2 growth loop only)  
- Vague “everyone” marketing before the power-user wedge sticks  

---

## 7. Landing copy direction

Use this when updating the site (docs only for now — **no landing code change in this pass**).

| Element | Direction |
|---------|-----------|
| **Category** | AI Workspace / AI Operating System — not “AI Infrastructure Platform” |
| **Headline** | The Workspace for Everything You Do With AI |
| **Subtitle** | Save prompts, compare models, control costs, organize AI projects, and connect every LLM in one place. |
| **Primary CTA audience** | Developers and AI power users |
| **Proof points** | Hard budgets · Prompt Timeline · Compare · Domains · BYOK + SDK |
| **Journey line** | Prompt → Experiment → Compare → Save → Share → Build → Deploy |

---

## 8. Next: Ready to start building (Week 1 checklist)

High-level only — start here when ready to build:

1. **Auth + empty workspace shell** — sign up / sign in, land in a workspace  
2. **Domains** — seed or let user pick: Marketing, Coding, Study, Business, Research, Resume, Clients, School, Personal  
3. **Projects** — create/rename/archive under a domain  
4. **Folders** — nest under projects  
5. **Prompts CRUD** — create, edit, list, open; attach to folder/project  
6. **Basic navigation** — workspace → domain → project → folder → prompt (clear hierarchy)  
7. **Data model locked** — versioning and Compare (Week 2) can hang off Prompt without schema thrash  

**Then:** Week 2 Timeline + Compare → Week 3 Hard Budget UI + costs → Week 4 Gateway + SDK + API.

---

## 9. Phased roadmap (after MVP)

| Phase | Timing | Focus |
|-------|--------|-------|
| **Phase 1 — Solo workspace** | 0–3 months | Weeks 1–4 above + free tier + weekly cost digest |
| **Phase 2 — Depth & share** | 3–6 months | AI Memory, Search, Collections, variables/templates, share links, exact-match cache |
| **Phase 3 — Growth & teams** | 6–12 months | Browser extension, Notebook, Marketplace, teams; enterprise only when asked |

---

## 10. Summary

| Decision | Choice |
|----------|--------|
| Product category | **AI Workspace / AI OS** — not infrastructure platform |
| Heart of product | **Prompt Workspace** |
| Gateway / SDK / API | **One feature** — keep for developers |
| Day-one users | **Developers and AI power users** |
| Strongest differentiator | **Hard Budget UI** + Timeline + Compare |
| MVP | **4 weeks** as planned — then stop and learn |
| Enterprise (SOC2, HIPAA, SSO, RBAC, Audit) | **Defer until companies ask** |

**Bottom line:** LayerFlow is the workspace for everything you do with AI. Ship Prompt Workspace + hard budgets first for developers and power users; keep gateway/SDK as the build/deploy door; defer enterprise until someone pays for it.
