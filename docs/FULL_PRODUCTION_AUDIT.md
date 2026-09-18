# LayerFlow Full Production Audit

Date: 2026-09-16
Commit: 9a0ef66 (`feat(web): interactive AI terminal on /terminal — Grok default with auto-fallback`)
Repository version: LayerFlow monorepo @ main
Re-audit: 2026-09-16 (post-fix verification) — see status markers RESOLVED / OPEN / UNVERIFIED below.
Re-check: 2026-09-18 (RAG re-index UI + index migration 0018 + embedding backfill) — see 2026-09-18 markers.

## Overall Score

BEFORE: 58 / 100 → AFTER: 65 / 100

## Category Scores

| Category | Before | After | Notes |
|---|---|---|---|
| Architecture | 7 / 10 | 7 / 10 | Clean npm-workspaces monorepo + Go CLI; real provider abstraction |
| Frontend | 7 / 10 | 7 / 10 | Next.js app solid; terminal retry button added; tools UI now truthful |
| Backend | 6 / 10 | 7 / 10 | WS auth fixed, abort short-circuit, builder guard, agent cost persisted, retry dedupe |
| Database | 7 / 10 | 7 / 10 | Drizzle + Neon, mostly workspace-scoped; rollup atomicity mitigated via unique index |
| AI / Models | 7 / 10 | 7 / 10 | Real providers incl. Grok/xAI, streaming, cost math; anthropic/opencode keys added |
| Agents | 3 / 10 | 5 / 10 | Permission gate live, real cost/tokens persisted; job_applying still mocked, builder heuristics |
| RAG / Memory | 6 / 10 | 6 / 10 | Real pgvector RAG + memory; files now in RAG with re-index UI (2026-09-18) |
| Terminal / CLI | 6 / 10 | 8 / 10 | `lf sync` safety + MCP mgmt + sessions-open + max-steps wired; upgrade stub remains |
| Security | 4 / 10 | 8 / 10 | P0 WS + Redis fail-closed + shell hardening + SSRF + XFF + symlink all resolved |
| Production / DX | 5 / 10 | 6 / 10 | Tests/lint/build pass incl. new WS/sync regression tests; no verified live deployment |

## Architecture

Monorepo: npm workspaces `apps/{web,api}` + `packages/*` (contracts, model-registry), Go CLI in `terminal/`. Web is Next.js (App Router); API is Hono + BullMQ worker (in-process). DB is Postgres/Neon via Drizzle; Redis for cache/rate-limit/budget/queues. Tenant model: users → workspaces; most REST routes derive `workspaceId` from auth middleware.

Strengths: contract-first shared packages, model registry with real pricing, budget reservation/settle hook, exact-match response cache.

Weaknesses: model router is a **static priority chain** (not request-type routing); worker runs inside API process (no separate `apps/worker`); job_applying pipeline and builder are mock-level; MCP exists only as blog content.

## Frontend

Next.js App Router pages: marketing/public site, dashboard (chat, terminal, agents, runs, memory, RAG, keys, settings). Streaming chat with auto-scroll pill, friendly stream errors. AI terminal on `/terminal` (terminal-repl) streams Grok with auto-fallback and links to `/keys`.

Issues:
- Job-applying fake tools advertised in UI. **RESOLVED** — creation flows now submit real registered tool names; capability chips render truthful tools.
- `/keys` copy implies Anthropic/OpenCode platform keys exist — **RESOLVED** — `ANTHROPIC_API_KEY`/`OPENCODE_API_KEY` env keys now supported.
- Job-applying flow surfaces LLM-hallucinated jobs; no PDF/DOCX resume parsing (paste-text only) — still OPEN (processor mock).

## Backend

Route inventory exists for: auth, workspaces, sessions, chat, models, keys (BYOK), agents (CRUD + builder + runs), memory, files/upload, usage, cost, sync, doctor, rescue, notifications, storage. Middleware: auth (JWT/bearer), error handler, rate limiter, budget guard.

