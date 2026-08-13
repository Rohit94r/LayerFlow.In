# LayerFlow Roadmap

Status as of 2026-08-14: **private beta ready**. The frontend is live on
Vercel; backend deployment is documented in `docs/DEPLOYMENT.md` and pending
host setup. This roadmap is the gap list from the production audit
(`AUDIT_REPORT.md`).

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
- Durable CLI sync journal (persist pending ops locally; resume after offline).
- "Continue in Terminal" ↔ "Open in Browser" handoff actions in both UIs.
- `chat` / `run` / `sync` / `rescue` / `upgrade` subcommands: replace stubs with
  real provider execution via the gateway.

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
