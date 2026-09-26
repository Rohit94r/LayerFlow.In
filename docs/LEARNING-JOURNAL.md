# LayerFlow — Learning Journal

> Phase 5.7: what I built and learned, phase by phase. Written as career content:
> the backend story I can tell in an interview, backed by real numbers, with the
> honest "what I'd do differently" included. The product: **the AI spend
> firewall** — hard per-project spend caps, per-project cost tracking and alerts
> for solo devs and freelancers.

---

## The 30-second pitch

LayerFlow is an **OpenAI-compatible gateway with a budget brain**. You point your
AI client at `/v1` — one base-URL change — and LayerFlow mints an API key,
reserves budget server-side in Redis, blocks hard with a `402` when you cross a
cap, tracks spend per project, and alerts you at 50/80/100%. Keys work two ways:
"vault mode" (encrypted on server) and "direct/no-store mode" (the key never
touches our servers or logs).

Tech: **Next.js + Hono + Postgres + Redis (BullMQ) + Drizzle + Better Auth +
Golang CLI**, deployed as **one Docker image with two Fly process groups**.

---

## Phase 1 — Clean slate

**What I did:** deleted 120+ files (legacy deploy assets, archived audits,
superseded docs, dev scratch), slimmed docs to one coherent set, and re-verified
builds. The lesson: **a product's discoverability is a code artifact**. Everyone
says "delete aggressively" — very few do it.

**Backend concepts:** monorepo layout (`apps/` vs `packages/` vs `docs/`) and why
shared contracts + the price registry live in `packages/`; `.gitignore` /
`.dockerignore`; tracked vs ignored files; why secrets never go in `.env` files.

**Verification:** repo typechecks + API tests + `go build ./...` green.

---

## Phase 2 — Make production actually work

**What I did:** scripted the real deployment path — `fly.toml` with `app` +
`worker` process groups from one Docker image, `deploy:api`, a preflight script
that fails fast on missing keys, and `check:prod` that verifies the site, DNS,
API health and worker health.

**Backend concepts:**
- **Docker multi-stage builds** and one image serving two process groups.
- **`release_command` (migrations) vs machine startup** — the difference between
  "schema applied once, atomically" and "app boots and tries to query a table
  that isn't there yet".
- DNS/CNAME, TLS certs, and why **OAuth redirect / auth URL must match the real
  domain** or Google login silently breaks.
- "Works locally" vs "works in prod" — env, base URLs, secrets.

**Honest note:** the actual `fly deploy` still needs the user's Fly/Vercel
credentials — I can script everything up to the last mile, but the last mile is
a person with an account.

---

## Phase 3 — Narrow to the wedge: the AI spend firewall

This is the meat. **11 tasks**, all implemented.

**What I did:**
- Reframed positioning to one sentence and froze ~15 old feature areas.
- **Plan-gated managed keys** (a free "demo" key is the only way to use managed
  AI) and added a tight demo mode (20 msgs/day/user + a global cap) so free keys
  can't be drained. **Directory: `services/chat/` + `demo-limits.ts`.**
- Built **BYOK + Direct keys** (the opencode/Cline parity feature):
  - `lf` auto-resolves `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY`,
    etc. from the environment — `lf chat` works with no login.
  - Custom **OpenAI-compatible base URL** providers (Ollama, LM Studio, vLLM, Groq).
  - A dashboard quick-add vault (AES-256-GCM encrypted provider key storage).
  - **Two key modes**: vault mode (server-side caps enforced against the stored
    key's *declared* cost) and **direct/no-store mode** (key per request, never
    stored, never logged, headers only).
- Built the **price-accuracy gate**: a test suite pinning per provider+model cost
  math to 4 decimals against the registry; a model whose math doesn't pin is
  marked "no cap" — **never a wrong cap**.
- Kept the gateway invisible: streamed upstream tokens straight through, minimal
  added latency (measured in `check:prod`).
- Added `x-lf-project` header tagging → per-project cost buckets with
  auto-created projects.
- Re-enabled alerts at 50/80/100% + weekly digest via a worker queue.
- Trimmed the CLI from 14 commands to the wedge set.

**Backend concepts (the interview gold):**
- **Gateways and proxy middleware** — request → auth → plan gate → resolver →
  budget reserve → upstream → stream-through → settle, and what each layer owns.
