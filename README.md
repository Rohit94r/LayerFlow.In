# LayerFlow

**Prompt engineering workspace + AI gateway + terminal agent.** One platform to
rescue dead AI chats, turn rough prompts into sharp ones, run multi-model agent
work, and keep AI spend under control.

Pre-launch monorepo. See the **Status** section for an honest picture of what
is wired end-to-end today.

## What LayerFlow is

Three surfaces share one backend:

- **Web app** (Next.js 16, repo root) — dashboard for prompts, sessions, rescue
  reports, agent runs, budgets/usage, and BYOK keys. The shared Hono app is
  also mounted same-origin under `/api/*` and `/v1/*`
  (`app/api/[[...route]]/route.ts`), so a separate API host is optional in
  production.
- **API + worker** (`apps/api`) — one TypeScript codebase with two entrypoints:
  a Hono HTTP API (`src/index.ts`) and a BullMQ job worker (`src/worker.ts`).
  Postgres (with pgvector) is the source of truth; Redis backs the job queue,
  the exact-match cache, and budget accounting. Auth is Better Auth
  (email/password + Google OAuth).
- **Terminal agent** (`terminal/`) — a Go CLI (Cobra + Bubble Tea) for
  keyboard-first AI sessions, hybrid search, MCP servers, and a background
  daemon. Sessions sync to the dashboard via the `/api/v1/sync/*` protocol.

Feature areas, all backed by real API routes:

| Area | What it does |
| --- | --- |
| Rescue (`/api/rescue`) | Paste a dead conversation; a queued pipeline produces a rescue report — context summary, improved prompt with scores, context diff (kept/removed/unsure), cost estimates, a recommended model, and a continue pack |
| Improve (`/api/improve`) | Score + sharpen a rough prompt into a low-token one |
| Agents (`/api/agents`) | Agent templates, runs, and start/poll lifecycle |
| Chat (`/api/chat`) | Multi-model chat sessions with manual and auto provider switching |
| Gateway (`/v1/*`) | OpenAI-compatible `chat/completions` + `models` with exact-match caching and budget reserve/settle; BYOK provider keys encrypted at rest (AES-256-GCM) |
| Budgets & usage (`/api/budgets`, `/api/usage`, `/api/savings`) | Monthly/daily limits, spend rollups, threshold alerts, savings suggestions |
| Workspace | Projects, domains, folders, prompts (with immutable versions), sessions, files, activity feed |
| Terminal (`/api/v1/sync/*`) | CLI sync protocol — sessions, messages, memories and project notes pushed from `lf` to the dashboard |
| Team (`/api/team`) | Members, roles (owner/admin/member), invitations and RBAC |
| Community (`/api/collections`, `/api/profiles`, …) | Public prompt collections, profiles, follows, likes, comments, notifications |

## Status

