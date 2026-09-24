# LayerFlow — The Complete Product Context

> A plain-English guide to the whole product: what it is, the tech we use, every
> feature, what currently works, how we make money, and where we're going.
> Last refreshed: 2026-09-24.

---

## 1. What is LayerFlow? (in one paragraph)

LayerFlow is an **AI work platform** that lives in three places at once — a
website (your browser), a backend API + worker, and a terminal app called `lf`
that runs right in your command line. It gives developers and teams one account
for AI chat, autonomous agents, memory and search, budgets, teams, and a
terminal companion that syncs with your cloud — so you stop re-explaining work,
stop losing context, and stop guessing what your AI usage costs.

---

## 2. Product surfaces (the 3 parts)

| Surface | What it is | Where it lives |
|---|---|---|
| **Web app** | Next.js website: marketing pages, dashboard (chat, agents, files, costing, billing, team…), all the UI | `apps/web` — deployed on **Vercel** |
| **API + Worker** | The brains: Hono API (REST + SSE streaming), BullMQ background worker (embeddings, agents, usage rollups, budget alerts) | `apps/api` — deployed on **Fly.io** (Docker) |
| **Terminal CLI (`lf`)** | A terminal TUI in Go for chat, running agents, sync, cost tracking, rescue packs | `terminal` — installed via Homebrew / curl / PowerShell |

---

## 3. Tech stack (simple language)

**The backend (API + worker)**
- **TypeScript**, running on **Node.js 22**
- **Hono** — a small, fast web framework for the HTTP API (REST + real-time SSE streaming)
- **BullMQ** — the background job queue (Redis + jobs): agents, embeddings, usage rollups, budget alerts
- **Drizzle ORM** — talks to the database, executes the SQL migrations
- **PostgreSQL** (via **Neon**, serverless) with **pgvector** for AI search, plus **PGlite** (in-memory Postgres) for tests
- **Redis** (via **Upstash**) — sessions, rate limits, budget "reserve/settle", queue broker
- **Better Auth** — Google OAuth sign-in + session management
- **Zod** — validating inputs

**The frontend (web)**
- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS** for styling; shadcn-style UI components
- Server components + client components; the API is served same-origin (`/api` and `/v1`)

**The terminal CLI**
- **Go** + **Bubble Tea** TUI (beautiful terminal UI), ~18K lines
- Talk to the cloud via the Gateway API; local SQLite for offline sync and rescue packs

**AI provider integrations (the "model brain")**
- 9 adapter integrations: OpenAI, Anthropic, Google/Gemini, DeepSeek, Groq, xAI (Grok), Kimi (Moonshot), OpenRouter, and generic OpenAI-compatible
- A 19-model registry with micro-dollar pricing
- Managed (platform) keys **or** bring-your-own-key (BYOK), encrypted with AES-256-GCM

**Infrastructure & delivery**
- **Fly.io** — hosts the Docker image with TWO process groups: `app` (API) and `worker` (jobs). One image, two roles.
- **Docker** — `apps/api/Dockerfile` builds the production image (multi-stage, runs as non-root)
- **Vercel** — hosts the frontend + marketing site (`layerflow.dev`)
- **Dodo Payments** — subscription billing (India-first payment processor)
- **Resend** — transactional email (alerts, digests)
- **GitHub Actions** — CI (typecheck, lint, tests, builds) + Go CLI releases

---

## 4. How many features / how big is it?

- **~29 API route groups** (auth, chat, prompts, sessions, memory, search,
  budgets, keys, team, billing, agents, rescue, compare, sync, files, models,
  runs, workspace, admin, terminal, notifications, community, audio, learning,
  intelligence, autosubmit, improve, …)
- **28+ dashboard pages** in the web app + a full marketing site (pricing, blog, docs, about)
- **13 background job processors** (memory-extract, agent runs, embeddings,
  compare, rescue, usage rollups, budget alerts, weekly digest, …)
- **9 provider adapters**, **19-model pricing registry**
- **24+ `lf` CLI commands** (chat, run, sync, models, cost, rescue, doctor, mcp, daemon, upgrade…)
- **~200 automated API tests** (197 passing), Go tests, web tests — all green

> Test status today: **197/197 API tests, 9/9 web tests, Go build+vet+test clean,
> typecheck clean on all 4 packages, Next.js production build clean.**

---

## 5. How it's working right now

### What is LIVE and working (production, layerflow.dev)
- Full website (marketing, blog, pricing, docs) on Vercel
- Google sign-in (real sessions)
- Entire API mounted on Vercel (same-origin `/api/*` + `/v1/*`)
- **Chat with real AI** — SSE streaming, auto model-switch on failure, works with managed keys OR your own BYOK keys
- **OpenAI-compatible Gateway** — `layerflow.dev/v1/chat/completions`, `/v1/models`, `/v1/improve`, `/v1/usage` with API-key auth, rate limits, budget reserve/settle, cache, savings headers, gateway logs
- **`lf` CLI** installable via Homebrew / curl / PowerShell; chat, sync, models, cost, login, sessions, rescue, doctor
- **Terminal ↔ cloud sync** (handshake/push/pull, device registry)
- **Billing routes** (Dodo checkout + signature-verified webhook) — wired, not launched

### What is NOT running in production yet (the honest gaps)
- 🔴 **The BullMQ worker** — the #1 blocker. Jobs (compare, rescue, agents,
  embeddings, usage rollups, budget alerts) enqueue today but nothing processes
  them on Vercel. **This is now FULLY scripted and ready** — `fly.toml` defines
  the `app` + `worker` process groups; `npm run deploy:api` does the whole
  deploy. Run it, and the five queued features light up.
