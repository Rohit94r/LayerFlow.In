---
name: layerflow
description: >-
  LayerFlow V2 rebuild workflow. Use when working on the LayerFlow repo
  (web + Hono API + BullMQ worker + Go `lf` CLI) to verify builds, run tests,
  and execute the phased plan in 31August.md. Trigger on any chat/agent/terminal
  work, pulling/merging, committing, or "make it work" requests.
---

# LayerFlow — Working Routine

LayerFlow is one product across four surfaces that share **one backend**:
Next.js web (`app/`, `components/`, `lib/`), a Hono API + BullMQ worker
(`apps/api/`), shared contracts/packages (`packages/`), and a Go terminal CLI
(`terminal/`, binary `lf`). The truth is PostgreSQL (pgvector) with Redis for
queues/cache/budget reserves.

**Mandatory:** the authoritative task list is `31August.md` at the repo root.
Work it **phase-by-phase, top to bottom**. Never skip to shiny features —
reliability first.

## Before touching anything

1. Read `31August.md` — find the first unchecked box in the current phase.
2. Inspect the actual code before editing. Never assume mock/fake — check the
   route + service + frontend binding (many surfaces look fake but are wired).
3. Never remove test mocks used by automated tests; only remove production mocks.

## Every commit — run the full quality gate

```bash
npx tsc --noEmit                                   # typecheck all (CI-equivalent)
npm test                                           # web unit tests
npm test --workspace @layerflow/api                # API unit + integration
(cd terminal && go build ./... && go vet ./... && go test -race ./...)
npx next build                                     # production web build
```

Fix any failure before committing. Do not declare success because code compiles —
run the app and verify behavior.

## Key facts (so you don't re-audit)

| Question | Answer |
| --- | --- |
| Chat hangs? | Provider call watchdog in `apps/api/src/services/chat/router.ts` aborts no-first-delta ~25s / idle ~45s, marks key `provider_timeout`, failover moves on |
| Terminal chat stalls after first word? | TUI stream pump must be re-armed per chunk — `streamChunkMsg` must return `a.drainStream` (see `terminal/internal/tui/app.go` + `chat.go`) |
| Single model truth? | `packages/model-registry/src/index.ts`. Web `lib/data/providers.ts` still has a fiction catalog — Phase 3 must kill it |
| Budgets? | Redis Lua reserve/settle + immutable `usage_ledger`; durable source is Postgres |
| Agents? | Backend REAL (templates/runs/approvals); **tool execution is the big missing build** (Phase 6) |
| Session parity web↔`lf`? | Same Hono API + protocol; CLI push works, pull is a no-op (Phase 5/7) |

## Dev loop

Use the commands in `31August.md` → "Daily dev loop":
`npm run dev` (web :3000 + api :8787 + worker), `npm run db:migrate
--workspace @layerflow/api`, `cd terminal && go run ./cmd/lf`.

## Phase of focus (set by 31August.md)

- **Phase 1** truth & docs — stale `docs/tech-stack.md`, `docs/architecture.md`
- **Phase 2** chat works end-to-end (needs a real provider key, Phase 11)
- **Phase 3** one model registry (kill fiction catalog)
- **Phase 5** terminal bugs — DO EARLY (small, huge UX win)
- **Phase 6** agent runtime + tools — biggest build
- **Phase 10** CI + E2E + `docs/PRODUCTION_AUDIT.md` honest verdict

## Rules

- Inspect before modifying. Reuse existing working code. No duplicates.
- Do not fabricate model support, users, revenue, or success states.
- Never expose secrets; never bypass permissions; never log raw private content
  or provider keys.
- Document the actual implementation. If it isn't wired, don't call it done.