Honest pre-launch status. **Production-shaped:** the API + worker are fully
wired (auth, workspace CRUD, prompts/sessions, runs with SSE streaming,
gateway with budgets, keys, search, memory, files, billing, terminal sync,
team/RBAC); they have unit + integration tests (Vitest, in-memory Postgres +
mocked Redis), migrations are checked in, and there is a Docker image plus a
Render blueprint for the API and its worker. The web dashboard is fully wired
to the API — `lib/services/*` talk to real endpoints and no page renders from a
mock service layer. **In development:** the `lf` CLI is mostly constructor
wiring — several commands (`chat`, `run`, `sync`, `rescue`, `upgrade`) are
explicit stubs; the sync client and its in-memory journal are not yet durable
(see the [Go CLI](#go-cli-lf) section); and rescue/improve/agents/chat routes
exist but are early — treat them as experimental.

Not built: SDK, IDE/browser extensions, marketplace, enterprise features.

## Architecture

```text
┌──────────────────────────────┐        ┌──────────────────────────────┐
│  Web app (repo root)         │        │  lf CLI (Go, lf/)            │
│  Next.js 16 dashboard        │        │  chat · run · sessions ·     │
│  mounts Hono same-origin     │        │  login · doctor · cost ·     │
│  (/api/*, /v1/*)             │        │  mcp · daemon · sync         │
└──────────────┬───────────────┘        └──────────────┬───────────────┘
               │ HTTPS / JSON + SSE                     │ HTTPS (cookies / lf_ keys)
               ▼                                        ▼
┌────────────────────────── Hono API (apps/api) ──────────────────────────┐
│  /api/*  session auth (Better Auth)          /v1/*  gateway (API keys) │
│  workspace · prompts · sessions · files · runs (SSE) · compare ·        │
│  rescue · improve · agents · chat · budgets · usage · keys · search ·   │
│  memory · learning · community · billing    (src/routes/index.ts)       │
└──────┬─────────────────────────────┬──────────────────────┬────────────┘
       │                             │                      │
       ▼                             ▼                      ▼
┌──────────────────┐        ┌──────────────────┐   ┌──────────────────────┐
│ Postgres 16      │        │ Redis 7          │   │ Worker (BullMQ)      │
│ + pgvector       │        │ job queue ·      │   │ rescue · compare ·   │
│ (Neon in prod)   │        │ exact cache ·    │   │ embeddings · alerts ·│
│                  │        │ budgets          │   │ weekly digests       │
└──────────────────┘        └──────────────────┘   └──────────────────────┘
                                   │
                                   ▼
                     ┌────────────────────────────────────────┐
                     │ Model providers (platform or BYOK keys)│
                     │ OpenAI · Anthropic · Gemini · Groq ·   │
                     │ DeepSeek · Kimi · xAI                  │
                     └────────────────────────────────────────┘
```

## Repo layout

| Path | What it is |
| --- | --- |
| `app/`, `components/`, `lib/` | Next.js 16 web app (marketing, auth, dashboard) + same-origin Hono mount |
| `apps/api/` | Hono API + BullMQ worker (one package, two entrypoints). Detailed endpoint map in `apps/api/README.md` |
| `terminal/` | Go CLI — the terminal agent. See `terminal/README.md` |
| `packages/contracts/` | Zod schemas + shared types for API payloads (web ↔ API) |
| `packages/model-registry/` | Typed catalog of providers, models, pricing (integer micro-dollars), capabilities |
| `docker-compose.yml` | Local Postgres 16 (pgvector) + Redis 7 for the API |
| `render.yaml` | Render Blueprint: `layerflow-api` (web) + `layerflow-api-worker` (worker) |
| `docs/`, `flow.md`, `plan.md` | Architecture, workflow, status notes |

## Getting started

### Prerequisites

- Node.js 22+ (CI, Docker, and the API README all target 22)
- npm (the repo is an npm workspaces monorepo — `package-lock.json`)
- Redis (via `docker compose up -d`, or a cloud instance such as Upstash)
- Docker Desktop — optional, only for local Postgres + Redis
- A Google account, only if you want Google OAuth sign-in

### 1. Install

```bash
npm install
```

### 2. Local infra (optional — skip if `DATABASE_URL`/`REDIS_URL` already point at Neon/Upstash)

```bash
docker compose up -d
```

Starts Postgres 16 with pgvector (`localhost:5432`) and Redis 7
(`localhost:6379`), matching the defaults in `apps/api/.env.example`.

### 3. Environment

Copy the API env template and fill it in:

```bash
cp apps/api/.env.example apps/api/.env
```

Required (the API refuses to start without them):

| Variable | Notes |
| --- | --- |
| `DATABASE_URL` | Postgres connection. `.env.example` ships the docker-compose default |
| `REDIS_URL` | Redis connection (`redis://localhost:6379` locally) |
| `BETTER_AUTH_SECRET` | `openssl rand -hex 32` |
| `PROVIDER_KEYS_KEK` | Key-encryption key for BYOK provider keys + API-key HMAC. `openssl rand -hex 32`, must be 64 hex chars |
| `BETTER_AUTH_URL` | Public URL of the API (`http://localhost:8787` locally) |
| `WEB_URL` | Frontend origin (`http://localhost:3000`) |
| `API_URL` | API origin (`http://localhost:8787`) |
| `CORS_ORIGINS` | Comma-separated allowed browser origins |

Optional but commonly used: `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
(Google OAuth — set the redirect URI to `{BETTER_AUTH_URL}/api/auth/callback/google`),
`PORT` (default 8787), provider keys so model runs work without BYOK
(`OPENAI_API_KEY`, `GROQ_API_KEY` + `GROQ_MODEL`, `GEMINI_API_KEY` +
`GEMINI_MODEL`, `DEEPSEEK_API_KEY` + `DEEPSEEK_MODEL`, `KIMI_API_KEY` +
`KIMI_MODEL`, `XAI_API_KEY` + `XAI_MODEL`), billing (`DODO_PAYMENTS_API_KEY`,
`DODO_PAYMENTS_WEBHOOK_KEY`, `DODO_PAYMENTS_ENVIRONMENT`,
`DODO_PAYMENTS_RETURN_URL`, `DODO_BILLING_CURRENCY`, `DODO_PRODUCT_STARTER`,
`DODO_PRODUCT_PRO`, `DODO_PRODUCT_TEAM`), email (`RESEND_API_KEY`,
`FROM_EMAIL`), errors (`SENTRY_DSN`, `SENTRY_TRACES_SAMPLE_RATE`), file
storage (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`,
`R2_BUCKET`), cookies (`COOKIE_DOMAIN`), admin analytics (`ADMIN_EMAILS`),
and token saver tuning (`TOKEN_SAVER_INPUT_BUDGET`, `TOKEN_SAVER_KEEP_TURNS`,
`TOKEN_SAVER_MAX_TOKENS`, `EXACT_CACHE_TTL_SECONDS`, `TOKEN_SAVER_SUMMARY`).
Stripe vars (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) are legacy in the
template — billing is Dodo Payments.

Frontend env (repo root, `.env.example` → `.env.local`):

| Variable | Notes |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8787` |
| `NEXT_PUBLIC_ADMIN_EMAILS` | Optional comma-separated admin emails for UI gating |

Never commit real values — `.env`, `.env.*`, and `*.env` are gitignored
(`fly.env` included; the `!=*.env.example` exception keeps templates tracked).

### 4. Database

```bash
# only when the schema changed — generates a new migration
npm run db:generate --workspace @layerflow/api

# apply migrations to DATABASE_URL
npm run db:migrate --workspace @layerflow/api
```

Optional local/demo seed (refuses a Neon/remote `DATABASE_URL` unless
`ALLOW_PROD_SEED=1` — never run against production): creates a sample user
`alex@layerflow.dev`, workspace, demo prompts, and learning content.

```bash
npm run db:seed --workspace @layerflow/api
```

Sanity-check migrations without Docker: `npm run db:verify --workspace @layerflow/api`.

### 5. Run

```bash
npm run dev
```

Starts all three processes concurrently (Next.js on `http://localhost:3000`,
Hono API on `http://localhost:8787`, BullMQ worker). Verify the API:

```bash
curl http://localhost:8787/health
# → {"status":"ok","checks":{"db":true,"redis":true}}
```

Useful scripts (root): `npm run dev:web`, `npm run dev:api`, `npm run dev:worker`,
`npm run build` (Next.js), `npm run typecheck`, `npm run lint`, `npm test`,
`npm run check:prod`, `npm run deploy:api`.

## API overview

Two auth styles: `/api/*` uses the browser session cookie (Better Auth,
`requireAuth`); `/v1/*` uses a LayerFlow API key (`Authorization: Bearer lf_…`).
All route groups below come from `apps/api/src/routes/index.ts`; the full
endpoint map is in `apps/api/README.md`.

| Route group | What it does |
| --- | --- |
| `/api/auth/*` | Better Auth — Google OAuth callback, session, sign-out (mounted in `app.ts`) |
| `/health`, `/health/live`, `/health/ready` | Combined, liveness, and readiness checks (db + redis) |
| `/api/workspaces` | Current workspace + rename |
| `/api/domains`, `/api/projects`, `/api/folders` | Workspace organization (domains, projects, folders) |
| `/api/activity` | Recent workspace activity feed |
| `/api/prompts` | Prompts: CRUD, immutable versions, restore, clone from community |
| `/api/sessions` | Prompt sessions + messages |
| `/api/files` | File upload/download (local disk or R2 presigned URLs) |
| `/api/runs` | Model runs (budget reserve → provider → persist) + SSE streaming |
| `/api/audio` | Text-to-speech (ElevenLabs, only when a key is configured) |
| `/api/billing` | Subscription status, checkout, webhook (Dodo Payments) |
| `/api/compare` | Multi-model compare jobs (BullMQ) |
| `/api/intelligence` | Prompt analysis, model recommendations, model routing |
| `/api/workspace/settings` | Routing mode (manual/suggest/auto) + preferences |
| `/api/routing-rules` | Custom routing rules |
| `/api/budgets` | Monthly/daily limits + live spend (scopes, hard blocks) |
| `/api/usage` | Spend summary + threshold alerts |
| `/api/savings` | Cache-hit / cheaper-model savings suggestions |
| `/api/keys` | LayerFlow gateway API keys (`lf_…`, secret shown once) |
| `/api/provider-keys` | BYOK provider keys (AES-256-GCM encrypted at rest) |
| `/api/memory` | Workspace memories + pgvector semantic search |
| `/api/search`, `/api/similar` | Keyword search; semantically similar prompts |
| `/api/learning` | Learning paths, lessons, challenges, progress |
| `/api/rescue` | Rescue reports (context summary, improved prompt, context diff, costs, continue pack) |
| `/api/improve` | Improve + score a prompt (paid LLM call per request, rate-limited) |
| `/api/agents` | Agent templates + runs |
| `/api/chat` | Chat sessions, provider switch, auto-switch, keys health |
| `/api/team` | Team members, roles, invitations and RBAC |
| `/api/v1/sync` | CLI sync protocol (handshake/push/pull) + dashboard operations/devices |
| `/api/collections` | Public prompt collections |
| `/api/profiles`, `/api/follows`, `/api/likes`, `/api/comments` | Community: profiles, follows, likes, comments |
| `/api/notifications` | Notifications + mark-read |
| `/api/admin` | Admin analytics (email allowlist) |
| `/v1` | OpenAI-compatible gateway: `/v1/models`, `/v1/chat/completions` (cache + budgets) |

