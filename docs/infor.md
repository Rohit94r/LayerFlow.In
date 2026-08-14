# LayerFlow — Project Info & Direction

> A single place to understand what LayerFlow is, what it is building, and where
> it is going. This doc covers the two product surfaces — **browser (web)** and
> **terminal (`lf` agent)** — plus the developer-research use case and the ideas
> we are actively pursuing.

---

## 1. What is LayerFlow

LayerFlow is **the AI coding platform — web + terminal**. One product, two faces:

- A **browser dashboard** (Next.js web app) where you code with AI, rescue dead
  AI chats, and manage your AI work.
- A **terminal agent** (`lf` CLI) that runs inside any terminal — iTerm,
  Terminal.app, or the **VS Code integrated terminal** — with full parity to the
  web surface.x

Both surfaces share the **same Hono API** (`apps/api`), the same agents, the
same workspace, and the same session store. Web and terminal are two frontends
to one product.

### The problem it solves

People lose time and money to three AI problems:

1. Messy prompts that produce wrong output.
2. Dead chats and lost context when switching between models/tools.
3. Overspending on expensive models.

### The LayerFlow answer

```text
Plain English → Improve prompt → Multi-agent run → Browser terminal + lf CLI
Paste chat → Clean → Compress → Improve → Cost check → Continue Pack
```

**One more layer:** LayerFlow is also being built as a **developer research
agent** — run research tasks from the terminal or VS Code terminal and get
answers grounded in your codebase, the web, and docs — without leaving the
editor.

---

## 2. What we are building — full surface map

| Surface | What it does | Status |
|---|---|---|
| **Landing / marketing site** | Landing, pricing, blog, docs | ✅ Built |
| **Coding Workspace (web)** | Plain English → Improve → run with parallel agents (implement / review / test) | 🟡 Mock-backed |
| **Browser Terminal (`/code`)** | Live agent output, shell commands, file diffs in the browser | 🟡 UI preview; real PTY pending |
| **Rescue Chat** | Paste any conversation → full Rescue Report in ~20s | 🟡 Engine is API-side; web UI mock |
| **Context Passport** | Portable memory package: goal, state, decisions, constraints, next action | 🟡 Web + API; `lf context` pending |
| **Smart Compress** | 15,000 words → ~1,000 words of useful context, with Context Diff | 🟡 Web mock; engine in API |
| **Improve Prompt** | Scored (0–100) improved next prompt | 🟡 Web mock |
| **Cost Check / Analytics** | Dollar estimates across Claude, GPT, Gemini, DeepSeek, Kimi, Groq | 🟡 Web mocks; budgets routes live |
| **Continue Pack** | Copy-ready continuation for any model | ✅ Web copy; export/CLI pending |
| **Workspace** | Projects, prompt library, context search, learning memory, AI Work Ledger | ✅ Web; CLI binds pending |
| **Models / BYOK** | Model registry + bring-your-own-key vault | ✅ Web + API routes |
| **`lf` terminal agent** | Full CLI/TUI parity with the web — init, context, rescue, agent loop, memory, cost, sync | ⬜ Scaffold is the core remaining track |
| **SDK + browser companion** | `@layerflow/sdk` for app developers; companion extension to capture chats | ⬜ After CLI parity |

> **Build model:** browser + terminal are built **in parallel**, not phase-wise.
> Web UI runs on realistic mock data through `lib/services/*`; the real backend
> lives in `apps/api` (Hono + Postgres + Redis + BullMQ).

---

## 3. The Browser surface (web app)

The browser is the visual, discoverable face of LayerFlow.

### Key browser experiences

- **Coding Workspace** — write plain English, click **Improve**, and run with
  multiple agents in parallel (implement / review / test), each with its own
  model and budget.
- **Browser Terminal (`/code`)** — a live terminal inside the dashboard showing
  agent output, shell commands, and file diffs. The goal is a real PTY + agent
  tool-loop that behaves identically to the `lf` CLI.
- **Rescue flow** — paste a dead AI chat, watch the pipeline
  `Cleaning → Compressing → Improving → Pricing → Suggesting → Packing`, and get
  a Rescue Report with tabs: Passport, Compress, Diff, Prompt, Cost, Model,
  Continue Pack.
- **Workspace hub** — projects, prompt library, context search, learning
  memory, and the AI Work Ledger (git-like timeline of everything done with AI).
