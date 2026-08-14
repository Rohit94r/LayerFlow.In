# LayerFlow — Poori Technology Stack (Simple Hinglish Mein)

> LayerFlow ek **AI Coding Platform** hai — web + terminal dono ke liye, jisme AI context kabhi lose na ho.
> Promise: **Koi bhi AI ke saath code kar sakta hai — aur context kabhi nahi khega.**

Ye document LayerFlow ki poori technology stack samjhaata hai — frontend, backend, database, AI workflows, terminal CLI, agent runtime, infrastructure, aur engineering standards. Sab kuch **simple Hinglish** mein taaki tum khud samajh sako ki is project mein kaunsi cheez kya karti hai, kaunsa language, kaunsi platform, aur kyun.

> **Status note:** Product abhi **frontend-first build phase** mein hai.
> Neeche jo target architecture likha hai wo final plan hai. Abhi frontend **mock data** pe chalta hai jab tak backend is spec ke hisaab se nahi banta.

---

## 1. Product Kya Hai? (Product Shape)

LayerFlow ek **web + terminal** AI coding platform hai. Ye plain English (aam bhasha) ko **improved prompts** mein badalta hai, unhe **multiple agents** ke saath chalta hai, aur messy AI conversations ko **reusable, portable, sasti AI work** mein badal deta hai.

### Core Cheezein (Main Artifacts):

| Artifact | Ye Kya Hai? |
| --- | --- |
| Coding Workspace | Web editor — plain English → Improve → agents ke saath run karo |
| Browser Terminal | CLI wala hi terminal, browser mein live |
| Agent Runtime | Implement / review / test agents, har ek ka apna model + budget |
| Rescue Report | Ek pasted conversation ka poori analysis |
| Context Passport | Portable memory package (goal, state, decisions, constraints, next action…) |
| Continue Pack | Kisi bhi AI model ke liye copy-ready continuation |
| Prompt Library | Improved, versioned prompts with scores |
| Prompt Improver | Plain English → scored, structured prompt (0–100) |
| Auto Context Cutting | Lambi chats/repo context ko sirf task ke hisaab se kaatna |
| Workspace | Projects, saved context, learnings, timeline, search |
| Cost Engine | Dollar-based estimates, models ke hisaab se |
| Model Router | Best model suggestion, explanation ke saath |
| `lf` CLI | Terminal client, web ke saath session-parity |

---

## 2. Frontend Stack (Jo User Ko Dikhta Hai)

| Concern | Choice | Kyun? |
| --- | --- | --- |
| Framework | Next.js 16 (App Router, React 19) | SSR landing page, client dashboard, file routes |
| Language | TypeScript 5 (strict) | Backend ke saath shared contracts |
| Styling | Tailwind CSS v4 | Design tokens via `@theme`, kam runtime cost |
| Motion | Framer Motion 11 | Micro-animations, page transitions |
| Icons | Lucide React | Consistent icon system |
| Charts | Custom SVG components (Framer Motion driven) | Design-system fit, heavy chart dependency nahi |
| Forms | Native + zod validation | Mock phase ke liye enough, contracts ready |
| Auth client | better-auth (email + Google) | Already setup hai, isi ko rakha |
| Theme | CSS variables, dark-first with light mode | Existing theme system, isi ko rakha |
| Fonts | Geist Sans + Geist Mono (npm `geist`) | Vercel ka brand font — terminal-native look |

### Frontend Architecture (Folder Ka Structure)

```
app/
  (marketing)/        Landing, pricing (public — sab dekh sakte)
  (app)/              Authenticated workspace shell (login ke baad)
  api/                Hono mount (backend routes)
lib/
  data/               Mock data layer (frontend-first phase)
  ui/                 Design system primitives
components/
  landing/            Marketing sections
  app/                Workspace sections + shell
```

### Frontend Rules

- Server components default; `"use client"` sirf tab jab interactivity chahiye.
- Saara mock data `lib/data` se flow hota hai, typed async-like API ke saath — taaki baad mein `lib/api` mein swap karna sirf one-file change ho.
- Koi `any` nahi. Koi inline `style` nahi. Saari spacing/colors design tokens se.
- Har interactive element keyboard accessible hai aur focus styles hai.

---

## 3. Backend Stack (Server Side)

| Concern | Choice |
| --- | --- |
| API | Hono (Next ke andar `/api/*` pe mount; baad mein standalone) |
| Validation | Zod v4 + `@layerflow/contracts` shared package |
| Auth | better-auth (email/password + Google OAuth) |
| ORM | Drizzle ORM |
| Background jobs | BullMQ on Redis (worker `apps/api` mein) |
| Rate limiting | Redis sliding window |

### Service Boundaries (Target)

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

## 4. Database (Data Store)

