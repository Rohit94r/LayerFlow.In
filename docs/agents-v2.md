# LayerFlow Agents V2 — Master Blueprint

> **Owner:** Rohit Jadhav · **System:** LayerFlow AI Agent Platform — *Agents* subsystem only.
>
> Stack: **Next.js 16 (App Router, React 19)** · **Hono API** (`apps/api`) · **PostgreSQL 16 (pgvector)** · **Redis 7** · **BullMQ 5** · shared Zod contracts (`@layerflow/contracts`).

This document is the single source of truth for assembling, extending, and
releasing the Agents system. It is written against the **actual current code**
in this monorepo, so every section carries a status badge:

| Badge | Meaning |
| --- | --- |
| **[IMPLEMENTED]** | Shipped and working in the repo (verified against source). |
| **[PARTIAL]** | Scaffold exists; a piece listed is missing. |
| **[GAP]** | Not implemented yet — the section describes the required design. |

Both implementers and reviewers use these badges to know exactly where work ends.

---

## 0. Executive summary

Agents are **durable AI workers**. Unlike a stateless model call, an agent has:

- an **onboarding profile** (goal, resume, interview prefs) persisted as JSON;
- a **scoped permission set** per agent (mode, grantor, expiry);
- a **durable run/step log** replayed by both polling and SSE;
- **human-in-the-loop approvals** for high-risk actions (never silent);
- **memory** and **documents** that survive sessions and devices;
- **downstream records** (applications, interviews, recruiter contacts, notifications).

The web app mounts the Hono API at `/api/*` and `/v1/*`
(`app/api/[[...route]]/route.ts` → `@layerflow/api`), so the browser and the
`lf` CLI share one backend, one queue, and one set of contracts.

**Current state:** the create-wizard, CRUD, single-run worker, progress SSE,
approvals, memory, documents, and marketplace are **implemented**.
**Remaining gaps** that this blueprint details: scheduled/repeatable runs,
the multi-agent orchestrator, real browser automation + job discovery,
push notification delivery, audit-log retention, and the memory-scoring + dedup
backend.

---

## 1. UX wireframes (textual)

### 1.1 Create Agent wizard — `app/(dashboard)/agents/new`

A 6-step conversational stepper. URL accepts `?template=<key>&goal=<text>` to
pre-seed from the marketplace. Light theme (`useAgentLightTheme` forces the
`.light` class), Geist font, rounded zinc cards.

**Step 1 — Goal discovery.** Free-text chips + adaptive fields:

```
┌─────────────────────────────────────────────────────────────┐
│  Agents  ›  New agent                                  step 1/6│
│  Goal                                                            │
│  "I want a Job Applying Agent."                         [infer] │
│  Role______________  [Internship ▾ | Full-time ▾]               │
│  Locations (Mumbai, Pune, Remote) ______  Salary range ______  │
│  Experience level ▾  Preferred companies ______  Industries ___│
│  Work authorization ▾  Notice period ▾   [Continue →]          │
└─────────────────────────────────────────────────────────────┘
```

**Step 2 — Resume collection.** Premium modal, 4 entry modes.

```
Resume
 [ Upload PDF ] [ Upload DOCX ] [ Paste text ] [ Fill manually ]
 "Upload is recommended: the agent auto-extracts your details and
  keeps multiple resume versions for ATS optimization."
    (drop zone + signed upload URL)
```

**Step 3 — Automatic extraction.** Editable field list (name, email, phone,
skills, education, projects, experience, certifications, GitHub, LinkedIn,
portfolio). Client-side `parseResumeText()` runs for pasted text today; full
LLM parsing is the target path.

**Step 4 — Interview preferences.** Availability, timezone, communication
preference, remote preference, relocation willingness.

**Step 5 — Permissions.** Each permission row shows label + category with a
3-way control: **Allow once / Allow always / Deny**. A security summary is
rendered before continuing (see §6).

**Step 6 — Confirmation.** Final review card:

```
Agent name        {role} Agent
Goal              {opportunityType} {role} in {locations}
Daily schedule    {template.defaultSchedule}
Expected activity {template.expectedOutcome}
Est. AI usage     {template.estimatedCost}
Permission summary  7 × chips (emerald=allowed, rose=denied)

                              [ Create Agent ]
```

Creating calls `POST /api/agents`, then optionally
`POST /api/agents/:id/upload-resume`, then `POST /api/agents/:id/runs` if input
was pasted — and navigates to the detail page which begins background execution.

### 1.2 Agents list — `app/(dashboard)/agents`

Template grid (marketplace) + "your agents" grid. Each card shows name, goal,
status badge (`Paused` / `N approvals`), 3-slot metrics (Found / Applied /
Score), run count + cost, last-run `timeAgo`, and a pause/resume button.

### 1.3 Agent dashboard — `app/(dashboard)/agents/[id]`

