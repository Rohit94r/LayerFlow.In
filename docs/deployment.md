# LayerFlow — Deployment Runbook

A beginner-friendly, do-it-in-order guide to putting LayerFlow into production:

- **Frontend (Next.js)** → **Vercel** at `https://layerflow.dev`
- **API + worker (Hono / BullMQ)** → **Fly.io** at `https://api.layerflow.dev`
- **Database** → **Neon** Postgres (with pgvector)
- **Cache / queue** → **Upstash** Redis
- **Auth** → **Google OAuth** via Better Auth
- **Files (optional)** → **Cloudflare R2**

If you only change the marketing site, you just push to `main` and Vercel
redeploys — you can ignore everything about Fly. This runbook is for standing up
(or rebuilding) the whole backend.

> Companion docs: `docs/getting-started.md` (use the product end to end),
> `docs/backend.md` (architecture), `docs/production-env.md` (env values),
> `apps/api/README.md` (how the API runs locally).

---

## 0. Read this first — the security gate (MANDATORY)

If any real secret (database URL, Redis URL, Google client secret, provider API
key, auth secret) has ever been pasted into a chat, a ticket, a screen share, or
committed anywhere, **treat it as compromised and rotate it before it protects
customer traffic.** Rotation is a required release step, not a nice-to-have.

Rotate, in each provider's dashboard:

| Secret | Where to rotate |
|--------|-----------------|
| `DATABASE_URL` | Neon → Project → **Roles** → reset password (or new role) → copy new connection string |
| `REDIS_URL` | Upstash → Database → **Details/Security** → rotate password / regenerate |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console → Credentials → your OAuth client → **Reset secret** |
| `BETTER_AUTH_SECRET` | Generate a fresh one: `openssl rand -hex 32` (rotating this invalidates sessions) |
| `PROVIDER_KEYS_KEK` | See the ⚠️ note below — do **not** blindly rotate |
| `GROQ_API_KEY` / `GEMINI_API_KEY` | Provider console → revoke old key → create new |
| `RESEND_API_KEY` | Resend → API Keys → revoke + create |

⚠️ **`PROVIDER_KEYS_KEK` is special.** It encrypts every stored BYOK provider
key (AES-256-GCM). If you rotate it, all previously encrypted `provider_keys`
rows become undecryptable. Only rotate it when the database has **no** encrypted
provider keys yet (fresh install), or after you build a re-encryption job. On a
brand-new, empty database, generate it once and keep it stable.

After rotating, set the new values **only** in the host dashboards (Vercel / Fly
secrets) — never in a tracked file.

---

## 1. What you need installed

You do **not** need all of these on your laptop, but the person doing the deploy
does. Install only what you use.

```bash
# Fly.io CLI (API host)
curl -L https://fly.io/install.sh | sh      # then restart your shell; `fly version`
fly auth login

# Vercel CLI (optional — the dashboard/Git integration is usually enough)
npm i -g vercel                              # `vercel login`

# Docker Desktop (only if you want to build/test the API image locally)
# https://www.docker.com/products/docker-desktop/
```

Already present in this repo's toolchain: Node 22, npm, and the GitHub CLI
(`gh`). Fly, Vercel, Railway, and Docker CLIs are **not** installed here yet.

---

## 2. Environment variable matrix

"Where" tells you which dashboard the variable lives in. Never commit real
values — `.env`, `.vercel.env`, and `*.env` are gitignored; only `*.env.example`
is tracked.

### API (set as **Fly secrets** — `fly secrets set KEY=value`)

