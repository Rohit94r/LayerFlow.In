# LayerFlow — Zero-to-Production Deployment (Fly.io + Docker)

**Goal:** API + BullMQ worker running on **Fly.io** (built from the Docker
image), web + auth same-origin on **Vercel**, DB on Neon, Redis on Upstash.
When the worker is live, rescue / compare / agents / embeddings / rollups /
alerts all actually run.

**Deployment model (one image, two processes):**

| Part | Where | Notes |
|---|---|---|
| Web app | Vercel → `layerflow.dev` | Next.js; mounts the shared Hono app same-origin (`/api/*`, `/v1/*`) |
| API | Fly app `layerflow-api` → process `app` | Hono on `:8787` |
| Worker | Fly app `layerflow-api` → process `worker` | BullMQ on `:9091` (health) |
| Postgres | Neon (us-east-1) | `DATABASE_URL` + pgvector |
| Redis | Upstash | `REDIS_URL` — job queue, exact cache, budgets |

`fly.toml` (repo root) defines both process groups from one image built by
`apps/api/Dockerfile` (repo root = build context). Deploys are fully scripted:

```bash
npm run deploy:api        # sets secrets, builds Docker image, deploys, scales app=1 worker=1
npm run check:prod        # verifies frontend, DNS, API + worker health
```

Local dev uses `docker-compose.yml` (Postgres + Redis only).

---

## 0. Prerequisites

| Thing | Where | Notes |
|---|---|---|
| Repo | `github.com/Rohit94r/LayerFlow.In` | |
| `flyctl` | https://fly.io/docs/hands-on/install-flyctl/ | `flyctl auth login` once |
| Docker | Docker Desktop / docker CLI | needed for the image build |
| Neon PostgreSQL (+pgvector) | console.neon.tech | `DATABASE_URL` — add `?sslmode=require` |
| Upstash Redis | console.upstash.com | `REDIS_URL` — `rediss://…` (TLS) |
| Secrets file | local gitignored `.vercel.env` | source of truth for env vars; `fly.env` is the byte-identical Fly copy |

**Golden rule:** `BETTER_AUTH_SECRET` and `PROVIDER_KEYS_KEK` must be
**identical** on Vercel and Fly — sessions and BYOK keys decrypt only with the
same values. And `BETTER_AUTH_URL` must always **equal** `WEB_URL`
(`https://layerflow.dev`) — never `api.layerflow.dev`.

---

## 1. Deploy the API + Worker (Fly)

```bash
npm run deploy:api
```

The script (`scripts/deploy-api-prod.sh`):
1. Creates the `layerflow-api` app if needed.
2. Sets **required** secrets → fails fast if missing: `DATABASE_URL`,
   `REDIS_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`,
   `GOOGLE_CLIENT_SECRET`, `PROVIDER_KEYS_KEK`, `WEB_URL`, `API_URL`,
   `CORS_ORIGINS`.
3. Sets **optional** secrets when present: `GROQ_*`, `GEMINI_*`,
   `DEEPSEEK_*`, `KIMI_*`, `XAI_*`, `ELEVENLABS_*`, `RESEND_API_KEY`,
   `FROM_EMAIL`, `SENTRY_DSN`, `COOKIE_DOMAIN`, `ADMIN_EMAILS`,
   `DODO_PAYMENTS_*`, `DODO_PRODUCT_*`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`,
   `R2_*`.
4. Runs `flyctl deploy` → builds `apps/api/Dockerfile`, runs the DB migration
   as the release command, then starts the machines.
5. Scales **both process groups**: `fly scale count app=1 worker=1`.

First deploy takes ~5–10 min (Docker build + install). Verify:

```bash
curl -s https://layerflow-api.fly.dev/health            # {"status":"ok",...}
curl -s https://layerflow-api.fly.dev:9091/health       # worker alive
# worker log should include: "worker health endpoint started" and
# smoothWorker startup with registered repeatable jobs.
```

## 2. Connect `api.layerflow.dev`

1. At your registrar: add **CNAME** `api` → `layerflow-api.fly.dev`.
2. Then:
   ```bash
   flyctl certs add api.layerflow.dev --app layerflow-api
   flyctl certs show api.layerflow.dev --app layerflow-api   # to confirm
   ```
3. Verify: `curl https://api.layerflow.dev/health` → `{"status":"ok"}`

`api.layerflow.dev` is the API/worker host only — it is **never** used for the
browser auth session (see below).

## 3. Web + auth run same-origin on `layerflow.dev`

Better Auth + the Hono API are mounted on the Next.js host
(`layerflow.dev/api/auth/*`), so the web project must **not** point at
`api.layerflow.dev`:

