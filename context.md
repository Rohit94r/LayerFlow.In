# LayerFlow — Complete Project Context

## What LayerFlow Is

LayerFlow is a **prompt engineering workspace + AI gateway + terminal agent** — a unified platform to rescue dead AI conversations, sharpen rough prompts into efficient ones, orchestrate multi-model agent workflows, and maintain granular control over AI spending. It is a pre-launch monorepo with three surfaces sharing one backend.

---

## High-Level Architecture

```
┌─────────────────────────┐     ┌─────────────────────────┐     ┌─────────────────────────┐
│  Browser App (web)      │     │  API + Worker           │     │  Terminal Agent (lf)    │
│  Next.js 16             │────▶│  Hono HTTP + BullMQ     │◀────│  Go CLI + Bubble Tea TUI│
│  chat / agents /        │     │  Postgres (pgvector) +  │     │  sessions / search /    │
│  billing / workspace    │     │  Redis                  │     │  daemon / MCP           │
└─────────────────────────┘     └─────────────────────────┘     └─────────────────────────┘
```

- **Web app** mounts the Hono API same-origin under `/api/*` and `/v1/*`
- **CLI** syncs sessions/messages/memories to the dashboard via `/api/v1/sync/*`
- **Postgres (pgvector)** is the source of truth; **Redis** backs the job queue, exact-match cache, and budget accounting

---

## Repository Layout

| Path | Description |
|---|---|
| `apps/web/` | Next.js 16 + React 19 + Tailwind 4 browser app |
| `apps/api/` | Hono HTTP API (`src/index.ts`) + BullMQ worker (`src/worker.ts`) |
| `packages/contracts/` | Shared Zod schemas + TypeScript types (`@layerflow/contracts`) |
| `packages/model-registry/` | Typed catalog of providers, models, pricing (micro-dollars), capabilities |
| `terminal/` | Go CLI (`lf`) — Cobra commands + Bubble Tea TUI, sessions, MCP, daemon |
| `docs/` | Product/engineering docs, plans, ops runbooks |
| `scripts/` | Deployment + ops shell scripts |
| `docker-compose.yml` | Local dev: Postgres 16 (pgvector) + Redis 7 |

---

## Three Surfaces — Detailed

### 1. Web App (`apps/web/`)

| Area | Path | Description |
|---|---|---|
| Marketing | `app/(marketing)/` | Landing page, blog, pricing, docs |
| Auth | `app/(auth)/` | Sign-in (Better Auth — email/password + Google OAuth) |
| Dashboard | `app/(dashboard)/` | The logged-in application |
| API Mount | `app/api/[[...route]]/` | Catch-all Hono mount at `/api/*` |
| Gateway Mount | `app/v1/[[...route]]/` | OpenAI-compatible gateway at `/v1/*` |

**Dashboard Pages:**

| Page | Path | What It Does |
|---|---|---|
| Home | `home/` | Overview dashboard |
| Chat | `chat/`, `chat/[id]/` | Multi-model chat sessions with SSE streaming |
| Agents | `agents/`, `agents/[id]/`, `agents/new/` | Agent templates, runs, lifecycle |
| Workspace | `workspace/` | Projects, domains, folders, prompts |
| History | `history/` | Prompt history |
| Memory | `memory/` | Workspace memories + semantic search |
| Search | `search/` | Keyword + semantic search |
| Models | `models/` | Model catalog + availability |
| Costs | `costs/` | Spend breakdown, budget progress |
| Keys | `keys/` | Gateway API keys + BYOK provider keys |
| Settings | `settings/` | Workspace settings, routing mode |
| Team | `team/` | Members, roles, invitations |
| Billing | `billing/` | Subscription, checkout, invoices |
| Files | `files/` | File uploads (local or R2) |
| Terminal | `terminal/` | Web terminal REPL |
| Autosubmit | `autosubmit/` | Auto-submission settings |

**Component Structure:**
- `components/ui/` — Design-system primitives (button, modal, table, toast, etc.)
- `components/features/<area>/` — Feature-specific components (chat, history, memory, prompts, rescue, team, workspace, home)
- `components/layout/` — Dashboard chrome: sidebar, topbar, command menu, mobile nav
- `components/auth/` — Sign-in form + auth guard
- `components/landing/` — Marketing sections
- `lib/services/` — Client-side service layer (one module per API area)
- `lib/providers/` — React context providers (AuthProvider from Better Auth)
- `lib/hooks/` — React hooks (copy, command menu, mobile detection)

