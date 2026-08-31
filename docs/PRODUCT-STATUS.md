# LayerFlow — Product Status

**Last verified: 2026-08-28, by reading the actual code + running the full test
suites + builds.** This file is the single source of truth — it supersedes all
older planning docs. Claims here are backed by file paths; verify anything.

> Legend: ✅ DONE · 🟡 BUILT BUT BLOCKED / NOT LAUNCHED · 🔴 NOT DONE · 🔒 SECURITY

---

## TL;DR

LayerFlow is **production-ready in code**, **one deployment away from real**.
Web + API + terminal all **build clean and pass tests**. The only production
blocker is infra, not code: the BullMQ worker isn't running in production
(Vercel can't hold a persistent worker), so five features queue-but-never-run.
Deploy the worker → they all light up. See `DEPLOYMENT.md`.

| Area | Score | Why |
|---|---:|---|
| Frontend (web) | 90 | All 40+ routes build; typecheck green; real API calls, no mock layer |
| API surface | 95 | 24 route groups; plan-limits now enforced; device auth; gateway improve+usage |
| Worker/jobs | 70 | 11 jobs all wired — but NOT running in prod (the one blocker) |
| Terminal CLI | 92 | v0.2.15; premium TUI redesign; render cache; `/improve`; device-flow `lf login`; `lf cost` plan bar |
| Agents v2 | 90 | 13 templates, approvals, scheduling, 604-line processor — blocked only by worker |
| AI providers | 85 | 9 adapters; BYOK→platform→error chain; chat auto-failover; intelligence router |
| Billing | 55 | Dodo integrated + webhook verified; not launched; plan enforcement now wired |
| Security | 80 | AES-256-GCM BYOK; signed webhooks; rate limits; plan gating; no pen-test |
| Testing | 75 | API 25/25 files (148 tests) green; terminal `go test` green; no E2E |
| Deployment | 50 | Mode A live; Mode B (worker + api.domain) not executed |
| **OVERALL** | **~80** | **A complete product one deployment away from being real** |

---

## What IS live and working (production, layerflow.dev)

1. **Full website** — marketing, blog, pricing, docs on Vercel; all routes build.
2. **Google sign-in** — Better Auth, real sessions.
3. **Entire API on Vercel** — Hono mounted inside Next at `/api/*` + `/v1/*`
   (same-origin). Auth, chat, prompts, sessions, memory, search, budgets, keys,
   team, billing, agents, rescue, compare, sync, device-auth — all respond.
4. **Chat with real AI** — SSE streaming. Works with platform keys
   (Groq/Gemini free tiers) OR user BYOK keys (encrypted AES-256-GCM).
5. **OpenAI-compatible Gateway** — `layerflow.dev/v1/chat/completions` +
   `/v1/models` + `/v1/improve` + `/v1/usage`, API-key auth, rate-limited,
   budget reserve/settle, exact-match cache, gateway logs, savings headers.
6. **`lf` terminal CLI** — publicly installable (`brew install Rohit94r/tap/lf`
   or `curl -fsSL https://layerflow.dev/install | bash`), Windows installer too.
   Chat, run (agent), sessions, sync, models, doctor, rescue, cost, mcp,
   daemon, upgrade. ~18K lines of Go. Device-flow `lf login` (browser) with
   API-key paste fallback.
7. **Terminal ↔ Cloud sync** — handshake/push/pull, watermark, device registry.
8. **Billing routes** — Dodo checkout + signature-verified webhook.

## What is NOT working in production (the honest gaps)

1. 🔴 **Worker not running in production.** BullMQ jobs (compare, rescue, agents,
   embeddings, usage-rollups, budget-alerts, weekly-digest) enqueue to Redis but
   nothing processes them on Vercel. **THE #1 BLOCKER.** Fix = deploy Mode B
   (`DEPLOYMENT.md`).
2. 🔴 **`api.layerflow.dev` not deployed** — no DNS record. Gateway shares Vercel
   serverless (120s timeout, cold starts, no persistent-SSE scale).
3. 🟡 **Billing wired but not launched** — checkout works once Dodo product IDs
   are set; no paying customers yet.
4. 🟡 **Compare / Rescue / Agents** run perfectly in dev (worker running); in
   prod they queue forever until the worker is deployed.

---

## Feature audit (verified against code)

### Authentication — ✅
Google OAuth (Better Auth) · session management · **CLI device-code login
`POST /api/v1/auth/device` + `/token` + `/approve`** (Redis, 5-min TTL, mints a
workspace API key) · API keys (mint/list/revoke, prefix-display only) · logout.

### Chat — ✅
Multi-model SSE streaming · **auto model switch on failure** with a "switched
to X" notice (`services/chat/router.ts`, `CHAT_MODEL_PRIORITY`) · message
persistence · mid-conversation model switch · terminal interactive + one-shot ·
context compaction (`services/chat/context.ts` + `terminal/internal/compact`).
Files-in-chat: 🟡 (upload exists, not wired into composer).

### Prompt system, Memory, Search — ✅
Projects → prompts + versioning + tags + scoring · auto memory-extraction job ·
pgvector embeddings (falls back to local when OpenAI has no credits — verified
in tests) · hybrid search (keyword + semantic, merge/rank) · pinned learnings.

### Rescue / Compare / Agents — 🟡 (blocked by worker in prod)
Full pipelines built: `services/rescue/`, `services/compare/rank.ts` (+ tests),
`services/agents/agents.ts` (13 marketplace templates, `decideAgentApproval`,
scheduled + maintenance jobs), `jobs/processors/agent.ts` (604 lines, real
execution incl. a specialized job-applying path). All real code. All dead in
prod without the worker.

### Models & providers — ✅
9 adapters: OpenAI · Anthropic · Google · DeepSeek · Groq · xAI · Kimi
(Moonshot) · OpenRouter · generic openai-compatible. 19-model registry with
micro-dollar pricing. Key resolution: **BYOK → platform env → error**
(`services/ai/providers/keys.ts`). Intelligence router classifies task →
recommends model with savings % (`services/intelligence/`).

### Managed multi-model (the "free first month" path) — ✅
A new user installs `lf`, runs `lf login` (browser), and chats immediately with
**no provider key of their own**. LayerFlow's platform keys (Groq + Gemini free
tiers configured today; add DeepSeek $10 deposit when ready) cover managed use;
BYOK is always free and unlimited. **Plan-limits enforcement is now wired**
(see "Today's fixes" below) so a free user can never burn a paid provider key,
and the `/v1/models` `available` flag reflects plan-allowed managed providers.

