# LayerFlow — Codebase Structure (Founder Learning Guide)

> **Purpose:** Explain how the LayerFlow repo is organized so you can navigate the code, know where to edit things, and see how today’s frontend connects to the planned backend.  
> **Audience:** Founder / non-full-time engineer learning the product codebase.  
> **Last updated:** July 2026

**Related docs:** [Features Spec](features.md) · [Backend Plan](backend.md) · [Product Strategy](product-strategy.md)

---

## Part A — How the product works (coding side, frontend today)

LayerFlow is a **Next.js 16** app — **The AI Workspace for Everyone**, not a gateway-first product. There is **no real backend in this repo yet** — the workspace UI runs on **mock data** in `lib/mock-data.ts`. The landing site and the in-app workspace share the same repo but use different layouts and components.

**Product modules (MVP):** Workspace (core) → Cost Manager → Model Intelligence → Gateway. See [features.md](features.md) for full spec and target routes.

### User flow (what the code does today)

```
Visitor lands on marketing site (/)
    → reads Hero, Features, Pricing, About
    → clicks "Open Workspace" or similar CTA
    → navigates to /workspace (and other /app routes)

Workspace app loads
    → (app) layout wraps page in sidebar + top bar
    → page imports data from lib/mock-data.ts
    → components render domains, prompts, budget, compare, gateway UI
    → no fetch() to an API — everything is static demo data
```

### Route groups: marketing vs workspace

Next.js **route groups** (folders in parentheses) do **not** appear in the URL. They split the app into two shells:

| Route group | URL examples | Layout | Purpose |
|-------------|--------------|--------|---------|
| `app/(marketing)/` | `/`, `/pricing`, `/about` | Navbar + Footer | Public landing & docs-style pages |
| `app/(app)/` | `/workspace`, `/prompts`, `/budget`, … | Sidebar + TopBar | Logged-in-style workspace UI (mock) |

Both groups inherit from the **root** `app/layout.tsx` (fonts, metadata, theme bootstrap).

### Data today (frontend-only)

| File | Role |
|------|------|
| `lib/types.ts` | TypeScript shapes for Domain, Project, Prompt, Budget, ApiKey, etc. — mirrors planned backend entities |
| `lib/mock-data.ts` | Demo user, domains, projects, prompts with versions, budget, compare results, gateway config |
| `lib/mock-data.ts` helpers | e.g. `getPrompt(id)`, `getProject(id)` — pages call these instead of an API |

When the backend ships (see [backend.md](backend.md)), pages will replace mock imports with `fetch('https://api…/api/...')` or a small client wrapper.

### Theme: light default, `lf-theme`, ThemeToggle

- **Default:** **light** mode. Root layout runs an inline script that reads `localStorage.getItem('lf-theme')` and adds class `light` on `<html>` unless the user chose `dark`.
- **Storage key:** `lf-theme` (`"light"` \| `"dark"`).
- **Toggle UI:** `components/marketing/ThemeToggle.tsx` — used on marketing Navbar and workspace AppTopBar.
- **Tokens:** `app/globals.css` — dark tokens on `:root`, light overrides on `html.light` (colors, shadows, glass effects). Tailwind 4 `@theme` block defines shared design tokens (`--color-brand`, `--color-bg`, etc.).

---

## Part B — Frontend folder map

### Repo tree (high level)

```
LayerFlow/
├── app/                    # Next.js App Router — routes, layouts, global CSS
├── components/
│   ├── marketing/          # Landing page sections
│   └── workspace/          # In-app UI (sidebar, prompts, budget, …)
├── lib/                    # Shared data, types, marketing copy, utilities
├── public/                 # Static assets served at /
├── docs/                   # Product & engineering docs (you are here)
├── images/                 # Legacy/duplicate image assets (prefer public/images/)
├── package.json            # Scripts: dev, build, start, lint
├── next.config.mjs
├── tsconfig.json
└── postcss.config.mjs
```

**Not in repo yet:** `apps/api/`, `backend/`, database, auth — see Part C.

---

### `app/` — routes and layouts