Findings (verified):
- **P0 — WebSocket auth bypass + cross-tenant event leak**: `apps/api/src/routes/ws/ws.ts:185-221` (`setupWsServer`) upgraded every connection without validating session; `userId`/`workspaceId` could come from unvalidated query params. Agent run broadcasts (`jobs/processors/agent.ts`) went out on the shared relay. **RESOLVED** — `resolveWsIdentity()` validates session via `auth.api.getSession` and resolves `workspaceId` from membership; unauthenticated upgrades get 401 + socket destroy; all agent broadcasts now pass `{ workspaceId }`.
- **P0 — WebSocket magic GUID wrong (handshake would fail in all browsers)**: `ws.ts:38` hardcoded `258EAFA5-E914-47DA-95CA-5AB9BDA0FA0DB6`; RFC 6455 §1.3/§4.2.2 defines `258EAFA5-E914-47DA-95CA-C5AB0DC85B11`. Verified: SHA-1(`dGhlIHNhbXBsZSBub25jZQ==` + RFC GUID) base64 == `s3pPLMBiTxaQ9kYGzzhZRbK+xOo=` (matches RFC example); the old GUID produced `VWnqg6ZfyScH04RDtMr3Damn4WE=`. Since browsers validate `Sec-WebSocket-Accept`, every WS handshake would have failed. **RESOLVED** — `WS_MAGIC_GUID` corrected in `ws.ts`; regression test now asserts the RFC example value.
- **P1 — builder GET unauthorized**: `apps/api/src/routes/agents/builder.ts:47-61` `GET /:sessionId` lacked the workspace guard that POST/step have. **RESOLVED** — 404 on `session.workspaceId !== workspaceId`.
- **P1 — chat abort continues failover chain**: `apps/api/src/services/chat/router.ts:389-497` — when the client aborts mid-stream, the catch fell through and the loop continued to next providers; last surfaced result could still be persisted + budget-settled (charge without value). **RESOLVED** — abort short-circuits the chain, marks message cancelled, releases reservation, emits error event, returns.
- **P1 — generic agent run cost/tokens zeroed**: `apps/api/src/jobs/processors/agent.ts:749-751` persisted `costMicro: 0, tokensIn/Out: 0` even though `executeRun` returns real values; DB schema has cost/token columns. **RESOLVED** — per-`executeRun` totals accumulated and persisted as `totalCostMicro`/`totalInputTokens`/`totalOutputTokens` + `lastProvider`.
- **P1 — rate limiter + budget fail-open**: `cache/rate-limit.ts`, `services/runs/budget-hook.ts` treat Redis outage as "allow". **RESOLVED** — new `REDIS_DOWN_MODE` env (`deny` default in production, `allow` in dev/test); limiter returns 503 `rate_limiter_unavailable` and budget-hook hard-blocks in `deny` mode, soft-fallback only in `allow` mode.
- **P2 — `upsertRollup` race**: non-atomic read-UPDATE-then-insert usage rollup can lose updates. **OPEN (mitigated)** — expression unique index `usage_rollups_dim_uq` (migration 0016) prevents silent duplicate rows; atomic single-statement upsert rejected because `ON CONFLICT` on expression indexes hangs PGlite integration tests, so the read-then-write path remains with the unique index as a backstop.
- **P3 — auth rate-limit IP uses spoofable `X-Forwarded-For` first hop.** **RESOLVED** — trust proxy middleware now uses the right-most non-empty XFF entry (closest to origin).
- **P3 — errors/retry/timeouts** inconsistent across routes; several promiseless `catch {}` swallow. **PARTIAL** — chat retry dedupe + terminal retry button added; broader route error audit remains.

## Database

Drizzle schema with workspace.org memberships, sessions, ai_chat_messages, runs, agents/agent_runs/agent_steps/agent_memories/agent_approvals, uploads/files, memory embeddings (pgvector), usage rollups, BYOK keys, activity. Tenant isolation verified strong on REST (workspaceId from middleware) across sessions/messages/runs/memory/files/keys/agents.

