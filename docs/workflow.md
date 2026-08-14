# LayerFlow — Engineering Workflow

> **Build model — browser + terminal, in parallel (not phasewise).**
> One product, two surfaces shipped together:
> the **web dashboard** (`layerflow-web`) and the **`lf` terminal agent** (CLI).
> Both talk to the same **Hono API** (`apps/api`) and shared packages
> (`@layerflow/contracts`, `@layerflow/model-registry`).

## Feature Status — what is done, what remains

Legend: ✅ built · 🟡 partially built · ⬜ not started
Backend bars reflect authored modules in `apps/api`; in every row the web UI is
mock-backed until the service layer is wired to the API (§ "Wiring remaining").

| Area | Web | Terminal | Backend | Status | Remaining work |
|---|---|---|---|---|---|
| Marketing site (landing, pricing, blog, docs) | ✅ | — | — | 🟡 | Blog corpus + SEO live; CMS/tips n/a. 5% |
| Auth (sign-in, sessions) | ✅ | ⬜ | ✅ | 🟡 | better-auth done; CLI login (`lf auth login`) pending |
| Dashboard shell + 14 pages | ✅ | — | — | ✅ | Full UI built on mocks — 0% |
| Rescue Chat / Report UI | ✅ | ⬜ | ✅ | 🟡 | Real extract/compress/improve engine call; pipeline polish |
| Context Passport CRUD + search | ✅ | 🟡 | ✅ | 🟡 | `lf context` create/mem; passport history/diff UI |
| Smart Compress engine | 🟡 | ⬜ | ✅ | 🟡 | Web currently mock; engine is API-side — wire it |
| Improve Prompt + scoring | 🟡 | ⬜ | ✅ | 🟡 | Web mock; CLI bounce reuse |
| Continue Pack (copy/export) | ✅ | 🟡 | 🟡 | 🟡 | one-click web copy done; markdown export + CLI pack |
| Cost Analytics + engine | 🟡 | ⬜ | ✅ | 🟡 | budgets routes live; web chart mocks → real |
| Model suggestion + routing | 🟡 | ⬜ | ✅ | 🟡 | gateway/router live; routing rules UI pending |
| BYOK (vault, health, keys) | ✅ | ⬜ | ✅ | 🟡 | web UI + API keys routes done; encryption audit pending |
| Workspace (projects, timeline, learnings, ledger) | ✅ | 🟡 | ✅ | 🟡 | web done; `lf` project/ledger repo binds pending |
| Global search (incl. memory) | ✅ | ⬜ | ✅ | 🟡 | web + pgvector backend; CLI search pending |
| Browser terminal (`/code`) + agent mesh | 🟡 | — | 🟡 | 🟡 | today = UI preview; real PTY + agent tool-loop pending |
| CLI agent (TUI, tools: read/write/run/git) | — | ⬜ | 🟡 | ⬜ | **not built — the core remaining track** |
| SDK `@layerflow/sdk` | — | — | — | ⬜ | after CLI reaches steady state |
| Browser companion extension | — | — | — | ⬜ | after SDK |
| Web → API wiring (swap mocks) | — | — | ✅ | 🟡 | the single biggest remaining task |
| Marketplace / pricing of sub-products | — | — | 🟡 | ⬜ | after usage validates |

### How much work remains (estimate)

| Track | Done | In progress | Remaining |
|---|---|---|---|
| Web product UI | 80% | wiring | 20% (real data + QA) |
| Backend API (`apps/api`) | 60% | hardening | 40% (tests, TLS/domains deploy, audits) |
| Terminal `lf` | 0% | start | 100% scaffold → parity with web agents |
| SDK + companion | 0% | — | 100% (after platform) |

### What's happening now — parallel tracks
1. **Web track:** wire `lib/services/*` to the live API; QA the 14 dashboard
   pages; ship Empty/Error states and loading skeletons.
2. **Terminal track (new):** scaffold the `lf` CLI monorepo app
   (`apps/cli`), first milestones: `lf init` (LAYERFLOW.md) + `lf context`
   (repo passport) + `lf agent` (read/write/run/git loop) using `apps/api`.
3. **Shared track:** keep changing `@layerflow/contracts` as the single DTO
   truth so web, CLI and API stay in lockstep.
4. **Ops:** wire DEV behind API. No feature is blocked on another surface.

---

## 1. Core Loop

Every LayerFlow workflow starts the same way:

```text
Paste chat / problem
  → Detect source (ChatGPT, Claude, Gemini, DeepSeek, Kimi, Groq…)
  → Rescue Report (analyze, compress, improve, price, suggest, pack)
  → Save to workspace (passport, prompt, project)
  → Continue in any AI with a Continue Pack
```

### Frontend flow

1. User pastes a conversation or uses a sample.
2. UI detects source tool and shows a progress pipeline:
   `Cleaning → Compressing → Improving → Pricing → Suggesting → Packing`.
