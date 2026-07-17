# LayerFlow — MVP Feature Spec

> **Source of truth** for product scope, positioning, and module design.  
> Last updated: July 2026  
> **Supersedes:** the previous "Complete Feature Catalog" in this file — that mega-catalog is archived intent only. Build from **this MVP focus**, not the old full bible.

---

## 1. Vision, positioning & validation

### What LayerFlow IS

| Phrase | Use |
|--------|-----|
| **The AI Workspace for Everyone** | Brand / long-form |
| **AI Operating System** | Vision / category |
| **AI Workspace** | Short product name |

**Heart of the product = AI Workspace** — not a gateway.

Gateway, SDK, and OpenAI-compatible API are **one feature surface** (Module 4), not the homepage and not the whole product.

### What LayerFlow is NOT

- Not an "AI Infrastructure Platform"
- Not another LangSmith / Portkey / LiteLLM clone
- Not gateway-first (gateway is step 7 in the user flow, not step 1)
- Not enterprise-first (SOC2, HIPAA, Audit, SSO, RBAC) until companies ask

### Homepage copy

| Element | Copy |
|---------|------|
| **Headline** | The AI Workspace for Everything You Do With AI |
| **Subtitle bullets** | Save prompts · Compare models · Control costs · Organize AI projects · Never lose your best AI work · Connect every LLM in one place |

### User flow (product order)

```
Workspace → Prompt Management → AI Memory → Model Intelligence → Cost Intelligence → Compare → Gateway → Deploy
```

Same person, same workspace: organize prompts → get model advice → compare outputs → enforce hard budgets → later build via gateway/SDK.

### Why this MVP is correct (vs building everything)

| If we build everything | If we ship this MVP |
|------------------------|---------------------|
| Compete head-on with LangSmith, Portkey, enterprise eval suites | Win on **workspace + cost control** for individuals and power users |
| Months before a coherent story | Four modules with a clear narrative in weeks |
| Gateway-first attracts infra buyers we can't serve yet | Workspace-first attracts anyone who writes prompts today |
| Enterprise compliance before product-market fit | Hard budgets + model intelligence as wedge; enterprise when asked |
| Feature sprawl (Score, Notebook, Marketplace, Extension) | Focused loop: save → organize → compare → spend less |

**Validation signals:** People store prompts in Notion, Docs, Notes, Obsidian, Gists, WhatsApp — nobody manages prompts well. The pain is **workflow organization + cost control**, not missing another proxy API. Market is real and competitive; we do not beat LangSmith on eval/observability. We win on simple prompt management and **never surprise me with a bill**.

### Who we serve

| When | Audience | Why |
|------|----------|-----|
| **Day one (MVP)** | Developers and AI power users | Already live in prompts, APIs, multiple models |
| **Next** | Students, marketers, writers, agencies | Same workspace; lighter surfaces |
| **Later** | Teams / enterprise | Only when they ask |

---

## 2. Five modules (MVP = Modules 1–4)

### Module 1 — AI Workspace (core)

The heart of LayerFlow. Everything else plugs into this.

#### Features

| Area | Capabilities |
|------|--------------|
| **Organization** | Prompt Workspace, Domains, Projects, Folders, CRUD |
| **Versioning** | Timeline (auto version on every edit) |
| **Memory & discovery** | AI Memory, Search, Favorites, Tags, Templates, Variables |
| **Experimentation** | Compare, History, Output Comparison |
| **Conversation** | **Prompt Sessions** (ChatGPT-like conversation groups), Prompt Replay |
| **Dashboard** | Today's Prompts, Projects, Recent Activity, Sessions, Budget, Cost, Model Usage, Prompt Count, Saved Money, Cache Saved, Most Used Model, Recent Outputs |

**Example session:** Resume Builder → Prompt 1 (outline) → Prompt 2 (bullets) → Prompt 3 (final polish) — grouped as one session, not three orphaned prompts.

#### How it works — user flow

**Create & organize**

1. User lands in **Workspace** dashboard — sees today's activity, budget snapshot, recent outputs.
2. User picks a **Domain** (Marketing, Coding, Study, Business, Research, Resume, Clients, School, Personal) or creates one.
3. Under a domain, user creates a **Project** (e.g. "Q3 Campaign", "Resume 2026").
4. Under a project, user creates **Folders** (optional nesting) and **Prompts**.
5. User writes prompt body with **Variables** (`{{topic}}`, `{{tone}}`) and optional **Templates** as starting points.
6. User adds **Tags**, marks **Favorite**, attaches **Notes** and **Attachments**.

