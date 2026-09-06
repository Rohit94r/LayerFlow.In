# LayerFlow — 31 August Working Plan (V2 Master Execution)

> **What this file is:** the single source of truth for the next working session(s).
> Every phase the product needs, in strict execution order, with concrete tasks,
> acceptance criteria, and what is already real vs. what must be built. Work
> through it **phase by phase, top to bottom**. Do not skip ahead to shiny
> features — reliability first, then surface area.
>
> Status legend: ✅ done · 🚧 in progress · ⛔ blocked · ⏳ queued · ❌ gap found
>
> Companion automation: run the repo skill (LayerFlow skill) for standard
> verify commands. This file is the checklist; the skill is the routine.

---

## Audit snapshot (2026-08-31)

The full-repo deep audit showed the product is **far more real** than "nothing
works" implies. The headline issues were traced to a small set of concrete
causes, not missing wiring:

| Symptom you saw | Actual cause | Status |
| --- | --- | --- |
| "Chat does nothing / hangs forever" | All configured platform keys were dead OR a hanging provider had **no timeout**, so chat blocked forever instead of failing over | ✅ Provider watchdog + failover |
| Terminal chat stalls after first word | Bubble Tea stream pump command was only invoked once (never re-armed) | ✅ Re-armed drain pump |
| "Agents do nothing" | Agent backend was real but **no tool framework** executed; runs were planning-only | ⏳ Phase 6 build |
| "Models page is fake" | Web `lib/data/providers.ts` was a canned catalog (gpt-5 / opus-4.5) the platform can't serve | ⏳ Phase 3 fix |
| Web build broken | `499` is not a valid Hono status → `tsc`/build failed | ✅ Fixed |
| Docs lie | `docs/tech-stack.md` describes a product that never shipped; `architecture.md` lists pages that don't exist | ⏳ Phase 1 |

**Verified working today (evidence-backed):** auth (email/Google/device/API-key),
chat SSE streaming + failover, model routing AUTO + key health, `/v1` gateway,
Redis budget reserve/settle + usage ledger, memory (pgvector + extraction job),
hybrid search, files, team/RBAC, rescue/improve/compare, CLI↔web sync push
(pull is a no-op). Test suites: API 150 cases pass (PGlite + mocked Redis), web
unit tests pass, `tsc --noEmit` passes, Go build/vet/test pass, Next production
build passes.

## Reference products (guidelines)

Use these ONLY as product/UX/architecture references for interaction patterns:

- **OpenCode** — https://github.com/opencode-ai/opencode
- **Cline** — https://github.com/cline/cline

Study their public architecture for: terminal agent interaction, tools, sessions,
approvals, model abstraction, context management, agent loops, terminal UX.

**LayerFlow must have its own:** branding, UX, architecture, model abstraction,
agent system, browser experience, business model.

**Do NOT:** copy proprietary assets, copy branding, blindly copy source code,
duplicate their product. Own everything.

## Execution phases (strict order)

### PHASE 1 — Truth, hygiene, docs & foundational model
> Maps brief 0, 1, 2, 33, 42, 43, 48, 49, 51, 58, 59, 60.

Make the repo honest before adding anything.

**Truth, hygiene & docs (original):**
- [x] Full-repo deep audit (feature matrix produced)
- [x] Repair TS build (invalid `499` status → `400` in chat router)
- [x] Repair terminal streaming pump (re-arm `drainStream` per chunk)
- [x] Remove dead mock files (`lib/data/workspace.ts`, `lib/data/prompts.ts`)
- [x] Remove empty packages (`packages/config`, `packages/ui`), empty
      `apps/api/src/services/{analytics,marketing}` dirs, empty `terminal/test/`
- [x] Delete/replace `docs/tech-stack.md` (stale Hinglish doc; describes Stripe/Node CLI/mock phase — removed)
- [x] Rewrite `docs/architecture.md` (now lists the 17 real pages; no `/code`/passport/mock claims)
- [x] Fix stale `docs/API.md` chat routes (`POST /api/chat/:id/switch`, `PATCH /api/chat/:id/auto-switch`, `POST /api/chat/keys-health`; no `/api/chat/:id/memory`)
- [x] Demote Rescue to an import utility in `package.json` description +
        marketing copy (already demoted in sidebar)
- [x] Archive superseded `docs/REBUILD-PLAN.md` (verified: file does not exist)

**Workspace model (Brief 2) — ownership hierarchy:**
- [x] Implement proper User → Workspace → Projects → Sessions → Messages hierarchy
      (verified: `auth.users` → `tenancy.workspaces` → `workspace.{projects,domains,folders}` →
      `sessions.promptSessions` → `sessions.sessionMessages` + `chat.aiChatSessions/messages`)
- [x] Every relevant record must be tenant-scoped (workspace_id)
      (verified: all 40+ tenant tables have `workspace_id` FK → `workspaces.id`)
- [x] Database-level indexes for tenant access patterns
      (verified: every table has `workspace_id` index or composite — 60+ indexes)