```
app/
├── layout.tsx              # Root: fonts, SEO metadata, theme script, JSON-LD
├── globals.css             # Design tokens, theme, utility classes
├── robots.ts               # SEO: allow all, point to sitemap
├── sitemap.ts              # Marketing URLs only (/, /pricing, /about)
├── (marketing)/
│   ├── layout.tsx          # Navbar + Footer wrapper
│   ├── page.tsx            # Home: Hero → FAQ sections
│   ├── pricing/page.tsx
│   └── about/page.tsx
└── (app)/
    ├── layout.tsx          # App shell: AppSidebar + AppTopBar + main
    ├── workspace/page.tsx  # Domain overview, recent prompts, budget
    ├── projects/
    │   ├── page.tsx        # Project list
    │   └── [projectId]/page.tsx
    ├── prompts/
    │   ├── page.tsx        # Prompt library
    │   └── [promptId]/page.tsx  # Editor + version Timeline
    ├── compare/page.tsx    # Multi-model compare
    ├── budget/page.tsx     # Hard budget UI + usage
    ├── gateway/page.tsx    # API keys, BYOK, SDK snippet
    └── settings/page.tsx   # User / workspace settings (mock)
```

**What lives here:** Every URL the user can visit. Each `page.tsx` is a route; `layout.tsx` files wrap children with chrome (nav, sidebar).

**Why it exists:** Next.js App Router convention — file system = routes. Route groups keep marketing and workspace layouts separate without URL prefixes like `/app/workspace`.

**Product connection:**

- **Landing:** `(marketing)/*` — acquisition, workspace positioning (not gateway-first). CTAs link into `/workspace`.
- **Workspace:** `(app)/*` — Module 1 heart (prompts, sessions, compare) + Module 2 (`/budget`) + Module 3 (model panel on prompt detail) + Module 4 (`/gateway`).

