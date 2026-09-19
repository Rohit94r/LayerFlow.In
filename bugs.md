# LayerFlow — Bug Log & Known Issues

All resolved bugs, environmental prerequisites, and the feature roadmap are documented here.
This is a living document — update it whenever you fix a bug or discover a new issue.

> **Status date**: 2026-09-18. Master plan: `Antirgravityplan.md` (3 phases, one-by-one).

---

## ❌ Still Not Working / Cannot Verify (honest)

| Item | Status | Exact reason |
| --- | --- | --- |
| OpenAI (`gpt-4o-mini`) replies | NOT WORKING | Verified against the live API: **no credits remaining** (402). Code failover is correct — needs a funded key. |
| DeepSeek (`deepseek-chat`) replies | NOT WORKING | Verified live: **Insufficient Balance**. |
| Kimi (`kimi-k2`) replies | NOT WORKING | Verified live: **account suspended — insufficient balance**. |
| xAI Grok (`grok-3-mini`) | NOT WORKING | Verified live: **403** (key rejected/expired). |
| Google Gemini (`gemini-flash-latest`) | NOT WORKING | Verified live: **no response within 20s** (hangs). |
| VPS deployment / live site | NOT STARTED | Phase 3 of the plan. Server `rohit@72.60.99.68` — not touched yet (read-only inspect is the first step). The site you may be seeing is the old build on your VPS, not this code. |
| `/compact` command | NOT WORKING | Local stub notice only — real API-backed summarizer not implemented yet. |
| Go CLI live streaming (`lf`) | NOT VERIFIED | `go build` + unit tests pass; no live end-to-end CLI session run against the running API this pass. |
| CLI sync / WebSocket sessions | NOT VERIFIED | Terminal page shows **"No terminal syncs yet"**; `lf` install+sync flow not exercised. |
| Docker images / compose | NOT STARTED | Nothing built yet — Phase 3. |
| Background jobs (rescue / compare / embeddings / digests) | NOT VERIFIED | Services report up locally (Redis/Postgres running); job *results* with real data not exercised. |
| Fly / Vercel / Neon remotes | NOT VERIFIED | Configs exist; not deployed/verified to those hosts. |

---

## ✅ Resolved Issues

### BUG-001 — ESLint Next.js Link violations (`<a>` inside `<Link>`)
- **Symptom**: `@next/next/no-html-link-for-pages` ESLint errors in build.
- **Root Cause**: Raw `<a href="/path">` used instead of Next.js `<Link href="/path">` in Navbar and Footer.
- **Fix**: Replaced all anchor tags with `<Link />` in `apps/web/components/Navbar.tsx` and `apps/web/components/Footer.tsx`
- **Verified by**: `cd apps/web && npx eslint .`

### BUG-002 — React 19 cascading render warning in effects
- **Symptom**: Console warning: "Cannot update a component while rendering a different component"
- **Root Cause**: Multiple synchronous setState() calls inside useEffect without ignoring stale responses.
- **Fix**: Refactored initial data loads in `terminal/page.tsx`, `files/page.tsx`, `chat-client.tsx`, `Hero.tsx` using `ignore` flag pattern.
- **Verified by**: No console warnings in dev mode.

### BUG-003 — SSE stream buffered by proxy (no output visible)
- **Symptom**: Chat/terminal shows blank output; stream dumps all at once at end.
- **Root Cause**: Nginx/Next.js rewrites buffer SSE frames until the response ends.
- **Fix**: Added initial `: connect\n\n` comment frame in `apps/api/src/routes/chat/chat.ts`
- **Verified by**: Token-by-token rendering visible at `http://localhost:3000/terminal`

### BUG-004 — Terminal REPL TypeScript errors
- **Symptom**: `tsc --noEmit` fails with TS18047 and TS2322 in `terminal-repl.tsx`
- **Root Cause**: Null-unsafe `langMatch` usage + `string | null | undefined` provider type mismatch.
- **Fix**: Added `langMatch &&` guard; added `?? undefined` coercion for nullable fields.
- **Verified by**: `cd apps/web && npx tsc --noEmit` → exit 0

### BUG-005 — ESLint `react-hooks/purity` violations (Date.now in async handlers)
- **Symptom**: 17 ESLint errors: "Cannot call impure function Date.now() during render"
- **Root Cause**: Strict purity rule flags Date.now() even in async event handlers.
- **Fix**: Replaced all ID-generation calls with a pure `useRef` counter (`nextId()`). Removed unused imports.
- **Verified by**: `cd apps/web && npx eslint .` → 0 errors

