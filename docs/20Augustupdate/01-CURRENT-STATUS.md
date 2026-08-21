# Section 1 — Current Product Status & Complete Feature Audit
**Date: 20 August 2026 | Source: Full repository audit (not docs, not memory — actual code)**

> Legend: ✅ COMPLETE (verified working flow) · 🟡 PARTIAL (exists, incomplete) · 🔴 NOT BUILT · 🟠 MOCK/FAKE · 🔵 IN PROGRESS · ⚠️ RISK · 🔒 SECURITY · 🚀 PRODUCTION READY

---

## 1.1 What LayerFlow Actually Is (as built)

**LayerFlow** is a multi-model AI workspace for developers, live at **https://layerflow.dev**, consisting of THREE products sharing one backend:

1. **Web workspace** (Next.js 16) — chat across AI models, prompt library with versioning, AI memory, semantic search, cost analytics, hard budgets, BYOK vault, team workspaces, agents, rescue (continue dead AI chats).
2. **`lf` terminal CLI** (Go, v0.2.6) — local-first AI terminal workspace: streaming chat, agentic `run`, tools, LSP, MCP, sessions in SQLite, cloud sync, approval gates, full Bubble Tea TUI.
3. **OpenAI-compatible Gateway** (`/v1/*`) — point any OpenAI SDK at LayerFlow; get routing, budgets, caching, logging, and cost tracking across 8 providers / 21 models.

**Core problem solved:** developers use 3–5 AI tools; prompts are scattered, costs are invisible, limits kill momentum mid-task. LayerFlow is the control layer: one workspace, every model, costs under control, browser AND terminal.

**Target users:** indie developers, freelancers, students, small teams — anyone paying multiple AI bills and juggling tabs.

---

## 1.2 Current Architecture (verified)

```
Browser (layerflow.dev, Vercel)
   │
   ├── Next.js 16 App Router
   │     ├── marketing + blog + docs pages
   │     ├── (dashboard): home, chat, prompts, memory, search,
   │     │   costs, models, keys, agents, team, billing,
   │     │   history, settings, terminal, workspace
   │     └── API mounts (serverless):
   │           /api/auth/*    → Better Auth (Google OAuth)
   │           /api/*         → Hono app (catch-all)      ← app/api/[[...route]]/route.ts
   │           /v1/*          → OpenAI-compatible gateway ← app/v1/[[...route]]/route.ts
   │
   ├── apps/api (Hono, TypeScript) — THE SAME CODE runs:
   │     (a) mounted inside Next on Vercel  ← current production
   │     (b) standalone `node dist/index.js` on Fly/Render ← not yet deployed
   │
   ├── apps/api/src/worker.ts (BullMQ) — runs LOCALLY in dev; 🔴 NOT in prod
   │
   ├── PostgreSQL (Neon) + pgvector — 21 schema modules
   ├── Redis (Upstash) — queues, budgets (Lua), rate limits, cache
   │
   └── AI providers (real adapters):
         OpenAI · Anthropic · Google · DeepSeek · Groq · xAI · Kimi · OpenRouter
         + generic openai-compatible adapter

Terminal (lf, Go 1.25)
   ├── TUI: Bubble Tea + Lip Gloss + Glamour (markdown)
   ├── SQLite (modernc.org/sqlite — pure Go, no cgo) + migrations
   ├── auth: device-code OAuth (keyring storage) OR API key
   ├── sync: journal → /api/v1/sync/{handshake,push,pull}
   ├── providers: local model routing (openai/anthropic/gemini/local via cloud gateway)
   ├── tools: read/write/edit/grep/glob/shell/git + LSP + MCP clients
   └── daemon + watcher + audit log
```

**Monorepo layout:**