### BYOK vault — ✅ 🔒
AES-256-GCM with KEK from `PROVIDER_KEYS_KEK` (`services/crypto.ts`, tests incl.
unicode). Keys never returned to browser (only `keyHint`). Per-workspace.

### Gateway (OpenAI-compatible) — ✅ (same-origin)
`gateway/router.ts`: `requireApiKey` + 60/min rate limit · budget reserve/settle
(atomic Redis Lua) · exact-match cache · gateway_logs · savings headers ·
`/v1/improve` · `/v1/usage`. Mounted at `layerflow.dev/v1/*`. Needs own domain +
SDK conformance test before marketing "OpenAI-compatible".

### Budgets & cost — ✅
Hard caps with Redis reserve/settle/release · scopes (workspace/project/session)
· hourly usage-rollup + 80/100% budget-alerts + weekly digest (worker jobs) ·
costs dashboard + savings tracking.

### Billing — 🟡
Dodo Payments (India-first). `POST /api/billing/checkout`, `GET /api/billing/
status`, `POST /api/billing/webhook` (signature-verified, idempotent). Plans
Starter $5 / Pro $14 / Team. 🔴 Missing: Dodo product IDs in prod env, an
end-to-end test purchase. Plan-limit enforcement middleware is now wired (see
below) so once billing is configured, managed provider access is gated by plan.

### Team, Sync, Email, Community — ✅ / 🟡
Team RBAC + invitations ✅ · sync protocol (handshake/push/pull, 200/500 batch
caps, 100KB payload, device registry) ✅ · Resend email (alerts/digests) ✅ ·
community (profiles/collections/clone/social) 🟡 built, soft-launched.

### Terminal CLI (`lf`) — ✅ v0.2.15 (per-command honesty below)

