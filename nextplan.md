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
| Billing not launched, no analytics, no E2E | Get to **first paying users**, wire PostHog, add Playwright tests |
| Deployment scripted but not run | **Make production actually work**, then verify it |
| Docs sprawl + archived junk | **Delete unneeded files, slim the repo** |

**Definition of done for each phase:** repo is clean & green, prod is verifiable
via `npm run check:prod`, and every task has a **Verification** you can run.

**Your role each phase:** say "do phase N". I execute, verify, and explain the
backend concepts you learn along the way (you're learning backend from this —
each phase ends with a **Learned today** block).

---

## Phase 1 — Clean Slate: delete junk, slim the monorepo, tidy docs

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

## Phase 2 — Make production actually work (the #1 gap)

> **Goal:** `api.layerflow.dev` is live on Fly, the worker processes the wedge
> jobs, and the whole flow works in production, not just locally.

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
2. **Hide frozen features from nav + pricing** — agents v2, compare, rescue,
   memory extraction, community/marketplace, audio, learning, autosubmit,
   team RBAC, "continue in terminal" handoff. Code stays, UI + pricing removed.
3. **Kill "free managed AI for everyone"** —
   - `services/chat/router.ts` + `services/ai/providers/keys.ts`: managed
     platform keys only for allowed plans; BYOK always free/unlimited.
   - Tiny "demo mode": e.g. 20 messages/day per verified Google account, strict
     global daily cap, so free keys can't be drained.
4. **Project/client tagging** — accept `x-lf-project: client-acme` header;
     store + show cost per project.
5. **Alerts at 50 / 80 / 100%** of a cap — email today (Resend), Slack later;
     re-enable the weekly cost digest job (it already exists).
6. **2-minute onboarding** — copy-paste snippets for Node / Python / cURL on the
     dashboard + a "test request" button.
7. **Trim `lf` CLI** to the wedge set — `login`, `cost`, `models`, `doctor`,
   `sync` sanity. Keep code; hide/hold the rest.
8. **Savings suggestion** — reuse the existing savings headers: "switch model
   Y→Z to save ~X%".

### Verification
A fresh user: BYOK key (or capped demo), creates a project, sends a request,
sees cost per project, gets alerted at 80%, blocked at 100%. Homepage + pricing
repeat the one sentence. No nav item queues forever.

### 🧠 Learned today (backend)
- Gateways and proxy middleware; API keys and rate limits.
- Budgets: reserve/settle/lock in Redis (atomic Lua) — the heart of the product.
- Enforcing a business rule server-side (plan gating), not just in the UI.
- Headers as product input (`x-lf-project`).

---

## Phase 4 — Monetize, secure, and add the hook features

> **Goal:** you can get paid safely, and users have the features that make them
> stay: reports, loop protection, MCP, analytics.

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
5. **PostHog analytics** — wire web + API events (signups, keys minted,
   requests, caps hit). Free tier.
6. **Security hardening** — BYOK vault key-rotation + audit-log access; verify
   webhook signature/idempotency (already done — re-verify); add a **fail-open**
   option in the gateway (if LayerFlow is down, pass through).
7. **Price-comparison SEO pages** — "OpenAI vs Claude vs Gemini price per 1M
   tokens", "how to cap OpenAI spend" (programmatic SEO, free traffic).
8. **Legal basics** — privacy policy + terms; DPDP-aware prompt/usage logging
   ("no-log" option).

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
   see cost → set cap → get blocked → get alert. (First E2E test suite.)
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

## What is frozen, not deleted (Phase 3 — hidden from UI)

Agents v2 · 13 templates · Compare · Rescue · memory extraction · community/
marketplace · audio · learning · autosubmit · team RBAC · "continue in
terminal" · SSE→WebSocket · PgBouncer · multi-region · folder refactor.

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