**Target routes not yet built:** `/sessions`, `/sessions/[sessionId]`, `/models` (routing rules). See [features.md appendix](features.md#7-appendix--frontend-routes--modules).

**Root files explained:**

| File | Purpose |
|------|---------|
| `layout.tsx` | Site-wide HTML shell, DM Sans / DM Mono fonts, OpenGraph, theme init |
| `globals.css` | All CSS variables and component primitives (`.btn-primary`, `.glass-pill`, `.app-shell`) |
| `robots.ts` | Generated `/robots.txt` |
| `sitemap.ts` | Generated `/sitemap.xml` — workspace routes intentionally omitted (app pages, not SEO) |

---

### `components/marketing/` — landing page building blocks

```
components/marketing/
├── Navbar.tsx              # Top nav, links, ThemeToggle, CTA to /workspace
├── Footer.tsx
├── Hero.tsx                # Headline, subtitle, primary CTA
├── LogosStrip.tsx          # Provider / company logos
├── Journey.tsx             # Prompt → Deploy journey line
├── PlatformFeatures.tsx    # Feature grid
├── WhyChoose.tsx
├── Foundation.tsx
├── Steps.tsx               # How it works steps
├── Faq.tsx
├── Blog.tsx                # Placeholder / teaser posts
├── CodeWindow.tsx          # Static code block UI
├── TypingCodeWindow.tsx    # Animated typing effect
├── Reveal.tsx              # Scroll reveal wrapper (Framer Motion)
├── Logo.tsx                # LayerFlow logo mark
└── ThemeToggle.tsx         # Light/dark switch (shared with workspace)
```

**What lives here:** Presentational React components for the public site. Most read copy from `lib/marketing-content.ts`.

**Why it exists:** Keeps `app/(marketing)/page.tsx` thin — one import per section. Marketing can evolve without touching workspace code.

**Product connection:** Landing only. Primary job: sell the AI Workspace (save, organize, compare, control costs) — gateway is one bullet, not the hero. Drive clicks to `/workspace`.

---

### `components/workspace/` — in-app UI

```
components/workspace/
├── AppSidebar.tsx          # Left nav: Overview, Projects, Prompts, Sessions*, Compare, Budget, Gateway
├── AppTopBar.tsx           # Top bar: search placeholder, ThemeToggle, user menu
├── PageHeader.tsx          # Reusable page title + description + actions
├── FilterPills.tsx         # Tag/filter chips on list pages
├── DomainCard.tsx          # Domain tile on workspace overview
├── PromptList.tsx          # Prompt rows / cards
├── PromptEditor.tsx        # Prompt body editor (mock save)
├── Timeline.tsx            # Git-like version history for a prompt
├── ComparePanel.tsx        # Side-by-side model outputs
├── BudgetMeter.tsx         # Monthly spend bar (used in sidebar + pages)
└── DomainCard.tsx
```

**What lives here:** Everything inside the `(app)` shell except the page-level layout logic.

**Why it exists:** Workspace pages compose these pieces and pass data from `mock-data.ts`. Shared sidebar ensures consistent navigation across all product screens.

**Product connection:** Implements MVP surfaces from [features.md](features.md): Module 1 (domains, projects, prompts, timeline, compare), Module 2 (BudgetMeter, budget page), Module 3 (model recommendations on prompt detail — planned), Module 4 (gateway/SDK panel). Sessions UI planned at `/sessions`.

---

### `lib/` — shared logic and content

```
lib/
├── marketing-content.ts    # Site copy: headlines, nav, FAQ, feature bullets, pricing tiers
├── content.ts              # Re-exports marketing-content (deprecated alias)
├── mock-data.ts            # All demo workspace data + getter helpers
├── types.ts                # Domain, Prompt, Budget, ApiKey, … interfaces
└── highlight-code.tsx      # Syntax-ish highlighting for marketing code windows
```

| File | What | Why | Connects to |
|------|------|-----|-------------|
| `marketing-content.ts` | Single source for landing strings and nav | Edit copy in one place | Marketing pages & Navbar |
| `mock-data.ts` | Fake DB | Ship UI before API exists | All `(app)` pages |
| `types.ts` | Shared TS types | Same shapes frontend/backend will use | mock-data, future API client |
| `highlight-code.tsx` | Tiny highlighter for Hero/SDK snippets | Visual polish on landing | CodeWindow, TypingCodeWindow |

---

### `public/` — static files

```
public/
├── favicon.svg
└── images/
    ├── openai.svg, anthropic.svg, google-gemini.svg, …  # Provider logos
    ├── companies/          # Social proof logos (Meta, Microsoft, …)
    └── ambassadors/        # Community / ambassador photos
```

**What lives here:** Files served at `/favicon.svg`, `/images/...`. Referenced in JSX as `/images/foo.svg`.

**Why it exists:** Next.js static asset folder. Images in marketing `LogosStrip`, gateway page, etc.

**Note:** Root-level `images/` duplicates some assets; **`public/images/` is what the running app uses.**

---

### `docs/` — product & engineering documentation

```
docs/
├── features.md             # Source of truth: MVP modules 1–4, flows, out-of-scope list
├── backend.md              # Planned API, DB, gateway (not built yet)
├── product-strategy.md     # GTM, pricing direction
├── layerflow.md            # Original strategy (reference)
├── competitive-analysis.md
├── user-research.md
├── codebase-structure.md   # This file
└── old-*.md                # Archived notes
```

**What lives here:** Markdown specs — not loaded by the app at runtime.

**Why it exists:** Align product, frontend, and future backend without digging through code.

---

### Config & tooling (repo root)

| File | Purpose |
|------|---------|
| `package.json` | `npm run dev` → Next dev server; deps: Next 16, React 19, Tailwind 4, Framer Motion, Lucide |
| `next.config.mjs` | Next.js configuration |
| `tsconfig.json` | TypeScript paths (`@/` → project root) |
| `postcss.config.mjs` | Tailwind 4 PostCSS pipeline |

---

## Part C — Backend folder structure (planned / recommended)

> **Important:** The backend described below is **not implemented in this repo yet**. It is the **target structure** from [backend.md](backend.md). When you start building, add it as a sibling service (recommended: `apps/api/` in a monorepo, or standalone `backend/` repo).

### Recommended layout

```
apps/
├── web/                          # (optional rename) current Next.js app — UI only
└── api/                          # Hono service on Node 22, deployed to Fly.io
    ├── package.json
    ├── Dockerfile
    ├── drizzle.config.ts
    ├── src/
    │   ├── index.ts              # Hono app entry, mount routes, CORS, error handler
    │   ├── config/               # Env validation (DATABASE_URL, REDIS_URL, KEK, …)
    │   ├── routes/
    │   │   ├── auth/             # Better Auth mount: sign-up, sign-in, session
    │   │   ├── workspaces/       # GET/PATCH current workspace
    │   │   ├── domains/          # CRUD — seeds Marketing, Coding, … on create
    │   │   ├── projects/         # CRUD under domain
    │   │   ├── folders/          # CRUD under project
    │   │   ├── prompts/          # CRUD + nested versions
    │   │   ├── compare/          # POST job, GET status/results
    │   │   ├── runs/             # Run history for timeline & gateway logs
    │   │   ├── budgets/          # GET/PUT monthly hard limit
    │   │   ├── usage/            # Summaries, 80% alerts
    │   │   ├── keys/             # LayerFlow API keys (lf_live_…)
    │   │   └── provider-keys/    # BYOK encrypt/store/list/revoke
    │   ├── gateway/              # OpenAI-compatible /v1/* (separate middleware chain)
    │   │   ├── chat-completions.ts
    │   │   ├── models.ts
    │   │   └── middleware/       # Bearer lf_ key, budget pre-check, rate limit
    │   ├── services/             # Business logic (keep routes thin)
    │   │   ├── workspace.service.ts
    │   │   ├── prompt.service.ts
    │   │   ├── compare.service.ts
    │   │   ├── budget.service.ts
    │   │   ├── usage.service.ts
    │   │   └── encryption.service.ts   # ProviderKey AES-GCM
    │   ├── providers/            # Adapters: OpenAI, Anthropic, Google, DeepSeek
    │   │   ├── openai.ts
    │   │   ├── anthropic.ts
    │   │   └── router.ts         # model prefix → provider + BYOK key
    │   ├── db/
    │   │   ├── schema/           # Drizzle tables: User, Workspace, Prompt, Run, …
    │   │   ├── migrations/
    │   │   └── client.ts         # Postgres (Neon) connection
    │   ├── redis/                # Upstash client: budget counters, cache, queue keys
    │   ├── workers/              # BullMQ consumers
    │   │   ├── compare.worker.ts # Fan-out compare to N providers
    │   │   └── persist.worker.ts # Async Run + Budget writes after gateway calls
    │   ├── auth/                 # Better Auth config, session → workspaceId
    │   └── lib/                  # Shared: pricing table, requestId, errors
    └── tests/
```

### How each area maps to product features

| Folder | Powers | Frontend will call |
|--------|--------|-------------------|
| `routes/auth/` | Sign up, login, session | Next.js login forms → `/api/auth/*`; cookie session |
| `routes/domains`, `projects`, `folders`, `prompts` | **Module 1** — workspace hierarchy | Replace `mock-data` imports with REST: `/api/domains`, `/api/prompts`, … |
| `routes/sessions/` (planned) | **Module 1** — Prompt Sessions | `GET/POST /api/sessions`, link prompts in order |
| `routes/prompts/…/versions` | **Module 1** — Prompt Timeline (auto on edit) | `POST /api/prompts/:id/versions` from PromptEditor |
| `routes/compare/` + `workers/compare` | **Module 1** — Compare | `POST /api/compare` → poll `GET /api/compare/:jobId` |
| `routes/runs/` | History, per-prompt spend, dashboard feeds | `GET /api/runs?promptId=` |
| `routes/budgets/`, `routes/usage/` | **Module 2** — Cost Manager | `GET /api/budgets/current`, savings insight, usage summaries |
| `routes/intelligence/` (planned) | **Module 3** — routing rules, Auto Mode prefs | `GET/PUT /api/routing-rules`, recommendations on prompt write |
| `routes/keys/`, `routes/provider-keys/` | **Module 4** — Gateway keys + BYOK | CRUD from gateway settings UI |
| `gateway/` | **Module 4** — OpenAI-compatible API | External: `POST /v1/chat/completions` with `Bearer lf_…` |
| `services/budget` + `redis/` | **Module 2** — hard budget block | Enforced server-side; UI reflects 402/block state |
| `providers/` | **Module 3 + 4** — multi-model routing | Compare worker, intelligence, gateway |
| `db/schema/` | Source of truth for all entities in [backend.md §4](backend.md#4-core-domain-model) | Drizzle migrations on deploy |

### Request paths (future)

```
Workspace CRUD:  Next.js ──cookie──► Hono /api/* ──► Postgres
Compare:         Next.js ──► enqueue job ──► Worker ──► providers (BYOK) ──► Postgres
Gateway:         User app ──Bearer lf_*──► /v1/chat/completions ──► Redis budget check ──► provider
```

### Phased build (mirrors frontend weeks)

| Phase | Ship | Replaces in frontend |
|-------|------|----------------------|
| B0 Skeleton | Hono + Neon + Drizzle + Better Auth + healthcheck | — |
| B1 Workspace API | Domains, projects, folders, prompts CRUD | `lib/mock-data.ts` for structure |
| B2 Versions + Compare | Timeline, compare jobs, runs | Prompt detail, compare page |
| B3 Budgets | Redis counters, hard block, usage | Budget page, BudgetMeter live data |
| B4 Gateway + keys | `/v1/chat/completions`, ApiKey, ProviderKey | Gateway page, real SDK endpoint |

---

## Part D — Quick “where do I edit X?” cheat sheet

| I want to change… | Edit this |
|-------------------|-----------|
| Landing headline / subtitle | `lib/marketing-content.ts` → `site.headline`, `site.subtitle` |
| Nav links (Features, Pricing, About) | `lib/marketing-content.ts` → `nav` |
| FAQ, feature bullets, pricing tiers | `lib/marketing-content.ts` |
| Home page section order | `app/(marketing)/page.tsx` |
| Pricing or About page content | `app/(marketing)/pricing/page.tsx`, `about/page.tsx` |
| Marketing hero layout / animation | `components/marketing/Hero.tsx` |
| “Open workspace” / CTA link target | `lib/marketing-content.ts` → `site.workspaceHref` |
| Workspace sidebar links & sections | `components/workspace/AppSidebar.tsx` → `navSections` |
| Top bar (search, user menu) | `components/workspace/AppTopBar.tsx` |
| Workspace overview (domains grid) | `app/(app)/workspace/page.tsx` + `DomainCard.tsx` |
| Prompt list / library | `app/(app)/prompts/page.tsx` + `PromptList.tsx` |
| Prompt editor + version timeline | `app/(app)/prompts/[promptId]/page.tsx`, `PromptEditor.tsx`, `Timeline.tsx` |
| Compare UI | `app/(app)/compare/page.tsx` + `ComparePanel.tsx` |
| Budget meter & budget page | `BudgetMeter.tsx`, `app/(app)/budget/page.tsx` |
| Gateway / SDK / API keys UI | `app/(app)/gateway/page.tsx` |
| Demo data (fake prompts, spend, domains) | `lib/mock-data.ts` |
| TypeScript data shapes | `lib/types.ts` |
| Theme colors & design tokens | `app/globals.css` (`:root`, `html.light`, `@theme`) |
| Light/dark toggle behavior | `components/marketing/ThemeToggle.tsx` + root script in `app/layout.tsx` |
| Site title / SEO / OpenGraph | `app/layout.tsx` → `metadata` |
| Fonts | `app/layout.tsx` (DM Sans, DM Mono) |
| robots.txt / sitemap | `app/robots.ts`, `app/sitemap.ts` |
| Logo component | `components/marketing/Logo.tsx` |
| Provider / company logos | `public/images/` |
| Add a new marketing page | `app/(marketing)/your-page/page.tsx` (auto-routes to `/your-page`) |
| Add a new workspace page | `app/(app)/your-page/page.tsx` + link in `AppSidebar.tsx` |
| Product scope / MVP definition | `docs/features.md` |
| API design / DB schema plan | `docs/backend.md` |

### Run locally

```bash
npm install
npm run dev
```

- Marketing home: `http://localhost:3000/`
- Workspace: `http://localhost:3000/workspace`

---

## Summary

| Layer | Status | Location |
|-------|--------|----------|
| Marketing site | **Built** | `app/(marketing)/`, `components/marketing/`, `lib/marketing-content.ts` |
| Workspace UI | **Built (mock data)** | `app/(app)/`, `components/workspace/`, `lib/mock-data.ts` |
| Backend / API / DB | **Planned** | See Part C and [backend.md](backend.md) — not in repo yet |

**Bottom line:** The repo today is a **Next.js frontend prototype** with two faces (landing + workspace). All workspace data is fake until the Hono API lands; types and docs are already aligned so wiring real APIs should be mostly swap mock imports for fetch calls.
