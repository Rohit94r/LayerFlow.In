# Backend status

Last updated: July 2026. Companion to `apps/api/README.md` (how to run it)
and `docs/learning-guide.md` Part 5 (how it works).

## What's built and working

All of this typechecks, passes tests, and runs locally:

- **Foundation** — Hono API (`apps/api`), 56-table Drizzle schema with
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

Verification (all green as of this writing): `npm run typecheck` in
`apps/api`, `packages/contracts`, `packages/model-registry`; `npm run
db:verify`; `npm test` (67 passed, 2 skipped — the skips are Redis-only
checks that need Docker); `npx tsc --noEmit` at the repo root.

## How to run it

Full steps in `apps/api/README.md`. Short version, from the repo root:

```bash
npm install
docker compose up -d                          # Postgres + Redis
cp apps/api/.env.example apps/api/.env        # then fill in secrets (see README)
npm run db:migrate --workspace @layerflow/api
npm run db:seed    --workspace @layerflow/api
npm run dev        --workspace @layerflow/api # API on :8787
npm run worker     --workspace @layerflow/api # in a second terminal
npm run smoke      --workspace @layerflow/api # checks /health
```

## What's stubbed / not production-grade yet

| Item | Current state | Where |
|---|---|---|
| Cloudflare R2 file storage | Local disk when R2_* unset; when set, S3-compatible presigned PUT/GET via `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`. | `apps/api/src/routes/files/files.ts`, `src/services/files/storage.ts` |
| True token streaming | `/api/runs/stream` still uses the non-stream execute path, then emits progressive SSE `delta` chunks (stable event shape). Gateway `stream: true` pipes live SSE from OpenAI-compatible providers only (not Anthropic) and settles budget at the estimate. | `src/routes/runs/runs.ts`, `src/gateway/providers.ts` |
| Embeddings without a key | With no `OPENAI_API_KEY`, search uses a local deterministic embedding fallback — works, lower quality. | `src/search/embeddings.ts` |
| Docker on the build machine | Docker wasn't installed where this was built, so integration tests ran on in-memory Postgres (PGlite) and the two Redis-only test cases skip. Run `docker compose up -d` locally to exercise everything. | `src/test/` |
| Usage rollup / budget alert jobs | Job names are reserved in the queue (`usage-rollup`, `budget-alerts`) but rollups are written synchronously at settle time instead; no scheduled processor yet. | `src/jobs/queues.ts` |
| Stripe, Resend, Sentry | Env vars exist and are optional; nothing is wired. | `src/config/env.ts` |

## Next steps: connecting the frontend

The frontend still renders `lib/mock-data.ts`. The bridge is a typed API
client — **not built yet**, deliberately:

1. Create `lib/api-client.ts` in the frontend: a small `fetch` wrapper that
   reads the API base URL from `NEXT_PUBLIC_API_URL`, sends
   `credentials: "include"` (so the Better Auth session cookie flows), parses
   errors of the shape `{ error: { code, message } }`, and validates
   responses with the zod schemas from `@layerflow/contracts`.
2. Add Better Auth's client (`createAuthClient`) for
   `signIn.social({ provider: "google" })` and session state, pointed at
   `http://localhost:8787`.
3. Replace mock imports screen by screen, in this order: workspace lists
   (domains/projects/prompts) → prompt detail + versions → runs in the
   editor → budgets page → compare → gateway/keys settings.
4. Handle two error codes globally: `401` (send to sign-in) and
   `402 budget_exceeded` (show the budget-blocked state the UI already has).

The endpoint map in `apps/api/README.md` lists every route the client needs.