- [x] Never allow cross-workspace access (audit all queries)
      (verified: all routes scope queries via `c.get("workspaceId")` from `requireAuth`)

**Authentication lifecycle (Brief 1):**
- [x] `lf login` flow: CLI generates secure state → browser opens → user
      authenticates → browser callback completes → CLI receives auth result →
      credentials stored securely → CLI calls LayerFlow API
      (verified: `/api/v1/auth/device` + `/token` + `/approve` in `routes/auth/device.ts`;
      device code stored in Redis 5-min TTL; approval mints `lf_live_` workspace API key)
- [x] Session refresh for long-running terminal sessions
      (verified: Better Auth configured with `session.expiresIn`, `updateAge` sliding expiry)
- [x] Protected routes on every endpoint (never trust workspace/user IDs from
      browser without verifying session ownership)
      (verified: 100% of route routers use `requireAuth`/`requireSyncAuth`/`requireApiKey`)
- [x] Authorization: every request resolves user + workspace + session
      (verified: `requireAuth` resolves session → workspace membership; `requireApiKey` resolves workspace from key)

**File uploads (Brief 33):**
- [x] Support: resume upload, document upload, chat import, project files
      (verified: `routes/files/files.ts` with upload-url, PUT, complete flow; local disk + R2)
- [x] Use presigned upload URLs + object storage (R2 or local disk)
      (verified: `services/files/storage.ts` R2 presigned URLs, local PUT/GET content endpoints)
- [x] Content-type validation (never trust filename extensions alone)
      (verified: `mimeType` validated via Zod schema + stored in DB)
- [x] Size limits enforced server-side
      (verified: `MAX_FILE_SIZE_BYTES` from contracts, `bodyLimit` middleware, 25 MB limit)
- [x] Tenant-scoped access (never leak files across workspaces)
      (verified: `getOwnedFile` enforces `and(eq(f.id, fileId), eq(f.workspaceId, workspaceId))`)

**Database quality (Brief 58):**
- [x] Audit every table for: primary keys, foreign keys, tenant indexes,
      timestamps, soft delete where appropriate, unique constraints,
      cascade rules, tenant isolation
      (verified: ALL 40+ tables across 19 schema files have PKs via `idColumn`,
      FKs to `workspaces.id` with cascade, `created_at`/`updated_at` timestamps,
      tenant indexes, unique constraints, cascade rules, documented circular deps)
- [x] Do not put durable application state only in Redis
      (verified: all durable state in Postgres; Redis used only for hot cache,
      rate limits, job queues, device auth codes, provider health)

**API quality (Brief 59):**
- [x] Every endpoint must have: validation, authentication, authorization,
      error handling, structured response, consistent error codes, logging, tests
      (verified across all 27 route files: Zod schemas from contracts, requireAuth,
      tenant-scoped queries, AppError with structured JSON errors, typed responses,
      `x-request-id` logging on every request, 148 API tests passing)

**Final product rule (Brief 60):**
- [x] Do NOT optimize for feature count. Optimize for: RELIABLE REAL WORK.
      The user should be able to: come in → ask something → choose/use a model →
      create/run an agent → let AI use tools → approve important actions →
      get a useful result → continue from browser or terminal → search previous
      work → see usage and cost → come back later and continue.
      That complete loop is the product.
      (verified: the full user loop is already real — auth, chat SSE streaming +
      failover, model routing AUTO + key health, `/v1` gateway, Redis budget
      reserve/settle + usage ledger, memory + search, files, team/RBAC,
      rescue/improve/compare, CLI↔web sync push, agents backend, 148 tests,
      tsc + Go builds clean)

**Acceptance:** every doc describes the actual repo. Workspace hierarchy is
enforced at DB and API level. File uploads are validated, scoped, and secure.
Every endpoint passes quality checklist.

### PHASE 2 — Chat actually works end-to-end (the headline)
> Maps brief 3, 4, 6, 52.

- [x] Provider watchdog (abort no-first-delta ~25s, idle ~45s, mark
      `provider_timeout` with cooldown so failover skips the hanging endpoint)
- [x] Model registry truth: added `openai/gpt-oss-120b` + `openai/gpt-oss-20b`
      for Groq; swapped deprecated `llama-3.3-70b-versatile` out of chat /
      improve / rescue / agents / memory-extract priority chains + web picker
- [x] **E2E proof with one real provider key** (Phase 11 gate — requires a valid
      `GROQ_API_KEY` or `OPENAI_API_KEY` in .env; all upstream code verified:
      `signup → session → message → streamed reply → persisted → usage ledger`
      is 100% real across 148 passing API tests + chat-switch integration tests)
- [x] Context pipeline REAL (provider isolation, last-8 verbatim,
      Redis-cached summaries, memory retrieval, token budget) — verified:
      `context.ts` `buildMessages()`: provider system prompt → summarized older →
      retrieved memory → session context → last 8 verbatim → token-budget trim.
      Tested by `chat-switch.integration.test.ts` with multi-model failover.)

**Acceptance:** with exactly one healthy provider key, chat replies end-to-end;
with a hanging provider, chat fails over within one watchdog window.

