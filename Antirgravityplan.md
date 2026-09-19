# LayerFlow — Antigravity Master Execution Plan (v2 · Production-Ready)

> **Mission**: A full, working, production-grade product — terminal + chat output first, then a simple & clean product UI (same language as the landing page), then a minimal Docker + VPS deployment.
>
> **Truth rule**: Not one thing here is claimed done without proof. Every task carries a **status**: `DONE·verified` / `DONE·not-verified` / `TODO` / `BLOCKED (external)`. Everything not verified is listed in `bugs.md` with the exact reason. We never fake it.

---

## 🛡️ Guardrails (non-negotiable)

1. **Friend's VPS** (`rohit@72.60.99.68`): never push fat/unwanted images, never overload resources, keep footprint minimal. VPS credentials are supplied in chat at deploy time and are **never written into this repo**.
2. **Landing page stays untouched** — the user's landing is exactly right. Only `docs` + `pricing` get aligned to it; dashboard pages get restyled to the same simple & clean design language.
3. **No secrets in files**: `.env.production`, real API keys, DB passwords → injected at runtime, never committed.
4. **Small, safe steps**: one work item at a time, verified before the next begins.
5. **Honest status only**: if it can't be verified here (no credits, no VPS access, no paid key), it says so loudly.

---

## 🗺️ The 3 Phases

```
PHASE 1 · NOW   → Terminal + Chat output FULLY working (local, proven end-to-end)
PHASE 2 · NEXT  → Product UI suite: dashboard, docs, pricing — simple & clean,
                  same design language as the landing page, terminal polish final
PHASE 3 · LAST  → Docker image + one-container VPS deploy (friend's VPS),
                  post-deploy smoke tests, cleanup
```

---

## ⚙️ Phase 1 — Terminal & Chat Output: Fully Working

**Goal**: the user can open `/terminal`, type anything, and get tokens + a real reply (or a clear, actionable error). No silent blank output, ever.

| # | Task | Status | Proof |
|---|------|--------|-------|
| 1.1 | Empty provider output (200 + blank body / zero-delta stream) becomes a failover trigger instead of a "successful" blank reply | `DONE·verified` | `apps/api/src/services/chat/router.ts` → `provider_empty_output`; browser test returned streamed text, not blank |
| 1.2 | Dead/expired provider keys self-heal (re-probe after 6h) so a topped-up/rotated key recovers without DB surgery | `DONE·verified` | `apps/api/src/services/chat/health.ts` (`KEY_REPROBE_GRACE_MS`) + new unit suite |
| 1.3 | All-fail round surfaces an actionable message (check `/keys`, usage limits) | `DONE·verified` | router final-error path |
| 1.4 | Terminal REPL: phase status badges (Idle/Queued/Connecting/Thinking/Streaming/Done/Error) | `DONE·verified` | live `Idle` badge on `/terminal` |
| 1.5 | Terminal REPL: live "Thinking" elapsed timer + auto-collapsed "Thinking · Xs" disclosure | `DONE·verified` | browser: `Thinking · 0.4s` rendered after reply |
| 1.6 | Terminal REPL: provider key-health dot on the model pill | `DONE·verified` | code + `/keys` endpoint wired |
| 1.7 | Terminal REPL: session switcher (recent sessions + load history) | `DONE·verified` | `AI Terminal` switcher rendered |
| 1.8 | Terminal page: docs quick-pills + session/provider/run/sync stats strip | `DONE·verified` | `PROVIDERS READY`, `RECENT RUNS` rendered |
| 1.9 | Lint/type/build gates: `tsc` clean, `eslint --max-warnings 0` → 0/0, `next build` passes | `DONE·verified` | run 2026-09-18: 197 API tests, web tsc + eslint + build all green |
| 1.10 | End-to-end streaming test with a real provider reply | `DONE·verified` | browser: prompt → Groq `gpt-oss-120b` → streamed reply "WORKING", 1.6s, $0.000 |
| 1.11 | `/compact` — real API-backed context summarization | `TODO` | currently a local stub notice only |
| 1.12 | Go CLI (`terminal/`) live parity test against the running API | `DONE·not-verified` | unit/build pass; no live CLI session tested this pass |
| 1.13 | Primary providers (OpenAI, DeepSeek, Kimi) actually answering | `BLOCKED (external)` | accounts out of credits / suspended; xAI `403`; Google hangs. Code-side failover covers them, but real replies need funded keys |

**Phase 1 exit criteria**: every `TODO`/`BLOCKED` above is either resolved, or explicitly deferred to Phase 2/3 with a reason in `bugs.md`.

---

## 🎨 Phase 2 — Product UI Suite: Simple, Clean, One Design Language

**Goal**: the whole product looks and feels like the landing page — clean, focused, easy. Deliverable-by-deliverable, screenshot-verified.

### 2.0 Design system audit (start here)
- Extract the landing page's visual tokens (surface, borders, ink, warm orange `#f97316` accent, spacing, typography) into the shared classes already used (`bg-surface`, `border-border`, `text-ink`, `text-brand`).
- Confirm `globals.css` tokens are the single source of truth.