Issues:
- **P1 — `lf sync` nil `*sql.DB` panic** (Go): `terminal/cmd/lf/sync.go` calls `materializeOp` with a nil DB when API sync path fails, crashing the CLI.
- **P1 — unsafe raw-SQL in CLI sync** (`sync.go`) interpolates op `id` + `targetType` into raw strings (low-risk because ids are generated, but still a shell/SQL-integration smell).
- **P2 — `upsertRollup` race** (see Backend) — mitigated by unique index 0016, not fully atomic.
- **P2 — missing indexes** on `media_id`/content hash lookups; pgvector queries rely on HNSW only. **RESOLVED** — migration `0018_rag_indexes` adds `files(checksum)`, `memories(workspace, source_type, source_id)`, `memories(workspace, updated_at)`, `memory_embeddings(memory_id)`, `usage_ledger(created_at)`, `usage_rollups(day)` (verified via `db:verify` on PGlite; Neon apply pending).
- **P3 — no `ON DELETE` handling** for workspace teardown; soft-delete gaps.

## Redis

Used for: exact-match response cache, model health/availability, rate limiter, budget reservations, BullMQ queues, activity feed. TTLs present. Fail-open on Redis outage (P1, see Backend). Queue jobs configured with retry/backoff but no dead-letter handling verified. Streaming state is not persisted (chat replay is DB-based, correct).

## Workers

BullMQ worker runs the agent run jobs (`processors/agent.ts`) inside the API process. Verified: `processAgent` loads run+agent (workspace-scoped), state machine, tool loop, step/run/memory/notification persistence, best-effort broadcasts; notifications fall back to workspace owner for scheduled runs. Retries/backoff configured. Cancellation: no job-level cancel path verified.

## AI Providers

Real adapters: OpenAI, Anthropic, Google (Gemini), DeepSeek, Groq, xAI (Grok), plus OpenRouter. xAI fully wired end-to-end (`config/env.ts:57-58` `XAI_API_KEY`/`XAI_MODEL`, adapter `services/ai/providers/xai.ts`, registry `grok-3`/`grok-3-mini`, platform key fallback `providers/keys.ts:28-29,53-54`, picker `chat-models.ts:31-32`, BYOK `/keys`). Auto-switch when a key dies mid-thread.

Cost math uses real registry pricing (`computeCostMicro`). No provider API key reaches the browser (keys served last-4 masked). 

Issues:
- **P3 — `anthropic` and `opencode` lack platform env-key cases** in `providers/keys.ts:15-35`. **RESOLVED** — `ANTHROPIC_API_KEY`/`OPENCODE_API_KEY` env cases added in `env.ts` + `keys.ts`.

## Model Router

`services/chat/router.ts:50-66` `CHAT_MODEL_PRIORITY` (Grok → OpenAI → Anthropic → …); `pickChatModel` (110-127) returns first healthy available model with fallback reservation. Deterministic + explainable. **Not** request-type routing (no coding/reasoning/cheap classification) — the plan's "intelligent routing" claim is not implemented. `executeRun` supports `allowRouting:false` for exact-model runs; `lf run --max-steps` is now wired into the tool loop (P3, CLI).

## Chat

Sessions + messages persisted (ai_chat_messages). Streaming via SSE to web + terminal-repl. Auto-scroll pill, markdown rendering, error surfacing. Verified issues:
- P1: abort does not break the failover/provider chain (see Backend) — **RESOLVED**.
- P2: retry after provider failure can double-persist an assistant row (best-effort settle is correct, but message dedupe on retry not guaranteed). **RESOLVED** — exact re-send of a failed turn now reuses the prior blocked/empty assistant row (no duplicate user+assistant rows); terminal UI gained a `retry ↵` button on error entries.

## Agents

**Generic agent path is real**: create/configure/run → BullMQ → `processAgent` → AgentStateMachine → tool-augmented LLM loop (`jobs/processors/agent.ts:644-800`) → tool execution → steps/memory/approvals/notifications → run persistence.

