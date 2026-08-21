# Section 3 — Production Hosting & Deployment (Step by Step)
**Current state → Target state → Exact click-by-click instructions**

---

## 3.1 Current Deployment State (verified today)

| Piece | Where | Status |
|---|---|---|
| Website + dashboard | **Vercel** (`layerflow.dev`) | ✅ LIVE |
| API (Hono) | **Vercel**, mounted inside Next at `/api/*` and `/v1/*` | ✅ LIVE (same-origin mode) |
| Auth (Google) | Vercel + Better Auth | ✅ LIVE |
| Database | **Neon** PostgreSQL (+pgvector) | ✅ LIVE (`DATABASE_URL` in Vercel env) |
| Redis | **Upstash** | ✅ LIVE (`REDIS_URL` in Vercel env) |
| **Worker (BullMQ)** | **NOWHERE — runs only on your laptop** | 🔴 **THE GAP** |
| `api.layerflow.dev` | **No DNS record** | 🔴 Not deployed |
| `lf` CLI binaries | GitHub `Rohit94r/layerflow-releases` + Homebrew tap | ✅ LIVE (v0.2.6) |
| Billing (Dodo) | Routes live, products not created | 🟡 |

**Why the worker gap matters:** chat works (direct call), but **rescue, compare, agents, embeddings, usage rollups, budget alerts, weekly digests enqueue jobs to Redis and NOTHING processes them in production.** Users see "queued" forever. This single deployment fixes five features at once.

### Mode A vs Mode B (from docs/DEPLOYMENT.md — still accurate)
- **Mode A (today):** everything on Vercel, same-origin. Fine for private beta.
- **Mode B (target):** API + worker on a long-running host; `api.layerflow.dev` DNS; Vercel points to it. Required for jobs, gateway scale, terminal sync at volume.

**You have TWO deployment paths already written. Pick ONE and delete confusion:**

| | Path 1: Fly.io | Path 2: Render |
|---|---|---|
| Script/config | `scripts/deploy-api-prod.sh` + Dockerfile | `render.yaml` (blueprint) |
| Status | Script written, previously attempted (check-prod script probes `layerflow-api.fly.dev`) | Blueprint written, never executed |
| Worker | second `fly launch` process (or process group) | native `type: worker` service (blueprint already defines both!) |
| Free tier | No (pay ~$3-5/mo) | Worker has NO free tier; web service sleeps on free |
| Recommendation | ✅ **If you already have the Fly app created, finish it** | ✅ **If starting fresh — Render blueprint is one-click for BOTH services** |

---

## 3.2 PATH 1 — Render (recommended if starting fresh; blueprint is complete)

Your `render.yaml` at repo root already defines BOTH services. It builds `apps/api/Dockerfile` with repo-root context (needed for workspace packages), runs migrations pre-deploy, and health-checks `/health`.

### Step-by-step
1. Go to **https://dashboard.render.com** → sign up/login (GitHub login).
2. **New → Blueprint** → select repo **Rohit94r/LayerFlow.In** → Render reads `render.yaml`.
3. It will prompt for every `sync: false` env var. Fill from your local `.vercel.env` (32 vars defined there — the source of truth):
   - `DATABASE_URL` (Neon connection string, **with `?sslmode=require`**)
   - `REDIS_URL` (Upstash `rediss://...`)
   - `BETTER_AUTH_SECRET` (same as Vercel — sessions must match!)
   - `BETTER_AUTH_URL=https://layerflow.dev`
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (same as Vercel)
   - `PROVIDER_KEYS_KEK` (same as Vercel — BYOK keys must decrypt!)
   - `WEB_URL=https://layerflow.dev` · `API_URL=https://api.layerflow.dev`
   - `CORS_ORIGINS=https://layerflow.dev`
   - `GROQ_API_KEY`, `GEMINI_API_KEY` (+ models)
   - `RESEND_API_KEY`, `FROM_EMAIL`
   - `DODO_PAYMENTS_*` (when launching billing)
   - `SENTRY_DSN`, `COOKIE_DOMAIN=.layerflow.dev`
4. Region: **Virginia** (blueprint sets it — same as Neon, keeps latency low).
5. Plan: **Starter ($7/mo each = $14/mo total)**. Free tier sleeps → SSE streams die and cron jobs skip. Do not use free for the worker.
6. Click **Apply** → both services build (~5-10 min: Docker build + `npm run db:migrate` pre-deploy + health check).
7. Verify: `curl https://layerflow-api.onrender.com/health` → `{"status":"ok"}`

### Connect the domain
8. In Render → layerflow-api → Settings → **Add Custom Domain** → `api.layerflow.dev`
9. At your DNS registrar (wherever layerflow.dev is managed): add **CNAME** `api` → `layerflow-api.onrender.com`
10. Wait for DNS (2 min–1 hr), Render auto-issues SSL.

