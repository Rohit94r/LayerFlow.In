# LayerFlow — Architecture & Code Map

> **This is the "where is what" file.** If you don't know where something lives,
> start here. Every folder below says what it is, why it exists, and what goes
> where when you add new code.

---

## The big picture

Three surfaces, one backend:

```
┌─────────────────────┐   ┌──────────────────────┐   ┌─────────────────────┐
│  Browser (apps/web) │   │  API + Worker        │   │  Terminal (lf CLI)  │
│  Next.js 16         │──▶│  (apps/api)          │◀──│  Go + Bubble Tea    │
│  chat / agents /    │   │  Hono HTTP :8787     │   │  terminal/          │
│  billing / history  │   │  BullMQ worker       │   │  TUI + daemon       │
└─────────────────────┘   └──────────┬───────────┘   └─────────────────────┘
                                     │
                          ┌──────────▼───────────┐
                          │ Postgres (pgvector)  │  ← source of truth
                          │ Redis (BullMQ/cache/ │
                          │ budgets)             │
                          └──────────────────────┘
```

- The **browser app** also mounts the Hono API same-origin under `/api/*` and
  `/v1/*` (see `apps/web/app/api/[[...route]]/route.ts`), so a separate API
  host is optional.
- The **CLI** syncs sessions/messages/memories to the dashboard via
  `/api/v1/sync/*` (`apps/api/src/routes/sync` ↔ `terminal/internal/sync`).

---

## Repository layout (what lives where)

| Path | What it is |
| --- | --- |
| `apps/web/` | **Browser app** — Next.js 16 + React 19 + Tailwind 4. All pages, UI components, client services. |
| `apps/api/` | **Backend** — Hono HTTP API (`src/index.ts`) + BullMQ worker (`src/worker.ts`). Drizzle ORM + Postgres/pgvector, Redis, Better Auth. |
| `packages/contracts/` | Shared TS types + zod schemas for API requests/responses (`@layerflow/contracts`). |
| `packages/model-registry/` | The model catalog (providers, pricing, capabilities) (`@layerflow/model-registry`). |
| `terminal/` | **Go CLI** (`lf`) — Cobra commands + Bubble Tea TUI, sessions, MCP, daemon, tools, sync. |
| `docs/` | Product/engineering docs. Plans in `docs/plans/`, ops runbooks in `docs/ops/`. |
| `scripts/` | Deployment + ops shell scripts (see `scripts/README.md`). |
| `Dockerfile` | Production image for the **API** (used by both prod compose files). |
| `docker-compose.yml` | Local dev infra only: Postgres(pgvector) :5432 + Redis :6379. |
| `docker-compose.prod.yml` | Full VPS stack (nginx + certbot + api + worker + optional local PG/Redis). |
| `docker-compose.vps.yml` | VPS variant when Caddy on the host already does SSL (port 3100). |
| `render.yaml` | Render Blueprint (api + worker) — the primary production deploy. |
| `nginx.conf` | Nginx config used by `docker-compose.prod.yml`. |

---

## `apps/web/` — the browser app (detail)

| Path | What it is |
| --- | --- |
| `app/` | Next.js App Router pages. Route groups: `(marketing)` = landing/blog/pricing/docs, `(auth)` = sign-in, `(dashboard)` = the logged-in app. |
| `app/api/[[...route]]/` | Catch-all that mounts the **Hono app same-origin** under `/api/*`. |
| `app/v1/[[...route]]/` | Same idea for the OpenAI-compatible **gateway** under `/v1/*`. |
| `app/api/auth/[...all]/` | Better Auth route handler. |
| `app/api/admin/analytics/` | Admin-only analytics proxy (imports API auth/admin service directly). |
| `app/api/lf-health/` | Liveness probe used by the sign-in page. |
| `app/install`, `app/install.sh`, `app/install.ps1` | Serve `terminal/scripts/install.*` for `curl \| bash` installs. Three route dirs because the URL path must match the folder name in Next.js — all shared logic lives in `lib/server/install-scripts.ts` (loader + plain-text response). |
| `app/globals.css` | Tailwind 4 global styles + design tokens. |
| `components/ui/` | Design-system primitives (button, modal, table, toast, …). |
| `components/features/` | Feature screens: `chat/`, `history/`, `memory/`, `prompts/`, `rescue/`, `team/`, `workspace/`, `home/`. |
| `components/landing/` | Marketing landing-page sections. |
| `components/layout/` | Dashboard chrome: sidebar, topbar, command menu, mobile nav. |
| `components/auth/` | Sign-in form + auth guard. |
| `components/blog/`, `components/marketing/` | Blog + marketing pages. |
| `lib/services/` | **Client-side service layer** — one module per API area (`chat.ts`, `agents.ts`, `rescue.ts`, …). Pages never call `fetch` directly. |
| `lib/api/` | Fetch client, API types, mappers, money formatting. |
| `lib/providers/` | React context providers — `auth-provider.tsx` exports `AuthProvider` + `useAuth()` (Better Auth session: `user`, `isPending`, `signOut`). Mounted around the dashboard UI in `app/(dashboard)/app-shell.tsx`. |
| `lib/server/` | **Server-only glue**: `hono-app.ts` + `auth-loader.ts`. These import `apps/api/src` via the `@layerflow/api/src/*` tsconfig path. |
| `lib/hooks/` | React hooks (copy, command menu, mobile detection). |
| `lib/config/` | Site metadata, navigation, command definitions. |
| `lib/data/` | Static/demo data (marketing, provider display info). |
| `lib/blog/` | Blog content loading (posts in `content/blog/`). |
| `next.config.mjs` | Security headers, server-external packages, install-script tracing. |
| `vitest.config.ts` | Web unit tests (`lib/**/*.test.ts`, `components/**/*.test.ts`). |