Primary store: **PostgreSQL 16** (ek bahut hi powerful, reliable database).

### Core Tables (Target)

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

### PostgreSQL Features Use Kiye

- `pgvector` embeddings ke liye (`context_chunks` table) — MVP RAG.
- JSONB flexible passport fields ke liye.
- Full-text search + `pg_trgm` context search ke liye; dedicated search service (Typesense/Meilisearch) tabhi jab traffic zyada ho.

---

## 5. Redis (Fast Cache / Temporary Storage)

Iska use:

- Session/rate-limit state
- Exact prompt cache (L2)
- Semantic prompt cache (L3, later)
- Cost estimate cache
- Provider health + model availability
- BullMQ job queues

Cache Layers:

```
L1  in-process hot config (pricing, routing rules)
L2  Redis exact cache  (identical requests)
L3  Redis semantic cache (similar prompts, later)
L4  pgvector / Qdrant retrieval
```

Safety rules: cache keys hamesha `user:workspace:model` ke hisaab se scope; private payloads kabhi users ke across cache nahi; har response pe tag `fresh | exact-cache | semantic-cache`.

---

## 6. Storage (Files Ke Liye)

| Kind | Choice | Use |
| --- | --- | --- |
| Object storage | S3-compatible (Cloudflare R2 ya AWS S3) | Exported reports, uploaded chats, backups |
| Presigned URLs | AWS SDK presigner | Direct client upload/download |
| Local dev | MinIO via docker-compose | Parity |

---

## 7. RAG & Memory (AI Ki Yaadshakt)

MVP: **PostgreSQL + pgvector + Redis cache.**
Scale path: **Qdrant** dedicated vector search ke liye, PostgreSQL source of truth rahega, Redis semantic cache upar.

Ingestion Pipeline (Target):
```
paste chat
  -> clean / dedupe
  -> chunk (semantic boundaries, ~800 tokens)
  -> embed (cheap model, e.g. text-embedding-3-small ya gemini-embedding)
  -> store original + chunk + passport summary
  -> index for search
```

Retrieval: hybrid (vector similarity + keyword) with `user:workspace` tenant filtering, top-k re-ranked, then prompt building ke liye feed.

---

## 8. Authentication (Login System)

- **better-auth** — email/password + Google OAuth (existing setup).
- Session cookie, same-origin mounting (`/api/auth/*`).
- Admin gate `ADMIN_EMAILS` se (server-enforced).
- Future: workspace invites, SSO sirf enterprise demand ke baad.

---

## 9. Payments (Paise Lena)

| Stage | Choice |
| --- | --- |
| Mock phase | Koi payments nahi — plan gating mock se |
| Launch | Stripe Checkout + Customer Portal |
| Billing model | Free / Starter $5 / Pro $14 per month |
| Hard rule | **Unlimited hosted AI credits kabhi bechna nahi.** Workflow ki pricing karo. |

Stripe webhooks `subscriptions` table update karte hai → API middleware mein usage entitlement. BYOK users ko inference ke liye kuch charge nahi.

---

## 10. Email

- **Resend** (API) + React Email templates.
- Transactional: sign-in codes, plan changes, weekly context digest (optional), failed-key alerts.
- Marketing: alag ESP baad mein (e.g. Loops) — transactional aur campaigns ko mix nahi karna.

---

## 11. Observability (System Ki Nigraani)

| Concern | Tool |
| --- | --- |
| Errors | Sentry (web + API + worker) |
| Logs | pino structured logs → log drain |
| Metrics | OpenTelemetry + Prometheus-style counters |
| AI traces | LangSmith-style traces per Rescue Report step (later) |
| Evals | Manual eval set pehle → Promptfoo/Ragas |

Critical Metrics:
- Rescue Report completion rate
- Continue Pack copy rate + outcome feedback distribution
- Median time paste → report
- Compress ratio distribution
- Cost estimate accuracy vs provider invoices
- BYOK key error rate

---

## 12. Analytics (User Ki Jaankari)

- **PostHog** (product analytics, funnels, retention, feature flags).
- Landing: anonymous events; dashboard: workspace-scoped events.
- Privacy: raw chat content kabhi analytics pe nahi; sirf derived metrics.

---

## 13. AI Layer (AI Models)

| Job | Model Class | Kyun? |
| --- | --- | --- |
| Source detection | Cheap classifier / regex pehle | Instant, free |
| Summarization | Mid-tier (Gemini Flash / Sonnet Haiku) | Fast + cheap |
| Compression | Mid-tier with extraction checklist | Deterministic output shape |
| Prompt improvement | Strong model (Sonnet / GPT-4o-mini tier) | Quality matters here |
| Cost/quality judgment | Heuristic + tiny model | Deterministic where possible |
| Embeddings | text-embedding-3-small / gemini-embedding | Cheap vectors |

