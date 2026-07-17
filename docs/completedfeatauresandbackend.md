# LayerFlow — Completed Features & Backend Handoff

> **Purpose:** Founder learning + handoff doc. Use this when you need to know **what the frontend MVP already shows** vs **what the backend must build next**.  
> **When to use:** You finished the UI prototype and are about to start `apps/api` (or equivalent). Read this once, then keep [backend.md](backend.md) and [features.md](features.md) open while coding.  
> **Last updated:** July 2026

---

## 1. Title & purpose

This file bridges the **Next.js workspace UI** (built, mock data) and the **Hono API + Postgres backend** (not built yet).

| Question | Answer here |
|----------|-------------|
| What can I demo today? | Section 2 — every route and component, with mock vs real status |
| How does the UI behave without an API? | Section 3 — mock flows (save → version, sessions, compare, etc.) |
| What is still fake? | Section 4 |
| Where do I start backend work? | Sections 5–7 — stack, tables, endpoints, 2-week plan |

**Rule of thumb:** If a screen reads from `lib/mock-data.ts` or `lib/prompt-analysis.ts`, it is **UI complete / not connected to API**.

---

## 2. What we built (completed — frontend only)

All workspace routes live under `app/(app)/`. Data comes from `lib/mock-data.ts` and client-side helpers. No `fetch()` to a real API yet.

### Module 1 — AI Workspace (core)

| Surface | Route | Key components | Status |
|---------|-------|----------------|--------|
| **Dashboard / Home** | `/workspace` | `PageHeader`, `DashboardCard`, `DomainCard`, `PromptList`, `SessionList`, `BudgetMeter`, `CostOptimizerBanner` | **UI complete · mock data · not connected to API** |
| **Domains grid** | `/workspace` (section) | `DomainCard` | **UI complete · mock data** — 9 domains in mock |
| **Projects list** | `/projects` | `PageHeader`, project cards from mock | **UI complete · mock data** |
| **Project detail** | `/projects/[projectId]` | folders list, `PromptList` | **UI complete · mock data** — "New folder/prompt" buttons are non-persistent |
| **Prompt library** | `/prompts` | `PromptList`, `FilterPills`, search input | **UI complete · mock data** — search/filters are visual only |
| **Prompt editor + Timeline** | `/prompts/[promptId]` | `PromptEditor`, `Timeline`, `PromptAnalysis` | **UI complete · mock save/versioning in React state · not connected to API** |
| **Prompt Sessions list** | `/sessions` | `SessionList` | **UI complete · mock data** |
| **Session detail (chain view)** | `/sessions/[sessionId]` | ordered prompts + latest outputs | **UI complete · mock data** — "Continue session" is non-functional |
| **Compare** | `/compare` | `ComparePanel` | **UI complete · mock results** — run button simulates delay only |

**Module 1 gaps (UI exists, behavior is mock):**

- Rollback / Replay / Export on Timeline → toast or local state only
- "New prompt", "New session", "New folder" → no persistence
- AI Memory / semantic search → not built
- Attachments on prompts → types exist, no UI flow

### Module 2 — AI Cost Manager

| Surface | Route | Key components | Status |
|---------|-------|----------------|--------|
| **Budget dashboard** | `/budget` | `BudgetClient`, `BudgetMeter`, `CostOptimizerBanner` | **UI complete · mock data · not connected to API** |
| **Per-project / per-key budgets** | `/budget` | progress bars from `projectBudgets`, `keyBudgets` | **UI complete · mock data** |
| **Spend by model, per-prompt spend** | `/budget` | static + mock lists | **UI complete · mock data** |
| **Token & cost estimator** | `/budget` | form with static `~$0.0024` | **UI complete · mock** — no live calculation wired to backend |
| **Blocked state preview** | `/budget` | `blockedBudget` demo | **UI complete · mock** — no server-side enforcement |
| **Cost Optimizer page** | `/optimizer` | `CostOptimizerBanner`, suggestions list, `ExecutionModeToggle` | **UI complete · mock data** |
| **Sidebar budget meter** | all app pages | `BudgetMeter` in `AppSidebar` | **UI complete · mock data** |

**Module 2 gaps:** Hard budget block on Run/Gateway, weekly email digest, 80% alert emails, real usage rollups.