- **Cost analytics** — spend by model, savings vs. default, provider mix.
- **Models / BYOK** — bring your own keys (OpenAI, Anthropic, Gemini, DeepSeek,
  Kimi, Groq, OpenRouter), health-checked and encrypted.

### Dashboard routes

| Route | Page |
|---|---|
| `/` | Landing |
| `/pricing` · `/blog` · `/docs` | Marketing |
| `/sign-in` | Auth (better-auth) |
| `/home` | Work hub |
| `/rescue` | Rescue Chat / Reports |
| `/passports` · `/passports/[id]` | Context Passport library |
| `/prompts` · `/prompts/[id]` | Prompt Library |
| `/workspace` · `/workspace/[projectId]` | Projects + detail |
| `/code` | **Browser terminal + agent mesh** |
| `/agents` `/history` `/search` `/costs` `/models` `/billing` `/keys` `/settings` | Supporting pages |

---

## 4. The Terminal surface (`lf` agent)

The terminal is the developer-native face of LayerFlow. It runs **in any
terminal** — including the **VS Code integrated terminal** — and is a
first-class citizen of the same API, not a thin wrapper.

### Why a terminal agent

Developers live in the terminal. A lot of AI work (research, code changes, git
history, running commands) happens better next to the code than in a browser
tab. `lf` brings the whole LayerFlow engine there:

### `lf` command map

| Command | What it does |
|---|---|
| `lf init` | Creates `LAYERFLOW.md` + `.layerflow/` repo context |
| `lf run "<plain english>"` | Improve prompt → pick model → check cost → run agents → save session |
| `lf rescue <file-or-paste>` | Dead chat → Rescue Report → Continue Pack |
| `lf improve "<prompt>"` | Score + improve a single prompt (0–100) |
| `lf agent` | Interactive agent loop: read/write files, run commands, git |
| `lf context` | Build / refresh the repo Context Passport (tree, deps, README, git log) |
| `lf memory` | Local + server memory store, searchable |
| `lf cost` | Dollar estimates across models before running |
| `lf suggest` | Suggests prompt/memory improvements |
| `lf git` | Explains changes, drafts commits |
| `lf pack` | Export/import a Continue Pack |
| `lf sync` | Two-way sync with the web workspace |
| `lf session --open <id>` | Reopen a past session (same context/decisions/files) |

### CLI architecture (target)

```text
lf (Node/Bun binary, ~40KB core)
  ├── commands/        one file per command (run, rescue, improve, cost…)
  ├── tui/             raw TTY rendering (sessions, diffs, agent panels)
  ├── runtime/         session client (JSON-RPC over WebSocket to API)
  ├── context/         repo scanner → context cut (same engine as web)
  ├── vault/           OS keychain wrapper + encrypted config
  └── telemetry/       anonymized usage events
```

- **Transport:** WebSocket (JSON-RPC) for live agent events, REST fallback for
  batch commands, offline mode with local session cache.
- **Session parity:** a session started in the browser and one from `lf run`
  produce identical files — same passport fields, prompt versions, ledger
  events. Web and CLI are two frontends to one session store.
- **Safety:** human approval required for destructive tool calls; local child
  processes with a permission prompt per command.
- **Design rule:** `lf` works *with* Cursor / Claude Code / Codex / Opencode,
  not against them — it can import/export their contexts and never locks files.

### Install targets (end users)

| Method | Command |
|---|---|
| curl installer (macOS/Linux/WSL) | `curl -fsSL https://layerflow.dev/install \| bash` |
| Direct binary | `https://github.com/Rohit94r/layerflow-releases/releases/latest` se `.tar.gz`/`.zip` |

No API key or account needed to try it. BYOK keys live in the OS keychain and
sync with the web vault on sign-in.

---

## 5. Developer research agent — terminal & VS Code terminal (the new idea)

Beyond coding, LayerFlow is adding a **developer research agent** purpose-built
for research done *inside* the terminal — ideal for the **VS Code integrated
terminal**, where the developer never leaves their editor.

### Use cases

- **Codebase research:** "Where is the auth flow implemented?" → scans the repo,
  reads the relevant files, answers with file:line references.
- **Web research:** "How does the Hono router handle body limits?" → web search
  + fetch docs, returns a grounded summary with sources.
- **Doc + API research:** "What's the signature of the new Next.js cache
  function?" → fetches official docs, extracts the exact API shape.