---

### 2. API + Worker (`apps/api/`)

**Two entrypoints, one codebase:**
- `src/index.ts` — Hono HTTP API (port 8787)
- `src/worker.ts` — BullMQ job worker (rescue, compare, embeddings, alerts, digests)

**Internal Structure:**

| Path | Purpose |
|---|---|
| `src/app.ts` | Hono app assembly — mounts all route groups |
| `src/routes/` | HTTP layer — one folder per feature area (29 total) |
| `src/services/` | Business logic — one folder per feature area (27 total) |
| `src/gateway/` | OpenAI-compatible `/v1` gateway: routing, cache, budgets, failover |
| `src/auth/` | Better Auth setup (email/password + Google + device/API keys) |
| `src/db/` | Drizzle ORM schema (22 schema files) + Postgres client |
| `src/redis/` | Redis connection + helpers |
| `src/jobs/` | BullMQ queue definitions + processors |
| `src/cache/` | Exact-match response cache |
| `src/middleware/` | Auth / rate-limit / plan enforcement |
| `src/config/` | Env validation (Zod) + admin config |
| `src/observability/` | Sentry + pino logging |
| `src/test/` | Test helpers (PGlite in-memory Postgres, mocked Redis) |

**All API Route Groups (29):**

| Route Group | File | Auth | Description |
|---|---|---|---|
| `/api/admin` | `admin/analytics` | Email allowlist | Admin analytics |
| `/api/autosubmit` | `autosubmit/autosubmit` | Session | Auto-submission settings |
| `/api/workspaces` | `workspace/workspaces` | Session | Current workspace + rename |
| `/api/domains` | `workspace/domains` | Session | Domain organization |
| `/api/projects` | `workspace/projects` | Session | Project organization |
| `/api/folders` | `workspace/folders` | Session | Folder organization |
| `/api/activity` | `workspace/activity` | Session | Recent workspace activity feed |
| `/api/prompts` | `prompts/prompts` | Session | CRUD, immutable versions, restore, clone |
| `/api/sessions` | `sessions/sessions` | Session | Prompt sessions + messages |
| `/api/files` | `files/files` | Session | Upload/download (local or R2 presigned) |
| `/api/runs` | `runs/runs` | Session | Model runs (budget reserve → provider → SSE) |
| `/api/audio` | `audio/audio` | Session | Text-to-speech (ElevenLabs) |
| `/api/billing` | `billing/billing` | Session | Subscription, checkout, webhook (Dodo Payments) |
| `/api/compare` | `compare/compare` | Session | Multi-model compare jobs (BullMQ) |
| `/api/intelligence` | `intelligence/intelligence` | Session | Prompt analysis, model recommendations |
| `/api/workspace/settings` | `intelligence/settings` | Session | Routing mode (manual/suggest/auto) |
| `/api/routing-rules` | `intelligence/routing-rules` | Session | Custom routing rules |
| `/api/budgets` | `budgets/budgets` | Session | Monthly/daily limits + live spend |
| `/api/usage` | `budgets/usage` | Session | Spend summary + threshold alerts |
| `/api/savings` | `budgets/usage` | Session | Cache-hit / cheaper-model savings |
| `/api/keys` | `keys/api-keys` | Session | Gateway API keys (`lf_live_…`) |
| `/api/provider-keys` | `keys/provider-keys` | Session | BYOK provider keys (AES-256-GCM) |
| `/api/memory` | `memory/memories` | Session | Memories + pgvector semantic search |
| `/api/search` | `search/search` | Session | Keyword search |
| `/api/similar` | `search/search` | Session | Semantically similar prompts |
| `/api/learning` | `learning/learning` | Session | Learning paths, lessons, challenges |
| `/api/rescue` | `rescue/rescue` | Session | Rescue reports (rate-limited, paid LLM) |
| `/api/improve` | `improve/improve` | Session | Improve + score a prompt (paid LLM) |
| `/api/agents` | `agents/agents` | Session | Agent templates + runs + lifecycle |
| `/api/chat` | `chat/chat` | Session | Chat sessions, provider switch, auto-switch |
| `/api/models` | `models/models` | Session | Model catalog + availability |
| `/api/collections` | `community/collections` | Session | Public prompt collections |
| `/api/profiles` | `community/profiles` | Session | User profiles |
| `/api/follows` | `community/profiles` | Session | Follow relationships |
| `/api/likes` | `community/social` | Session | Like relationships |
| `/api/comments` | `community/social` | Session | Comments |
| `/api/notifications` | `notifications/notifications` | Session | Notifications + mark-read |
| `/api/team` | `team/team` | Session | Members, roles, invitations, RBAC |
| `/api/v1/sync` | `sync/sync` | Session | CLI sync protocol (handshake/push/pull) |
| `/api/v1/terminal` | `terminal/terminal` | Session | Terminal operations |
| `/api/v1/auth` | `auth/device` | Device OAuth | CLI device login flow |
| `/api/ws` | `ws/ws` | WebSocket | Real-time WebSocket |
| `/v1/*` | `gateway/router.ts` | API Key | OpenAI-compatible gateway |

