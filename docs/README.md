# LayerFlow Docs

Start here. This folder is intentionally small — only current, authoritative
docs. (Historical planning notes were removed; `git log` has them if needed.)

## Read in this order (new engineer onboarding, ~2 hours)

1. **[../README.md](../README.md)** — what LayerFlow is, repo map, getting started.
2. **[PRODUCT-STATUS.md](PRODUCT-STATUS.md)** — honest snapshot: every feature, what works, what's left, scores. Read this before touching anything.
3. **[architecture.md](architecture.md)** — the three surfaces (web / API+worker / terminal) and how they connect.
4. **[tech-stack.md](tech-stack.md)** — the full stack with versions.
5. **[DEPLOYMENT.md](DEPLOYMENT.md)** — zero-to-production. The one remaining blocker (worker not running in prod) lives here.

## Reference

| Doc | When to read |
|---|---|
| [API.md](API.md) | Adding/changing an API route or SSE event |
| [SECURITY.md](SECURITY.md) | Touching auth, keys, encryption, webhooks |
| [ROADMAP.md](ROADMAP.md) | What's planned next |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to commit, test, and ship |
| [blog-content-master-prompt.md](blog-content-master-prompt.md) | Writing/marketing content |
| [blog-publish-schedule.md](blog-publish-schedule.md) | Content calendar |
| [blog-seo-research-report-2026.md](blog-seo-research-report-2026.md) | Keyword research |

## Per-package READMEs (deeper detail)

- `apps/api/README.md` — full endpoint map, budgets, seeding, conventions.
- `terminal/README.md` — `lf` CLI command reference.

## Commands cheat-sheet

```bash
# Web (repo root)
npm run dev          # next dev (web only)
npm run build        # production build (verifies all pages)
npm run typecheck    # tsc --noEmit (whole monorepo)
npm run lint

# API (workspace)
npm run dev          --workspace @layerflow/api   # tsx watch src/index.ts
npm run worker       --workspace @layerflow/api   # tsx watch src/worker.ts
npm run test         --workspace @layerflow/api   # vitest (25 files)
npm run typecheck    --workspace @layerflow/api
npm run build        --workspace @layerflow/api   # tsup → dist/

# Terminal (Go)
cd terminal && go build ./... && go vet ./... && go test ./...
```

## The one thing to know

LayerFlow is **one deployment away from real**. The web + API + terminal all
build and pass tests. The single production blocker is: the BullMQ **worker
does not run in production** (Vercel can't hold a persistent worker), so
rescue / compare / agents / memory-extract / usage-rollups queue but never
process. Deploy the API + worker to a long-running host (Render or Fly) —
`DEPLOYMENT.md` walks through it. Everything else unblocks from that one move.