**Edit & version (Timeline)**

1. User edits prompt text and saves.
2. System **auto-creates a new Timeline version** (v1 → v2 → v3 → v4…) — no manual "commit" required.
3. Each version stores: **Prompt snapshot, Output, Model, Cost, Tokens, Runtime, Date**.
4. User can **Rollback** to any version, **Duplicate** as new prompt, **Replay** (re-run with same params), **Compare** two versions side-by-side, or **Export** (JSON / Markdown).

**Sessions & replay**

1. User starts a **Prompt Session** — a named conversation group (like a ChatGPT thread).
2. User runs Prompt 1, then Prompt 2 building on output, then Prompt 3 — all linked under the session.
3. User can **Resume** the session later or **Replay** the full chain to reproduce results.

**Compare & memory**

1. User selects a prompt → **Compare** → same prompt sent to 2–4 models.
2. Results show badges: **Best**, **Cheapest**, **Fastest** plus output diff.
3. Outputs land in **AI Memory** — searchable, favoritable, tied to prompt and session.
4. **AI Search** finds prompts by title, tag, domain, or content snippet.

#### Data model notes

**Prompt** (every prompt stores):

| Field | Notes |
|-------|-------|
| Title, Description | Display + search |
| Domain, Project, Folder | Hierarchy FKs |
| Body + Variables | Template slots resolved at run time |
| Version History | Timeline entries (see below) |
| Output History | Per-run outputs linked to versions |
| Cost, Tokens, Model | Aggregates + per-run detail |
| Created / Updated dates | Audit |
| Tags, Favorite | Discovery |
| Attachments, Notes | User context |

**Timeline version** (v1 → v4):

| Field | Notes |
|-------|-------|
| Prompt snapshot | Immutable body at save time |
| Output | Model response text |
| Model | Provider + model id |
| Cost, Tokens | In/out token counts + $ |
| Runtime | Latency ms |
| Date | Timestamp |

**Prompt Session**:

| Field | Notes |
|-------|-------|
| Title, Domain, Project | Grouping |
| Ordered prompt refs | Prompt 1 → 2 → 3 chain |
| Session outputs | Combined thread view |
| Created / Updated | Resume support |

**Dashboard aggregates** (computed):

Today's prompt count, active projects, recent activity feed, open sessions, budget remaining, total cost MTD, model usage breakdown, prompt library count, $ saved (cache + model optimizer), most-used model, recent outputs list.

---

### Module 2 — AI Cost Manager (primary differentiator)

Hard budgets and spend intelligence — the feature competitors under-ship.

#### Features

| Feature | Benefit |
|---------|---------|
| **Hard budgets** | Daily, monthly, per-project, per-API-key — block when exceeded |
| **Cost dashboard** | Spend by project, key, model, prompt |
| **Spend analytics** | Trends, breakdowns, drill-down |
| **Weekly email digest** | Awareness without opening app |
| **Cost estimator** | "What if I switch to model X?" |
| **Token estimator** | Input tokens + estimated $ before run |
| **Model recommendation** | Cheapest good-enough after prompt write |
| **Prefer Cheap mode** | Bias simple tasks to budget-tier models |
| **Per-prompt spend** | Every Timeline version carries cost |
| **Potential monthly savings** | "You spent $42; could have been $11 with Auto Mode" |
| **AI Cost Optimizer** | Surfaces actionable savings across library |

#### How it works — user flow

**Set budgets**

1. User opens **Budget** settings.
2. Sets **monthly hard limit** (e.g. $50), optional **daily cap**, optional **per-project** and **per-key** limits.
3. UI shows progress bar, remaining $, projected burn rate.
4. When limit hit → **block all paid runs** (workspace + gateway) until user raises limit or period resets.

**Before run**

1. User writes or opens a prompt.
2. **Token estimator** shows ~input tokens + estimated cost for selected model.
3. Cheaper alternatives shown inline (ties to Module 3).

**After run**

