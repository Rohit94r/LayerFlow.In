# LayerFlow — Zero-to-Production Deployment

**Goal:** a fully working LayerFlow in production — web + API + worker, with
rescue / compare / agents / memory / cost-analytics all actually running.

**Current state (verified 2026-08-28):** the website + API are live on Vercel
(same-origin). The **only** thing missing is a long-running **worker**, which
Vercel serverless can't host. This guide deploys the API + worker to Render
(the blueprint is already written) and reconnects Vercel to it. ~30–60 min.

> New here? Read `docs/README.md` → `docs/PRODUCT-STATUS.md` first.

---

## 0. What you need before starting

| Thing | Where | Notes |
|---|---|---|
| Repo | `github.com/Rohit94r/LayerFlow.In` | `render.yaml` is at the repo root |
| Neon PostgreSQL (+pgvector) | console.neon.tech | `DATABASE_URL` — add `?sslmode=require` |
| Upstash Redis | console.upstash.com | `REDIS_URL` — `rediss://...` (TLS) |
| Your secret values | local gitignored `.vercel.env` / `fly.env` | source of truth for env vars |
| Google OAuth creds | console.cloud.google.com | same `CLIENT_ID`/`SECRET` as Vercel |
| Render account | dashboard.render.com | GitHub login |

**Golden rule:** `BETTER_AUTH_SECRET` and `PROVIDER_KEYS_KEK` must be **identical**
on Vercel and Render — sessions and BYOK keys decrypt only with the same values.

---

## 1. Deploy the API + Worker (Render Blueprint)

`render.yaml` defines **two** services that build the same image
(`apps/api/Dockerfile`, repo-root context so workspace packages bundle):
- `layerflow-api` (web, port 8787, health-checks `/health`, runs migrations pre-deploy)
- `layerflow-api-worker` (background worker, `node dist/worker.js`)

### Steps
1. Render Dashboard → **New → Blueprint** → pick **Rohit94r/LayerFlow.In**.
   Render reads `render.yaml` and creates both services.
2. Render prompts for every `sync: false` env var. Paste from your `.vercel.env`:
   - `DATABASE_URL` (with `?sslmode=require`), `REDIS_URL` (`rediss://…`)
   - `BETTER_AUTH_SECRET` (**same as Vercel**), `BETTER_AUTH_URL=https://layerflow.dev`
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (same as Vercel)
   - `PROVIDER_KEYS_KEK` (**same as Vercel**)
   - `WEB_URL=https://layerflow.dev`, `API_URL=https://api.layerflow.dev`
   - `CORS_ORIGINS=https://layerflow.dev`
   - `GROQ_API_KEY` / `GROQ_MODEL` / `GEMINI_API_KEY` / `GEMINI_MODEL` (free tiers — the "free first month")
   - `RESEND_API_KEY` / `FROM_EMAIL`
   - `SENTRY_DSN`, `COOKIE_DOMAIN=.layerflow.dev`
   - Dodo + DeepSeek/Kimi/xAI: leave blank for now (add when launching billing / adding providers)
3. Region is **Virginia** (blueprint) — same as Neon, keeps latency low.
4. Plan: **Starter ($7/mo each = $14/mo total)**. Do **not** use free — the free
   tier sleeps, which kills SSE streams and skips scheduled cron jobs.
5. Click **Apply**. Build ≈ 5–10 min (Docker build + `db:migrate` + health check).
6. Verify the API: `curl https://layerflow-api.onrender.com/health` → `{"status":"ok"}`
7. Verify the worker: Render → `layerflow-api-worker` → Logs, look for
   `repeatable jobs registered (usage-rollup, budget-alerts, weekly-digest, agent-maintenance)` and `worker started`.

> Prefer Fly.io? `scripts/deploy-api-prod.sh` exists, but the Render blueprint is
> one-click for **both** services and is recommended.

---

## 2. Connect `api.layerflow.dev`

1. Render → `layerflow-api` → Settings → **Add Custom Domain** → `api.layerflow.dev`.
2. At your DNS registrar: add **CNAME** `api` → `layerflow-api.onrender.com`.
3. Wait for DNS (2 min–1 hr); Render auto-issues SSL.
4. Verify: `curl https://api.layerflow.dev/health` → `{"status":"ok"}`