| Variable | Local (`apps/api/.env`) | Production | Required |
|----------|-------------------------|------------|----------|
| `DATABASE_URL` | docker `postgres://layerflow:layerflow@localhost:5432/layerflow` | Neon `postgresql://…?sslmode=require` | ✅ |
| `REDIS_URL` | `redis://localhost:6379` | Upstash `rediss://…` (TLS) | ✅ |
| `BETTER_AUTH_SECRET` | `openssl rand -hex 32` | rotated 64-hex value | ✅ |
| `BETTER_AUTH_URL` | `http://localhost:8787` | `https://api.layerflow.dev` | ✅ |
| `GOOGLE_CLIENT_ID` | dev client id | prod client id | ✅ |
| `GOOGLE_CLIENT_SECRET` | dev secret | rotated prod secret | ✅ |
| `PROVIDER_KEYS_KEK` | `openssl rand -hex 32` | stable 64-hex value (see §0 ⚠️) | ✅ |
| `WEB_URL` | `http://localhost:3000` | `https://layerflow.dev` | ✅ |
| `API_URL` | `http://localhost:8787` | `https://api.layerflow.dev` | ✅ |
| `CORS_ORIGINS` | `http://localhost:3000` | `https://layerflow.dev` | ✅ |
| `NODE_ENV` | `development` | `production` (set in `fly.toml`) | auto |
| `PORT` | `8787` | `8787` (set in `fly.toml`) | auto |
| `OPENAI_API_KEY` | optional | optional (embeddings; falls back to local) | ⬜ |
| `GROQ_API_KEY` / `GROQ_MODEL` | optional | optional (platform fallback provider) | ⬜ |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | optional | optional (platform fallback provider) | ⬜ |
| `RESEND_API_KEY` | unset | leave unset until email is wired | ⬜ |
| `SENTRY_DSN` | unset | optional | ⬜ |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | unset | **leave unset** (payments disabled) | ⬜ |
| `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET` | unset | optional (else files use local disk) | ⬜ |

### Frontend (set in **Vercel → Project → Settings → Environment Variables**)

| Variable | Production | Notes |
|----------|------------|-------|
| `NEXT_PUBLIC_API_URL` | `https://api.layerflow.dev` | Only needed once the app calls the API. Never a `*.vercel.app` URL. |

The public site URL (`https://layerflow.dev`) is already hardcoded in
`app/layout.tsx`, the sitemap, and robots — no env var needed for it.

---

## 3. Frontend on Vercel + custom domain

The site is already live on Vercel and `layerflow.dev` already resolves to
Vercel (verified). To (re)configure the custom domain:

1. Vercel → your project → **Settings → Domains**.
2. Add `layerflow.dev` and `www.layerflow.dev`.
3. Set `layerflow.dev` as the **primary** domain; redirect `www` → apex.
4. At your domain registrar, follow the DNS records Vercel shows:
   - Apex `layerflow.dev`: the `A` record Vercel gives (currently `216.198.79.65`), or an `ALIAS`/`ANAME` if your registrar supports it.
   - `www`: `CNAME` → the `*.vercel-dns-*.com` target Vercel shows.
5. Wait for Vercel to show **Valid Configuration** and issue the TLS cert.
6. Deploys are automatic on push to `main` (Git integration).

Verify: `curl -I https://layerflow.dev` → `HTTP/2 200`.

---

## 4. DNS for `api.layerflow.dev`

> **Current status: `api.layerflow.dev` does NOT resolve yet.** This is expected
> before the first Fly deploy — you create the record after Fly gives you the app
> hostname (or its A/AAAA IPs).

After `fly deploy` (§7) and `fly ips list`:

1. At your registrar, add a record for the `api` subdomain:
   - **CNAME** `api` → `layerflow-api.fly.dev.` (simplest), **or**
   - **A** `api` → the IPv4 from `fly ips list` **and AAAA** → the IPv6.
2. Tell Fly to manage the cert: `fly certs add api.layerflow.dev`.
3. Check issuance: `fly certs show api.layerflow.dev` (wait for "Ready").

Verify: `dig +short api.layerflow.dev` returns an address, and
`curl https://api.layerflow.dev/health` returns `{"status":"ok",…}`.

---

## 5. Neon (Postgres)

1. Create a Neon project in a US-East region (matches Fly `primary_region = iad`).
2. Enable the `vector` extension is **not** needed manually — migrations create
   what they need; Neon supports pgvector.
