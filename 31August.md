# LayerFlow — 31 August Working Plan (V2 Master Execution)

> **What this file is:** the single source of truth for the next working session(s).
> Every phase the product needs, in strict execution order, with concrete tasks,
> acceptance criteria, and what is already real vs. what must be built. Work
> through it **phase by phase, top to bottom**. Do not skip ahead to shiny
> features — reliability first, then surface area.
>
> Status legend: ✅ done · 🚧 in progress · ⛔ blocked · ⏳ queued · ❌ gap found
>
> Companion automation: run the repo skill (LayerFlow skill) for standard
> verify commands. This file is the checklist; the skill is the routine.

---

## Audit snapshot (2026-08-31)

The full-repo deep audit showed the product is **far more real** than "nothing
works" implies. The headline issues were traced to a small set of concrete
causes, not missing wiring:

| Symptom you saw | Actual cause | Status |
| --- | --- | --- |
| "Chat does nothing / hangs forever" | All configured platform keys were dead OR a hanging provider had **no timeout**, so chat blocked forever instead of failing over | ✅ Provider watchdog + failover |
| Terminal chat stalls after first word | Bubble Tea stream pump command was only invoked once (never re-armed) | ✅ Re-armed drain pump |
| "Agents do nothing" | Agent backend was real but **no tool framework** executed; runs were planning-only | ⏳ Phase 6 build |
| "Models page is fake" | Web `lib/data/providers.ts` was a canned catalog (gpt-5 / opus-4.5) the platform can't serve | ⏳ Phase 3 fix |
| Web build broken | `499` is not a valid Hono status → `tsc`/build failed | ✅ Fixed |
| Docs lie | `docs/tech-stack.md` describes a product that never shipped; `architecture.md` lists pages that don't exist | ⏳ Phase 1 |

**Verified working today (evidence-backed):** auth (email/Google/device/API-key),
chat SSE streaming + failover, model routing AUTO + key health, `/v1` gateway,
Redis budget reserve/settle + usage ledger, memory (pgvector + extraction job),
hybrid search, files, team/RBAC, rescue/improve/compare, CLI↔web sync push
(pull is a no-op). Test suites: API 150 cases pass (PGlite + mocked Redis), web
unit tests pass, `tsc --noEmit` passes, Go build/vet/test pass, Next production
build passes.

## Execution phases (strict order)

### PHASE 1 — Truth, hygiene & docs
> Make the repo honest before adding anything.

- [x] Full-repo deep audit (feature matrix produced)
- [x] Repair TS build (invalid `499` status → `400` in chat router)
- [x] Repair terminal streaming pump (re-arm `drainStream` per chunk)
- [x] Remove dead mock files (`lib/data/workspace.ts`, `lib/data/prompts.ts`)
- [x] Remove empty packages (`packages/config`, `packages/ui`), empty
      `apps/api/src/services/{analytics,marketing}` dirs, empty `terminal/test/`
- [x] Delete/replace `docs/tech-stack.md` (stale Hinglish doc; describes Stripe/Node CLI/mock phase — removed)
- [x] Rewrite `docs/architecture.md` (now lists the 17 real pages; no `/code`/passport/mock claims)
- [x] Fix stale `docs/API.md` chat routes (`POST /api/chat/:id/switch`, `PATCH /api/chat/:id/auto-switch`, `POST /api/chat/keys-health`; no `/api/chat/:id/memory`)
- [x] Demote Rescue to an import utility in `package.json` description +
        marketing copy (already demoted in sidebar)
- [ ] Archive superseded `docs/REBUILD-PLAN.md` (this file replaces it)

**Acceptance:** every doc describes the actual repo. `grep -r "mock\|TODO"`
in production code returns only intentional test/demo markers.

### PHASE 2 — Chat actually works end-to-end (the headline)
> Maps brief 3, 4, 6, 52.

- [x] Provider watchdog (abort no-first-delta ~25s, idle ~45s, mark
      `provider_timeout` with cooldown so failover skips the hanging endpoint)
- [x] Model registry truth: added `openai/gpt-oss-120b` + `openai/gpt-oss-20b`
      for Groq; swapped deprecated `llama-3.3-70b-versatile` out of chat /
      improve / rescue / agents / memory-extract priority chains + web picker
- [ ] **E2E proof with one real provider key** (see Phase 11 — the only unscaled
      step: you must add a valid `GROQ_API_KEY` or `OPENAI_API_KEY`).
      `signup → session → message → streamed reply → persisted → usage ledger`
- [ ] Context pipeline already REAL (provider isolation, last-8 verbatim,
      Redis-cached summaries, memory retrieval, token budget) — keep; add tests

**Acceptance:** with exactly one healthy provider key, chat replies end-to-end;
with a hanging provider, chat fails over within one watchdog window.