1. Vercel → LayerFlow project → Settings → Environment Variables (Production):
   - `BETTER_AUTH_URL=https://layerflow.dev` — **never** `api.layerflow.dev`
   - `WEB_URL=https://layerflow.dev`, `API_URL=https://layerflow.dev`
   - `DATABASE_URL`, `REDIS_URL`, `BETTER_AUTH_SECRET`, `PROVIDER_KEYS_KEK` —
     **identical** to Fly
   - `NEXT_PUBLIC_API_URL=https://layerflow.dev` (browser always uses current origin)
2. **Redeploy Vercel** (env changes apply only to new deployments).
3. Google Cloud Console → OAuth credentials
   (`928766099149-…apps.googleusercontent.com`) → Authorized redirect URIs:
   ```
   https://layerflow.dev/api/auth/callback/google
   ```
   (exact — no trailing slash, no `api.` prefix). `api.layerflow.dev` must not
   be registered; it is never used for the browser OAuth flow.
4. Verify: `curl https://layerflow.dev/api/auth-config` → JSON must show
   `"authBaseUrl":"https://layerflow.dev"` and
   `"googleRedirectUri":"https://layerflow.dev/api/auth/callback/google"`.

## 4. Provider keys (the "free first month")

Ship `GROQ_*` + `GEMINI_*` platform keys and a brand-new user can
`lf login` (paste a platform key, or `lf login --browser`) and chat
immediately — managed use is metered and plan-capped:

- **Free plan** → `groq` + `google` managed only. BYOK always allowed.
- **Starter $5** → adds `deepseek`, `kimi`, `xai` managed.
- **Pro $14** → adds `openai`, `anthropic`, `openrouter` managed.

Add DeepSeek/Kimi/xAI keys to your secrets file and re-run
`npm run deploy:api` to push them (they are already in the optional list).
While billing (Dodo) is unconfigured the system runs in **beta mode** = all
platform keys allowed.

## 5. Post-deploy verification (run ALL — the proof it's real)

```bash
npm run check:prod          # site, DNS, API health, worker health, lf-health
```

Then, manually, the five "worker unblocked" features:
1. Sign in at `layerflow.dev` → **Rescue** → paste a dead chat → report
   completes (not stuck on "queued").
2. **Compare** → run a prompt across models → results + ranking appear.
3. **Agents** → run a template agent → steps + progress update live.
4. Set a $1 budget → burn past it → next request is **blocked**.
5. `lf sync` from the terminal → operations appear in the dashboard → devices
   list shows your CLI.

Gateway + terminal:
```bash
curl https://api.layerflow.dev/v1/models -H "Authorization: Bearer lf_live_..."
lf login            # paste platform key (or lf login --browser for device flow)
lf chat "hello"     # streams via the gateway
lf cost             # workspace budget cap + progress bar + plan status
```

## 6. Launch billing (Dodo Payments)

1. https://app.dodopayments.com → create products:
   - "LayerFlow Starter" — $5/mo recurring → copy product ID
   - "LayerFlow Pro" — $14/mo recurring → copy product ID
2. Add to `.vercel.env` + re-run `npm run deploy:api`: `DODO_PRODUCT_STARTER`,
   `DODO_PRODUCT_PRO`, `DODO_PAYMENTS_API_KEY`, `DODO_PAYMENTS_WEBHOOK_KEY`,
   `DODO_PAYMENTS_ENVIRONMENT=live_mode` (Vercel env too).
3. Dodo dashboard → Webhooks → add `https://api.layerflow.dev/api/billing/webhook`.
4. Test-purchase in Dodo **test mode** → webhook fires →
   `GET /api/billing/status` shows `starter`.
5. Flip to live + real card.

Once billing is configured, beta mode ends and plan-limit enforcement is live.

## 7. Release the terminal (optional)

Device-flow login + brand cleanup need a new public binary:
```bash
cd terminal
git tag v0.2.21 && git push origin v0.2.21
# .github/workflows/release.yml → goreleaser publishes binaries + Homebrew formula
```
Users update with `lf upgrade`. Source stays private.

---

## Environment variable matrix

`S` = secret, never browser. Source of truth: your local `.vercel.env` =
`fly.env` (byte-identical + `fly secrets import < fly.env` works too).

