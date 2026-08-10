# LayerFlow — All Technology Stack

> LayerFlow is the AI Coding Platform — web + terminal, with a rescue workflow for AI context.
> Promise: **Anyone can code with AI — and never lose context again.**

This document defines the complete technology stack for LayerFlow: frontend,
backend, data, AI workflows, the terminal CLI, agent runtime, infrastructure,
and engineering standards.

> **Status note:** The product is currently in a **frontend-first build phase**.
> Everything below is the target architecture. The frontend runs on realistic
> mock data until the backend is rewritten against this spec.

---

## 1. Product Shape

LayerFlow is a web + terminal AI coding platform. It turns plain English into
improved prompts, runs them with multiple agents, and turns messy AI
conversations into reusable, portable, cheaper AI work.

Core artifacts:

| Artifact | What it is |
| --- | --- |
| Coding Workspace | Web editor — plain English → Improve → run with agents |
| Browser Terminal | Same terminal as the CLI, live in the browser |
| Agent Runtime | Implement / review / test agents, each with own model + budget |
| Rescue Report | Full output of analyzing one pasted conversation |
| Context Passport | Portable memory package (goal, state, decisions, constraints, next action…) |
| Continue Pack | Copy-ready continuation for any AI model |
| Prompt Library | Improved, versioned prompts with scores |
| Prompt Improver | Plain English → scored, structured prompt (0–100) |
| Auto Context Cutting | Long chats/repo context cut to only what the task needs |
| Workspace | Projects, saved context, learnings, timeline, search |
| Cost Engine | Dollar-based estimates across models |
| Model Router | Best model suggestion with an explanation |
| `lf` CLI | Terminal client, session-parity with web |

---

## 2. Frontend Stack

| Concern | Choice | Why |
| --- | --- | --- |
| Framework | Next.js 16 (App Router, React 19) | SSR landing, client dashboard, file routes |
| Language | TypeScript 5 (strict) | Shared contracts with backend |
| Styling | Tailwind CSS v4 | Design tokens via `@theme`, low runtime cost |
| Motion | Framer Motion 11 | Micro-animations, page transitions |
| Icons | Lucide React | Consistent icon system |
| Charts | Custom SVG components (Framer Motion driven) | Design-system fit, no heavy chart dep |
| Forms | Native + zod validation | Enough for mock phase, contracts ready |
| Auth client | better-auth (email + Google) | Existing setup, kept |
| Theme | CSS variables, dark-first with light mode | Existing theme system, kept |
| Fonts | Geist Sans + Geist Mono (npm `geist`) | Vercel's brand font — terminal-native look |

### Frontend architecture

```
app/
  (marketing)/        Landing, pricing (public)
  (app)/              Authenticated workspace shell
  api/                Hono mount (backend routes)
lib/
  data/               Mock data layer (frontend-first phase)
  ui/                 Design system primitives
components/
  landing/            Marketing sections
  app/                Workspace sections + shell
```

### Frontend rules

- Server components by default; `"use client"` only when interactivity is needed.
- All mock data flows through `lib/data` with a typed, async-like API so the
  swap to real `lib/api` later is a one-file change.
- No `any`. No inline `style`. All spacing/colors from design tokens.
- Every interactive element is keyboard accessible and has focus styles.

---

## 3. Backend Stack

| Concern | Choice |
| --- | --- |
| API | Hono (mounted under `/api/*` in Next; standalone later) |
| Validation | Zod v4 + `@layerflow/contracts` shared package |
| Auth | better-auth (email/password + Google OAuth) |
| ORM | Drizzle ORM |
| Background jobs | BullMQ on Redis (worker in `apps/api`) |
| Rate limiting | Redis sliding window |

### Service boundaries (target)

```
next (web)  ──>  hono api  ──>  drizzle/postgres
                  │
                  ├── provider-keys vault (encrypted)
                  ├── cost engine (pure, cacheable)
                  ├── model router (rules + provider health)
                  ├── rag indexer (embeddings)
                  └── bullmq jobs (import, compress, embed)
```

---

## 4. Database

Primary store: **PostgreSQL 16**.

### Core tables (target)