3. Result is a Rescue Report with tabs: Passport, Compress, Diff, Prompt,
   Cost, Model, Continue Pack.
4. User can copy any part, save to workspace, or export markdown.
5. Everything persists to the workspace (mock now, API later).

---

## 2. Frontend Workflow

### Stack

Next.js 16 App Router, React 19, TypeScript, Tailwind v4, Framer Motion,
Hugeicons (shimmed). Mock data in `lib/data` behind an async service layer
(`lib/services`) with typed query functions.

### Routing

| Route | Page |
| --- | --- |
| `/` | Landing |
| `/pricing` | Pricing |
| `/sign-in` | Auth (better-auth, kept) |
| `/home` | Dashboard home (work hub) |
| `/rescue` | Rescue Chat / Continue Packs |
| `/passports` · `/passports/[id]` | Context Passport library + detail |
| `/prompts` · `/prompts/[id]` | Prompt Library + detail |
| `/workspace` · `/workspace/[projectId]` | Workspace (projects, timeline, learnings) + detail |
| `/code` | Terminal + agent mesh demo |
| `/agents` | Agent roster |
| `/history` | Work Ledger |
| `/search` | Global context search |
| `/costs` | Cost Analytics |
| `/models` | Models + BYOK |
| `/billing` | Plans + billing history |
| `/keys` | API Keys — platform + private own (BYOK) |
| `/settings` | Settings |

### State

- Server components render lists through `lib/services/*` (async, promise-based).
- Client components own interaction state (tabs, filters, copy buttons).
- Detail pages follow the server page + small client "actions" pattern
  (`PassportActions`, `PromptActions`) so only interactive bits are client-side.
- No global store yet — props + URL params are enough for this phase.
- Services return promises to mirror the future API, so swapping the mock
  backend for `lib/api/*` is a drop-in change.

### Component conventions

- Dashboard shell lives in `components/layout/*` (sidebar, topbar, command menu).
- Feature components live under `components/features/<feature>/*`.
- Cross-page primitives (`components/shared/*`): page-header, section, row, stat, quick-actions.
- Design-system primitives live in `components/ui/*` (panel, button, badge, tabs, table, dialog, dropdown-menu, switch, skeleton, empty-state, error-state, progress, kbd).
- Empty states are first-class: icon, title, action.

---

## 3. Rescue Report (Hero Flow)

Pipeline (UI step order):

```text
1. Clean        — trim, dedupe, strip greetings/errors
2. Summarize    — goal + current state
3. Compress     — extract useful context only
4. Diff         — what was kept / removed / unsure
5. Improve      — better next prompt
6. Cost check   — dollars per model
7. Suggest      — best model + why
8. Pack         — Continue Pack ready to copy
```

### Context Diff (trust feature)

Show three buckets:

- **Kept** — the compressed context (passport).
- **Removed** — greetings, repeated instructions, failed attempts.
- **Unsure** — things the user should review manually.

This makes compression safe to use.

---

## 4. Context Passport

Portable memory package for one AI task.

### Fields

| Field | Purpose |
| --- | --- |
| Goal | What the user is trying to achieve |
| Current state | Where things stand right now |
| Key decisions | Decisions already made |
| Constraints | Budget, tech, tone, time |
| What worked | Approaches that succeeded |
| What failed | Approaches to avoid |
| Missing info | Gaps the AI needs |
| Output format | Desired shape of the answer |
| Next action | The immediate next step |
| Source / target tool | Model provenance |
| Estimated cost | Cost of the next run |
| Tags + project | Organization |

### Rules

- Editable: user edits become the source of truth.
- One passport per task; tasks group into projects.
- Passports are searchable (context search) and reusable across models.

---

## 5. Smart Compress

Goal: **15,000 words → ~1,000 words** of useful context.

### Method

- Dedupe repeated instructions and user echoes.
- Drop greetings, filler, failed attempts (keep failures as "what failed" only when valuable).
- Keep decisions, constraints, and concrete facts verbatim-ish.
- Tag any passage the extractor is unsure about.

### Output

Plain-language numbers, e.g.:

```text
Original: 8,000 words
Useful context: 920 words
Removed: 88%
Saved tokens on next run: ~64,000 input tokens
```

---

## 6. Improve Prompt

Turns the messy context into a sharp next prompt.

Improves:

- Clarity (one goal, plain language)
- Context completeness (fills gaps from the passport)
- Constraints (output rules, tone, budget)
- Examples (include one worked example when present)
- Format (explicit structure)
- Brevity (token efficiency)

### Prompt Score

Scores the improved prompt 0–100 across:

- Clarity
- Context completeness
- Output format
- Constraints
- Token efficiency
- Model fit

Shown on the Rescue Report and in the Prompt Library.

---

## 7. Continue Pack

Copy-ready continuation for another AI.

Template:

```text
Goal:
Current state:
Key decisions:
Constraints:
Useful context:
What already worked:
What failed:
Preferred output:
Next action:
```

