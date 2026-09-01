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

## Reference products (guidelines)

Use these ONLY as product/UX/architecture references for interaction patterns:

- **OpenCode** — https://github.com/opencode-ai/opencode
- **Cline** — https://github.com/cline/cline

Study their public architecture for: terminal agent interaction, tools, sessions,
approvals, model abstraction, context management, agent loops, terminal UX.

**LayerFlow must have its own:** branding, UX, architecture, model abstraction,
agent system, browser experience, business model.

**Do NOT:** copy proprietary assets, copy branding, blindly copy source code,
duplicate their product. Own everything.

## Execution phases (strict order)

### PHASE 1 — Truth, hygiene, docs & foundational model
> Maps brief 0, 1, 2, 33, 42, 43, 48, 49, 51, 58, 59, 60.

Make the repo honest before adding anything.

**Truth, hygiene & docs (original):**
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

**Workspace model (Brief 2) — ownership hierarchy:**
- [ ] Implement proper User → Workspace → Projects → Sessions → Messages hierarchy
- [ ] Every relevant record must be tenant-scoped (workspace_id)
- [ ] Database-level indexes for tenant access patterns
- [ ] Never allow cross-workspace access (audit all queries)

**Authentication lifecycle (Brief 1):**
- [ ] `lf login` flow: CLI generates secure state → browser opens → user
      authenticates → browser callback completes → CLI receives auth result →
      credentials stored securely → CLI calls LayerFlow API
- [ ] Session refresh for long-running terminal sessions
- [ ] Protected routes on every endpoint (never trust workspace/user IDs from
      browser without verifying session ownership)
- [ ] Authorization: every request resolves user + workspace + session

**File uploads (Brief 33):**
- [ ] Support: resume upload, document upload, chat import, project files
- [ ] Use presigned upload URLs + object storage (R2 or local disk)
- [ ] Content-type validation (never trust filename extensions alone)
- [ ] Size limits enforced server-side
- [ ] Tenant-scoped access (never leak files across workspaces)

**Database quality (Brief 58):**
- [ ] Audit every table for: primary keys, foreign keys, tenant indexes,
      timestamps, soft delete where appropriate, unique constraints,
      cascade rules, tenant isolation
- [ ] Do not put durable application state only in Redis

**API quality (Brief 59):**
- [ ] Every endpoint must have: validation, authentication, authorization,
      error handling, structured response, consistent error codes, logging, tests

**Final product rule (Brief 60):**
- [ ] Do NOT optimize for feature count. Optimize for: RELIABLE REAL WORK.
      The user should be able to: come in → ask something → choose/use a model →
      create/run an agent → let AI use tools → approve important actions →
      get a useful result → continue from browser or terminal → search previous
      work → see usage and cost → come back later and continue.
      That complete loop is the product.

**Acceptance:** every doc describes the actual repo. Workspace hierarchy is
enforced at DB and API level. File uploads are validated, scoped, and secure.
Every endpoint passes quality checklist.

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
> Maps brief 5, 6, 7, 29, 38, 54.

