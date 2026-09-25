# LayerFlow — Next Plan (5 Phases)

> Source of truth: `docs/research.md` (the honest market check). This file turns
> that research into **concrete, ordered work** so I can execute it phase by
> phase. **Nothing here is done yet** — you approve a phase, I do it, you test,
> next phase. Created: 25 Sep 2026.

---

## 0. The direction we agreed on (from research.md)

| Old idea | New idea |
|---|---|
| "Everything AI platform" (chat + agents + memory + teams + terminal) | **One sharp tool: the "AI spend firewall"** — hard spend caps, per-project cost tracking and alerts for solo devs + freelancers |
| 29 routes / 28 pages / 24 CLI commands all promoted | Keep the wedge path; **freeze + hide everything else** |
| Free managed AI for everyone (Groq/Gemini keys) | **BYOK-first** + tiny capped demo mode (stops the money leak) |
| BYOK only via dashboard paste | **BYOK + Direct keys, opencode/Cline parity** — env-var keys (`OPENAI_API_KEY`…), custom base-URL providers (Ollama / LM Studio / vLLM), no-login direct chat, vault OR no-store key mode |
| Cost table is internal | **Price accuracy becomes a tested guarantee** — caps/alerts are only trusted if the $ math is pinned right |
| Billing not launched, no analytics, no E2E | Get to **first paying users**, wire PostHog, add Playwright tests |
| Deployment scripted but not run | **Make production actually work**, then verify it |
| Docs sprawl + archived junk | **Delete unneeded files, slim the repo** |

**Definition of done for each phase:** repo is clean & green, prod is verifiable
via `npm run check:prod`, and every task has a **Verification** you can run.

**Your role each phase:** say "do phase N". I execute, verify, and explain the
backend concepts you learn along the way (you're learning backend from this —
each phase ends with a **Learned today** block).

---

## Phase 1 — ✅ DONE (clean slate applied)

> **Goal:** the repo is only what the wedge actually needs. Delete first, so
> everything after is easy to find and fix. No feature code changes here.

### Tasks
1. **Delete legacy Vercel/Render/VPS deploy assets** — `scripts/legacy/`
   (render.yaml, docker-compose.prod.yml, docker-compose.vps.yml, nginx.conf,
   root Dockerfile, deploy-vps.sh, vps-migrate.sh). Fly + Docker is the only
   path now.
2. **Delete stale archived audits** — `docs/archive/` (5 audit .md files +
   `plans/` + `AUDIT_PROMPT.md`). They are superseded by `context.md` +
   `PRODUCT-STATUS.md`.
3. **Delete superseded docs:**
   - `docs/ROADMAP.md` → replaced by this plan + research.md roadmap
   - `docs/REMAINING_WORK.md` → replaced by PRODUCT-STATUS.md
   - `docs/CONTRIBUTING.md` → fold the 5 useful commands into README, then delete
   - `docs/ops/docker-commands.md` → fold into `docs/DEPLOYMENT.md`, then delete
4. **Delete stray in-repo note** — `apps/api/src/routes/workspace/NOTES.md`
   (dev scratch inside the code).
5. **Remove on-disk junk (not tracked, but clutter):** root `.next/` (stale
   build dir), root `.env.production` (confusing duplicate of `.vercel.env`),
   `opencode/` (vendored reference checkout — can be re-cloned if we ever do the
   TUI port).
6. **Slim docs to one clean set:** README.md · ARCHITECTURE.md · context.md ·
   nextplan.md · docs/{README,API,DEPLOYMENT,SECURITY,BUG_LOG,PRODUCT-STATUS}.
7. **Verify repo still builds:** all typecheck + tests + `go build` green.

### Verification
`npm run typecheck && npm test --workspace @layerflow/api && cd terminal && go build ./...`
→ all green, `git status` clean.

### 🧠 Learned today (backend)
- Monorepo layout: apps/ vs packages/ vs docs/ — why contracts and the price
  registry live in `packages/`.
- Why `.gitignore`/`.dockerignore` exist and what a "tracked vs ignored" file
  means.
- `.env` files vs real secrets in Fly/Vercel — you never commit keys.

---

## Phase 2 — Make production actually work (IN PROGRESS — local + prep done)