1. Cost recorded on Timeline version and rolled into project/key/monthly totals.
2. **Per-prompt spend history** visible on prompt detail and cost dashboard.
3. **AI Cost Optimizer** scans recent runs: flags prompts that used frontier models where budget tier would suffice.

**Savings insight**

1. Dashboard shows **Potential monthly savings**: actual spend vs simulated Auto Mode (Cheapest/Balanced).
2. Example copy: *"You spent $42 this month. With Auto Mode (Balanced), estimated $11."*
3. User can one-click enable Auto Mode for flagged prompts (Module 3).

**Alerts & digest**

1. Email/push at ~80% of budget.
2. **Weekly email**: top spenders, model mix, savings opportunity, budget remaining.

#### Data model notes

| Entity | Fields |
|--------|--------|
| **Budget** | workspaceId, period (daily/monthly), amount, scope (workspace/project/key), hardBlock boolean |
| **UsageRollup** | period, scope, spent, tokensIn, tokensOut, byModel breakdown |
| **Run** | promptId, versionId, model, tokens, cost, blocked (bool), cacheHit |
| **SavingsInsight** | period, actualSpend, optimizedSpend, mode, flaggedPromptIds |

Redis (or equivalent) holds real-time counters for hard-block enforcement before provider calls.

---

### Module 3 — AI Model Intelligence

Recommend the right model with **explanation** — never a black-box pick.

#### Features

| Feature | Benefit |
|---------|---------|
| **Category detection** | Classify prompt on write (coding, drafting, classify, reasoning, chat…) |
| **Complexity estimate** | Rough tier: simple / medium / hard |
| **Token & cost estimate** | Before run |
| **Recommendations** | Best, Cheapest, Fastest — each with **WHY** |
| **Routing modes** | Manual, Suggest (confirm), Auto |
| **Auto sub-modes** | Cheapest, Fastest, Best Quality, Balanced |
| **Routing rules** | User-defined: Coding → Claude; Budget under $5 → DeepSeek |

#### How it works — user flow

**On prompt write**

1. User types prompt body (debounced).
2. System detects **Category** (e.g. Coding) and **Complexity** (e.g. Medium).
3. System estimates **Tokens** and **Cost** for current model and alternatives.
4. **Popup / side panel** shows recommendations:

   | Option | Why |
   |--------|-----|
   | **Cheapest** | "Simple classify task — Flash-tier is enough; 12× cheaper than Sonnet." |
   | **Fastest** | "Groq Llama — ~200ms; quality OK for drafts." |
   | **Best Quality** | "Multi-step refactor — Sonnet scored higher on similar prompts." |
   | **Balanced** | "Everyday coding — Sonnet; your last 5 coding prompts used it successfully." |

5. Every recommendation includes **WHY** — never show a model name alone.

**Modes**

| Mode | Behavior |
|------|----------|
| **Manual** | User picks model; intelligence is advisory only |
| **Suggest** | Pre-selects recommended model; user confirms before run |
| **Auto** | Runs on recommended model per sub-mode (Cheapest / Fastest / Best Quality / Balanced) |

**Routing rules**

1. User defines rules in Settings: `IF category = Coding THEN prefer claude-sonnet`, `IF budget remaining < $5 THEN deepseek-chat`.
2. Rules evaluated after category detection; override default Auto logic.
3. Rule hit shown in UI: *"Applied rule: Coding → Claude."*

**Integration with Compare & Cost**

1. Compare uses intelligence to pre-select 2–4 sensible models (not random frontier stack).
2. Cost Manager's "could have been $11" uses Auto Mode simulation from this module.

#### Data model notes

| Entity | Fields |
|--------|--------|
| **ModelRecommendation** | promptHash, category, complexity, options[{model, why, estCost, estTokens, score}] |
| **RoutingRule** | workspaceId, condition (category/budget/complexity), action (modelId or tier) |
| **UserModelPrefs** | defaultMode (manual/suggest/auto), autoSubMode, preferCheap boolean |
| **PromptPerformance** | category, modelId, avgQualitySignal (from compare wins, user picks) — feeds "similar prompts performed well" |

---

### Module 4 — AI Gateway

Enable apps to build and deploy — **not** the homepage.

#### Features