- [ ] Web consumes `@layerflow/model-registry` directly; kill the fiction
      catalog in `lib/data/providers.ts` (models the platform can't serve)
- [ ] Chat picker stays static-capable but drives from a session-auth `/api/models`
      endpoint (registry + live availability) so it never offers unservable models
- [ ] Verify AUTO router (`intelligence/route.ts`) picks differently for
      coding vs. reasoning vs. large-context requests
- [ ] Add per-provider rolling latency stats into routing decisions
- [ ] **LayerFlow unified API credential** ("one key"): User → LayerFlow Key →
      LayerFlow Gateway → Model Router → Provider → Model. The user should NOT
      need a provider key for managed models. Verify this flow with a real
      `lf_live_` key through the `/v1` gateway.
- [ ] **BYOK encryption verification**: Optional BYOK (bring-your-own-key) must
      store provider keys encrypted at rest, never logged, never returned to the
      browser after save. Test the encryption round-trip.
- [ ] **API contracts / shared schemas**: Frontend and backend must agree on model
      IDs, agent IDs, session IDs, event types, errors, and request/response shapes.
      Use the existing Zod/`@layerflow/model-registry` as the single source of
      truth. Never duplicate model IDs manually in multiple places.
- [ ] Multi-model test matrix: Auto / A / B / unavailable / BYOK — assert model
      ID, provider, tokens, cost, fallback event

**Acceptance:** exactly one model-definition source; Models page + picker show
only servable models; fallback emits `switched` events; BYOK ciphertext never
leaks; contracts are shared TypeScript types.

### PHASE 4 — Usage, budgets, observability, cache, worker, billing
> Maps brief 8, 9, 29, 30, 31, 34, 46.

- [x] Budget reserve/settle via Redis Lua + immutable `usage_ledger`
- [ ] Verify reservation release on every failure path (chat settle; gateway; runs)
- [ ] Add job IDs to worker logs; per-model provider latency metrics
- [ ] Costs page: server-provided provider on usage rows (kill client prefix guess)
- [ ] **Structured logging**: every request gets a request ID (`x-request-id`); every
      worker job gets a job ID; every AI call gets a trace ID. Logs include
      provider, model, latency, token count — never secrets or raw chat content.
- [ ] **Health checks**: add `/api/health` endpoint that checks Postgres, Redis,
      provider connectivity, queue health. Worker must have its own health endpoint.
- [ ] **Sentry / error tracking**: configure Sentry (or equivalent) for API + worker;
      capture provider failures, budget failures, unhandled rejections; never
      send secrets to Sentry.
- [ ] **Performance measurement**: capture API latency (p50/p95/p99), first-token
      latency per provider/model, streaming throughput, worker job latency,
      DB query time, Redis latency. Add aggressive indexes where missing.
      Verify no N+1 queries on hot routes (chat history, session list, usage).
- [ ] **Cache (Brief 29)**: Redis cache for rate limits, job queues, provider health,
      model availability, session hot state. All cache keys tenant-scoped
      (workspace_id prefix). Never cache AI responses where privacy makes it unsafe.
- [ ] **Worker / background jobs (Brief 30)**: Enqueue for embedding generation,
      document ingestion, large reports, PDF generation, agent execution, usage
      rollups, notifications, emails, artifact processing. Never block HTTP for
      heavy generation. Worker health endpoint with queue depth metrics. Retry
      logic with dead-letter queue.
- [ ] **Billing / plan entitlements (Brief 34)**: Wire `GET /api/billing/status` to
      frontend billing page. Every request evaluated against plan, managed inference
      allowance, request limits, feature entitlement, agent limits, storage limits.
      Use Dodo provider if configured; local/mock billing as dev fallback. Never
      build fake production billing data.

### PHASE 5 — Terminal is first-class (critical bugs + parity + transport + UX)
> Maps brief 19, 20, 21, 22, 23, 24, 25, 26, 55, 56, 57.

**Critical bugs (already started):**
- [x] Streaming pump re-armed (done in this session)
- [ ] Verify no Git fatal errors in normal UI; raw provider errors surfaced as
      friendly notices; invalid model auto-switch (fallback exists) — run `lf`
      and click through live
- [ ] One LayerFlow theme (orange/white/gray + subtle green/yellow/red) — audit
      any random blue/purple backgrounds; purge ad-hoc ANSI in `tui/diff.go`,
      `approval.go`; replace glamour `dracula` chroma style
- [ ] Composer fixed bottom; conversation scrolls independently; no cursor
      corruption; no input jump-to-top; no flicker; stop mutating state in `View()`
- [ ] `lf login` device flow returns real key (server mints `lf_live_`)
- [ ] Rune-safe truncation (4 sites slice bytes mid-rune → mojibake)
- [ ] Wire dead subsystems: `search.Build()` (FTS), `memory.InitSchema()` (table
      mismatch), daemon indexer (never assigned)
- [ ] Tool sandboxing: `resolvePath` containment, `run_command` dangerous-command
      block + timeout — fix BEFORE wiring tools to TUI

**Session parity (web ↔ terminal):**
- [ ] A web-created session must be accessible from `lf` — same session ID,
      messages, model, agent, memory, tool events, cost, approvals
- [ ] A terminal-created session must be accessible from the web — same data
- [ ] `lf sync` pull: fix LOCAL watermark (currently uses SERVER watermark →
      always empty); materialize pulled ops into `sessions`/`messages`; add JSON
      tags (payloads marshal with capitalized Go field names); journal TUI
      sessions too (only `lf chat` CLI journals today)
- [ ] "Continue where you left off": when a user opens `lf` after a web session,
      show "You were working on X. Continue?" with previous context loaded

**Transport:**
- [ ] WebSocket for: streaming tokens, tool events, agent state, approvals,
      terminal events (the system already uses SSE — verify if WS upgrade is
      needed for bidirectional streaming or if SSE+POST is sufficient)
- [ ] REST for: CRUD, snapshots, metadata, non-streaming operations
- [ ] Reconnect + resume: if WebSocket/SSE disconnects, retain local session
      state, reconnect, resume safely, avoid duplicate events

**Tools (safe local execution):**
- [ ] Implement/tool-ify: read, search, edit, write, shell, git, MCP (where
      explicitly enabled) with sandbox-aware filesystem access
- [ ] Prevent: path traversal (`resolvePath` containment), dangerous commands
      (blocklist + timeout), arbitrary secrets access where prohibited

**Terminal UX (polished TUI):**
- [ ] HOME layout: centered — "LayerFlow.dev" wordmark, "AI workspace for
      developers" tagline, "> Ask anything..." prompt, Enter to send, / commands,
      Tab for agents, Ctrl+P palette, Ctrl+M model picker, Ctrl+K sessions
- [ ] Bottom status bar always visible: model / workspace / git branch /
      usage indicator / connection status
- [ ] Active chat layout: header (model, workspace, session title) →
      scrollable conversation viewport → fixed composer → bottom status bar
- [ ] Composer stays at bottom; conversation scrolls independently; no
      re-centering home on every render

**Browser/web terminal:**
- [ ] If a browser terminal exists or is planned, it must use the **same
      backend session/event system** as the Go CLI — NOT a separate fake
      terminal backend. Both connect to the same session/event infrastructure.

**Acceptance:** `lf`, `lf login`, `lf models`, `lf cost`, `lf doctor` all work
with no panic, no raw errors, no layout jump, no broken input, no blue/purple
backgrounds; `lf` and web see the same sessions; `go vet` + `go test -race` clean.
### PHASE 6 — Agent runtime + tools + freelancer agents + IDE DX (biggest build)
> Maps brief 10, 11, 12, 13, 14, 15, 16, 40, 53.

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
- [ ] **Full agent builder flow**: "What do you want this agent to do?" →
      AI generates draft config → User reviews config + selects tools →
      User selects model / Auto → User defines permissions → User sets limits
      (budget, max iterations, timeout, memory policy) → Save → Deploy
- [ ] Agent spec must include: id, workspace, name, description, goal, model
      policy, tool policy, permission policy, budget, max iterations, timeout,
      memory policy, status
- [ ] **Freelancer / user-defined agents**: allow users to create agents for:
      lead research, proposal, client follow-up, SEO, competitor research,
      code review, QA, content research. Builder must ask: Goal, Inputs, Tools,
      Permissions, Schedule, Output format.
- [ ] Structured artifacts (leads, reports, applications) with CSV / JSON / PDF
      export; PDF generation in the **worker** (not blocking HTTP) → object
      storage → secure download link → artifact metadata
- [ ] **Job-application agent**: resume upload → profile extraction (worker,
      not client regex) → search → rank → review → approval → submit.
      Honesty: real search sources OR labeled "model-suggested targets"
      with user review before any outreach.
- [ ] **IDE / Developer experience**: display project, branch, model, agent,
      context files, changes, test status. Allow inspect/edit/run/review/
      test/commit. Never auto-push destructive actions — require approval.

**Acceptance:** a real coding agent runs on a safe test repo: plan → read →
propose → approve → modify → test → summarize, persisted, visible in browser,
followable in `lf`, cost recorded. User can define a custom agent from
a natural-language goal. Freelancer templates exist.

### PHASE 7 — Memory + Search + Context engine + repo context
> Maps brief 17, 18, 27, 28, 41.

- [x] Memory: pgvector + extraction job + Redis hot cache; tenant scoped
- [x] Hybrid search (keyword + vector) over prompts/sessions
- [ ] Extend search index to memories, projects, files, agent runs, artifacts,
      terminal sessions
- [ ] One shared context engine used by web chat, terminal, **and** agents
      (keyword + vector, token-budgeted) — no separate context logic per surface
- [ ] **Repository context detection**: detect package.json, pnpm-lock, go.mod,
      requirements.txt, pyproject.toml, Cargo.toml, pom.xml, etc. Build a project
      context index with: file tree, important config, Git state, code search,
      relevant file selection
- [ ] Do NOT send entire repositories to every model request — use relevance +
      token budget to select files. The context engine (above) handles this.

### PHASE 8 — Frontend truth (kill fake surfaces)
> Maps brief 35, 36, 37, 39, 51.

- [ ] Models hub: no fiction catalog (Phase 3 handles)
- [x] Billing page: removed hardcoded fake PLANS/INVOICES; now fetches real
      plans + subscription status + invoices from API; shows "billing not
      configured" truth state when Dodo is unprovisioned (API: added
      `/api/billing/plans` + `/api/billing/invoices`; enriched `/status` with
      `configured` flag)
