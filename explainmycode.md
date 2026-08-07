# LayerFlow — Codebase Explained (Simple English)

> This file is for **you and anyone who joins the team**. It explains:
> what stack we use, what every folder/file is for, why it was written,
> and how the folder structure will grow as the product grows.
>
> Read this file first → then `docs/tech-stack.md` (full technical spec)
> → then `flow.md` (product flows).

---

## 1. What is LayerFlow? (One Line)



---

## 2. What Stack Do We Use? (In Simple Words)

| Piece | Tool | Why (simple English) |
|---|---|---|
| Frontend framework | **Next.js 16** (React 19) | One codebase for landing + dashboard; fast loading |
| Language | **TypeScript** | Catches mistakes before they run; shared with backend |
| Styling | **Tailwind CSS v4** | Quick styling, no heavy CSS files |
| Animations | **Framer Motion** | Smooth UI animations |
| Forms + validation | **Zod** | All data shapes are checked (shared with backend!) |
| Frontend state | **TanStack Query** (planned) | Fetch + cache server data easily |
| Backend API | **Hono** (TypeScript) | Small, fast API framework — lives inside this repo |
| Auth | **better-auth** | Sign in with email + Google, no auth server needed |
| Database | **PostgreSQL** via **Drizzle ORM** | The main store of everything |
| Background jobs | **BullMQ + Redis** | Long tasks (compressing chats, embedding) run in a worker |
| Caching | **Redis** | Speeds up repeated requests |
| Errors/monitoring | **Sentry + pino logs** | Know when things break in production |
| Deployment | **Vercel** (web), **Fly.io** (API/worker) | Push to deploy |
| Future | Stripe, Resend, PostHog, Supabase | Payments, email, analytics (not wired yet) |

> **Important:** the backend is TypeScript (Hono), not Python/FastAPI.
> The original idea mentioned FastAPI, but we chose Hono so **frontend and
> backend share the same Zod schemas** (the `packages/contracts` folder).
> One source of truth = fewer bugs.

---

## 3. The Folder Tree (What Exists Today)

```
LayerFlow/
├── app/                          # Next.js pages (URLs of the site)
│   ├── (marketing)/              # Landing page, blog, pricing, docs
│   ├── (dashboard)/              # The app you see after login
│   ├── (auth)/                   # Sign-in / sign-up pages
│   ├── api/                      # API routes mounted under /api/*
│   ├── v1/                       # API routes mounted under /v1/* (gateway)
│   ├── globals.css               # Global design tokens (colors, fonts)
│   ├── layout.tsx                # Root layout (wraps every page)
│   ├── robots.ts                 # Tells Google what to index
│   └── sitemap.ts                # Tells Google your pages
├── components/                   # Reusable UI pieces
│   ├── ui/                       # Basic building blocks (button, input…)
│   ├── auth/                     # Login-related components
│   ├── landing/                  # Landing page sections
│   ├── marketing/                # Marketing-related blocks
│   ├── blog/                     # Blog page components
│   ├── features/                 # Feature showcase components
│   ├── layout/                   # Navbar, footer, shared layout parts
│   └── shared/                   # Used everywhere (page-header, stats…)
├── lib/                          # Non-visual helper code
│   ├── api/                      # Browser-side API client + types
│   ├── data/                     # Mock data (works like the real API)
│   ├── services/                 # Browser-side service calls
│   ├── config/                   # Site config (nav, commands, links)
│   ├── hooks/                    # Custom React hooks
│   ├── providers/                # Context providers (auth session…)
│   ├── server/                   # Server-only code (Hono app loader)
│   ├── blog/                     # Blog content + keywords
│   └── utils.ts, types.ts…       # Small helpers, shared types
├── apps/                         # Separate mini-apps (monorepo)
│   └── api/                      # THE BACKEND (Hono API + worker)
│       ├── src/
│       │   ├── index.ts          # API entry point (Fly.io)
│       │   ├── worker.ts         # Background worker entry point
│       │   ├── app.ts            # Builds the full Hono app
│       │   ├── routes/           # API endpoints (URL handlers)
│       │   ├── services/         # Business logic (called by routes)
│       │   ├── db/               # Database client + schema
│       │   ├── providers/        # AI model connectors (OpenAI, Claude…)
│       │   ├── jobs/             # Background job queues
│       │   ├── auth/             # better-auth setup
│       │   ├── middleware/       # Runs between request and route
│       │   ├── redis/            # Redis helpers
│       │   ├── cache/            # Caching helpers
│       │   ├── observability/    # Sentry, logs, metrics
│       │   └── config/           # Env config loading
│       ├── drizzle/              # SQL migration files (DB changes)
│       ├── scripts/              # One-off scripts (smoke tests, reports)
│       └── Dockerfile            # For deploying on Fly.io
├── packages/                     # Shared code used by web AND backend
│   ├── contracts/                # Zod schemas — THE single source of truth
│   └── model-registry/           # AI model names, pricing, speed info
├── content/                      # Written content (blog posts)
├── public/                       # Images, icons (served as-is)
├── docs/                         # Engineering documentation
├── scripts/                      # DevOps scripts (deploy, checks)
├── docker-compose.yml            # Runs Postgres + Redis locally
├── .env.example                  # List of all env variables needed
└── package.json                  # Root commands (dev, build, test…)
```

