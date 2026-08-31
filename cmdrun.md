# LayerFlow — All Run Commands

One platform: **Web app (Next.js 16)** + **API/worker (Hono + BullMQ)** + **Terminal agent (Go CLI `lf`)**.
Run everything locally with a few commands. All commands assume the repo root
(`/Users/rohitjadhav/Documents/LayerFlow`) unless noted.

---

## 1. Prerequisites

| Tool | Version / Notes |
| --- | --- |
| Node.js | 22+ |
| npm | npm workspaces monorepo |
| Docker Desktop | optional — only for local Postgres + Redis |
| Go | 1.25+ (`check `go version`) — only for the `lf` CLI |

---

## 2. Install dependencies

```bash
# from repo root — installs web + api + contracts + model-registry
npm install
```

---

## 3. Local infrastructure (optional)

Starts Postgres 16 (pgvector, `localhost:5432`) + Redis 7 (`localhost:6379`).
**Skip this if `DATABASE_URL` / `REDIS_URL` already point at Neon/Upstash.**

```bash
docker compose up -d
```

Verify:
```bash
docker compose ps        # both should be "running (healthy)"
```

---

## 4. Environment setup

### API env (required)
```bash
cp apps/api/.env.example apps/api/.env
```

Generate the two required secrets:
```bash
openssl rand -hex 32     # → BETTER_AUTH_SECRET
openssl rand -hex 32     # → PROVIDER_KEYS_KEK (must be 64 hex chars)
```

Fill these in `apps/api/.env` — the API refuses to start without them:

| Variable | Value (local) |
| --- | --- |
| `DATABASE_URL` | `postgres://layerflow:layerflow@localhost:5432/layerflow` (already in template) |
| `REDIS_URL` | `redis://localhost:6379` (already in template) |
| `BETTER_AUTH_SECRET` | `openssl rand -hex 32` |
| `PROVIDER_KEYS_KEK` | `openssl rand -hex 32` |
| `BETTER_AUTH_URL` | `http://localhost:8787` |
| `WEB_URL` | `http://localhost:3000` |
| `API_URL` | `http://localhost:8787` |
| `CORS_ORIGINS` | `http://localhost:3000` |

Optional but useful so model runs work without BYOK:
```bash
# examples — uncomment/add in apps/api/.env
# GROQ_API_KEY=gsk_...      GROQ_MODEL=llama-3.3-70b-versatile
# GEMINI_API_KEY=...        GEMINI_MODEL=gemini-flash-latest
# DEEPSEEK_API_KEY=sk-...   DEEPSEEK_MODEL=deepseek-chat
```

### Frontend env (required to reach the API)
```bash
cp .env.example .env.local
```
Confirm `.env.local` has `NEXT_PUBLIC_API_URL=http://localhost:8787`.

---

## 5. Database

```bash
# only when the schema changed — generates a new migration
npm run db:generate --workspace @layerflow/api

# apply migrations to DATABASE_URL
npm run db:migrate --workspace @layerflow/api

# optional local/demo seed (never against Neon/prod unless ALLOW_PROD_SEED=1)
npm run db:seed --workspace @layerflow/api

# sanity-check migrations without Docker
npm run db:verify --workspace @layerflow/api
```

---

## 6. RUN EVERYTHING (three processes at once)

Starts **Next.js (`:3000`) + Hono API (`:8787`) + BullMQ worker** concurrently:

```bash
npm run dev
```

Verify the API:
```bash
curl http://localhost:8787/health
# → {"status":"ok","checks":{"db":true,"redis":true}}
```

### Run processes individually

| Process | Command | Port |
| --- | --- | --- |
| Web (Next.js) | `npm run dev:web` | 3000 |
| API (Hono) | `npm run dev:api` | 8787 |
| Worker (BullMQ) | `npm run dev:worker` | — |

---

## 7. API / Worker workspace scripts (`apps/api`)

```bash
# production build (tsup → dist/index.js + dist/worker.js)
npm run build --workspace @layerflow/api

# run the built API
npm run start --workspace @layerflow/api

# run the built worker
npm run worker --workspace @layerflow/api

# maintenance / ops scripts
npm run usage:rollup     --workspace @layerflow/api
npm run usage:reconcile  --workspace @layerflow/api
npm run smoke            --workspace @layerflow/api   # needs API running
```

---

## 8. Testing & quality

```bash
# web unit tests
npm test

# API unit + integration (PGlite in-memory Postgres, mocked Redis; integration
# tests use Docker Postgres/Redis when up, else skip)
npm test --workspace @layerflow/api

# typecheck everything (contracts, model-registry, api, web) — CI-equivalent
npx tsc --noEmit -p tsconfig.json
npm run typecheck --workspace @layerflow/contracts
npm run typecheck --workspace @layerflow/model-registry
npm run typecheck --workspace @layerflow/api

# lint
npm run lint
```

---

## 9. Build & run production web

```bash
npm run build    # Next.js production build
npm start        # serve the built web app (don't skip the build)
```

---

## 10. Terminal CLI (`lf`) — Go

```bash
cd terminal

# build / vet / test
go mod tidy          # refresh go.sum if dependencies change (required once)
go build ./...
go vet ./...
go test -race ./...
go run ./cmd/lf      # dev run (no binary)

# or use the Makefile
make build           # → bin/lf
make dev             # → go run ./cmd/lf
make install         # go install
make run             # build + ./bin/lf
make vet / make lint / make test / make ci / make clean
```

### `lf` commands

```bash
./bin/lf                       # full-screen TUI (home → chat, palette, sessions, models)
./bin/lf login                 # paste a platform key (lf_live_…) from dashboard → API Keys
./bin/lf logout                # revoke + purge
./bin/lf chat [query]          # streaming chat (interactive; add --non-interactive)
./bin/lf run "<task>"          # single-shot task agent with tool approvals
./bin/lf sessions [--id ID] [--delete]
./bin/lf sync [--dry-run]      # push/pull with the cloud sync API
./bin/lf models [--json]
./bin/lf doctor [--audit]
./bin/lf rescue                # export portable snapshot
./bin/lf cost [--session ID] [--project]
./bin/lf mcp list
./bin/lf daemon start|stop|status
./bin/lf upgrade
./bin/lf version

# content automation
./bin/lf content plan --weeks 4 --per-week 3
./bin/lf content status
./bin/lf content draft --all
./bin/lf content publish <slug>
./bin/lf content keywords --file search-console.csv
./bin/lf content cron install --at 09:00
./bin/lf content autopublish [setup --at 09:00 --live]
```

Inside the TUI: `Enter` start chatting · `Ctrl+P` palette · `Ctrl+R` search ·
`Ctrl+K` sessions · `Ctrl+M` models · `Ctrl+T` activity · `?` help · `Esc` back ·
`Ctrl+C` cancel/quit.

---

## 11. Production checks & deployment

```bash
# production readiness probe (site, DNS, health endpoints)
npm run check:prod

# deploy API + worker to Fly.io (uses .vercel.env secrets, flyctl, Docker)
npm run deploy:api

# print Vercel Production env vars needed for layerflow.dev sign-in
bash scripts/vercel-env-checklist.sh
```

---

## 12. Useful curl checks

```bash
curl http://localhost:8787/health                 # API health (db + redis)
curl http://localhost:8787/health/live            # liveness
curl http://localhost:8787/health/ready           # readiness
curl http://localhost:3000/api/lf-health          # Vercel health proxy
```

---

## Troubleshooting

- **`port 3000` / `8787` in use** — stop the stray process, or set `PORT=8788` in `apps/api/.env`.
- **API won't start** — missing `DATABASE_URL`, `REDIS_URL`, `BETTER_AUTH_SECRET`, or `PROVIDER_KEYS_KEK` (see §4).
- **Worker never processes jobs** — BullMQ worker must be running; `npm run dev` starts it, or run `npm run dev:worker`.
- **`lf` login not working** — your `lf_live_…` key comes from the dashboard **API Keys → Platform keys**; use `lf login --api-key <key>` to paste it.
- **No models available** — set a platform provider key (e.g. `DEEPSEEK_API_KEY`) in `apps/api/.env`, or add a BYOK key in **Settings → Provider keys**.