- [x] Settings: wired profile/preferences saves + sign-out (done in prior commit)
- [x] Prompts: removed hardcoded sub-scores; wired favorite star + delete (done in prior commit)
- [ ] Dead buttons: "Use for routing" (models), "Edit project" (workspace)
- [ ] Workspace stats: mappers return 0 — compute real projectCount/promptCount
- [ ] Nav priority: Chat, Terminal, Agents first, then Search/Memory/Costs/Models
- [ ] Standardize loading / empty / error / retry on every surface (already good)

**Acceptance:** no fake numbers anywhere; every button does something real or is gone.
### PHASE 9 — Security hardening + event system protocol
> Maps brief 1, 12, 32, 39.

- [ ] Tenant isolation audit on every route (IDOR on session/message/file/artifact)
- [ ] Terminal tools: path containment, command allow/block, timeout, env filtering
- [ ] Prompt-injection: tool inputs validated; approvals cannot be bypassed by model output
- [ ] SSRF protection on fetch_url/web_search (allowlist, block private IPs)
- [ ] Secrets never logged; BYOK ciphertext never returned (already tested)
- [ ] **Event system protocol (Brief 39):** Create a consistent event protocol
      shared by web and terminal. Event types must include:
      `session.created`, `message.user`, `message.assistant.delta`,
      `message.assistant.completed`, `tool.requested`, `tool.started`,
      `tool.completed`, `approval.requested`, `approval.approved`,
      `approval.denied`, `agent.started`, `agent.progress`, `agent.completed`,
      `agent.failed`, `usage.updated`. Web and terminal must consume the same
      event types from the same backend.