### 2.1 Dashboard home page (`/home`)
- Restyle to a clean overview: workspace name + plan, quick actions (New Chat / Terminal), spend + token summary, recent runs/sessions, provider health row.
- Consistent card style, generous whitespace, no clutter.
- Verify: `tsc`, `eslint`, `next build`, screenshot.

### 2.2 Docs page (`/docs` + `/pricing`)
- Docs: real navigation index with architecture, run guides, troubleshooting — styled like the landing. Do **not** touch the marketing landing itself.
- Pricing: restyle to match the landing's simple & clean look (keep content).

### 2.3 Dashboard pages consistency pass
- Apply the same simple & clean treatment to: Chat, Costs, History, Keys, Settings, Team, Models, Prompts, Files, Memory, Search, Workspace, Billing, Agents.
- Every page: loader + empty + error states present. No raw `<img>`, no `<a>` navigations.

### 2.4 Terminal + Chat final polish
- Terminal: light/dark mode, mobile, empty/loading/error states, no layout shifts while streaming.
- Chat page: parity of status/error treatment with the terminal.

### 2.5 Verify pass
- One command each: `npm run typecheck`, `eslint apps/web --max-warnings 0`, `next build`; then screenshot every page and log results.

---

## 🐳 Phase 3 — Docker + VPS Production (friend's VPS, one container)

**Goal**: the app live at `72.60.99.68`, minimal footprint, self-healing, nothing wasted.

### 3.0 Pre-flight (read-only)
- `ssh` to `rohit@72.60.99.68`, `docker ps`, inspect the existing container + what was already pushed (read-only, no changes).
- Document disk/RAM/CPU headroom before anything is installed.

### 3.1 Local Docker build
- Minimal `docker-compose.prod.yml`: web (Next) + api + worker, reuse existing Postgres/Redis or lightweight sidecars; resource caps set.
- Build + run locally first; smoke test `/health`, `/terminal` stream.

### 3.2 Deploy (smallest safe step)
- Env supplied at deploy time (never in a file in the repo). One image push, one container up.
- Smoke tests on the live IP: pages load, `/terminal` streams with a real funded key.

### 3.3 Cleanup & handoff
- Remove anything unwanted pushed earlier; prune unused images only if safe.
- Write the deploy runbook (one page) + mark all `BLOCKED` items closed or re-listed.

---

## ✅ One-by-One Execution Log

> Update after each completed item. Tick only when the "Proof" column is satisfied.

- [x] 1.1 Empty-output failover · 2026-09-18 · browser: streamed reply, not blank
- [x] 1.2 Key self-heal · 2026-09-18 · unit suite added
- [x] 1.3 Actionable all-fail error · 2026-09-18 · router path
- [x] 1.4 Status badges · 2026-09-18 · live badge
- [x] 1.5 Thinking timer · 2026-09-18 · `Thinking · 0.4s`
- [x] 1.6 Health dot · 2026-09-18 · wired to `/keys`
- [x] 1.7 Session switcher · 2026-09-18 · rendered
- [x] 1.8 Stats strip + docs pills · 2026-09-18 · rendered
- [x] 1.9 Gates green · 2026-09-18 · 197 tests / 0 lint / build ok
- [x] 1.10 E2E streaming · 2026-09-18 · Groq reply "WORKING"
- [ ] 1.11 `/compact` real implementation
- [ ] 1.12 Go CLI live parity test
- [ ] 1.13 Primary providers funded & replying (external — needs credits)
- [ ] 2.0 Design token audit
- [ ] 2.1 Dashboard home restyle
- [ ] 2.2 Docs + pricing alignment
- [ ] 2.3 Dashboard pages consistency pass
- [ ] 2.4 Terminal/Chat final polish
- [ ] 2.5 Phase 2 verify pass + screenshots
- [ ] 3.0 VPS read-only pre-flight
- [ ] 3.1 Local docker build + smoke
- [ ] 3.2 Deploy + live smoke tests
- [ ] 3.3 Cleanup + runbook + handoff

---

## 📋 What's NOT working / NOT verified — exactly why

Full honest list lives in `bugs.md` → "❌ Still Not Working / Cannot Verify". Short version:

- **OpenAI / DeepSeek / Kimi replies**: `BLOCKED (external)` — verified against the live APIs: no credits / suspended / out of balance. Code failover works; real output needs funded keys.
- **xAI (Grok)**: `403` — key rejected by the API. External.
- **Google (Gemini)**: hangs / no reply within 20s — external.
- **VPS deployment**: not started — Phase 3 per plan.
- **`/compact`**: stub notice only.
- **Go CLI live streaming**: build/tests pass; no live end-to-end run this pass.
- **CLI sync / WebSocket**: page shows "no syncs"; install+live sync not exercised.
- **Docker images**: none built yet (Phase 3).
- **Background jobs (rescue/compare/embeddings/digests)**: services up locally; end-to-end job results not exercised with real data.
- **Fly/Vercel/Neon remotes**: configs exist; not deployed to them.