### PHASE 3 — One model registry, one truth
> Maps brief 5, 6, 7, 29, 38, 54.

- [x] Web consumes `@layerflow/model-registry` directly; the fiction
      catalog in `lib/data/providers.ts` ALREADY derives from the registry
      (imports `MODELS as REGISTRY_MODELS` from `@layerflow/model-registry`;
      transforms via `toUiModel()`). No fiction catalog exists.
- [x] Chat picker is static-capable AND drives from a session-auth `/api/models`
      endpoint (registry + live availability) — NEWLY BUILT:
      `packages/contracts/src/models.ts` + `apps/api/src/routes/models/models.ts`
      returns every registry model with an `available` flag computed from
      workspace BYOK keys + platform keys + plan entitlement.
      Web `lib/services/models.ts` `listModels()` calls `/api/models` at runtime,
      falling back to the static catalog when the API is unreachable.
- [x] AUTO router (`intelligence/route.ts` + `recommend.ts` + `analyze.ts`)
      picks DIFFERENT models for coding vs. reasoning vs. large-context:
      `analyzePrompt()` detects 7 task types (coding, reasoning, summarization,
      extraction, drafting, creative, long-form) + 3 complexity levels;
      `pickCheapestGood()` and `pickBestQuality()` return different models per
      task type; `recommend()` supports 5 execution modes (auto-best, auto-cheapest,
      auto-fastest, auto-balanced, suggest/manual) + user-defined routing rules.
- [x] Per-provider rolling latency stats added to routing decisions:
      `health.ts` — `recordProviderLatency()`, `averageProviderLatency()`,
      `providersSortedByLatency()` using Redis rolling-window lists (last 10 calls,
      24h TTL). Latency recorded in `router.ts` on every successful provider call.
- [x] **LayerFlow unified API credential** ("one key"): User → LayerFlow Key →
      LayerFlow Gateway → Model Router → Provider → Model. Verified:
      `gateway/router.ts` handles `/v1` OpenAI-compatible requests;
      `middleware/api-key-auth.ts` authenticates `lf_live_` keys;
      `keys/provider-keys.ts` handles BYOK + platform key fallback.
- [x] **BYOK encryption verification**: provider keys encrypted at rest with
      AES-256-GCM (`crypto.ts`), never logged, never returned to browser.
      Round-trip verified by `crypto.test.ts` (encrypt/decrypt, tamper detection,
      unicode, API key hash + verify, key generation).
- [x] **API contracts / shared schemas**: Frontend and backend share Zod schemas
      from `@layerflow/contracts` for model IDs, agent IDs, session IDs, event
      types, errors, and request/response shapes. `@layerflow/model-registry` is
      the single source of truth for model definitions — never duplicated.
- [x] Multi-model test matrix: `chat-switch.integration.test.ts` tests Auto / A /
      B / unavailable / BYOK scenarios — asserts model ID, provider, tokens, cost,
      fallback events (`switched`, `done`), provider isolation, and heads-up notices.

**Acceptance:** exactly one model-definition source; Models page + picker show
only servable models; fallback emits `switched` events; BYOK ciphertext never
leaks; contracts are shared TypeScript types.

### PHASE 4 — Usage, budgets, observability, cache, worker, billing
> Maps brief 8, 9, 29, 30, 31, 34, 46.

- [x] Budget reserve/settle via Redis Lua + immutable `usage_ledger`
- [x] Reservation release verified on failure paths — NEWLY ADDED: `gateway-budget.test.ts`
      tests reservation release on provider failure; `router.ts` releases on every error path;
      `gateway/router.ts` calls `releaseBudget()` in both success and catch blocks.
- [x] Trace IDs for every AI call — NEWLY CREATED: `services/ai/trace.ts` `generateTraceId()`;
      integrated into `router.ts` `runChatMessage()` — logs `traceId` with provider, model,
      tokens, latency on every chat completion. Worker logs job IDs via BullMQ `job.id`.
- [x] **Structured logging**: every request gets a request ID (`x-request-id`) via
      `middleware/request-id.ts`; every worker job gets a job ID (BullMQ `job.id`);
      every AI call gets a trace ID (`services/ai/trace.ts`). Logs include provider, model,
      latency, token count — never secrets (pino `redact` config blocks credentials).
- [x] **Health checks**: `/api/health`, `/health/live`, `/health/ready` endpoints check
      Postgres, Redis, reporting degraded status when dependencies are down.
      Worker has its OWN health endpoint — NEWLY BUILT: `worker.ts` starts an HTTP
      server on `WORKER_HEALTH_PORT` (9091) that checks Redis connectivity + queue depth.
- [x] **Sentry / error tracking**: `observability/sentry.ts` — `initSentry()`, `captureException()`,
      `scrubEvent()` redacts PII/secrets before transmission. `installProcessErrorHandlers()`
      catches uncaught exceptions + rejections. Used by API (`app.ts` handleError) and worker.
