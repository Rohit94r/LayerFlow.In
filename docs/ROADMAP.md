# LayerFlow Roadmap

Status as of 2026-08-28: **production-ready, pending backend host setup.** The
frontend is live on Vercel; backend deployment (API + worker off Vercel) is
documented in `docs/DEPLOYMENT.md`. This roadmap is the gap list — see
`docs/PRODUCT-STATUS.md` for the full feature audit.

## Now → 30 days (stabilization, public beta)

**Testing & CI**
- Web E2E with Playwright: sign-in → chat → save-to-memory → billing checkout.
- Worker tests (job queues: memory-extract, agent runs, usage reconciliation).
- First Go CLI tests (`go test`) in CI.
- Reduce the ~90 pre-existing lint warnings backlog.

**Observability**
- PostHog analytics events (web + API) — currently **not wired**.
- BullMQ queue dashboard (Taskforce/Bull Board) for the worker.
- Uptime monitors (UptimeRobot/Healthchecks) on `/health` + `layerflow.dev/api/lf-health`.
- Optional CLI crash reporting (opt-in Sentry/Dodo-style).

**Billing & spend**
- Flip Dodo Payments to `live_mode` and verify checkout + webhook end-to-end.
- Budget alert emails on threshold crossings.

**Continuity (browser ↔ terminal)**
- Terminal agent loop: make `lf run` a real multi-step loop with tool execution,
  approval gates, and the inline diff viewer (`tui/diff.go` is written but not
  yet invoked). Server-side agent runtime is already complete.
- `lf upgrade` atomic self-update; `lf daemon` real sync-queue draining.
- "Continue in Terminal" ↔ "Open in Browser" handoff actions in both UIs.
- (DONE, kept for reference) Durable CLI sync journal — SQLite-backed, resumes
  after offline (`internal/sync/sqlite_journal.go`).

**Platform**
- Model-router decision log (which provider/model answered each turn) visible in
  the UI; managed-vs-BYKO provider toggle.
- Team: shared chats, shared memory, shared agents.

## 30 → 90 days

- **Public beta** — SSO domain onboarding, docs site, changelog.
- SSE → WebSocket for terminal activity (lower latency, realtime devices).
- PgBouncer for Neon pooled connections; query/response time instrumentation.
- Agent platform: job-apply agent E2E, run history exports, approval policies.
- Memory: import/export, per-workspace memory namespaces, timeline.
- Search: saved/recent searches, global Cmd-K across chat+memory+agents+projects.

## 90 → 180 days

- **Folder refactor** — split the web app out of the repo root into
  `apps/web` and extract `apps/worker` (currently the API package runs the
  worker). High-risk, deferred until the feature surface settles.
- Multi-region API (edge-friendly), Redis cluster, read replicas.
- Marketplace: trust & safety, collections moderation, revenue share.
- CLI GA: `lf run`, `lf rescue` shipping crash context from any tool.

## Explicit non-goals (current)

- Stripe billing (we use Dodo Payments).
- Project Passport (removed — replaced by Chat history / Memory / Search /
  Project notes / summaries).
- Supporting arbitrary model providers beyond the managed/BYKO registry.
