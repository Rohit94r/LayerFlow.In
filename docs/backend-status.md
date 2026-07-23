# Backend status

Last updated: July 2026. Companion to `apps/api/README.md` (how to run it),
`docs/getting-started.md` (how to use the product end to end), and
`docs/learning-guide.md` Part 5 (how it works).

## What's built and working

All of this typechecks, passes tests, and runs locally:

- **Foundation** — Hono API (`apps/api`), 57-table Drizzle schema with
  migrations, Better Auth with Google-only sign-in, first-login onboarding
  (workspace + 9 domains + budget), `docker-compose.yml` for Postgres
  (pgvector) + Redis, shared zod contracts (`packages/contracts`), model
  catalog + pricing (`packages/model-registry`), BullMQ worker.
- **Workspace** — domains, projects, folders, prompts with immutable
  versions + restore, sessions with messages, activity feed, file uploads
  (local disk or R2 presigned URLs when configured).
- **Runs & Compare** — real provider calls through shared adapters
  (OpenAI, Anthropic, Google, DeepSeek, Groq, xAI, OpenRouter), run history
  with tokens/cost/latency, SSE run endpoint, multi-model compare as a
  background job with ranking.
- **Model Intelligence** — analyze / recommend / route endpoints, workspace
  routing mode (manual / suggest / auto), custom routing rules.
- **Budgets & Gateway** — atomic Redis reserve → settle → release with
  hard blocking (402 before the provider is called), usage ledger + rollups
  + alerts, per-project and per-key scopes, LayerFlow API keys, BYOK
  provider keys (AES-256-GCM), OpenAI-compatible `/v1/chat/completions` +
  `/v1/models` with exact-match response cache.
- **Memory / Search / Learning / Community** — workspace memories with
  semantic search (pgvector), keyword search, similar prompts, learning
  paths/lessons/challenges (seeded), collections, profiles, follows, likes,
  comments, prompt cloning, notifications.
- **True token streaming** — `/api/runs/stream` and gateway
  `POST /v1/chat/completions` with `stream: true` stream live tokens from all
  OpenAI-compatible providers and Anthropic; budget settles on the actual
  usage reported in the stream. Google (native API) falls back to progressive
  chunking of the completed output.
- **Background jobs + email** — worker registers repeatable jobs:
  `usage-rollup` (hourly ledger → rollups + Redis reconciliation),
  `budget-alerts` (80%/100% owner emails), `weekly-digest` (Monday usage
  summary). Resend-backed email service (`RESEND_API_KEY`, `FROM_EMAIL`) that
  no-ops safely when unconfigured; DB-backed dedupe in `email_events`
  (migration 0002). CLI: `npm run usage:rollup`, `npm run usage:reconcile`.
- **Observability & hardening** — optional Sentry (`@sentry/node`, 0.1 prod
  trace sampling, aggressive redaction of headers/bodies/credentials),
  secure headers + HSTS, body-size limits, 120 s request deadlines,
  `/health/live` + `/health/ready`, graceful shutdown, production cookie
  config for layerflow.dev ↔ api.layerflow.dev (Secure/HttpOnly/Lax,
  `.layerflow.dev` domain), platform Groq/Gemini key fallback with BYOK
  priority, optional ElevenLabs TTS behind `POST /api/audio/speech`
  (budget + rate limited; 503 when unconfigured).

Verification (all green as of this writing): `npm run typecheck` in
`apps/api`, `packages/contracts`, `packages/model-registry`; `npm run
db:verify` (3 migrations, 57 tables); `npm test` (17 files, 98 passed —
Redis-only checks skip without Docker); `npx tsc --noEmit` at the repo root.
Migration `0002` (email_events) has been applied to the Neon database.

## How to run it

Full steps in `apps/api/README.md`. Short version, from the repo root:

