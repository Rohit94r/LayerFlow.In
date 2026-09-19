# LayerFlow — Bug-Fix & Remediation Log

This document tracks all identified bugs, their root causes, remediations, and verification methods across the full monorepo audit.

---

### BUG-001: Next.js ESLint HTML `<a>` Navigation Errors in Footer & Navbar
- **Component**: `apps/web/components/Footer.tsx`, `apps/web/components/Navbar.tsx`
- **Severity**: High (CI/CD build blocking lint failure)
- **Root Cause**: Raw HTML `<a>` tags were used to navigate to internal App Router pages (`/docs`, `/agents`, `/blog`, `/sign-in`), violating `@next/next/no-html-link-for-pages` and bypassing client-side prefetching and SPA navigation.
- **Fix**: Replaced raw `<a>` tags with Next.js `<Link />` components from `next/link`.
- **How Verified**:
  - `cd apps/web && npx eslint components/Footer.tsx components/Navbar.tsx` -> 0 errors.
  - `cd apps/web && npx eslint .` -> 0 errors.

---

### BUG-002: React 19 Cascading Render Warnings via Synchronous `setState` in Effects
- **Component**:
  - `apps/web/app/(dashboard)/terminal/page.tsx`
  - `apps/web/app/(dashboard)/files/page.tsx`
  - `apps/web/components/features/chat/chat-client.tsx`
  - `apps/web/components/marketing/Hero.tsx`
- **Severity**: Medium (Performance hazard & cascading layout recalculations)
- **Root Cause**: Unmanaged `void load()` or direct `setOs()` / `setActive()` invocations inside `useEffect` triggered React 19's `react-hooks/set-state-in-effect` lint warnings.
- **Fix**:
  - Implemented `let ignore = false; return () => { ignore = true; };` lifecycle guard patterns in async fetch effects.
  - Wrapped UI transitions in React `startTransition` to mark non-urgent state updates and avoid render cascade.
- **How Verified**:
  - `cd apps/web && npx eslint .` -> 0 errors, 0 hook warnings.

---

### BUG-003: Dead Imports & Unused Variable Clutter Across Dashboard
- **Component**:
  - `apps/web/lib/services/workspace.ts` (`ModelSpend`, `fallback`)
  - `apps/web/components/features/workspace/project-card.tsx` (unused `open`)
  - `apps/web/components/BuildAgentSection.tsx` (`Link` used on `<a>`)
  - `apps/web/app/(dashboard)/workspace/[projectId]/page.tsx` (`Pencil`)
  - `apps/web/components/ui/theme-provider.tsx` (`readStoredTheme`)
  - `apps/web/app/(dashboard)/settings/settings-client.tsx` (`Link`)
  - `apps/web/app/(dashboard)/team/page.tsx` (`Users`)
  - `apps/web/app/(dashboard)/models/page.tsx` (`Trash2`, `formatMoney`)
  - `apps/web/app/(dashboard)/billing/page.tsx` (dead mock constants `PLANS`, `INVOICES`)
- **Severity**: Low (Code hygiene & bundle size)
- **Root Cause**: Leftover imports and obsolete mock objects after real service wiring.
- **Fix**: Removed all dead declarations, unused parameters, and mock data constants.
- **How Verified**:
  - `cd apps/web && npx eslint .` -> down from 25 problems to 3 intentional image tags.
  - `cd apps/web && npx tsc --noEmit` -> 0 errors.

---

### BUG-004: Silently-Empty Provider Completions Treated as Success (blank chat/terminal output)
- **Component**: `apps/api/src/services/chat/router.ts`, `apps/api/src/services/ai/providers/openai-compatible.ts`
- **Severity**: High (user sees a blank reply with no error; failover chain never advances)
- **Root Cause**: A provider that answers `200` with an empty body (or a stream that fires zero deltas — e.g. an exhausted/rate-limited account that returns an empty completion) resolved as a *success*. The router persisted empty content, emitted `done`, and stopped — the deterministic way the terminal/chat could "fail" without any output or error.
- **Fix**:
  - In `router.ts` the success branch now fails over when `content` is empty/whitespace and no tool calls are present (`provider_empty_output`), so the chain moves to the next candidate/provider.
  - If every provider returns empty, the final error event now carries an actionable message pointing at `/keys` and provider usage limits.
- **How Verified**:
  - `apps/api` vitest suite (192 tests) passes; `npx tsc --noEmit` (api) clean.
  - Direct provider probe: `groq` returned `OK` with empty content → now treated as a failure and skipped.

---

### BUG-005: Dead/Expired Provider Keys Permanently Poisoned (no self-healing)
- **Component**: `apps/api/src/services/chat/health.ts`
- **Severity**: Medium (a topped-up or rotated platform key is never retried, so every workspace loses that provider forever)
- **Root Cause**: `isKeyUsable()` returned `false` for any `dead`/`expired` health row *forever*. Because such keys are never included in candidate lists, a successful call can never occur to clear the row — the intended "success re-enables everywhere" recovery path was unreachable.
- **Fix**: Dead/expired keys are re-probed after a 6-hour grace window (`KEY_REPROBE_GRACE_MS`), so restored accounts recover automatically; a still-failing key simply re-records its failure.
- **How Verified**: New `apps/api/src/services/chat/health.test.ts` unit suite (5 cases) covering unknown/healthy/degrading/cooldown and grace-window re-probe.

---

### BUG-006: Terminal REPL Lacked Phase Visibility, Thinking Timer & Session Switching
- **Component**: `apps/web/components/features/terminal/terminal-repl.tsx`, `apps/web/app/(dashboard)/terminal/page.tsx`
- **Severity**: Medium (UX — no feedback while waiting, no way to switch sessions from the web REPL)
- **Root Cause**: The REPL only showed a static "Streaming…" spinner and never surfaced the request lifecycle; the page showed no aggregate session/provider stats.
- **Fix**:
  - Added phase status badges (Idle / Queued / Connecting / Thinking / Streaming / Done / Error) in the header and per-entry; a live elapsed "Thinking" timer shown until the first token, then auto-collapsed into a "Thinking · X.Xs" disclosure.
  - Added a provider key-health dot on the model pill and a session switcher dropdown (list + load history via `GET /api/chat/:id`).
  - `terminal/page.tsx` gained quick-access docs pills and a session/provider/run/sync stats strip.
- **How Verified**: `npx tsc --noEmit` (web) clean; `npx eslint apps/web --max-warnings 0` → 0 errors, 0 warnings; `npm run build --workspace @layerflow/web` succeeds.