### Flip the web app to use it
11. Vercel → LayerFlow project → Settings → Environment Variables:
    - `NEXT_PUBLIC_API_URL=https://api.layerflow.dev` (Production)
    - keep everything else
12. **Redeploy Vercel** (env changes only apply to NEW deployments — Deployments → ⋯ → Redeploy)
13. Google Cloud Console → add redirect URI `https://api.layerflow.dev/api/auth/callback/google` (keep the Vercel one too).

---

## 3.3 PATH 2 — Fly.io (if you prefer; script exists)

```bash
# one-time
brew install flyctl && flyctl auth login

# from repo root
bash scripts/deploy-api-prod.sh        # reads secrets from .vercel.env

# create the API app (if not already: check-prod.sh probes layerflow-api.fly.dev)
flyctl launch --name layerflow-api --region iad --no-deploy
flyctl secrets set $(grep -v '^#' .vercel.env | grep -E '^(DATABASE_URL|REDIS_URL|BETTER_AUTH_SECRET|...)' | xargs)

# API service
flyctl deploy                                           # uses apps/api/Dockerfile
# Worker as a second process against the same image:
flyctl launch --name layerflow-worker --no-deploy
flyctl secrets set ... (same set)
flyctl deploy -a layerflow-worker --dockerfile apps/api/Dockerfile \
  --dockerfile-arg CMD="node apps/api/dist/worker.js"
```
DNS: `api` **A/AAAA/CNAME → layerflow-api.fly.dev** at your registrar, then same Vercel env flip (steps 11–13 above).

---

## 3.4 Which link do I actually open? (quick reference)

| Task | URL |
|---|---|
| Deploy Render blueprint | https://dashboard.render.com/select-repo?type=blueprint |
| Render service settings | https://dashboard.render.com |
| Fly dashboard | https://fly.io/dashboard |
| Upstash Redis | https://console.upstash.com |
| Neon Postgres | https://console.neon.tech |
| Vercel project env | https://vercel.com/rohitjadhav*/layerflow*/settings/environment-variables |
| Dodo Payments | https://app.dodopayments.com |
| Resend | https://resend.com/api-keys |
| Sentry | https://sentry.io |
| Google OAuth creds | https://console.cloud.google.com/apis/credentials |
| DNS (wherever you bought layerflow.dev) | registrar's DNS panel |

---

## 3.5 Environment Variable Matrix (complete)

`S` = secret, never browser. Source of truth: `.vercel.env` (local, gitignored) + `render.yaml`.

| Variable | Vercel (web) | Render API | Render Worker | Notes |
|---|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | ✅ `https://api.layerflow.dev` | — | — | browser API base; after Mode B |
| `DATABASE_URL` | ✅ | ✅ | ✅ | Neon, sslmode=require |
| `REDIS_URL` | ✅ | ✅ | ✅ | Upstash rediss:// |
| `BETTER_AUTH_SECRET` | ✅ | ✅ | ✅ | **must be identical everywhere** |
| `BETTER_AUTH_URL` | ✅ `https://layerflow.dev` | ✅ | — | |
| `WEB_URL` / `API_URL` | ✅ | ✅ | ✅ | |
| `CORS_ORIGINS` | ✅ | ✅ | ✅ | `https://layerflow.dev` only — never `*` |
| `PROVIDER_KEYS_KEK` | ✅ | ✅ | ✅ | **identical** — BYOK decryption |
| `GOOGLE_CLIENT_ID/SECRET` | ✅ | ✅ | — | add api.* callback URI |
| `GROQ_API_KEY` / `GEMINI_API_KEY` | ✅ | ✅ | ✅ | platform fallback models |
| `RESEND_API_KEY` / `FROM_EMAIL` | ✅ | ✅ | ✅ | alerts + digests |
| `DODO_PAYMENTS_API_KEY` etc. | ✅ | ✅ | ✅ | when billing launches |
| `SENTRY_DSN` | ✅ | ✅ | ✅ | |
| `COOKIE_DOMAIN` | ✅ `.layerflow.dev` | ✅ | — | |
| `ADMIN_EMAILS` | ✅ | ✅ | — | admin gating |
| `ELEVENLABS_*` | optional | optional | — | audio (low priority) |

**Rules:** only `NEXT_PUBLIC_*` ever reaches the browser. Changing Vercel env vars requires a redeploy. Never commit real values.

---

## 3.6 Post-Deploy Verification Checklist (do ALL)

### API host
```bash
curl https://api.layerflow.dev/health          # {"status":"ok"}
curl https://api.layerflow.dev/api/lf-health   # auth env complete
```

### Worker
```bash
# Render → layerflow-api-worker → Logs: look for
#   "repeatable jobs registered (usage-rollup, budget-alerts, weekly-digest)"
#   "worker started"
```