```bash
npm install
cp apps/api/.env.example apps/api/.env        # DATABASE_URL → Neon or local Docker
cp .env.example .env.local
# docker compose up -d                        # optional local Postgres + Redis
npm run db:migrate --workspace @layerflow/api
npm run dev                                   # web + API
npm run worker --workspace @layerflow/api     # optional (Compare / digests)
# npm run db:seed --workspace @layerflow/api  # LOCAL/DEMO ONLY — never on Neon prod
```

Full command list: `docs/database.md`.

## Frontend connection status

The Next.js app is wired to the Hono API (no longer mock-driven for core
workspace flows):

| Piece | Status |
|---|---|
| Typed client (`lib/api/`) | Done — `credentials: "include"`, zod validation via `@layerflow/contracts`, `ApiClientError` for 401/402 |
| Better Auth client + `/sign-in` | Done — Google-only; `AuthGuard` protects `app/(app)/*` and returns to `?next=` |
| Workspace / projects / prompts / sessions | Done — list/create + prompt save version / restore / run |
| Compare polling | Done — `POST /api/compare` + poll `GET /api/compare/:jobId` |
| Budget + settings + routing rules | Done — update limits, prefer-cheap, execution mode, rule toggles |
| Gateway + LayerFlow keys + BYOK | Done — create key (secret once), provider key add/delete, gateway snippets |
| Theme | Done — deterministic `lf-theme` light/dark with system default only when unset |
| Docs workflow | Updated — sign-in → project/prompt → BYOK → suggest → run/compare → budget → gateway key |

Frontend env: copy `.env.example` → `.env.local` and set
`NEXT_PUBLIC_API_URL` (`http://localhost:8787` locally,
`https://api.layerflow.dev` in production).

### Remaining gaps / notes for the integration agent

- **Cross-subdomain cookies** — production needs Better Auth cookie `domain=.layerflow.dev` (or equivalent) so `layerflow.dev` can call `api.layerflow.dev` with the session. Confirm API `BETTER_AUTH_URL`, `WEB_URL`, `CORS_ORIGINS`, and Google OAuth redirect URIs.
- **Budget scopes UI** — reads per-project / per-key scopes; full replace via `PUT /api/budgets/scopes` is not exposed as a dedicated editor yet.
- **Routing rule create/delete** — toggle works; creating new rules from the UI is not built (API supports POST/DELETE).
- **Session message append** — session detail reads messages; “continue session” composer is not wired to `POST /api/sessions/:id/messages`.
- **Prompt variables** — types exist; create/edit UI does not yet persist `variables` on create.
- **Files / Memory / Learning / Community** — API exists; no dedicated frontend screens yet.
- **`lib/mock-data.ts`** — still in repo for reference / demos; app routes no longer import it for live data.
- **Worker required for compare** — UI will time out if `npm run worker` is not running.

## What's stubbed / not production-grade yet

| Item | Current state | Where |
|---|---|---|
| Cloudflare R2 file storage | Local disk when R2_* unset; when set, S3-compatible presigned PUT/GET via `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`. | `apps/api/src/routes/files/files.ts`, `src/services/files/storage.ts` |
| Google streaming | Google runs use the native `generateContent` API (no streaming adapter); `/api/runs/stream` falls back to progressive chunking for Gemini models. All other providers stream real tokens. | `src/providers/google.ts` |
| Embeddings without a key | With no `OPENAI_API_KEY`, search uses a local deterministic embedding fallback — works, lower quality. | `src/search/embeddings.ts` |
| Docker on the build machine | Docker wasn't installed where this was built, so integration tests ran on in-memory Postgres (PGlite) and the Redis-only test cases skip. Run `docker compose up -d` locally to exercise everything. Tests deliberately refuse to use non-local DATABASE_URL/REDIS_URL. | `src/test/` |
| Stripe | Env vars exist and are optional; payments are not wired (pricing page ships without checkout). | `src/config/env.ts` |
| Savings insights | `GET /api/savings` computes an illustrative estimate when no insight rows exist. | `src/services/budgets/usage.ts` |