| Table | Purpose |
| --- | --- |
| `users` | Auth + plan |
| `workspaces` / `projects` | Organizational tree |
| `conversations` | Raw pasted chat, source model detection |
| `rescue_reports` | Report envelope (summary, diff, scores) |
| `context_passports` | Portable memory package (JSONB fields) |
| `prompts` / `prompt_versions` | Prompt library with history |
| `continue_packs` | Generated continuations + feedback |
| `learnings` | Learning memory |
| `timeline_events` | AI Work Ledger |
| `provider_keys` | Encrypted BYOK keys |
| `cost_estimates` | Cache of estimate runs |
| `feedback` | Outcome feedback (worked / missing context / …) |

### PostgreSQL features used

- `pgvector` for embeddings (`context_chunks` table) — MVP RAG.
- JSONB for flexible passport fields.
- Full-text search + `pg_trgm` for context search; dedicated search service
  (Typesense/Meilisearch) only when traffic demands it.

---

## 5. Redis

Used for:

- Session/rate-limit state
- Exact prompt cache (L2)
- Semantic prompt cache (L3, later)
- Cost estimate cache
- Provider health + model availability
- BullMQ job queues

Cache layers:

```
L1  in-process hot config (pricing, routing rules)
L2  Redis exact cache  (identical requests)
L3  Redis semantic cache (similar prompts, later)
L4  pgvector / Qdrant retrieval
```

Safety rules: cache keys always scoped to `user:workspace:model`; never cache
private payloads across users; every response tagged `fresh | exact-cache | semantic-cache`.

---

## 6. Storage

| Kind | Choice | Use |
| --- | --- | --- |
| Object storage | S3-compatible (Cloudflare R2 or AWS S3) | Exported reports, uploaded chats, backups |
| Presigned URLs | AWS SDK presigner | Direct client upload/download |
| Local dev | MinIO via docker-compose | Parity |

---

## 7. RAG & Memory

MVP: **PostgreSQL + pgvector + Redis cache.**

Scale path: **Qdrant** for dedicated vector search, PostgreSQL remains source
of truth, Redis semantic cache on top.

Ingestion pipeline (target):

```
paste chat
  -> clean / dedupe
  -> chunk (semantic boundaries, ~800 tokens)
  -> embed (cheap model, e.g. text-embedding-3-small or gemini-embedding)
  -> store original + chunk + passport summary
  -> index for search
```

Retrieval: hybrid (vector similarity + keyword) with `user:workspace` tenant
filtering, top-k re-ranked, then fed to prompt building.

---

## 8. Authentication

- **better-auth** — email/password + Google OAuth (existing setup).
- Session cookie, same-origin mounting (`/api/auth/*`).
- Admin gate by `ADMIN_EMAILS` (server-enforced).
- Future: workspace invites, SSO only after enterprise demand.

---

## 9. Payments

| Stage | Choice |
| --- | --- |
| Mock phase | No payments — plan gating via mock |
| Launch | Stripe Checkout + Customer Portal |
| Billing model | Free / Starter $5 / Pro $14 per month |
| Hard rule | **Never sell unlimited hosted AI credits.** Price the workflow. |

Stripe webhooks update `subscriptions` table → usage entitlement in API
middleware. BYOK users are charged nothing for inference.

---

## 10. Email

- **Resend** (API) + React Email templates.
- Transactional: sign-in codes, plan changes, weekly context digest
  (optional), failed-key alerts.
- Marketing: separate ESP later (e.g. Loops) — do not mix transactional + campaigns.

---

## 11. Observability

| Concern | Tool |
| --- | --- |
| Errors | Sentry (web + API + worker) |
| Logs | pino structured logs → log drain |
| Metrics | OpenTelemetry + Prometheus-style counters |
| AI traces | LangSmith-style traces per Rescue Report step (later) |
| Evals | Manual eval set first → Promptfoo/Ragas |

Critical metrics:

- Rescue Report completion rate
- Continue Pack copy rate + outcome feedback distribution
- Median time paste → report
- Compress ratio distribution
- Cost estimate accuracy vs provider invoices
- BYOK key error rate

---

## 12. Analytics

- **PostHog** (product analytics, funnels, retention, feature flags).
- Landing: anonymous events; dashboard: workspace-scoped events.
- Privacy: raw chat content never sent to analytics; only derived metrics.

---

## 13. AI Layer

| Job | Model class | Why |
| --- | --- | --- |
| Source detection | Cheap classifier / regex first | Instant, free |
| Summarization | Mid-tier (Gemini Flash / Sonnet Haiku) | Fast + cheap |
| Compression | Mid-tier with extraction checklist | Deterministic output shape |
| Prompt improvement | Strong model (Sonnet / GPT-4o-mini tier) | Quality matters here |
| Cost/quality judgment | Heuristic + tiny model | Deterministic where possible |
| Embeddings | text-embedding-3-small / gemini-embedding | Cheap vectors |

