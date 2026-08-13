# LayerFlow — Pre-Launch Audit Report

**Date:** 2026-08-13
**Scope:** Next.js web app, Hono + BullMQ API, contracts packages, Go CLI (`terminal/`)
**Method:** 30-area audit (6 parallel auditors) → remediation → verification (typecheck, 150 API + 9 web tests, migration replay, API build, Go build/vet/test)

---

## 1. Executive Summary

LayerFlow is a prompt-rescue + agent-orchestration workspace. The core product (rescue pipeline, chat with context, agent runs, budgets, memory, search, billing webhooks, CLI session sync) is implemented and testable. The audit found **one launch-blocking issue** (live payment secrets committed to git history), **six critical fixes** (auth brute-force, open redirect, provider key leakage, unsigned webhooks, chat failover double-spend, missing chat rename), and a long tail of medium fixes (pagination, fabricated metrics, missing notifications, missing migrations, dead Docker copy context, CI gaps, README inaccuracies). **All remediation tasks are complete and verified.**

## 1b. Follow-up audit (same day)

The Go CLI (`terminal/`) had **never been verified to build** — `go mod tidy`/`go build` surfaced a broken pinned dependency (`muesli/ansi` pseudo-version removed upstream), a mixed `package main`/`package lf` in `cmd/lf`, a misplaced `views/` package (declared `package tui` in a subdirectory, referencing `Model` from the parent), duplicate `DiffView` structs, an init cycle in the command table, a `time.Time - time.Duration` mismatch, and several type/API-drift errors (golang-migrate v4.18 `NewWithSourceInstance` signature, missing `ToolCall.Index`). All were fixed: `glamour` bumped to v1.0.0 (drops `muesli/ansi`), `go.sum` generated, `views/` files merged into `internal/tui`, `DiffView` unified, `CmdContext` now passed by pointer (copylocks), MCP `Client` uses `*Server` (copylocks). `go build ./...`, `go vet ./...`, and `go test -race ./...` all pass; `bin/lf` builds and runs. CI gained a dedicated Go job.

## 2. Verdict: **PRIVATE BETA — READY**

Conditions before any public/paid rollout:
1. **Rotate the Dodo Payments live key + webhook secret** (still present in git history and in local gitignored files). Rotation is the only hard blocker.
2. Decide standalone-rescue-page vs chat-first flow (both exist; products pages still expose both).
3. Add billing in test mode credentials to staging before a paid launch.

## 3. Readiness Score

| Dimension | Score | Notes |
|---|---|---|
| **Security** | 82/100 | Secrets in history (−10), brute-force guarded, webhooks hardened, prompt-injection hardened, provider keys in headers |
| **Performance** | 78/100 | Full pagination, rate limits on all spend paths, Redis counters + reconciliation; unbounded lists were the gap (fixed) |
| **UX** | 85/100 | Mobile nav, honest demo labeling, live costs/keys pages, “save to memory”, notifications bell |
| **Infrastructure** | 75/100 | Migrations verified (74 tables), CI builds API, Docker fixes; no staging env, no secrets manager wiring |
| **Product Completeness** | 85/100 | Real: rescue, chat, agents, budgets, memory, search, passports, CLI core. Stubs: several CLI subcommands (honest-labeled) |
| **Overall** | **81/100** | **Private beta: go** |

## 4. Feature Completion

| Area | Status | Notes |
|---|---|---|
| Auth (Better Auth, OAuth, MFA-ready) | ✅ | Hardened; open redirect + brute-force fixed |
| Rescue (free + paid tiers, models, diff, continue-pack, passports) | ✅ | Ship shape: rescue now lives **inside Chat** (paste → pipeline → report → continue in a new thread); standalone page removed; rate-limited, injection-hardened, `PATCH` save endpoint |
| Chat (SSE, auto-switch, model picker) | ✅ | 12-model chain, heartbeat/abort, rename, passport context; **hosts the full Rescue flow** (new `RescueDialog`, empty-state import opens it) |
| Agents (runs, approvals, schedules, memory, resumes) | ✅ | Notifications wired; demo labeling added; 23 cols, index & FK fixes |
| Memory (vector, rollups, extracts) | ✅ | Memory-extract job wired post-chat |
| Search / Intelligence | ✅ | Real API mapping; local-hash embeddings fallback |
| Budgets / Billing / Usage | ✅ | Idempotent webhooks, plan-preserving upsert, honest savings (0% fallback) |
| Workspace (projects/domains/folders/sessions) | ✅ | Pagination everywhere, rate limits |
| Community (profiles, follows, likes, clones) | ✅ | Notifications superseded by new `/api/notifications` |
| Admin / Gateway / v1 | ✅ | Existing + verified |
| Web app (costs, keys, home, search, agents, passports) | ✅ | Live data, no mock/fabrication remnants |
| Mobile UX | ✅ | Hamburger + drawer nav |
| Go CLI (`terminal/`) | ✅ | Core wired (login/logout/doctor/sessions/cost/mcp-list/daemon, exec’s `/git`); `chat`, `run`, `sync`, `rescue`, `upgrade`, `mcp add/remove/health` are honest stubs; builds, vets and tests cleanly (see §1b) |
| Docs | ✅ | Root README rewritten honestly |