### PHASE 10 — Full test suite + CI + production + PRODUCTION_AUDIT
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
- [ ] Write `docs/PRODUCTION_AUDIT.md` with the required status table + honest
      verdict. See "Final deliverable specification" below for format.

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
## Final deliverable specification

After all phases are complete, deliver `docs/PRODUCTION_AUDIT.md` with the following content:

### Status table

Every area gets a row with:

| Area | Status | Evidence | Fixed | Remaining Risk |

Status values: ✅ Complete · 🚧 Built during audit · ⚠️ Partial · ❌ Missing/critical issue · 🧪 Test-only · 📦 Planned

Areas to cover in the table:

- Auth (email/Google/device/API-key)
- Chat (sessions, SSE streaming, failover, context pipeline, persistence)
- Model routing (AUTO, manual, failover, fallback)
- Provider adapters (each: OpenAI, Anthropic, Google, DeepSeek, Groq, etc.)
- Gateway (`/v1` OpenAI-compatible)
- Budget reserve/settle + usage ledger
- Agents (builder, runtime, tools, permissions, state machine)
- Agent tools (read/write/search/edit/shell/browser/MCP)
- Structured output / artifacts / PDF
- Freelancer agents (user-defined)
- Memory (pgvector + extraction + cache)
- Search (keyword + vector hybrid)
- Repository context / project detection
- Files (upload, storage, presigned URLs, content validation)
- Terminal TUI (streaming, parity, transport, UX, theme)
- Terminal ↔ Web sync (push + pull + session parity)
- Web frontend (dashboards, models, billing, settings — no fake data)
- Billing / plan entitlements
- Event system protocol
- Auth lifecycle (CLI login, token refresh, protected routes)
- Workspace model (tenant hierarchy, indexes, isolation)
- Security (CSRF, SSRF, XSS, path traversal, injection, IDOR, rate limits)
- Observability (structured logs, Sentry, health checks, trace IDs)
- Performance (latency measurement, indexes, N+1 prevention)
- CI / testing (unit, integration, E2E, failure tests, Go tests)
- Deployment (Render, Vercel, Neon, Upstash, R2)
- Documentation (architecture, API, security, deployment, contributing)