Left column = **Overview** (status, started at, last/next action) + **Metrics**
(7 tiles) + **Activity timeline** (chronological `agent_steps`, reversed).
Right column = **Pending approvals** (approve / reject / edit / approve-all)
+ **Applications** + **Memory** + **Recent runs** (token/cost breakdown).

### 1.4 Approvals modal

```
"Apply to Google — Software Engineer Intern (Remote)?"
  Resume score 87% · Submit application
  [ Approve ]  [ Approve all similar ]  [ Edit application ]  [ Reject ]
```

### 1.5 Security summary (Step 5 → Step 6)

A compact card listing the 7 job-applying permissions and their resolved modes,
with the hard rule "Application submission and follow-up emails default to
**Deny** / require per-action approval."

## 2. Component hierarchy

```
app/(dashboard)/agents/
  page.tsx              AgentsPage — list + marketplace  [IMPLEMENTED]
  new/page.tsx          NewAgentWizard (6-step, client)  [IMPLEMENTED]
  [id]/page.tsx         AgentDetailPage (poll + render)  [IMPLEMENTED]

components/
  ui/                   button, badge, input, modal, skeleton,
                        progress, tabs, switch, icons (Hugeicons shim)
  features/agents/      (proposed) client islands:
        AgentTimeline.tsx        chrono step list
        AgentMetrics.tsx         7-tile metric grid
        ApprovalPanel.tsx        approve/reject/edit/approve-similar
        ApprovalModal.tsx        per-application review
        ResumeUpload.tsx         PDF/DOCX/paste/manual + signed URL
        AgentLiveStream.tsx      EventSource → timeline (upgrade path)
  shared/               section.tsx, row.tsx, stat.tsx, page-header.tsx

lib/
  services/agents.ts    typed client → lib/api/client (apiFetch)  [IMPLEMENTED]
  api/client.ts         zod-validated fetch wrapper                [IMPLEMENTED]
  agents-presets.ts     role prompts for coding agent roles        [IMPLEMENTED]

apps/api/src/
  routes/agents/agents.ts       Hono router + SSE stream            [IMPLEMENTED]
  services/agents/agents.ts     persistence/orchestration/approvals  [IMPLEMENTED]
  jobs/processors/agent.ts      BullMQ processor + job-applying sim  [IMPLEMENTED]
  jobs/queues.ts                queue + repeatable scheduler         [IMPLEMENTED]
  db/schema/agents.ts           12-table Drizzle schema              [IMPLEMENTED]
packages/contracts/src/agent.ts  all request/response Zod schemas    [IMPLEMENTED]
```

**Rules (from `docs/architecture.md`):** server-first pages; pages fetch once
through `lib/services/*` and pass data down to client islands; a client
component never fetches page data itself; one navigation source of truth;
icons registered in `components/ui/icons.tsx`.

---

## 3. Database schema — PostgreSQL (Drizzle ORM)

All tables in `apps/api/src/db/schema/agents.ts`. Every table carries
`workspaceId` (tenancy) and `...timestamps` (`createdAt`, `updatedAt`).
ID columns use the `idColumn(prefix)` helper (prefix + cuid). **[IMPLEMENTED]**
unless noted.

```
workspaces (tenancy)
   │ 1:many
agents  "ai_agents"
   ├─ id, workspaceId→workspaces(cascade)
   ├─ name, role, templateKey?, goal?, systemPrompt, modelId?, temperature?
   ├─ status 'active'|'paused', tools text[], schedule?, expectedActivity?,
   ├─ estimatedUsage?, onboarding jsonb, metrics jsonb, lastRunAt?
   │  indexes: (workspace_id), (template_key)
   │
   ├─1:many→ agentTemplates  "agent_templates"  (key unique, marketplace mirror)
   ├─1:many→ agentRuns       "ai_agent_runs"
   │      input, output?, status queued|running|succeeded|failed,
   │      errorMessage?, provider?, model?, inputTokens, outputTokens,
   │      costMicro, runLatencyMs?, startedAt?, completedAt?
   │      idx: (agent_id), (workspace_id), (status)
   ├─1:many→ agentSteps      "agent_steps"   (chronological progress events)
   │      runId?→runs(set null), type, title, description?, status
   │      queued|running|waiting|completed|failed, severity info|success|
   │      warning|danger, data jsonb, occurredAt
   │      idx: (agent_id, occurred_at), (workspace_id)
   ├─1:many→ agentPermissions "agent_permissions"
   │      key, label, description?, category?, mode allow_once|allow_always|
   │      deny, grantedByUserId?→users, grantedAt?, expiresAt?
   │      UNIQUE(agent_id, key); idx(workspace_id)
   ├─1:many→ agentMemories    "agent_memories"
   │      kind, title, body, data jsonb, importance int, lastUsedAt?
   │      idx: (agent_id), (workspace_id)
   ├─1:many→ agentDocuments   "agent_documents"
   │      fileId?→files(set null), documentType resume|cover_letter|
   │      portfolio|certificate|other, title, fileName?, mimeType?,
   │      status uploaded|parsed|failed, encrypted bool default true,
   │      extraction jsonb
   │      idx: (agent_id), (workspace_id)
   ├─1:many→ agentApprovals   "agent_approvals"
   │      runId?→runs(set null), targetType, targetId?, title,
   │      description?, riskLevel low|medium|high, status pending|approved|
   │      rejected|edited, payload jsonb, decisionNote?, decidedByUserId?,
   │      decidedAt?
   │      idx: (agent_id, status), (workspace_id)
   ├─1:many→ applicationRecords "application_records"
   │      approvalId?→approvals(set null), company, roleTitle, location?,
   │      jobUrl?, source?, status discovered|matched|needs_approval|
   │      submitted|interview|rejected|withdrawn, resumeScore?, coverLetter?
   │      idx: (agent_id), (workspace_id, status)
   ├─1:many→ interviewRecords  "interview_records"
   │      applicationId?→apprecords(set null), company, roleTitle,
   │      scheduledAt?, timeZone?, format?, status scheduled|completed|
   │      cancelled, feedback?
   ├─1:many→ recruiterContacts "recruiter_contacts"
   │      company, name?, email?, linkedinUrl?, relationshipStage?,
   │      lastContactAt?
   └─1:many→ agentNotifications "agent_notifications"
          type, title, body?, status unread|read|dismissed, data jsonb
```