3. Copy the **pooled** connection string and append `?sslmode=require`.
4. Put it in `DATABASE_URL` (Fly secret for prod, `apps/api/.env` for local).

**Migrations** run automatically on every Fly deploy via the release command in
`fly.toml`:

```toml
[deploy]
  release_command = "npm run db:migrate --workspace @layerflow/api"
```

To run them by hand (forward-only, non-destructive):

```bash
# in-memory sanity check, no database touched:
npm run db:verify --workspace @layerflow/api

# apply to whatever DATABASE_URL points at:
npm run db:migrate --workspace @layerflow/api
```

> ✅ Migrations `0000` + `0001` + `0002` create **57** public tables on Neon.
> Re-run `npm run db:migrate --workspace @layerflow/api` safely (forward-only),
> or deploy — Fly `release_command` migrates before traffic.

**Do not seed Neon production.** `db:seed` inserts demo user
`alex@layerflow.dev` and sample workspace data. It is local/demo only and
refuses remote `DATABASE_URL`s by default. See `docs/database.md`.

---

## 6. Upstash (Redis)

1. Create an Upstash Redis database (a US region near Neon/Fly).
2. Copy the **`rediss://`** URL (TLS — note the double `s`). BullMQ and ioredis
   both work with it as-is.
3. Put it in `REDIS_URL` (Fly secret for prod).

No manual schema — Redis is used for budgets, rate limits, exact-match cache,
and the BullMQ job queue.

---

## 7. API + worker on Fly.io

The config lives in `fly.toml` (repo root) and `apps/api/Dockerfile`. One image
runs two process groups: `app` (the Hono HTTP API) and `worker` (BullMQ). The
`Dockerfile` builds from the **repo root** because this is an npm-workspaces
monorepo.

### 7.1 First-time app creation

```bash
# from the repo root
fly auth login
fly apps create layerflow-api          # or: fly launch --no-deploy (reuses fly.toml)
```

### 7.2 Set secrets (never commit these)

```bash
fly secrets set \
  DATABASE_URL='postgresql://…?sslmode=require' \
  REDIS_URL='rediss://…' \
  BETTER_AUTH_SECRET='<openssl rand -hex 32>' \
  BETTER_AUTH_URL='https://api.layerflow.dev' \
  GOOGLE_CLIENT_ID='<prod client id>' \
  GOOGLE_CLIENT_SECRET='<rotated prod secret>' \
  PROVIDER_KEYS_KEK='<stable 64-hex>' \
  WEB_URL='https://layerflow.dev' \
  API_URL='https://api.layerflow.dev' \
  CORS_ORIGINS='https://layerflow.dev'
# optional: GROQ_API_KEY, GEMINI_API_KEY, OPENAI_API_KEY, R2_* …
```

### 7.3 Deploy

```bash
fly deploy
```

What happens: Fly builds the image → runs the **release command** (migrations)
on a temporary machine → if that succeeds, rolls out the `app` and `worker`
machines. If migrations fail, the deploy aborts and the old version stays live.

### 7.4 Point DNS + cert

Do §4 now (CNAME `api` → `layerflow-api.fly.dev`, then `fly certs add`).

### 7.5 Scaling notes

- `min_machines_running = 1` keeps the API warm for low-latency streaming.
- Scale out: `fly scale count app=2` / add a region with `fly regions add`.
- Bump size: `fly scale vm shared-cpu-2x --memory 1024`.

---

## 8. Google OAuth origins & callback

In Google Cloud Console → **APIs & Services → Credentials → your OAuth client**:

**Authorized JavaScript origins**
- `http://localhost:3000`, `http://localhost:8787` (local)
- `https://layerflow.dev`, `https://api.layerflow.dev` (prod)

**Authorized redirect URIs**
- `http://localhost:8787/api/auth/callback/google` (local)
- `https://api.layerflow.dev/api/auth/callback/google` (prod)

Better Auth builds the callback from `BETTER_AUTH_URL`, so that must equal
`https://api.layerflow.dev` in prod. Until the app is verified, add each tester's
Google account under **OAuth consent screen → Test users**.