**Gateway Routes (`/v1/*`):**

| Route | Method | Description |
|---|---|---|
| `/v1/models` | GET | List available models with availability badges |
| `/v1/chat/completions` | POST | OpenAI-compatible chat completions (streaming + non-streaming) |
| `/v1/improve` | POST | Improve a prompt (API-key auth for CLI) |
| `/v1/usage` | GET | Workspace budget + plan info (API-key auth for CLI) |

**Two Auth Styles:**
- `/api/*` — Browser session cookie (Better Auth, `requireAuth` middleware)
- `/v1/*` — LayerFlow API key (`Authorization: Bearer lf_…`, `requireApiKey` middleware)

---

### 3. Terminal Agent (`terminal/`)

A local-first AI terminal workspace with a full-screen Bubble Tea TUI.

**Installation:**
- macOS/Linux: `brew install Rohit94r/tap/lf` or `curl -fsSL https://layerflow.dev/install | bash`
- Windows: `powershell -ExecutionPolicy Bypass -c "irm https://layerflow.dev/install.ps1 | iex"`
- Build from source: `go build ./...` in `terminal/`

**CLI Commands:**

| Command | Description |
|---|---|
| `lf` | Launch full-screen TUI (home → chat, palette, sessions, models) |
| `lf login` | Login with LayerFlow platform key (`lf_live_…`) via browser device-code flow |
| `lf logout` | Revoke + purge tokens |
| `lf chat [query]` | Streaming chat session (interactive + `--non-interactive`) |
| `lf run "<task>"` | Single-shot task agent with tool approvals |
| `lf sessions` | List/delete persisted sessions (SQLite) |
| `lf sync [--dry-run]` | Force push/pull with cloud sync API |
| `lf models [--json]` | List gateway models |
| `lf doctor [--audit]` | Diagnostics: config, storage, keychain, audit chain |
| `lf rescue` | Export portable snapshot of sessions/messages |
| `lf cost [--session ID]` | Token + cost usage from local store |
| `lf mcp list` | List MCP servers from config |
| `lf daemon start/stop/status` | Background daemon lifecycle |
| `lf upgrade` | Check GitHub for newer release |
| `lf version` | Show build version |
| `lf content plan/draft/status/keywords/cron` | Content marketing automation |

**Keyboard Shortcuts (TUI):**

| Key | Action |
|---|---|
| `Enter` | Send / submit |
| `Shift+Enter` / `Ctrl+J` | Newline in input |
| `Esc` | Back / close overlay |
| `Ctrl+P` | Command palette |
| `Ctrl+R` | Search files |
| `Ctrl+K` | Sessions |
| `Ctrl+M` | Switch model |
| `Ctrl+T` | Activity |
| `Ctrl+N` | New session |
| `?` | Help |
| `↑` / `↓` | Navigate / recall input history |
| `Ctrl+C` | Cancel stream → close overlay → quit |

**Slash Commands:**

| Command | Description |
|---|---|
| `/help` | Show help |
| `/model` | Switch model |
| `/provider` | Switch provider |
| `/status` | Show routing status |
| `/new` | New session |
| `/sessions` | List sessions |
| `/compact` | Compact history |
| `/memory on/off/list/forget` | Memory management |
| `/search` | Search files |
| `/sync` | Sync with cloud |
| `/cost` | Show cost |
| `/undo` | Undo last edit |
| `/git` | Git operations |
| `/doctor` | Run diagnostics |