### 3.1 Schema gaps to close

| Gap | Design |
| --- | --- |
| **Orchestrator relations** **[GAP]** | Add `parentRunId`/`parentAgentId` and `children jsonb` to `agents`/`agentRuns`, or a dedicated `agent_run_nodes` table (parent/child, runId, kind, aggregateResult) — see §14. |
| **Audit log retention** **[GAP]** | `agent_steps` doubles as audit today; add `actor` + `immutable` flags and a weekly purge/archive job to a cold table. |
| **Memory scoring backend** **[GAP]** | `importance`/`lastUsedAt` are stored but not updated by the worker; add an LLM summarizer + decay job (§7). |
| **Repeatable schedule state** **[GAP]** | `agents.schedule` is a display string; persist parsed cron + tz and register per-agent schedulers (§5). |

---
## 4. API specification — REST (Hono)

All routes are auth-gated (`requireAuth` → sets `workspaceId`/`userId`) and
zod-validated via `packages/contracts/src/agent.ts`. Base path `/api/agents`.
Everything below is **[IMPLEMENTED]** unless tagged.

| Method | Path | Purpose | Body / Query → Response |
| --- | --- | --- | --- |
| GET | `/api/agents/templates` | Marketplace templates | → `{ templates: AgentTemplate[] }` |
| GET | `/api/agents` | List agents + usage | → `{ agents: AgentWithUsage[] }` |
| POST | `/api/agents` | Create agent | `CreateAgentRequest` → `{ agent }` |
| GET | `/api/agents/:id` | Fetch agent + recent runs | → `{ agent, runs }` |
| PATCH | `/api/agents/:id` | Update agent/onboarding/mode | `UpdateAgentRequest` → `{ agent }` |
| POST | `/api/agents/:id/start` | Create run + enqueue | → `{ agent, run }` |
| POST | `/api/agents/:id/pause` | Pause | → `{ agent }` |
| POST | `/api/agents/:id/resume` | Resume | → `{ agent }` |
| GET | `/api/agents/:id/progress` | Dashboard snapshot | → `AgentProgressResponse` |
| GET | `/api/agents/:id/stream` | SSE live feed (60 ticks × 2 s) | `event: progress` |
| GET | `/api/agents/:id/logs` | Chronological steps (≤200) | → `{ steps }` |
| POST | `/api/agents/:id/approve` | Approve/reject/edit/approve-similar | → `{ approval, agent }` |
| POST | `/api/agents/:id/upload-resume` | Link parsed resume doc | → `{ document }` (201) |
| DELETE | `/api/agents/:id` | Delete agent (cascade) | → `{ id, deleted }` |
| POST | `/api/agents/:id/runs` | Ad-hoc run | `{ input }` → `{ run }` (202) |
| GET | `/api/agents/:id/runs` | Paginated runs | `?limit&offset` → `{ runs }` |
| GET | `/api/agents/runs/:runId` | Single run | → `{ run }` |

### 4.1 Selected request/response examples