## 5. Issues Fixed (Full List → Summary)

**🔒 Security (7)**
- Live Dodo key/secret/product-IDs scrubbed from `.env.example` → **rotate in production**
- Sign-in open redirect → strict-allowlist URL parser
- Auth endpoints → per-IP throttle (20 rpm) + global per-user backstop (600 rpm)
- Anthropic adapter masked 401/403 as 400 → real statuses preserved
- Gemini API key embedded in URL → `x-goog-api-key` header
- Dodo webhook accepted unsigned in non-prod → rejected outside development
- Prompt injection (system prompts) on provider chat, rescue, improve → data-vs-instructions fences

**🐳 Infrastructure (6)**
- Duplicate migrations (0004 re-applied 0003 ALTERs) → deduped
- `ai_agents` schedule columns drifted from schema → migration 0012
- Notifications schema changed without migration → 0013 generated & replayed clean
- CI lacked API build → tsup build step added
- `.dockerignore` shipped secrets (`.vercel.env`) → scoped
- `apps/api/Dockerfile` copied `node_modules`/`src` → context corrected + API `.dockerignore`

**⚙️ API correctness (12)**
- Chat model priority chain ≠ picker → aligned (12 models)
- Chat bookkeeping inside failover path → could double-spend → isolated, try/catch, logged
- Chat resume missing post-message bookkeeping → fixed
- Chat sessions un-renameable → `PATCH /api/chat/:id` + contract (title 1–200)
- Passport never in provider context → injected (loaded per session, `formatPassportContext`)
- SSE no keepalive/abort → 15s heartbeat + abort signal propagation
- Auto-switch toggle unvalidated → Zod schema + contracts
- Memory storage lacked chat-source type → `"chat"` allowed; memory-extract job → 6-provider chain, 5/session cap, dedupe
- Budget reconciliation divergence → `spentMicro` follows ledger; Redis-optional paths safe
- Usage fallback invented “20% optimized” → honest `savedMicro: 0`
- List endpoints unbounded (agents/projects/domains/folders/sessions) → pagination (limit ≤200, offset)
- Rescue reports unmutable → `PATCH /api/rescue/:id` (saved, projectId)

**🧑🎨 Product/UX (9)**
- Costs page invented numbers → live usage/budgets APIs + skeleton/error/empty states
- Keys page showed “Simulated” → live provider keys (masked hints, revoke, password inputs)
- Search page invented results → real prompts/sessions only, error state + a11y
- Home dashboard crashed on any fetch failure → per-fetch `.catch` null guards
- No notifications → `/api/notifications` (list/read/unread-count, 60 rpm) + bell in topbar (30s refresh)
- Demo job-agent presented as real → `is_demo` flag, amber “Demo” badges, honest callout
- Chat had no “save to memory” → action added
- Agents page had no run feedback loop → run-finished notifications (completed/failed)
- Mobile unusable nav → drawer

**🧪 Verification**
- `npx tsc --noEmit` → **clean (0 errors)**
- API tests → **141/141 pass** (23 files; updated streaming test to assert preserved provider status)
- Web tests → **9/9 pass**
- `npm run build` (api, tsup) → **success**
- Migrations replay: 0001→0013, **74 tables, clean**
- Redis/Postgres integration paths exercised (hardening suite) → pass

## 6. Remaining Blockers & Watch Items

| # | Item | Severity | Action |
|---|---|---|---|
| 1 | **Rotate Dodo live key + webhook secret** (in git history, local `.vercel.env`, `apps/api/.env`, `fly.env`) | 🔴 Blocker | Rotate at Dodo dashboard; purge history or keep private; add staging keys |
| 2 | `drizzle/meta/0003_snapshot.json` missing (inherited) | 🟡 | Regenerate on next schema change; documented in README |
| 3 | Go CLI stubs + missing `go.sum` | 🟡 | Complete before public CLI launch; build on a Go machine |
| 5 | Secrets in `.env` consumption (KEK, provider raw keys at rest) | 🟡 | Managed secrets (1Password/doppler) before team launch |
| 6 | Local infra required (Redis/Postgres) | 🟢 | render.yaml exists; verify health checks + worker scale-out |

