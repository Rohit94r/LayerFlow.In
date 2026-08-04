# LayerFlow — Development Flow Map

> The single source of truth: what this repo is, what runs where, who owns which
> file, and how a new developer goes from "hello" to shipping a change.
> Keep this file in sync with the codebase.

---

## 1. Repository overview

LayerFlow is a **managed npm workspaces monorepo** with three layers:

```
┌────────────────────────────────────────────────────────────────────────┐
│ root  (layerflow-web)   Next.js 16 web app — the product surface        │
├────────────────────────────────────────────────────────────────────────┤
│ apps/api                 Hono backend + BullMQ worker (production API)  │
│ apps/cli                 lf terminal agent (TUI) — ACTIVE, in build     │
│ packages/contracts       Shared zod schemas / DTOs (web + api + workers)│
│ packages/model-registry  Shared AI model catalogue & routing data       │
└────────────────────────────────────────────────────────────────────────┘
```

> **Build model — browser + terminal in parallel.** The web app currently ships
> on realistic mock data through a thin `lib/services/*` layer; the full
> backend lives in `apps/api` and the `lf` CLI is being built to match. The
> same Hono API serves both surfaces.

---

## 2. Tech stack

### Web (root / `layerflow-web`)
| Concern | Choice |
|---|---|
| Framework | **Next.js 16** (App Router, React 19, server-first) |
| Language | **TypeScript** (strict) |
| Styling | **Tailwind CSS v4** via PostCSS; design tokens in `app/globals.css` |
| Motion | **framer-motion** (Reveal, cards) |
| Icons | **Hugeicons** (`@hugeicons/core-free-icons`) behind `components/ui/icons.tsx` shim |
| Auth | **better-auth** (server + browser client), cookie sessions |
| Backend-as-API | **Hono** mounted inside Next.js (`lib/server/hono-app.ts`), fallback while `api.layerflow.dev` is not deployed |
| Fonts | **Geist Sans / Mono** (`geist`) |
| Validation | **zod** (shared with `@layerflow/contracts`) |
| Tests | **vitest** (`lib/**/*.test.ts`) |
| Lint / typecheck | `eslint` (flat config) / `tsc --noEmit` |

### Backend (`apps/api`)
| Concern | Choice |
|---|---|
| Runtime / server | **tsx** (dev) · **tsup** (build) · Node.js |
| HTTP framework | **Hono** (`@hono/node-server`) |
| Database | **PostgreSQL** via **Drizzle ORM** (migrations in `apps/api/drizzle`) |
| Queue / jobs | **BullMQ** on **Redis** (worker in `src/worker.ts`) |
| Auth | **better-auth** (Drizzle adapter) |
| Cache | Redis (`src/redis`) |
| Observability | **pino** logs · **Sentry** · health + metrics middleware |
| Validation | **zod** via `@layerflow/contracts` (single source of truth) |
| Storage | **AWS S3** presigned uploads (`@aws-sdk/*`) |
| Tests | **vitest** + pglite (pgvector) integration tests |

### Shared packages
| Package | Purpose |
|---|---|
| `@layerflow/contracts` | Zod DTOs (`activity`, `audio`, `auth`, `budget`, `domain`, `file`, `runs`, …) used by web + api + workers |
| `@layerflow/model-registry` | AI model catalogue + routing metadata |

---

## 3. How to run

```bash
npm install                     # workspace install
npm run dev                     # web + api + worker concurrently
npm run dev:web                 # dashboard alone
npm run dev:api                 # Hono backend alone
npm run dev:worker              # BullMQ worker alone

npm run build                   # build the web app (next)
npm run lint                    # eslint
npm run typecheck               # tsc --noEmit
npm test                        # vitest (web-side unit tests)

# backend db
npm --workspace @layerflow/api run db:generate   # drizzle migration gen
npm --workspace @layerflow/api run db:migrate     # apply migrations
npm --workspace @layerflow/api run smoke          # API smoke test
```

---

## 4. Frontend structure — what lives where

