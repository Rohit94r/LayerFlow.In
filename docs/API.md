# LayerFlow API Reference

The API is a Hono app in `apps/api`. In production it runs either **same-origin**
behind the Next.js app (Mode A, current setup on Vercel) or as a **standalone API
host** (Mode B, Fly.io / Render / Railway). See `docs/DEPLOYMENT.md` §2 for the two
modes. All paths below are relative to the API host:

- **Mode A:** `https://layerflow.dev`
- **Mode B:** `https://api.layerflow.dev` (or your host)

## Conventions

- **Auth** is cookie-based Better Auth sessions under `/api/auth/*`. Most `/api/*`
  feature routes require a valid session (`requireAuth`) and resolve
  `userId` + `workspaceId` from the session.
- **Workspace selection:** optional `X-LF-Workspace: <workspaceId>` header. When
  omitted, the caller's default (oldest) workspace membership is used. Foreign or
  unknown IDs are ignored.
- **Gateway API keys:** `/v1/*` routes use `Authorization: Bearer lf_live_…`
  (see [API keys](#api-keys)). Keys are stored HMAC-SHA256-hashed, never in plaintext.
- **Bodies:** JSON bodies capped at 1 MB; file-content uploads capped at 25 MB.
  Requests that exceed a cap return `413`.
- **Rate limits:** authenticated `/api/*` routes have a 600 req/min per-user
  ceiling; auth credential POSTs are throttled per-IP at 20 req/min; spend-heavy
  routes have stricter limits. Exceeding a limit returns `429` with `Retry-After`.
- **Timeouts:** requests over 120 s return `504`.

## Errors

Every error is JSON in one shape:

```json
{ "error": { "code": "…", "message": "…" } }
```

| HTTP | code |
|---|---|
| 400 | `validation_error` |
| 401 | `unauthorized` |
| 404 | `not_found` |
| 413 | `payload_too_large` |
| 429 | `rate_limited` |
| 500 | `internal_error` |

Every response carries `x-request-id`, echoed in logs for correlation.

## Health

| Method | Path | Purpose |
|---|---|---|
| GET | `/health/live` | Liveness — process is up (no dependency checks). |
| GET | `/health/ready` | Readiness — checks DB + Redis, returns 503 when degraded. |
| GET | `/health` | Back-compat combined check (used by `scripts/check-production.sh`). |
| GET | `/` | Banner with service name, web URL, and health links. |

## Auth (Better Auth)

All under `/api/auth/*` (Google OAuth, session, user). Handled by
`better-auth`; see `apps/api/src/auth/`. Callback URL:
`https://<api-host>/api/auth/callback/google`.

## Workspace & org structure

| Method | Path | Notes |
|---|---|---|
| /api/workspaces | `GET`/`POST` | List / create workspaces. |
| /api/domains, /api/projects, /api/folders | | Workspace-scoped hierarchy. |
| /api/team | | Members, invitations, roles (`owner`/`admin`/`member`). |
| /api/activity | | Workspace activity feed. |

## Chat

| Method | Path | Notes |
|---|---|---|
| POST | `/api/chat` | Create chat + first message. |
| POST | `/api/chat/:id/messages` | Send a message. **SSE streaming** response. |
| GET/PATCH/DELETE | `/api/chat/:id` | Read, rename, delete. |
| POST | `/api/chat/:id/memory` | Save a chat as a memory. |
| PATCH | `/api/chat/:id/model` | Switch model; provider failover is automatic. |

`/api/sessions` and `/api/runs` back the session/run views. `/api/improve` and
`/api/compare` are chat-assist features.

## Terminal sync protocol

Session-authenticated dashboard endpoints plus the CLI device protocol:

| Method | Path | Notes |
|---|---|---|
| POST | `/api/v1/sync/handshake` | `{ device_id, last_watermark }` → `{ server_watermark, ops }`. |
| POST | `/api/v1/sync/push` | `{ ops: [...] }` → `{ accepted, rejected }`; idempotent per `op_id`. |
| POST | `/api/v1/sync/pull` | `{ since }` → `{ ops }` (max 500 ops). |
| GET | `/api/v1/sync/operations` | Recent synced operations (dashboard). |
| GET | `/api/v1/sync/devices` | Registered CLI devices (dashboard). |

Entities: `session | message | memory | project`. Ops are bounded: 100 KB
payload, 200 ops/batch. CLI auth: `X-LF-Device` + signed token (see
`apps/api/src/middleware/auth-sync.ts`). See `docs/lf-terminal.md`.

## Memory, search, learning

| Method | Path | Notes |
|---|---|---|
| /api/memory | CRUD | Memory entries; `POST /search` does semantic + keyword search. |
| /api/search | | Global keyword + pgvector semantic search. |
| /api/similar | | Similar-embedding lookups. |
| /api/learning | | Implicit-learning feedback. |

## Models, keys & routing

| Method | Path | Notes |
|---|---|---|
| /api/provider-keys | CRUD | BYOK provider keys; **encrypted at rest** with AES-256-GCM. |
| /api/keys | CRUD | LayerFlow gateway API keys (`lf_live_…`, hashed at rest). |
| /api/intelligence | | Managed model switching. |
| /api/routing-rules, /api/workspace/settings | | Route rules + workspace model settings. |

## Gateway (`/v1`, OpenAI-compatible subset)

| Method | Path | Notes |
|---|---|---|
| POST | `/v1/chat/completions` | Bearer API key. Model selection, failover, usage metering, cost estimation. |

Response is OpenAI-shaped (`choices`, `usage`); cost is computed via
`@layerflow/model-registry`.

## Agents

| Method | Path | Notes |
|---|---|---|
| /api/agents | CRUD | Agent definitions. |
| /api/runs | | Agent run lifecycle (approvals, schedule). |
| /api/notifications | | Run/completion notifications. |

## Billing & budgets

| Method | Path | Notes |
|---|---|---|
| POST | `/api/billing/webhook` | **Dodo Payments** webhook (signed via `webhook-id` / `webhook-signature` / `webhook-timestamp`; no session). |
| /api/billing | | Plans, checkout, subscription state. |
| /api/budgets, /api/usage, /api/savings | | Spend caps, usage metering, savings. |

## Community, files, misc

`/api/collections`, `/api/profiles`, `/api/follows`, `/api/likes`,
`/api/comments` (shared prompt/agent marketplace), `/api/files` (25 MB
uploads), `/api/audio`, `/api/rescue`, `/api/compare`, `/api/admin`.

## Web ↔ CLI conventions

- Web auth: cookie session (works in browser).
- CLI / automation: `Authorization: Bearer lf_live_…`.
- Sync devices identify with `X-LF-Device: <device_id>`.