### Module 3 — AI Model Intelligence

| Surface | Route | Key components | Status |
|---------|-------|----------------|--------|
| **Prompt analysis panel** | `/prompts/[promptId]` (in editor) | `PromptAnalysis`, `lib/prompt-analysis.ts` | **UI complete · rule-based mock** — regex/heuristics, not ML |
| **Execution modes** | `/settings`, `/optimizer` | `ExecutionModeToggle` | **UI complete · local state only** — Manual / Suggest / Auto-* |
| **Routing rules** | `/settings`, `/budget`, `/optimizer` | `RoutingRules` | **UI complete · mock data** — toggle in React state only |
| **Prefer cheap mode** | `/settings`, `/budget` | toggle switches | **UI complete · local state only** |
| **Optimizer suggestions** | `/optimizer` | hardcoded suggestion cards | **UI complete · mock data** |

**Module 3 gaps:** Server-side recommendation API, routing rule CRUD, Auto Mode actually selecting models on run, "Applied rule: …" on real runs.

### Module 4 — AI Gateway

| Surface | Route | Key components | Status |
|---------|-------|----------------|--------|
| **Gateway page** | `/gateway` | connection info, TS/Python/cURL snippets | **UI complete · mock config** — `gatewayConfig` from mock-data |
| **API keys list** | `/settings` | read-only list from `apiKeys` mock | **UI complete · mock data** — Create key button non-functional |
| **BYOK provider keys** | — | not on a dedicated screen yet | **Not built** — only mentioned in marketing copy |
| **Request logs** | — | — | **Not built** |

### Marketing (landing & acquisition)

| Surface | Route | Key pieces | Status |
|---------|-------|------------|--------|
| **Home / landing** | `/` | `Hero`, `PlatformFeatures`, `Journey`, etc. in `components/marketing/` | **UI complete · static content** from `lib/marketing-content.ts` |
| **Pricing** | `/pricing` | pricing tiers from marketing content | **UI complete · static** |
| **About** | `/about` | about copy | **UI complete · static** |
| **Features mega-menu** | Navbar on marketing pages | `Navbar.tsx` + `featureMenu` | **UI complete · links to workspace anchors and routes** |
| **Light / dark theme** | all pages | `ThemeToggle`, `lf-theme` in `localStorage`, `globals.css` | **UI complete · client-only** — no server preference sync |

CTA target: `site.workspaceHref` → `/workspace` (no auth gate).

### Settings (cross-cutting)

| Surface | Route | Status |
|---------|-------|--------|
| Profile, execution defaults, routing rules, API keys, budget defaults | `/settings` (`SettingsClient`) | **UI complete · mock / local state · not connected to API** |

---

## 3. How it works today (frontend mock flows)

These are the **demo loops** you can click through locally (`npm run dev` → `http://localhost:3000/workspace`). Nothing survives a full page reload unless it was already in `mock-data.ts`.

### Save prompt → auto version

1. Open `/prompts/[promptId]` (e.g. `prompt_sidebar`).
2. Edit title or body in `PromptEditor`.
3. Click **Save new version**.
4. Client creates a new `PromptVersion` in React state (`handleSave` in `PromptEditor.tsx`) with mock output text and estimates from `analyzePrompt()`.
5. `Timeline` updates via `onVersionCreated` — shows vN with model, cost, tokens.
6. **Not persisted** — refresh loses unsaved mock edits unless they were in seed data.

### Session conversation chain

1. Go to `/sessions` → pick e.g. **Resume Builder**.
2. `/sessions/session_resume_builder` shows prompts 1 → 2 → 3 in order with latest version output per step.
3. Each step links to full prompt detail.
4. **Continue session** does not call an API or append runs.

### Model analysis panel

1. On prompt detail, typing in the editor triggers `analyzePrompt(content, model)` (`lib/prompt-analysis.ts`).
2. Panel shows estimated tokens, cost, task type, **Cheapest good-enough** vs **Best Quality**, and **Why** bullets.
3. **Use recommended** switches the model `<select>` only — no run.
4. Logic is keyword/heuristic (e.g. `/code|react|api/` → coding task).

### Budget / optimizer callouts