**Internal Architecture:**

```
terminal/
├── cmd/lf/              Cobra command definitions
├── internal/
│   ├── tui/             Bubble Tea full-screen TUI (22 files)
│   ├── app              Application composition
│   ├── cmds             Slash commands
│   ├── session          Session management (SQLite)
│   ├── providers        LLM providers (OpenAI, Anthropic, Gemini, local)
│   ├── tools            Permissioned tool framework
│   ├── permission       Permission engine
│   ├── memory           Memory engine
│   ├── search           Hybrid search (filename + content + git + embeddings + memory)
│   ├── sync             Bidirectional sync → dashboard
│   ├── git              Git integration
│   ├── lsp              LSP client
│   ├── mcp              MCP client
│   ├── daemon           Background daemon
│   ├── auth             OAuth + keyring
│   ├── config           Layered config (default → user → project)
│   ├── storage          SQLite storage
│   ├── sandbox          Sandboxing
│   ├── context          Context management
│   ├── compact          History compaction
│   └── audit            Audit log
└── pkg/
    ├── oaitype          OpenAI-compatible types
    ├── markdown         Terminal markdown rendering
    └── diff             Diff parser
```

---

## Feature Deep-Dives

### Rescue (`/api/rescue`)

**Purpose:** Rescue dead AI conversations by extracting context, improving the prompt, and providing a continue-pack.

**How It Works:**
1. User pastes a dead conversation via `POST /api/rescue`
2. A session is created and a BullMQ job is queued
3. The worker runs an LLM extraction pipeline producing:
   - **Context summary** — structured extraction of goal, current state, decisions, constraints, failures, successes, missing info, output format, next action
   - **Improved prompt** — a sharpened, low-token version of the original prompt
   - **Prompt scores** — quality metrics on the improved prompt
   - **Context diff** — kept/removed/unsure sections from the original conversation
   - **Cost estimates** — token usage and cost breakdown
   - **Recommended model** — which model to use next
   - **Continue pack** — ready-to-use messages to resume the conversation
4. Report is returned as `202` and updated in-place by the worker

**Response Shape:**
```typescript
{
  id, workspaceId, sessionId, projectId, sourceTool, sourceModel,
  status, summary, context: { goal, currentState, decisions, constraints, failures, successes, missingInfo, outputFormat, nextAction },
  improvedPrompt, promptScore, promptScores, diff: { kept, removed, unsure },
  costs, recommendedModelId, recommendedReason, continuePack,
  originalWords, compressedWords, compressionPercent
}
```

**Rate Limit:** 10 requests/minute per user (paid LLM call).

---

### Improve (`/api/improve`)

**Purpose:** Score and sharpen a rough prompt into a low-token, high-quality prompt.

**How It Works:**
1. User sends a rough prompt via `POST /api/improve`
2. An LLM call analyzes and rewrites the prompt
3. Returns the improved prompt with quality scores

**Rate Limit:** 20 requests/minute per user (paid LLM call).

---

### Chat (`/api/chat`)

**Purpose:** Multi-model chat sessions with manual and auto provider switching.

**How It Works:**
1. Create a session: `POST /api/chat` (optionally imported from a rescue report)
2. Send messages: `POST /api/chat/:id/messages` — returns SSE stream
3. The router selects the model, handles failover, and streams tokens
4. Events: `start` (model/provider/key), `delta` (text chunks), `switched` (model change), `done` (final message), `error`
5. Manual model switch: `POST /api/chat/:id/switch`
6. Auto-switch toggle: `PATCH /api/chat/:id/auto-switch`
7. Keys health: `GET /api/chat/keys-health` — status dots for model picker

**SSE Event Types:**
- `start` — `messageId`, `model`, `provider`, `keyHint`
- `delta` — `text` chunk
- `switched` — `fromModel`, `toModel`, `reason`
- `done` — final `message` object
- `error` — `code`, `message`

**Rate Limit:** 30 streaming messages/minute per user.

---

### Gateway (`/v1/*`)

**Purpose:** OpenAI-compatible API gateway with exact-match caching, budget enforcement, and BYOK key management.