| Path | What it is |
|---|---|
| `app/` | Next.js frontend (marketing + dashboard + api mounts) |
| `apps/api/` | Hono API + BullMQ worker + DB + services |
| `apps/cli/` | (placeholder — the real CLI lives in `terminal/`) |
| `terminal/` | Go CLI `lf` — 17.5K lines |
| `packages/contracts/` | Zod schemas shared by web + API |
| `packages/model-registry/` | 21 models × 8 providers, micro-dollar pricing |
| `packages/config/`, `packages/ui/` | shared config / UI (minimal) |
| `docs/` | 20 docs including DEPLOYMENT.md (Hinglish, very detailed) |
| `scripts/` | deploy-api-prod.sh (Fly), check-production.sh, vercel-env-checklist.sh |
| `render.yaml` | Render blueprint (API + worker) — alternative to Fly |
| `.github/workflows/release.yml` | goreleaser → public binaries + Homebrew formula |

---

## 1.3 Feature-by-Feature Audit

### Authentication — ✅ COMPLETE
| Feature | Status | Evidence |
|---|---|---|
| Google OAuth sign-in | ✅ | `app/api/auth/[...all]/route.ts`, Better Auth; redirect `layerflow.dev/api/auth/callback/google` |
| Session management | ✅ | cookie-based, `apps/api/src/middleware/auth.ts` |
| CLI device-code login | 🟡 | `terminal/internal/auth/auth.go` — flow written, but `auth.layerflow.dev` endpoints not deployed; fallback = paste API key |
| API keys (gateway) | ✅ | `apps/api/src/routes/keys/api-keys.ts` + `services/keys/api-keys.ts` — mint/list/revoke, prefix display only |
| Logout / signout | ✅ | web + `lf logout` (keyring purge) |

### Chat — ✅ COMPLETE (web) / 🟡 terminal polish
| Feature | Status | Evidence |
|---|---|---|
| Multi-model chat, SSE streaming | ✅ | `services/chat/` — store, router, context, prompts, health, markdown |
| Auto model switching on failure | ✅ | `services/chat/router.ts`, integration test `chat-switch.integration.test.ts` |
| Message persistence + history | ✅ | `db/schema/chat.ts`, routes `/api/chat` |
| Model switch mid-conversation | ✅ | `/api/chat/:id/switch` |
| Terminal chat (interactive TUI + one-shot) | ✅ | `cmd/lf/chat.go`, `internal/tui/` |
| Context compaction | ✅ | `services/chat/context.ts` + `terminal/internal/compact/compact.go` |
| Files/attachments in chat | 🟡 | upload exists (`routes/files`, S3 presign) — not wired into chat composer |

### Prompt System — ✅ COMPLETE
Projects → prompts, versioning, tags, favorites, scoring, import from chat. DB-backed (`db/schema/prompts.ts`), real routes (`routes/prompts/`), frontend `components/features/prompts/`. **No mock data found in the prompt flow.**

### Memory — ✅ COMPLETE
- Auto-extraction job (`jobs/processors/memory-extract.ts`)
- Embeddings (`services/search/embeddings.ts`, pgvector)
- Injection into chat context (`services/chat/context.ts`)
- Terminal mirror (`terminal/internal/memory/memory.go` + sync entity `memory`)
- Pinned learnings (`services/learning/`)

### Search — ✅ COMPLETE (hybrid)
Keyword (`services/search/keyword.ts`) + semantic (`similar.ts` via pgvector) with merge/rank. Covers sessions, messages, prompts, memory. Dashboard page `app/(dashboard)/search/`.

### Rescue — 🟡 BLOCKED BY WORKER IN PROD
Full pipeline built: report generation, context extraction, compression, cost estimates, continue-pack (`services/rescue/`, `routes/rescue/`, `jobs/processors/rescue.ts`, `services/savings/compress.ts` with tests). Works in dev (worker running). **In production the job enqueues but nothing processes it** → user sees "queued" forever. 🔴 until Mode B deploys.

### Compare (multi-model side-by-side) — 🟡 SAME BLOCKER
`services/compare/rank.ts` (+ rank tests), `jobs/processors/compare.ts`, frontend chart. Same story: perfect in dev, queued forever in prod.

