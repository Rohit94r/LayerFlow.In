# LayerFlow Security

This document describes the security model, secrets handling, and the incident
checklist. Operational setup (which host to use, SSL, backup policy) is in
`docs/DEPLOYMENT.md`.

## Model

- **Authentication** is Google OAuth via Better Auth (`/api/auth/*`). Sessions
  are httpOnly cookies; the frontend never stores a raw session token.
- **Authorization** is workspace-scoped. Every authenticated request resolves
  `userId` + active `workspaceId`. Callers may select a workspace with
  `X-LF-Workspace`; membership is verified server-side, foreign IDs are ignored.
- **Machine access** uses LayerFlow API keys (`lf_live_…`) via
  `Authorization: Bearer`. Keys are stored as HMAC-SHA256 hashes — the raw key
  is shown once at creation and never stored.

## Secrets

| Secret | Handling |
|---|---|
| `PROVIDER_KEYS_KEK` | 64-hex-char key encrypting all BYOK provider keys (AES-256-GCM). **Back it up**: rotation makes existing BYOK keys undecryptable. |
| Provider keys (BYOK) | AES-256-GCM at rest, `iv \|\| authTag \|\| ciphertext` base64. Fresh IV per write. |
| `BETTER_AUTH_SECRET` | Signing secret for sessions. Generate with `openssl rand -hex 32`. |
| API keys | HMAC-SHA256 hash of the key, constant-time comparison (`timingSafeEqual`). |
| Dodo webhook | Verified with `webhook-id` + `webhook-signature` + `webhook-timestamp` headers using `DODO_PAYMENTS_WEBHOOK_KEY`. |

**Never commit `.env`, `.vercel.env`, or any secret.** A leaked key is a
security incident — rotate it, then follow the checklist below.

## Transport & headers

- Production responses include HSTS (`max-age=31536000; includeSubDomains`),
  `X-Frame-Options: DENY`, and cross-origin policy headers
  (`apps/api/src/app.ts`).
- CORS allows only trusted origins (`WEB_URL` + localhost/private LAN in dev).
  Non-matching origins are rejected with no CORS headers.
- Requests have a hard 120 s deadline and body limits (1 MB JSON, 25 MB files).

## Rate limiting

- Auth credential POSTs: 20 req/min per IP (`auth-rate-limit`).
- Authenticated `/api/*`: 600 req/min per user default backstop (`auth.ts`).
- Spend-heavy routes (gateway, budgets, provider-keys): stricter per-route
  limits. Rate limits fail **open**; budgets fail **closed** (never spend past
  a cap without a decision).

## Data integrity & reconciliation

- Usage counters are Redis-backed (fast path) with a Postgres reconciliation
  pass, so a Redis loss cannot silently zero billable usage.
- Webhook processing is idempotent — duplicate deliveries do not double-bill.

## Dependency / supply-chain

- `npm ci` in CI (no package-lock drift). Go module sums verified via `go.sum`.
- Dependencies are pinned in `package-lock.json` / `go.mod` / `go.sum`.

## Incident checklist

1. **Assume compromise.** Treat the leaked secret as public.
2. **Rotate immediately:** regenerate the affected value (`openssl rand -hex 32`
   for hex secrets), update the host (Vercel / Fly / Render / Railway), redeploy.
   For provider keys this means users re-enter their keys (KEK rotation is a
   last resort).
3. **Scan git history** for the leaked value and scrub or rotate anything found.
4. **Rotate the Dodo webhook secret** and update the Dodo dashboard.
5. Verify `/health/ready` shows `ok` and the smoke script passes
   (`npm run check:prod`).
6. Post-mortem into `docs/` and add a regression test if a code path was to blame.

## Reporting

Report suspected vulnerabilities privately to the maintainers via GitHub
issues (disable public disclosure until triaged).
