# LayerFlow — Backend Development Plan

> **Goal:** take the app from mock-data frontend to a real, live backend.
> **Order:** **Browser first, terminal (lf CLI) after.**
> **Status:** plan v1 — backend `apps/api` is already ~60% built; the work is wiring it to the frontend feature by feature.

---

## 1. Where We Are Today

| Layer | State |
|---|---|
| Frontend (Next.js) | Runs on **mock data** (`lib/data/*` + `lib/services/*`). Pages call services, services return static data. |
| Backend (`apps/api`) | Real Hono API + Drizzle + Postgres schema + Redis + BullMQ jobs + AI providers + gateway `/v1` already written. Routes exist for workspaces, projects, prompts, sessions, files, runs, budgets, usage, keys, memory, search, learning, compare, intelligence. |
| The gap | The frontend `lib/services/*` still returns mock data. The swap was designed to be one-file-per-feature: **keep the same function signatures, replace the body with real API calls.** |
| Infrastructure | `docker-compose.yml` (Postgres + Redis) ready. `.env.example` documents all env vars. Auth (better-auth) already mounted on both Next and the API. |

### The golden rule (already coded into the frontend)

Every `lib/services/*.ts` file says:

> To move to the live Hono API, replace the bodies with fetch calls to `apps/api/src/routes/*` — **signatures stay identical**.

So each feature = swap one file, keep every page untouched.

---

## 2. Phase 0 — Local Dev Works Today (1–2 days)

Setup so the whole stack runs locally with real DB.

- [x] `docker compose up -d` (Postgres + Redis) — NOTE: Docker not available on dev Mac; used Homebrew postgresql@17 + pgvector and brew redis instead
- [x] `npm run db:migrate --workspace @layerflow/api` (apply drizzle migrations)
- [x] `npm run db:seed --workspace @layerflow/api` (demo user + data)
- [x] `npm run dev` → web (3000) + API (8787) + worker all run
- [x] Create a sign-in user in the local DB, confirm session cookie works — dev user alex@layerflow.dev / layerflow123 (`npm run db:dev-login --workspace @layerflow/api` sets the password; better-auth stores it in `accounts`, NOT `users`)
- [ ] `npm run check:prod` passes

**Done when:** you sign in on localhost and your user exists in Postgres, not in mock memory. — DONE: sign-in verified end-to-end.

---

## 3. Phase 1 — Auth + Workspace/Home (browser) (3–5 days)

The spine every feature hangs off.

| Feature | What to do | Backend already has |
|---|---|---|
| Sign in / sign up | Verify better-auth session flows end-to-end (email + Google) | `apps/api/src/auth/`, `app/api/auth/[...all]` |
| Workspaces | `lib/services/workspace.ts` → real calls (`/api/workspaces`, `/api/projects`, `/api/activity`) | `routes/workspace/*`, `db/schema/workspace.ts` |
| Home page | Dashboard stats + recent activity from real API (`/api/activity`, `/api/usage`) | `routes/workspace/activity.ts`, `routes/budgets/usage.ts` |
| Projects page | CRUD projects + folders | `routes/workspace/projects.ts`, `folders.ts` |

**Done when:** Home shows real DB stats; creating a project on the UI appears in Postgres.

Progress:
- [x] Auth same-origin local flow: web host (3000) is the Better Auth origin locally too (cookie must live on the same origin as the dashboard). `lib/server/hono-app.ts` + `app/api/auth/[...all]` load `apps/api/.env` into the Next process and point `BETTER_AUTH_URL` at `http://localhost:3000`. `getApiBaseUrl()` now returns same-origin everywhere.
- [x] `lib/services/workspace.ts` → real API: `listProjects` (`/api/projects`), `getProject` (`/api/projects/:id` — route ADDED), `listTimeline` (`/api/activity`), `listLearnings` (`/api/memory`), `getDashboardStats` + `getCostAnalytics` (usage summary + savings + budget).
- [x] `lib/services/prompts.ts` → real API (`/api/prompts`); `passports.ts` → `/api/sessions` (passports map to sessions for now); `models.ts` listProviderKeys → `/api/provider-keys`; `search.ts` → `/api/search`.
- [x] Verified: sign-in via localhost:3000/api/auth sets cookie on :3000; `/home`, `/workspace`, `/costs`, `/history`, `/prompts`, `/passports`, `/models`, `/search`, `/keys` all render 200 with real DB data.
- [ ] Projects CRUD in the UI (create/rename/archive project through the dashboard — API + contract exist)

---

## 4. Phase 2 — Rescue (THE core feature, browser) (5–7 days)

This is the product. Do not rush it.

| Step | What to do |
|---|---|
| Paste chat | `lib/services/…` real call → upload text (max 25 MB, contract-limited) → create session (`/api/sessions`) |
| Pipeline | Post → worker job (BullMQ): source detection → clean → compress → extract → embed (`jobs/processors/embed.ts`) |
| Rescue Report | Report envelope saved to DB → frontend renders from real data (`/api/runs`, `db/schema/runs.ts`) |
| Continue Pack | Generate continuation copy (AI call via `services/ai/prompt_engine/`) → save + copy-to-clipboard flow |
| Cost check | Estimated cost per report using `@layerflow/model-registry` pricing (already real on backend) |

**Done when:** pasting a chat produces a real Rescue Report in the DB with a real AI call and a real cost estimate.

### Status — backend + flow live (frontend built, requires provider key to go green)