### BUG-006 — Silent blank replies when a provider returns empty output
- **Symptom**: Chat/terminal resolves with no text and no error; failover never advances.
- **Root Cause**: `router.ts` treated a `200` with empty/whitespace content (e.g. exhausted account returning an empty completion) as success.
- **Fix**: Empty completions are now a `provider_empty_output` failure that moves the chain along; an all-empty round gets an actionable `/keys` message.
- **Verified by**: `apps/api` vitest suite (192 tests); full provider probe in `apps/api`.

### BUG-007 — Dead/expired provider keys never self-heal
- **Symptom**: A topped-up or rotated platform key stays blocked in every workspace.
- **Root Cause**: `isKeyUsable()` permanently excluded `dead`/`expired` keys, so they were never retried and the success-recovery path was unreachable.
- **Fix**: Dead/expired keys re-probe after a 6-hour grace window (`KEY_REPROBE_GRACE_MS`).
- **Verified by**: New `health.test.ts` unit suite (5 cases).

### BUG-008 — Terminal REPL showed no lifecycle/thinking feedback and couldn't switch sessions
- **Symptom**: Web REPL only showed a static spinner while waiting; no session history or provider health in the model pill.
- **Fix**: Phase status badges, live "Thinking" elapsed timer (auto-collapsed disclosure), provider key-health dot, session switcher (list + history), and a terminal page stats strip.
- **Verified by**: `tsc --noEmit` clean; `eslint apps/web --max-warnings 0` → 0 errors/warnings; `next build` succeeds.

---

## ⚠️ Known Environmental Prerequisites

| Prerequisite | Required For | Notes |
| --- | --- | --- |
| **Redis** (local or Upstash) | Chat sessions, job queue, budgets | Running locally via `brew services` now |
| **Postgres 16 + pgvector** | All workspace data, memories, search | Running locally via `brew services` now |
| **At least one funded provider API key** | Real AI replies in terminal/chat | All currently configured keys are out of credits / invalid (see "Still Not Working") |
| **BullMQ worker running** | Rescue, compare, embeddings, digests | Included in `npm run dev` |
| **`BETTER_AUTH_SECRET`** | Auth | `openssl rand -hex 32` |
| **`PROVIDER_KEYS_KEK`** | BYOK key encryption | `openssl rand -hex 32` (must be 64 hex chars) |

---

## 🗺️ Remaining Work (execution order — matches Antirgravityplan.md)

### Phase 1 — Terminal & Chat output (mostly done)
- [x] Empty-output failover, key self-healing, actionable errors
- [x] REPL status badges, thinking timer, provider health dot, session switcher
- [x] Stats strip + docs pills; lint 0/0; `tsc`; `next build`; 197 API tests; live E2E stream
- [ ] `/compact` real implementation (API-backed summarizer)
- [ ] Go CLI live parity run against the running API
- [ ] Fund primary keys → confirm real OpenAI/DeepSeek/Kimi replies (external action)

### Phase 2 — Product UI suite (simple & clean, same language as landing page)
- [ ] Design-token audit (extract landing look into shared tokens)
- [ ] Dashboard home `/home` restyle (overview: plan, spend, runs, sessions, provider health)
- [ ] Docs `/docs` + Pricing `/pricing` alignment (landing page itself untouched)
- [ ] Consistency pass: Chat, Costs, History, Keys, Settings, Team, Models, Prompts, Files, Memory, Search, Workspace, Billing, Agents
- [ ] Terminal/Chat final polish (light/dark, mobile, empty/loading/error states)
- [ ] Phase 2 verify: `typecheck`, `eslint --max-warnings 0`, `next build`, screenshot every page

### Phase 3 — Docker + VPS (friend's VPS, one container)
- [ ] Read-only pre-flight on `rohit@72.60.99.68`: `docker ps`, inspect what was already pushed, measure headroom
- [ ] Minimal `docker-compose.prod.yml` + local build + smoke test
- [ ] Deploy one container; env injected (never committed); live smoke tests (`/health`, `/terminal` stream)
- [ ] Cleanup any unwanted artifacts from earlier pushes; write one-page deploy runbook

---

## 🗺️ Future Feature Roadmap

### Near-term
- [ ] Terminal `/compact` live implementation (summarize session via API)
- [ ] Go CLI parity: add `/improve`, `/compact`, `/cost` slash commands to `lf` TUI
- [ ] Provider **BYOK** flow polish in `/keys` (per-key test, copy-hint, revoke)
- [ ] Deploy runbook + one-command deploy script

### Mid-term
- [ ] Terminal session persistence via localStorage
- [ ] Multi-tab terminal sessions with separate session IDs
- [ ] File attachment drag-and-drop into REPL prompt
- [ ] Terraform/one-shot VPS provisioning for the friend's VPS (only prod services)

### Long-term
- [ ] Agent runs in web terminal with tool-use approval cards
- [ ] MCP server connection UI in dashboard
- [ ] Collaborative sessions (CRDT/OT)
- [ ] Offline mode: service worker + local Ollama fallback