### End-to-end (the five features that just unblocked)
1. Sign in at layerflow.dev → **Rescue** → paste a dead chat → report completes (not stuck on "queued")
2. **Compare** → run prompt across 3 models → results + ranking appear
3. **Agents** → run a template agent → steps + progress update live
4. Set a budget $1 → burn past it → next request **blocked**
5. `lf sync` from terminal → operations appear in dashboard → devices list shows your CLI

### Gateway
```bash
curl https://api.layerflow.dev/v1/models -H "Authorization: Bearer lf_live_..."
```

---

## 3.7 Billing Launch (Dodo — step by step)

1. https://app.dodopayments.com → create products:
   - "LayerFlow Starter" — $5/mo recurring → copy product ID
   - "LayerFlow Pro" — $14/mo recurring → copy product ID
2. Set env on Render API + Worker + Vercel: `DODO_PRODUCT_STARTER`, `DODO_PRODUCT_PRO`, `DODO_PAYMENTS_API_KEY`, `DODO_PAYMENTS_WEBHOOK_KEY`, `DODO_PAYMENTS_ENVIRONMENT=live|test`
3. Dodo dashboard → Webhooks → add `https://api.layerflow.dev/api/billing/webhook`
4. Test in Dodo **test mode**: buy Starter with test card → webhook fires → `/api/billing/status` shows `starter`
5. Add plan-limit enforcement (P1 engineering): middleware reading subscription status before chat/runs in managed mode
6. Flip `DODO_PAYMENTS_ENVIRONMENT=live` + real card

---

## 3.8 Failure Testing (run once after deploy)

| Failure | Expect |
|---|---|
| Kill worker | chat still works; jobs queue; recovery processes backlog |
| Bad provider key | clear 4xx, model-switch suggestion |
| Redis down | API degrades gracefully (budgets fail-closed), health shows red |
| DB down | `/health` 503, sign-in page shows offline state |
| Budget exceeded | request blocked BEFORE provider call |
| Dodo webhook replay | idempotent (signed + deduped) |

---

## 3.9 Bootstrap Infrastructure Cost Plan

### Stage 1 — NOW → 100 users (private beta)
| Item | Cost/mo |
|---|---|
| Vercel Pro (or free if under limits) | $0–20 |
| Render Starter ×2 (API + worker) | $14 |
| Neon free → Launch | $0–19 |
| Upstash free tier | $0 |
| Resend free (3k emails) | $0 |
| Dodo (percentage only) | $0 |
| Sentry free tier | $0 |
| **Total fixed** | **~$14–53/mo** |
| Variable: managed AI (Groq/Gemini free tiers) | ~$0 |
| Variable: paid models (optional DeepSeek deposit) | ~$10 |

### Stage 2 — 100–1,000 users
Render upgrade ×2 ($25×2) · Neon Launch ($19) · Upstash PayAsYouGo ($5–15) · **~$75–95/mo fixed** + managed inference capped at ~40% of MRR.

### Stage 3 — 1,000+ users
Split gateway/API/workers · Neon scale · Redis dedicated · observability paid · **~$300–500/mo** — at 500+ paid users ($2,500 MRR) this is comfortably profitable.

**Golden bootstrap rule: managed inference spend must NEVER exceed 40% of MRR. BYOK is unlimited and free — it's the pressure valve.**

---

## 3.10 Deployment Order (memorize)

**Database → Redis → API → Worker → DNS → Vercel env flip → redeploy → auth redirect URIs → verify E2E → billing → terminal device-auth**

Never launch the terminal marketing push before sync + auth are verified on the new host.

---

## 3.11 Official Docs (book these)

- Render blueprints: https://render.com/docs/blueprint-spec
- Render background workers: https://render.com/docs/background-workers
- Render env vars: https://render.com/docs/configure-environment-variables
- Render pre-deploy (migrations): https://render.com/docs/deploy-hooks (see preDeployCommand in your render.yaml)
- Fly docs: https://fly.io/docs
- Vercel env vars: https://vercel.com/docs/environment-variables
- Upstash: https://docs.upstash.com
- Neon: https://neon.tech/docs
- Dodo: https://docs.dodopayments.com
- OpenCode (inspiration only — never copy assets/branding): https://opencode.ai/docs

---

## 3.12 Rollback & Backup

- **Deploy rollback:** Render/Fly keep previous images — one-click rollback in dashboard
- **DB:** Neon PITR (point-in-time restore) on paid plans; take a branch snapshot before each migration: `neon branches create`
- **Migration rollback:** drizzle generates down path in git history — review before prod; never edit prod tables by hand
- **Secrets:** `.vercel.env` is the only backup of secrets — keep a second encrypted copy (password manager). If lost, rotate EVERYTHING.
- **Terminal releases:** immutable binaries in layerflow-releases; a bad release = ship `v0.2.7` (never edit a published tag)

---

*End of Section 3. Sections 1 (status) and 2 (architecture) are in sibling files. Index in `00-START-HERE.md`.*