| Command | Real? | What it actually does |
|---|---|---|
| `lf chat` | ✅ | Streams via gateway `POST /v1/chat/completions` (SSE); TUI + one-shot |
| `lf run <task>` | 🟡 | Single-shot gateway call with a focused task prompt (tools disabled). The full multi-step agent loop with tool execution + approvals runs **server-side** (Agents v2 in the dashboard); terminal `run` is a one-shot wrapper for now |
| `lf sync` | ✅ | Real bidirectional push/pull via `/api/v1/sync/{handshake,push,pull}` with conflict merge + durable SQLite journal |
| `lf models` | ✅ | Fetches `GET /v1/models` from the gateway (no hardcoded list) |
| `lf cost` | ✅ | `GET /v1/usage` + local usage; renders budget cap, progress bar, plan status |
| `lf login` | ✅ | Browser device flow first (my fix), API-key paste fallback, `--api-key` flag |
| `lf logout` | ✅ | Keyring purge |
| `lf sessions` | 🟡 | Real list + delete from SQLite; `--open` interactive restore is an honest stub |
| `lf rescue` | ✅ | Local SQLite → JSON continue-pack export (portability; not a gateway call) |
| `lf doctor` | 🟡 | Real local checks (config, SQLite, keyring, git, audit chain); no gateway HTTP probe — use `lf models` for that |
| `lf mcp list` | ✅ | Lists configured MCP servers from config |
| `lf mcp add/remove/health` | 🔴 | Honest stubs (`stubNotice`) |
| `lf daemon` | 🟡 | Real long-running process + file watcher + IPC socket; sync-queue draining is a no-op (use `lf sync` manually for now) |
| `lf upgrade` | 🟡 | Real GitHub release check + prints installer URL; atomic self-update not implemented |
| `lf version` | ✅ | Build info |

Distribution: Homebrew tap, `curl|bash`, PowerShell, goreleaser GitHub Action
(SHA-256 verified). Source stays private. The `tui/diff.go` viewer is fully
written but not yet invoked (awaiting the terminal agent-loop wiring).

---

## Today's engineering fixes (2026-08-28)

These closed the gaps the older planning docs listed as "remaining":

1. **Plan-limits enforcement wired** (was dead code). `canUseManagedProvider`
   is now called at the two managed-key resolution points:
   - `services/ai/providers/keys.ts` `loadProviderApiKey` → throws
     `402 plan_provider_not_included` if the plan disallows a managed provider
     (gateway/SDK path).
   - `services/chat/router.ts` `buildCandidates` → skips the platform candidate
     when the plan disallows it, so web chat auto-fails-over to an allowed
     provider instead of erroring.
   - `services/keys/provider-keys.ts` `listConfiguredProviders` now returns BYOK
     providers **plus plan-allowed platform providers**, so `GET /v1/models`
     shows free managed providers (Groq/Gemini) as `available` for a brand-new
     user — the "free first month" UX.
   - BYOK is never gated. Beta mode (billing unconfigured = free first month) is
     a cheap env check that always allows.

2. **`lf login` now uses the browser device flow** (was API-key paste only).
   `cmd/lf/login.go` tries the device flow first; on success stores the
   server-minted `lf_live_` key; falls back to API-key paste if the endpoint is
   unreachable or `--api-key`/`LF_API_KEY` is set. New `--api-key` flag.

3. **Terminal brand cleanup**. `internal/tui/brand.go` no longer renders the
   giant pixel-block ASCII art; the home screen uses the clean bold
   "LayerFlow.dev" wordmark (matching headers/help). Tagline retained.

4. **`lf` TUI premium redesign (v0.2.15)** — `internal/tui/`:
   - Brand hero is now a title-rule wordmark (`── LayerFlow.dev ──`) +
     centered tagline; it degrades to a plain centered wordmark on narrow
     terminals and never overflows.
   - Home hints use accent-hotkey labels; the tip row uses an accent dot; the
     status bar gained a hairline top rule so it reads as a footer.
   - Chat messages are role-marked (`❯ You` / `◆ LayerFlow`) with a subtle
     hairline divider between turns; the streaming block matches.
   - Overlays (sessions, models, search, help, login, activity) now share
     accent-dot titles, `◆`-prefixed section labels, and the sessions list
     renders a clean single-line row (title · preview · model · date) — model
     chips no longer wrap onto a second line.
   - Regression guards kept green: `TestRenderHomeNoOverflow`,
     `TestRenderChatNoOverflow`, `TestNoBackgroundArtifacts`,
     `TestNoPanelBackgroundBands`, `TestStatusBarCompact`,
     `TestConversationScrollNoOverflow`, `TestRenderTinyDimensions`.