1. `CostOptimizerBanner` on `/workspace`, `/budget`, `/optimizer` shows: *"You spent $42; could have been $11 with Auto Mode"* (hardcoded props).
2. `/budget` shows monthly/daily meters, per-project/key caps, blocked preview via `blockedBudget`.
3. Sidebar `BudgetMeter` always reads static `budget` from mock-data.
4. Toggles (prefer cheap, routing rules) update React state only.

### Compare

1. `/compare` loads pre-baked `compareResults` from `lib/compare-results.ts`.
2. Edit prompt text, click **Compare all models** → 1.5s loading animation, same static results.
3. Badges: **Best**, **Cheapest**, **Fastest** computed client-side from mock metrics.

---

## 4. What is NOT built yet

### Out of MVP product scope (do not build now)

See [features.md § Out of MVP](features.md#3-out-of-mvp): Prompt Score, AI Notebook, Marketplace, Browser Extension, Team Library, Enterprise Dashboard, SOC2/HIPAA, RBAC/SSO, OpenTelemetry, security guardrails, etc.

### MVP features still missing (frontend and/or backend)

| Area | Missing |
|------|---------|
| **Backend** | No `apps/api/`, no Postgres, no Redis, no workers |
| **Auth** | No sign-up/login, no sessions, no workspace tenancy |
| **Real LLM calls** | Run, Replay, Compare, Session continue — all mock |
| **Persistence** | CRUD for domains/projects/folders/prompts/sessions/versions |
| **Hard budget enforcement** | No 402/block on API or Run |
| **Real cache** | Dashboard "cache saved" is demo copy only |
| **Email** | Weekly digest, 80% budget alerts |
| **BYOK UI** | Provider key add/revoke/encrypt |
| **Gateway** | No `/v1/chat/completions`, no real `lf_live_` keys |
| **SDK packages** | `@layerflow/sdk` snippets are illustrative only |
| **AI Memory / search** | Search box on `/prompts` does not query |
| **Module 5 Learning** | Phase 2 — not started |

---

## 5. Backend — what you need to start (NEXT STEP)

> **Note:** [backend.md](backend.md) is the planned deep-dive API doc (referenced across the repo). If it is not on disk yet, **this section + [codebase-structure.md Part C](codebase-structure.md#part-c--backend-folder-structure-planned--recommended)** are your starting blueprint.

### Recommended stack (one paragraph)

Use a **Hono** API on **Node 22**, deployed to **Fly.io** (or similar), with **Postgres on Neon** via **Drizzle ORM**, **Redis on Upstash** for atomic budget counters and optional response cache keys, **Better Auth** for email/session auth, and **BullMQ** workers for compare fan-out and async run persistence. Provider calls go through adapter modules (OpenAI, Anthropic, Google, DeepSeek, Groq). Encrypt BYOK provider keys at rest (AES-GCM with a KEK from env). The Next.js app stays UI-only and talks to the API with cookie sessions or bearer tokens.

### Repo / folder to create

Recommended monorepo layout (from [codebase-structure.md](codebase-structure.md)):

```
LayerFlow/
├── app/                    # existing Next.js UI (keep)
├── lib/                    # replace mock-data usage with api client
└── apps/
    └── api/                # CREATE THIS — Hono service
        ├── src/index.ts
        ├── src/routes/
        ├── src/gateway/
        ├── src/services/
        ├── src/db/schema/
        ├── src/providers/
        ├── src/redis/
        └── src/workers/
```

Alternative: standalone `layerflow-api` repo — same structure inside it.

### Database tables / entities (map to `lib/types.ts`)

| Frontend type (`lib/types.ts`) | Backend table / entity | Notes |
|-------------------------------|--------------------------|-------|
| `User` | `users` | Better Auth owns core fields |
| — | `workspaces` | One per user at MVP; `workspaceId` on all rows |
| `Domain` / `DomainId` | `domains` | Seed 9 default domains on workspace create |
| `Project` | `projects` | FK `domainId`, `workspaceId` |
| `Folder` | `folders` | FK `projectId` |
| `Prompt` | `prompts` | FK project/folder/domain; tags as JSON array |
| `PromptVersion` | `prompt_versions` | Auto-insert on content change; immutable snapshot |
| `PromptSession` | `sessions` + `session_prompts` | Ordered join table for prompt chain |
| `CompareResult` | `compare_jobs`, `compare_results` | Job queue + per-model rows |
| — | `runs` | Every LLM call: promptId, versionId, model, tokens, cost, blocked, cacheHit |
| `Budget` | `budgets` | monthly/daily limits, hardBlock, alertThreshold |
| `ProjectBudget`, `KeyBudget` | `budget_scopes` | scope = project \| api_key |
| `UsageRollup` | `usage_rollups` | Aggregates for dashboard (see features.md) |
| `SavingsInsight` | `savings_insights` | actual vs optimized spend per period |
| `WorkspaceSettings`, `ExecutionMode` | `workspace_settings` | preferCheap, executionMode, defaultModel |
| `RoutingRule` | `routing_rules` | condition JSON + target model + enabled |
| `PromptAnalysis` | computed | No table at MVP — return from `/api/intelligence/analyze` |
| `ApiKey` | `api_keys` | Store hash only; prefix `lf_live_` |
| — | `provider_keys` | Encrypted BYOK; provider enum |
| `GatewayConfig` | derived | baseUrl from env + user's active key |
| `GatewayLog` | `gateway_logs` | requestId, latency, status |
| `ActivityItem`, `DashboardStats` | computed | From `runs` + recent CRUD events |

### API endpoints to build first (priority order)

Aligned with MVP modules and what the UI needs first:

| Priority | Endpoint group | Powers |
|----------|----------------|--------|
| **P0** | `GET /health`, Better Auth `/api/auth/*` | Skeleton + login |
| **P1** | `GET/PATCH /api/workspaces/me` | Tenancy |
| **P1** | `CRUD /api/domains`, `/api/projects`, `/api/folders` | Module 1 hierarchy |
| **P1** | `CRUD /api/prompts`, `GET/POST /api/prompts/:id/versions` | Library + Timeline auto-version |
| **P1** | `CRUD /api/sessions`, `POST /api/sessions/:id/prompts` | Session chains |
| **P2** | `POST /api/runs`, `GET /api/runs` | Run button, timeline costs, dashboard feeds |
| **P2** | `POST /api/compare`, `GET /api/compare/:jobId` | Compare page |
| **P2** | `POST /api/intelligence/analyze` | Replace `lib/prompt-analysis.ts` for server truth |
| **P2** | `GET/PUT /api/routing-rules`, `GET/PUT /api/workspace/settings` | Settings + optimizer |
| **P3** | `GET/PUT /api/budgets/current`, `GET /api/usage`, `GET /api/savings` | Budget page, sidebar meter |
| **P3** | Budget pre-check middleware | Block before provider call |
| **P4** | `CRUD /api/keys`, `CRUD /api/provider-keys` | Settings + gateway |
| **P4** | `POST /v1/chat/completions`, `GET /v1/models` | Gateway Module 4 |
| **P5** | Email webhooks / digest worker | Weekly digest, 80% alerts |

### Gateway + BYOK requirements

1. **BYOK:** User stores provider keys encrypted; gateway never logs raw keys.
2. **LayerFlow keys:** Issue `lf_live_*` scoped to workspace/project; store bcrypt hash.
3. **OpenAI-compatible shape:** Same request/response as OpenAI chat completions.
4. **Pre-flight:** Redis atomic increment budget counters → if over limit, return **402** with clear message (UI already shows blocked state).
5. **Routing:** Model prefix → provider adapter → user's BYOK key.
6. **Logging:** Persist `GatewayLog` + `Run` for dashboard and per-prompt spend.
7. **Optional Auto Mode:** If key/workspace configured for auto, call intelligence service before provider.

### Budget enforcement (Redis atomic counters)

```
Keys (example):
  budget:{workspaceId}:monthly:{YYYY-MM}  → spent micro-dollars
  budget:{workspaceId}:daily:{YYYY-MM-DD}
  budget:{projectId}:monthly:{YYYY-MM}
  budget:{apiKeyId}:monthly:{YYYY-MM}
```

- **INCRBY** estimated cost before provider call; **DECRBY** on failure.
- Hard block: reject if `spent + estimate > limit` and `hardBlock = true`.
- Sync rollups to Postgres async (worker) for analytics UI.

### Model intelligence (start rule-based, then smarter)

**Phase 1 (ship with backend):** Port `lib/prompt-analysis.ts` logic to server — token estimate (chars/4), keyword category, static pricing table, template **why** strings.

**Phase 2:** Store `PromptPerformance` from compare wins + user overrides; improve recommendations.

**Phase 3:** Optional LLM classifier for category — only if rule-based insufficient.

### Auth (Better Auth)

- Email + password or magic link for MVP.
- Session cookie for Next.js → API same-site requests.
- Map session → `userId` → `workspaceId` on every `/api/*` route.
- No SSO/RBAC until enterprise phase.

### Environment variables / secrets

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Neon Postgres |
| `REDIS_URL` | Upstash |
| `BETTER_AUTH_SECRET` | Auth signing |
| `BETTER_AUTH_URL` | Public API URL |
| `ENCRYPTION_KEK` | BYOK key encryption |
| `OPENAI_API_KEY` | Optional platform fallback (prefer BYOK) |
| `CORS_ORIGIN` | `http://localhost:3000`, production web URL |
| `GATEWAY_BASE_URL` | e.g. `https://api.layerflow.dev/v1` |
| `RESEND_API_KEY` or similar | Email digest (later) |

### What frontend files to replace (mock → API client)

| Today | Replace with |
|-------|--------------|
| `lib/mock-data.ts` imports in pages | `lib/api-client.ts` (create) with typed fetch helpers |
| `getPrompt`, `getProject`, … helpers | `GET /api/prompts/:id`, etc. |
| `PromptEditor` client-only version save | `POST /api/prompts/:id/versions` |
| `lib/prompt-analysis.ts` in browser | `POST /api/intelligence/analyze` (keep client fallback optional) |
| `compareResults` static import | `POST /api/compare` + poll |
| `budget`, `dashboardStats`, … | `GET /api/budgets/current`, `GET /api/usage/summary` |
| `SettingsClient` local state | `GET/PUT /api/workspace/settings`, `/api/routing-rules` |
| `demoUser` | Better Auth session user |
| Run / Replay buttons | `POST /api/runs` |

Keep `lib/types.ts` as shared contract — consider publishing as `@layerflow/types` later.

### Suggested backend phases B0–B4

| Phase | Week-style order | Ship | Frontend unblocked |
|-------|------------------|------|-------------------|
| **B0 — Skeleton** | Week 1, days 1–2 | Hono app, Drizzle, Neon migrate, Better Auth, `/health`, CORS | Login shell (future) |
| **B1 — Workspace API** | Week 1, days 3–7 | Domains, projects, folders, prompts CRUD, sessions | Lists and detail pages load real data |
| **B2 — Versions + Runs + Compare** | Week 2 | Auto version on save, runs table, compare job worker | Prompt editor, Timeline, Compare, Run button |
| **B3 — Budgets + Intelligence** | Week 3 | Redis counters, hard block, usage API, analyze + routing rules | Budget meter live, analysis panel server-backed |
| **B4 — Gateway + Keys** | Week 4 | Provider keys, `lf_live_` keys, `/v1/chat/completions`, basic logs | Gateway page, SDK points at real URL |

---

## 6. Frontend → Backend mapping table

| Frontend route / component | Backend API needed | Priority |
|----------------------------|-------------------|----------|
| `/workspace` dashboard stats | `GET /api/usage/summary`, `GET /api/activity` | P2 |
| `/workspace` domains grid | `GET /api/domains` | P1 |
| `/projects`, `/projects/[id]` | `GET/POST/PATCH/DELETE /api/projects`, folders | P1 |
| `/prompts`, `/prompts/[id]` | `GET/POST/PATCH /api/prompts`, versions, tags | P1 |
| `PromptEditor` Save | `POST /api/prompts/:id/versions` | P1 |
| `PromptEditor` Run | `POST /api/runs` (+ budget pre-check) | P2 |
| `Timeline` rollback/duplicate | `POST /api/prompts/:id/versions`, `POST /api/prompts/:id/restore/:version` | P2 |
| `/sessions`, `/sessions/[id]` | `CRUD /api/sessions`, ordered prompts | P1 |
| `/compare` `ComparePanel` | `POST /api/compare`, `GET /api/compare/:jobId` | P2 |
| `PromptAnalysis` panel | `POST /api/intelligence/analyze` | P2 |
| `/budget` `BudgetClient` | `GET/PUT /api/budgets/current`, scopes, `GET /api/usage` | P3 |
| `BudgetMeter` (sidebar) | `GET /api/budgets/current` (poll or SSE later) | P3 |
| `CostOptimizerBanner` | `GET /api/savings/current` | P3 |
| `/optimizer` suggestions | `GET /api/savings/flagged-prompts` | P3 |
| `/settings` execution + rules | `GET/PUT /api/workspace/settings`, `/api/routing-rules` | P2 |
| `/settings` API keys | `CRUD /api/keys` | P4 |
| `/gateway` snippets | `GET /api/gateway/config`, real base URL | P4 |
| `/gateway` BYOK (future UI) | `CRUD /api/provider-keys` | P4 |
| External SDK / curl | `POST /v1/chat/completions` | P4 |
| Marketing → `/workspace` | Auth optional at first; protect API not pages | P0 |

---

## 7. First 2 weeks backend plan (concrete tasks)

Solo founder schedule — adjust pace as needed.

### Week 1 — B0 + B1 (workspace data is real)

| Day | Tasks |
|-----|--------|
| **Mon** | Create `apps/api`; init Hono + TypeScript; env validation; Neon project + Drizzle; first migration (`users`, `workspaces` via Better Auth); deploy hello world to Fly.io; `GET /health`. |
| **Tue** | Better Auth: sign-up, sign-in, session middleware; CORS for localhost:3000; prove cookie session from curl/Postman. |
| **Wed** | Schema: `domains`, `projects`, `folders`, `prompts`; seed domains on workspace create; implement `GET/POST /api/domains`, `GET/POST /api/projects`. |
| **Thu** | `CRUD /api/folders`, `CRUD /api/prompts` (list filters: domain, project, tag, favorite); wire one Next page (`/prompts`) to API behind env flag. |
| **Fri** | `GET/POST /api/sessions`, session ↔ prompt ordering; migrate `/projects` and `/sessions` to API client; seed script matching current mock demo data. |

**Week 1 done when:** You can create a project and prompt in the UI (or Postman) and see it after refresh.

### Week 2 — B2 (runs, versions, compare)

| Day | Tasks |
|-----|--------|
| **Mon** | `prompt_versions` table; `POST /api/prompts/:id/versions` on save; auto-increment version; hook `PromptEditor` to API. |
| **Tue** | `runs` table; OpenAI adapter + BYOK stub; `POST /api/runs` for single prompt run; store cost/tokens/output on version. |
| **Wed** | Budget schema (no enforcement yet); attach run cost to usage rollups in Postgres. |
| **Thu** | Compare: `compare_jobs` + BullMQ worker; fan-out to 2–4 providers; `POST/GET /api/compare/:jobId`; wire `/compare` page. |
| **Fri** | `POST /api/intelligence/analyze` (port rule-based logic); dashboard `GET /api/usage/summary` for `/workspace`; fix bugs; write minimal README in `apps/api`. |

**Week 2 done when:** Save creates DB versions, Run calls a real model (your BYOK), Compare returns live multi-model results.

**Defer to Week 3+:** Redis hard block (B3), gateway `/v1/*` (B4), email digest.

---

## 8. Links to other docs

| Doc | Use for |
|-----|---------|
| [features.md](features.md) | MVP scope, module flows, success criteria, route map |
| [backend.md](backend.md) | Full API design, gateway spec, domain model detail |
| [codebase-structure.md](codebase-structure.md) | Folder map, where to edit UI, planned `apps/api` tree |
| [product-strategy.md](product-strategy.md) | Positioning, GTM, build order, monetization |

---

**Bottom line:** The frontend MVP **shows the full product story** — workspace, cost, intelligence, gateway — on **mock data**. Your next job is **`apps/api`**: auth + Postgres CRUD first, then real runs and compare, then Redis budgets and the OpenAI-compatible gateway. Swap `lib/mock-data.ts` for an API client one route group at a time using Section 6 as the checklist.