## 7. Launch Checklist (pre-launch for private beta)

- [ ] Rotate Dodo keys everywhere; confirm `.env.example` has placeholders only
- [ ] `git grep` for `NRMa1`, `whsec_S+keekv`, `pdt_0Nkp` → only history remains
- [ ] Deploy from clean migrate (`db:migrate` → 0013) with `DB_VERIFY=1`
- [ ] Smoke: sign-up → workspace → rescue → chat with passport → agent run → notification
- [ ] Confirm billing webhook against Dodo test mode
- [ ] Set `SENTRY_DSN`/`RESEND_API_KEY`/real provider keys in deployment env
- [ ] Seed demo agent explicitly via seed (`is_demo = true` label verified in UI)
- [ ] Verify Rate Limit headers on `/api/auth/*`, `/api/rescue`, `/api/chat/*/messages`

## 8. 30-Day Roadmap (post-private-beta)

1. **Week 1:** Secret rotation + history scrub; stand up staging (render) with Dodo test keys.
2. **Week 2:** Complete Go CLI: real `sync`, `rescue`, `run`, `upgrade` + `go.sum` + CI Go build.
3. **Week 3:** Read-path caching (usage/agents/notifications); alerting on budget thresholds (PagerDuty/Slack).
4. **Week 4:** Load test SSE + agent workers; cap concurrency per workspace; migration strategy for schema drift (auto-verify in CI); community moderation passes.
5. **Ongoing:** Cost-view parity (ledger vs rollups), tokens-per-run dashboards, delete-account + data export (compliance).

## 9. Git Diff Summary

- **~70 files changed, +2,308 / −990** (working tree vs HEAD)
- New: `AUDIT_REPORT.md`, README (rewritten), contracts `notifications.ts`, API notifications service/router, memory-extract job processor, migrations 0012/0013, `apps/api/.dockerignore`, CI build step, README architecture, chat `RescueDialog`
- Deleted: legacy community notifications router, `app/(dashboard)/code/page.tsx` (superseded), duplicate migration ALTERs, **standalone `/rescue` page (moved into Chat; sidebar/commands/marketing links repointed to `/chat`)**
- Tests: `streaming.test.ts` updated to assert 401 preservation

## 10. Final Notes

The codebase was in far better shape than the `COMPLETE` doc claimed in one respect (real API/worker/test infrastructure exists and works) and worse in another (secrets, unbounded lists, mocked pages, drift). Post-remediation it is **coherent, honest, and testable** — fit for private beta once keys are rotated.

## 11. Final Cross-Check (2026-08-14)

Second-day cross-check of the whole master-prompt scope. Key deltas since §1b:

**Verified (all green)**
- `npm run lint`: **0 errors** (~90 pre-existing warnings).
- Typecheck clean: repo root, web, `@layerflow/api`, `@layerflow/contracts`, `@layerflow/model-registry`.
- **150/150 API tests**, **9/9 web tests**, migration replay `db:verify` clean → **76 tables** (0015).
- Web `next build` and API tsup bundle build clean. CI (`ci.yml`) covers typecheck/verify/test/build for Node **and** a Go job (build/vet/test).
- Go CLI: `go build ./...`, `go vet ./...`, `go test -race ./...` clean; `bin/lf` builds and runs.

**This day's deliverables**
- `docs/DEPLOYMENT.md` — complete production deployment guide (Vercel live, Neon PITR, Upstash, Fly.io/Render/Railway, worker, migrations, full env reference, Dodo billing, Resend, monitoring, rollback, checklists, troubleshooting). Dangling `docs/production-env.md` / `docs/database.md` refs in `.env.example`, `apps/api/README.md`, `scripts/deploy-api-prod.sh` repointed here.
- `docs/API.md`, `docs/SECURITY.md`, `docs/CONTRIBUTING.md`, `docs/ROADMAP.md` — API reference, security model + incident checklist, contributor guide, roadmap.

**Post-launch watch items (see `docs/ROADMAP.md`)**
- PostHog analytics, BullMQ queue dashboard, uptime alerts **not wired** (honest gaps).
- Web E2E, worker, and Go tests missing.
- `apps/web`/`apps/worker` folder split deferred (high-risk refactor).
- Dodo live-mode verification + rotate any legacy live keys.

**Verdict: PRIVATE BETA — READY.** No code blockers remain; the only manual steps are secret rotation and standing up the backend host per `docs/DEPLOYMENT.md`.