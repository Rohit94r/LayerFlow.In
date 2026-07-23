# Backend Runbook

Last verified: July 23, 2026

This is the short founder runbook for getting LayerFlow running locally with
the current backend setup. Primary path: use the existing Neon Postgres +
Upstash Redis credentials in `apps/api/.env`. Docker is optional.

> Rotate the secrets in `apps/api/.env`. They were previously exposed in chat.

## What was verified

Using the existing `apps/api/.env` values:

- `npm run db:migrate --workspace @layerflow/api` completed successfully
- `npm run db:verify --workspace @layerflow/api` completed successfully
- `GET http://127.0.0.1:8787/health/live` returned `200`
- `GET http://127.0.0.1:8787/health` returned `200` with `db:true` and `redis:true`
- `npm run smoke --workspace @layerflow/api` passed
- `GET http://127.0.0.1:8787/api/auth/get-session` returned `200` (`null` when signed out)
- `GET http://127.0.0.1:3000/api/lf-health` returned `200` and correctly proxied to `http://localhost:8787`
- `GET http://127.0.0.1:3000/sign-in` returned `200`
- `npm run worker --workspace @layerflow/api` started and registered repeatable jobs

## Connected vs not connected

| Area | Status | Notes |
|---|---|---|
| Neon Postgres (`DATABASE_URL`) | Connected | Migrations and live health checks passed |
| Upstash Redis (`REDIS_URL`) | Connected | `/health` and worker startup passed |
| Local API (`localhost:8787`) | Connected | Live and dependency health checks passed |
| Local web (`localhost:3000`) | Connected | Sign-in page and same-origin health proxy passed |
| Better Auth base wiring | Connected | Session endpoint responds; local URLs are consistent |
| Google OAuth keys | Configured | Present in env; full browser sign-in was not exercised in this verification pass |
| Worker / compare queue | Connected when worker is running | Compare jobs need a separate worker process |
| Groq platform fallback | Connected | Key present in env |
| Gemini platform fallback | Connected | Key present in env |
| Resend email | Partially connected | `RESEND_API_KEY` is present; add `FROM_EMAIL` for a real sender identity |
| Sentry | Connected | DSN present; API and worker initialized Sentry |
| OpenAI platform key | Not connected | `OPENAI_API_KEY` is not set; semantic search falls back to local hash embeddings |
| Anthropic platform fallback | Not connected | No env-based platform fallback is wired today; Anthropic works via BYOK provider keys instead |
| Stripe | Not connected | Billing env remains optional and checkout is not wired |
| Cloudflare R2 | Not connected | Without `R2_*`, files stay on local disk |
| ElevenLabs audio | Connected | Env keys are present, but audio endpoints were not exercised in this pass |

## Daily commands

Run these from the repo root:

```bash
# one-time / after pulling
npm install
npm run db:migrate --workspace @layerflow/api

# terminal 1: API
npm run dev:api

# terminal 2: web
npm run dev:web

# terminal 3: worker (required for Compare and scheduled jobs)
npm run dev:worker
```

If you prefer one command for web + API together:

```bash
npm run dev
npm run dev:worker
```

Useful checks:

```bash
curl http://127.0.0.1:8787/health/live
curl http://127.0.0.1:8787/health
curl http://127.0.0.1:3000/api/lf-health
npm run smoke --workspace @layerflow/api
```

## Local URL rules

Use these local values:

- `WEB_URL=http://localhost:3000`
- `API_URL=http://localhost:8787`
- `BETTER_AUTH_URL=http://localhost:8787`
- `CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000`
- `.env.local` -> `NEXT_PUBLIC_API_URL=http://localhost:8787`

This matches the current code path:

- browser calls the Next app on `localhost:3000`
- Next proxies health checks through `/api/lf-health`
- auth and API requests target `localhost:8787`

## Feature notes from the current MVP

- Compare requires `npm run dev:worker`; otherwise compare jobs will sit queued.
- Search and memory still work without `OPENAI_API_KEY`, but semantic quality is lower because the API falls back to local deterministic embeddings.
- Files work locally without R2; they are stored on disk under the API app.
- Gateway runs can use workspace BYOK keys even when a platform fallback key is missing.
- Budget alerts and weekly digests are only fully production-ready once `FROM_EMAIL` is set alongside `RESEND_API_KEY`.

## Docker status

Docker is not installed on this machine. That does not block local backend work
because Neon + Upstash already work.

If you want local Docker later:

```bash
brew install --cask docker
open /Applications/Docker.app
```

After Docker Desktop finishes starting, you can optionally use:

```bash
docker compose up -d
```

Then swap `DATABASE_URL` and `REDIS_URL` to the local docker-compose values
from `apps/api/.env.example`.