**Create agent**
```
POST /api/agents
{ "name":"SWE Intern Agent", "role":"job_apply", "templateKey":"job_applying",
  "goal":"Software Engineer Intern in Mumbai/Remote",
  "systemPrompt":"You are a Job Applying Agent...",
  "tools":["safe_browser","resume_parser","cover_letter_writer","approval_gate","agent_memory"],
  "schedule":"Weekdays at 09:00, 13:00, 18:00", "expectedActivity":"...", "estimatedUsage":"...",
  "onboarding":{ "goalDiscovery":{ "role":"Software Engineer Intern","locations":"Mumbai, Remote",
    "opportunityType":"Internship","salaryRange":"...","experienceLevel":"Students","industries":"Tech" },
    "interviewPreferences":{ "availability":"Mon–Fri 10:00–16:00 IST","timeZone":"Asia/Kolkata",
      "communication":"Email + In-app","remotePreference":"Remote-first","relocation":"Open to Pune" } } }
```
```
200 → { "agent": { "id":"ag_...", "status":"active", "metrics":{ "jobsFound":0, ... }, ... } }
```

**Approve an application**
```
POST /api/agents/:id/approve
{ "approvalId":"appr_...", "decision":"approve", "note":"Looks good" }
200 → { "approval":{ "status":"approved", "decidedAt":"..." }, "agent":{ "metrics":{ "jobsApplied":1 } } }
```

**Progress snapshot (SSE data payload = same shape)**
```
GET /api/agents/:id/progress
→ { "agent": {...}, "overview":{ "status":"running","lastAction":"Scoring resumes",
    "nextAction":"Requesting approval to submit" },
    "metrics":{ "jobsFound":12,"jobsApplied":1,"pendingApprovals":1,"successScore":84 },
    "timeline":[ {...step...} ], "pendingApprovals":[...], "applications":[...],
    "memories":[...], "documents":[...] }
```

### 4.2 API gaps to close **[GAP]**

- **`POST /api/agents/:id/schedule`** — enable/disable the repeatable cron and store parsed schedule.
- **`GET /api/agents/:id/logs?cursor=`** — cursor pagination beyond the 200-row cap.
- **`GET /api/agents/:id/audit`** — immutable, generated-actor audit trail.
- **Rate limits per route** — `rateLimit({ rpm })` middleware now applied to `approve` (30/min), `runs` (20/min), `upload-resume` (10/min) (§9).
- **Idempotency key** on `approve` prevented by design (approval must flip once); add `If-Match`/`decisionAt` concurrency guard to avoid double-submit (§9).

---
## 5. Queue architecture — BullMQ on Redis

**[IMPLEMENTED]** core; **[GAP]** for scheduled + orchestrator work.

- **Single queue** `layerflow` (`src/jobs/queues.ts`), dispatched by job name to
  `src/jobs/processors/*`. Worker runs as a separate process (`npm run worker`,
  `src/worker.ts`, concurrency 5). Defaults: `attempts:3`, exponential backoff
  2 s, `removeOnComplete:1000`, `removeOnFail:5000`.
- **`agent` job** (`processors/agent.ts`): payload `{ agentRunId, agentId,
  workspaceId, userId? }`. Loads the run → marks `running` → routes by
  `templateKey`:
  - `job_applying` → `processJobApplyingAgent` (simulated discover → score →
    cover letter → approval → submit), which writes `agent_steps`, inserts
    `application_records` + `agent_approvals` (pending), and bumps metrics.
  - others → **generic gateway run**: `pickAgentModel` (priority list of
    `hasUsableProviderKey`) → `executeRun` → persists output/cost/latency →
    records workspace activity.
- **Repeatable jobs today** (`registerScheduledJobs`): usage-rollup (hourly),
  budget-alerts (15 min), weekly-digest (Mon 09:00Z) — idempotently upserted on
  worker boot so multiple workers never double-schedule.

### 5.1 Target: scheduled per-agent runs **[GAP]**

Add to `registerScheduledJobs` a generator that scans active/paused agents with
a parsed `agents.schedule` and upserts `JobScheduler("agent:<id>", { pattern })`
that enqueues `agent` (or a new `agent.cycle`) jobs. Guard with a `lastRunAt`
clock to avoid storms; honor `status='paused'` by skipping enqueue.

### 5.2 Target: orchestrator graph execution **[GAP]**

Introduce a dedicated `agent-orchestrate` job name + an `agent_run_nodes`
table. A supervisor job fans out child `agent` jobs (§14), aggregates results,
and emits one merged `agent_step`. Child failures retry independently (BullMQ
attempts) and are surfaced as `failed` child nodes without failing the parent.

### 5.3 Reliability guarantees

- Durable run row per attempt; `status` transitions are the source of truth.
- BullMQ retries + exponential backoff; failed runs persist a clear
  `errorMessage`.
- Never fail-open: provider/gateway errors fail the run row and rethrow for
  BullMQ retry.
- Idempotency: job payload carries `agentRunId`; processors re-read state
  rather than trusting in-memory.

---

## 6. Permission engine design

**[IMPLEMENTED]** data model + enforcement point; **[PARTIAL]** expiry/audit wiring.

### 6.1 Model