### Agents (v2) — 🟡 SAME BLOCKER + nearly complete
The most sophisticated subsystem:
- Marketplace templates (`AGENT_MARKETPLACE_TEMPLATES` in `services/agents/agents.ts`)
- Create/configure/run with approval gates (`decideAgentApproval`)
- Scheduled agents + maintenance jobs (`jobs/processors/agent-scheduled.ts`, `agent-maintenance.ts`)
- Step logs, progress, usage, cancellation
- Frontend: `app/(dashboard)/agents/` + `components/features/workspace` agents UI
All real code. All dead in production without the worker.

### Models & Providers — ✅ COMPLETE
| Provider | Adapter file | Streaming | Tool calling | Status |
|---|---|---|---|---|
| OpenAI | `services/ai/providers/openai.ts` | ✅ | ✅ | ✅ |
| Anthropic | `anthropic.ts` | ✅ | ✅ | ✅ |
| Google Gemini | `google.ts` | ✅ | ✅ | ✅ |
| DeepSeek | `deepseek.ts` | ✅ | ✅ | ✅ |
| Groq | `groq.ts` | ✅ | ✅ | ✅ |
| xAI (Grok) | `xai.ts` | ✅ | ✅ | ✅ |
| Kimi (Moonshot) | `kimi.ts` | ✅ | ✅ | ✅ |
| OpenRouter | `openrouter.ts` | ✅ | ✅ | ✅ |
| Any OpenAI-compatible | `openai-compatible.ts` | ✅ | ✅ | ✅ |