```
app/                         # Next.js App Router — routes ARE the URL
├── layout.tsx               # root layout (fonts, theme bootstrap, metadata)
├── globals.css              # tailwind v4 + design tokens (dark/light)
├── (auth)/sign-in/page.tsx  # sign-in route
├── (marketing)/             # public marketing site (landing, pricing, blog, docs)
│   ├── layout.tsx  page.tsx  pricing/page.tsx  blog/{page,[slug]}/page.tsx  docs/page.tsx
├── (dashboard)/             # the protected product UI
│   ├── app-shell.tsx        # sidebar + topbar + command palette shell (client)
│   ├── layout.tsx / loading.tsx / error.tsx
│   ├── home/page.tsx        # hub / "Today's Workspace"
│   ├── workspace/{page,[projectId]}/page.tsx
│   ├── prompts/{page,[id]}/page.tsx
│   ├── passports/{page,[id]}/page.tsx
│   ├── rescue/page.tsx      # paste → pipeline → report wizard
│   ├── {costs, models, agents, search, history, billing, keys, code}/page.tsx
│   └── settings/{page.tsx, settings-client.tsx}
├── api/                     # web-side HTTP surface
│   ├── [[...route]]/route.ts  Hono workspace API (node runtime)
│   ├── auth/[...all]/route.ts better-auth
│   ├── admin/analytics/route.ts
│   └── lf-health/route.ts     liveness
├── v1/[[...route]]/route.ts  # OpenAI-compatible /v1 gateway (temporary same handler)
└── robots.ts  sitemap.ts

components/
├── auth/        # AuthGuard, SignInForm (+ flow field)
├── blog/        # blog content, filters, hero, TOC, related posts
├── features/<domain>/  # PAGE-SPECIFIC, feature UIs:
│   ├── home/         continue-pack-row.tsx
│   ├── history/      timeline.tsx
│   ├── passports/    passport-actions.tsx
│   ├── prompts/      prompt-actions.tsx, prompt-card.tsx, prompt-library-client.tsx
│   ├── rescue/       paste-view.tsx, pipeline.tsx, report.tsx
│   └── workspace/    project-card.tsx, workspace-client.tsx
├── landing/       # landing page sections (compare, features, faq, pricing, …)
├── marketing/     # Hero, Navbar, Footer, Logo, ThemeToggle (marketing shell)
├── layout/        # sidebar.tsx, topbar.tsx, command-menu.tsx
├── shared/        # composition: row.tsx, section.tsx, page-header.tsx, stat.tsx
└── ui/            # primitives: button, badge, panel, input, tabs, table, switch,
                   #            charts, command-palette, skeleton, empty/error-state,
                   #            avatar, kbd, icons.tsx, reveal.tsx, progress, … 

lib/                       # everything NOT a React component
├── config/    # navigation, commands, site metadata
├── data/      # realistic MOCK data (workspace, passports, prompts, providers, …)
├── services/  # repo-style async API each page consumes (see §7)
├── api/       # real typed client helper (mappers, money, types) + unit tests
├── server/hono-app.ts   # embedded Hono handler (shared by app/api + app/v1)
├── providers/ # auth-provider.tsx
├── hooks/     # use-copy, use-is-mobile, use-command-menu (barrel index)
├── blog/      # canonical blog helpers (publishedAt logic, categories, related)
├── theme.ts   # theme bootstrap (dark/light)
├── types.ts   # frontend domain types
└── utils.ts   # cn() + misc
```

### Page → file mapping (quick lookup)
| URL | File |
|---|---|
| `/` | `app/(marketing)/page.tsx` |
| `/pricing` | `app/(marketing)/pricing/page.tsx` |
| `/blog` · `/blog/[slug]` | `app/(marketing)/blog/{page,[slug]}/page.tsx` |
| `/docs` | `app/(marketing)/docs/page.tsx` |
| `/sign-in` | `app/(auth)/sign-in/page.tsx` |
| `/home` | `app/(dashboard)/home/page.tsx` |
| `/workspace` · `/workspace/[projectId]` | `app/(dashboard)/workspace/{page,[projectId]}/page.tsx` |
| `/prompts` · `/prompts/[id]` | `app/(dashboard)/prompts/{page,[id]}/page.tsx` |
| `/passports` · `/passports/[id]` | `app/(dashboard)/passports/{page,[id]}/page.tsx` |
| `/rescue` | `app/(dashboard)/rescue/page.tsx` |
| `/costs` `/models` `/history` `/agents` `/search` `/billing` `/keys` `/code` | their `page.tsx` under `(dashboard)/<name>/` |
| `/settings` | `app/(dashboard)/settings/page.tsx` (+ `settings-client.tsx`) |
| `/api/*` (workspace) | `app/api/[[...route]]/route.ts` → `lib/server/hono-app.ts` |
| `/api/auth/*` | `app/api/auth/[...all]/route.ts` (better-auth) |
| `/v1/*` | `app/v1/[[...route]]/route.ts` (OpenAI-compatible gateway) |

