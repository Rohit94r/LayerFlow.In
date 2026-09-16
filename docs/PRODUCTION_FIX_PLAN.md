# LayerFlow Production Fix Plan

Source: docs/FULL_PRODUCTION_AUDIT.md (2026-09-16, commit 9a0ef66). Implement in phase order. Every fix: root cause → smallest change → regression test → run affected tests → update audit status.

## PHASE 1 — Critical

### FIX-C1 · WebSocket auth bypass + cross-tenant broadcast leak (P0)
- problem: `setupWsServer` in `apps/api/src/routes/ws/ws.ts:185-221` upgrades any connection without validating a JWT/session; `userId`/`workspaceId` are taken from unvalidated query params; agent-run broadcasts are relayed without per-workspace filtering.
- root cause: no server-side session validation at upgrade; no workspace key on socket identity; `broadcastEvent` fans out globally.
- files: `apps/api/src/routes/ws/ws.ts`
- fix: (1) require `Authorization`/session cookie at upgrade and resolve `{userId, workspaceId}` from the session (explicit opt-out only for dev when explicitly allowed); reject with 401 otherwise. (2) key subscriptions by `workspaceId` and have `broadcastEvent(workspaceId, ...)` only deliver to sockets subscribed to that workspace; keep scoped event filtering on publish/send paths.
- test: unit/integration — connection without token rejected; connection with token A cannot receive broadcasts addressed to workspace B (assert empty delivery); agent control events reach subscribers of the owning workspace only.
- acceptance: any unauth WS attempt fails; two workspace sockets isolated; existing web terminal + agent UI still receive events.

## PHASE 2 — Core Product

### FIX-CP1 · Builder GET workspace guard (P1)
- problem: `GET /api/agents/builder/:sessionId` returns session state without verifying the session belongs to the caller’s workspace.
- root cause: missing `workspaceId` ownership check in `apps/api/src/routes/agents/builder.ts:47-61` (POST + step have it).
- files: `apps/api/src/routes/agents/builder.ts`
- fix: add `and(eq(session.workspaceId, workspaceId))` to the GET lookup; 404 on mismatch.
- test: API test asserts cross-workspace GET → 404, same-workspace GET → 200.
- acceptance: builder state is workspace-scoped like the rest of the surface.

### FIX-CP2 · Chat abort short-circuits failover chain (P1)
- problem: on client abort mid-stream, the failover loop in `apps/api/src/services/chat/router.ts:389-497` keeps iterating providers and can persist + settle the last (unwanted) result — charging users for output they never saw.
- root cause: the per-candidate `catch` doesn’t distinguish `AbortError`/`signal.aborted`; no chain-level check after each candidate.
- files: `apps/api/src/services/chat/router.ts`
- fix: check `input.signal?.aborted` first in the loop; on abort, break the chain, mark the assistant message canceled/aborted, release the reservation — do not settle or persist a provider result, do not emit the switch notice.
- test: unit test with a fake adapter that rejects with aborted error after first delta → assert single provider attempt, message status canceled, reservation released, no settle call.
- acceptance: stop/abort never triggers a hidden provider call or charge; web + terminal stop buttons behave correctly.

## PHASE 3 — Reliability

### FIX-R1 · Generic agent run cost/tokens actuals (P1)
- problem: `jobs/processors/agent.ts:749-751` writes `costMicro: 0`, `tokensIn: 0`, `tokensOut: 0` for generic agent runs.
- root cause: `executeRun` already returns real values on `run` (`services/runs/execute.ts:346-358`) but the processor ignores them.
- files: `apps/api/src/jobs/processors/agent.ts`
- fix: accumulate `executed.inputTokens`/`outputTokens`/`costMicro` across loop iterations and persist into `agentRuns`; keep job-applying path unchanged.
- test: processor unit test with injected adapter + in-memory DB asserts run row has nonzero tokens/cost after success.
- acceptance: usage dashboard + `lf cost` reflect actual spend for generic agents.

## PHASE 4 — Security

### FIX-S1 · Wire agent tool permission gate (P1)
- problem: `checkToolPermission` (`apps/api/src/services/agents/permissions.ts`) has zero call sites; tool loop at `agent.ts:700-727` executes tools without approval.
- root cause: gate designed but never connected.
- files: `apps/api/src/jobs/processors/agent.ts`, `apps/api/src/services/agents/permissions.ts`
- fix: call `checkToolPermission(agentId, workspaceId, tool)` before `executeTool`; when `requiresApproval && !allowed`, record a pending `agentApprovals` row (targetType=tool) and stop the run awaiting approval instead of executing. Defaults from the catalog (read allow; write/shell deny) apply when no permission rows exist.
- test: processor test asserts a write/shell call without permission rows is not executed and produces a pending approval step.
- acceptance: no tool executes without policy allowing it; read-only default still completes runs.

### FIX-S2 · Shell tool hardening (P1)
- problem: shell tool blacklist is bypassable via `$()`, backticks, `env -i`, etc; combine with FIX-S1 so default-deny governs.
- files: `apps/api/src/services/agents/tools/shell.ts`
- fix: (a) apply FIX-S1 default-deny so shell runs only when explicitly allowed; (b) strengthen blocklist (nested command substitution, `env`), (c) add output size + exec timeout caps.
- status: **RESOLVED** — `tools.ts` `DANGEROUS_COMMANDS` hardened (`$()`, backticks, `bash|sh|zsh|csh|fish -c`, `env -i`); `blockedCommands` includes bash/zsh/csh/fish/env; permission gate wired (FIX-S1).
- test: add unit cases for bypass payloads; assert each is blocked.
- acceptance: prompt-injected shell attempts cannot execute unless permission row explicitly grants shell.