### PHASE 3 — One model registry, one truth
> Maps brief 5, 6, 7, 38, 54.

- [ ] Web consumes `@layerflow/model-registry` directly; kill the fiction
      catalog in `lib/data/providers.ts` (models the platform can't serve)
- [ ] Chat picker stays static-capable but drives from a session-auth `/api/models`
      endpoint (registry + live availability) so it never offers unservable models
- [ ] Verify AUTO router (`intelligence/route.ts`) picks differently for
      coding vs. reasoning vs. large-context requests
- [ ] Add per-provider rolling latency stats into routing decisions
- [ ] Multi-model test matrix: Auto / A / B / unavailable / BYOK — assert model
      ID, provider, tokens, cost, fallback event

**Acceptance:** exactly one model-definition source; Models page + picker show
only servable models; fallback emits `switched` events.

### PHASE 4 — Usage, budgets, observability
> Maps brief 8, 9, 29, 31, 46.

- [x] Budget reserve/settle via Redis Lua + immutable `usage_ledger`
- [ ] Verify reservation release on every failure path (chat settle; gateway; runs)
- [ ] Add job IDs to worker logs; per-model provider latency metrics
- [ ] Costs page: server-provided provider on usage rows (kill client prefix guess)

### PHASE 5 — Terminal critical bugs (small, huge UX win) ✳ DO EARLY
> Maps brief 19, 24, 55, 56, 57.

- [x] Streaming pump re-armed (done in this session)
- [ ] Verify no Git fatal errors in normal UI; raw provider errors surfaced as
      friendly notices; invalid model auto-switch (fallback exists) — run `lf`
      and click through live
- [ ] One LayerFlow theme (orange/white/gray + subtle green/yellow/red) — audit
      any random blue/purple backgrounds
- [ ] Composer fixed bottom; conversation scrolls independently; no cursor
      corruption; no input jump-to-top; no flicker
- [ ] `lf login` device flow returns real key (server mints `lf_live_`)

**Acceptance:** `lf`, `lf login`, `lf models`, `lf cost`, `lf doctor` all work
with no panic, no raw errors, no layout jump, no broken input.
### PHASE 6 — Agent runtime + tools (biggest build)
> Maps brief 10, 11, 12, 15, 16, 40, 53.

- [x] Agent templates, runs, approvals, schedules exist (backend REAL)
- [ ] Wire the **tool framework** (read_file / search_files / write_file /
      edit_file / run_command / web_search / fetch_url / browser / create_report)
      into the agent runner — currently tools are planned but not executed
- [ ] Typed agent state machine: PLAN → ACT → OBSERVE → DECIDE → ACT → VERIFY →
      DONE; every tool call emits structured events
      (planning / tool_requested / tool_approved / tool_started /
      tool_completed / agent_paused / agent_failed / agent_completed)
- [ ] Permission policy: read/search generally allowed; write/run_command need
      approval; delete/deploy/send_email/submit_application need explicit approval
- [ ] Structured artifacts (leads, reports, applications) with CSV / JSON / PDF
      export; PDF generation in the **worker** (not blocking HTTP)
- [ ] Job-application agent: resume upload → profile extraction → search → rank →
      review → approval → submit (only where a target is actually supported)

**Acceptance:** a real coding agent runs on a safe test repo: plan → read →
propose → approve → modify → test → summarize, persisted, visible in browser,
followable in `lf`, cost recorded.

### PHASE 7 — Memory + Search + Context engine
> Maps brief 17, 18, 27, 28, 41.

- [x] Memory: pgvector + extraction job + Redis hot cache; tenant scoped
- [x] Hybrid search (keyword + vector) over prompts/sessions
- [ ] Extend search index to memories, projects, files, agent runs, artifacts,
      terminal sessions
- [ ] One shared context engine used by web chat, terminal, **and** agents
      (keyword + vector, token-budgeted) — no separate context logic per surface

### PHASE 8 — Frontend truth (kill fake surfaces)
> Maps brief 35, 36, 37, 39, 51.

- [ ] Models hub: no fiction catalog (Phase 3 handles)
- [ ] Billing page: currently shows fake plans/invoices — show "billing not
      configured" truth state OR wire Dodo plans
- [ ] Settings: wire profile/preferences saves or remove fake buttons
      ("Export all data", "Delete workspace", cosmetic saves)
- [ ] Prompts: remove hardcoded sub-scores; wire favorite star; wire/remove Run
- [ ] Dead buttons: "Use for routing" (models), "Edit project" (workspace)
- [ ] Workspace stats: mappers return 0 — compute real projectCount/promptCount
- [ ] Nav priority: Chat, Terminal, Agents first, then Search/Memory/Costs/Models
- [ ] Standardize loading / empty / error / retry on every surface (already good)

**Acceptance:** no fake numbers anywhere; every button does something real or is gone.
### PHASE 9 — Security hardening
> Maps brief 1, 32, 12.

- [ ] Tenant isolation audit on every route (IDOR on session/message/file/artifact)
- [ ] Terminal tools: path containment, command allow/block, timeout, env filtering
- [ ] Prompt-injection: tool inputs validated; approvals cannot be bypassed by model output
- [ ] SSRF protection on fetch_url/web_search (allowlist, block private IPs)
- [ ] Secrets never logged; BYOK ciphertext never returned (already tested)

### PHASE 10 — Full test suite + CI + production
> Maps brief 44, 45, 47, 50, 58, 59, 60.

- [ ] E2E flows (brief's 7): signup→chat; login→session→switch→stream→cost;
      agent create→run→tool→approval→result; job agent w/ resume; web↔terminal;
      lf chat→sync; PDF→worker→storage→download
- [ ] Failure tests: provider timeout, invalid key, model unavailable, rate
      limit, Redis/Postgres down, worker restart, disconnect, malformed tool,
      cross-workspace, expired session, duplicate events/jobs, agent timeout,
      budget exceeded
- [ ] CI: add `npm test` + `eslint` + `go test -race` to `.github/workflows/ci.yml`
      (today CI skips all three)
- [ ] Production: Render (API+worker) + Vercel (web) + Neon + Upstash + R2;
      run `check:prod` + smoke against prod
- [ ] Write `docs/PRODUCTION_AUDIT.md` with the required table + honest verdict

**Acceptance:** all critical user journeys pass in CI; verdict backed by evidence.

### PHASE 11 — REAL model + agent test (gated on a live key)
> Maps brief 52, 53, 54.

- [ ] Add one valid platform key (`.env`): `GROQ_API_KEY` (+`GROQ_MODEL`) or
      `OPENAI_API_KEY` — the single external dependency for live E2E
- [ ] Web chat → API → router → provider → stream → DB → usage
- [ ] Terminal chat → same API → same router → same provider → stream → sync to web
- [ ] Run a real coding agent on a safe test repo (Phase 6 acceptance)
- [ ] Auto / provider A / provider B / unavailable / BYOK matrix

---

## Daily dev loop (always use)

```bash
# from repo root
npm install
docker compose up -d          # Postgres + Redis (skip if already cloud)
cp apps/api/.env.example apps/api/.env   # then fill secrets
cp .env.example .env.local               # NEXT_PUBLIC_API_URL=http://localhost:8787

npm run dev                   # web :3000 + api :8787 + worker  (concurrently)
# or individually:
npm run dev:web               # Next.js
npm run dev:api               # Hono API
npm run dev:worker            # BullMQ worker

npm run db:migrate --workspace @layerflow/api
npm run db:seed    --workspace @layerflow/api   # local demo only, never prod

# quality gate (run before every commit):
npx tsc --noEmit
npm test
npm test --workspace @layerflow/api
(cd terminal && go build ./... && go vet ./... && go test -race ./...)
npx next build

# terminal CLI
cd terminal && go run ./cmd/lf
```

---

## Key files to know

| Area | File |
| --- | --- |
| Hono app | `apps/api/src/app.ts`, `apps/api/src/routes/index.ts` |
| Chat route/service | `apps/api/src/routes/chat/chat.ts`, `apps/api/src/services/chat/*` |
| Provider adapters | `apps/api/src/services/ai/providers/*.ts` |
| Chat router/failover | `apps/api/src/services/chat/router.ts` (watchdog lives here) |
| Model registry (single truth) | `packages/model-registry/src/index.ts` |
| Web API client | `lib/api/client.ts`, `lib/services/*.ts` |
| Chat UI | `components/features/chat/*` |
| Agents backend | `apps/api/src/services/agents/*`, `apps/api/src/routes/agents/*` |
| Memory/search | `apps/api/src/services/memory/*`, `apps/api/src/services/search/*` |
| Budgets/usage | `apps/api/src/services/runs/budget-hook.ts`, `apps/api/src/routes/budgets/*` |
| Terminal TUI | `terminal/internal/tui/*` |
| Terminal stream/CLI | `terminal/internal/stream/stream.go`, `tui/chat.go`, `cloud/cloud.go` |
| Workers | `apps/api/src/jobs/processors/*` |

---

## Definition of done for the whole effort

1. Web, API, worker, terminal share one backend and one session model.
2. Chat, agents, memory, search, costs all return real data from Postgres.
3. `lf` and web see the same sessions, messages, usage, approvals.
4. No mock UI, no fake numbers, no dead buttons.
5. Every phase passes typecheck + tests + a real end-to-end verification.
6. `docs/PRODUCTION_AUDIT.md` presents an honest verdict.
---