## 5. Frontend conventions

1. **Server-first.** Every page is a Server Component that awaits a `lib/services/*`
   call; interactivity is isolated into small colocated `-client.tsx` files or
   feature components. No fetch inside components — services own the retrieval.
2. **Layering.** `features/<domain>` = page-specific UI, `shared/` = reusable
   composition, `ui/` = pure primitives (no business logic). `lib/` never imports
   components/components never import from `app/`.
3. **Naming.** kebab-case file names everywhere (folders and files); components
   are named exports PascalCase. Client components suffix `-client`.
4. **Routes driven by config.** `lib/config/navigation.ts` powers the sidebar,
   topbar search, and the command palette — add a page there to wire nav.
5. **Motion.** `components/ui/reveal.tsx` is the only entrance-motion primitive
   (`Reveal`, `SectionHeading`); cards additionally use `.card-lift` (hoover lift,
   no glow) defined in `globals.css`.
6. **No leftover code.** Delete unused files, no `console.log`/`debugger`/
   `@ts-ignore` or TODOs in committed code.

## 6. Backend structure (`apps/api`)

```
apps/api/
├── src/
│   ├── index.ts            # entry (Hono server + boot)
│   ├── app.ts              # Hono app wiring, body limits, middleware, error handling
│   ├── worker.ts           # BullMQ worker process
│   ├── auth/               # better-auth config + adapters
│   ├── routes/             # REST modules (one dir per domain):
│   │   ├── workspace, prompts, sessions, runs, memory, learning, compare,
│   │   │   budgets, keys, files, audio, intelligence, search, community, admin
│   ├── db/                 # Drizzle schema, client, seed
│   ├── middleware/         # auth, rate-limit, error/not-found, request-id, …
│   ├── budgets/            # token/cost budget engine
│   ├── gateway/            # LLM provider gateway (routing/comparison)
│   ├── providers/          # provider adapters (model × provider)
│   ├── intelligence/       # scoring, prompt analysis logic
│   ├── jobs/               # BullMQ job definitions
│   ├── cache/  observability/  redis/  config/  types.ts
├── drizzle/                # generated migration SQL (+ meta)
├── scripts/                # migrations verify, usage-rollup, reconcile, smoke
└── package.json
```

**Backend stack:** Hono · PostgreSQL (Drizzle) · Redis (BullMQ) · better-auth ·
zod/`@layerflow/contracts` · S3 presigned uploads · pino + Sentry.

## 7. Data flow — mock → real backend

```
Dashboard page (server) 
   └─> lib/services/workspace.ts   (await) 
        └─> lib/data/workspace.ts  today       ──→ replace body with fetch →
             (static mock)                                   │
   ┌─────────────────────────────────────────────────────────┐
   │ live Hono API at /api/* (app/api or apps/api)           │
   └─────────────────────────────────────────────────────────┘
```

Every `lib/services/*` file documents at the top exactly how to swap mock for
live `fetch` without touching page code — **signatures never change**.

| Service (`lib/services/`) | Data source today |
|---|---|
| `workspace.ts` | `lib/data/workspace.ts` (projects, timeline, stats, costs) |
| `passports.ts` | `lib/data/passports.ts` (passports + rescue reports) |
| `prompts.ts` | `lib/data/prompts.ts` |
| `search.ts` | all mock datasets |
| `models.ts` | `lib/data/providers.ts` |

## 8. The source-of-truth docs

| File | What it documents |
|---|---|
| `flow.md` (this) | Repo map, tech stack, page map, structure, conventions |
| `docs/architecture.md` | Dashboard architecture & conventions (route groups, layers) |
| `docs/workflow.md` | The product engineering workflow (end-to-end plan) |
| `docs/tech-stack.md` | Full target technology stack (web + terminal + agents + infra) |
| `docs/infor.md` | Product overview — browser + terminal surfaces, `lf`/research agent direction, ideas |
| `docs/blog-publish-schedule.md` | Blog auto-publish calendar |

## 9. Rules for new contributors

1. Route/page? => `app/<group>/<route>/page.tsx`. Page UI => `components/features/<domain>/`.
2. New fetchers => `lib/services/<domain>.ts` first (async, mock-backed), then
   swap when the API is ready.
3. Shared DTO changes => `packages/contracts` (zod) — web, api and workers all import it.
4. Run `npm run typecheck && npm run lint && npm test && npm run build` before pushing.
5. Never commit mock keys: env only (`.env.example` at repo + apps/api).