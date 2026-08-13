# Improve-feature Plan (docs/imprvefeat.md)

Status: **DONE — A, B, C (phase-1) and D implemented, typechecked, linted, and built.**

- **B** Terminal removed: `/code` page + `lib/data/code.ts` deleted, sidebar/marketing/docs refs switched to Chat/Agents.
- **A** Improve-in-Chat: `POST /api/improve` (cheapest usable model fallback chain, JSON-fence-free structured reply), `ImprovePromptResponse` contracts, right-side panel with 4-axis scores, token savings, diff, ⌘I shortcut, Use/Run actions. Rescue processor reuses `stripJsonFences`.
- **C** Real Agents: `ai_agents` + `ai_agent_runs` tables (migration `0008_hesitant_iron_patriot.sql`, applied), full CRUD at `/api/agents` incl. `/pause` + `/resume`, queued runs via `agent` job, list/new/detail pages with poll-until-done runs, pause/resume/delete.
- **C2 (polish) done**: duplicate agent (copies config incl. tools), per-run cost chart (BarChart, micro-dollars, total in header), run-history pagination ("Load older runs", offset-based), `tools` stub column (migration `0010_jazzy_living_tribunal.sql`, applied; chips on detail header, copied on duplicate), role prompt templates shared via `lib/agents-presets.ts` and available in both builder and detail edit. Verified: `queueAgentRun` rejects paused agents (409), polling stops when no active runs.
- **D** Costs page "Spend by feature" panel, Home page Agents stat, keys empty-state CTA, prompts `source` + `run_count` columns (migration `0009_tan_blob.sql`, applied) with "Imported from chat"/"From improve" badges and Most-run sort, sidebar/docs proofread.

### Term-level audit vs plan (Aug 2026)
- A request/response: `content`, `targetModel?`, `sessionId?` → `improvedPrompt, promptScore, promptScores, diff, beforeTokens, afterTokens, tokenSavingPct, costMicro, model, provider, latencyMs` — all present (cost field renamed `costMicro` to match plan).
- A composer: Improve button (Sparkles, ⌘I), enabled ≥ 10 chars; panel: score before→after, axis bars, diff kept/removed/unsure, token savings, editable monospace textarea, original collapsed, per-axis loading skeleton, error + retry + /keys link, ⌘⏎ use, Esc dismiss.
- A backend: `improvePrompt({ workspaceId, userId, content, targetModel })`, 6k-char cap, cheap-model chain (deepseek-chat → gemini → gpt-4o-mini → groq → grok → kimi), JSON-fence fallback to raw text, shared `stripJsonFences` used by rescue; tests 7/7.
- C schema: agents = id/workspaceId/name/role(implement|review|test|custom)/systemPrompt/modelId/temperature/status(active|paused)/createdAt/updatedAt/lastRunAt; agent_runs = id/agentId/workspaceId/input/output/status(queued|running|succeeded|failed)/errorMessage/provider/model/inputTokens/outputTokens/costMicro/runLatencyMs/startedAt/completedAt — exact match.
- C API: all of GET /agents (last run status + total cost), POST (name ≥ 2, systemPrompt ≥ 10), GET/PATCH/DELETE /:id, POST /:id/pause + /resume, POST /:id/runs, GET /:id/runs, GET /runs/:runId.
- C UI: list cards (name/role chip/model/status dot/last run cost/New agent), builder (role presets fill starter prompt, live token estimate, model picker, temperature slider), detail (run box + 1.5s polling, run history with tokens/cost/errors, edit incl. temperature).
- D: D1 (empty state Improve+Rescue) ✓, D2 (session source icon) ✓, D3 (⌘I hint) ✓, D4 (feature breakdown incl. improve+agent lines) ✓, D5 (keys empty-state CTA) ✓, D6 (badge + sort, real columns) ✓, D7 (agents stat) ✓, D8 (tooltips verified) ✓, D9 (docs) ✓.
- Notes: `executeRun` has no temperature param (same gateway path as rescue/chat), so agent temperature is persisted config only. Improve is stateless v1 (no DB writes) per plan 3.5.

---

## 1. Executive summary

Four workstreams, in priority order:

| # | Feature | Decision | Why now |
|---|---------|----------|---------|
| A | **Improve Prompt inside Chat** | Build (high priority) | Real pipeline already exists in Rescue (`apps/api/src/jobs/processors/rescue.ts`); we only need to expose it in the chat composer. Biggest visible win. |
| B | **Terminal sidebar item** | **Remove from sidebar** + delete demo page | `/code` renders a static mock (`lib/data/code.ts`); it is not a usable product. Keeping it hurts trust. |
| C | **Agents** | Build real "Build your own agents" (phase 2) | Currently static mock too. Real agents need gateway plumbing; ship after A and B. |
| D | **Dashboard improvements** | Polish pass, spread across phases | Small ergonomic fixes; do alongside A/B/C. |

