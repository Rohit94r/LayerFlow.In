# LayerFlow — Production Go (Phase 2 runbook)

Everything the Phase-2 "make production actually work" steps need, in order.
You run these from your laptop — they need your Fly/Vercel/registrar access
(I can't authenticate for you). Each step says what "done" looks like.

**Holy rule:** never run `flyctl deploy` / `vercel` / Vercel env edits without
`npm run preflight:prod` green first. The preflight checks, without printing
any secret: required keys, the same-origin auth URLs, and that `.vercel.env` and
`fly.env` still agree byte-for-byte (that's what makes sessions + BYOK
decryption work on both hosts).

---

## Run order

```
0. flyctl auth login
1. npm run preflight:prod          → all ✓, no ✗
2. npm run deploy:api              → app + worker live on Fly
3. DNS: CNAME api → layerflow-api.fly.dev, then flyctl certs add
4. npm run check:prod              → every section green
5. Vercel env + redeploy + Google OAuth redirect
6. Prove the core path in prod
7. Wire uptime monitors
```

---

## Step 0 — Authenticate Fly (one-time)

```bash
flyctl auth login        # opens browser; needed by the deploy script
```

## Step 1 — Preflight

```bash
npm run preflight:prod
```

All items ✓, no ✗. (The 3–4 one-sided "⚠ present only in …" warnings are fine:
`NEXT_PUBLIC_API_URL` is web-only; `COOKIE_DOMAIN` / `DODO_PAYMENTS_ENVIRONMENT`
/ `FROM_EMAIL` aren't in `.vercel.env` yet.)

## Step 2 — Deploy API + worker to Fly

```bash
npm run deploy:api
# no local Docker installed? use the remote builder instead:
REMOTE_BUILD=1 npm run deploy:api
```

What the script does: creates app `layerflow-api` if needed → runs preflight →
sets required + optional secrets from `.vercel.env` → `flyctl deploy` (Docker
build, DB migrations as release command) → ensures `app=1 worker=1`.

**Done when:**
```bash
curl -s https://layerflow-api.fly.dev/health          # {"status":"ok",...}
curl -s https://layerflow-api.fly.dev:9091/health     # {"status":"ok",...} (worker)
curl -s https://layerflow-api.fly.dev/health/live     # 200
```

## Step 3 — DNS + TLS for api.layerflow.dev

1. Registrar → DNS → add **CNAME**: **Name** `api`, **Target** `layerflow-api.fly.dev`.
2. Then:
   ```bash
   flyctl certs add api.layerflow.dev --app layerflow-api
   flyctl certs show api.layerflow.dev --app layerflow-api   # until "Issued"
   ```
3. `dig +short api.layerflow.dev` returns the Fly address.

**Done when:** `curl https://api.layerflow.dev/health` returns `{"status":"ok"}`.

## Step 4 — Full production check

```bash
npm run check:prod
```

Every section green: `layerflow.dev` site, DNS, Fly API health, `api.layerflow.dev`
health, worker `:9091`, and the same-origin `lf-health`.

## Step 5 — Vercel env + OAuth (web + auth same-origin)

Vercel → LayerFlow project → Settings → Environment Variables (Production):

- `NEXT_PUBLIC_API_URL=https://layerflow.dev` — **not** `api.layerflow.dev`
- `BETTER_AUTH_URL=https://layerflow.dev`, `WEB_URL=https://layerflow.dev`,
  `API_URL=https://layerflow.dev`
- `DATABASE_URL`, `REDIS_URL`, `BETTER_AUTH_SECRET`, `PROVIDER_KEYS_KEK` —
  **identical** to Fly (the preflight keeps them in sync)
- `CORS_ORIGINS=https://layerflow.dev`

Redeploy Vercel (env changes apply only to new deploys). Then in Google Cloud
Console → OAuth credential
(`928766099149-…apps.googleusercontent.com`) → Authorized redirect URIs:

```
https://layerflow.dev/api/auth/callback/google
```

(exact — no trailing slash, no `api.` prefix).

**Done when:** `curl https://layerflow.dev/api/auth-config` shows
`"authBaseUrl":"https://layerflow.dev"` and the Google redirect above.

## Step 6 — Prove the core path in prod

1. Sign in at `layerflow.dev` (Google).
2. Dashboard → API keys → mint a key (`lf_live_…`).
3. Gateway request:
   ```bash
   curl https://api.layerflow.dev/v1/models -H "Authorization: Bearer lf_live_..."
   curl https://api.layerflow.dev/v1/chat/completions \
     -H "Authorization: Bearer lf_live_..." -H "Content-Type: application/json" \
     -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"hi"}]}'
   ```
4. Dashboard shows the usage + cost for that request.
5. Set a $1 budget cap → burn past it → the **next** request is blocked.

Terminal:
```bash
cd terminal && go build ./... && ./lf
./lf login            # paste platform key (or --browser for device flow)
./lf chat "hello"     # streams via the gateway
./lf cost             # cap + progress + plan
```

## Step 7 — Uptime monitors (free tier)

### UptimeRobot (5 monitors) — https://uptimerobot.com

| # | Friendly name | URL | Keyword / code |
|---|---|---|---|
| 1 | Frontend | `https://layerflow.dev/sign-in` | 200 |
| 2 | API health | `https://api.layerflow.dev/health` | contains `"ok"` |
| 3 | API liveness | `https://api.layerflow.dev/health/live` | 200 |
| 4 | Worker | `https://layerflow-api.fly.dev:9091/health` | contains `"ok"` |
| 5 | Same-origin check | `https://layerflow.dev/api/lf-health` | contains `"ok"` |

### Healthchecks.io (crash watchdog) — https://healthchecks.io

- API worker job: a **cron** on the worker pings a Healthchecks URL; if the
  rollup/alert jobs stop, you get pinged. Simpler alternative for the exact
  same protection: monitor #4 above and set UptimeRobot alerts to email + push.

Alert emails go to your address; add Slack/Discord pushes later (Phase 3 alerts
are a *product* feature, these are *infrastructure*).

---

## If something fails mid-run

- **Deploy fails at image build** → rerun with `REMOTE_BUILD=1` (no local Docker).
- **Machines crash-loop** → `flyctl logs -a layerflow-api`; check the release
  command (migrations) output first.
- **Preflight ✗** → fix secrets, re-run preflight, never deploy over a ✗.
- **Auth broken after deploy** → run preflight; the #1 cause is `BETTER_AUTH_URL`
  vs `WEB_URL` mismatch or a secret that isn't byte-identical on both hosts.
- **Full rollback** → `flyctl rollback -a layerflow-api`; for the web, deploy the
  previous Vercel deploy.

Deployment details, env matrix, rollback, and failure testing: `docs/DEPLOYMENT.md`.