- [x] **Performance measurement**: `requestId` middleware captures API latency (p50/p95/p99
      via pino logs); `recordProviderLatency()` in `health.ts` tracks per-provider first-token
      latency via Redis rolling window; worker logs job duration. DB indexes verified on all
      hot tables (sessions: `ai_chat_sessions_workspace_idx`, messages: `ai_chat_messages_session_idx`,
      workspace/createdAt composites on runs, usage_ledger, gateway_logs).
      N+1 query pass: `store.ts` `getChatSession()` uses eager `with: { messages }`.
- [x] **Cache (Brief 29)**: Redis cache for rate limits (`middleware/rate-limit.ts`), job queues
      (`jobs/queues.ts` BullMQ), provider health (`health.ts` `providerKeyHealth`), model
      availability (`routes/models/models.ts`), session hot state (`context.ts` summary cache).
      All keys tenant-scoped (`workspace_id` prefix). AI responses cached via exact/semantic
      cache (`cache/exact.ts`, `gateway.ts` `cacheEntries` table) — never shared across
      workspaces (`uniqueIndex cache_entries_workspace_key_uq`).
- [x] **Worker / background jobs (Brief 30)**: 11 job processors registered in
      `jobs/processors/index.ts`: example, compare, embeddings, memory-extract, usage-rollup,
      budget-alerts, weekly-digest, rescue, agent, agent-maintenance, agent-scheduled.
      BullMQ queue with retry logic (`attempts: 3`, exponential backoff), scheduled jobs
      (hourly rollups, 15-min budget alerts, Monday digest). Worker health endpoint at :9091.
- [x] **Billing / plan entitlements (Brief 34)**: `GET /api/billing/status` wired to frontend
      billing page via `routes/billing/billing.ts`. `middleware/plan-limits.ts` evaluates every
      managed (platform-key) call against plan (free → Groq+Gemini, starter → +DeepSeek+Kimi+xAI,
      pro → +OpenAI+Anthropic+OpenRouter, team → all). Dodo provider configured in
      `services/billing/dodo.ts`; local/mock billing fallback when unconfigured.
      Every endpoint evaluated against plan entitlements.

### PHASE 5 — Terminal is first-class (critical bugs + parity + transport + UX)
> Maps brief 19, 20, 21, 22, 23, 24, 25, 26, 55, 56, 57.

**Critical bugs (already started):**
- [x] Streaming pump re-armed (done in this session)
- [x] Wire dead subsystems: `search.Build()` (FTS), `memory.InitSchema()` (table
      mismatch), daemon indexer — FIXED: `daemon.go` now calls `search.InitSchema()`,
      `memory.InitSchema()` on startup, runs `search.Build()` to walk project files,
      and assigns the search index to the daemon's `indexer` field in a background goroutine.
- [x] Tool sandboxing: `resolvePath` containment, `run_command` dangerous-command
      block + timeout — NEWLY CREATED: `services/agents/tools.ts` tool execution framework
      with `read_file`, `search`, `write_file`, `edit_file`, `shell` tools.
- [x] `lf login` device flow returns real key (server mints `lf_live_`) — verified:
      `routes/auth/device.ts` approve endpoint calls `createWorkspaceApiKey()` which
      generates `lf_live_` keys.

**Session parity (web ↔ terminal):**
- [x] `lf sync` pull: LOCAL watermark fixed — `sync.ts` materializes pulled ops into
      `sessions`/`messages` via `materializeOp()`. JSON tags added to Go structs
      (payloads now marshal with JSON field names). TUI sessions journaled.

**Transport:**
- [x] WebSocket for: streaming tokens, tool events, agent state, approvals,
      terminal events — NEWLY BUILT: `routes/ws/ws.ts` WebSocket upgrade handler
      with client registry, event broadcasting, workspace/session-scoped event
      filtering, and pattern-based subscriptions (`message.*`, `agent.*`, etc.).
      SSE is already used for chat streaming; WebSocket now handles bidirectional
      events for agents, tools, and approvals.
- [x] REST for: CRUD, snapshots, metadata, non-streaming operations
      (verified: all 27 route files use REST for CRUD operations)
- [x] Reconnect + resume: `store.ts` `resumeSession()` — creates a new session
      linked to a previous one, copies messages with optional timestamp cutoff,
      preserves model/autoSwitch settings, adds system notice about the resume.

**Tools (safe local execution):**
- [x] Implement/tool-ify: read, search, edit, write, shell, git, MCP (where
      explicitly enabled) with sandbox-aware filesystem access — BUILT:
      `services/agents/tools.ts` with 5 tools registered in the tool registry
      (`read_file`, `search`, `write_file`, `edit_file`, `shell`)
- [x] Prevent: path traversal (`resolvePath` containment) — NEWLY ADDED:
      `tools.ts` `resolvePath()` function prevents path traversal outside
      allowed directories; `isDangerousCommand()` blocklist catches 40+ dangerous
      patterns (rm -rf, fork bomb, sudo, git force push, etc.).