`agent_permissions` row per (agent, key): `mode ∈ {allow_once, allow_always,
deny}`, `grantedByUserId`, `grantedAt`, `expiresAt`. Uniqueness on
`(agent_id, key)`. Template definitions carry a default `mode` (`deny` default
in the Zod schema; job-applying sets hard-risk keys to `deny`).

### 6.2 Decision flow

```
resolve(key, action, agentId):
  1. lookup row by (agent_id, key); if none → deny
  2. if expiresAt < now → deny (and flag expired)
  3. allow_always → allow; allow_once → drain to deny after use; deny → deny
```
**Hard rule:** *submission, email, and job-board writes are never silent.* Even
where a permission is `allow_always`, the worker must still create an
`agent_approval` with `riskLevel=high` and route through `POST /approve`
(`decideAgentApproval`). The current worker actually simulates submission and
records an application with a **pending approval** — enforcement is complete.

### 6.3 UI + lifecycle

- Wizard Step 5 renders template permissions with 3-way control; security
  summary on Step 6.
- `allow_once` must be drained atomically (UPDATE … WHERE mode='allow_once'
  guarded) to prevent double-use after an approval tap.

### 6.4 Gaps **[GAP]**

- **Expiry sweep job** — **shipped**: the `agent-maintenance` hourly job flips
  non-deny permissions past `expiresAt` to `deny` and decays unused memories
  (`importance` −1 past 30 days, floored at 1). Remaining: per-grant audit rows
  and the safe-browser domain allow-list.
- **Audit trail** of grants/revokes (who, when, why) into `agent_steps` or a
  dedicated table.
- **Domain allow-lists** for `open_external_pages` (safe browser allow-list) so
  "open external pages" is bounded to career/job domains.

---
## 7. Memory system design

**[IMPLEMENTED]** durable storage + UI; **[GAP]** scoring/retrieval backend.

### 7.1 What must be remembered

- previous applications and their statuses (`application_records`),
- recruiter conversations (`recruiter_contacts.relationshipStage`),
- rejected / blacklist companies (flag + memory),
- interview feedback (`interview_records.feedback`),
- preferred resume versions (`agent_documents`),
- free-form user instructions (`agent_memories.kind='instruction'`).

### 7.2 Storage model

`agent_memories` — per-agent, workspace-scoped rows `{ kind, title, body, data
jsonb, importance int(1–5), lastUsedAt, createdAt }`. Memory is **scoped to one
agent** and survives sessions/devices because it lives in Postgres, keyed by
`agentId`, not by any transient session. The dashboard surfaces them as cards.

### 7.3 Read path + write path

- **Write:** any worker step that learns durable facts (application submitted,
  company rejected, feedback received) inserts/upserts a memory row.
- **Read:** memory is projected into `AgentProgressResponse.memories` for the
  UI; for prompt assembly, memory rows are injected into the agent's system
  context before `executeRun`.
- **Retrieval (target):** because memory is per-agent and small relative to
  corpora, a relevance window (importance + recency) is often enough. For large
  memories, embed with the existing `services/memory/embed.ts` (pgvector) and
  top-k for context.

### 7.4 Gaps **[GAP]**

- **LLM summarizer + decay job:** a scheduled job recomputes `importance` and
  `lastUsedAt` and merges near-duplicate memories, so memory doesn't bloat.
- **Types/redaction:** keep secrets out of memory (secret redaction), and tag
  memories with an `expiresAt` for transient facts.
- **Cross-agent sharing (orchestrator):** parent-child agents should be able to
  read a restricted shared namespace (blacklists, contact context) §14.

---

## 8. Real-time update architecture

**[IMPLEMENTED]** SSE endpoint + client polling; **[GAP]** WebSocket/push.

### 8.1 Current pipeline

- Worker writes durable `agent_steps` (the chronological, replayable log).
- `GET /api/agents/:id/progress` projects a full snapshot (overview, metrics,
  timeline, approvals, applications, memories, documents).
- `GET /api/agents/:id/stream` uses Hono `streamSSE` to emit `event: progress`
  every 2 s (60 ticks = 2 min window) with the same snapshot payload.
- The detail page (`[id]/page.tsx`) currently **polls `progress` every 2.5 s**
  (no client SSE yet) — the SSE route is ready to be consumed by a client
  `EventSource` for true push.

### 8.2 Target: SSE for streaming + push notifications

1. Client island `AgentLiveStream.tsx` opens `EventSource('/api/agents/:id/stream')`
   and appends `progress` events into the timeline + metrics (replacing the
   2.5 s poll, or keeping the poll as a reconnect fallback).
2. On reconnect, replay `GET /progress` to fill gaps (SSE is a live feed, the
   durable log is the source of truth).
3. **Push (gap):** agent lifecycle events (new approval, run completed, high
   risk) → `agent_notifications` → a lightweight fan-out via
   WebSocket (µWebSockets/hono) or a Webhook/email digest, reusing the existing
   `notifications` router. SSE stays for the in-page timeline.