---

## 2. Current state (verified)

- **Improve Prompt** only exists inside the **Rescue pipeline**:
  - `apps/api/src/jobs/processors/rescue.ts:153` — `RESCUE_SYSTEM_PROMPT` produces `improvedPrompt`, `promptScore` (0–100), `promptScores` (axes like Context/Clarity/Constraints/Format), `diff` (kept/removed/unsure), plus token/cost compression stats.
  - Route: `apps/api/src/routes/rescue/rescue.ts` (create → job queue → report with `improvedPrompt`).
  - UI: `/rescue` page, no chat integration.
- **Chat** is real: `apps/api/src/routes/chat/chat.ts` + `apps/api/src/services/chat/{prompts,context,router,store}.ts`, streamed events; composer at `components/features/chat/composer.tsx` (plain textarea, no improve affordance).
- **Terminal** (`/code`) and **Agents** (`/agents`) both render mock data from `lib/data/code.ts` (`CODE_TREE`, `AGENTS`, `TERMINAL_FLOW`). No backend, no DB, no API.
- **Sidebar** nav: `lib/config/navigation.ts` — Build group contains `Prompts`, `Passports`, `Terminal (/code)`, `Agents (/agents)`.
- **Contracts** live in `packages/contracts/src/*` (chat.ts, rescue.ts, prompt.ts) and are shared web↔API.

---

## 3. Feature A — Improve Prompt inside Chat (phase 1)

### 3.1 Goal
In `/chat`, type a rough prompt in plain English → click **Improve** → instantly get a perfectly organized, **low-token**, working prompt, with a visible score and a "what changed" diff. One click to use it.

### 3.2 UX flow

1. **Composer** (`components/features/chat/composer.tsx`): add a **"Improve" button** (wand/sparkle icon) next to the model picker. Enabled when `value.trim().length >= 10`.
2. Click → call new endpoint → show a **side panel / modal** (`components/features/chat/improve-panel.tsx`):
   - Original prompt (collapsed)
   - **Improved prompt** (editable textarea, monospace)
   - **Prompt score** before → after (radial or bar)
   - **Axis scores** (Context / Clarity / Constraints / Format) — small bar rows
   - **Diff summary**: kept / removed / added (from `diff`), terse
   - **Token savings**: estimated tokens before vs after + % reduction (reuse rescue compression math)
   - Actions: **Use in chat** (replaces composer text, closes panel) and **Run** (use + send immediately)
3. Loading state with per-axis skeleton; error state with retry (no key → link to `/keys`).
4. Small UX niceties: Ctrl/Cmd+Enter to apply; Esc to dismiss; panel keeps chat scroll position; a history of improved prompts this session is not persisted (see 3.5).

### 3.3 Backend

**New route:** `POST /improve` (mounted on the API router next to chat/rescue).