- **Budgets: reserve/settle in Redis with an atomic Lua script.** The heart of
  the product. A chat request isn't a simple `insert`; it's *reserve on the way
  in* (so concurrent requests can't oversell a cap) and *settle/release on the way
  out* (provider failure refunds the reservation). The Lua script is the
  single-writer primitive that makes "cap exactly at 100%" true.
- **Enforcing business rules server-side, not in the UI.** The plan gate,
  the hard block, the demo limits — all enforced in the API, not by hiding a
  button.
- **Headers as product input** — `x-lf-project`, direct-key headers.
- **BYOK ergonomics**: env-var resolution, custom OpenAI-compatible providers,
  and the security posture that no-store keys must never hit logs or DB.

---

## Phase 4 — Monetize, secure, and the hook features

**What I did:** cost reports (CSV/PDF, per project/month), a **runaway-loop
detector** (N identical calls in T seconds → auto-pause the key/project + alert
— the "kill switch"), a LayerFlow **MCP server**, **PostHog** capture (env-gated,
server-side), and a hardening pass: **vault KEK rotation, an audit log, and an
explicit fail-open option**.

**Backend concepts:**
- **Webhooks**: signature verification, idempotency keys, and the payment
  lifecycle (Dodo checkout → webhook → entitlement update).
- **Observability**: server-side analytics capture that's env-gated so dev never
  pollutes prod data; request tracing.
- **Security**: AES-256-GCM envelope encryption and KEK/DEK separation, rotation
  as a real operation, audit logging, and the fail-open vs fail-closed tradeoff
  as a *product decision* (a billing hiccup must never brick the gateway).
- **MCP protocol** — JSON-RPC, tool registration, resource listing.

---

## Phase 5 — Ship, test, learn

**What I did (and the numbers to prove it):**
- **5.1 Playwright E2E for the wedge path** — first E2E suite: sign-up → create
  key → send request → see cost → set cap → get blocked → see the hard-block
  banner. 2 passing tests + 1 opt-in test (direct keys, requires a real provider
  key so it can't flake in CI). The whole suite runs hermetically against a
  local server, Postgres, and Redis.
  - This is where I learned the difference between **unit tests (vitest)**,
    **E2E (Playwright)**, and **Go tests** — and that an E2E test is a *system
    under test*: it taught me real things about my own product (the costs page
    hides its budget panel until there's spend; gateway keys use `[A-Za-z0-9_-]`;
    a migration hadn't been applied to the dev DB so `provider_keys.base_url` was
    missing at runtime).
- **5.2 Worker job tests** — usage-rollup + budget-alert + digest units run in
  CI. Current API suite: **246/246 tests across 41 files**.
- **5.3 Lint backlog** — repo-wide lint to **0 problems** in the wedge areas.
- **5.4 Ship + 5.5 Users** — the deploy/tag and the 15 user conversations are
  *user actions*; I scaffolded the tooling (`docs/USER-CONVERSATIONS.md`,
  `docs/DECISION-DASHBOARD.md`).
- **5.6 Decision dashboard** — `docs/DECISION-DASHBOARD.md`: 5 numbers (signups,
  WAU via real gateway requests, conversations, paying customers/MRR, hours)
  with the exact PostHog events / SQL to source each, and the hard rule: *"if
  the five don't move for 3 weeks, change the approach, not the feature list."*
- **5.7 This journal.**

**Backend concepts:**
- **E2E test architecture**: web-server orchestration, readiness checks (an HTTP
  status in `[200,404)`), the `webServer` lifetime, and the trap that Playwright's
  standalone `request` fixture doesn't share the browser cookie jar while
  `page.request` does — a 30-minute lesson that cost me an hour.
- **Hermetic E2E without mocks**: seed a Redis counter + insert a rollup row to
  make the budget block deterministic, create a fake BYOK key so the gateway
  resolves a provider *before* the budget check fires, and never point at a real
  upstream from a test.
- **CI/CD and atomic releases**; `check:prod` as the single doorbell.
- **Product metrics**: the difference between signups, activation (real gateway
  requests) and retention — and why WAU must mean "made a request", not "logged in".

---

## What I'd do differently (honest)

1. **E2E first.** The Playwright suite arrived in phase 5 and immediately found
   real bugs (missing migration, conditional UI). Writing two wedge tests at
   phase 3 would've paid for itself ten times over.
2. **One Redis client abstraction.** The lifecycle "connect → op → close" showed
   up in a dozen places; a tiny wrapper would've removed the flake class where
   connections leak across test runs.
3. **Decide fail-open earlier.** It's a *product* decision that colors everything
   under it (gateway availability vs billing safety); I treated it as an ops
   detail for too long.
4. **Say "no" to features earlier.** The repo still carries ~15 frozen feature
   areas in git. They cost nothing *on disk*, but they cost in *attention* — every
   search result includes them. Freezing them in nav/docs was right; I'd delete
   more code outright instead of "dormant but kept".
5. **Ship the deploy before the last feature.** Phase 2's live deploy was
   blocked on credentials; everything after it was unverified against production.
   Reordering would have validated the riskiest assumption (worker + Redis on
   Fly) earlier.

## The numbers, in one line

> **246/246 API tests (41 files), 9/9 web unit tests, 2 E2E green + 1 opt-in,
> terminal E2E 26/26 against the rebuilt `dist` server, repo lint 0, API
> typecheck 0 errors, Go build/vet/test green, all 28 shipped web routes 200 on
> `next start`, 11 Phase-3 tasks, ~15 features frozen, one product: an
> OpenAI-compatible gateway that refuses to let you blow your AI budget.**

## Production audit (2026-09-25)

Re-ran every suite against the built artifacts instead of dev mode. Three real
finds:

1. **The API typecheck was silently broken** — 33 errors across
   `src/test/workspace-crud.test.ts` (implicit-any callbacks from the untyped
   `json: any` helper) and `scripts/e2e-terminal.ts`. The root `npm run
   typecheck` had never gone green and nobody noticed, because nobody ran it.
   Lesson: a checks list that isn't wired into an actual gate is a wish, not a
   guarantee — `npm run typecheck` (all workspaces) is the gate now.
2. **The terminal E2E was order-sensitive to dirty data.** It picked the first
   workspace via `findFirst` and a leftover `running` command (or even its own
   diagnostic `raw` create) meant the device poll claimed the *older* command,
   breaking two assertions against the production server. Fixed by giving the
   script its own throwaway workspace (cascades away after) and dropping the
   diagnostic extra create. Now deterministic every run.
3. **"All tests pass" and "the app works" are different claims.** The dist build
    exercised `/health`, smoke, and the full remote-control protocol — the shape
    CI never ran. Only a negative smoke (no API → skip) existed; the positive
    path over the real server is the missing link and it's now documented in
    `docs/PRODUCT-STATUS.md`.

## Nav + sidebar restoration (2026-09-26)

Two web changes, both user-driven and both verified in a real browser:

1. **Sidebar labels would "sometimes" vanish.** Root cause: labels used
   `hidden lg:block`, so any window below the 1024px Tailwind `lg` breakpoint
   collapsed the 280px lavendar sidebar to a 64px icon rail with *no* labels —
   "sometimes" just meant "whenever the window is narrow/scaled". Fixed by
   making the expanded state viewport-driven (`matchMedia("(min-width: 768px)")`
   via `useSyncExternalStore`, SSR-safe) plus a persisted manual toggle
   (`localStorage "layerflow.sidebar"`). The two breakpoints were also out of
   sync with the fixed `w-[280px]` width; width is now state-driven and the
   `lg:` coupling is gone from labels and nav padding.
2. **Agents + Terminal unlinked from the nav during the wedge freeze are now
   first-class again** (explicit user request). Both live in a new "Build"
   group between Connect and Spend; the ⌘K palette's `terminal` entry had been
   mislabeled `Chat` and has its own entry now. Full flows re-verified in a
   browser against the live stack: sign-up → create a Common Assistant with a
   goal → detail (Live/Start cycle/Pause/Delete) → shows in the workforce list;
   REPL `/status` .. `/keys` .. `/models` respond, remote control queue/cancel
   works, and one **real LLM prompt through the web REPL streamed a correct
   answer** (`PONG-WEB-OK` on gpt-4o-mini) — proving the SSE path end-to-end,
   not just the mock. Verification battery after the changes: web + API
   typecheck 0, lint 0 (one `set-state-in-effect` warning created and removed),
   web build clean, E2E 2 passed + 1 opt-in.

Lesson: a frozen feature can keep *working* while unlinked — and unearthing it
means re-running the *browser* verification, not just the unit suites, because
the wedge E2E never touches the agents or terminal pages.