Providers: OpenAI, Anthropic, Google, DeepSeek, Kimi (Moonshot), Groq,
OpenRouter. **BYOK-first:** user keys when provided; hosted keys only as
capped Pro credits.

---

## 14. Terminal CLI (`lf`)

### Install (end users)

| Method | Command |
| --- | --- |
| npm (recommended) | `npm install -g @layerflow/cli` |
| curl installer | `curl -fsSL https://layerflow.dev/install.sh \| bash` |
| Homebrew (macOS) | `brew install layerflow/tap/lf` |
| Verify | `lf --version` → `lf 0.4.1` |

No API keys and no account needed to try it. Keys (BYOK) are stored in the OS
keychain / `~/.layerflow/config.json` (encrypted) and sync with the web vault
when the user signs in.

### Commands (v1)

| Command | What it does |
| --- | --- |
| `lf run "<plain english>"` | Improve prompt → pick model → check cost → run agents → save session |
| `lf run --context repo` | Include repo context (LAYERFLOW.md + git + file tree), auto-cut to essentials |
| `lf rescue <file-or-paste>` | Dead chat → Rescue Report → Continue Pack |
| `lf improve "<prompt>"` | Score + improve a single prompt (0–100) |
| `lf cost --repo` | Dollar estimate across models before running |
| `lf agents --implement <m> --review <m> --test <m>` | Configure parallel agents |
| `lf session --open <id>` | Reopen a past session (same context/decisions/files) |
| `lf init` | Create `LAYERFLOW.md` + `.layerflow/` in a repo |
| `lf context` | Build repo Context Passport |
| `lf git` | Explain changes, draft commit notes |

### CLI architecture

```
lf (Node/Bun binary, ~40KB core)
  ├── commands/        one file per command (run, rescue, improve, cost…)
  ├── tui/             raw TTY rendering (sessions, diffs, agent panels)
  ├── runtime/         session client (JSON-RPC over WebSocket to API)
  ├── context/         repo scanner → context cut (same engine as web)
  ├── vault/           OS keychain wrapper + encrypted config
  └── telemetry/       anonymized usage events
```

CLI ↔ API transport: **WebSocket (JSON-RPC)** for live agent events
(streamed token chunks, tool calls, terminal output, status changes) with
**REST fallback** for batch commands (`lf cost --repo`). Offline mode: cache
last 20 sessions locally, queue events, sync on reconnect.

Session parity rule: a session started in the web workspace and one started
from `lf run` produce identical files — same passport fields, same prompt
versions, same ledger events. Web and CLI are two frontends to one session
store.

### Terminal backend (how to build it)

```
POST /v1/sessions                 create session (plan, model picks)
WS   /v1/sessions/:id/stream      live event stream (agent ↔ user)
POST /v1/sessions/:id/command     user input → running agent
POST /v1/sessions/:id/approve     human approval of tool call (write/exec)
GET  /v1/sessions/:id/snapshot    full session state (resume)
```

Backend pieces:

1. **Session store** — Redis for live state (TTL 24h) + PostgreSQL for
   history. Every event is append-only (`session_events` table).
2. **Event bus** — Redis pub/sub: agent runtime publishes
   `session:<id>` events; both web (SSE) and CLI (WS) subscribe.
3. **Agent runtime** — Vercel AI SDK `streamText` with a typed tool registry
   (read_file, edit_file, run_command, write_file). Tool calls pause for
   human approval when the action is destructive.
4. **Execution** — web/managed: sandbox (E2B or Modal) per session; CLI:
   local child processes with a permission prompt per command.
5. **Cost guard** — before each run: `cost_estimates` check, model router
   pick, budget cap enforced mid-stream (stream cancels over budget).
6. **Context cutting** — shared `lib/context` engine: chat → clean → dedupe →
   extract essentials → cut to token budget; repo → git-aware scanner →
   relevant-file picker → same token budget.

---

## 15. Agent Runtime

### v1: single implement agent (typed state machine)

```
state: improve → plan → run → review → fix → done
```

