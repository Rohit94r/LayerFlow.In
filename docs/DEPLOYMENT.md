# LayerFlow — Production Deployment Guide (Simple Hinglish)

**Status:**
- Frontend already live hai Vercel pe (`https://layerflow.dev`, custom domain connected).
- **`lf` terminal CLI working hai** — `chat/run/sessions/login/logout/sync/models/doctor/rescue/cost/mcp/daemon` sab implemented aur tested (build, vet, `-race` tests green). Backend sync endpoints (`/api/v1/sync/*`), team, notifications, aur agent v2 routes bhi live hain.
- **`lf` v0.2.3 released** — binaries, `install.sh`, aur Homebrew formula sab live public repo (`Rohit94r/layerflow-releases` + `Rohit94r/homebrew-tap`) pe hain. `brew install Rohit94r/tap/lf` aur `curl | bash` dono abhi public mein resolve karte hain. (v0.1.0 first release; v0.2.0 full-screen TUI; v0.2.1 universal installer; v0.2.2 auto model selection; v0.2.3 pure-Go sqlite so release binaries actually open the TUI.)
- Ye guide **baaki ka kaam** samjhata hai — full platform live karne ke liye: Postgres, Redis, Hono API + BullMQ worker, migrations, billing, monitoring, backups, aur future `lf` releases publish karne ka flow.

> **Repo abhi private hai — aur private hi rahega.** Source kabhi public nahi
> hota. Sirf **prebuilt binaries** public distribution repo
> (`Rohit94r/layerflow-releases`) mein jaate hain. Naya `lf` release release
> karna hai to bas ek `v*` tag push karo — `.github/workflows/release.yml`
> goreleaser ke through binaries, `install.sh` copy, aur Homebrew formula
> auto-publish karta hai (§14 mein pura flow + setup hai).

> Naye engineer ho? Pehle [docs/architecture.md](architecture.md) aur
> [docs/tech-stack.md](tech-stack.md) padho, phir ye guide top-to-bottom follow
> karo.

---

## 1. Ek Nazar Mein Architecture

```
Browser
  │
  ├─ https://layerflow.dev ──────────── Vercel (Next.js 16)
  │     ├─ /api/*, /v1/*  → Hono API  (same-origin mount — akele kaam karta hai)
  │     └─ pages: marketing, auth, dashboard
  │
  └─ (scaled, jab zyada traffic) ────── https://api.layerflow.dev
        └─ Fly.io / Render / Railway — Hono API (port 8787) + BullMQ worker
              ├─ PostgreSQL + pgvector  → Neon (ya Supabase)
              ├─ Redis / BullMQ         → Upstash
              ├─ Cloudflare R2          → files (optional)
              ├─ Resend                 → email
              ├─ Dodo Payments          → billing
              ├─ Sentry                 → errors
              └─ Google OAuth           → sign-in
```

**Do deployment modes:**

| Mode | API kahan chalta hai | Kab use karo |
|---|---|---|
| **A — Sirf Vercel (abhi)** | Hono Next ke andar `/api/*` aur `/v1/*` pe mounted hai, so `layerflow.dev` hi poora product ek deploy se serve karta hai | Private beta, kam traffic. Sirf `DATABASE_URL`, `REDIS_URL`, `BETTER_AUTH_*`, `GOOGLE_*` Vercel pe set karo, bas |
| **B — Alag API host (target)** | Hono + worker Fly.io/Render/Railway pe; Vercel `https://api.layerflow.dev` ko call karta hai | Scaling: worker jobs (rescue, agents, rollups, digests), terminal sync, SSE at volume |

Mode A aaj single source of truth hai. Mode B ye guide walk through karta hai.
Dono modes same code share karte hai — switch karne ke liye koi code change nahi
chahiye; sirf environment variables move karni hai.

---

## 2. Har Kaam Ke Liye Kaunsa Platform? (Full List)

Sabse pehle ye samjho: **kis cheez ke liye kaunsa platform chahiye**. Ek table
mein sab:

| Kaam | Platform | Kyun? | Account Kahan |
|---|---|---|---|
| **Frontend (website)** | **Vercel** | Next.js deploy — free, fast, auto SSL | https://vercel.com |
| **API + Worker (backend)** | **Fly.io** (recommended) | Always-on server, terminal sync, background jobs | https://fly.io |
| **API + Worker (alternate)** | **Render** | One-click blueprint (`render.yaml`) | https://render.com |
| **API + Worker (alternate)** | **Railway** | Simple deploy | https://railway.app |
| **Database (PostgreSQL + pgvector)** | **Neon** | Managed Postgres + AI embeddings ready | https://neon.tech |
| **Database (alternate)** | **Supabase** | Postgres + extras | https://supabase.com |
| **Cache + Job Queue (Redis)** | **Upstash** | BullMQ queues, caching, rate-limit | https://upstash.com |
| **Google Login** | **Google Cloud Console** | OAuth client ID + Secret | https://console.cloud.google.com/apis/credentials |
| **Email** | **Resend** | Transactional email (login codes, alerts) | https://resend.com |
| **Billing (subscriptions)** | **Dodo Payments** | $5/$14 plans ka payment | https://app.dodopayments.com |
| **Error Monitoring** | **Sentry** | Bugs + crashes track | https://sentry.io |
| **Analytics** | **PostHog** | Users ka behavior + funnels | https://posthog.com |
| **File Storage (optional)** | **Cloudflare R2** | Uploads, exported reports | https://www.cloudflare.com/r2/ |
| **Code + CI** | **GitHub** | Repo + automated checks | https://github.com |

**CLI `lf` publish karne ke liye alag platforms:**

| Kaam | Platform | Kyun? |
|---|---|---|
| Source code | **`Rohit94r/LayerFlow.In` (private)** | Kabhi public nahi hota — product copy hone se bachta hai |
| Binary files host karna | **GitHub Releases of `Rohit94r/layerflow-releases` (public)** | Har OS/arch ka build yahan upload hota hai, bina auth download hota hai |
| Auto-build on tag | **GoReleaser** (GitHub Actions se chalta hai) | `terminal/.goreleaser.yml` already ready; tag push → public repo pe release |
| **Installer script** | **`layerflow-releases/install.sh`** (public raw URL) | `curl ... | bash` wala one-liner |
| Release token | **Fine-grained PAT `GH_TOKEN`** secret on private repo | Sirf `layerflow-releases` repo ke `contents: write` ka access — source ko nahi |
| CLI docs/landing | **layerflow.dev** (Vercel) | Download page + version badge |

**Local tools chahiye:** `node 22`, `npm`, `git`, `go 1.26` (CLI build ke liye).
Docker sirf tab jab image locally run karo ya Fly path use karo.

---

## 3. Repo Layout (Deployment Ke Liye Zaroori Files)