---

## 9. Health checks & verification

| Check | Command | Expected |
|-------|---------|----------|
| Site | `curl -I https://layerflow.dev` | `200` |
| API liveness + deps | `curl https://api.layerflow.dev/health` | `{"status":"ok","checks":{"db":true,"redis":true}}` |
| Fly status | `fly status` | app + worker machines `started`/`passing` |
| Logs | `fly logs` | `LayerFlow API listening…` and `worker started` |
| Auth | open the app → "Continue with Google" | redirects back signed in |

The Fly health check (in `fly.toml`) hits `GET /health` every 15s; a machine that
fails it is not sent traffic.

---

## 10. Rollback

Fly keeps previous releases:

```bash
fly releases                 # list versions
fly deploy --image <older-image-ref>   # or:
fly releases rollback        # revert to the previous release
```

- **Bad migration?** Migrations are forward-only. Do not hand-edit applied
  migrations. Roll the app back to the previous image, then write a **new**
  forward migration that fixes the schema and redeploy. Restore data from a Neon
  branch/backup only if data was lost (see §11).
- **Bad frontend deploy?** Vercel → Deployments → the last good one →
  **Promote to Production** (instant).

---

## 11. Backups

- **Neon**: enable **Point-in-Time Restore** (history retention) in project
  settings. Before any risky migration, create a Neon **branch** (`main` → a
  timestamped branch) — it's a zero-copy instant snapshot you can restore from.
  On-demand logical dump: `pg_dump "$DATABASE_URL" -Fc -f backup.dump` (run from
  a trusted machine; the file contains data — store it securely, never in git).
- **Upstash**: enable daily backups in the database settings. Redis holds only
  derived/cache state; the durable financial truth is the Postgres `usage_ledger`.
- **Secrets**: keep the source of truth in a password manager, not in files.

---

## 12. CI (GitHub Actions)

`.github/workflows/ci.yml` runs on every PR and push to `main`. **No repository
secrets are required** — backend tests use in-memory Postgres (PGlite) and mocked
Redis; the frontend builds from mock data. Steps:

1. `npm ci`
2. Typecheck `@layerflow/contracts`, `@layerflow/model-registry`, `@layerflow/api`
3. `db:verify` (applies all migrations to in-memory Postgres)
4. `npm test` (Vitest — API unit + integration)
5. `npm run build` (Next.js production build)
6. Root `tsc --noEmit`

Keep CI green before deploying. Deploys themselves are manual (`fly deploy` /
Vercel git push) so a human owns the production gate.

---

## 13. Troubleshooting

| Symptom | Likely cause / fix |
|---------|--------------------|
| `/health` shows `db:false` | `DATABASE_URL` wrong or missing `?sslmode=require`; Neon role rotated |
| `/health` shows `redis:false` | `REDIS_URL` not `rediss://` (TLS), or Upstash password rotated |
| Deploy aborts on release step | Migration failed — check `fly logs`; fix migration, redeploy |
| Google login loops / redirect error | `BETTER_AUTH_URL` ≠ `https://api.layerflow.dev`, or callback URI not registered |
| Browser CORS error | `CORS_ORIGINS` must be exactly `https://layerflow.dev` |
| `api.layerflow.dev` won't resolve | DNS record not added yet (§4) or still propagating |
| Local `npm test` connects to a remote DB | Don't put a non-SSL-reachable prod `DATABASE_URL` in `apps/api/.env` while testing; the harness probes host:port. Prefer docker-compose or leave the default. |

---

## Appendix — repeatable command summary

```bash
# validate before deploy (no external services needed)
npm ci
npm run typecheck --workspace @layerflow/api
npm run db:verify --workspace @layerflow/api
npm test --workspace @layerflow/api
npm run build

# deploy API + worker (runs migrations via release_command)
fly deploy

# deploy frontend
git push origin main            # Vercel auto-deploys

# health
curl https://api.layerflow.dev/health
curl -I https://layerflow.dev
```