| Feature | Benefit |
|---------|---------|
| **BYOK** | User's keys, user's provider billing |
| **OpenAI-compatible API** | Drop-in for existing OpenAI SDK clients |
| **TypeScript / Python SDK** | First-class client libraries |
| **API key management** | LayerFlow keys (`lf_live_…`) scoped to project/budget |
| **Multi-provider routing** | One endpoint → OpenAI, Anthropic, Gemini, DeepSeek, Groq, … |
| **Basic logging** | Request/response log — enough to debug, not full OTel |
| **Retries & failovers** | Provider down → retry or alternate |
| **Rate limiting** | Soft caps to avoid 429s |

#### How it works — user flow

**Setup**

1. User opens **Gateway** page (sidebar — not landing hero).
2. Adds **provider keys** (BYOK) — encrypted at rest.
3. Creates **LayerFlow API key** tied to a project and budget scope.
4. Copies **SDK snippet** or OpenAI base URL override.

**Call from app**

1. Developer's app sends `POST /v1/chat/completions` with `Bearer lf_live_…`.
2. Gateway resolves model prefix → provider adapter → user's BYOK key.
3. **Budget pre-check** (Module 2) — if over limit, return 402/block.
4. **Model intelligence** (Module 3) applies if key configured for Auto mode.
5. Request logged; run persisted to Timeline/run history if linked to a prompt.
6. Response returned in OpenAI shape.

**Observability (basic)**

1. Gateway page shows recent requests: model, tokens, cost, latency, status.
2. No OpenTelemetry, no distributed traces — MVP logging only.

#### Data model notes

| Entity | Fields |
|--------|--------|
| **ProviderKey** | workspaceId, provider, encryptedKey, label, revokedAt |
| **ApiKey** | workspaceId, projectId, prefix, hash, budgetScope, rateLimit |
| **GatewayLog** | apiKeyId, model, tokens, cost, latencyMs, status, requestId |

---

### Module 5 — AI Learning (Phase 2 — NOT MVP)

Document for roadmap; **do not build in MVP**.

| Feature | Description |
|---------|-------------|
| Prompt Academy | Structured lessons on prompt craft |
| Challenges | Gamified prompt exercises |
| Daily Prompt | Habit / inspiration feed |
| Tips & Guides | In-context learning |
| Learning Paths | Curated progressions |
| Certifications | Completion credentials |
| Community reviews | Peer feedback on prompts |

---

### Phase 3 — Community (future only)

**Do not build now.** Listed for direction only.

| Feature | Notes |
|---------|-------|
| Marketplace | Buy/sell prompt packs |
| Collections Marketplace | Curated downloadable packs |
| Teams | Shared workspace |
| Social | Follow, share, public profiles |
| Team Workspace | Shared library, team budgets |

---

## 3. Out of MVP

Explicitly removed from the MVP milestone. May return post-PMF; not in current build plan.

| Feature | Reason deferred |
|---------|-----------------|
| Prompt Score | Learning/gamification — Phase 2+ |
| AI Notebook | Overlap with Workspace + Memory |
| Collections Marketplace | Needs community scale |
| Browser Extension | Capture flow — growth, not core loop |
| Team Library | Teams = Phase 3 |
| Enterprise Dashboard | Enterprise = when companies ask |
| SOC2, HIPAA, Audit | Compliance when contracted |
| RBAC, SSO | Enterprise |
| OpenTelemetry | Overbuilt observability |
| Prompt Injection detection | Enterprise security suite |
| PII scanning | Enterprise security suite |
| Security Guardrails | Enterprise |
| Enterprise Evaluation / CI | LangSmith territory |

---

## 4. MVP success criteria

A user can complete this loop without workarounds:

| # | Criterion | Module |
|---|-----------|--------|
| 1 | Save and organize prompts in Domains → Projects → Folders | 1 |
| 2 | See auto-versioned Timeline with rollback, duplicate, replay, compare, export | 1 |
| 3 | Group prompts in Sessions and resume later | 1 |
| 4 | Search, tag, favorite, and find prompts via AI Memory | 1 |
| 5 | Compare same prompt across 2–4 models with Best/Cheapest/Fastest badges | 1 |
| 6 | Get model recommendations with explanation on prompt write | 3 |
| 7 | Use Auto Mode (Cheapest / Fastest / Best Quality / Balanced) | 3 |
| 8 | Set hard budget (monthly + per-project) and get blocked when exceeded | 2 |
| 9 | See token estimate and cost estimate before run | 2 |
| 10 | View per-prompt spend and "could have saved $X with Auto Mode" | 2 |
| 11 | Call models via OpenAI-compatible API with BYOK and LayerFlow key | 4 |
| 12 | Use TS or Python SDK against gateway | 4 |