---

## What's DONE in code (no more engineering needed)

Auth · multi-model streaming chat (web+terminal) · auto model switch · prompt
library + versioning · memory + embeddings · hybrid search · BYOK vault ·
budgets (reserve/settle) · cost analytics · intelligence routing · gateway +
cache + logging + improve + usage · sync protocol · team workspaces · CLI
v0.2.15 + installers · email · admin analytics · device-auth endpoints ·
plan-limit enforcement · agents v2 (templates/approvals/scheduling) ·
managed multi-model · `/improve` + `lf cost` plan bar · premium TUI redesign.

## What's USER-SIDE (founder/ops, not code) — the real remaining work

These need **you**, not an engineer:

1. **Deploy API + worker off Vercel** (Render Blueprint or Fly). `render.yaml`
   is complete (both services). ~30 min of dashboard work. → `DEPLOYMENT.md`.
2. **Point `api.layerflow.dev` DNS** at the deployed host; set
   `NEXT_PUBLIC_API_URL` on Vercel; redeploy; add the Google OAuth redirect URI.
3. **Add provider platform keys** (env on the new host): start with Groq +
   Gemini free tiers (already configured); add `DEEPSEEK_API_KEY` ($10 deposit)
   when ready. OpenAI/Anthropic only at Pro-tier, revenue-linked.
4. **Launch billing**: create Dodo products (Starter $5, Pro $14), set
   `DODO_PRODUCT_*` env, add webhook URL, test-purchase, flip to live.
5. **Release `lf v0.2.15`** — DONE. Tagged `v0.2.15` with the device-flow
   login, honest command help, plan-limit enforcement, and the premium TUI
   redesign → GitHub Action publishes binaries + Homebrew.
6. **E2E test suite** (Playwright) and a real pen-test before scaling.

## Known gaps (non-blocking, prioritized for future work)

**Terminal agent loop (the main future feature):**
- `lf run` is a single-shot gateway call today (tools disabled). A full
  terminal-side multi-step agent loop with tool execution + approval gates +
  the inline diff viewer (`tui/diff.go`, already written but not yet invoked)
  is the top terminal roadmap item. The **server-side** agent runtime is
  complete (Agents v2: 13 templates, approvals, scheduling, 604-line processor)
  and runs in the dashboard once the worker is deployed.
- `lf upgrade` checks for updates but doesn't self-install (re-run installer).
- `lf daemon` runs but sync-queue draining is a no-op (use `lf sync` manually).
- `lf mcp add/remove/health` are honest stubs (`lf mcp list` works).

**Other:**
- Terminal fallback (`PickAvailableModel`) picks the first available model, not
  explicitly the cheapest — for free users all available models are free anyway
  (plan-gated), so cosmetic. Server-side chat failover already orders cheap-first.
- No terminal-side BYOK adapters for DeepSeek/Kimi/Qwen — managed mode covers
  them via the gateway; for BYOK-direct add keys in the web dashboard.
- No E2E test suite (Playwright); no pen-test; PostHog analytics not wired
  (intentionally not yet — see ROADMAP).

---

## Test & build status (run today)

| Suite | Command | Result |
|---|---|---|
| API tests | `npm test --workspace @layerflow/api` | ✅ 25/25 files, 148 passed, 2 skipped |
| API typecheck | `npm run typecheck --workspace @layerflow/api` | ✅ exit 0 |
| API build | `npm run build --workspace @layerflow/api` | ✅ tsup success |
| Terminal build | `cd terminal && go build ./...` | ✅ exit 0 |
| Terminal vet | `go vet ./...` | ✅ exit 0 |
| Terminal tests | `go test ./...` | ✅ all packages pass |
| Web typecheck | `npm run typecheck` | ✅ exit 0 |
| Web build | `npm run build` | ✅ all 40+ routes compile |

> Note: API tests log `redis connection error` (no local Redis) and OpenAI
> `429 insufficient_quota` during the embeddings test — both are handled
> gracefully (budgets fail-closed; embeddings fall back to local) and the
> tests still pass. This is the free-tier resilience path working as designed.