### 8.3 Correctness

- SSE payloads are derived projections; the DB `agent_steps` is canonical, so
  replay, multi-device, and reconnect are exactly-once-through-Postgres.
- Throttle/coalesce: flush step insertions to the snapshot only when metrics or
  approvals actually change to avoid redundant payloads.

---
## 9. Error handling strategy

**Layered approach** (mirrors existing `middleware/app-error.ts` + Hono):

### 9.1 Layers

1. **Validation (edge):** zod request schemas parse before any handler runs →
   `400 invalid_request` with field detail. File bodies capped by `bodyLimit`
   (1 MB JSON, 25 MB files) → `413 payload_too_large`.
2. **Auth:** `requireAuth` → `401`/`403`; tenancy is enforced by always
   querying on `(workspaceId, id)` so one tenant can never read another's
   agent. No silent cross-tenant reads.
3. **Domain:** `AppError(status, code, message)` — `404 not_found`,
   `409` on duplicate permission/approval double-decision,
   `429 rate_limited` (Redis fixed-window via `rateLimit` middleware).
4. **Orchestration (worker):** run rows transition `queued→running→succeeded|
   failed`; failures persist `errorMessage` and rethrow for BullMQ retry
   (`attempts:3`, exp. backoff). Failed runs are surfaced in the dashboard as
   "Needs review" (`failed` status).
5. **Infra (fail-closed):** provider/gateway/DB errors fail the run rather than
   silently succeeding; budgets are fail-closed (existing `gateway-budget`
   tests enforce this). Redis-down for rate-limiting fails **open** (non-critical)
   but budget checks fail closed.

### 9.2 Retry + idempotency semantics

- **Approve/reject** flips one `agent_approval` row; use an
  `UPDATE … WHERE status='pending'` guard so a double tap returns `409`
  instead of double-submitting (§4.2). This is **action-replay protection**.
- **Uploads** are idempotent by `fileId`; re-linking a resume updates the
  existing primary document.
- **Runs** are idempotent by `agentRunId` — a replayed BullMQ job re-reads
  state and no-ops if already settled.

### 9.3 Secret redaction + observability

- Never log raw approval payloads, resume text, or provider keys; pino logging
  redacts known secret shapes. API responses never echo `systemPrompt` secrets.
- Correlate across API ↔ worker with `x-request-id` + `agentRunId` in logs;
  Sentry (`observability/sentry.ts`) captures worker exceptions with
  `{ jobId, jobName }`.

---

## 10. Testing plan

Aligns with existing `vitest` setup (`vitest.config.ts`, `apps/api/src/test/*`,
`packages/contracts`). Gate: `npm run typecheck`, `npm run lint`, `npm test`.

### 10.1 Unit (fast, no infra) — `ioredis-mock`, zod contracts, pure fns

- **Contracts:** every agent request/response schema round-trips; enum bounds
  (permission modes, statuses, application statuses) reject invalid values.
- **Permission resolver:** allow_once drains atomically; expiresAt short-circuits;
  unknown key denies; allow_always + high-risk still routes to approval.
- **Worker helpers:** `readString`/`splitList`/`mergeMetrics`; `pickAgentModel`
  priority with mocked `hasUsableProviderKey`.

### 10.2 Integration (real Postgres) — mirrors `helpers/integration-db.ts`