> **Goal:** `api.layerflow.dev` is live on Fly, the worker processes the wedge
> jobs, and the whole flow works in production, not just locally.
>
> **Status:** everything that doesn't need your credentials is done & committed —
> `preflight-prod.sh` (required keys + golden URL rules + Vercel↔Fly parity,
> wired into `deploy:api`), `npm run preflight:prod`, and the ordered runbook
> `docs/PRODUCTION-GO.md` (Steps 0–7). The **4 live steps below remain for you**
> (Fly auth + registrar + Vercel are yours): run `npm run preflight:prod` → then
> `REMOTE_BUILD=1 npm run deploy:api` → DNS/CNAME + cert → `npm run check:prod`
> → Vercel env + Google OAuth redirect → prove the gateway path → uptime monitors.

### Tasks
1. **Run the real deploy** — `npm run deploy:api` (Fly app `layerflow-api`,
   processes `app` + `worker`). Fix whatever fails at deploy time.
2. **DNS + SSL** — CNAME `api.layerflow.dev` → `layerflow-api.fly.dev`,
   `flyctl certs add api.layerflow.dev`.
3. **Vercel env fix** — `NEXT_PUBLIC_API_URL=https://api.layerflow.dev`, redeploy
   web, add Google OAuth redirect `https://api.layerflow.dev/api/auth/callback/google`.
4. **Confirm the worker runs real jobs** — only the wedge jobs stay enabled:
   usage-rollups, budget-alerts, weekly-digest. Check `fly logs` + run
   `npm run check:prod` (site, DNS, API health, worker health :9091).
5. **Wire an uptime monitor** on `/health/live` + `/health` (free tier:
   Healthchecks / UptimeRobot).
6. **Prove the core path in prod** — signup → Google login → mint API key →
   `POST https://api.layerflow.dev/v1/chat/completions` → see usage → set a cap
   → get blocked at the cap. Also prove `lf login` + `lf cost` work against prod.

### Verification
`npm run check:prod` returns all-green; a real API-keyed chat request completes;
a budget cap actually blocks over-spend in prod.

### 🧠 Learned today (backend)
- Docker multi-stage builds; one image, two process groups.
- Fly release_command (migrations) vs machine startup.
- DNS/CNAME, TLS certs, and why the auth URL must match the domain
  (OAuth redirects).
- "It works locally" vs "it works in prod" — env, base URLs, secrets.

---

## Phase 3 — Narrow to the wedge: the AI spend firewall

> **Goal:** the product, homepage and nav say ONE thing: stop surprise AI bills.
> Freeze the rest so clicking "Agents" never dead-ends again.

### Tasks
1. **One-sentence positioning** — homepage rewrite: "Stop surprise AI bills. Cap
   spend per project in 2 minutes." (Appendix B of research.md). Remove the
   six-sentence pitch.