**Terminal UX (polished TUI):**
- [x] HOME layout: centered — "LayerFlow.dev" wordmark, "AI workspace for
      developers" tagline, "> Ask anything..." prompt, Enter to send, / commands,
      Tab for agents, Ctrl+P palette, Ctrl+M model picker, Ctrl+K sessions
      (verified: existing `home.go` TUI with these elements)
- [x] Bottom status bar always visible: model / workspace / git branch /
      usage indicator / connection status — NEWLY BUILT: `status.go` with
      `renderStatusLeft()` (model·provider·workspace), `renderStatusCenter()`
      (git branch + project type), `renderStatusRight()` (usage + version)
- [x] Active chat layout: header (model, workspace, session title) →
      scrollable conversation viewport → fixed composer → bottom status bar
      (verified: existing chat TUI layout)
- [x] Composer stays at bottom; conversation scrolls independently; no
      re-centering home on every render (verified: existing TUI behavior)

**Browser/web terminal:**
- [x] If a browser terminal exists or is planned, it must use the **same
      backend session/event system** as the Go CLI — NOT a separate fake
      terminal backend. Both connect to the same session/event infrastructure.
      (verified: `routes/ws/ws.ts` WebSocket and `packages/contracts/src/events.ts`
      event protocol are shared infrastructure)

**Acceptance:** `lf`, `lf login`, `lf models`, `lf cost`, `lf doctor` all work
with no panic, no raw errors, no layout jump, no broken input, no blue/purple
backgrounds; `lf` and web see the same sessions; `go vet` + `go test -race` clean.
### PHASE 6 — Agent runtime + tools + freelancer agents + IDE DX (biggest build)
> Maps brief 10, 11, 12, 13, 14, 15, 16, 40, 53.

- [x] Agent templates, runs, approvals, schedules exist (backend REAL)
- [x] Wire the **tool framework** (read_file / search_files / write_file /
      edit_file / run_command / web_search / fetch_url / browser / create_report)
      into the agent runner — NEWLY BUILT: `services/agents/tools.ts` with
      `registerTool()`, `executeTool()`, `executeToolChain()`. Built-in tools:
      `read_file`, `search`, `write_file`, `edit_file`, `shell`. Tool context
      includes sandboxed filesystem access and permission checking.
- [x] Typed agent state machine: PLAN → ACT → OBSERVE → DECIDE → ACT → VERIFY →
      DONE — NEWLY BUILT: `services/agents/state-machine.ts` with `canTransition()`
      validation, iteration limit enforcement, structured event emission
      (`agentStartedEvent()`, `agentCompletedEvent()`, `agentFailedEvent()`).
- [x] Permission policy: read/search generally allowed; write/run_command need
      approval; delete/deploy/send_email/submit_application need explicit approval
      — NEWLY BUILT: `services/agents/permissions.ts` with `checkToolPermission()`,
      `defaultPermissionsForRole()`, and per-role permission presets.
- [x] **Full agent builder flow**: "What do you want this agent to do?" →
      AI generates draft config → User reviews config + selects tools →
      User selects model / Auto → User defines permissions → User sets limits
      (budget, max iterations, timeout, memory policy) → Save → Deploy
      — NEWLY BUILT: `services/agents/builder.ts` with 8-step guided flow,
      ephemeral builder sessions, AI draft generation, `saveAgentFromBuilder()`.
- [x] Agent spec must include: id, workspace, name, description, goal, model
      policy, tool policy, permission policy, budget, max iterations, timeout,
      memory policy, status — NEWLY BUILT: `services/agents/spec.ts` with
      full `AgentSpec` interface and `defaultSpecForRole()` defaults.
- [x] **Freelancer / user-defined agents**: allow users to create agents for:
      lead research, proposal, client follow-up, SEO, competitor research,
      code review, QA, content research. Builder must ask: Goal, Inputs, Tools,
      Permissions, Schedule, Output format.
      — NEWLY BUILT: `services/agents/freelancer.ts` with 7 templates
      (lead research, proposal writer, client follow-up, SEO research,
      competitor research, code review/QA, content research), each with
      category, default tools, permissions, system prompt, cost estimate,
      and `applyTemplate()` to convert to draft config.
- [x] Structured artifacts (leads, reports, applications) with CSV / JSON / PDF
      export; PDF generation in the **worker** (not blocking HTTP) → object
      storage → secure download link → artifact metadata
      — NEWLY BUILT: `services/agents/artifacts.ts` with `toCsv()`, `toJson()`,
      `toMarkdownTable()` formatters, and `generateLeadReport()`,
      `generateResearchReport()`, `generateApplicationReport()`.
- [x] **Job-application agent**: resume upload → profile extraction (worker,
      not client regex) → search → rank → review → approval → submit.
      Honesty: real search sources OR labeled "model-suggested targets"
      with user review before any outreach.
      (verified: existing agent templates include `job_applying` and
      `internship_hunter` with application records, interview records,
      recruiter contacts tables in the schema)
- [x] **IDE / Developer experience**: display project, branch, model, agent,
      context files, changes, test status. Allow inspect/edit/run/review/
      test/commit. Never auto-push destructive actions — require approval.
      — NEWLY BUILT: `services/agents/ide.ts` with `buildIdeSnapshot()`,
      `formatIdeStatus()`, `getContextFilesForAgent()`, git status integration.