- Request: `{ content: string, targetModel?: string, sessionId?: string }`
- Response: `{ improvedPrompt, promptScore, promptScores, diff, beforeTokens, afterTokens, tokenSavingPct, costMicro, model, latencyMs }`
- Auth: same `requireAuth` middleware as chat; must load keys via existing gateway `executeRun` (reuse rescue pattern), **no new infra**.
- **Model choice:** always cheapest capable model (`deepseek-chat` or `gemini-flash-latest` fallback chain like rescue's `pickRescueModel`) — improvement is cheap; never burn the user's premium key unless no cheap key exists.

**Refactor (shared service):** extract the prompt-improvement logic out of `rescue.ts` processor into `apps/api/src/services/improve/improve.ts`:
- `improvePrompt({ workspaceId, userId, content, targetModel })` → structured result
- Reuse the existing `RESCUE_SYSTEM_PROMPT` improvement rules (or a tighter standalone `IMPROVE_SYSTEM_PROMPT` with the same JSON shape, scoped to single-prompt improvement rather than full conversation rescue).
- Add `apps/api/src/services/improve/improve.test.ts` (mock `executeRun`, assert JSON parsing, error paths, score clamping 0–100).

**Contracts** (`packages/contracts/src/prompt.ts` or new `improve.ts`):
- `improvePromptRequestSchema`, `improvePromptResponseSchema` (mirror rescue's score/diff types — consider extracting shared `promptScoreAxisSchema` to `common.ts`).

### 3.4 What "improved" means (low-token optimizer rules)

The `IMPROVE_SYSTEM_PROMPT` must instruct the model to:
1. **Keep the user's voice and intent** — never change what is asked.
2. **Add only missing essentials**: role, task, context, constraints, output format, next step — but **only if absent** (no padding).
3. **Cut filler**: remove repetition, hedging, polite preamble, redundant qualifiers. Target: fewer words than the original when possible.
4. **Structure**: one logical order (Role → Task → Context → Constraints → Format → Next), short sections with minimal markdown (bold labels, no walls of headings).
5. **Explicitly minimize tokens**: every sentence must carry information; no examples unless asked; no boilerplate like "You are an expert assistant" unless the user asked for a role.
6. Output the JSON shape used by rescue (reuse parser `rescueJsonSchema`-style; move shared schema to a module).

### 3.5 Persistence (decision: minimal in v1)

- **v1:** stateless endpoint; no DB writes. Keep `promptScores`/`diff` in-memory for the session.
- **v2 (optional):** save improved prompts as Prompt Library drafts (`prompts` table, existing `/prompts` infra) with a `source: "improve"` flag and a "Saved from chat" badge. Include a toggle in the panel: "Save a copy to Prompts".

### 3.6 Files touched (Phase A)

| File | Change |
|------|--------|
| `packages/contracts/src/improve.ts` (new) | Request/response schemas |
| `packages/contracts/src/index.ts` | Re-export improve schemas |
| `apps/api/src/services/improve/improve.ts` (new) | Shared `improvePrompt()` service (extracted from rescue) |
| `apps/api/src/services/improve/improve.test.ts` (new) | Unit tests |
| `apps/api/src/routes/improve/improve.ts` (new) | `POST /improve` route |
| `apps/api/src/routes/index.ts` | Mount router |
| `apps/api/src/jobs/processors/rescue.ts` | Refactor to call shared service (keep rescue-specific output fields) |
| `lib/services/improve.ts` (new) | Web client `improvePrompt()` via `apiFetch` |
| `components/features/chat/composer.tsx` | Improve button + keyboard shortcut |
| `components/features/chat/improve-panel.tsx` (new) | Panel UI (scores, diff, token savings, Use/Run) |
| `components/features/chat/chat-client.tsx` | Wire panel state, apply/replace composer text |

---

## 4. Feature B — Terminal sidebar item (phase 1)

### 4.1 Decision: **Remove** from sidebar; delete the demo.

Rationale:
- `/code` shows a fake animated terminal with mock `CODE_TREE`/`TERMINAL_FLOW` (`lib/data/code.ts`). A demo looks like a broken feature.
- Terminal-as-product needs real infra (file tree in DB, sandboxed execution, WebSocket terminal) — out of scope; a future real terminal should be re-introduced deliberately, not via a demo.
- The "agents" storyline currently hidden in `lib/data/code.ts` moves into the real Agents feature (Feature C).

### 4.2 Changes

| File | Change |
|------|--------|
| `lib/config/navigation.ts` | Remove `Terminal (/code)` entry from Build group |
| `app/(dashboard)/code/page.tsx` | Delete file |
| `lib/data/code.ts` | Delete file; move `Agent` type + seed data into the new agents service (see Feature C) |
| components landing/docs copies | Grep for `/code` or "Terminal" references (`app/(marketing)/docs/page.tsx`, `components/landing/*`) and remove/adjust |

### 4.3 Resulting sidebar

```
Start:  Home · Chat · Rescue
Build:  Prompts · Passports · Agents        ← Terminal gone
Learn:  Models · History · Search · Costs
Manage: Projects · Keys · Billing · Settings
```

---

## 5. Feature C — Agents: "Build your own agents" (phase 2)

### 5.1 Vision
Replace the mock `/agents` page with a real feature: users define agents (name, role/system prompt, model, tools), run them through the same gateway, and watch streaming status + costs — "build your own agents" with zero code.

### 5.2 Data model (new tables in `apps/api/src/db/schema/`)

`agents`:
- `id` (uuid pk), `workspaceId`, `name`, `role` (enum: implement/review/test/custom), `systemPrompt` (text), `modelId` (from model-registry, nullable → auto), `temperature` (nullable), `status` (active/paused), `createdAt`, `updatedAt`, `lastRunAt`

`agent_runs`:
- `id`, `agentId` (fk), `workspaceId`, `input` (text), `output` (text, nullable), `status` (queued/running/succeeded/failed), `errorMessage`, `provider`, `model`, `inputTokens`, `outputTokens`, `costMicro`, `runLatencyMs`, `startedAt`, `completedAt`

(Reuse the same cost/token columns style as rescue/run tables for consistency; migrate with drizzle-kit like the rest of the DB.)

### 5.3 API (`apps/api/src/routes/agents/agents.ts`)

- `GET /agents` — list w/ last run status + total cost
- `POST /agents` — create (validated: name ≥ 2 chars, systemPrompt ≥ 10 chars)
- `GET /agents/:id` — detail incl. recent runs
- `PATCH /agents/:id` — edit (prompt/model/temperature), `POST /agents/:id/pause` / `resume`
- `DELETE /agents/:id`
- `POST /agents/:id/runs` — queue a run (job via existing `jobs/queues` like rescue)
- `GET /agents/:id/runs` — run history; `GET /agents/runs/:runId` — single run

**Run execution:** new processor `apps/api/src/jobs/processors/agent.ts` calling `executeRun` (same gateway path as rescue/chat) with `source: "agent"`, systemPrompt = agent's prompt, then persist output/cost/latency. Model fallback: agent's chosen model → cheapest available.

### 5.4 UI (`app/(dashboard)/agents/`)

- **List** (`page.tsx`): cards — name, role chip, model, status dot (idle/running/done), last run time + cost; "New agent" button. Replace mock `AGENTS` rendering.
- **Builder** (`new/page.tsx` or modal): name, role preset (fills a starter system prompt template per role), editable system prompt w/ live token estimate, model picker (reuse `PICKER_MODELS` from `components/features/chat/chat-models.ts`), temperature slider.
- **Detail** (`[id]/page.tsx`): agent config + "Run" input box (streaming status via polling or SSE), run history list with per-run tokens/cost, error states.
- New web service `lib/services/agents.ts` (mirrors `passports.ts` pattern) + contracts `packages/contracts/src/agent.ts`.

### 5.5 Phasing

- **C1 (core):** create/edit/list/pause agents + single-shot run with persisted results. Sidebar swap from mock to real.
- **C2 (nice):** run history pagination, cost chart on agent detail, duplicate agent, system prompt templates per role, "tools" column (stub enum for now).
- **C3 (later):** multi-turn agent threads, scheduled runs, tool execution (web search etc.), terminal-like run logs.

---

## 6. Feature D — Dashboard improvements (polish, spread across phases)

Prioritized, cheap-first:

| # | Change | File(s) | Phase |
|---|--------|---------|-------|
| D1 | **Chat empty state**: surface Improve Prompt + Rescue import as primary actions (already partially there — add Improve) | `components/features/chat/chat-client.tsx` | A |
| D2 | **Session list**: show session source icon (chat/rescue/agent) in the chat drawer | `components/features/chat/chat-client.tsx` | A |
| D3 | **Keyboard shortcut hint**: `/improve` slash command or ⌘I in composer tooltip | `composer.tsx` | A |
| D4 | **Costs page**: add "improve" and "agent" cost line items to the breakdown + category icons | `app/(dashboard)/costs/` | A/C |
| D5 | **Keys page**: empty-state CTA to add a key links to which provider is cheapest for improve | `app/(dashboard)/keys/` | A |
| D6 | **Prompts library**: "Imported from chat" badge; sort by most-run | `app/(dashboard)/prompts/` | A/C |
| D7 | **Home**: replace any stale mock stat cards with real numbers (sessions, costs, agents) — audit first | `app/(dashboard)/home/page.tsx` | C |
| D8 | **Mobile/sidebar**: collapsed-mode tooltips for new nav (already exists) — re-verify after nav edits | `components/layout/sidebar.tsx` | B |
| D9 | **Docs page**: remove Terminal mentions, add Agents section | `app/(marketing)/docs/page.tsx` | B/C |

---

## 7. Roadmap & effort

| Phase | Scope | Est. effort | Ship value |
|-------|-------|-------------|------------|
| 1 | B (remove Terminal) + D8/D9 | ~1h | Declutter, trust |
| 2 | A (Improve in Chat) + D1–D3, D5 | ~1 day | Marquee feature |
| 3 | C1 (Agents core) + D4, D7 | ~2 days | New product surface |
| 4 | C2/C3 (agents polish) | later | — |

Order of work on next prompt: **B → A → C1 → D leftovers.**

---

## 8. Metrics / success signals

- Improve Prompt: % of chat sessions that open the panel; median token reduction %; sessions where improved prompt is used; per-axis score lift.
- Agents: agents created per workspace, run success rate, median run cost.
- Terminal removal: no 404s; sidebar clarity (no mock pages anywhere in app).

---

## 9. Risks & open questions

1. **Model cost of Improve** — must stay on cheap models; add hard cap on input length (e.g. 6k chars) with a "too long" message (else users paste huge text).
2. **JSON reliability** — rescue parser already strips ``` fences; share that parser so Improve gets the same hardening; on parse failure, fall back to returning raw model text as the improved prompt.
3. **Agents naming collision** — `lib/data/code.ts` `Agent` type is reused in `app/(dashboard)/agents/page.tsx`; migration must delete both cleanly (grep for `lib/data/code` usages).
4. **Open questions for you:**
   - Should Improve be a modal **or** side panel? (Plan assumes side panel.)
   - Should improved prompts auto-save to Prompts library in v1 (toggle) or only v2?
   - For agents: single-shot runs in v1 OK, or do you need multi-turn threads first?
   - Keep `/code` page reachable (hidden from nav) or fully delete?