---

## 4. Every Folder, Explained: "Which File, Why"

### 4.1 `app/` — the pages (what the user sees)

Next.js maps folders to URLs. If a folder is in **parentheses** like
`(dashboard)`, it does **not** appear in the URL — it's just a grouping.

| Folder | URL | Why it exists |
|---|---|---|
| `(marketing)/` | `/`, `/pricing`, `/blog`… | Public pages — landing, blog, pricing, docs |
| `(dashboard)/` | `/agents`, `/prompts`, `/keys`… | The product after login (workspace, history, models…) |
| `(auth)/` | `/sign-in` | Login page |
| `api/` | `/api/*` | All backend endpoints served by Hono (same domain = no CORS) |
| `v1/` | `/v1/*` | Gateway API routes (future public API version) |

Files: `layout.tsx` = the frame around pages. `globals.css` = design tokens.
`robots.ts`/`sitemap.ts` = SEO for Google.

### 4.2 `components/` — reusable UI

- `ui/` — small primitives: `button.tsx`, `input.tsx`, `tabs.tsx`, `table.tsx`,
  `badge.tsx`. These never know about business logic — pure look.
- `landing/`, `marketing/`, `features/`, `blog/` — big blocks for the public
  site.
- `layout/` — navbar, footer, the app shell.
- `auth/` — login form components.
- `shared/` — components used in many places (`page-header.tsx`, `section.tsx`).

**Rule:** if you reuse a component 2+ times, move it to `shared/` or `ui/`.

### 4.3 `lib/` — helpers that are not visual

- `lib/data/` — **mock data** for the dashboard (frontend runs on realistic
  fake data until the backend fully powers it). Written like the real API
  so switching later = changing one file.
- `lib/api/` — the real browser→API client (`client.ts`), config, money
  helpers, mappers.
- `lib/services/` — calls like `search.ts`, `prompts.ts`, `workspace.ts`
  (frontend side of each feature).
- `lib/config/` — static site data: `navigation.ts` (menu links),
  `commands.ts` (command palette), `site.ts`.
- `lib/hooks/` — reusable React hooks (`use-copy.ts`, `use-command-menu.ts`).
- `lib/providers/` — wraps the app with context (auth session).
- `lib/server/` — **server-only**: loads the Hono app so Next can serve API
  routes on the same domain.
- `lib/blog/` — blog post data + keyword lists.

### 4.4 `apps/api/` — THE BACKEND (your focus starting today)

This is a separate mini-app inside the monorepo. Two entry points:
- `src/index.ts` → the API server (deployed on Fly.io)
- `src/worker.ts` → a background worker (runs BullMQ jobs on Redis)

The flow of a request:

```
Route (apps/api/src/routes/*)   →  knows URLs, validates input
        ↓
Service (apps/api/src/services/*) → business logic (the "what happens")
        ↓
DB (apps/api/src/db/*)          →  actually reads/writes PostgreSQL
```

| Folder | Why it exists |
|---|---|
| `routes/` | One file per URL group: `sessions/`, `prompts/`, `keys/`, `budgets/`, `search/`… No business logic here — just accept request → call service → return response |
| `services/` | The brain. Each feature has its service: `runs/` (execute AI runs), `keys/` (provider keys), `memory/`, `savings/`… |
| `db/` | Database connection (`client.ts`) + `schema/` (table definitions) |
| `drizzle/` | Migration files — the "history" of every DB change, applied with `npm run db:migrate` |
| `providers/` | Connectors to AI companies: `openai.ts`, `anthropic.ts`, `google.ts`, `deepseek.ts`, `groq.ts`, `openrouter.ts`… All same shape, so swapping models is easy |
| `jobs/` | Background work: `queues.ts` + `processors/`. Long tasks don't block the API |
| `auth/` | better-auth config (login, sessions, admin check) |
| `middleware/` | Code that runs on every request (rate limiting, auth checks, logging) |
| `redis/` + `cache/` | Fast in-memory store for caching and queues |
| `observability/` | Sentry (errors) + pino (logs) |
| `config/` | Reads env variables safely — fail fast if something is missing |
| `scripts/` | Maintenance scripts: `smoke.ts` (test the API), `usage-rollup.ts` (billing math), `reconcile.ts`… |
| `test/` | Backend tests |