- [x] Contract: `packages/contracts/src/rescue.ts` (report schema, create/list/get, statuses queued|running|completed|failed)
- [x] DB: `rescue_reports` table (drizzle migration `0004_rescue_reports.sql`, applied — rescue statements only; hashes recorded)
- [x] Routes: `POST /api/rescue` (202, also creates a prompt session), `GET /api/rescue`, `GET /api/rescue/:id`
- [x] Worker: `jobs/processors/rescue.ts` (BullMQ `rescue` job: executeRun → JSON parse → costs across 6 candidate models → activity `rescue.completed` / failed + errorMessage)
- [x] Frontend: `lib/services/passports.ts` real rescue calls; `app/(dashboard)/rescue/page.tsx` real POST + polling (2.5 s, 150 s timeout); pipeline shows real word count; error banner on failure
- [x] Home "Continue Packs" stat reads `listRescueReports()` (real API)
- [x] Verified end-to-end: POST → queued → worker runs → fails gracefully with "No openai API key configured for this workspace" (expected locally until a key is added under Keys)
- [ ] Live success: add a provider key (OpenAI) → paste → completed report with real costs

---

## 5. Phase 3 — Prompts + Models + Keys + Costs (browser) (4–6 days)

The "library" layer — high user value, low risk.

| Feature | Swap | Backend route |
|---|---|---|
| Prompt Library (list/save/improve/score) | `lib/services/prompts.ts` | `/api/prompts` |
| Model Hub (registry + best-model suggestion) | `lib/services/models.ts` | `/api/intelligence`, `/api/routing-rules` |
| BYOK keys (add/health/encrypt) | keys service | `/api/provider-keys` (encrypted with KEK, already built) |
| Cost Analytics + budgets | costs service | `/api/usage`, `/api/budgets`, `/api/savings` |

**Done when:** saved prompts live in Postgres; adding an API key stores it encrypted; costs page shows real usage.

### Status — BYOK + model suggestion live (prompt library & budgets remain mocked)

- [x] BYOK vault (`app/(dashboard)/models/page.tsx`): real `listProviderKeys` on mount, add key (provider select + secret + label) → `POST /api/provider-keys` (encrypted at rest with KEK, last-4 hint), revoke → `DELETE /api/provider-keys/:id`; dead mock `PROVIDER_KEYS` removed from `lib/data/providers.ts`
- [x] Best Model Suggestion: real `POST /api/intelligence/recommend` (heuristic, renders recommended model + reason) — verified `gpt-4o-mini`
- [x] `lib/services/models.ts`: `createProviderKey` / `revokeProviderKey`; `ProviderKey.id` added to UI type
- [ ] Prompt Library improve/score already real (`/api/prompts`) — save-to-library action still local
- [ ] Budgets edit UI (costs page reads real usage/savings; editing budget limit not wired)

---

## 6. Phase 4 — History, Search, Memory, Passports (browser) (3–4 days)

- History/Work Ledger → `/api/activity` + `/api/learning`
- Search → `/api/search` (hybrid vector + keyword — already implemented)
- Context Passports → sessions/memory routes (`/api/memory`, `/api/sessions`)
- Learning memory → `/api/learning`

**Done when:** search returns real past chats; passports are real DB records.

---

## 7. Phase 5 — Revenue & Ops (browser) (3–5 days)

- **Stripe:** checkout + customer portal + webhooks → plan gating in middleware (never sell unlimited AI credits — bill the workflow)
- **Resend:** transactional email (sign-in codes, weekly digest job already exists)
- **PostHog:** product analytics events
- **Sentry:** already wired on web + API + worker — verify release alerts
- **Deploy:** API + worker to Fly.io (fly.toml exists), web to Vercel, DB → Supabase/Neon, Redis → Upstash

**Done when:** paying a plan upgrades your limits; API runs outside localhost.

---

## 8. Phase 6 — Terminal (lf CLI) — AFTER browser is fully live

Only start this when Phases 1–5 are in production.

| Piece | What to do |
|---|---|
| Session parity | Web and `lf run` produce identical artifacts (same passport fields, same ledger events) |
| Live stream | `POST /v1/sessions` + SSE/WebSocket event stream (`session:<id>` Redis pub/sub already sketched) |
| Agent runtime | Typed tool registry (read/edit/write/run) → v1 single agent → v2 multi-agent supervisor |
| CLI client | `lf` commands (run, rescue, improve, cost, sessions) with local keychain vault |
| Offline mode | Cache last 20 sessions locally, queue events, sync on reconnect |

---

## 9. Rules for Every Phase

1. **One feature at a time.** Service file swap → page still compiles → verify in browser → next.
2. **Signatures never change.** Frontend pages don't know mock vs real. That is the whole trick.
3. **Routes only call services; services only touch the DB.** Already the rule in `apps/api`.
4. **Every new DB change = a drizzle migration + seed update.** Never hand-edit tables.
5. **Long tasks go to BullMQ jobs**, never inside a request.
6. **All payloads validated with Zod from `@layerflow/contracts`** (single source of truth).
7. **No mock data shipped in production.** `lib/data/*` stays for local-only demo.
8. **Typecheck + lint + tests must pass before every phase ends.**

---

## 10. Rollout Order (Short Version)

```
Phase 0  Local stack runs                    (1–2 days)
Phase 1  Auth + Home + Projects live         (3–5 days)
Phase 2  Rescue pipeline live                (5–7 days)   ← the product
Phase 3  Prompts + Models + Keys + Costs     (4–6 days)
Phase 4  History + Search + Passports        (3–4 days)
Phase 5  Stripe + Email + Deploy             (3–5 days)
────────────────────────────────────────────────────────
Browser = production. THEN:
Phase 6  lf CLI + session streaming           (later)
```