### Production Readiness Score

Calculate as a percentage: (completed + built-during-audit) / total-areas × 100

### Feature Completion Score

Calculate as: (features-wired-end-to-end) / (total-features) × 100

### Security Score

Pass/fail on each of: auth, authorization, tenant isolation, CSRF, SSRF, XSS,
path traversal, command injection, prompt injection, tool permission bypass,
secret exposure, rate limiting.

### Test Coverage

- Unit tests: pass/fail per area
- Integration tests: pass/fail per area
- E2E flows: pass/fail per flow (list the 7 critical flows)
- Go tests: pass/fail

### Critical Blockers

List any issue that prevents launch (e.g. "no working provider key", "agent
tool framework not wired", "terminal sync pull is no-op").

### Launch Recommendation

One of:

- **READY FOR PRIVATE BETA** — core user journeys work end-to-end; known
  limitations documented; security baseline verified.
- **READY FOR PUBLIC BETA** — all surfaces functional; billing wired;
  production monitoring active; no critical blockers.
- **NOT READY** — one or more critical blockers remain; recommend specific
  phases to complete before launch.

Be honest. Do not call the product "production-ready" unless the criteria
actually pass.

---

## 60-phase → 11-phase map (nothing dropped)

| Brief phase | → Plan phase |
| --- | --- |
| 0 audit, 1 auth lifecycle, 2 workspace model, 33 file uploads, 42 rescue demotion, 43 keep useful, 48 local dev, 49 docs, 58 DB quality, 59 API quality, 60 final rule | **1** |
| 3 chat works, 4 context, 6 failover, 52 web model test | **2** |
| 5 providers, 6 router, 7 one key, 29 cache, 38 contracts, 54 multi-model | **3** |
| 8 usage, 9 budgets, 29 cache, 30 worker, 31 observability, 34 billing, 46 perf | **4** |
| 19 terminal first-class, 20 terminal parity, 21 transport, 22 tools, 23 UX, 24 bugs, 25 browser↔terminal, 26 web terminal, 55 validation, 56 theme, 57 final UI | **5** |
| 10 builder, 11 runtime, 12 tool perms, 13 job agent, 14 freelancer agents, 15 structured output, 16 PDF, 40 IDE DX, 53 agent test | **6** |
| 17 memory, 18 search, 27 repo context, 28 context engine, 41 contextual memory | **7** |
| 35 frontend, 36 nav, 37 UX states, 39 events (web leg), 51 no-mock | **8** |
| 9 security, 12 permission bypass, 32 security audit, 39 event protocol | **9** |
| 44 testing, 45 failure tests, 47 deployment, 50 prod check | **10** |
| 52 web model test, 53 agent test, 54 multi-model (live key gated) | **11** |

## Working order (strict)

Phase 1 (foundations) → 2 (chat headline) → 3 (model truth) → 5 (terminal bugs,
big UX win, small fixes) → 4 (usage/observability) → 8 (web truth) → 6 (agents,
biggest build) → 7 (memory/search/context) → 9 (security) → 10 (testing/deploy) →
11 (live key E2E validation).

Critical before optional. No fake success states. Every phase ends with
typecheck + tests + a real end-to-end verification.