> Note: there is no `/api/passports` group — rescue context is a field of
> the rescue report, and the database column/type is `context` (renamed from
> `passport` in migration `0014`).

## Go CLI (`terminal/`)

A local-first AI terminal workspace. Build from source (`terminal/README.md`):

```bash
cd terminal
go mod tidy        # refresh go.sum if dependencies change
go build ./...     # or: make build → bin/lf
```

Commands (from `lf/cmd/lf/root.go`):

| Command | Status |
| --- | --- |
| `lf login` / `lf logout` | Device-code OAuth login; revoke + purge tokens — wired |
| `lf sessions [--id ID] [--delete] [--open]` | List/delete persisted sessions (SQLite) — wired |
| `lf doctor [--audit]` | Diagnostics: config, storage, keychain, audit chain — wired |
| `lf cost [--session ID] [--project]` | Token + cost usage from the local store — wired |
| `lf mcp list` | List MCP servers from config — wired |
| `lf daemon start` / `stop` / `status` | Background daemon lifecycle — wired |
| `lf version` | Show build version — wired |
| `lf chat [query]`, `lf run <task>`, `lf sync`, `lf rescue`, `lf upgrade`, `lf mcp add/remove/health` | **Stubs** — print “not wired in this build yet” |

Note: the constructor wiring (auth, sessions, memory, search, permission, MCP)
is in place, but several commands are explicit stubs and there is no real
provider/memory/search execution yet. Keyboard shortcuts, slash commands, and
config layout: `terminal/README.md`.

## Testing

```bash
# web: unit tests (example: lib/*)
npm test

# API: unit + integration (in-memory Postgres via PGlite, mocked Redis;
# integration tests use Docker Postgres/Redis when they are up, else skip)
npm test --workspace @layerflow/api

# typecheck everything (contracts, model-registry, api, web) — the CI-equivalent
npx tsc --noEmit -p tsconfig.json
npm run typecheck --workspace @layerflow/contracts
npm run typecheck --workspace @layerflow/model-registry
npm run typecheck --workspace @layerflow/api

# API smoke check (needs the API running; skips if not)
npm run smoke --workspace @layerflow/api
```

## Deployment

- **Local infra:** `docker-compose.yml` — Postgres 16 with pgvector and Redis 7,
  matching the `.env.example` defaults.
- **API + worker:** `render.yaml` is the current production path. It builds
  both services from the same image (`apps/api/Dockerfile`, repo root as build
  context — the image serves both `dist/index.js` and `dist/worker.js`):
  - `layerflow-api` (web, port 8787, health-checked on `/health`; runs
    `npm run db:migrate --workspace @layerflow/api` as `preDeployCommand`)
  - `layerflow-api-worker` (worker, `node apps/api/dist/worker.js`)
  - Production env vars are prompted at deploy time (`sync: false` in
    `render.yaml`): `DATABASE_URL`, `REDIS_URL`, `BETTER_AUTH_SECRET`,
    `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
    `PROVIDER_KEYS_KEK`, `WEB_URL`, `API_URL`, `CORS_ORIGINS`,
    `GROQ_API_KEY`, `GROQ_MODEL`, `GEMINI_API_KEY`, `GEMINI_MODEL`,
    `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, `ELEVENLABS_MODEL_ID`,
    `RESEND_API_KEY`, `DODO_PAYMENTS_API_KEY`, `DODO_PAYMENTS_WEBHOOK_KEY`,
    `DODO_PAYMENTS_ENVIRONMENT`, `DODO_PRODUCT_STARTER`, `DODO_PRODUCT_PRO`,
    `SENTRY_DSN`, `COOKIE_DOMAIN`, `FROM_EMAIL`.
- **Frontend:** deploy the repo root as a Next.js app (e.g. Vercel) with
  `NEXT_PUBLIC_API_URL` set; the shared Hono app handles `/api/*` and `/v1/*`
  same-origin, or point it at the standalone API host.
- **No `fly.toml` in-repo yet** — deployment is via the Render Blueprint. The
  gitignored `fly.env` at the repo root is a local-only secret file used to
  copy values into your host dashboard; it is never tracked or built.

## Docs

- `apps/api/README.md` — full endpoint map, budgets, seeding, conventions
- `docs/tech-stack.md`, `docs/architecture.md`, `docs/workflow.md`
- `terminal/README.md` — CLI reference
- `flow.md` — repo map started here