**Where to put new things:** new page → `app/(dashboard)/<area>/page.tsx`;
new API calls → `lib/services/<area>.ts`; UI primitives → `components/ui/`;
feature components → `components/features/<area>/`.

---

## `apps/api/` — the backend (detail)

| Path | What it is |
| --- | --- |
| `src/index.ts` | Hono HTTP entrypoint (port 8787). |
| `src/worker.ts` | BullMQ worker entrypoint (rescue, embeddings, alerts, digests…). |
| `src/app.ts` | Hono app assembly — mounts every route group. |
| `src/routes/` | HTTP layer, one folder per area (`chat/`, `agents/`, `rescue/`, `sync/`, …). Thin: validate → call service → respond. |
| `src/services/` | Business logic, one folder per area. This is where the real work happens. |
| `src/gateway/` | OpenAI-compatible `/v1` gateway: routing, exact-match cache, budget reserve/settle, failover. |
| `src/auth/` | Better Auth setup (email/password + Google + device/API keys). |
| `src/db/` | Drizzle schema (`db/schema/`) + client; migrations in `drizzle/`. |
| `src/redis/` | Redis connection + helpers. |
| `src/jobs/` | BullMQ queue definitions + `processors/`. |
| `src/cache/` | Exact-match response cache. |
| `src/middleware/` | Auth / rate-limit / plan enforcement middleware. |
| `src/config/` | Env validation (zod) + admin config. |
| `src/observability/` | Sentry + pino logging. |
| `src/test/` | Test helpers (in-memory Postgres via PGlite, mocked Redis). |
| `scripts/` | Package ops scripts (migration verify, usage rollup, smoke). |

**Where to put new things:** new endpoint → `src/routes/<area>/` + register in
`src/app.ts`; new logic → `src/services/<area>/`; shared types →
`packages/contracts/src/<area>.ts`.

---

## `terminal/` — the Go CLI (detail)

| Path | What it is |
| --- | --- |
| `cmd/lf/` | Cobra command definitions (`login`, `chat`, `run`, `sessions`, …). |
| `internal/tui/` | Bubble Tea full-screen TUI (chat, palette, overlays). |
| `internal/session/` | Local session storage. |
| `internal/tools/` | Agent tool implementations (read/write/edit/bash…). |
| `internal/providers/` | LLM provider clients. |
| `internal/mcp/` | MCP server support. |
| `internal/sync/` | Sync protocol client → dashboard `/api/v1/sync/*`. |
| `internal/daemon/` | Background daemon. |
| `internal/memory/`, `internal/context/`, `internal/compact/` | Memory + context management. |
| `internal/sandbox/`, `internal/permission/`, `internal/audit/` | Safety: sandboxing, approvals, audit log. |
| `pkg/` | Reusable libs (diff, markdown render, OpenAI types). |

---

## How the pieces import each other

```
apps/web ──▶ @layerflow/contracts, @layerflow/model-registry   (npm workspace deps)
apps/web ──▶ apps/api/src/*     via tsconfig path "@layerflow/api/src/*"  (server-side only:
                                 lib/server/* and app/api/* — never from client components)
apps/api ──▶ @layerflow/contracts, @layerflow/model-registry
terminal ──▶ (Go only; talks HTTP to the API, no TS imports)
```

## Local development

```bash
npm run dev          # web (:3000) + api (:8787) + worker, all together
docker compose up -d # local Postgres + Redis (optional if using Neon/Upstash)
```

Web env lives in `apps/web/.env.local` (NEXT_PUBLIC_*). API env lives in
`apps/api/.env` (DATABASE_URL, REDIS_URL, secrets). The web server auto-loads
`apps/api/.env` in local dev so same-origin auth works.

## Production

- **Web** → Vercel (Root Directory: `apps/web`).
- **API + worker** → Render (`render.yaml`) or VPS Docker
  (`docker-compose.prod.yml` / `docker-compose.vps.yml`).
- **CLI releases** → tag `v*` → GoReleaser → public binaries repo.
- Ops commands: `docs/ops/docker-commands.md`. Old planning docs: `docs/plans/`.