### 4.5 `packages/` — shared code (the secret weapon)

- `contracts/` — **Zod schemas** for every piece of data (auth, workspace,
  prompt, budget, search…). The frontend AND backend import from here, so
  the data shape can never drift apart.
- `model-registry/` — AI model names + pricing + speed (used by the cost
  engine and model router).

### 4.6 Root files

| File | Why it exists |
|---|---|
| `package.json` | All commands: `npm run dev` (web + API + worker together), `npm run lint`, `npm run typecheck`, `npm test` |
| `docker-compose.yml` | One command spins up Postgres + Redis + MinIO locally — no installs |
| `.env.example` | The checklist of every env variable (copy to `.env.local`) |
| `scripts/` | `check-production.sh` (gates deploys), `deploy-api-prod.sh`, blog post generator |
| `docs/` | Architecture docs — `tech-stack.md` is the full spec |
| `.github/` | CI (checks code on every push) |

---

## 5. The Rules (Very Simple)

1. **Routes don't think.** Routes validate input and call a service. That's it.
2. **Services do the thinking.** All business logic lives here.
3. **Services use repositories/DB files.** They never write SQL inline in routes.
4. **Everything is typed with Zod.** If a schema is in `packages/contracts`, both frontend and backend use it.
5. **No `any` in TypeScript.** If you're about to write `any`, stop and define a type.
6. **Long tasks go to queues.** Anything that takes >1 second → BullMQ job, not the request.
7. **No secrets in code.** Everything from env vars.
8. **Never break the tree.** Routes → Services → DB. Not Services → Routes.

---

## 6. Naming Conventions

| What | Rule | Example |
|---|---|---|
| Components | PascalCase, file name = component name | `PassportCard.tsx`, `StatsTable.tsx` |
| Pages | lowercase folder names | `app/(dashboard)/agents/` |
| API routes | lowercase, grouped by feature | `routes/sessions/sessions.ts` |
| Services | lowercase feature names | `services/keys/`, `services/runs/` |
| Hooks | `use-` prefix | `use-copy.ts`, `use-command-menu.ts` |
| Types | PascalCase, exported with schema | `CreateWorkspaceInput` |
| DB tables | lowercase snake_case | `rescue_reports`, `context_passports` |
| Files with only types | `types.ts` next to the feature | `lib/api/types.ts` |

---

## 7. Import Conventions

- Use `@/` for the web app root: `import { Button } from "@/components/ui/button"`.
- Shared schemas: `import { z } from "@layerflow/contracts"`.
- Model data: `import { MODELS } from "@layerflow/model-registry"`.
- Never import `apps/api` code into `components/` (they meet only in types).
- Relative imports inside a feature folder are fine (`./dto.ts`).

---

## 8. Example: How a Feature Flows (Login → See Your Prompts)

```
1. User opens /sign-in → better-auth creates a session (cookie)
2. User opens dashboard → app/(dashboard)/prompts/ (page)
3. Page calls lib/api/client.ts  →  GET /api/prompts
4. Next.js forwards to apps/api/src/routes/prompts/ (route)
5. Route validates with Zod schema from @layerflow/contracts
6. Route calls services/prompts service (business logic: which prompts, ordering)
7. Service asks db/schema (Drizzle) → PostgreSQL
8. Response goes back typed — frontend already knows the shape
```

This layered chain is why new people can join and find things fast:
**URL → route → service → database.** Every feature follows the same path.

---

## 9. Improved Folder Structure (Future — Grow Into This)

Today's structure is intentionally flat. As the team and product grow,
move step by step toward this. Do NOT restructure overnight — migrate
folder by folder.

### Backend growth (apps/api) — recommended order:

```
apps/api/src/
├── routes/            # (exists) keep — add domain folders as needed
│   ├── v1/            # versioned public API (move /v1 here)
│   └── internal/      # everything else
├── services/
│   ├── ai/            # NEW — AI-specific logic
│   │   ├── providers/     # (exists as src/providers — keep)
│   │   ├── prompt_engine/ # prompt building, prompt improver
│   │   ├── embeddings/    # vector embedding + search
│   │   ├── routing/       # model router (which model for which job)
│   │   ├── cost/          # cost engine (dollar estimates)
│   │   ├── evaluation/    # prompt/result scoring
│   │   └── memory/        # context passports, learnings
│   ├── marketing/     # NEW — SEO, content calendar, social scheduler
│   ├── analytics/     # NEW — dashboards, reports
│   ├── billing/       # NEW — Stripe integration
│   ├── notifications/ # NEW — email (Resend), in-app
│   └── (existing feature services stay)
├── repositories/      # NEW (later) — when services get big:
│                     # services = rules, repositories = DB queries only
├── db/
│   ├── schema/        # (exists)
│   ├── migrations/    # (exists as drizzle/)
│   ├── seed/          # demo + test data scripts
│   └── queries/       # complex SQL kept separate
├── jobs/              # (exists) — add queue per heavy feature
├── security/          # NEW — permissions, audit logs, encryption helpers
│   ├── permissions/
│   ├── audit/
│   └── encryption/
├── middleware/        # (exists) — rate limiting, auth, logging
├── observability/     # (exists)
└── config/            # (exists)
```

### Frontend growth (web):

```
components/
├── ui/        (exists — primitives)
├── shared/    (exists — move everything reused 2+ times here)
├── features/  (NEW — one folder per feature: prompts/, agents/, keys/)
│   ├── prompts/PromptCard.tsx
│   ├── agents/AgentList.tsx
│   └── keys/KeyForm.tsx
├── layout/    (exists)
└── landing/   (exists)
```

### Shared growth:

```
packages/
├── contracts/       (exists — keep as the single source of truth)
├── model-registry/  (exists)
├── ui/              (NEW — if we later add a second app, move components/ui here)
└── config/          (NEW — shared env + feature flags)
```

**When to migrate:** when a folder has >10 files, or when two people edit
the same file every week. That's the moment — not before.

---

## 10. How This Scales (Users: 100K → 1M → 10M)

| Users | What happens | What we add |
|---|---|---|
| **100K** | One API (Fly.io) + one worker + one Postgres. Fine today. | Redis caching for hot routes; index DB columns; Sentry alerts |
| **1M** | One server gets slow. | Split worker from API (already separate — good). Add a read replica Postgres. Move search to a dedicated service. Add CDN for static files |
| **10M** | DB is the bottleneck. | Shard by workspace (tenant); event-driven analytics in a separate store; dedicated vector DB (Qdrant) for AI search; queues → Temporal for resumable jobs; multiple regions |

The architecture already does the hard things right:
- **API and worker are separate processes** (can scale independently)
- **Everything typed through `packages/contracts`** (frontend/backend never break each other)
- **Queues for all heavy work** (users never wait on AI)
- **Feature folders** (teams can own folders, not fight over files)

---

## 11. Best Practices (For Everyone, Including New Joiners)

1. **Read `explainmycode.md` → `docs/tech-stack.md` → `flow.md`** before writing code.
2. **Run the checks before you push:** `npm run typecheck`, `npm run lint`, `npm test`.
3. **Start with `npm run dev`** — it runs web + API + worker together.
4. **Never commit `.env.local` or real keys.** Copy `.env.example` only.
5. **Write mock data like real API** (typed, async) so the real backend can replace it one day.
6. **No comments explaining "what"** — only "why".
7. **Small PRs, feature-scoped.** One feature = one folder touched.
8. **When in doubt about data shape → check `packages/contracts` first.**
9. **Backend rule (starting today):** new feature = route file + service file + schema in contracts + migration if DB changes + test.
10. **If a task takes >1 second, it's a job (BullMQ), not a request.**

---

## 12. Commands Cheat Sheet

```bash
npm run dev            # everything locally (web + API + worker)
npm run dev:web        # only the Next.js site
npm run dev:api        # only the backend API
npm run dev:worker     # only the background worker
npm run lint           # code style check
npm run typecheck      # TypeScript check (no errors allowed)
npm test               # run tests
npm run db:migrate --workspace @layerflow/api   # apply DB changes
npm run db:seed   --workspace @layerflow/api    # fill demo data
```

---

*Written for humans. Update this file whenever the structure changes
significantly — it's the first thing new teammates read.*
