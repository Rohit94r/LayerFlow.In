# LayerFlow — Engineering Workflow

> The AI Coding Platform — web + terminal.
> Plain English → Improve → agents + browser terminal. Messy chat → Context Passport → continue anywhere.

This document describes how LayerFlow works end to end, stage by stage. It
covers the frontend, backend, RAG, prompt improvement, context passports,
continue packs, the cost engine, BYOK, model routing, and the future
terminal/SDK layers.

**Build status:** Frontend-first with realistic mock data. Each workflow below
is implemented in the UI; the backend pipeline is the target architecture.

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
Lucide. Mock data in `lib/data` with typed query functions.

### Routing

| Route | Page |
| --- | --- |
| `/` | Landing |
| `/pricing` | Pricing |
| `/sign-in` | Auth (better-auth, kept) |
| `/app` | Dashboard home |
| `/app/rescue` | Rescue Chat |
| `/app/passports` · `/app/passports/[id]` | Context Passport library + detail |
| `/app/prompts` · `/app/prompts/[id]` | Prompt Library + detail |
| `/app/workspace` · `/app/workspace/[projectId]` | Workspace (projects, timeline, learnings, search) |
| `/app/costs` | Cost Analytics |
| `/app/models` | Models + BYOK |
| `/app/settings` | Settings |

### State

- Server components render lists from `lib/data`.
- Client components own interaction state (tabs, filters, copy buttons).
- No global store yet — props + URL params are enough for this phase.
- Mock layer returns promises to mirror the future API (`getPassports()`, `getProjects()`…).

### Component conventions

- One feature = one directory under `components/app/*`.
- Cards, badges, stat blocks are shared primitives in `lib/ui` or `components/app/_ui`.
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

## 14. Future: Terminal Agent (`lf`)

After web traction:

```text
lf init       creates LAYERFLOW.md
lf context    creates repo Context Passport
lf cost       estimates repo context cost
lf suggest    suggests improvements
lf memory     local memory store
lf git        explains changes, drafts commits
```

Not built now. Design constraint: work *with* Cursor/Claude Code/Codex/OpenCode,
not against them.

---

## 15. Future: SDK & Browser Companion

- Browser companion: capture current chat → workspace; inject Continue Pack;
  quick cost check.
- SDK: `@layerflow/sdk` wraps the API + passport schema for app developers.
- Marketplace: only after usage proves demand.

---

## 16. Testing & Quality Gates

- `npm run typecheck` — tsc strict.
- `npm run lint` — next/core-web-vitals.
- `npm run test` — vitest (unit: mappers, compress math, cost engine).
- Manual QA checklist per flow: rescue, copy, save, search, empty states.
- Accessibility: keyboard nav + focus rings on every interactive control.