| Variable | Vercel (web) | Fly (API/worker) | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | `https://layerflow.dev` | — | browser always uses same origin |
| `DATABASE_URL` | ✅ | ✅ | Neon, `?sslmode=require` |
| `REDIS_URL` | ✅ | ✅ | Upstash `rediss://` |
| `BETTER_AUTH_SECRET` | ✅ | ✅ | **identical everywhere** |
| `BETTER_AUTH_URL` | ✅ `https://layerflow.dev` | ✅ | **== WEB_URL**; never `api.` |
| `WEB_URL` | ✅ `https://layerflow.dev` | ✅ | |
| `API_URL` | ✅ `https://layerflow.dev` | ✅ | CLI/links; not for OAuth |
| `CORS_ORIGINS` | ✅ | ✅ | `https://layerflow.dev` only |
| `PROVIDER_KEYS_KEK` | ✅ | ✅ | **identical** — BYOK decryption |
| `GOOGLE_CLIENT_ID/SECRET` | ✅ | ✅ | redirect `https://layerflow.dev/api/auth/callback/google` |
| `GROQ_*` / `GEMINI_*` | ✅ | ✅ | free-tier platform providers |
| `DEEPSEEK_*` / `KIMI_*` / `XAI_*` | optional | optional | add when ready |
| `RESEND_API_KEY` / `FROM_EMAIL` | ✅ | ✅ | alerts + digests |
| `DODO_PAYMENTS_*` / `DODO_PRODUCT_*` | ✅ | ✅ | when launching billing |
| `SENTRY_DSN` | ✅ | ✅ | |
| `COOKIE_DOMAIN` | ✅ `.layerflow.dev` | ✅ | |
| `ADMIN_EMAILS` | ✅ | ✅ | admin gating |
| `GMAIL_USER` / `GMAIL_APP_PASSWORD` | — | ✅ | AutoSubmit email |
| `R2_*` | — | ✅ | file storage |

Only `NEXT_PUBLIC_*` ever reaches the browser. Changing Vercel env vars requires
a redeploy. Never commit real values.

---

## Everyday commands & troubleshooting

**Local dev (per process):** `npm run dev:web` (:3000) · `npm run dev:api`
(:8787) · `npm run dev:worker`. Want a clean local DB? `docker compose down -v
&& docker compose up -d`. Health locally:
```bash
curl http://localhost:8787/health/live     # {"status":"ok"}
curl http://localhost:3000/api/lf-health   # full same-origin check
```

**Point local dev at Neon + Upstash** (no local Docker needed): set
`DATABASE_URL=<Neon>` and `REDIS_URL=<Upstash rediss://>` in `apps/api/.env`,
then `npm run dev`.

**Inspect the database:**
```bash
psql "<NEON_DATABASE_URL>" -c "\dt"                                  # tables
psql "<NEON_DATABASE_URL>" -c "SELECT count(*) FROM users;"          # any query
psql "<NEON_DATABASE_URL>" -tAc "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';"   # table count
```

**Manual Fly operations (the script does these automatically):**
```bash
flyctl logs -a layerflow-api                          # API + worker logs
flyctl scale count app=1 worker=1 -a layerflow-api    # machines per process
flyctl secrets list -a layerflow-api                  # confirm secrets
flyctl certs add api.layerflow.dev -a layerflow-api   # custom domain cert
curl -s https://layerflow-api.fly.dev:9091/health     # worker health
```

**Terminal (`lf`) quick commands:**
```bash
cd terminal
./lf doctor      # diagnostics — all PASS except config/auth on first run
./lf login       # paste a platform key (or --browser for device flow)
./lf models      # list available models
./lf chat        # ask questions in the terminal
./lf cost        # token + cost usage
./lf logout      # revoke + purge credentials
```

| Symptom | Fix |
|---|---|
| `lf login` fails with 500 once | cold-start race — retry; 2nd attempt works |
| `ECONNREFUSED 5432/6379` locally | `docker compose up -d` or point `.env` at Neon/Upstash |
| API 500 on a DB route | check migrations applied to Neon (`drizzle-kit migrate`) |
| Vercel deploy fails | run `npm run build` locally first — it must pass |
| Need a fresh local DB | `docker compose down -v && docker compose up -d` |

---

**Fly deploy (`npm run deploy:api`) → DNS `api.layerflow.dev` + cert → Vercel
env flip + redeploy → Google OAuth redirect URI → verify E2E (5 features) →
billing → release terminal**

## Rollback & backup

- **Fly rollback:** each deploy keeps the previous image — `flyctl deploy
  --image <previous>` or `fly rollback` inside the dashboard.
- **DB:** Neon PITR on paid plans; snapshot a branch before each migration
  (`neon branches create`).
- **Migrations:** drizzle generates the down path in git history — review
  before prod; never hand-edit prod tables.
- **Secrets:** `.vercel.env` is the only backup — keep a second encrypted copy
  in a password manager. If lost, rotate everything.
- **Terminal releases:** immutable binaries; a bad release = ship `v0.2.22`
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

*That's the whole deployment. Once the worker is live, LayerFlow is real.*