**How It Works:**
1. Client sends `POST /v1/chat/completions` with API key
2. Gateway resolves the model, loads the provider API key (platform or BYOK)
3. Checks exact-match cache — returns cached response if hit
4. Reserves budget (estimated cost)
5. Routes to the appropriate provider adapter (OpenAI, Anthropic, Gemini, Groq, DeepSeek, Kimi, xAI)
6. Streams or returns the completion
7. Settles budget with actual cost
8. Caches the response for future exact matches
9. Logs the gateway request

**Features:**
- **Exact-match caching** — identical requests return cached responses (TTL configurable)
- **Budget reserve/settle** — estimates cost upfront, settles with actuals
- **BYOK support** — user's own provider keys encrypted at rest (AES-256-GCM)
- **Savings headers** — `x-layerflow-tokens-saved`, `x-layerflow-cost-saved-micro`, `x-layerflow-cache`
- **Streaming + non-streaming** — both supported
- **Tool calling** — passthrough for tool-calling requests (bypasses compression/routing)

**Model Selection:** Uses `@layerflow/model-registry` for pricing, capabilities, and cost computation.

---

### Agents (`/api/agents`)

**Purpose:** Agent templates, runs, start/pause/resume lifecycle, approvals, scheduling, and progress tracking.

**How It Works:**
1. Browse templates: `GET /api/agents/templates`
2. Create agent: `POST /api/agents` (name, role, goal, system prompt, model, tools, schedule)
3. Start agent: `POST /api/agents/:id/start` — queues a background run
4. Monitor progress: `GET /api/agents/:id/progress` or SSE stream `GET /api/agents/:id/stream`
5. Approve/reject actions: `POST /api/agents/:id/approve`
6. Set cron schedule: `POST /api/agents/:id/schedule`
7. View logs: `GET /api/agents/:id/logs`

**Agent Data Model:**
- `Agent` — templates with role, goal, system prompt, model, tools, schedule, metrics
- `AgentRun` — individual executions with input/output, status, cost, latency
- `AgentStep` — chronological durable events (timeline)
- `AgentApproval` — pending actions requiring human approval (risk levels)
- `AgentMemory` — agent-scoped memories (kind, importance)
- `AgentDocument` — linked files (resumes, etc.)
- `ApplicationRecord` — job application tracking (for job-search agents)

**Lifecycle:** `active` → `paused` → `active`, with `start`, `pause`, `resume` endpoints.

---

### Budgets & Usage

**Purpose:** Monthly/daily spending limits, live spend tracking, threshold alerts, and savings suggestions.

**Endpoints:**
- `GET /api/budgets/current` — current budget status (monthly limit, spent, remaining, percent, blocked)
- `PUT /api/budgets/current` — update budget limits
- `GET /api/budgets/scopes` — budget scopes (workspace, project, per-key)
- `PUT /api/budgets/scopes` — replace budget scopes
- `GET /api/usage` — spend summary + threshold alerts
- `GET /api/savings` — cache-hit and cheaper-model savings suggestions

**How It Works:**
- Budgets are enforced at the gateway and chat layers
- Reserve → Execute → Settle pattern prevents overspending
- Hard blocks stop requests when limit is exceeded
- Scopes allow per-project or per-key budget limits

---

### Memory (`/api/memory`)

**Purpose:** Workspace-level memories with pgvector semantic search.

**Endpoints:**
- `GET /api/memory` — list memories
- `POST /api/memory` — create memory
- `GET /api/memory/:id` — get single memory
- `PATCH /api/memory/:id` — update memory
- `DELETE /api/memory/:id` — delete memory
- `GET /api/memory/search?q=` — semantic search (pgvector)

**How It Works:**
- Memories are stored with embeddings in pgvector
- Semantic search uses vector similarity
- Falls back to keyword search if embeddings unavailable
- Memories sync from CLI to dashboard via `/api/v1/sync/*`

---

### Workspace

**Purpose:** Hierarchical organization of AI work.

**Structure:**
- **Workspace** — top-level container (team-owned)
- **Domains** — broad categories
- **Projects** — specific initiatives within domains
- **Folders** — organizational units within projects
- **Prompts** — individual prompts with immutable versions
- **Sessions** — prompt execution sessions with messages
- **Files** — uploaded files (local disk or R2 presigned URLs)
- **Activity** — recent workspace activity feed

---

### Team & RBAC (`/api/team`)

**Purpose:** Multi-user workspaces with role-based access control.

**Roles:**
- `owner` — full control
- `admin` — manage members, settings
- `member` — standard access