- 🔴 `api.layerflow.dev` DNS record + SSL cert (Fly) — scripted, not executed
- 🟡 Billing wired but not launched (needs Dodo product IDs + test purchase)
- 🟡 Compare / Rescue / Agents work perfectly in dev — they only queue forever
  in prod until the worker runs

### Verified today (so you know it's real)
- API boots and answers `/health/live` + `/health/ready` **200 OK**
- Worker boots and answers `/health` on port 9091 **200 OK**, then processes queues
- Docker image builds both entrypoints (`dist/index.js` + `dist/worker.js`) and
  keeps `drizzle-kit` in the runtime image so release migrations run on Fly
- `fly.toml` release command runs DB migrations automatically on every deploy
- Every script passes `bash -n`; all tests, typecheck, lint, and builds pass

---

## 6. Subscription model (how we make money)

We bill through **Dodo Payments** (not Stripe). Everything is plan-gated server-side.

| Plan | Price | What you get |
|---|---|---|
| **Free** | $0 | Unlimited chat, **free first month of managed AI** (platform keys), unlimited BYOK (your own keys), memory + search, basic analytics |
| **Starter** | **$5/mo** (14-day free trial) | Everything in free + auto model switching everywhere, AI Memory + context search, cost analytics + budgets, 3 workspaces |
| **Pro** | **$14/mo** | Everything in Starter + autonomous agents with approvals, team workspaces (roles + invitations), smart routing + model budgets, CSV/JSON/PDF exports |
| **Team** | **Custom** | Everything in Pro + unlimited seats, priority processing queue, early access to the browser companion |

How it works: a brand-new user gets **managed multi-model** for free (LayerFlow's
own Groq + Gemini free-tier keys). If they use their **own** provider keys
(BYOK), it's always free and unlimited. Managed providers are gated by plan
(`402 plan_provider_not_included` if a plan disallows them). Budgets do hard-cap
reserve/settle in Redis so a free user can never burn a paid key.

---

## 7. Current state, honestly

- **Overall score: ~80/100** — "a complete product one deployment away from being real."
- Frontend 90 · API surface 95 · Worker 75 (needs deploy) · Terminal CLI 92 ·
  Agents v2 90 · AI providers 85 · Billing 55 (not launched) · Security 80 · Testing 75 · Deployment 65 (scripted, not executed)
- Everything **builds and passes tests**; the worker is the only infra gap, and
  it is now one command away: `npm run deploy:api`.

---

## 8. What's done (no more engineering needed)

Auth · multi-model streaming chat (web + terminal) · auto model-switch ·
prompt library + versioning · memory + embeddings · hybrid search (keyword +
semantic) · BYOK vault (AES-256-GCM) · budgets (reserve/settle) · cost
analytics · intelligence routing · OpenAI-compatible gateway + cache + logs +
improve + usage · cloud↔terminal sync · team workspaces (RBAC) · CLI v0.2.x +
installers · email · admin analytics · device-auth login · plan-limit
enforcement · agents v2 (13 templates, approvals, scheduling) · managed
multi-model · `/improve` · premium TUI redesign.

## 9. What YOU still need to do (founder/ops, not code)

1. **Run the deploy** — `npm run deploy:api` then `npm run check:prod` (~10 min)
2. **DNS + cert** — point `api.layerflow.dev` at the Fly app, add the SSL cert, set `NEXT_PUBLIC_API_URL` on Vercel, add the Google OAuth redirect URI
3. **Provider platform keys** — Groq + Gemini free tiers already configured; add DeepSeek ($10 deposit) when ready; OpenAI/Anthropic only at Pro-tier
4. **Launch billing** — create Dodo products (Starter $5, Pro $14), set `DODO_PRODUCT_*` env vars, add the webhook URL, do a test purchase, flip live mode
5. **Release the CLI** — tag latest as a new version (Homebrew + installers auto-publish via the GitHub Action)
6. **E2E tests + pen-test** — Playwright suite and a real security test before scaling

---

## 10. Future (roadmap)

**Next 30 days**
- Playwright E2E tests (sign-in → chat → memory → billing)
- Worker job tests; first Go CLI tests in CI; cut the lint-warning backlog
- PostHog analytics (web + API) — not wired yet
- BullMQ queue dashboard (Bull Board) + uptime monitors
- Flip Dodo to live and verify checkout/webhook end-to-end
- Terminal agent loop — make `lf run` a real multi-step agent with tool
  execution, approval gates, and the (already-written) inline diff viewer
- "Continue in Terminal" ↔ "Open in Browser" handoff

**30 → 90 days**
- Public beta: SSO domain onboarding, docs site, changelog
- SSE → WebSocket for lower-latency realtime
- PgBouncer for pooled Neon connections; response-time instrumentation
- Agent platform: job-apply agent E2E, run-history exports, approval policies
- Memory import/export + timelines; global Cmd-K search

**90 → 180 days**
- Folder refactor: split the worker out of the API package (later, once the feature surface settles)
- Multi-region API, Redis cluster, read replicas
- Marketplace: trust & safety, moderation, revenue share
- CLI GA: `lf run`, `lf rescue` shipping crash context from any tool

**Non-goals (we're not doing)**
- Stripe billing (we use Dodo)
- Supporting arbitrary providers beyond the managed/BYOK registry

---

## 11. Quick commands (for the repo)

```bash
npm run dev           # web + API + worker together (concurrently)
npm run dev:api       # API only  (tsx watch)
npm run worker        # API worker only
npm test --workspace @layerflow/api   # 197 API tests
npm run typecheck     # tsc on all packages
cd terminal && go test ./...          # CLI tests
npm run deploy:api    # secrets + build + deploy + scale app=1 worker=1 (Fly)
npm run check:prod    # verify site, DNS, API + worker health
```