### FIX-S3 · Redis fail-closed policy (P1)
- problem: rate limiter + budget reservation fail-open when Redis is down.
- files: `apps/api/src/cache/rate-limit.ts`, `apps/api/src/services/runs/budget-hook.ts`
- fix: configurable `REDIS_DOWN_MODE=allow|deny` (default `deny` for limiter; budget reservations deny/block when unresolvable) with loud logging; document the env knob.
- status: **RESOLVED** — `REDIS_DOWN_MODE` in `env.ts` + `getRedisDownMode()` (prod→deny, dev/test→allow); `rate-limit.ts`/`auth-rate-limit.ts` throw 503 `rate_limiter_unavailable`; `budget-hook.ts` hard-blocks on `budget_unavailable` in deny mode. API suite 187/187 green.
- test: unit test with broken Redis adapter asserts requests blocked + error logged.
- acceptance: outage does not silently bypass limits/budgets.

## PHASE 5 — Performance

### FIX-P1 · Atomic usage rollup (P2)
- files: `apps/api/src/services/usage/rollup.ts`
- fix: single statement `INSERT ... ON CONFLICT (workspace, day) DO UPDATE SET amount = usage_rollups.amount + EXCLUDED.amount` instead of read-update-insert; add index on conflict key.
- status: **PARTIAL** — added expression unique index `usage_rollups_dim_uq` (migration 0016) so silent duplicate rows cannot accumulate; the atomic single-statement upsert was authored (`enforce.ts`) but reverted because `ON CONFLICT` on expression indexes hangs the PGlite integration DB — read-then-write path retained with the unique index as backstop. db:verify → 0016 clean.
- test: concurrent update test asserts no lost updates.
- acceptance: parallel requests never drop usage deltas.

## PHASE 6 — UX

### FIX-U1 · RAG ingestion for uploaded knowledge files (P1 product)
- problem: uploads go to storage only; no chunk/embed pipeline feeds them into retrieval, so "upload knowledge" does nothing for chat.
- files: `apps/api/src/routes/uploads/*`, `apps/api/src/jobs/processors/*`, `apps/api/src/db/schema/memory.ts`
- fix: enqueue an ingestion job on upload that extracts text (reuse extraction), chunks, embeds into pgvector with `kind: file`, `fileId`, `workspaceId`; wire file-level retrieval filter into chat context; mark ingestion status on the upload row and surface it in the UI.
- test: upload → job runs → retrieval returns chunk for the workspace, and returns nothing for another workspace.
- acceptance: uploaded .md/.txt/.pdf/.docx is retrievable in chat by the owning workspace.

### FIX-U2 · `lf sync` nil-DB panic (P1 terminal)
- problem: `terminal/cmd/lf/sync.go` calls the offline materializer with a nil `*sql.DB` when the API path fails.
- fix: open the local DB before the offline branch (or guard + return actionable error). Add Go regression test.
- files: `terminal/cmd/lf/sync.go`, `terminal/cmd/lf/sync_test.go`
- acceptance: `lf sync` with API unreachable degrades to an error message, never panics.

## PHASE 7 — Polish

- FIX-CM1 P3: add `ANTHROPIC_API_KEY`/`OPENCORE_API_BASE` platform env-key cases in `apps/api/src/services/ai/providers/keys.ts`. **RESOLVED** — `ANTHROPIC_API_KEY` + `OPENCODE_API_KEY` added (`env.ts`, `keys.ts`).
- FIX-CM2 P3: honor `lf run --max-steps` (clamp tool loop iterations). **RESOLVED** — `chatRunner.maxToolRounds` from `--max-steps` (default 12).
- FIX-CM3 P3: `fetch_url` SSRF internal-IP deny list. **RESOLVED** — private IPv4+IPv6 + all-DNS-answer validation + per-hop redirect re-check (`ssrf.ts`).
- FIX-CM4 P3: rate limit uses right-most trusted proxy IP. **RESOLVED** — `auth-rate-limit.ts` XFF right-most non-empty entry.
- FIX-CM5 P3: web terminal "New session" keeps transcript reset but surfaces server history via `sessionId` continuity if desired (cosmetic; optional). **RESOLVED** — retry `↵` button added on error rows; reset remains intentional local behavior.
- FIX-CM6 P3: `lf sessions --open` stub → launches interactive chat for picked/`--id` session. **RESOLVED**.
- FIX-CM7 P3: `lf mcp add|remove|health` stubs → config-persisted management + live health check (`cmd/lf/root.go`, `internal/config/config.go`). **RESOLVED**; `lf upgrade` remains a stub.
- FIX-CM8 P2: chat retry dedupe — exact re-send of failed turn reuses prior blocked assistant row (`services/chat/router.ts:295-370`); no duplicate user+assistant rows.
- Regression-test coverage: WS isolation, builder guard, chat abort, tool permission gating, sync offline.

## Verification After Each Phase

`pnpm typecheck && pnpm lint && pnpm test` (api+web), `pnpm build`, `go test ./... && go vet ./...`, plus the affected flow smoke test. Update `docs/FULL_PRODUCTION_AUDIT.md` statuses (RESOLVED/OPEN) after each fix batch; re-score at the end (Phase 36) and produce the final report.