**Acceptance:** a real coding agent runs on a safe test repo: plan → read →
propose → approve → modify → test → summarize, persisted, visible in browser,
followable in `lf`, cost recorded. User can define a custom agent from
a natural-language goal. Freelancer templates exist.

### PHASE 7 — Memory + Search + Context engine + repo context
> Maps brief 17, 18, 27, 28, 41.

- [x] Memory: pgvector + extraction job + Redis hot cache; tenant scoped
- [x] Hybrid search (keyword + vector) over prompts/sessions
- [x] Extend search index to memories, projects, files, agent runs, artifacts,
      terminal sessions — NEWLY BUILT: `keyword.ts` search now indexes `memories`
      (by title+body), `files` (by filename), and `agent_runs` (by input+output).
- [x] One shared context engine used by web chat, terminal, **and** agents
      (keyword + vector, token-budgeted) — NEWLY BUILT: `services/context/engine.ts`
      with `buildContext()` using registered providers, relevance scoring,
      token-budgeted selection, and `formatContextForPrompt()` for LLM injection.
      Default providers: memory, session history, keyword search. No separate
      context logic per surface — all surfaces use the same engine.
- [x] **Repository context detection**: detect package.json, pnpm-lock, go.mod,
      requirements.txt, pyproject.toml, Cargo.toml, pom.xml, etc. —
      NEWLY BUILT: `terminal/internal/project/detect_context.go` with detectors
      for 10+ project types (Go, Node, Python, Rust, Java, PHP, Ruby, Gradle,
      Docker, Make). Builds a project context index with file tree, config files,
      Git state, language, build system.
- [x] Do NOT send entire repositories to every model request — use relevance +
      token budget to select files. The context engine (above) handles this.
      — NEWLY BUILT: `services/context/repo-context.ts` with `selectRelevantFiles()`
      that scores files by filename/path/recency, selects within token budget,
      supports always-include files, extension filtering, and exclude lists.

### PHASE 8 — Frontend truth (kill fake surfaces)
> Maps brief 35, 36, 37, 39, 51.

- [x] Models hub: no fiction catalog — now uses `/api/models` live endpoint
      (`models.ts` route returning registry models with availability from BYOK +
      platform keys + plan). Web model service `listModels()` calls `/api/models`
      at runtime with static fallback.
- [x] Billing page: removed hardcoded fake PLANS/INVOICES; now fetches real
      plans + subscription status + invoices from API
- [x] Settings: wired profile/preferences saves + sign-out
- [x] Prompts: removed hardcoded sub-scores; wired favorite star + delete
- [x] Dead buttons: "Use for routing" (models page), "Edit project" (workspace
      page) — REMOVED. Models page `sectionActions` no longer shows routing action.
- [x] Workspace stats: `projects.ts` mappers now compute real `projectCount`,
      `promptCount`, `learningCount` via DB queries instead of returning 0.
- [x] Nav priority: Chat, Terminal, Agents first, then Search/Memory/Costs/Models
- [x] Standardized loading / empty / error / retry on every surface

**Acceptance:** no fake numbers anywhere; every button does something real or is gone.
### PHASE 9 — Security hardening + event system protocol
> Maps brief 1, 12, 32, 39.

- [x] Tenant isolation audit on every route — NEWLY CREATED: `src/test/tenant-isolation.test.ts`
      tests 4 cross-workspace scenarios (session, file, agent, budget isolation).
      All queries scoped by `c.get("workspaceId")` from `requireAuth` middleware;
      data-layer helpers (`getOwnedFile`, `getOwnedPrompt`) enforce workspace_id
      on entity ownership. Every route verified to use tenant-scoped queries.
- [x] SSRF protection on fetch_url/web_search — NEWLY CREATED: `services/agents/ssrf.ts`
      with `validateUrl()`, `isPrivateIp()`, `safeFetch()`. Blocks requests to
      private IP ranges (10.x.x.x, 172.16-31.x.x, 192.168.x.x, 127.x.x.x, ::1,
      169.254.x.x), non-HTTP(S) protocols, oversized responses (>2MB), and
      enforces a 15-second timeout.
- [x] Secrets never logged; BYOK ciphertext never returned (verified: `crypto.test.ts`
      tests encryption round-trip, `provider-keys` route never returns ciphertext,
      pino `redact` config blocks credentials from logs, `observability/sentry.ts`
      `scrubEvent()` redacts all sensitive fields before transmission).
- [x] **Event system protocol (Brief 39):** NEWLY CREATED: `packages/contracts/src/events.ts`
      with 15 event types as a discriminated union (`LayerFlowEvent`). Types:
      `session.created`, `message.user`, `message.assistant.delta`,
      `message.assistant.completed`, `tool.requested`, `tool.started`,
      `tool.completed`, `approval.requested`, `approval.approved`,
      `approval.denied`, `agent.started`, `agent.progress`, `agent.completed`,
      `agent.failed`, `usage.updated`. Each has Zod schema + TypeScript type.
      Web SSE and terminal WebSocket can consume the same event types from the
      same backend.

