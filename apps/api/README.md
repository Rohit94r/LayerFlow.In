# LayerFlow API (`apps/api`)

The LayerFlow backend: a [Hono](https://hono.dev) HTTP API plus a BullMQ job
worker, sharing one TypeScript codebase. Postgres (with pgvector) is the source
of truth; Redis handles budgets, caching, and the job queue.

> **Deviation from docs/backend.md:** the docs propose Upstash **QStash + a
> separate `apps/worker` app** for background jobs. This implementation uses
> **BullMQ on Redis instead, as a second entrypoint in this same package**
> (`src/worker.ts`, run with `npm run worker`). It is simpler to run locally
> (one repo, one Redis, no public callback URL needed) and works with Upstash
> Redis in production. Everything else follows the docs.

## Prerequisites

- Node.js 22+
- Docker Desktop (for local Postgres + Redis)
- A Google account (to create the OAuth client)

## Run it locally, step by step

All commands run from the **repo root** unless noted.

### 1. Install dependencies

```bash
npm install
```

### 2. Start Postgres and Redis

```bash
docker compose up -d
```

This starts Postgres 16 with pgvector on `localhost:5432` and Redis 7 on
`localhost:6379` (config: `docker-compose.yml` at the repo root).

### 3. Create your env file

```bash
cp apps/api/.env.example apps/api/.env
```

Then edit `apps/api/.env`:

- `BETTER_AUTH_SECRET` — run `openssl rand -hex 32` and paste the output.
- `PROVIDER_KEYS_KEK` — run `openssl rand -hex 32` again (different value).
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — next step.

The database/Redis URLs already match docker compose defaults.

### 4. Create a Google OAuth client

1. Go to [console.cloud.google.com](https://console.cloud.google.com) and
   create a project (e.g. "LayerFlow Dev").
2. **APIs & Services → OAuth consent screen**: choose **External**, fill in
   the app name and your email, save. You don't need to submit for
   verification for local dev — add your own Google account under
   **Test users**.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**
   - Authorized JavaScript origins: `http://localhost:3000` and `http://localhost:8787`
   - Authorized redirect URI: **`http://localhost:8787/api/auth/callback/google`**
4. Copy the client ID and secret into `apps/api/.env`.

### 5. Create the database tables

```bash
npm run db:migrate --workspace @layerflow/api
```

(Optional) sanity-check migrations without Docker:
`npm run db:verify --workspace @layerflow/api` applies them to an in-memory
Postgres.

### 6. Seed dev data

```bash
npm run db:seed --workspace @layerflow/api
```

Creates a dev user (`alex@layerflow.dev`), their workspace with the 9 default
domains, a budget, and a few projects/prompts/versions matching the frontend
mock data.

### 7. Start the API (and worker)

```bash
npm run dev --workspace @layerflow/api       # API on http://localhost:8787
npm run worker --workspace @layerflow/api    # job worker (separate terminal)
```

Check it's alive: `curl http://localhost:8787/health` →
`{"status":"ok","checks":{"db":true,"redis":true}}`.

Sign-in flow: the frontend calls Better Auth's
`signIn.social({ provider: "google" })` against
`http://localhost:8787/api/auth/*`. On first login the API automatically
creates your workspace, membership, settings, budget, and default domains.

### 8. Quick smoke check

```bash
npm run smoke --workspace @layerflow/api
```

Hits `GET /health` and tells you whether Postgres and Redis are reachable.
If the API isn't running it prints a "skipped" message instead of failing.

## Endpoint map

Two auth styles: everything under `/api/*` uses the **browser session cookie**
(Better Auth, via `requireAuth`); everything under `/v1/*` uses a **LayerFlow
API key** in `Authorization: Bearer lf_...` (via `requireApiKey`).

### Auth & health

| Method & path | What it does |
|---|---|
| `GET/POST /api/auth/*` | Better Auth (Google sign-in, OAuth callback, session, sign-out) |
| `GET /health` | Liveness + db/redis dependency check |

### Workspace (`src/routes/workspace/`)

| Method & path | What it does |
|---|---|
| `GET /api/workspaces/current` | Current workspace + your membership |
| `PATCH /api/workspaces/:id` | Rename workspace |
| `GET/POST /api/domains`, `PATCH/DELETE /api/domains/:id` | Domains (Coding, Marketing, ...) |
| `GET/POST /api/projects`, `PATCH/DELETE /api/projects/:id` | Projects (filter with `?domain=`) |
| `GET/POST /api/folders`, `PATCH/DELETE /api/folders/:id` | Folders inside projects |
| `GET /api/activity` | Recent workspace activity feed |

### Prompts & sessions (`src/routes/prompts/`, `src/routes/sessions/`)

| Method & path | What it does |
|---|---|
| `GET/POST /api/prompts` | List (filters: project, folder, tag, favorite) / create |
| `GET/PATCH/DELETE /api/prompts/:id` | Read / update (tags, favorite, move) / delete |
| `GET/POST /api/prompts/:id/versions` | Timeline / save a new immutable version |
| `GET /api/prompts/:id/versions/:versionId` | One version with outputs |
| `POST /api/prompts/:id/restore/:versionId` | Restore: copies an old version as a new head version |
| `POST /api/prompts/:id/clone` | Clone a public community prompt into your workspace |
| `GET/POST /api/sessions`, `GET/PATCH/DELETE /api/sessions/:id` | Prompt sessions |
| `POST /api/sessions/:id/messages` | Append a message to a session |

### Files (`src/routes/files/`)

| Method & path | What it does |
|---|---|
| `POST /api/files/upload-url` | Create file record + upload target (local disk or R2 presigned URL) |
| `PUT /api/files/:id/content` | Upload bytes (local dev target) |
| `POST /api/files/complete` | Mark upload done, optionally attach to a prompt |
| `GET /api/files/:id/download-url` / `GET /api/files/:id/content` | Download |
| `DELETE /api/files/:id` | Delete |

### Runs, compare, intelligence (`src/routes/runs/`, `compare/`, `intelligence/`)

| Method & path | What it does |
|---|---|
| `POST /api/runs` | Execute a model call (budget reserve → provider → persist run) |
| `POST /api/runs/stream` | Same, as SSE events (`start` → `delta` → `done`) |
| `GET /api/runs`, `GET /api/runs/:id` | Run history / detail |
| `POST /api/compare` | Enqueue a multi-model compare job (BullMQ) |
| `GET /api/compare/:jobId` | Poll compare status + ranked results |
| `POST /api/intelligence/analyze` | Analyze prompt (tokens, task type, complexity) |
| `POST /api/intelligence/recommend` | Model recommendations with reasons |
| `POST /api/intelligence/route` | Pick a model per workspace routing mode + rules |
| `GET/PUT /api/workspace/settings` | Routing mode (manual/suggest/auto) + preferences |
| `GET/POST/PATCH/PUT/DELETE /api/routing-rules` | Custom routing rules |

### Budgets, usage, keys (`src/routes/budgets/`, `keys/`)

| Method & path | What it does |
|---|---|
| `GET/PUT /api/budgets/current` | Workspace monthly/daily limits + live spend |
| `GET/PUT /api/budgets/scopes` | Per-project and per-key budget scopes |
| `GET /api/usage/summary` | Spend grouped by day/provider/model/source |
| `GET /api/usage/alerts` | Threshold alerts (50/80/100%) |
| `GET /api/savings` | Cache-hit and cheaper-model savings suggestions |
| `POST/GET /api/keys`, `DELETE /api/keys/:id` | LayerFlow gateway API keys (secret shown once) |
| `POST/GET /api/provider-keys`, `DELETE /api/provider-keys/:id` | BYOK provider keys (AES-256-GCM encrypted) |

### Gateway — OpenAI-compatible (`src/gateway/router.ts`)

| Method & path | What it does |
|---|---|
| `GET /v1/models` | Models from the registry, flagged available per your BYOK keys |
| `POST /v1/chat/completions` | Chat completion: cache → budget reserve → provider → settle + log |

### Memory, search, learning, community

| Method & path | What it does |
|---|---|
| `GET/POST /api/memory`, `GET/PATCH/DELETE /api/memory/:id` | Workspace memories |
| `GET /api/memory/search?q=` | Semantic memory search (pgvector) |
| `GET /api/search?q=` | Keyword search across prompts/projects/sessions |
| `GET /api/similar?promptId=` | Semantically similar prompts |
| `GET /api/learning/paths`, `/paths/:id`, `/lessons/:id` | Learning content (seeded) |
| `GET /api/learning/challenges`, `POST /api/learning/challenges/:id/submit` | Challenges |
| `GET /api/learning/progress` | Your progress |
| `GET/POST /api/collections`, `GET/PATCH/DELETE /api/collections/:id` (+ `/items`) | Prompt collections |
| `GET/PATCH /api/profiles/me`, `GET /api/profiles/:userId` | Public profiles |
| `POST/DELETE /api/follows/:userId` | Follow / unfollow |
| `POST/DELETE /api/likes`, `GET/POST /api/comments`, `DELETE /api/comments/:id` | Social |
| `GET /api/notifications`, `POST /api/notifications/read` | Notifications |

## Use the gateway: create a key and call it

1. Sign in with Google (so you have a session), then store a provider key
   (BYOK) — e.g. your OpenAI key, encrypted at rest:

```bash
curl -X POST http://localhost:8787/api/provider-keys \
  -H "Content-Type: application/json" -b cookies.txt \
  -d '{"provider":"openai","secret":"sk-...your-openai-key..."}'
```

2. Create a LayerFlow API key. **The secret is returned only once** — save it:

```bash
curl -X POST http://localhost:8787/api/keys \
  -H "Content-Type: application/json" -b cookies.txt \
  -d '{"name":"my-app"}'
# → { "key": {...}, "secret": "lf_..." }
```

3. Call the OpenAI-compatible endpoint with that secret:

```bash
curl -X POST http://localhost:8787/v1/chat/completions \
  -H "Authorization: Bearer lf_...your-secret..." \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"Say hi"}]}'
```

Identical requests are served from the exact cache (`x-layerflow-cache: hit`)
and cost nothing. Any OpenAI SDK works too — set `baseURL` to
`http://localhost:8787/v1` and `apiKey` to your `lf_...` secret.

> Tip for step 1–2 from the terminal: it's easier to do these two calls from
> the frontend (or an HTTP client that holds your session cookie). The
> `-b cookies.txt` above assumes you exported your browser session cookie.

## How budgets work

All money is **integer micro-dollars** ($1 = 1,000,000). The flow for every
paid call (playground runs, compare, and gateway):

1. Estimate the max cost from the model's pricing (`@layerflow/model-registry`).
2. **Reserve** that amount atomically in Redis across every applicable scope —
   workspace monthly, workspace daily, project, API key
   (`src/budgets/enforce.ts`, Lua script in `src/budgets/lua.ts`).
3. If a hard-block limit would be exceeded → `402 budget_exceeded`, and the
   provider is **never called**.
4. On success, **settle**: adjust Redis to the actual cost, write an immutable
   `usage_ledger` row, upsert `usage_rollups`, bump `budgets.spent_micro`.
5. On provider failure, **release** the reservation.

Fail-closed: if Redis is down and the budget is hard-block, the gateway
rejects with 503 rather than risking overspend. See
`src/budgets/BUDGET_API.md` for the exact contract.

## How seeding works

`npm run db:seed` is idempotent (safe to re-run) and creates:

- model pricing rows from `@layerflow/model-registry` (if the table is empty)
- a dev user `alex@layerflow.dev` and their onboarded workspace
  (9 default domains, settings, a budget) via `src/services/onboarding.ts` —
  the same code path that runs on first Google login
- sample projects, prompts, versions, and sessions mirroring the frontend
  mock data
- global learning content (paths, lessons, challenges) via
  `src/services/learning/seed.ts`

## Scripts

| Script | What it does |
|--------|--------------|
| `npm run dev` | API with hot reload (tsx watch) on port 8787 |
| `npm run worker` | BullMQ job worker with hot reload |
| `npm run build` / `npm start` | Production build (tsup) / run `dist/index.js` |
| `npm run db:generate` | Generate a new migration from schema changes |
| `npm run db:migrate` | Apply migrations to `DATABASE_URL` |
| `npm run db:seed` | Insert dev data (idempotent) |
| `npm run db:verify` | Apply all migrations to in-memory Postgres (no Docker) |
| `npm test` | Vitest — unit + integration (integration uses Docker Postgres/Redis when up, else in-memory Postgres; Redis-only checks skip) |
| `npm run typecheck` | `tsc --noEmit` |

## Folder structure

```text
apps/api/
├── drizzle/                  # Generated SQL migrations (checked in)
├── scripts/verify-migrations.ts
└── src/
    ├── index.ts              # API entrypoint (serve on PORT)
    ├── app.ts                # Hono app factory: CORS, auth mount, /health, routes
    ├── worker.ts             # Job worker entrypoint (BullMQ)
    ├── types.ts              # AppEnv (Hono context vars: userId, workspaceId, requestId)
    ├── auth/                 # Better Auth instance (Google only, Drizzle adapter)
    ├── config/               # env.ts (zod-validated env), logger.ts (pino)
    ├── db/
    │   ├── client.ts         # Drizzle + pg pool
    │   ├── schema/           # All tables, split by area (auth, tenancy, prompts, ...)
    │   └── seed.ts
    ├── jobs/
    │   ├── queues.ts         # enqueue(name, payload) helper
    │   └── processors/       # one file per job; register in processors/index.ts
    ├── middleware/           # auth (requireAuth), error, request-id, rate-limit stub
    ├── redis/client.ts       # ioredis client + BullMQ connection factory
    ├── routes/
    │   ├── index.ts          # registerRoutes(app) — mount new routers here
    │   └── workspace/workspaces.ts   # reference route implementation
    ├── services/             # crypto.ts (AES-GCM + HMAC), onboarding.ts
    └── test/                 # vitest setup, test session helper, integration tests
```

## Conventions (read before adding code)

- **Money is integer micro-dollars** ($1 = 1,000,000) everywhere — DB columns,
  contracts, Redis. Never floats.
- **Every tenant-owned table has `workspace_id`** with an index, and every
  query must be scoped by `c.get("workspaceId")` from `requireAuth`.
- **Request/response payloads** are zod schemas in `@layerflow/contracts`.
  Parse request bodies with them; the global error handler turns `ZodError`
  into a 400 with `{ error: { code: "validation_error", message } }`.
- **Model pricing** comes from `@layerflow/model-registry`
  (`getModelPricing`, `resolveProvider`, `computeCostMicro`).
- **Errors**: throw `new AppError(status, code, message)` from
  `src/middleware/error.ts`; every error response has the shape
  `{ error: { code, message } }`.
- **New routes**: copy `src/routes/workspace/workspaces.ts`, then mount the
  router in `src/routes/index.ts`.
- **New jobs**: add the name to `JobName` in `src/jobs/queues.ts`, create
  `src/jobs/processors/<name>.ts`, register it in `processors/index.ts`,
  enqueue with `enqueue("<name>", payload)`.