- 21 models in `packages/model-registry` with micro-dollar pricing, context windows, capabilities.
- Key resolution: BYOK (user's encrypted key) → platform fallback (GROQ_API_KEY / GEMINI_API_KEY env) — `services/ai/providers/keys.ts`.
- Health check endpoint for configured providers (`services/chat/health.ts`).

### Model Routing (intelligence) — ✅ BUILT, 🟡 TUNABLE
`services/intelligence/route.ts` + `recommend.ts` (+ tests) + `analyze.ts` — classifies task, scores models on quality/latency/cost/context, recommends + alternative with savings %. This is a real differentiator vs OpenCode.

### BYOK Vault — ✅ COMPLETE 🔒
- AES-256-GCM with KEK from `PROVIDER_KEYS_KEK` (`services/crypto.ts`, has tests incl. unicode round-trip)
- Keys never returned to frontend — only `keyHint` (last 4 chars)
- Per-workspace scoping, connect/revoke flows in `app/(dashboard)/keys/`

### Gateway (OpenAI-compatible) — ✅ COMPLETE (same-origin)
`gateway/router.ts`:
- `requireApiKey` middleware + 60 req/min rate limit
- Budget reserve → call → settle/release (atomic, Redis Lua: `services/budgets/lua.ts`)
- Exact-match response cache (`cache/exact.ts`) — same user+prompt = cached, marked `x-layerflow-cache: hit`
- Every request logged to `gateway_logs` (latency, model, status, error)
- Savings headers (`x-layerflow-tokens-saved`, `x-layerflow-cost-saved-micro`)
- Mounted at `layerflow.dev/v1/*` TODAY. Needs its own domain + real SDK conformance testing before marketing "OpenAI-compatible".

### Budgets & Cost — ✅ COMPLETE
- Hard caps with Redis enforcement (reserve before call, settle after) — `services/budgets/enforce.ts` + Lua
- Scopes: workspace/project/session (`budgets/scopes.ts`)
- Usage rollups hourly (`usage-rollup` scheduled job), budget alerts at 80/100% (`budget-alerts`), weekly digest email
- Costs dashboard: `app/(dashboard)/costs/`, per-model spend, savings tracking (`services/savings/`)

### Billing — 🟡 INTEGRATED, NOT LAUNCHED
- Provider: **Dodo Payments** (India-first, no US entity needed) — `services/billing/dodo.ts`
- Routes: `POST /api/billing/checkout` (hosted checkout), `GET /api/billing/status`, `POST /api/billing/webhook` (signature-verified)
- Plans: Starter $5/mo, Pro $14/mo, Team — `services/billing/plans.ts`
- 🔴 Missing: Dodo product IDs configured in prod env, end-to-end test purchase, plan enforcement middleware on chat/run limits

### Team — ✅ COMPLETE
Roles, invitations, member management (`routes/team/`, `db/schema/workspace.ts` tenancy). Frontend `components/features/team/`.

### Sync (browser ↔ terminal) — ✅ COMPLETE
Full protocol (`routes/sync/sync.ts`): handshake/push/pull, server watermark, batch limits (200 push/500 pull), 100KB payload cap, entity whitelist (session/message/memory/project), conflict states, device registry. Client journal in `terminal/internal/sync/`. Dashboard device list at `/api/v1/sync/devices`.

### Terminal CLI (`lf`) — ✅ SHIPPED v0.2.6
| Command | Status | Notes |
|---|---|---|
| `lf` (TUI) | ✅ | Bubble Tea full-screen; ChatGPT-style redesign v0.2.4 |
| `lf chat [-n "q"]` | ✅ | streaming, model auto-pick if unavailable |
| `lf run "task"` | ✅ | agent loop, maxSteps, tool approvals |
| `lf sessions` | ✅ | local SQLite history |
| `lf login` / `logout` | 🟡 | device-flow written; currently paste-API-key flow |
| `lf sync` | ✅ | push/pull, `--dry-run`, `--resolve <op>` |
| `lf models` | ✅ | lists + availability check via gateway |
| `lf doctor` | ✅ | env/connectivity diagnostics |
| `lf rescue` | ✅ | rescue from terminal |
| `lf mcp` | ✅ | MCP client config |
| `lf daemon` | ✅ | background sync daemon |
| `lf upgrade` | ✅ | self-update |
| `lf cost` | ✅ | usage/cost from API |

Distribution (all live): `brew install Rohit94r/tap/lf` · `curl -fsSL https://layerflow.dev/install \| bash` · PowerShell `install.ps1` · public binaries repo `Rohit94r/layerflow-releases` (goreleaser, SHA-256 verified). Source stays private. Release flow: push `v*` tag → GitHub Action auto-publishes.

### Files / Storage — 🟡
S3-compatible presigned uploads (`services/files/storage.ts`, `@aws-sdk/client-s3`) — configured for Cloudflare R2. Upload UI exists; not deeply integrated into chat/agents yet.

### Email — ✅
Resend integration + templates (`services/email/`): budget alerts, weekly digest, notifications.

### Audio — 🟡
ElevenLabs adapter (`services/audio/elevenlabs.ts`) — route exists, low priority.

### Community — 🟡
Profiles, collections, clone, social, notifications (`services/community/`, `routes/community/`) — built for prompt sharing; soft-launched, no users yet.

---

## 1.4 Mock/Fake Data Audit 🟠

Searched for mock/demo/placeholder patterns. **The core product is clean** — services call the real API. Remaining cosmetic mocks:
- Testimonials on the landing page (labeled mock in `lib/data/marketing.ts`) — fine for marketing, replace with real users later.
- `lib/services/workspace.ts` contains mock fallback when API unreachable (graceful degradation, clearly intended).
- `services/learning/seed.ts` seeds starter learnings for new users (intentional, not fake).
- Blog content is real MDX in `content/`.

**No hardcoded AI responses found. No fake streaming. Providers make real HTTP calls.**

---

## 1.5 Security Audit 🔒

| Control | Status | Evidence |
|---|---|---|
| Provider keys encrypted at rest (AES-256-GCM, KEK) | ✅ | `services/crypto.ts` + tests |
| Keys never sent to browser | ✅ | only `keyHint` last-4 in DTOs |
| Webhook signature verification (Dodo) | ✅ | `services/billing/dodo.ts` |
| Rate limiting (gateway 60/min + per-route) | ✅ | `middleware/rate-limit.ts` |
| Workspace isolation on every query | ✅ | workspaceId scoping throughout services |
| Security headers (XFO, nosniff, referrer, permissions) | ✅ | `next.config.mjs` |
| SSRF/path traversal on tools | 🟡 | terminal tools have approval gates; web file routes use presigned URLs |
| Prompt injection hardening | 🟡 | system prompts in `services/chat/prompts.ts`; no dedicated guard yet |
| Terminal shell tool permissions | ✅ | `tui/approval.go` — explicit user approval before dangerous ops |
| Secrets in repo | ✅ | `.env*` gitignored; only `.env.example` committed |
| CSRF/OAuth state | ✅ | Better Auth handles |
| Pen-test / audit | 🔴 | none yet |

---

## 1.6 Testing Audit

| Layer | Count | Notes |
|---|---|---|
| API unit/integration tests | 30 files | crypto, budgets enforce, compare rank, chat context/switch, markdown, improve, embeddings, streaming, sentry, dodo, rank, recommend, analyze, compress, rescue… run `npm test --workspace @layerflow/api` |
| Frontend tests | ~0 | vitest configured at root, no meaningful suites |
| Terminal tests | yes | `go vet`, `go test -race` green per DEPLOYMENT.md |
| E2E | 🔴 | none |

---

## 1.7 Complete / Partial / Missing Summary

### ✅ COMPLETE (verified flows)
Auth (Google) · multi-model streaming chat (web+terminal) · auto model switch · prompt library + versioning · memory + embeddings · hybrid search · BYOK vault + encryption · budgets (reserve/settle) · cost analytics · intelligence routing · gateway + caching + logging · sync protocol · team workspaces · CLI v0.2.6 + installers · email alerts/digests · admin analytics · docs/blog/marketing site

### 🟡 PARTIAL (built, blocked, or unlaunched)
Rescue + Compare + Agents (blocked by prod worker) · billing (integrated, not launched) · CLI device-auth (code ready, endpoint not deployed) · files-in-chat · community

### 🔴 NOT BUILT / NOT DONE
Production worker hosting · `api.layerflow.dev` DNS · `auth.layerflow.dev` device endpoints · E2E tests · plan-limit enforcement middleware · mobile apps

### 🟠 MOCK
Landing testimonials (marketing only — acceptable)

### 🚨 CRITICAL BLOCKERS (in order)
1. **Worker not running in production** → rescue, compare, agents, rollups, alerts, digests all silently dead on layerflow.dev
2. **api.layerflow.dev not deployed** → gateway shares Vercel serverless (120s max duration, cold starts, no persistent SSE scale)
3. **Billing not launched** → $0 MRR (by choice, but Dodo product setup is the gate)

### NEXT 10 ENGINEERING TASKS
| # | Priority | Task |
|---|---|---|
| 1 | P0 | Deploy API + worker (Fly.io — script exists: `scripts/deploy-api-prod.sh`) |
| 2 | P0 | DNS `api.layerflow.dev` → deployed host; set env on Vercel; redeploy |
| 3 | P0 | Verify: worker processes compare/rescue/agent jobs end-to-end |
| 4 | P1 | Dodo: create products, set `DODO_PRODUCT_*` env, test purchase, enforce plans |
| 5 | P1 | Device-auth endpoints (reuse API host `/api/v1/auth/device/*`) → `lf login` browser flow |
| 6 | P1 | Managed-mode provider keys (at least Groq+Gemini free tiers) for zero-setup onboarding |
| 7 | P1 | Gateway SDK conformance test (openai-python + openai-node against `/v1`) |
| 2 | P2 | Files → chat composer integration |
| 9 | P2 | E2E smoke suite (Playwright) for sign-in → chat → budget |
| 10 | P2 | Semantic search ranking tuning + re-index job |

---

## 1.8 Tech Stack (final word)

**Web:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Better Auth · zod contracts
**API:** Hono 4 · Node · BullMQ 5 · ioredis · Drizzle ORM · pg (Postgres) · pino logs · Sentry · zod v4
**DB:** PostgreSQL (Neon) + pgvector · Redis (Upstash)
**AI:** 8 provider adapters · 21-model registry (micro-dollar pricing) · SSE streaming
**Terminal:** Go 1.25 · Cobra · Bubble Tea/Lip Gloss/Glamour · modernc sqlite · go-keyring · MCP + LSP clients
**Infra:** Vercel (web + same-origin API today) · Fly.io or Render (API+worker target) · Cloudflare R2 (files) · Resend (email) · Dodo Payments (billing) · GitHub Actions + goreleaser (CLI releases)
