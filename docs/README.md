# LayerFlow Docs

Start here. This folder is intentionally small — only current, authoritative
docs. Historical planning notes and one-off audit snapshots live in
`archive/` (`git log` has earlier ones if needed).

## Read in this order (new engineer onboarding, ~2 hours)

1. **[../README.md](../README.md)** — what LayerFlow is, repo map, getting started.
2. **[../ARCHITECTURE.md](../ARCHITECTURE.md)** — the full "where is what" code map. Start here when you don't know where something lives.
3. **[PRODUCT-STATUS.md](PRODUCT-STATUS.md)** — honest snapshot: every feature, what works, what's left, scores. Read this before touching anything.
4. **[DEPLOYMENT.md](DEPLOYMENT.md)** — Fly.io + Docker, zero to production.

## Sub-folders

- `ops/` — ops runbooks (deployment commands now live in `DEPLOYMENT.md`).

## Reference

| Doc | When to read |
|---|---|
| [API.md](API.md) | Adding/changing an API route or SSE event |
| [SECURITY.md](SECURITY.md) | Touching auth, keys, encryption, webhooks |
| [PRODUCT-STATUS.md](PRODUCT-STATUS.md) | The honest feature/score snapshot |
| [BUG_LOG.md](BUG_LOG.md) | Known bugs and their resolutions |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Deploy + everyday ops commands |
| [PRODUCTION-GO.md](PRODUCTION-GO.md) | The live-deploy runbook (run this in order) |

## Forward-looking docs (at the repo root)

- `../context.md` — plain-English product overview (stack, features, status, pricing, future).
- `../nextplan.md` — the 5-phase plan, split by feature/cleanup/deploy work. Say "do phase N".
- `./research.md` — the market reality check that drives `nextplan.md`.

## Per-package READMEs (deeper detail)

- `apps/api/README.md` — full endpoint map, budgets, seeding, conventions.
- `terminal/README.md` — `lf` CLI command reference.

## Commands cheat-sheet

```bash
# Web (apps/web)
npm run dev          --workspace @layerflow/web   # next dev
npm run build        --workspace @layerflow/web   # production build (verifies all pages)
npm run typecheck    # tsc --noEmit (whole monorepo)
npm run lint

# API (workspace)
npm run dev          --workspace @layerflow/api   # tsx watch src/index.ts
npm run worker       --workspace @layerflow/api   # tsx watch src/worker.ts
npm run test         --workspace @layerflow/api   # vitest
npm run typecheck    --workspace @layerflow/api
npm run build        --workspace @layerflow/api   # tsup → dist/

# Terminal (Go)
cd terminal && go build ./... && go vet ./... && go test ./...

# Production (Fly.io + Docker)
npm run deploy:api   # secrets + build + deploy + scale app=1 worker=1
npm run check:prod   # verify site, DNS, API + worker health
```

## The one thing to know

LayerFlow is **one deployment away from real** — and the deploy is fully
scripted. Web + API + terminal all build and pass tests. `fly.toml` ships two
process groups (`app` API + `worker` BullMQ) from one Docker image; running
`npm run deploy:api` puts both on Fly, which unblocks rescue / compare / agents
/ memory-extract / usage-rollups. `DEPLOYMENT.md` walks through it.