**Features:**
- Member management
- Invitation system
- Role-based permissions (RBAC)
- Per-resource access control

---

### Community

**Purpose:** Public prompt sharing and social features.

**Endpoints:**
- `/api/collections` — public prompt collections
- `/api/profiles` — user profiles
- `/api/follows` — follow users
- `/api/likes` — like prompts
- `/api/comments` — comment on prompts
- `/api/notifications` — notification feed + mark-read

---

### Learning (`/api/learning`)

**Purpose:** Structured learning paths for prompt engineering.

**Features:**
- Learning paths (curated sequences)
- Individual lessons
- Challenges (hands-on exercises)
- Progress tracking

---

### Billing (`/api/billing`)

**Purpose:** Subscription management via Dodo Payments.

**Features:**
- Subscription status
- Checkout flow
- Webhook handling
- Three tiers: Starter, Pro, Team

---

### Content Marketing Automation (`lf content`)

**Purpose:** Ranking-safe content-marketing workflow for the LayerFlow blog.

**Commands:**
- `lf content plan --weeks 4 --per-week 3` — generate publishing calendar
- `lf content draft <slug>` — generate draft from real LayerFlow data
- `lf content status` — see what's due
- `lf content keywords --file search-console.csv` — rank keywords by opportunity
- `lf content autopublish` — fully-automatic daily publishing with quality gates

**Quality Gates:** Posts under minimum length, missing required sections, or containing placeholders are rejected and never pushed.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, Tailwind 4 |
| Backend | Hono (HTTP), BullMQ (jobs) |
| Database | Postgres 16 + pgvector (Drizzle ORM) |
| Cache/Queue | Redis 7 |
| Auth | Better Auth (email/password + Google OAuth + device flow) |
| CLI | Go (Cobra + Bubble Tea) |
| Billing | Dodo Payments |
| Email | Resend |
| Files | Local disk or Cloudflare R2 |
| Monitoring | Sentry + pino |
| Testing | Vitest (TS), Go test |
| Deployment | Docker, Render Blueprint, Vercel |

---

## Supported AI Providers

| Provider | Platform Key Env Var | BYOK |
|---|---|---|
| OpenAI | `OPENAI_API_KEY` | Yes |
| Anthropic | — | Yes |
| Gemini | `GEMINI_API_KEY` + `GEMINI_MODEL` | Yes |
| Groq | `GROQ_API_KEY` + `GROQ_MODEL` | Yes |
| DeepSeek | `DEEPSEEK_API_KEY` + `DEEPSEEK_MODEL` | Yes |
| Kimi | `KIMI_API_KEY` + `KIMI_MODEL` | Yes |
| xAI | `XAI_API_KEY` + `XAI_MODEL` | Yes |

---

## Key Files Reference

| File | Why It Matters |
|---|---|
| `apps/api/src/routes/index.ts` | All API routes registered here |
| `apps/api/src/middleware/auth.ts` | Auth middleware — session and API key |
| `apps/api/src/services/chat/router.ts` | Model selection, failover, cost reserve |
| `apps/api/src/gateway/router.ts` | OpenAI-compatible gateway |
| `apps/web/lib/services/chat.ts` | Frontend chat service (SSE streaming) |
| `apps/web/components/features/terminal/terminal-repl.tsx` | Web terminal REPL |
| `packages/contracts/src/index.ts` | Shared types (web ↔ API) |
| `packages/model-registry/src/index.ts` | Model catalog, pricing, capabilities |
| `terminal/cmd/lf/root.go` | CLI command registration |
| `terminal/internal/tui/` | Go TUI entry points (Bubble Tea) |

---

## Testing

```bash
# Web unit tests
npm test

# API unit + integration tests (PGlite + mocked Redis)
npm test --workspace @layerflow/api

# Typecheck everything
npx tsc --noEmit -p tsconfig.json

# API smoke check (needs running API)
npm run smoke --workspace @layerflow/api

# Go build + tests
cd terminal && go build ./... && go test ./...
```

---

## Deployment

- **Local dev:** `npm run dev` (web :3000 + api :8787 + worker)
- **Local infra:** `docker compose up -d` (Postgres + Redis)
- **API + worker:** Render Blueprint (`render.yaml`) or VPS Docker
- **Frontend:** Vercel (Root Directory: `apps/web`)
- **CLI releases:** tag `v*` → GoReleaser → public binaries repo