---

## 3. Flip the web app to use the new API host

1. Vercel → LayerFlow project → Settings → Environment Variables:
   - set `NEXT_PUBLIC_API_URL=https://api.layerflow.dev` (Production)
   - keep everything else (DATABASE_URL, REDIS_URL, secrets all stay)
2. **Redeploy Vercel** (env changes apply only to new deployments).
3. Google Cloud Console → OAuth credentials → add redirect URI
   `https://api.layerflow.dev/api/auth/callback/google` (keep the Vercel one too).

---

## 4. The "free first month" provider setup (no purchases needed)

LayerFlow ships with **Groq + Gemini free-tier** platform keys. A brand-new user
with **no provider key of their own** can `lf login` (browser) and chat
immediately — managed use is metered and plan-capped:

- **Free plan** → only `groq` + `google` managed (the free tiers). BYOK always
  allowed and unlimited.
- **Starter $5** → adds `deepseek`, `kimi`, `xai` managed.
- **Pro $14** → adds `openai`, `anthropic`, `openrouter` managed.

Enforcement is now wired (`services/ai/providers/keys.ts` +
`services/chat/router.ts` + `services/keys/provider-keys.ts`). While billing is
**not yet configured** (Dodo unset), the system runs in **beta mode** = all
platform keys allowed — so the free-first month "just works" with only
Groq+Gemini set, and you won't accidentally block anyone.

### When ready to add the cheap Chinese providers
Set on Render (and Vercel if you keep same-origin): `DEEPSEEK_API_KEY` +
`DEEPSEEK_MODEL=deepseek-chat` ($10 deposit — cheapest strong coding model), and
`KIMI_API_KEY` + `KIMI_MODEL=kimi-k2` (Moonshot). `render.yaml` already lists
these keys. OpenAI/Anthropic only at Pro tier, revenue-linked.

---

## 5. Post-deploy verification (do ALL — this is the proof it's real)

### API host
```bash
curl https://api.layerflow.dev/health          # {"status":"ok"}
curl https://api.layerflow.dev/api/lf-health   # auth env complete
```

### The 5 features that just unblocked (worker now running)
1. Sign in at layerflow.dev → **Rescue** → paste a dead chat → report completes
   (not stuck on "queued").
2. **Compare** → run a prompt across 3 models → results + ranking appear.
3. **Agents** → run a template agent → steps + progress update live.
4. Set a $1 budget → burn past it → next request is **blocked**.
5. `lf sync` from the terminal → operations appear in the dashboard → devices
   list shows your CLI.

### Gateway + terminal
```bash
curl https://api.layerflow.dev/v1/models -H "Authorization: Bearer lf_live_..."
lf login          # browser device flow; approve on layerflow.dev/settings/devices
lf chat "hello"   # streams via the gateway, managed (Groq/Gemini) key
lf cost           # shows workspace budget cap + progress bar + plan status
```

---

## 6. Launch billing (Dodo Payments)

1. https://app.dodopayments.com → create products:
   - "LayerFlow Starter" — $5/mo recurring → copy product ID
   - "LayerFlow Pro" — $14/mo recurring → copy product ID
2. Set env on Render (API + worker) **and** Vercel: `DODO_PRODUCT_STARTER`,
   `DODO_PRODUCT_PRO`, `DODO_PAYMENTS_API_KEY`, `DODO_PAYMENTS_WEBHOOK_KEY`,
   `DODO_PAYMENTS_ENVIRONMENT=test`.
3. Dodo dashboard → Webhooks → add `https://api.layerflow.dev/api/billing/webhook`.
4. Test-purchase in Dodo **test mode** → webhook fires →
   `GET /api/billing/status` shows `starter`.
5. Flip `DODO_PAYMENTS_ENVIRONMENT=live` + real card.

Once billing is configured, beta mode ends and plan-limit enforcement is live:
free users are gated to Groq+Gemini managed; everything else requires BYOK or an
upgrade.

---

## 7. Release the terminal (optional, after deploy)

The device-flow login + brand cleanup need a new public binary:
```bash
cd terminal
git tag v0.2.15 && git push origin v0.2.15
# .github/workflows/release.yml → goreleaser publishes binaries + Homebrew formula
```
Users update with `lf upgrade`. Source stays private.