- **Repo → task research:** "Plan the work to add pgvector search to this repo"
  → builds a repo Context Passport and returns a concrete plan with file paths.
- **Debugging research:** paste an error trace → searches the web + repo → lists
  probable causes ranked by likelihood.
- **Compare research:** "Compare Redis vs BullMQ for our job queue" → structured
  comparison with costs, links, and a recommendation.

### How it works (terminal)

```text
lf research "why does next build fail after adding tailwind v4"
  → 1. scan repo (git, file tree, package.json, error files)
  → 2. search web + docs (grounded, with sources)
  → 3. combine with repo facts → answer with file:line citations
  → 4. offer next actions: open file, run command, save as passport
```

- `lf research "<question>"` — one-shot grounded answer in ~10–20s.
- `lf research --repo` — scope to the current repo only (no web).
- `lf research --watch <file>` — re-run research when a file changes.
- Results saved to the workspace as **research passports** — searchable,
  reusable, attachable to projects.
- Works the same in any terminal: bash/zsh, VS Code terminal, iTerm, tmux.

### Terminal UI ideas

- Split-pane TUI: question input / streaming answer / source list / next-actions.
- Diff-style citations: hover or tab through `file:line` references.
- Cost-per-answer footer (same cost engine as the web).
- `lf research --export md` to drop the answer into a notes file.

---

## 6. Ideas & next updates for both surfaces

### Browser (web)

1. **Wire mocks → real API** — the single biggest remaining task: swap
   `lib/services/*` to live `fetch` calls (signatures never change).
2. **Real browser terminal** — move `/code` from UI preview to a real PTY +
   agent tool-loop shared with the CLI.
3. **Empty/Error states + skeletons** — finish QA polish on all 14 pages.
4. **Rescue pipeline live** — call the real extract/compress/improve engine.
5. **Research dashboards** — show research passports, sources, and citation
   trails in the workspace.
6. **Browser companion extension** (after SDK) — capture current chat →
   workspace, inject Continue Packs, quick cost check.

### Terminal (`lf`)

1. **Scaffold `apps/cli`** + `lf init` + `lf auth login` (first milestone).
2. **`lf context`** — build/refresh the repo passport (tree, deps, README, git
   log).
3. **`lf agent`** — model loop with tool calls (filesystem, bash, git) via the
   gateway.
4. **`lf research`** — the developer research agent (web + repo grounded
   answers, citations, next actions).
5. **`lf rescue` / `lf memory` / `lf cost` / `lf suggest`** — reuse API
   endpoints.
6. **`lf sync`** — two-way with the web workspace.
7. **TUI ergonomics** — status line, diff preview, cost-per-run footer.
8. **VS Code terminal first-class support** — detect VS Code terminal,
   hyperlink file:line references, use its task API where useful.

### Shared / platform

1. **`@layerflow/sdk`** — wrap API + passport schema for app developers (after
   CLI steady state).
2. **Multi-agent supervisor (LangGraph.js)** — implement / review / test agents
   with per-agent models and budgets, checkpointed runs.
3. **Marketplace / sub-product pricing** — only after usage validates.
4. **QA gates on every change** — `npm run typecheck && npm run lint && npm test
   && npm run build`.

---

## 7. Current status (one glance)

| Track | Done | In progress | Remaining |
|---|---|---|---|
| Web product UI | 80% | wiring to API | 20% (real data + QA) |
| Backend API (`apps/api`) | 60% | hardening | 40% (tests, deploy, audits) |
| Terminal `lf` | 0% | **start now** | 100% scaffold → parity with web agents |
| Research agent (`lf research`) | 0% | idea → design | design, then build on CLI |
| SDK + companion | 0% | — | 100% (after platform) |

---

## 8. Where everything lives

| File | What it documents |
|---|---|
| `docs/infor.md` (this) | Product overview, both surfaces, research agent, ideas |
| `flow.md` | Repo map, tech stack, page map, conventions (START HERE for code) |
| `docs/architecture.md` | Dashboard architecture & conventions |
| `docs/workflow.md` | Engineering workflow + per-feature remaining-work tracker |
| `docs/tech-stack.md` | Full target tech stack (web + terminal + agents + infra) |

**The north star:** *Anyone can code with AI — and never lose context again —
in the browser or in the terminal.*