Providers: OpenAI, Anthropic, Google, DeepSeek, Kimi (Moonshot), Groq, OpenRouter. **BYOK-first:** user apna key de tab use ho; hosted keys sirf capped Pro credits ke liye.

---

## 14. Terminal CLI (`lf`)

### Install (End Users Ke Liye)

| Method | Command |
| --- | --- |
| curl installer (macOS/Linux) | `curl -fsSL https://raw.githubusercontent.com/Rohit94r/layerflow-releases/main/install.sh \| bash` |
| Windows (WSL) | `curl -fsSL https://raw.githubusercontent.com/Rohit94r/layerflow-releases/main/install.sh \| bash` |
| Direct binary | `https://github.com/Rohit94r/layerflow-releases/releases/latest` se `.tar.gz`/`.zip` |
| Verify | `lf version` → `lf 0.4.1` |

Koi API key aur koi account ki zaroorat nahi try karne ke liye. Keys (BYOK) OS keychain / `~/.layerflow/config.json` (encrypted) mein store hoti hai aur sign-in pe web vault ke saath sync hoti hai.

### Commands (v1)

| Command | Ye Kya Karta Hai |
| --- | --- |
| `lf run "<plain english>"` | Improve prompt → model pick → cost check → agents run → session save |
| `lf run --context repo` | Repo context include karo (LAYERFLOW.md + git + file tree), auto-cut to essentials |
| `lf rescue <file-or-paste>` | Dead chat → Rescue Report → Continue Pack |
| `lf improve "<prompt>"` | Score + improve single prompt (0–100) |
| `lf cost --repo` | Dollar estimate models ke across, run se pehle |
| `lf agents --implement <m> --review <m> --test <m>` | Parallel agents configure karo |
| `lf session --open <id>` | Past session reopen karo (same context/decisions/files) |
| `lf init` | `LAYERFLOW.md` + `.layerflow/` repo mein create karo |
| `lf context` | Repo ka Context Passport banao |
| `lf git` | Changes explain karo, commit notes draft karo |

### CLI Architecture

```
lf (Node/Bun binary, ~40KB core)
  ├── commands/        one file per command (run, rescue, improve, cost…)
  ├── tui/             raw TTY rendering (sessions, diffs, agent panels)
  ├── runtime/         session client (JSON-RPC over WebSocket to API)
  ├── context/         repo scanner → context cut (web jaisa hi engine)
  ├── vault/           OS keychain wrapper + encrypted config
  └── telemetry/       anonymized usage events
```

CLI ↔ API transport: **WebSocket (JSON-RPC)** live agent events ke liye (streamed token chunks, tool calls, terminal output, status changes) with **REST fallback** batch commands ke liye (`lf cost --repo`). Offline mode: last 20 sessions locally cache, events queue, reconnect pe sync.

Session parity rule: web workspace mein jo session shuru hua aur `lf run` se jo shuru hua — dono ke files identical. Same passport fields, same prompt versions, same ledger events. Web aur CLI dono ek hi session store ke do frontends hai.

### Terminal Backend (Kaise Banayein)

```
POST /v1/sessions                 create session (plan, model picks)
WS   /v1/sessions/:id/stream      live event stream (agent ↔ user)
POST /v1/sessions/:id/command     user input → running agent
POST /v1/sessions/:id/approve     human approval of tool call (write/exec)
GET  /v1/sessions/:id/snapshot    full session state (resume)
```

Backend Pieces:

1. **Session store** — Redis live state ke liye (TTL 24h) + PostgreSQL history ke liye. Har event append-only hai (`session_events` table).
2. **Event bus** — Redis pub/sub: agent runtime `session:<id>` events publish karta hai; web (SSE) aur CLI (WS) dono subscribe karte hai.
3. **Agent runtime** — Vercel AI SDK `streamText` with typed tool registry (read_file, edit_file, run_command, write_file). Destructive action pe tool calls human approval ke liye pause.
4. **Execution** — web/managed: sandbox (E2B ya Modal) per session; CLI: local child processes with permission prompt per command.
5. **Cost guard** — har run se pehle: `cost_estimates` check, model router pick, budget cap mid-stream enforced (budget cross to stream cancel).
6. **Context cutting** — shared `lib/context` engine: chat → clean → dedupe → extract essentials → cut to token budget; repo → git-aware scanner → relevant-file picker → same token budget.

---

## 15. Agent Runtime (AI Agent Chalaane Ki System)

### v1: Single Implement Agent (Typed State Machine)

```
state: improve → plan → run → review → fix → done
```

- Tool registry: `read_file`, `edit_file`, `write_file`, `run_command`.
- Har step structured events emit karta hai (web + CLI dono ko streamed).
- Human approval required: `run_command` with side effects, ya edits jo current file set ke bahar.
- Budget: model, max tokens, max tool calls per run (Cost Engine se).