- **CRUD:** create/list/get/update/delete agent under tenancy isolation (tenant B
  cannot fetch tenant A's agent).
- **Run lifecycle:** enqueue `agent` job → run goes queued→running→succeeded
  with output/cost; provider failure → run `failed` + `errorMessage`, retried.
- **Approval:** `decideAgentApproval` approve/reject/edit/approve_similar
  transitions the row, bumps metrics, and emits `agent_steps`; double-decision
  is rejected.
- **Upload-resume:** links `agent_documents` row (parsed vs uploaded) and writes
  a `document.resume_uploaded` step.
- **Progress projection:** snapshot matches rows after a simulated
  `processJobApplyingAgent` cycle.

### 10.3 E2E (frontend, happy-dom)

- Wizard: 6-step flow builds the correct `CreateAgentRequest`, infer goal chips,
  resume paste extraction populates editable fields, permissions summary renders.
- Dashboard: `progress` snapshot renders overview/metrics/timeline/approvals;
  approve button calls `decideApproval`.
- List: template grid + agent cards + pause/resume toggle.

### 10.4 Security/contract tests

- Tenancy isolation; secret redaction on error/log paths; SSE payload is
  workspace-scoped; rate-limit 429 + `Retry-After`.

### 10.5 Suggested new suites for the gaps

- Repeatable scheduler upsert (no double schedule across two workers).
- Orchestrator fan-out + aggregation + independent child failure.
- Memory summarizer/dedup/decay idempotency.

---
## 11. 8-week implementation roadmap

Each week ships something a user can touch and includes the related tests.
Everything in **Week 1** is largely done today; the weeks harden and fill gaps.

| Week | Focus | Deliverables | Status anchor |
| --- | --- | --- | --- |
| **W1** | Baseline harden | Run `typecheck`/`lint`/`test` green; tenancy + approval + run tests; review wizard edge cases (paste extraction, manual fill) | [IMPLEMENTED] core |
| **W2** | Live streaming UX | `AgentLiveStream.tsx` consumes SSE `/stream`; replace 2.5 s poll with SSE + progress replay fallback; throttle snapshot coalescing | [GAP] |
| **W3** | Scheduled runs | Parse `agents.schedule` (cron + tz); per-agent `JobScheduler`; pause-aware enqueue; schedule endpoint + UI toggle | [GAP] |
| **W4** | Permission lifecycle | Expiry sweep job; grant/revoke audit into `agent_steps`; allow-once atomic drain; domain allow-lists for safe browser | [PARTIAL] |
| **W5** | Memory intelligence | LLM summarizer + decay + dedup job; prompt-injection of top-k memories; redaction | [GAP] |
| **W6** | Multi-agent orchestrator | `agent_run_nodes` + `agent-orchestrate` job; parent-child fan-out; aggregation; child-failure isolation | [GAP] |
| **W7** | Real discovery + safety | Safe browser automation boundaries (allow-list, headless sandbox); real job discovery/duplicate detection; ATS-optimized generation; signed upload hardening | [PARTIAL→GAP] |
| **W8** | Release readiness | Push notifications + digest; audit export; rate-limit wiring; production checklist (§12) green; load test + soak | [GAP] |

> Milestone gates: **M1** (end W2) — live progress dashboard. **M2** (end W5) —
> background + memory + permissions lifecycle. **M3** (end W8) — GA.

---

## 12. Production readiness checklist

**Infra / data**
- [ ] Postgres (Neon/RDS) + Redis (Upstash/managed) reachable from API *and* worker; `docker-compose` matches prod env.
- [ ] Drizzle migrations generated + `db:verify` passes; indexes present (`agent_steps(agent_id, occurred_at)`, `agent_approvals(agent_id,status)`, `application_records(workspace,status)`).
- [ ] BullMQ repeatable jobs registered exactly once (idempotent upsert) and surviving workers don't double-fire.
- [ ] Object storage (R2) with **signed upload/download URLs**, 25 MB cap, `MAX_FILE_SIZE_BYTES` enforced in both contracts and `bodyLimit`.

**Security**
- [ ] Every agent route enforces `(workspaceId, id)` tenancy — no cross-tenant reads.
- [ ] `requireAuth` on all `/api/agents/*`; rate limits on `approve`, `runs`, `upload-resume`.
- [ ] **No silent submission**: high-risk actions always produce a pending `agent_approval`.
- [ ] `allow_once` drained atomically; expired permissions auto-deny; action-replay protection on `approve`.
- [ ] Resume bytes encrypted at rest (`agent_documents.encrypted=true`); secrets redacted from logs/SSE.
- [ ] Safe-browser allow-list + headless sandbox; `Permissions-Policy` + security headers already set in Next + Hono.

**Reliability / observability**
- [ ] Run `status` is the source of truth; failures persist `errorMessage` and retry with backoff.
- [ ] pino request/run correlation (`x-request-id`, `agentRunId`); Sentry captures worker exceptions.
- [ ] Memory summarizer/decay prevents unbounded growth; audit log retention job defined.

**UX / release**
- [ ] Light theme everywhere (wizard/list/detail force `.light`); WCAG contrast; keyboard focus on approval buttons.
- [ ] SSE with reconnect + progress replay; no data loss on device switch (memory + docs in Postgres).
- [ ] Success criteria met: create agent <3 min; upload resume once; live progress; approve from dashboard; return later to see completed work; continue on another device.

**Docs/ops**
- [ ] `docs/agents-v2.md` badges kept current; `scripts/check-production.sh` + `scripts/deploy-api-prod.sh` pass; `.env.example` documents every new var (R2_*, SCHEDULE_*, NOTIFY_*).

---

## 13. Security model (consolidated)

- **Permission scoping:** per-agent `agent_permissions`; high-risk actions are
  always approval-gated; `allow_once` drains atomically; expiry enforced.
- **Safe browser boundaries:** bounded allow-list for `open_external_pages`;
  headless, sandboxed, no credentials auto-filled; navigation limited to
  job/company domains until explicitly granted.
- **Action replay protection:** approval decision guarded by
  `UPDATE … WHERE status='pending'`; runs idempotent by `agentRunId`.
- **Secret redaction:** provider keys encrypted with `PROVIDER_KEYS_KEK`;
  resume/log payloads never logged in full.
- **Signed uploads:** presigned R2 URLs, size/mime caps, workspace-scoped keys.
- **Audit logs:** `agent_steps` records who/what/when for grants, decisions,
  uploads; extend with `actor` + immutability (gap §3.1).
- **Rate limits:** Redis fixed-window per workspace on sensitive routes.

---
## 14. Multi-agent orchestrator design **[GAP]**

A Job Applying Agent is really a workflow of specialized workers. The
orchestrator wires them as parent → children and aggregates results.

### 14.1 Topology

```
Job Applying Agent (supervisor / parent)
├── Job Search Agent      (discover + de-dup)
├── Resume Optimizer      (ATS-optimize the chosen resume)
├── Cover Letter Agent    (tailored letter per job)
├── Application Agent     (compose + submit w/ approval gate)
└── Follow-up Agent       (schedule follow-ups after N days)
```

### 14.2 Data model

- Add `parentId` (self-FK) to `agents` + `agent_run_nodes`: `{ id, runId,
  agentId, parentNodeId?, kind ('supervisor'|'search'|'optimize'|'letters'|
  'apply'|'followup'), status, output, errorMessage, startedAt?, completedAt? }`.
- Child agents reuse `agentRuns`/`agentSteps` but link `runId` back to the
  parent node for aggregation and dashboard drilling.

### 14.3 Execution

1. User starts the **supervisor** → `agent-orchestrate` job.
2. Supervisor loads goal/onboarding, fans out child `agent` jobs (BullMQ `flow
   producer` parent–child dependencies or a simple fan-out + wait).
3. Each child writes its own `agent_steps` and returns a structured result
   (`search_results`, `optimized_resume`, `cover_letters`, `approval_payloads`,
   `followup_plan`) persisted in `agent_run_nodes.output`.
4. Supervisor **aggregates**: merges `application_records`, creates pending
   `agent_approvals` for submission, and emits one merged `agent_step`
   (`orchestrator.aggregated`).
5. **Failure isolation:** a child that fails after BullMQ retries is marked
   `failed` in its node; the parent can continue with partial results or pause,
   never a cascade kill.

### 14.4 Permissions + memory across children

- Child agents inherit the parent's permission scope; high-risk actions still
  route to the parent's approval queue.
- Children read a **restricted shared memory namespace** (blacklist companies,
  recruiter context, resume pointer) via `agent_memories` → §7.4.

---

## 15. Current implementation map (the source of truth)

| Concern | File | Status |
| --- | --- | --- |
| Contracts (schemas, request/response) | `packages/contracts/src/agent.ts` | [IMPLEMENTED] |
| DB schema (12 tables) | `apps/api/src/db/schema/agents.ts` | [IMPLEMENTED] |
| Hono router + SSE stream | `apps/api/src/routes/agents/agents.ts` | [IMPLEMENTED] |
| Persistence/orchestration/approvals | `apps/api/src/services/agents/agents.ts` | [IMPLEMENTED] |
| BullMQ `agent` processor + job-apply sim | `apps/api/src/jobs/processors/agent.ts` | [IMPLEMENTED] |
| Queue + repeatable scheduler | `apps/api/src/jobs/queues.ts` | [IMPLEMENTED] |
| Worker entrypoint | `apps/api/src/worker.ts` | [IMPLEMENTED] |
| Frontend service client | `lib/services/agents.ts` | [IMPLEMENTED] |
| Wizard (6 steps) | `app/(dashboard)/agents/new/page.tsx` | [IMPLEMENTED] |
| List + marketplace | `app/(dashboard)/agents/page.tsx` | [IMPLEMENTED] |
| Detail dashboard (SSE live) | `app/(dashboard)/agents/[id]/page.tsx` (EventSource `/stream` + fallback poll) | [IMPLEMENTED] |
| Push notifications | notifications router (email/in-app fan-out) | [GAP] |
| Scheduled per-agent runs | `registerScheduledJobs` extension | [GAP] |
| Multi-agent orchestrator | §14 | [GAP] |
| Memory scoring/decay backend | `agent-maintenance` job: permission expiry + memory importance decay | [PARTIAL] |
| Real browser automation/discovery | §11 W7 | [GAP] |
| Permission expiry + audit | `agent-maintenance` job expires grants; audit export still TODO | [PARTIAL] |
| Approval replay/concurrency guard | atomic `UPDATE … WHERE status='pending'` in `decideAgentApproval` | [IMPLEMENTED] |
| Rate limits on sensitive routes | `rateLimit` on `approve`/`runs`/`upload-resume` | [IMPLEMENTED] |

### How to verify this document matches code

```bash
npm run typecheck && npm run lint && npm test
cd apps/api && npm run db:verify   # migrations + schema
docker compose up -d                # local postgres + redis
npm run dev                         # web + api + worker (concurrently)
```

---

*End of LayerFlow Agents V2 Blueprint. Keep the status badges in §15 updated as
gaps close; the doc is the shared contract between product, frontend, backend,
and QA.*

---