---

## Environment variable matrix

`S` = secret, never browser. Source of truth: your local `.vercel.env` + `render.yaml`.

| Variable | Vercel (web) | Render API | Render Worker | Notes |
|---|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | ✅ `https://api.layerflow.dev` | — | — | browser API base; after step 3 |
| `DATABASE_URL` | ✅ | ✅ | ✅ | Neon, `?sslmode=require` |
| `REDIS_URL` | ✅ | ✅ | ✅ | Upstash `rediss://` |
| `BETTER_AUTH_SECRET` | ✅ | ✅ | ✅ | **identical everywhere** |
| `BETTER_AUTH_URL` | ✅ `https://layerflow.dev` | ✅ | — | |
| `WEB_URL` / `API_URL` | ✅ | ✅ | ✅ | |
| `CORS_ORIGINS` | ✅ | ✅ | ✅ | `https://layerflow.dev` only — never `*` |
| `PROVIDER_KEYS_KEK` | ✅ | ✅ | ✅ | **identical** — BYOK decryption |
| `GOOGLE_CLIENT_ID/SECRET` | ✅ | ✅ | — | add `api.*` callback URI |
| `GROQ_API_KEY` / `GROQ_MODEL` | ✅ | ✅ | ✅ | free-tier platform provider |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | ✅ | ✅ | ✅ | free-tier platform provider |
| `DEEPSEEK_*` / `KIMI_*` / `XAI_*` | optional | optional | optional | add when ready (step 4) |
| `RESEND_API_KEY` / `FROM_EMAIL` | ✅ | ✅ | ✅ | alerts + digests |
| `DODO_PAYMENTS_*` / `DODO_PRODUCT_*` | ✅ | ✅ | ✅ | when launching billing (step 6) |
| `SENTRY_DSN` | ✅ | ✅ | ✅ | |
| `COOKIE_DOMAIN` | ✅ `.layerflow.dev` | ✅ | — | |
| `ADMIN_EMAILS` | ✅ | ✅ | — | admin gating |

Only `NEXT_PUBLIC_*` ever reaches the browser. Changing Vercel env vars requires a redeploy. Never commit real values.

---

## Deployment order (memorize)

**Render blueprint (API+worker) → DNS api.layerflow.dev → Vercel env flip →
redeploy → Google OAuth redirect URI → verify E2E (5 features) → billing →
release terminal**

Never push the terminal marketing before sync + auth are verified on the new host.

---

## Bootstrap infrastructure cost

| Stage | Fixed cost/mo |
|---|---|
| Now → 100 users | Vercel $0–20 + Render Starter ×2 $14 + Neon $0–19 + Upstash $0 + Resend $0 ≈ **$14–53** |
| 100–1,000 users | Render ×2 $50 + Neon $19 + Upstash $5–15 ≈ **$75–95** |
| 1,000+ | split services + scale ≈ **$300–500** (profitable at 500 paid users) |

**Golden rule: managed inference spend must never exceed 40% of MRR. BYOK is
unlimited and free — it's the pressure valve.**

---

## Rollback & backup

- **Deploy rollback:** Render keeps previous images — one-click rollback.
- **DB:** Neon PITR on paid plans; snapshot a branch before each migration
  (`neon branches create`).
- **Migrations:** drizzle generates the down path in git history — review before
  prod; never hand-edit prod tables.
- **Secrets:** `.vercel.env` is the only backup — keep a second encrypted copy in
  a password manager. If lost, rotate everything.
- **Terminal releases:** immutable binaries; a bad release = ship `v0.2.16`
  (never edit a published tag).

---

## Failure testing (run once after deploy)

| Failure | Expect |
|---|---|
| Kill worker | chat still works; jobs queue; recovery processes backlog |
| Bad provider key | clear 4xx, model-switch suggestion |
| Redis down | API degrades gracefully (budgets fail-closed), health red |
| DB down | `/health` 503, sign-in shows offline |
| Budget exceeded | request blocked **before** the provider call |
| Dodo webhook replay | idempotent (signed + deduped) |

---

*That's the whole deployment. Once the worker is live, LayerFlow is real.*