- One-click copy.
- Markdown export of the full report.
- Optional outcome feedback after use:
  *Worked well · Missing context · Too long · Wrong model · Bad prompt.*
  Feedback feeds the learning loop.

---

## 8. Cost Engine

Dollar-based estimates (not just tokens).

### Inputs

- Compressed context tokens
- Expected output tokens (from task type)
- Model price table (`packages/model-registry`)

### Output

| Model | Estimate |
| --- | --- |
| Claude Sonnet | $0.42 |
| Gemini Flash | $0.05 |
| DeepSeek | $0.03 |
| Groq (Llama) | $0.02 |

### Rules

- Estimates cached in Redis per exact prompt.
- Show savings vs. the expensive default.
- Recommendation logic: cheaper model first, stronger model only when the
  task needs deep reasoning or polished writing.

---

## 9. Best Model Suggestion

Recommends a model **with a reason**.

```text
Recommended: Gemini Flash
Why: summarization + continuation — cheap and fast. Use Claude only if the
final output needs stronger writing or reasoning.
```

Scoring inputs: task type, compressed context size, desired quality, budget,
BYOK availability, provider health.

---

## 10. BYOK (Bring Your Own Keys)

Supported providers: OpenAI, Anthropic, Google Gemini, DeepSeek, Kimi
(Moonshot), Groq, OpenRouter.

- Keys stored encrypted (vault; KEK from env).
- Health-checked and labeled (`connected` / `needs attention`).
- BYOK traffic is billed to the user's own provider account — LayerFlow sells
  workflow value, not tokens.
- In the UI: Models page → key management with add/edit/remove + last-used.

---

## 11. Model Routing

Routing lives behind the Model Suggestion and Cost Check:

1. Task classification (summary / writing / reasoning / code…).
2. Filter by availability + BYOK.
3. Rank by cost then quality.
4. Explain the top choice.

Future: user-defined routing rules (auto-cheapest, auto-best, manual).

---

## 12. Workspace

### Projects

Organize passports, prompts, learnings, and timeline entries per project.

### Saved Context

Library of Context Passports with full-text search.

### Prompt Library

Saved improved prompts with scores, versions, and tags.

### Learning Memory

Short durable learnings ("Claude 4.5 × my data with 3 examples beats X").
Attachable to projects.

### AI Work Ledger (Timeline)

Chronological ledger of everything done with AI: rescues, prompts written,
models used, decisions recorded. Rendered as a git-like timeline.

### Search

Global search over passports, prompts, learnings, timeline.

---

## 13. Analytics Surface (Cost Analytics)

- Spend by model (area chart)
- Weekly cost bars
- Savings vs. default model
- Cost per passport / prompt
- Provider mix donut

All mock data in the frontend phase.

---

## 14. Terminal Agent (`lf`) — active parallel track

Built now, alongside the web. A real TUI/CLI that is a first-class citizen of
the same Hono API, not a thin wrapper.

```text
lf init          creates LAYERFLOW.md + repo Context Passport
lf context       pull/update the repo passport (web + CLI share it)
lf rescue        paste a dead chat → passport + continue pack (reuses API)
lf agent         interactive agent loop: read/write files, run commands, git
lf memory        local + server memory store, searchable
lf cost          estimates repo context cost (cost engine)
lf suggest       suggests prompt/memory improvements
lf git           explains changes, drafts commits
lf pack          export/import a Continue Pack
lf sync          two-way sync with the web workspace
```

**Milestones (in this order):**
1. ✅ Repo/DTO contract (`@layerflow/contracts`) — done as part of API.
2. ⬜ `apps/cli` scaffold + `lf init` + `lf auth login`.
3. ⬜ `lf context` — build/refresh the repo passport (tree, deps, README, git log).
4. ⬜ `lf agent` — model loop with tool calls (filesystem, bash, git) via gateway.
5. ⬜ `lf resume` / `lf cost` / `lf memory` — reuses API endpoints.
6. ⬜ `lf sync` — two-way with the web workspace.
7. ⬜ TUI ergonomics: status line, diff preview, cost-per-run footer.

Design constraint (kept): work *with* Cursor/Claude Code/Codex/Opencode, not
against them — the CLI can import/export their contexts and never locks files.

---

## 15. SDK & Browser Companion — after terminal parity

- **Browser companion:** capture current chat → workspace; inject Continue Pack;
  quick cost check. Built after `lf` reaches parity with the web agents.
- **SDK:** `@layerflow/sdk` wraps the API + passport schema for app
  developers — only when the API + CLI shapes are stable.

---

## 16. Testing & Quality Gates

- `npm run typecheck` — tsc strict.
- `npm run lint` — next/core-web-vitals.
- `npm run test` — vitest (unit: mappers, compress math, cost engine).
- Manual QA checklist per flow: rescue, copy, save, search, empty states.
- Accessibility: keyboard nav + focus rings on every interactive control.