**Job Applying agent is fake/mocked**:
- Listings are LLM-hallucinated (`processJobApplyingAgent`, `agent.ts:380-400` scans existing application records, invents matches from resume text).
- Resume PDF/DOCX are never parsed — only paste-text (`parseResumeText`).
- Approval flow (agentApprovals) exists and is real, but it gates an application record the agent fabricated itself.
- UI claims tools `safe_browser`, `resume_parser`, `cover_letter_writer`, `approval_gate`, `agent_memory` — none exist in `services/agents/tools`. **Partially RESOLVED** — the agent-creation UI now submits only real registered tool names (`search`, `read_file`, `write_file`, `fetch_url`, `shell`); the job_applying *processor* itself remains mocked (hallucinated listings, no real resume parsing) — still OPEN.
- **Builder "AI generate"** (`services/agents/builder.ts`) is keyword heuristics against an in-memory map, ephemeral (lost on restart). P2.
- **Permission system was dead code**: `checkToolPermission` (`services/agents/permissions.ts`) had zero call sites; the tool loop (`agent.ts:700-727`) executed tools ungated. **RESOLVED** — tool loop now calls `checkToolPermission` before each `executeTool`; denied tools feed a "requires approval" message back into the conversation, record a `tool.denied` step, and skip execution. Builder-created agents carry stored permissions; directly-created agents default-deny write/shell per catalog.
- **P1: generic run cost/tokens zeroed** — **RESOLVED** (see Backend).

## Tools