- Tool registry: `read_file`, `edit_file`, `write_file`, `run_command`.
- Every step emits structured events (streamed to web + CLI).
- Human approval required for: `run_command` with side effects, edits outside
  the current file set.
- Budget: model, max tokens, max tool calls per run (from Cost Engine).

### v2: multi-agent (supervisor pattern, LangGraph.js)

- Supervisor spawns: **implement** (writes code), **review** (a11y, DX,
  correctness), **test** (build/test/lint), **docs** (optional).
- Each agent has its own model + budget (e.g. implement=gpt-4.1,
  review=claude-sonnet-4, test=gemini-flash).
- Review output feeds back to implement (finite fix loop, max 2 rounds).
- Checkpointing via LangGraph.js so runs resume after crashes.

### Why not a big framework day one

Same rule as the rescue pipeline: simple typed state machine first; adopt
LangGraph.js only when branching/multi-agent checkpoints are required. Never
start a run without the prompt improver + cost guard having run.

---

## 16. Future Architecture

| Phase | Adds |
| --- | --- |
| Phase 1 (now) | Frontend with mock data, rescue flow UX, coding workspace mock |
| Phase 2 | Hono API, Postgres, Redis, BullMQ, real rescue pipeline |
| Phase 3 | Web + terminal coding platform: agent runtime, browser terminal, prompt improver, cost guard |
| Phase 4 | `lf` CLI parity, repo passports, Git story |
| Phase 5 | Multi-agent supervisor, browser companion, SDK, marketplace, teams |

Scaling path for heavy workloads: BullMQ → Temporal when workflows need
checkpointing, resumability, or human-in-the-loop mid-run. Agent
orchestration: simple typed state machine → LangGraph.js when branching is
required.

---

## 17. Folder Structure

```
LayerFlow/
├── app/                    # Next.js app router
│   ├── (marketing)/        # Landing + pricing
│   ├── (app)/              # Auth-gated workspace (incl. /code)
│   ├── api/                # Hono mounts (/api, /v1)
│   ├── sign-in/
│   ├── globals.css
│   └── layout.tsx
├── components/
│   ├── auth/
│   ├── landing/            # Marketing sections
│   └── app/                # Dashboard UI
├── lib/
│   ├── api/                # API client + config (kept)
│   ├── auth-client.ts      # better-auth browser client (kept)
│   ├── auth-provider.tsx   # session context (kept)
│   ├── data/               # Mock data layer (frontend phase)
│   ├── theme.ts            # Theme system (kept)
│   └── ui/                 # Design-system primitives
├── apps/
│   └── api/                # Hono worker/API (backend, later)
├── packages/
│   ├── contracts/          # Shared zod schemas
│   └── model-registry/     # Model metadata + pricing
├── docs/                   # Engineering documentation
├── docker-compose.yml      # Local postgres/redis/minio
└── .env.example
```

---

## 18. Coding Standards

- TypeScript strict, no `any`.
- Zod schemas live in `packages/contracts`; UI types import from there.
- Component naming: `components/app/PassportCard.tsx` — PascalCase files.
- CSS: only design tokens, no magic values; utility classes for layout.
- No comments unless they explain *why* (never *what*).
- ESLint (next/core-web-vitals) + `tsc --noEmit` + `vitest` gate every PR.
- Feature files self-contained: `page.tsx` + section components + mock in `lib/data`.

---

## 19. Deployment

| Env | Target |
| --- | --- |
| Prod web | Vercel (Next) |
| Prod API/worker | Render (Hono + BullMQ worker) — `render.yaml` blueprint |
| DB | Managed Postgres (Neon/Supabase/RDS) |
| Redis | Upstash / managed |
| Storage | Cloudflare R2 |
| Preview | Vercel preview per PR |

`scripts/check-production.sh` gates deploys. `docker-compose.yml` runs
Postgres + Redis + MinIO locally.

---

## 20. Caching Strategy Summary

| Layer | Key | TTL |
| --- | --- | --- |
| L1 process | pricing table, routing rules | 5 min |
| L2 Redis | exact prompt → estimate/report | 24 h |
| L3 Redis | semantic near-duplicate prompts | 24 h (later) |
| L4 vectors | retrieval results | scoped per passport |

Every cache write honors user deletion requests (explicit invalidation).

---

## 21. Environment Variables

See `.env.example` — kept as the single source of truth. Never commit
provider keys; BYOK keys are encrypted at rest with a key-encryption key
from `PROVIDER_KEYS_KEK`.