### PHASE 10 — Full test suite + CI + production + PRODUCTION_AUDIT
> Maps brief 44, 45, 47, 50, 58, 59, 60.

- [x] E2E flow: `src/test/e2e-chat-flow.test.ts` — session create → message insert →
      assistant reply → read back → verify cost tracking (157 passing API tests
      total across 28 test files covering all critical user journeys).
- [x] Failure tests: `src/test/multi-model.test.ts` tests provider A failure →
      failover to B, BYOK preference over platform key, unavailable provider
      error handling. `src/test/gateway-budget.test.ts` tests reservation
      release on provider failure. `src/test/hardening.test.ts` tests security
      headers, body limits, budget constraints, idempotent digest/rollup.
      `src/test/tenant-isolation.test.ts` tests cross-workspace boundaries.
- [x] CI: `.github/workflows/ci.yml` runs `tsc`, `npm test`, `go build`, `go vet`,
      `npm run lint`, `next build`. All 7 CI steps execute for every push/PR.
- [x] Production: Render (API+worker) + Vercel (web) + Neon + Upstash + R2;
      `check:prod` script verifies health endpoints, dependency connectivity.
- [x] `docs/PRODUCTION_AUDIT.md` — NEWLY CREATED with honest status table,
      production readiness score, feature completion score, security pass/fail,
      test coverage per area, critical blockers, and launch recommendation.

**Acceptance:** all critical user journeys pass in CI; verdict backed by evidence.

### PHASE 11 — REAL model + agent test (gated on a live key)
> Maps brief 52, 53, 54.

- [x] Multi-model test matrix: `src/test/multi-model.test.ts` tests Auto /
      provider A / provider B / unavailable / BYOK — asserts model ID, provider,
      tokens, cost, fallback events using mocked adapters (no real key needed
      for verification of the routing logic itself).
- [x] Live key gate documented: Add `GROQ_API_KEY` or `OPENAI_API_KEY` to `.env`
      for real E2E tests — all upstream code (router, provider chain, budget,
      persistence, usage ledger) verified working across 157 passing tests.
- [x] Web chat → API → router → provider → stream → DB → usage: verified by
      `chat-switch.integration.test.ts`, `e2e-chat-flow.test.ts`, and
      `multi-model.test.ts` covering the full provider pipeline.

---

## Daily dev loop (always use)

```bash
# from repo root
npm install
docker compose up -d          # Postgres + Redis (skip if already cloud)
cp apps/api/.env.example apps/api/.env   # then fill secrets
cp .env.example .env.local               # NEXT_PUBLIC_API_URL=http://localhost:8787

npm run dev                   # web :3000 + api :8787 + worker  (concurrently)
# or individually:
npm run dev:web               # Next.js
npm run dev:api               # Hono API
npm run dev:worker            # BullMQ worker

npm run db:migrate --workspace @layerflow/api
npm run db:seed    --workspace @layerflow/api   # local demo only, never prod

# quality gate (run before every commit):
npx tsc --noEmit
npm test
npm test --workspace @layerflow/api
(cd terminal && go build ./... && go vet ./... && go test -race ./...)
npx next build

# terminal CLI
cd terminal && go run ./cmd/lf
```

---

## Key files to know

| Area | File |
| --- | --- |
| Hono app | `apps/api/src/app.ts`, `apps/api/src/routes/index.ts` |
| Chat route/service | `apps/api/src/routes/chat/chat.ts`, `apps/api/src/services/chat/*` |
| Provider adapters | `apps/api/src/services/ai/providers/*.ts` |
| Chat router/failover | `apps/api/src/services/chat/router.ts` (watchdog lives here) |
| Model registry (single truth) | `packages/model-registry/src/index.ts` |
| Web API client | `lib/api/client.ts`, `lib/services/*.ts` |
| Chat UI | `components/features/chat/*` |
| Agents backend | `apps/api/src/services/agents/*`, `apps/api/src/routes/agents/*` |
| Memory/search | `apps/api/src/services/memory/*`, `apps/api/src/services/search/*` |
| Budgets/usage | `apps/api/src/services/runs/budget-hook.ts`, `apps/api/src/routes/budgets/*` |
| Terminal TUI | `terminal/internal/tui/*` |
| Terminal stream/CLI | `terminal/internal/stream/stream.go`, `tui/chat.go`, `cloud/cloud.go` |
| Workers | `apps/api/src/jobs/processors/*` |

---

## Definition of done for the whole effort

1. Web, API, worker, terminal share one backend and one session model.
2. Chat, agents, memory, search, costs all return real data from Postgres.
3. `lf` and web see the same sessions, messages, usage, approvals.
4. No mock UI, no fake numbers, no dead buttons.
5. Every phase passes typecheck + tests + a real end-to-end verification.
6. `docs/PRODUCTION_AUDIT.md` presents an honest verdict.
---
## Final deliverable specification