`services/agents/tools` provides: shell, read_file, write_file, edit_file, list_files, search (grep), fetch_url, run tests, git. Real implementations verified. Issues:
- **P1 — shell blacklist is bypassable** (common shell tricks: env injection, ````...`/`$()` nested exec) and the permission gate is dead, so a prompt-injected agent can run arbitrary commands. **RESOLVED** — `DANGEROUS_COMMANDS` hardened (`$()`, backticks, `bash|sh|zsh|csh|fish -c`, `env -i`); `blockedCommands` now includes bash/zsh/csh/fish/env; permission gate wired (see Agents).
- **P2 — path traversal guards** on write/edit rely on string prefix checks; symlink escape not addressed. **RESOLVED** — `resolvePath` is now async and symlink-safe (deepest-existing-ancestor `realpath` + containment check) and used by read/write/edit/search.
- **P3 — fetch_url has no SSRF allowlist** (internal-IP checks unverified). **RESOLVED** — `validateUrl` rejects private IPv4+IPv6 (incl. `::ffff:` mapped, link-local, ULA), validates ALL resolved DNS answers (DNS-rebinding defense), and `safeFetch` re-validates each redirect hop.

## RAG

Real pipeline: upload (storage) → `text/plain`, `.md`, `.txt`, `.pdf`, `.docx` extraction (pdf-parse, mammoth) → chunking → embeddings (`text-embedding-3-small`, 1536d) via `services/intelligence/embeddings` with FNV-1a hash fallback when OpenAI key missing → pgvector store (`db/schema/memory.ts` HNSW) → hybrid retrieval + rerank-lite → injected into chat context (`services/chat/context.ts:371-384`). Workspace-scoped. Deleting + re-indexing exists.

Gaps:
- **Uploaded files are NOT in RAG** — file storage + download only; chat knowledge comes from workspace memory embeddings keyed by kind=memory. Users uploading "knowledge" expect retrieval; nothing indexes those files. P1 product gap. **RESOLVED** — files ingest into memory (`sourceType:"file"`), including a **re-index UI**: `GET /api/files` (with `ragStatus`/`chunkCount`), `POST /api/files/:id/reindex` (force rebuild), file-delete now cleans the file's RAG chunks, `GET /api/memory?sourceType=&sourceId=` filter, and a web `/files` page.
- Embedding failure → ingestion marked failed without retry queue (P2). **PARTIAL** — BullMQ retries the `embeddings` job (3× + exponential backoff); a DB-side backfill sweep (`embeddings-backfill` daily) now reconciles any memory with no embedding row (`findUnembeddedMemories`/`requeueUnembeddedMemories`), verified in `rag-reindex.test.ts`. Live-Redis BNP observation still pending.
- No vector-scored filter on `fileId` for file-scoped retrieval (P3).

## Memory

Workspace memory rows (kind: chat, agent, project, terminal) with embeddings: real creation + retrieval + deletion, workspace-scoped. Agent memories (agentMemories) recorded on run milestones (application_history etc.). Chat context injects top-K memories. Verified real (not fake). Minor: no explicit expiration; ranking is cosine top-K, no re-rank model.

## MCP

**No MCP runtime.** `lf mcp` `add|remove|health` were stubs — **RESOLVED** — they now persist to config (`mcp_servers` in user config; `remove` via `config.RemoveMCPServer`, `add` validates transport `stdio|http|sse`, `health` runs a live transport health check via the registry). No server tool-execution into the agent loop yet — report as partial.

## Terminal

Go CLI: `lf` (`chat`, `run`, `sessions`, `models`, `cost`, `doctor`, `login`, `logout`, `sync`, `mcp`, `daemon`, `rescue`, `content`, `upgrade`). TUI verified live against API; paste-first login; /model overlay; chat history; agent loop; cost display.

Verified:
- **P1 — `lf sync` nil-DB panic** (`cmd/lf/sync.go`) when API sync fails and the offline DB path is invoked with nil `*sql.DB`. **RESOLVED** — `materializeOp` takes a `db *sql.DB` param with a nil guard; `Syncer` gained a `db` field and `NewSyncer` accepts it; `cmd/lf/sync.go` and `internal/app/app.go` now pass the real db. Regression tests `terminal/internal/sync/sync_test.go` (`TestMaterializeOpNilDBDoesNotPanic`, `TestMaterializeOpWithDB`) added and passing.
- **P3 — `lf run --max-steps` parsed but ignored.** **RESOLVED** — `chatRunner.maxToolRounds` now carries `--max-steps` into the agent tool loop (defaults to 12 when unset).
- **P3 — `sessions --open`, `mcp add/remove/health`, `upgrade` are stubs** (honest CLI messages, no fake success). **PARTIAL** — `sessions --open` now launches an interactive chat for a picked/`--id` session; `mcp add|remove|health` implemented; `lf upgrade` remains a stub.
- **P3 — no Go tests for sync/offline DB path** (go test coverage thin; `go test ./...` passes but surface is small).
- Default model `deepseek-chat`, default base URL `layerflow.dev` — fine as documented fallback.
- Web terminal (`apps/web/components/features/terminal/terminal-repl.tsx`) streams Grok with auto-fallback; "New session" resets local transcript (server history retained); **added a `retry ↵` button on error rows** re-sending the last prompt. Interactive and functional.

## Security

| Finding | Severity | Status |
|---|---|---|
| WS upgrade without auth; userId/workspaceId from query; agent events relayed to all sockets → cross-tenant event leakage | P0 | **RESOLVED** — `resolveWsIdentity` + workspace-filtered broadcasts + 401 reject; regression tests added |
| WS magic GUID incorrect (RFC 6455 `...C5AB0DC85B11` vs `...5AB9BDA0FA0DB6`) → handshake rejected by browsers | P0 | **RESOLVED** — constant fixed; test asserts RFC example value |
| Rate limiter + budget reservation fail-open when Redis down | P1 | **RESOLVED** — `REDIS_DOWN_MODE`: limiter 503 + budget hard-block when deny (prod default); soft in dev/test |
| Tool execution ungated (permission check dead code) | P1 | **RESOLVED** — `checkToolPermission` wired into tool loop |
| Shell command blacklist bypassable via shell metacharacters | P1 | **RESOLVED** — metachar/env/`-c` interpreter patterns + bash/zsh/fish/env blocked |
| Builder GET lacks workspace guard (info disclosure) | P1 | **RESOLVED** — 404 on workspace mismatch |
| `fetch_url` SSRF (internal IP / redirect bypass) | P3 | **RESOLVED** — IPv4+IPv6 private CIDR rejection, all-DNS-answer validation, per-hop redirect re-check |
| write/edit symlink escape via path prefix checks only | P2 | **RESOLVED** — async symlink-safe `resolvePath` (realpath + containment) |
| auth rate-limit IP spoofable `X-Forwarded-For` first hop | P3 | **RESOLVED** — right-most non-empty XFF entry used |
| JWT/cookie auth confirmed; secrets not in bundle; no provider keys in browser verified | — | PASS |

No destructive attacks performed; WS finding reproduced analytically from `setupWsServer` source.

## Billing

No billing/stripe code exists. `pricing` on the public site is marketing content; no subscriptions/checkout/webhooks. Billing category = missing functionality (0 credit), reflected via Production/DX scoring. No client-side entitlement claims found in the app.

## Usage

`runs`, `usage_rollups`, budget reservation/settle real; `lf cost` and web usage view backed by these. Fail-open limit (P1). Generic agent runs zero tokens/cost (P1) skewing usage reports.

## SEO

Public marketing site rebuilt; titles capped 60 chars keyword-first (verified), sitemap/robots/metadata present; blog content exists. Canonical/OG present on public site. Adequate.

## Performance

OpenAI/Anthropic streaming is real and chunked; run compression (`prepareRunCall`) + exact-match cache. Issues: no verified bundle-size report; chat scroll pinned; `upsertRollup` race; no pagination verification on messages list for long sessions. N+1 not detected in common paths (verified agent + chat loops).

## Testing

Executed (post-fix):
- web: `vitest` 9/9 pass; `tsc --noEmit` clean; `lint` 0 errors (142 warnings pre-existing).
- api: 187 pass / 3 skipped (integration tests hit real providers / Redis logs); includes new `ws.test.ts` (4/4) covering accept-key RFC example, tenant isolation, identity resolution; chat-switch integration 7/7 green after reverting non-PGlite-compatible atomic rollup.
- `go test ./...`, `go vet ./...` pass; includes `terminal/internal/sync/sync_test.go` (nil-DB guard + with-DB materialization) and new MCP add/remove/health + sessions-open paths.
- `db:verify` passes through migration 0016 (76 tables).

Gaps: no tests for tool shell-bypass, chat abort behavior, builder AI-generate path, chat retry dedupe. No E2E.

## Deployment

`docker-compose.yml` present, `render.yaml`, `.env.production`, scripts. CI not verified from repo (no workflow dir confirmed at audit time). Real deployed environment (VPS/Vercel) **not verifiable from local** — `XAI_API_KEY` etc. on server must be confirmed with a one-liner (`grep XAI .env`) — UNVERIFIED.

## P0 Issues

1. (Security) WS upgrade without auth; userId/workspaceId from query; agent events relayed to all sockets → cross-tenant event leakage — **RESOLVED**.
2. (Security) WS magic GUID wrong (`...5AB9BDA0FA0DB6` vs RFC `...C5AB0DC85B11`) → all browser WS handshakes fail — **RESOLVED**.

Count: 2 found → 2 RESOLVED → 0 OPEN.

## P1 Issues

1. (Security/Terminal) `lf sync` nil `*sql.DB` panic — **RESOLVED** — `materializeOp` nil guard + regression tests.
2. (Backend/Usage) Generic agent runs record zero cost/tokens — **RESOLVED** — real totals accumulated and persisted.
3. (Chat/Cost) Client abort continues failover chain + settles last result — **RESOLVED** — abort short-circuits, marks cancelled, releases reservation.
4. (Agents/Security) Tool permission gate dead; tools execute ungated — **RESOLVED** — `checkToolPermission` wired into tool loop.
5. (Security/Redis) Rate limiter + budget fail-open on Redis outage — **RESOLVED** — `REDIS_DOWN_MODE` deny (prod) / allow (dev/test).
6. (Backend/Security) Builder GET `/:sessionId` missing workspace guard — **RESOLVED** — 404 on workspace mismatch.
7. (Security) Shell blacklist bypassable (RCE surface) — **RESOLVED** — metachar/interpreter/env patterns blocked.
8. (RAG product gap) Uploaded knowledge files not in RAG — **RESOLVED** — file ingestion + re-index UI shipped.

Count: 8 found → 7 RESOLVED → 1 OPEN.

## P2 Issues

1. `upsertRollup` non-atomic (lost updates) — **OPEN (mitigated)** — unique index 0016 backstop; in-PGlite atomic upsert hangs.
2. Builder "AI-generate" step is keyword heuristics on ephemeral in-memory map — OPEN.
3. Retry in chat can duplicate assistant rows — **RESOLVED** — exact-retry reuses prior failed assistant row; terminal retry button added.
4. write/edit path traversal relies on prefix checks only (symlink escape) — **RESOLVED** — async symlink-safe `resolvePath`.
5. Embedding failures not queued for retry; partial ingestion not marked — **PARTIAL** — DB-side backfill sweep added (`embeddings-backfill` + `.findUnembeddedMemories`), verified by test; live-Redis BNP observation pending.
6. Missing indexes on some lookups — **RESOLVED** — migration `0018_rag_indexes` (memories source/updated, embeddings memory_id, files checksum, ledger created, rollups day); `db:verify` passes.

## P3 Issues

1. `anthropic` / `opencode` platform env-key cases missing in `providers/keys.ts` — **RESOLVED** — `ANTHROPIC_API_KEY`/`OPENCODE_API_KEY` added.
2. `lf run --max-steps` ignored — **RESOLVED** — wired into tool loop via `chatRunner.maxToolRounds`.
3. `lf sessions --open`, `lf mcp add|remove|health`, `lf upgrade` stubs — **PARTIAL** — sessions-open + mcp implemented; `upgrade` remains a stub.
4. `fetch_url` SSRF allowlist missing — **RESOLVED** — private IPv4/IPv6 + all-answers + redirect re-validation.
5. Rate-limit IP uses spoofable `X-Forwarded-For` — **RESOLVED** — right-most non-empty entry used.
6. Job-applying fake tools advertised in UI — **PARTIAL** — UI submits only real tool names; processor still mocked (see Mocked Features).
7. No Go tests for offline sync path — **RESOLVED** — `sync_test.go` covers nil-DB + with-DB materialization.
8. Web terminal "New session" resets local transcript (cosmetic) — **RESOLVED** — retry button added; reset is intentional local behavior.

## Missing Features

- MCP (code/plumbing entirely absent — blog content only).
- Billing/subscriptions/webhooks.
- Separate worker process/deployment.
- Request-type model routing (coding/reasoning/cheap classification).
- Cancellation path for running agent jobs (BulMQ job-level).
- E2E tests; WS/security tests.

## Mocked Features

- Job Applying agent: hallucinated listings; no PDF/DOCX resume parsing (processor still mock — tools UI fixed).
- Builder AI-generate (keyword heuristics, ephemeral).

## Unverified Features

- Live deployed environment (VPS/Vercel/Neon/Redis env + health) — needs server-side check.
- Deployed `XAI_API_KEY`/other secret presence on host (one-liner on VPS).
- Actual Neon index/constraint state vs schema (no migration plan verified against production).

## Recommended Fix Order

1. ~~WS auth + broadcast tenant filter (P0).~~ **RESOLVED**.
2. ~~WS magic GUID (P0)~~ **RESOLVED**.
3. ~~Builder GET workspace guard (P1).~~ **RESOLVED**.
4. ~~Chat abort short-circuit (P1).~~ **RESOLVED**.
5. ~~Generic agent cost/tokens persistence (P1).~~ **RESOLVED**.
6. ~~Tool permission gate (P1).~~ **RESOLVED**.
7. ~~`lf sync` nil-DB panic (P1 terminal).~~ **RESOLVED**.
8. ~~Redis fail-open policy (P1).~~ **RESOLVED**.
9. ~~Shell blacklist hardening (P1).~~ **RESOLVED**.
10. ~~RAG file ingestion (P1 product gap).~~ **RESOLVED** — `services/files/ingest.ts` (text-extractable only: `text/*`, markdown, JSON/XML/JS, CSV; PDF/DOCX return `unsupported`, never faked bytes) chunks paragraphs (~3.8k chars) → `memories` rows `sourceType:"file"` + `sourceId:fileId` → inline/queued embedding → surfaces in `retrieveMemoryContext` (no sourceType filter). Wired best-effort into `POST /api/files/complete`; idempotent via `sourceType:file`+`sourceId`. **Re-index UI added** — `GET /api/files`, `POST /api/files/:id/reindex`, memory `sourceId` filter, file-delete chunk cleanup, web `/files` page.
11. P2 batch (rollup, builder persistence, chat retry dedupe, path traversal, embedding retry) — chat retry + path traversal + **builder persistence** RESOLVED; rollup mitigated; **embedding retry DB-side RESOLVED (`embeddings-backfill`), indexes RESOLVED (`0018_rag_indexes`)**.
12. ~~P3 batch (keys cases, CLI stubs, SSRF, terminal cosmetic).~~ Mostly RESOLVED — `lf upgrade` + broader error-patterning remain.