**Retention signals:** WAU returning to Timeline; users who set a budget; users who accept a cheaper model suggestion; compare runs per week.

---

## 5. Guiding principle — build order

```
Workspace first → Cost → Model Intelligence → Gateway → Enterprise much later
```

| Priority | Module | Rationale |
|----------|--------|-----------|
| 1 | AI Workspace | Without save/organize/history, nothing else matters |
| 2 | AI Cost Manager | Primary differentiator; wedge vs LangSmith/gateway tools |
| 3 | AI Model Intelligence | Makes cost actionable before and during every run |
| 4 | AI Gateway | Enable deploy — after users trust the workspace |
| 5 | AI Learning | Phase 2 — retention/education |
| — | Community / Enterprise | Phase 3+ — when users ask |

Gateway is **one feature**, not the homepage. Landing sells the workspace; gateway is for builders who are ready to deploy.

---

## 6. UI principles (brief)

Design references: **Linear**, **Notion**, **Cursor**, **Raycast**, **Vercel**, **Arc**.

| Principle | Application |
|-----------|-------------|
| **Minimal chrome** | Content first; sidebar + top bar, no clutter |
| **Fast navigation** | Keyboard-friendly; search everywhere |
| **Calm density** | Information-rich but not enterprise-dashboard heavy |
| **Obvious hierarchy** | Domain → Project → Folder → Prompt path always visible |
| **Cost visible** | Budget meter persistent; per-run cost never hidden |
| **Explain recommendations** | Model picks always show "why" inline |
| **Light default** | Light theme default; dark available (`lf-theme`) |

---

## 7. Appendix — Frontend routes → modules

Suggested route map for the frontend agent. Routes may not all exist yet; this is the target.

| Route | Module | Purpose |
|-------|--------|---------|
| `/` | Marketing | Homepage — workspace positioning, not gateway |
| `/workspace` | 1 | Dashboard: today's prompts, activity, budget snapshot, sessions |
| `/projects` | 1 | Project list across domains |
| `/projects/[projectId]` | 1 | Project detail: folders, prompts, spend |
| `/prompts` | 1 | Prompt library with search, tags, filters |
| `/prompts/[promptId]` | 1 + 2 + 3 | Editor, Timeline, variables, model panel, cost estimate |
| `/sessions` | 1 | Prompt Sessions list |
| `/sessions/[sessionId]` | 1 | Session thread: ordered prompts + outputs |
| `/compare` | 1 + 3 | Multi-model compare |
| `/budget` | 2 | Hard budgets, analytics, savings insight, weekly digest settings |
| `/models` or `/intelligence` | 3 | Routing rules, Auto Mode defaults, model prefs |
| `/gateway` | 4 | BYOK, API keys, SDK snippets, request logs |
| `/settings` | All | Profile, keys, theme, notifications |

**Sidebar order (recommended):** Overview → Projects → Prompts → Sessions → Compare → Budget → Gateway → Settings

**Not in MVP routes:** `/marketplace`, `/academy`, `/teams`, `/enterprise`, `/notebook`, `/collections`

---

## 8. Summary

| Decision | Choice |
|----------|--------|
| Product | **AI Workspace for Everyone** |
| Heart | **Module 1 — AI Workspace** |
| Killer | **Module 2 — AI Cost Manager** (hard budgets + savings insight) |
| Intelligence | **Module 3 — Model recommendations with WHY** |
| Gateway | **Module 4 — one feature**, not homepage |
| Learning | **Module 5 — Phase 2** |
| Community | **Phase 3 — future** |
| This file | **MVP source of truth** — supersedes previous mega-catalog |

**Bottom line:** LayerFlow is the workspace for everything you do with AI. Save and organize prompts with Git-like Timeline and Sessions; get model recommendations you can trust; enforce hard budgets with clear savings insight; compare models; then connect your apps via gateway/SDK when you're ready to deploy.