```
apps/api/            → Hono API + BullMQ worker (ek package, do entrypoints)
  ├─ Dockerfile      → production image (builds dist/index.js + dist/worker.js)
  ├─ drizzle/        → SQL migrations (76 tables as of 0015)
  ├─ drizzle.config.ts
  └─ package.json    → scripts: db:migrate, db:verify, build, start, worker
apps/web?  → koi nahi: Next app repo ROOT pe hai
packages/contracts, packages/model-registry  → API bundle mein build hota hai
terminal/           → Go CLI (`lf`), `/api/v1/sync/*` se sync karta hai
render.yaml         → Render Blueprint for API + worker (Mode B)
docker-compose.yml  → local Postgres+pgvector + Redis
```

---

## 4. Frontend — Vercel (Pehle Se Live)

`layerflow.dev` live hai aur custom domain connected hai. Verify/complete karo:

1. **Project settings** — Vercel → project → Settings:
   - Framework Preset: **Next.js**
   - Root Directory: `/` (repo root)
   - Build Command: `npm run build` · Output: default
   - Install Command: `npm ci`
2. **Environment variables (Production)** — §9 dekho. Mode A mein Vercel pe DB/Redis/auth
   variables bhi chahiye taaki same-origin Hono mount chal sake:
   ```
   DATABASE_URL, REDIS_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL,
   WEB_URL, API_URL, CORS_ORIGINS, PROVIDER_KEYS_KEK,
   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, ADMIN_EMAILS
   ```
   Quick reference: `bash scripts/vercel-env-checklist.sh`.
3. **Custom domain** — already connected (`layerflow.dev`). Agar `www.layerflow.dev`
   bhi chahiye to Vercel → Domains se redirect karo.
4. **Google OAuth** — OAuth client mein redirect URI add karo:
   `https://layerflow.dev/api/auth/callback/google`
5. **Verify** deploy ke baad: `curl https://layerflow.dev/api/lf-health` → `ok`
   (ye route same-origin Hono ko hit karta hai, proof ki DB + Redis wired hai).
6. **Preview deployments** — Vercel "Preview" enable karo taaki PRs ko isolated env mile.

---

## 5. Database — PostgreSQL + pgvector (Neon)

1. https://console.neon.tech → **New Project**.
2. API host ke paas wala region chuno (e.g. `US-East-1 (Virginia)` — Render/Fly region
   se match karo). `pgvector` Neon pe already enabled hai — koi extension step nahi.
3. Connection string copy karo, aisi dikhti hai:
   `postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require`
4. `DATABASE_URL` ko ye value set karo har jagah (Vercel, API host).
5. **Migrations** automatically run hote hai har API deploy se pehle (§8), ya manually:
   ```bash
   npm run db:migrate --workspace @layerflow/api
   npm run db:verify --workspace @layerflow/api   # in-memory Postgres pe replay
   ```
   Migrations `apps/api/drizzle/` mein hai (76 tables as of `0015_sync_ops`).

> **Kabhi** `npm run db:seed --workspace @layerflow/api` production pe mat chalana.
> Seeding sirf local dev ke liye hai.

Alternative (Supabase): https://supabase.com — same connection string format.
`pgvector` available verify karo (locally `pgvector/pgvector:pg16`; Supabase ships it).

---

## 6. Redis — Upstash

1. https://console.upstash.com → **Create Database**.
2. API host ke paas wala region chuno. TLS by default on hai — URL aisa:
   `rediss://default:<password>@<host>:6379`.
3. `REDIS_URL` ko ye `rediss://` URL har jagah set karo.

**Iski kya zaroorat:** BullMQ queues (rescue, agents, compare, alerts, digests),
exact-match LLM response cache, rate-limit counters, session cache.

---

## 7. API + Worker — Mode B Hosts

Ek host chuno. **Fly.io** primary path hai (scripted); **Render** one-click
Blueprint hai; **Railway** teesra option.

### 7a. Fly.io (Recommended, Scripted)

1. flyctl install + login:
   ```bash
   curl -L https://fly.io/install.sh | sh
   flyctl auth login
   ```
2. Repo root pe `fly.toml` banao (abhi committed nahi hai). Ye template repo-root
   Dockerfile build karta hai aur API + worker dono ko ek app ke do processes ke
   roop mein chalta hai:

   ```toml
   app = "layerflow-api"
   primary_region = "iad"

   [build]
     dockerfile = "apps/api/Dockerfile"

   [deploy]
     release_command = "npm run db:migrate --workspace @layerflow/api"

   [http_service]
     internal_port = 8787
     force_https = true
     auto_stop_machines = false
     auto_start_machines = true
     min_machines_running = 1
     processes = ["api"]
     [http_service.checks]
       [http_service.checks.health]
         interval = "30s"
         timeout = "5s"
         grace_period = "20s"
         method = "GET"
         path = "/health"

   [[vm]]
     size = "shared-cpu-1x"
     processes = ["api"]

   [[vm]]
     size = "shared-cpu-1x"
     processes = ["worker"]
   ```

3. Deploy sab kuch (env vars + code) script se:
   ```bash
   ENV_FILE=.vercel.env npm run deploy:api
   ```
   ya manually:
   ```bash
   flyctl apps create layerflow-api
   flyctl secrets set DATABASE_URL=... REDIS_URL=... BETTER_AUTH_SECRET=... \
     BETTER_AUTH_URL=https://api.layerflow.dev WEB_URL=https://layerflow.dev \
     API_URL=https://api.layerflow.dev CORS_ORIGINS=https://layerflow.dev \
     PROVIDER_KEYS_KEK=... GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=...
   flyctl deploy --app layerflow-api
   ```
4. **SSL + custom domain:**
   ```bash
   flyctl certs add api.layerflow.dev --app layerflow-api
   ```
   Phir DNS provider pe `CNAME  api → layerflow-api.fly.dev` record add karo.
5. **Google OAuth** — second redirect URI add karo:
   `https://api.layerflow.dev/api/auth/callback/google`
6. **Verify:**
   ```bash
   curl https://layerflow-api.fly.dev/health     # → {"status":"ok",...}
   curl https://api.layerflow.dev/health
   ```
7. Zero-downtime built-in hai: Fly naye machines start karta hai purane drain hone
   se pehle. `auto_stop_machines = false` worker ko awake rakhta hai (scheduled jobs
   isi pe depend karte hai).

### 7b. Render (One-Click Blueprint)

`render.yaml` repo root pe API web service + worker ko ek image se define karta
hai with `preDeployCommand` running migrations.

1. Render Dashboard → **New → Blueprint** → repo chuno
   `Rohit94r/LayerFlow.In`.
2. Render har `sync: false` env var ke liye prompt karega — §9 se values paste karo.
3. Dono services ke liye `plan: starter` ya higher set karo (free plans sleep karte
   hai aur SSE streams + scheduled jobs maarte hai).
4. Custom domain: Render → service → **Settings → Custom Domain** →
   `api.layerflow.dev` (Render TLS cert automatically provision karta hai).
5. Google OAuth redirect: `https://api.layerflow.dev/api/auth/callback/google`.

### 7c. Railway (Alternative)

1. Railway → **New Project → Deploy from repo** → `apps/api/Dockerfile` chuno,
   docker context repo root set karo.
2. `DATABASE_URL`, `REDIS_URL`, aur saare §9 secrets **Variables** mein add karo.
3. Same image se do services (API aur worker):
   - API: `node apps/api/dist/index.js` (port 8787)
   - Worker: `node apps/api/dist/worker.js`
4. Railway ka `railway.app` subdomain HTTPS deta hai; custom domain **Settings →
   Networking** mein add karo.

### 7d. Worker Kya Chalaata Hai

BullMQ worker (`apps/api/dist/worker.js`) process karta hai: rescue reports, agent
runs + schedules + maintenance, memory extraction, usage rollups, budget alerts,
aur weekly digests. Ye **24/7 chalna chahiye** jab tum wo features enable karo —
kabhi sleep-on-idle host pe mat rakho.

---

## 8. Migrations & Kaise Chale

| Host | Mechanism |
|---|---|
| Vercel (Mode A) | Manually chalao env change ke baad: `npm run db:migrate --workspace @layerflow/api` CI se, ya Vercel ka `release` phase |
| Fly.io | `release_command` in `fly.toml` — har deploy se pehle |
| Render | `preDeployCommand` in `render.yaml` — har deploy se pehle |
| Railway | `release`-style service add karo ya `db:migrate` manually ek baar |

Saari migrations additive SQL files hain `apps/api/drizzle/` ke andar; `db:verify`
unhe in-memory Postgres pe replay karta hai taaki Neon pe jaane se pehle drift pakad
le.

---

## 9. Environment Variables (Complete Reference)

Secrets generate karo: `openssl rand -hex 32` (BETTER_AUTH_SECRET) — ye exactly
64 hex chars deta hai, jo `PROVIDER_KEYS_KEK` ke liye bhi sahi size hai.

**Har jagah required jahan API chalta hai (Vercel Mode A, aur Mode B host):**

| Variable | Value / source |
|---|---|
| `DATABASE_URL` | Neon connection string (with `sslmode=require`) |
| `REDIS_URL` | Upstash `rediss://…` |
| `BETTER_AUTH_SECRET` | `openssl rand -hex 32` |
| `BETTER_AUTH_URL` | Mode A: `https://layerflow.dev` · Mode B: `https://api.layerflow.dev` |
| `WEB_URL` | `https://layerflow.dev` |
| `API_URL` | Mode A: `https://layerflow.dev` · Mode B: `https://api.layerflow.dev` |
| `CORS_ORIGINS` | `https://layerflow.dev` (comma-separated agar domains add karo) |
| `PROVIDER_KEYS_KEK` | `openssl rand -hex 32` — BYOK keys encrypt (AES-256-GCM). **Rotate karo = user keys undecryptable; backup zaroor karo** |
| `GOOGLE_CLIENT_ID` | Google Cloud Console → OAuth 2.0 Client |
| `GOOGLE_CLIENT_SECRET` | same client |
| `ADMIN_EMAILS` | default `rjdhav67@gmail.com` |

**Managed-provider keys (optional — BYOK ke bina out-of-box model runs ke liye):**

| Variable | Notes |
|---|---|
| `OPENAI_API_KEY` | semantic-search embeddings ke liye bhi jab set ho |
| `GROQ_API_KEY` + `GROQ_MODEL` | e.g. `llama-3.3-70b-versatile` |
| `GEMINI_API_KEY` + `GEMINI_MODEL` | e.g. `gemini-flash-latest` |
| `DEEPSEEK_API_KEY` + `DEEPSEEK_MODEL` | e.g. `deepseek-chat` |
| `KIMI_API_KEY` + `KIMI_MODEL` | e.g. `kimi-k2` |
| `XAI_API_KEY` + `XAI_MODEL` | e.g. `grok-3-mini` |

**Billing (Dodo Payments):**

| Variable | Value |
|---|---|
| `DODO_PAYMENTS_API_KEY` | Dashboard → Developer → API (write access) |
| `DODO_PAYMENTS_WEBHOOK_KEY` | Developer → Webhooks → `{API_URL}/api/billing/webhook` secret |
| `DODO_PAYMENTS_ENVIRONMENT` | `test_mode` → `live_mode` jab ready ho |
| `DODO_PAYMENTS_RETURN_URL` | `https://layerflow.dev/billing` |
| `DODO_PRODUCT_STARTER` / `DODO_PRODUCT_PRO` | Product ids (`pdt_…`) for $5 / $14 plans |

**Email / monitoring / storage (optional but recommended):**

| Variable | Notes |
|---|---|
| `RESEND_API_KEY`, `FROM_EMAIL` | budget alerts + weekly digests; bina key ke email logged no-op hai |
| `SENTRY_DSN` | error + tracing; `SENTRY_TRACES_SAMPLE_RATE=0.1` in prod |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` | file uploads; unset = local disk fallback |
| `COOKIE_DOMAIN` | `.layerflow.dev` (auto-derived; override sirf zaroorat pe) |
| `TOKEN_SAVER_INPUT_BUDGET`, `TOKEN_SAVER_KEEP_TURNS`, `TOKEN_SAVER_MAX_TOKENS`, `EXACT_CACHE_TTL_SECONDS` | cost-saver tuning (defaults theek hain) |
| `PORT` | `8787` (sirf API process) |

> `NEXT_PUBLIC_API_URL` Vercel pe **optional** hai — browser same-origin use karta
> hai `layerflow.dev` pe. Sirf jab Mode B live ho to set karo:
> `NEXT_PUBLIC_API_URL=https://api.layerflow.dev` (ye runtime pe change hota hai aur
> frontend redeploy chahiye).

---

## 10. Billing Setup (Dodo Payments)

Platform **Dodo Payments** use karta hai (Stripe nahi) subscriptions ke liye.

1. Account banao: https://app.dodopayments.com
2. **Products** → do subscription products banao:
   - Starter — $5/mo
   - Pro — $14/mo
   `pdt_…` ids copy karke `DODO_PRODUCT_STARTER` / `DODO_PRODUCT_PRO` mein daalo.
3. **Developer → API** → **write** access wali API key banao →
   `DODO_PAYMENTS_API_KEY`.
4. **Developer → Webhooks** → `https://api.layerflow.dev/api/billing/webhook`
   (ya Mode A mein `https://layerflow.dev/api/billing/webhook`) add karo aur signing
   secret copy karo → `DODO_PAYMENTS_WEBHOOK_KEY`.
5. Pehle `DODO_PAYMENTS_ENVIRONMENT=test_mode` se test karo; `live_mode` tabhi jab
   billing flows verified ho.
6. **Important:** pahle kabhi committed live Dodo keys rotate karo — naye generate
   karo, kabhi commit mat karo.

---

## 11. Email (Resend)

1. https://resend.com → domain add karo (e.g. `layerflow.dev`) aur DNS verify karo.
2. API key banao → `RESEND_API_KEY`.
3. `FROM_EMAIL=LayerFlow <alerts@layerflow.dev>` set karo (verified sender se match
   karna chahiye).

---

## 12. Monitoring & Observability

| Layer | What | Status |
|---|---|---|
| Liveness/readiness | `GET /health`, `/health/live`, `/health/ready` | ✅ wired (checks DB + Redis) |
| Structured logs | pino, request ids, JSON lines | ✅ wired |
| Errors + tracing | Sentry (`apps/api/src/observability/sentry.ts`) | ✅ wired — `SENTRY_DSN` set karo |
| Frontend health | `https://layerflow.dev/api/lf-health` | ✅ wired |
| Uptime | UptimeRobot / Better Stack / Vercel cron on `/health` | 🔜 recommended |
| Queue visibility | BullMQ UI (Bull Board / Taskforce) | ❌ not wired — roadmap dekho |
| Product analytics | PostHog | ❌ not wired — roadmap dekho |
| Terminal crash reporting | opt-in, planned | ❌ not wired |

**Kisi bhi deploy ke baad quick smoke:**
```bash
bash scripts/check-production.sh
# ya manually:
curl -s https://api.layerflow.dev/health
curl -s https://layerflow.dev/api/lf-health
```

---

## 13. Backups, Rollback, Zero-Downtime

**Database backups**
- Neon: **Time Travel / PITR** aur **weekly automatic backups** enable karo
  (Neon → Project → Branching/Backups). Har release migration se pehle manual
  snapshot lo.
- Sirf `pg_dump` pe mat bharos rakho; PITR corruption aur bad deploys dono cover
  karta hai.

**Redis** — durable data nahi (queues/caches only). Worker mid-job mar jaye to
BullMQ queue se retry karta hai. Loss fine hai.

**Rollback strategy**
- Frontend (Vercel): **Redeploy previous deployment** (Vercel saare deployments
  rakhta hai; instant, zero-downtime).
- API (Fly): `flyctl releases` → previous release image `flyctl deploy` karo, ya
  `flyctl rollback`.
- API (Render): Render → service → **Deploy → Rollback to previous**.
- DB: migrations **additive** hain (kabhi destructive nahi); pehle code roll back
  karo, phir follow-up `down`/compensating migration se bad migration hatao.

**Zero-downtime rules**
1. Sirf additive migrations ship karo (`CREATE TABLE`, `ADD COLUMN` with default).
2. Pehle DB deploy karo (release_command/preDeployCommand), phir code.
3. `auto_stop_machines = false` (Fly) aur `plan: starter` (Render) rakho taaki worker
   kabhi na soye.
4. Machines warm karo: `flyctl scale show` → `flyctl machine update --wait-timeout 180`.

---

## 14. `lf` Terminal CLI — Live Karna (Full Guide)

Ye section batata hai ki **`lf` CLI ko kaise publish karo** taaki duniya ka koi bhi
user ek command se install kar sake. CLI **Go language** mein hai, code
`terminal/` folder mein.

### 14a. CLI Kitni Platforms Pe Jaa Rahi Hai

| Platform | Command |
|---|---|
| **macOS/Linux** (primary) | `curl -fsSL https://layerflow.dev/install \| bash` |
| **Windows** (PowerShell) | `powershell -ExecutionPolicy Bypass -c "irm https://layerflow.dev/install.ps1 \| iex"` |
| **Direct binary** | `https://github.com/Rohit94r/layerflow-releases/releases/latest` se `.tar.gz`/`.zip` download |
| **Build from source** | private repo access hona chahiye: `cd terminal && go build ./...` |

**CLI ke current commands** (`lf --help` se bhi dekho):
`chat`, `run`, `sessions`, `login`, `logout`, `sync`, `models`, `doctor`,
`rescue`, `cost`, `mcp list/add/remove/health`, `daemon start/stop/status`.

### 14b. GoReleaser — Sab Builds Ek Saath

`terminal/.goreleaser.yml` already ready hai. Ye har OS/arch ke liye binary banata
hai:

- **OS:** darwin (macOS), linux, windows
- **Arch:** amd64 + arm64 (windows arm64 skip)
- Windows ke liye `.zip`, baaki ke liye `.tar.gz`
- `checksums.txt` + changelog automatically
- **Release** public repo `Rohit94r/layerflow-releases` pe upload hota hai (source private rahta hai)

### 14c. Step-by-Step: CLI Publish Karne Ka Complete Process

**Step 1 — Code ready karo**
```bash
cd terminal
go mod tidy
go build ./...     # build sahi
go vet ./...       # static checks
go test -race ./...  # tests pass
```

**Step 2 — GitHub repos ready karo**
- **Source repo:** `Rohit94r/LayerFlow.In` (private) — code, Go CLI, `.goreleaser.yml`.
- **Binary repo:** `Rohit94r/layerflow-releases` (public) — prebuilt `lf` archives + `checksums.txt`. Only this repo is public; the source repo stays private.
- Goreleaser `release:` config (`.goreleaser.yml`) targets this public repo (`owner: Rohit94r, name: layerflow-releases`). A `brews:` section auto-pushes the Homebrew formula to `Rohit94r/homebrew-tap` → `brew install Rohit94r/tap/lf`.
- `terminal/scripts/install.sh` points at the public repo URL — ready for `curl | bash`.

**Step 3 — GitHub Actions workflow banao** (`.github/workflows/release.yml`):
- Binaries are published from the private repo to the public binary repo when a tag `v*` is pushed.
- The workflow uses a fine-grained PAT (`GH_TOKEN`) scoped to **only** the public repo (`contents: write`); it has zero access to the private source repo.
- This workflow runs on the private repo: `GITHUB_TOKEN` secret needs write access to `Rohit94r/layerflow-releases` only.

```yaml
name: release

on:
  push:
    tags: ['v*']

permissions:
  contents: read

jobs:
  goreleaser:
    name: Build · publish to layerflow-releases
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Set up Go
        uses: actions/setup-go@v5
        with:
          go-version-file: terminal/go.mod
          cache-dependency-path: terminal/go.sum

      - name: Run GoReleaser
        uses: goreleaser/goreleaser-action@v6
        with:
          version: latest
          args: release --clean
          workdir: terminal
        env:
          GITHUB_TOKEN: ${{ secrets.GH_TOKEN }}
```

**Step 4 — Tag banao aur release karo**
```bash
git tag v0.1.0
git push origin v0.1.0   # private repo — GoReleaser triggers → publishes to `Rohit94r/layerflow-releases`
```
- GoReleaser builds every OS/arch (darwin amd64/arm64, linux amd64/arm64, windows amd64) and uploads `lf_0.1.0_*.tar.gz` / `.zip` + `checksums.txt` as a GitHub Release in the **public** repo. Note: GoReleaser strips the leading `v` from tags, so `v0.1.0` → archive `lf_0.1.0_darwin_arm64.tar.gz` (install.sh already strips `v` too).
- The Homebrew formula is auto-pushed to `Rohit94r/homebrew-tap` → `brew install Rohit94r/tap/lf` works out of the box.
- The `install.sh` auto-downloads the right binary (with a `layerflow` alias).

**Step 5 — (Optional) npm package `@layerflow/cli`** (future — sirf jab `@layerflow` org banao)
- **Important:** `go install github.com/layerflow/terminal@latest` **publicly kabhi kaam nahi karega** — source repo private hai (by design), isliye module proxy pe resolve nahi hota. Public users ke liye supported paths sirf 2 hain: `brew install Rohit94r/tap/lf` ya `curl | bash`. `go install` sirf team members ke liye hai (private access ke saath).
- `packages/cli/` (ya `terminal/npm/`) mein `package.json` banao jo binary download
  + install kare:

```json
{
  "name": "@layerflow/cli",
  "version": "0.1.0",
  "description": "LayerFlow terminal CLI",
  "bin": { "lf": "./bin/lf.js" },
  "files": ["bin"],
  - `install.js` — OS/arch detect karo, GitHub Releases se sahi binary download karo,
  `bin/lf` mein rakho.
- Publish karo: `npm publish` (pehle `npm login` karo, `@layerflow` org banao).

**Step 6 — Installer script live karo** (`curl | bash` wala)
- `terminal/scripts/install.sh` already ready hai — GoReleaser se binary
  download karta hai (macOS/Linux/Windows Git Bash, SHA-256 verify, PATH auto-add). ✅ **Done**
- Short URL live: `curl -fsSL https://layerflow.dev/install | bash`
  (Next.js route `/install` serves the script straight from `terminal/scripts/install.sh` — single source of truth.)
- Windows PowerShell installer bhi live: `powershell -ExecutionPolicy Bypass -c "irm https://layerflow.dev/install.ps1 | iex"`
  (Next.js route `/install.ps1` serves `terminal/scripts/install.ps1`.)
- GitHub fallback bhi live: `curl -fsSL https://raw.githubusercontent.com/Rohit94r/layerflow-releases/main/install.sh | bash`

**Step 7 — Website pe download page banao**
- `layerflow.dev/install` — saari OS/arch ke instructions dikhao. ✅ Docs page
  (`/docs#install`) already install commands dikhata hai.
- Version badge: `https://img.shields.io/github/v/release/Rohit94r/layerflow-releases` → `v0.2.3` (live).

**Step 8 — Verify sab kuch**
```bash
curl -fsSL https://layerflow.dev/install | bash && lf version
```

### 14d. CLI Ke Baaki Important Setup

- **CLI ↔ API sync:** CLI `/api/v1/sync/*` endpoints se sync karta hai. Isliye
  backend (Mode B API) live hona chahiye taaki `lf sync`, `lf login`, aur sessions
  cloud pe save ho. Local-first design hai, so bina login ke bhi basic kaam chalta hai.
- **Keys storage:** OS keychain (`go-keyring`) + `~/.layerflow/config.json`
  (encrypted) — no manual setup needed for users.
- **Telemetry:** opt-in anonymized events — koi data bina permission nahi jaata.

---

## 15. Pre-Launch Production Checklist

- [ ] `npm run lint` → 0 errors
- [ ] `npx tsc --noEmit -p tsconfig.json` (web), `npm run typecheck --workspace @layerflow/api` (API), `npm run typecheck --workspace @layerflow/contracts`
- [ ] `npm run db:verify --workspace @layerflow/api` → clean replay
- [ ] `npm test --workspace @layerflow/api` → tests green
- [ ] `npm run build` (web) + `npm run build --workspace @layerflow/api`
- [ ] `cd terminal && go build ./... && go vet ./... && go test -race ./...`
- [ ] `curl https://layerflow.dev/api/lf-health` → `ok`
- [ ] `curl https://api.layerflow.dev/health` → `{"status":"ok"}`
- [ ] Google OAuth redirect URIs registered (dono `layerflow.dev` aur `api.layerflow.dev` agar Mode B)
- [ ] Dodo Payments `test_mode` mein, checkout + webhook end-to-end tested
- [ ] Resend sender verified; invite + alert emails tested
- [ ] `SENTRY_DSN` set; intentionally error throw karke confirm karo wo arrive ho
- [ ] Neon PITR + weekly backups on
- [ ] Neon/Sentry/Render/Fly alerts → email/phone
- [ ] `COOKIE_DOMAIN` web + API dono pe consistent (`.layerflow.dev`)
- [ ] Jo bhi key kabhi git history mein rahi hai use rotate karo (Dodo live key, webhook secret)
- [ ] CI green on `main` (`.github/workflows/ci.yml`)

**CLI launch ke liye extra checklist:**
- [ ] GitHub tag + GoReleaser release sahi ban gaye (har OS/arch ka build)
- [ ] Installer script test kiya (`curl -fsSL https://layerflow.dev/install | bash` aur `lf version`)
- [ ] `/install` page website pe live
- [ ] `lf version` sahi version dikhata hai
- [ ] `lf login` + `lf sync` backend ke against kaam karta hai

---

## 16. CI/CD

`.github/workflows/ci.yml` push/PR pe `main` pe chalta hai:

- Node 22: typechecks (contracts, model-registry, api, root), `db:verify`,
  API tests, API bundle build, Next.js build
- Go: `go build`, `go vet`, `go test` in `terminal/`

Deploys host-side hain: Vercel `main` ko auto-deploy karta hai; Fly/Render/Railway
push pe auto-deploy karte hai jab configured ho. `main` green rakhna — wahi ship
hota hai.

---

## 17. Troubleshooting

| Symptom | Fix |
|---|---|
| Sign-in fails on Vercel | `BETTER_AUTH_URL` must be `https://layerflow.dev`; Google redirect URI exactly match hona chahiye; `curl https://layerflow.dev/api/lf-health` |
| Cross-subdomain 401 / session lost | `COOKIE_DOMAIN=.layerflow.dev` dono hosts pe set karo |
| Migrations run nahi hote | `DATABASE_URL` Neon pe point kare with `sslmode=require`; manually `npm run db:migrate --workspace @layerflow/api` chalao |
| Worker jobs process nahi hote | Check worker process up hai (`flyctl logs` / Render logs), `REDIS_URL` reachable hai, queues paused nahi |
| SSE/streaming Render pe mar jaata hai | Free plan sleeps — `plan: starter`+ set karo |
| `PROVIDER_KEYS_KEK` badla aur BYOK keys fail | KEK change se purani provider keys undecryptable — user keys rotate karo ya purana KEK restore karo |
| Payments webhook 4xx | `DODO_PAYMENTS_WEBHOOK_KEY` mismatch; endpoint `/api/billing/webhook` hona chahiye |
| `curl | bash` installer fail | install.sh raw URL accessible ho, GitHub release version tag match kare |
| `lf version` old dikhata hai | Naya tag push karo; `lf upgrade` (ya CLI update) chalao |

---

## 18. Related Docs

- [docs/architecture.md](architecture.md) — system design
- [docs/tech-stack.md](tech-stack.md) — technology choices
- [terminal/README.md](../terminal/README.md) — CLI features + usage
- [terminal/.goreleaser.yml](../terminal/.goreleaser.yml) — release config
- [docs/lf-terminal.md](lf-terminal.md) — terminal deep-dive
- [apps/api/README.md](../apps/api/README.md) — full endpoint map, budgets, seeding
- `scripts/deploy-api-prod.sh`, `scripts/vercel-env-checklist.sh`, `scripts/check-production.sh` — ops helpers