### v2: Multi-Agent (Supervisor Pattern, LangGraph.js)

- Supervisor spawn karta hai: **implement** (code likhta hai), **review** (a11y, DX, correctness), **test** (build/test/lint), **docs** (optional).
- Har agent ka apna model + budget (e.g. implement=gpt-4.1, review=claude-sonnet-4, test=gemini-flash).
- Review output implement pe wapas jaata hai (finite fix loop, max 2 rounds).
- Checkpointing via LangGraph.js taaki crash ke baad runs resume ho.

### Big Framework Day One Kyun Nahin?

Rescue pipeline jaisa hi rule: simple typed state machine pehle; LangGraph.js tabhi jab branching/multi-agent checkpoints chahiye. Koi run prompt improver + cost guard ke bina start kabhi nahi.

---

## 16. Future Architecture (Aage Ki Plan)

| Phase | Kya Add Hota Hai |
| --- | --- |
| Phase 1 (now) | Frontend with mock data, rescue flow UX, coding workspace mock |
| Phase 2 | Hono API, Postgres, Redis, BullMQ, real rescue pipeline |
| Phase 3 | Web + terminal coding platform: agent runtime, browser terminal, prompt improver, cost guard |
| Phase 4 | `lf` CLI parity, repo passports, Git story |
| Phase 5 | Multi-agent supervisor, browser companion, SDK, marketplace, teams |

Heavy workloads ke liye scaling: BullMQ → Temporal jab workflows ko checkpointing, resumability, ya human-in-the-loop mid-run chahiye. Agent orchestration: simple typed state machine → LangGraph.js jab branching required.

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

## 18. Coding Standards (Code Kaise Likhein)

- TypeScript strict, koi `any` nahi.
- Zod schemas `packages/contracts` mein; UI types wahan se import karein.
- Component naming: `components/app/PassportCard.tsx` — PascalCase files.
- CSS: sirf design tokens, koi magic values nahi; layout ke liye utility classes.
- Koi comments nahi unless wo *why* explain karte (kabhi *what* nahi).
- ESLint (next/core-web-vitals) + `tsc --noEmit` + `vitest` har PR pe gate.
- Feature files self-contained: `page.tsx` + section components + mock `lib/data` mein.

---

## 19. Deployment (Kahan Host Karein)

| Env | Target |
| --- | --- |
| Prod web | Vercel (Next) |
| Prod API/worker | Render (Hono + BullMQ worker) — `render.yaml` blueprint |
| DB | Managed Postgres (Neon/Supabase/RDS) |
| Redis | Upstash / managed |
| Storage | Cloudflare R2 |
| Preview | Vercel preview per PR |

`scripts/check-production.sh` deploys gate karta hai. `docker-compose.yml` Postgres + Redis + MinIO locally chalta hai.

---

## 20. Caching Strategy Summary (Cache Ka Plan)

| Layer | Key | TTL |
| --- | --- | --- |
| L1 process | pricing table, routing rules | 5 min |
| L2 Redis | exact prompt → estimate/report | 24 h |
| L3 Redis | semantic near-duplicate prompts | 24 h (later) |
| L4 vectors | retrieval results | scoped per passport |

Har cache write user deletion requests honor karta hai (explicit invalidation).

---

## 21. Environment Variables

`.env.example` dekho — ye single source of truth hai. Provider keys kabhi commit mat karo; BYOK keys encryption ke saath at rest hoti hai, `PROVIDER_KEYS_KEK` se key-encryption key aati hai.

---

## 22. Quick Summary (Sabse Zaroori Baat)

- **Kya ban raha hai?** AI coding platform — jisme AI conversations ko improve, agents se run, aur context ko preserve kiya jaata hai.
- **Language?** TypeScript (strict) — frontend aur backend dono ke liye.
- **Frontend?** Next.js 16 + React 19 + Tailwind CSS v4, Vercel pe host.
- **Backend?** Hono API + Drizzle ORM + PostgreSQL, Render pe host.
- **Database?** PostgreSQL 16 (main) + Redis (cache/jobs) + pgvector (AI embeddings).
- **AI?** OpenAI, Anthropic, Google, DeepSeek, Groq, OpenRouter — BYOK-first.
- **CLI?** `lf` — `brew install Rohit94r/tap/lf` ya `curl | bash` se install, web ke saath session-parity.
- **Agent runtime?** Typed state machine pehle, baad mein LangGraph.js multi-agent.
- **Payments?** Stripe, free/$5/$14 plans, unlimited AI credits kabhi nahi.
- **Monitoring?** Sentry + pino + OpenTelemetry + PostHog.