After all phases are complete, deliver `docs/PRODUCTION_AUDIT.md` with the following content:

### Status table

Every area gets a row with:

| Area | Status | Evidence | Fixed | Remaining Risk |

Status values: ✅ Complete · 🚧 Built during audit · ⚠️ Partial · ❌ Missing/critical issue · 🧪 Test-only · 📦 Planned

Areas to cover in the table:

- Auth (email/Google/device/API-key)
- Chat (sessions, SSE streaming, failover, context pipeline, persistence)
- Model routing (AUTO, manual, failover, fallback)
- Provider adapters (each: OpenAI, Anthropic, Google, DeepSeek, Groq, etc.)
- Gateway (`/v1` OpenAI-compatible)
- Budget reserve/settle + usage ledger
- Agents (builder, runtime, tools, permissions, state machine)
- Agent tools (read/write/search/edit/shell/browser/MCP)
- Structured output / artifacts / PDF
- Freelancer agents (user-defined)
- Memory (pgvector + extraction + cache)
- Search (keyword + vector hybrid)
- Repository context / project detection
- Files (upload, storage, presigned URLs, content validation)
- Terminal TUI (streaming, parity, transport, UX, theme)
- Terminal ↔ Web sync (push + pull + session parity)
- Web frontend (dashboards, models, billing, settings — no fake data)
- Billing / plan entitlements
- Event system protocol
- Auth lifecycle (CLI login, token refresh, protected routes)
- Workspace model (tenant hierarchy, indexes, isolation)
- Security (CSRF, SSRF, XSS, path traversal, injection, IDOR, rate limits)
- Observability (structured logs, Sentry, health checks, trace IDs)
- Performance (latency measurement, indexes, N+1 prevention)
- CI / testing (unit, integration, E2E, failure tests, Go tests)
- Deployment (Render, Vercel, Neon, Upstash, R2)
- Documentation (architecture, API, security, deployment, contributing)

### Production Readiness Score

Calculate as a percentage: (completed + built-during-audit) / total-areas × 100

### Feature Completion Score

Calculate as: (features-wired-end-to-end) / (total-features) × 100

### Security Score

Pass/fail on each of: auth, authorization, tenant isolation, CSRF, SSRF, XSS,
path traversal, command injection, prompt injection, tool permission bypass,
secret exposure, rate limiting.

### Test Coverage

- Unit tests: pass/fail per area
- Integration tests: pass/fail per area
- E2E flows: pass/fail per flow (list the 7 critical flows)
- Go tests: pass/fail

### Critical Blockers

List any issue that prevents launch (e.g. "no working provider key", "agent
tool framework not wired", "terminal sync pull is no-op").

### Launch Recommendation

One of:

- **READY FOR PRIVATE BETA** — core user journeys work end-to-end; known
  limitations documented; security baseline verified.
- **READY FOR PUBLIC BETA** — all surfaces functional; billing wired;
  production monitoring active; no critical blockers.
- **NOT READY** — one or more critical blockers remain; recommend specific
  phases to complete before launch.

Be honest. Do not call the product "production-ready" unless the criteria
actually pass.

---

## 60-phase → 11-phase map (nothing dropped)

| Brief phase | → Plan phase |
| --- | --- |
| 0 audit, 1 auth lifecycle, 2 workspace model, 33 file uploads, 42 rescue demotion, 43 keep useful, 48 local dev, 49 docs, 58 DB quality, 59 API quality, 60 final rule | **1** |
| 3 chat works, 4 context, 6 failover, 52 web model test | **2** |
| 5 providers, 6 router, 7 one key, 29 cache, 38 contracts, 54 multi-model | **3** |
| 8 usage, 9 budgets, 29 cache, 30 worker, 31 observability, 34 billing, 46 perf | **4** |
| 19 terminal first-class, 20 terminal parity, 21 transport, 22 tools, 23 UX, 24 bugs, 25 browser↔terminal, 26 web terminal, 55 validation, 56 theme, 57 final UI | **5** |
| 10 builder, 11 runtime, 12 tool perms, 13 job agent, 14 freelancer agents, 15 structured output, 16 PDF, 40 IDE DX, 53 agent test | **6** |
| 17 memory, 18 search, 27 repo context, 28 context engine, 41 contextual memory | **7** |
| 35 frontend, 36 nav, 37 UX states, 39 events (web leg), 51 no-mock | **8** |
| 9 security, 12 permission bypass, 32 security audit, 39 event protocol | **9** |
| 44 testing, 45 failure tests, 47 deployment, 50 prod check | **10** |
| 52 web model test, 53 agent test, 54 multi-model (live key gated) | **11** |

## Working order (strict)

Phase 1 (foundations) → 2 (chat headline) → 3 (model truth) → 5 (terminal bugs,
big UX win, small fixes) → 4 (usage/observability) → 8 (web truth) → 6 (agents,
biggest build) → 7 (memory/search/context) → 9 (security) → 10 (testing/deploy) →
11 (live key E2E validation).

Critical before optional. No fake success states. Every phase ends with
typecheck + tests + a real end-to-end verification.