2. **Freeze + hide + set the wedge content boundary** — keep visible ONLY:
   API keys, gateway / connect, costs + budgets, usage history, billing
   (usage history stays — it's part of the spend story). Everything else comes
   out of nav, pricing, and docs (the full keep/remove list is in the FINAL
   section below).
3. **Kill "free managed AI for everyone"** —
   - `services/chat/router.ts` + `services/ai/providers/keys.ts`: managed
     platform keys only for allowed plans; BYOK always free/unlimited.
   - Tiny "demo mode": e.g. 20 messages/day per verified Google account, strict
     global daily cap, so free keys can't be drained.
4. **BYOK + Direct provider keys — opencode/Cline parity (the feature you asked
   for).** This is the "change one base URL" promise done properly:
   - `lf` auto-resolves provider keys from the environment, opencode-style:
     `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY`,
     `DEEPSEEK_API_KEY`, `GROQ_API_KEY`, `GEMINI_API_KEY` — paste into your
     shell, `lf chat` just works, **no `lf login` required**.
   - `lf config` provider block, Cline-style: custom **OpenAI-compatible base
     URL** (Ollama `http://localhost:11434/v1`, LM Studio, vLLM, Groq, any) +
     custom model id + custom key. `lf models` lists built-in + your custom
     providers.
   - Dashboard **quick-add** in the BYOK vault for all the same providers +
     custom base URL (extends the existing AES-256-GCM vault).
   - **Two key modes:** (a) *vault mode* — key stored encrypted on LayerFlow,
     caps enforced server-side (the spend-firewall path); (b) *direct/no-store
     mode* — key supplied per request / stays on the user's machine, LayerFlow
     **never stores or logs it**, caps apply on declared costs (the privacy path).
   - `/v1/models` + `/v1/chat/completions` handle both modes transparently.
5. **Price-accuracy gate (the trust-keeper for this product)** — a test suite
   that pins, per provider + model: request → tokens → cost to the 4th decimal,
   matching the registry against each provider's published price. Models that
   can be capped MUST have exact cost math, or they're marked "no cap" —
   never a wrong cap.
6. **Latency transparency** — the gateway must be invisible: measure first-token
   time in `check:prod`, stream upstream tokens straight through, keep added
   latency near zero. A spend firewall users notice = a firewall they remove.
7. **Project/client tagging** — accept `x-lf-project: client-acme` header;
   store + show cost per project.
8. **Alerts at 50 / 80 / 100%** of a cap — email today (Resend), Slack later;
   re-enable the weekly cost digest job (it already exists).
9. **2-minute onboarding** — copy-paste snippets for Node / Python / cURL on the
   dashboard + a "test request" button. With Direct keys it's literally: export
   `OPENAI_API_KEY=…`, point the base URL at the gateway, done.
10. **Savings suggestion** — reuse the existing savings headers: "switch model
    Y→Z to save ~X%".
11. **Trim `lf` CLI to the final wedge set** — see the FINAL section below. The
    non-wedge commands are **removed from the shipped binary + help** (gone from
    the terminal, recoverable from git): `run`, `sessions`, `rescue`, `mcp`,
    `daemon`. This shrinks the binary, removes lint/maintenance surface, and
    ends honest-stub confusion.

### Verification
- Fresh user with ONLY `OPENAI_API_KEY` exported: `lf chat` works without login;
  a custom base-URL provider (Ollama/LM Studio) works via `lf config`.
- No-store mode: key appears nowhere in DB nor logs after a request.
- Price tests green (cost matches published prices to 4 decimals); a cap blocks
  exactly at 100%, alerts at 80%.
- Homepage + pricing repeat the one sentence. No nav item queues forever.

### 🧠 Learned today (backend)
- Gateways and proxy middleware; API keys and rate limits.
- Budgets: reserve/settle/lock in Redis (atomic Lua) — the heart of the product.
- Enforcing a business rule server-side (plan gating), not just in the UI.
- Headers as product input (`x-lf-project`).
- BYOK ergonomics (opencode/Cline): env-var resolution, custom OpenAI-compatible
  providers (base URL + model id), local-vs-vault key modes, and why no-store
  keys must never hit logs or DB.

### ✅ Status: implemented (all 11 tasks)
- **1 ✓** Homepage + marketing reframed to "Stop surprise AI bills. Cap spend per
  project in 2 minutes." (`components/Hero.tsx`, marketing content, metadata).
- **2 ✓** Nav trimmed to Start / Connect / Spend / Manage; pricing + docs rewrite
  (freeze list in "FINAL — Old features" honored).
- **3 ✓** Managed platform keys plan-gated (402) + demo mode (20 msgs/day/user,
  strict global cap; `demo-limits.ts`, `gateway-direct.test.ts`).
- **4 ✓** BYOK + Direct keys: env-var resolution, `lf config` custom
  OpenAI-compatible base URL, vault mode + direct/no-store mode, never stored
  nor logged (`terminal/cmd/lf/direct.go`, `config_cmd.go`, gateway router).
- **5 ✓** Price-accuracy gate pins registry vs published prices to 4 decimals
  (`model-registry.test.ts`); invalid cap math → "no cap", never a wrong cap.
- **6 ✓** Latency transparency: stream upstream tokens, tiny added latency
  (`check:prod` measures first-token time).
- **7 ✓** `x-lf-project` header accepted, stored, shown per-project in Costs
  (`spendByProject` panel via `groupBy=project`, auto-creates under "Gateway
  clients").
- **8 ✓** Alerts at 50/80/100% + weekly digest via worker wedge
  (`notifications.ts`, `queues.ts`; legacy schedulers removed).
- **9 ✓** Keys page: 2-minute snippets (curl / Python / CLI direct) with copy
  buttons + a **test-request button** that posts one completion and reports
  `x-lf-key-mode`.
- **10 ✓** Savings suggestion in Costs: real micro-dollar arithmetic (registry
  pricing × exact billed tokens) — "switch Y→Z to save ~X%".
- **11 ✓** CLI trimmed: `run`, `sessions`, `rescue`, `mcp`, `daemon` removed
  from binary + help (`terminal/cmd/lf/root.go`; go build/vet/test green).

---

## Phase 4 — Monetize, secure, and add the hook features

> **Goal:** you can get paid safely, and users have the features that make them
> stay: reports, loop protection, MCP, analytics.

> **Status:** items 2 (cost reports), 3 (runaway loop detector) and 4 (LayerFlow
> MCP server) are **implemented + committed**. Remaining: 1 (pricing live, user
> action), 5 (PostHog), 6 (security hardening), 7 (SEO pages), 8 (legal).

### Tasks
1. **Simplified pricing live** — Free ₹0 / Pro ~$9/mo (test ₹ pricing too).
   Update `services/billing/plans.ts` (Dodo product IDs in env), run a **test
   purchase through the whole checkout + webhook flow**, then flip live.
2. **Client cost reports** — CSV/PDF export per project per month (exports exist
   in Pro — adapt them to the new pricing).
3. **Runaway-loop detector** — N identical calls in T seconds → auto-pause that
   key/project + alert (the "kill-switch", good backend work + agent skill).
4. **LayerFlow MCP server** — a small MCP server so Claude Code/Cursor can ask
   "how much did I spend this week?" and "set a cap on project X". (Builds your
   MCP skill.)

### Verification
A real test purchase completes and the webhook adds the Pro plan. A runaway loop
gets auto-paused and pings the owner. `lf mcp` can report spend and set a cap.
PostHog shows signups + requests.

### 🧠 Learned today (backend)
- Webhooks: signatures, idempotency, payment lifecycle.
- Observability: analytics events, request tracing.
- Security: key management, rotation, audit logs, fail-open vs fail-closed.
- MCP protocol — a modern AI-integration skill employers value.

---

## Phase 5 — Ship, test, learn, and go to real users

> **Goal:** 90-day validation starts for real: automated tests for the wedge
> path, a shippable release, and 15 conversations with real users.

### Tasks
1. **Playwright E2E for the wedge path** — sign-in → create key → send request →
   see cost → set cap → get blocked → get alert. Also cover **Direct keys**: env-var
   chat without login, custom base-URL provider, and a no-store key that never
   persists after the request. (First E2E test suite.)
2. **Worker job tests** — rollup + budget-alert + digest units run in CI.
3. **Cut the ~90 lint-warning backlog** in the wedge areas only.
4. **Ship a release** — tag + publish CLI (Homebrew + installers auto-build),
     deploy web + API, `check:prod` green.
5. **Go to users** — Show HN / r/SideProject post, GDGC workshop ("Don't get a
     surprise AI bill"), and the **15 outreach conversations** (research.md
     Appendix A), logging exact user words.
6. **Decision dashboard** — track 5 numbers weekly (research.md Appendix C):
     signups, weekly-active users, conversations, paying customers/MRR, hours
     spent.
7. **Learning journal** — write up what you built + learned per phase (career
     content + your backend interview story).

### Verification
Playwright suite green in CI. CLI + web + API released and verified. 15
conversations logged in one doc. You can answer "which 10% of features do users
actually use?" with data.

### 🧠 Learned today (backend)
- E2E testing (Playwright) vs unit tests (vitest) vs Go tests.
- CI/CD pipelines; atomic releases.
- Product metrics: signups → activation → retention → revenue.
- The difference between building fast and listening to users.

---

## What gets deleted (summary — happens in Phase 1)

| Path | Why |
|---|---|
| `scripts/legacy/**` | Old Vercel/Render/VPS path; Fly + Docker is the only path |
| `docs/archive/**` | Superseded by `context.md` + `PRODUCT-STATUS.md` |
| `docs/ROADMAP.md` | Replaced by this plan + research.md |
| `docs/REMAINING_WORK.md` | Replaced by PRODUCT-STATUS.md |
| `docs/CONTRIBUTING.md` | Folded into README |
| `docs/ops/docker-commands.md` | Folded into DEPLOYMENT.md |
| `apps/api/src/routes/workspace/NOTES.md` | Stray dev scratch |

## FINAL — Terminal CLI: keep vs remove

| Command | Decision | Why |
|---|---|---|
| `lf chat` | ✅ KEEP | Core — works with Managed, BYOK, AND Direct keys |
| `lf models` | ✅ KEEP | Lists built-in + custom providers |
| `lf cost` | ✅ KEEP | The spend-firewall number: cap, progress, plan |
| `lf login` / `logout` | ✅ KEEP | Platform/managed mode (optional now, not required) |
| `lf doctor` | ✅ KEEP | Local trust check (config, SQLite, keyring, git) |
| `lf sync` | ✅ KEEP | Distribution + continuity, works |
| `lf version` | ✅ KEEP | Build info |
| `lf config` | 🆕 ADD | Providers: env keys, custom base URL, custom model (opencode/Cline parity) |
| `lf upgrade` | ✅ KEEP (simplified) | Real check + installer URL; no self-update |
| `lf run` | ❌ REMOVE | One-shot stub; agent loop frozen |
| `lf sessions` | ❌ REMOVE | Stub `--open`; not wedge |
| `lf rescue` | ❌ REMOVE | Rescue frozen |
| `lf mcp *` | ❌ REMOVE | Stubs today; real MCP server ships server-side in Phase 4 |
| `lf daemon` | ❌ REMOVE | Sync-queue is a no-op |

## FINAL — Old features: keep vs remove (web + API)

| Old feature | Decision | What happens |
|---|---|---|
| Agents v2 + 13 templates | ❌ OUT | Removed from nav, pricing, docs. Code dormant (kept in git, not shipped) |
| Compare | ❌ OUT | Removed from nav/pricing/docs. Dormant code |
| Rescue | ❌ OUT | Removed everywhere. Dormant code |
| Memory / memory-extraction | ❌ OUT | Removed from nav/pricing/docs. Dormant code |
| AI chat UI (full) | 🟡 SLIM | No standalone "chat" product page; gateway stays as the connect surface |
| Community / marketplace | ❌ OUT | Removed from nav/pricing/docs. Dormant code |
| Audio / learning | ❌ OUT | Removed from nav/pricing/docs. Dormant code |
| Autosubmit (daemon | form-filler) | ❌ OUT | Removed from UI. Dormant code |
| Team RBAC | ❌ OUT | Removed from nav/pricing/docs. Dormant code |
| "Continue in Terminal" handoff | ❌ OUT | Removed |
| Worker: agents/compare/rescue/memory processors | ❌ DISABLED | Stay in code; NOT enabled on the prod worker. Only rollups + budget-alerts + digest run |

**What stays (the whole product now):** API keys · gateway (`/v1/*`) · BYOK
vault + Direct keys · costs + budgets + alerts + digest · usage history ·
billing · auth · onboarding/marketing/docs.

## What is frozen, not deleted (Phase 3 — code kept on disk)

Agents v2 · 13 templates · Compare · Rescue · memory extraction · community/
marketplace · audio · learning · autosubmit · team RBAC · "continue in
terminal" · SSE→WebSocket · PgBouncer · multi-region · folder refactor.

> Frozen = code stays in `git` history but is **not shipped, not in nav, not in
> pricing, not advertised**. It costs nothing to keep and everything to delete
> (career value + future revival). The product the user sees is only the
> "What stays" list above.

## What I will NOT build (per research.md)

- Free-managed-AI-for-everyone as the model
- Job-apply agent, marketplace revenue-share, "AI workspace" headline
- Stripe billing (we use Dodo)
- New features unless 3 different users asked for it

---

## How we work

1. You say **"do phase N"**.
2. I do ONLY phase N, verify it, commit, and give you the verification output.
3. You test on `layerflow.dev` / your machine.
4. You say "next phase" (or "fix X in phase N first").

> Start with **Phase 1 — Clean Slate**. It's pure deletion + verification, no
> feature risk, and it makes every later phase faster and clearer.