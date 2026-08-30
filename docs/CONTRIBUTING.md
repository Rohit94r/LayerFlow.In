# Contributing

## Stack

- **Web:** Next.js 16 (App Router) at the repo root.
- **API + worker:** Hono + Drizzle + Postgres (pgvector) + Redis (BullMQ) in
  `apps/api`.
- **Shared packages:** `packages/contracts` (zod schemas shared web↔api),
  `packages/model-registry` (provider/model/cost data).
- **CLI:** Go (`terminal/`, TUI via Bubble Tea).

Node 22 and Go ≥1.23 are required. Postgres + Redis run via Docker Compose.

## First-time setup

```bash
npm install          # installs workspace deps (uses package-lock)
docker compose up -d # Postgres (pgvector) + Redis on localhost
cp apps/api/.env.example apps/api/.env   # then fill in values (see file)
npm run db:migrate --workspace @layerflow/api   # apply migrations
npm run db:seed --workspace @layerflow/api      # optional demo data (dev only)
```

`apps/api/.env` needs at minimum `DATABASE_URL`, `REDIS_URL`, and
`BETTER_AUTH_SECRET` (for local Google OAuth, also `GOOGLE_CLIENT_ID` /
`GOOGLE_CLIENT_SECRET` and `WEB_URL=http://localhost:3000`).

## Running

```bash
npm run dev          # web (:3000) + api (:8787) + worker concurrently
```

Useful subsets: `npm run dev:web`, `npm run dev:api`, `npm run dev:worker`.

## Commands

| Command | What it does |
|---|---|
| `npm run lint` | ESLint over the whole repo (0 errors; ~90 pre-existing warnings). |
| `npm run typecheck` | Repo-root `tsc --noEmit`. |
| `npm run typecheck --workspace @layerflow/{api,contracts,model-registry}` | Per-package typechecks. |
| `npm test` | Vitest (web tests). |
| `npm test --workspace @layerflow/api` | API test suite (150 tests, in-memory PGlite + mocked Redis). |
| `npm run db:verify --workspace @layerflow/api` | Replays all migrations against in-memory Postgres. |
| `npm run build` | Next.js production build. |
| `npm run build --workspace @layerflow/api` | tsup API bundle (`dist/index.js` + `dist/worker.js`). |
| `npm run smoke --workspace @layerflow/api` | Hits `/health` on the running API (skips when not running). |
| `npm run check:prod` | `scripts/check-production.sh` — live health checks. |
| `npm run deploy:api` | `scripts/deploy-api-prod.sh` — scripted Fly.io API deploy. |
| `bash scripts/deploy-api-prod.sh` | Scripted Fly.io deploy of the API (reads `.vercel.env`). |
| Go CLI | `cd terminal && go build ./... && go vet ./... && go test -race ./...` |

## Go CLI

```bash
cd terminal
go build -o bin/lf .     # produces bin/lf
./bin/lf --help
go test ./...            # unit tests (none yet — see ROADMAP)
```

## CI

`.github/workflows/ci.yml` runs on push/PR to `main`:

- **build** job: typecheck (contracts → model-registry → api), `db:verify`,
  API tests, API bundle build, Next.js build, root typecheck.
- **go-cli** job: `go build ./...`, `go vet ./...`, `go test ./...`.

No repository secrets are required; tests run against PGlite + mocked Redis.

## Making changes

1. Create a branch (`git checkout -b fix/…` or `feat/…`).
2. Add tests alongside the change (API tests live in `apps/api/src/test/`,
   web tests in `app/**/__tests__`).
3. Run the checks above for the areas you touched (minimum: relevant
   typecheck + tests + `npm run lint`).
4. **Migrations are additive-only.** New columns/tables go in a new numbered
   Drizzle migration; never edit or renumber an applied migration. Rollback is
   "deploy the old release," not "revert a migration."
5. Open a PR against `main`. CI must be green.

## Docs

- `docs/DEPLOYMENT.md` — production deployment (env vars, hosts, migrations).
- `docs/API.md` — REST + SSE reference. Update when routes change.
- `docs/SECURITY.md` — security model + incident checklist.
- `docs/architecture.md`, `docs/tech-stack.md` — background reading.
- `docs/lf-terminal.md` design notes have been folded into `terminal/README.md`; read the code in `terminal/`.
