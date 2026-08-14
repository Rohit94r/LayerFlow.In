# LayerFlow Terminal — `lf` Master Blueprint

> **Owner:** Rohit Jadhav · **Product:** LayerFlow Terminal Agent Platform (the `lf` CLI).
> **Target:** public beta, macOS · Linux · Windows.
> **Stack (Go 1.24+):** Bubble Tea (TUI) · Lip Gloss (styling) · Cobra (CLI) · SQLite (local)
> · Hono API (server sync, from this monorepo's `apps/api`) · PostgreSQL + Redis (server)
> · SSE/WebSocket (streaming) · OpenAI-compatible provider interface · MCP · LSP · Git.

This is the single implementation spec a small team can build from. It is written to be
**continuity-compatible** with the existing web platform: the terminal and the web share
the same **session IDs**, **memory namespaces**, **project passports**, and **chat
message shape**, so `lf` and the browser feel like one product.

### Cross-platform reference — existing web surface the `lf` client syncs to

| Concern | Web endpoint (this repo) | `lf` mirrors |
| --- | --- | --- |
| Durable sessions | `GET/POST /api/sessions`, `GET/PATCH/DELETE /api/sessions/:id`, `POST /api/sessions/:id/messages` | `internal/sync` |
| Memory CRUD + search | `/api/memory` (list/get/create/update/delete/search) | `internal/memory` |
| Chat streaming | `/api/chat` | `internal/providers` + `internal/stream` |
| Auth | better-auth session cookie / device code | `internal/auth` |
| Passport / workspace | web `(dashboard)/passports` model | `internal/passport` |

---

## 1. Executive summary

`lf` is a **local-first AI terminal workspace**. All state lives in a local, encrypted
SQLite DB and works offline; the cloud (Hono/Postgres/Redis) is a **sync mirror**, not a
dependency. The CLI provides:

- a keyboard-first Bubble Tea TUI with streaming, markdown, diffs, and approval cards;
- a **slash-command router** (`/model`, `/provider`, `/sync`, `/memory`, …) that never
  leaks commands to the model;
- durable branchable **sessions** with browser↔terminal continuity on the same IDs;
- a **permissioned tool framework** with before-action approval;
- **repository intelligence** that auto-generates a **Project Passport**;
- a **hybrid search** engine (filename + content + git + embeddings + memory);
- **MCP**, **LSP**, **Git**, and an **OpenAI-compatible provider abstraction** with an
  intelligent model router;
- an optional **background daemon** for sync/index/notifications/file-watching;
- secure OS-keyring token storage, device-code login, and opt-in telemetry.

**Non-goals for v1:** a full IDE, remote arbitrary-shell hosts, non-LTR languages,
unattended (fully autonomous) commits without review, storing plaintext secrets.

**Guiding principle:** *the terminal is the primary surface; the web is the mirror.*
Local wins on conflict; cloud loses — until the user explicitly reconciles (the safest
---

## 2. Architecture diagram

```
┌───────────────────────────────   lf (Go binary)  ─────────────────────────────────┐
│                                                                                    │
│  cmd/lf ── Cobra root                                                              │
│   │   chat · run · sessions · mcp · daemon · login · sync · doctor · rescue · cost │
│   │                                                                                │
│   ├───────────────┐  ┌─────────────────── TUI (Bubble Tea) ───────────────────┐   │
│   │  lifecycle    │  │ app(model) ── views(conversation/diff/approval/file/…) │   │
│   │  (startup,    │  │ cmds(slash router) · stream(view) · status bar · help  │   │
│   │  shutdown,    │  └────────────────────────────────────────────────────────┘   │
│   │  signals)     │                                                                │
│   └───────────────┘                                                                │
│                                                                                    │
│   ┌──────────────────────────── core services (pure) ───────────────────────────┐  │
│   │  session · message · memory · passport · search · compact · context · cost  │  │
│   └────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                    │
│   ┌──────────── runtime subsystems ────────────────────────────────────────────┐  │
│   │  providers(router, streaming, SSE)   tools(permissioned)   sandbox(shell)  │  │
│   │  git · lsp · mcp · editor · watcher(fsnotify) · daemon · sync              │  │
│   └────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                    │
│   ┌──────── local persistence ──────────────────────────────────────────────────┐  │
│   │  storage(sqlite, migration) · config(file merge) · keyring(OS) · cache     │  │
│   │  audit(append-only) · logs(rotating)                                        │  │
│   └─────────────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────────────┘
        │ https (SSE / WS / REST, signed)                      │ localhost (HTTP/gRPC)
        ▼                                                      ▼
┌──────────────────── LayerFlow web/API (Hono) ──────────┐   ┌────────────────────────┐
│  /api/sessions · /api/memory · /api/chat · /api/passport│   │  remote/local providers │
│  PostgreSQL · Redis(pub/sub+queues) · R2 files          │   │  OpenAI·Anthropic·Gemini│
└──────────────────────────────────────────────────────────┘   │  DeepSeek·Groq·OpenRouter│
                                                               │  local (Ollama/LM Studio)│
                                                               └─────────────────────────┘
```
## 3. Data flow diagrams

### 3.1 Prompt → response (streaming)

```
user input ──► TUI view
   │  (starts with '/')? ──YES──► cmds router (never sent upstream)
   ▼  NO
context engine ──► {passport, memory, open files, search, compressed history}
      ▼
model router ──► pick provider/model (task + budget + latency + availability)
      ▼
provider.stream(prompt, tools, ctx, cancel)
      ▼  token deltas + tool-call events (SSE/stream)
stream adapter ──► optimistic append of partial text + stdin cancellation (Ctrl+C)
      ▼  on complete / on error
store message (local SQLite; mark sync_state = queued)
      ▼
sync worker (daemon/foreground) ──► POST /api/sessions/:id/messages (signed)
```

### 3.2 Tool invocation (with approval)

```
LLM requests tool ──► tool.Plan(input) ──► risk level + permission key + preview
      ▼
permission engine ──► decided(permKey, scope)?  YES → Execute ──► result(snapshot, output)
                     ▼ NO
          approval card (once / session / project / environment)
                     ▼ decision
          allow/deny recorded → audit append
                     ▼ allow
          sandbox.Exec (timeout, env filter, cwd isolation, danger check)
                     ▼
          result + diff/rollback snapshot → audit → log
```

### 3.3 Sync (bidirectional, conflict-safe)

```
Append-only local journal of operations (op_id, device_id, lamport clock)
   ▼ push (signed REST)   ┌──────────────────────────────────────────────┐
server applies idempotently (op_id dedup) ──►  returns server ops (pull)  │
   ▼ merge on client with rule: same record → last-writer-by-oper_tick     │
     wins; an offline local write is never silently overwritten            │
   sync_state per row: 'synced' | 'queued' | 'conflict' → /sync reconciles  │
                                                                           │
Full protocol in §7 · JSON contracts in §8. ──────────────────────────────┘
```

---

### Processes

- **`lf` foreground** — TUI driven by a single Bubble Tea program; streaming/sync run in
  that process (goroutines) or delegate to the daemon.
- **`lf daemon`** (optional) — long-lived local process owning file-watching, background
  indexing, the sync queue, and scheduled agents (v1.1). Foreground talks to it over a
  localhost HTTP (or gRPC) socket; the daemon is the single writer to SQLite to avoid
  write-contention deadlocks.

---
## 4. CLI UX specification

### 4.1 Commands (Cobra)

| Command | Purpose |
| --- | --- |
| `lf` | Launch interactive TUI (default per session) |
| `lf chat [query]` | Start or continue a session; `--model`, `--provider`, `-n` non-interactive |
| `lf run "<task>"` | Non-interactive single task agent run, live step stream, `--max-steps` |
| `lf sessions` | List/restore/branch/delete sessions (`--open`, `--id`) |
| `lf login` | Device-code OAuth → stores refresh token in OS keyring |
| `lf logout` | Revoke + purge cached tokens |
| `lf sync` | Force push/pull; `--dry-run`, `--resolve conflict-id` |
| `lf doctor` | Diagnostics: config, DB, providers reachability, keyring, MCP health |
| `lf rescue` | Same rescue/portability flow as the web (`Report`/`Continue Pack`) |
| `lf cost` | Session/project token & $ usage (mirrors web cost engine) |
| `lf mcp list/add/remove/health` | MCP server management |
| `lf daemon start/stop/status` | Background daemon lifecycle |
| `lf version` / `lf upgrade` | Version + auto-update |

### 4.2 Keyboard map (TUI)

| Key | Action |
| --- | --- |
| `Enter` | Send / confirm approval |
| `Tab` / `Shift+Tab` | Cycle approval buttons / focusable regions |
| `↑`/`↓` | History / scroll conversation & scrollback |
| `Ctrl+C` | Cancel current generation (first) → exit (second) |
| `Ctrl+L` | Clear screen |
| `Ctrl+D` | Leave session (save) |
| `Ctrl+K` | Open command palette / slash menu |
| `/` | Begin slash command with autocomplete menu |
| `Esc` | Dismiss modal / close diff view |
| `y`/`n` | Approve / reject focused approval card |
| `a`/`A` | Always allow (session/project) on focused card |
| `g` | Toggle git bar |
| `Ctrl+P` | Project switch |
| `PageUp/PageDown` | Scroll scrollback |
| `?` | Help overlay |

### 4.3 Slash command router

`/help, /model, /provider, /status, /new, /sessions, /use, /compact, /memory
[on|off|list|forget], /search, /project, /sync, /cost, /clear, /rescue, /agents,
/doctor, /login, /logout`.

Any line whose first non-space char is `/` is intercepted first. Unknown slash → help.
Commands are **never** appended to the model payload. `Tab` on `/` lists matches.

```go
package cmds

import "strings"

var table = map[string]Command{ /* key → handler */ }
## 5. Package structure (Go monorepo) + responsibilities

```
lf/
├── go.mod │ go.sum
├── cmd/
│   └── lf/                     main.go — Cobra root + command wiring + lifecycle
├── internal/
│   ├── app/                    composition: build the app, wires everything (DI)
│   ├── tui/                    Bubble Tea program, models, views, keymaps, theming
│   │   ├── views/              conversation, diff, approval, file, help, palette
│   │   └── widgets/            markdown, syntax highlight, spinner, statusbar
│   ├── cmds/                   slash-command router + handlers
│   ├── session/                session create/restore/branch, message store
│   ├── context/                hierarchical context selector (prio: msg→history→…)
│   ├── providers/              Provider interface, registry, router, streaming, SSE
│   ├── stream/                 token stream adapter + cancellation + reconnect
│   ├── tools/                  Tool framework + built-ins (see §10)
│   ├── sandbox/                shell execution (timeout, env filter, danger check)
│   ├── permission/             permission engine + decision store (see §11)
│   ├── editor/                 safe editing: preview diff, atomic write, snapshot rollback
│   ├── git/                    status/diff/branch/commit/blame + changed-file context
│   ├── lsp/                    client: diagnostics/symbols/references/hover/actions
│   ├── mcp/                    MCP client registry, namespace isolation, health
│   ├── memory/                 memory CRUD + scoring + injection (see §12)
│   ├── search/                 hybrid search (filename+content+git+embeddings) (see §13)
│   ├── passport/               repo intelligence → Project Passport generate/load
│   ├── compact/                AI context summarizer + token savings
│   ├── sync/                   push/pull journal, conflict resolution, signing (see §7)
│   ├── daemon/                 daemon lifecycle, IPC server, watcher, index queue
│   ├── watcher/                fsnotify wrapper → invalidation + reindex
│   ├── auth/                   device-code OAuth, keyring token store, refresh
│   ├── config/                 layered config merge (project>user>default)
│   ├── storage/                SQLite pool, migrations, crypto (DB encryption)
│   ├── audit/                  append-only audit log writer
│   ├── log/                    structured logger + rotation
│   └── telemetry/              opt-in usage/crash sink (never file contents)
├── pkg/
│   ├── oaitype/                OpenAI-compatible request/response types
│   ├── markdown/               renderer (terminal-safe)
│   └── diff/                   unified/git diff parser + renderer
├── test/
│   ├── integration/            end-to-end CLI tests (golden)
│   ├── fixtures/               sample repos, passports, tool outputs
│   └── mocks/                  provider/tool/LSP/MCP mocks
└── scripts/                    build, installers, release, lint, gen
```

**Rules:** `internal/` is import-safe (no public API). `pkg/` is shared/importable. TUI
imports only service interfaces (never providers/tools directly). Pure logic lives in
`pkg/` for unit-testability; IO sits behind small interfaces in `internal/`.

---

// Route returns handled=true when the input is a local slash command.
func Route(s string, stx CmdContext) (handled bool, err error) {
    if !strings.HasPrefix(strings.TrimSpace(s), "/") {
        return false, nil
    }
    name, args := split(s)
    cmd, ok := table[name]
    if !ok {
        return true, ErrUnknownCommand(name)
    }
    return true, cmd.Run(stx, args)
}
```

### 4.4 Light theme + status bar

Bottom status bar: project • branch • model • provider • tokens/cost • sync state •
daemon state • version. Model switch reflects immediately (reset per-provider state, §9).

---
## 6. SQLite schema

Local DB at `~/.local/share/layerflow/lf.db` (or `%LOCALAPPDATA%\layerflow\lf.db`).
Encrypted at rest (SQLCipher, key from OS keyring, §18). PRAGMA `foreign_keys=ON`,
`journal_mode=WAL`. Migrations via `golang-migrate/migrate` (versioned SQL in
`internal/storage/migrations/`).

```sql
-- sessions: durable, branchable, synced to /api/sessions
CREATE TABLE sessions (
  id            TEXT PRIMARY KEY,           -- uuid (same as web)
  parent_id     TEXT REFERENCES sessions(id) ON DELETE SET NULL, -- branch
  title         TEXT,
  project_path  TEXT,
  model         TEXT,
  provider      TEXT,
  created_at    INTEGER NOT NULL,           -- unix ms
  updated_at    INTEGER NOT NULL,
  input_tokens  INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cost_micro    INTEGER NOT NULL DEFAULT 0, -- micro-dollars
  compressed_context TEXT,                  -- from /compact
  sync_state    TEXT NOT NULL DEFAULT 'synced', -- synced|queued|conflict
  deleted_at    INTEGER
);
CREATE INDEX idx_sessions_updated ON sessions(updated_at DESC);

-- messages: one conversation row stream (mirrors web message shape)
CREATE TABLE messages (
  id         TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  role       TEXT NOT NULL,                 -- system|user|assistant|tool
  content    TEXT,                          -- text or tool payload (JSON)
  tool_call_id TEXT,                        -- for tool messages
  model      TEXT,
  provider   TEXT,
  input_tokens  INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  edited_at  INTEGER,
  hidden     INTEGER NOT NULL DEFAULT 0,    -- pruned by /compact (moved to summary)
  op_id      TEXT NOT NULL,                 -- sync operation id (idempotent)
  device_id  TEXT NOT NULL,                 -- origin device
  op_tick    INTEGER NOT NULL,              -- lamport clock
  sync_state TEXT NOT NULL DEFAULT 'synced'
);
CREATE INDEX idx_messages_session ON messages(session_id, created_at);

-- passports: Project Passport per project root
CREATE TABLE passports (
  id            TEXT PRIMARY KEY,
  project_path  TEXT NOT NULL UNIQUE,
  overview      TEXT, architecture TEXT, commands_json TEXT,
  deps_json     TEXT, conventions TEXT, deploy_notes TEXT,
  tasks_json    TEXT,
  generated_at  INTEGER, updated_at INTEGER, sha TEXT
);

-- memory: local-first memory (types: preference|style|project_fact|command|decision)
CREATE TABLE memory (
  id         TEXT PRIMARY KEY,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  project_path TEXT,
  importance INTEGER NOT NULL DEFAULT 3,    -- 1..5
  tags_json  TEXT,
  created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
  op_id TEXT NOT NULL, device_id TEXT NOT NULL, op_tick INTEGER NOT NULL,
  sync_state TEXT NOT NULL DEFAULT 'synced'
);

-- permissions: remembered tool decisions per scope
CREATE TABLE permission_decisions (
  id          TEXT PRIMARY KEY,
  tool_key    TEXT NOT NULL,
  scope       TEXT NOT NULL,                -- once|session|project|global
  project_hash TEXT,
  session_id  TEXT,
  decision    TEXT NOT NULL,                -- allow|deny
  expires_at  INTEGER,
  created_at  INTEGER NOT NULL
);
CREATE INDEX idx_perm_lookup ON permission_decisions(tool_key, scope, project_hash);

-- file_snapshots: editor backups for rollback (/undo)
CREATE TABLE file_snapshots (
  id           TEXT PRIMARY KEY,
  session_id   TEXT,
  project_path TEXT NOT NULL,
  rel_path     TEXT NOT NULL,
  content      TEXT NOT NULL,               -- prior content
  kind         TEXT NOT NULL DEFAULT 'pre', -- pre|post (rollback point)
  created_at   INTEGER NOT NULL
);

-- audit: append-only, tamper-evident chain (see §18)
CREATE TABLE audit (
  seq      INTEGER PRIMARY KEY AUTOINCREMENT,
  ts       INTEGER NOT NULL,
  actor    TEXT,                            -- user|agent
  action   TEXT NOT NULL,                   -- tool.run | approve | deny | sync | login...
  target   TEXT,
  payload_json TEXT,
  prev_hash TEXT NOT NULL,                  -- sha256 of previous row
  row_hash TEXT NOT NULL                    -- sha256(ts|actor|action|target|payload|prev)
);

-- sync journal: operations pending push
CREATE TABLE sync_journal (
  op_id    TEXT PRIMARY KEY,
  entity   TEXT NOT NULL,                   -- session|message|memory|passport
  entity_id TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  device_id TEXT NOT NULL, op_tick INTEGER NOT NULL,
  state    TEXT NOT NULL DEFAULT 'pending', -- pending|acked|failed
  attempts INTEGER NOT NULL DEFAULT 0
);
```

Branching: `sessions.parent_id` + copy-on-write message re-pointing. Restore = set the
branch as active (its `updated_at` bumps, `op_tick` advances).

---
## 7. Sync protocol

**Goal:** browser ↔ terminal continuity on the same session/memory/passport, safely
offline-first.

### 7.1 Design rules

1. **Local journal is the source of truth.** Every write appends a row to
   `sync_journal` (and marks the target row `queued`).
2. **Idempotent by `op_id`** — server dedups on `(device_id, op_id)`; re-delivery is
   safe.
3. **Lamport clocks** (`op_tick` per device) resolve ordering on the same record:
   *last-writer-by-tick wins*. A tick is bumped on every local write; on pull, each
   device advances its clock to `max(local, remote)`.
4. **Local wins on conflict by default.** A record we wrote offline that the server
   also changed is stored as `conflict` and surfaced in `/sync --resolve`; the user
   picks local or remote. We never silently discard local work.
5. **Signed requests** — every API call carries `Authorization: Bearer <session>` +
   `X-LF-Device: <device_id>` + `X-LF-Sig: HMAC-SHA256(body, device_secret)` (§18).
6. **Push then pull, batching** — push pending ops, then fetch server ops since the
   device's last-known `watermark`.

### 7.2 Handshake

```
1. lf sync
2. POST /api/sync/start   { device_id, last_watermark }
   → { server_watermark, ops:[{op_id,entity,entity_id,op_tick,payload_json}] }
3. POST /api/sync/ops     { ops:[{op_id,...}] }          // local queued ops
   → { accepted:[op_id], rejected:[{op_id,reason}] }
4. Apply merged ops locally; advance watermark; set sync_state.
```

`last_watermark` is a per-device server cursor; each accepted op advances it. Rejected
ops (schema/tenant) are marked `failed` and logged to audit.

### 7.3 Conflict resolution table

| Case | Rule |
| --- | --- |
| Different records | both kept |
| Same record, one side offline-written | local wins (flagged), user can `/sync --resolve` |
| Same record, identical op_id | dedup (no-op) |
| Session deleted remotely, edited locally | keep local, ask |
| Passport regeneration | sha differs → newer `updated_at` wins; both retained in history |

### 7.4 Continuity affordances

- **Web:** “Continue in Terminal” → deep link `lf://session/<id>` (opens `lf chat
  --id <id>`) or QR/device-code handoff.
- **Terminal:** “Open in Browser” → prints a link to
  `<web>/sessions/<id>` with the same session.
- `lf sync` also syncs **memory**, **passports**, and **search index metadata**
  (index shas, not full embeddings blobs unless needed).

---

## 8. API contracts (client ↔ Hono server)

JSON, UTF-8, `Content-Type: application/json`. Errors always
`{ "error": { "code", "message" } }`. Auth + device signature per §18.

### 8.1 Session

```
GET    /api/sessions                        → { sessions: SessionSummary[] }
POST   /api/sessions                        { title?, model?, provider?, project_path? } → { session }
GET    /api/sessions/:id                    → { session, messages: Message[] }
PATCH  /api/sessions/:id                    { title?, model?, provider? } → { session }
DELETE /api/sessions/:id                    → 204
POST   /api/sessions/:id/messages           { messages: Message[], op_id, device_id, op_tick } → { acked: [op_id] }
```

```json
// SessionSummary
{ "id": "uuid", "title": "Fix auth", "projectPath": "/repo",
  "model": "gpt-5.2", "provider": "openrouter", "updatedAt": 1720000000000,
  "inputTokens": 1200, "outputTokens": 300, "costMicro": 0 }
// Message (matches web chat shape)
{ "id": "uuid", "role": "assistant", "content": "…",
  "toolCallId": null, "createdAt": 1720000000000 }
```

### 8.2 Memory, passport, chat, sync

```
GET/POST /api/memory                        list | create
GET/PATCH/DELETE /api/memory/:id            read | update | delete
GET /api/memory/search?q=&scope=            hybrid search
GET/PUT /api/passports/:projectId           get | upsert (project passport)
POST /api/chat                              { session_id, messages, model, provider, tools }
                                            → SSE stream (deltas + tool-call events)
POST /api/sync/start | /api/sync/ops        §7.2
```

**SSE event contract** (used by `providers` + web `/api/chat`):

```
event: delta      data: { "text": "tok" }
event: tool_call  data: { "id","name","arguments" }
event: done       data: { "usage": { "inputTokens", "outputTokens" } }
event: error      data: { "code", "message" }
```

---
## 9. Provider system + model router

### 9.1 Provider interface (OpenAI-compatible core)

```go
package providers

type Message struct {
    Role       string    `json:"role"`            // system|user|assistant|tool
    Content    any       `json:"content"`         // string | []ContentPart
    ToolCalls  []ToolCall `json:"tool_calls,omitempty"`
    ToolCallID string    `json:"tool_call_id,omitempty"`
}

type Chunk struct {
    Text      string
    ToolCalls []ToolCall
    Usage     FuncUsage          // streamed usage when provided
    Done      bool               // final
    Err       error
}

type StreamOpts struct {
    Model     string
    Messages  []Message
    Tools     []ToolSpec
    MaxTokens int
    Temp      float64
    Stop      []string
    OnDelta   func(Chunk) error
    CTX       context.Context   // cancel on Ctrl+C
}

// Provider is the union of local (Ollama/LM Studio) and cloud adapters.
type Provider interface {
    Name() string
    Models() []ModelInfo              // id, contextWindow, cost/1k in/out, supportsTools
    Complete(ctx context.Context, o StreamOpts) (*FuncUsage, error)
    Ping(ctx context.Context) error
    Reset() error                     // release per-provider state on switch
}

type Router interface {
    Decide(in DecisionInput) (Choice, error)   // provider+model pick
}
```

## 10. Tool framework (permissioned)

Every tool declares risk + permission key + audit fields.

```go
package tools

type Risk int
const (
    RiskRead Risk = iota // 0: safe, no approval
    RiskWrite            // 1: edits files
    RiskExec             // 2: runs commands
    RiskDestructive      // 3: requires explicit confirm
)

type Spec struct {
    Name        string
    Description string
    Args        any                 // JSON schema
    Risk        Risk
    Permission  string              // e.g. "fs.write", "shell.run", "git.commit"
    Audit       []string            // fields recorded to audit log
}

type Result struct {
    OK       bool
    Data     any
    Stdout   string
    Stderr   string
    Snapshot *Snapshot
}

type Tool interface {
    Spec() Spec
    Plan(req Request) (*Plan, error)    // risk, preview, permission key, est. impact
    Execute(ctx context.Context, req Request) (*Result, error)
}
```

**Built-ins** (`internal/tools`):

| Tool | Risk | Permission key |
| --- | --- | --- |
| `read_file`, `list_dir`, `search_files`, `grep` | Read | `fs.read` |
| `write_file`, `edit_file`, `create_patch` | Write | `fs.write` |
| `run_command`, `open_editor` | Exec/Destructive | `shell.run` |
| `git_status`, `git_diff`, `git_commit`, `git_blame` | Write (commit) | `git.*` |
| `fetch_url`, `search_web` | Exec | `net.fetch` |

### 10.1 Execution path

1. `Plan` computes risk + preview (diff for writes; cmdline + cwd for exec).
2. Permission engine checks key + scope (§11). Undecided → approval card.
3. Writes go through `internal/editor` (atomic write + snapshot); commands through
## 11. Permission engine

```go
package permission

type Scope int
const (
    ScopeOnce     Scope = iota
    ScopeSession
    ScopeProject
    ScopeGlobal
)

type Decision struct {
    ToolKey string
    Scope   Scope
    Allow   bool
    Reason  string          // why (offline heuristics / explicit)
    Expiry  *time.Time      // session = session end; once = immediate
}

type Engine interface {
    Resolve(toolKey string, scope Scope, ref ScopeRef) (Decision, bool) // bool = decided
    Remember(d Decision, ref ScopeRef) error                            // persist
}
```

- Store: `permission_decisions` (SQLite), encrypted via the DB key.
- Defaults: read = allow; `shell.run`/`fs.write`/`git.commit` = ask on **project** scope
  (first time), then remembered as **project** or **session** per the card choice. The
  card `[Approve] [Reject] [Always Allow]` widens scope one step per press
  (session → project → global).
- Dangerous `run_command` patterns (`rm -rf /`, `git push --force`, fork-bombs, bare
  `sudo`, disk wipe) elevate to **RiskDestructive** and always confirm, even if a project
  rule exists. `sandbox` also refuses.
- Every `Resolve`/`Remember` appends to `audit`.

**Approval card** (rendered before the tool executes):

```
Tool: write_file            Risk: write
File: src/auth.ts           Change: 14 lines (+8/-6)

            [ Approve ]  [ Reject ]  [ Always Allow ]
```

---

## 12. Memory engine (local-first)

Types: `preference`, `coding_style`, `project_fact`, `recurring_command`,
`architecture_decision`. Local `memory` table is the source; encrypted sync to
`/api/memory` (§7/§8).

### 12.1 Lifecycle

- **Write:** extracted automatically from conversations (`/memory on` enables auto-capture)
  and manually via `/memory add`. Auto-extraction is a background LLM pass that emits
  `{type,title,body,importance,tags}` and only writes when confidence is high; manual
  writes always honored.
- **Score/rank:** `importance` (1–5) decays over time when unused; recently-used facts
  boost. Injection picks top-k by `importance × recency` that fit the context budget.
- **Read/injection:** relevant memory is injected into the system prompt by the context
  engine (§Context) before each call — no raw full-dump.
- **Commands:** `/memory on|off|list|forget <id>`.

```go
package memory

type Entry struct {
    ID, Type, Title, Body string
    ProjectPath           string
    Importance            int
    Tags                  []string
}

type Store interface {
    Add(ctx, Entry) (string, error)
    List(ctx, project string) ([]Entry, error)
    Forget(ctx, id string) error
    Search(ctx, q string, n int) ([]Entry, error)   // hybrid (sqlite fts + embeddings)
    Remember(ctx, q string, k int) ([]Entry, error) // retrieval for injection
}
```

### 12.2 Safety

Memory may contain secrets — inject with a redaction pass (regex for AWS/OpenAI/GitHub
keys, `.env` values) before sending to a provider. Never store raw credentials.

---
   `internal/sandbox` (timeout, env filter, danger detection); net through a policy
   allow-listed client.
4. Result returns to the model; outcome + snapshot row appended to `audit`.

### 10.2 Slash-driven tools

`/search`, `/project`, `/compact`, `/git`, `/editor` map to the same tool services so the
TUI and the agent share one implementation.

---
Adapters: `openai`, `anthropic`, `gemini`, `deepseek`, `groq`, `openrouter`, `local`
(Ollama/LM Studio — same OpenAI-compatible wire). Anthropic/Gemini are wrapped into the
OpenAI-compatible shape by internal `pkg/oaitype` transforms.

### 9.2 Model router heuristics

| Feature | Signals |
| --- | --- |
| Coding | many tokens, tool use, `.go/.ts/.rs`, edit tools in budget |
| Reasoning | "explain/why/prove", long chain, no tools |
| Cheap/quick | cost threshold or `--fast` |
| Latency-sensitive | interactive TUI, low input |
| Long context | input tokens > 50% of model window |

`/status` prints the decision: `routed: gpt-5.2 (openrouter) — reason: coding, tools,
cost ≤ $0.02`. Manual override via `/model` and `/provider`; overriding **resets
per-provider state** — the router returns the override and the provider's `Reset()` runs
(clearing cached tool schemas, auth, and any partial stream).
## 13. Search engine (hybrid)

Ranked result set over: filenames, content, git history, embeddings, memory, passports,
sessions.

```go
package search

type Source int // Filename, Content, Git, Embedding, Memory, Passport, Session
type Hit struct {
    Source  Source
    Path    string
    Line    int
    Snippet string
    Score   float64
}

type Index interface {
    Build(ctx, root string, files []FileMeta) error   // content + embeddings
    Search(ctx, q string, opts Opts) ([]Hit, error)   // fused ranking
    Invalidate(path string) error                      // from fsnotify
}
```

### 13.1 Pipeline

1. **Filename** — prefix/substring over the file tree (fast, always available).
2. **Content** — SQLite FTS5 over file text (excludes `.git`, binaries, `node_modules`,
   `vendor`, `dist`, `build`; respects `.gitignore`).
3. **Git history** — `git log -S"query"` (pickaxe) + `git grep` on HEAD.
4. **Embeddings** — local embeddings (e.g. `nomic-embed-text` via local provider, or a
   small bundled model). Vectors stored as FTS5-adjacent normalized floats or a local
   vector file; cosine similarity.
5. **Memory / passport / sessions** — FTS5 over their text columns.
6. **Fusion** — weighted Reciprocal Rank Fusion; `opts` bias by source; top-k returned.

`/search authentication middleware` returns ranked results with file:line and snippets;
the agent can consume the same `Index.Search` results as a `search_files` tool response.

Indexing budget: 10k files < 30 s (§23); incremental rebuilds triggered by the watcher.

---

## 14. LSP integration

Language servers are spawned per project (detected from passport: Go → `gopls`,
TypeScript → `typescript-language-server`, Python → `pyright`, etc.).

### 14.1 Features the agent uses before editing

- **Diagnostics** — pull `textDocument/publishDiagnostics`; treat open errors as context
  and gate edit/commit suggestions.
- **Symbols / references / hover** — `textDocument/definition`, `references`, `hover`,
  `documentSymbol` enrich the context engine with precise, cheap facts instead of
  dumping whole files.
- **Code actions** — `textDocument/codeAction` lets the agent propose refactors that the
  language server validates.

### 14.2 Contract

```go
package lsp

type Client interface {
    Start(root string, lang Language) error
    Stop() error
    Diagnostics(uri string) ([]Diagnostic, error)
    Definition(uri string, pos Pos) ([]Location, error)
    References(uri string, pos Pos) ([]Location, error)
    Hover(uri string, pos Pos) (*Hover, error)
    Symbols(uri string) ([]Symbol, error)
    CodeActions(uri string, r Range) ([]CodeAction, error)
}
```

**Facts assisted by LSP are cached per session and expire on file change (watcher).**
Cap the LSP request latency (completion/definition < ~150 ms budget; otherwise fall back
to grep). Multiple servers are isolated per project; health-checked, auto-restarted,
and torn down on project switch.

---

## 15. MCP integration (Model Context Protocol client)

### 15.1 Commands

```
lf mcp list           # connected servers + tools + health
lf mcp add   <name> <type> <ref>   # stdio: "npx -y @modelcontextprotocol/server-github" ; sse/http
lf mcp remove <name>
lf mcp health <name>
```

### 15.2 Design

- **Registry** in `config` + `mcp_servers` table; each server declares allowed tools and
  an allow-list of their `inputSchema` keys.
- **Runtime**: stdio transport (spawn + JSON-RPC 2.0) and SSE/HTTP transport; single
  shared client with per-server namespaces.
- **Tool namespace isolation**: server tools are prefixed `<server>::<tool>` and routed to
  that server only; one server can never see another’s tool list or state.
- **Permission prompts**: MCP tools go through the same `permission.Engine` (keys
  `mcp.<server>.<tool>`) — approval card like any other tool.
- **Health checks**: periodic ping + reconnect with exponential backoff; status in
  `/status` and `lf mcp health`.

```go
package mcp

type Server struct {
    Name  string
    Kind  string           // stdio|sse|http
    Ref   string
    Tools []ToolInfo
    state ConnState
}

type Client interface {
    List(ctx) ([]Server, error)
    Add(ctx, Server) error
    Remove(ctx, name string) error
    Call(ctx, server, tool string, args any) (*CallResult, error)
    Health(ctx, name string) (Health, error)
}
```

---
## 16. Git integration

Deep git awareness drives the header (branch), context, and edit safety.

```go
package git

type Repo struct{ Root string }

func (r Repo) Status(ctx) (Status, error)        // branch, ahead/behind, dirty files
func (r Repo) Diff(ctx, ref string) (Diff, error)
func (r Repo) ChangedFiles(ctx) ([]string, error)
func (r Repo) Commit(ctx, msg string, files []string) (string, error)
func (r Repo) Blame(ctx, path string, line int) ([]Blame, error)
func (r Repo) Log(ctx, path string, q string) ([]Commit, error) // git log -S (pickaxe)
```

- **Header bar**: `branch • n changed • ⇡ahead/⇣behind`. Changed-file list feeds the
  context engine (edits scoped to dirty files by default).
- **Safety**: `git_commit` is a **Write** tool (approval). Commits are always made with a
  user-confirmed message; never `--force`, never `git push` unattended. `git push --force`
  is RiskDestructive (§11).
- **Blame/pickaxe** feed `search` (git source) and help the agent reason about code
  origin before editing.
- **Rollback**: `file_snapshots` give `/undo` after a failed edit; `git diff` is used for
  the pre-edit preview in approval cards.

---

## 17. Local background daemon

```
lf daemon start|stop|status   (optional; `lf` uses it automatically if running)
```

### 17.1 Responsibilities

- **Sync worker** — drains `sync_journal` when online (retry w/ backoff), performs pull.
- **File watcher** — fsnotify over the active project → invalidates search/LSP/passport.
- **Background indexing** — content + embeddings index build/rebuild for the project.
- **Notifications** — approval requests, agent completion, sync conflicts
  (macOS NotificationCenter / libnotify / Windows toast).
- **Scheduled agents** (v1.1) — cron-like agent runs that resume sessions.
- **Health/liveness** — localhost HTTP endpoint `GET /_health`, IPC over a unix socket
  (`/tmp/lf-daemon.sock` or named pipe on Windows).

### 17.2 IPC contract

Foreground and daemon speak JSON over the socket: `sync`, `index`, `watch`,
`subscribe (notifications)`. The daemon is the **single SQLite writer**; the foreground
opens `mode=ro` or via the daemon for writes to avoid SQLITE_BUSY. Daemon single-instance
via a lockfile + PID; graceful shutdown on SIGTERM.

---

## 18. Security model + threat model

### 18.1 Controls

- **Local DB encryption** — SQLCipher (AES-256-CBC, PBKDF2) keyed from the OS keyring
  (macOS Keychain, Windows Credential Manager, Linux Secret Service via
  `zalando/go-keyring`); never plaintext on disk.
- **Token storage** — refresh token in OS keyring only; bearer token held in memory;
  auto-refresh with rotating refresh tokens; logout revokes server-side.
- **Signed sync requests** — `Authorization: Bearer <session>` + `X-LF-Device` +
  `X-LF-Sig: HMAC-SHA256(canonical(body), device_secret)`; server verifies and rate-limits
  per device (§rate limiting).
- **Secret scanning / redaction** — provider API keys and `.env`/credential-shaped
  strings are redacted from logs, memory injection, telemetry, and stored context.
- **Prompt injection defense** — tool/system boundaries: fetched URLs and file contents
  are delimited as data (never treated as instructions), and MCP/file results are labeled
  `untrusted` so the model can’t be coerced into destructive tool calls.
- **Workspace isolation** — tools are rooted at the project directory; symlink escape is
  blocked (resolve realpath); sandbox env filter strips provider secrets.
- **Audit** — append-only chain in `audit` (prev_hash chaining, §6) for tool runs,
  approvals, sync, login/logout; `lf doctor --audit` verifies the chain.
- **Rate limiting** — client-side budgeted calls; server-side per-device RPM on
  `/api/sync/*` and `/api/chat`.
- **Telemetry** — opt-in; command names, latency, version, crash (no file contents).

### 18.2 Threat model summary

| Threat | Mitigation |
| --- | --- |
| Malicious repo/file instructs agent to run `rm -rf` | sandbox danger list + RiskDestructive confirmation + env filter |
| Prompt injection via fetched web content | untrusted-data labeling; no auto-exec |
| Stolen device → tokens | OS keyring + device secret; remote revoke on logout |
| Tampered local DB/audit | encrypted DB + hash-chained audit; verify command |
| MITM on sync | TLS + HMAC-signed requests + pinned CA |
| Provider key exfiltration | redaction everywhere; keys in keyring, never logged |
| SQLite corruption / partial write | WAL + atomic writes + backup/restore (§24) |

---
## 19. Offline strategy

The CLI is fully usable without internet; sync is opportunistic.

- **Offline-capable:** chat history, memory, search (filename/content/git), passports,
  drafts, approvals — all local. Provider calls that need cloud will suspend and queue.
- **Queued sync:** writes land in `sync_journal` with `state=pending`. On reconnect, the
  daemon drains (push) then pulls (§7). `--dry-run` shows the queue.
- **Local providers:** Ollama/LM Studio run fully offline — full agent workflows work
  with no network.
- **Connectivity detection:** `doctor` + periodic ping; a `network: online|offline`
  indicator in the status bar. SSE streams auto-reconnect with backoff, preserving the
  partial output and state (§streaming).
- **Clock skew handling:** ordering uses Lamport ticks, not wall-clock, so offline edits
  merge deterministically.

---

## 20. Packaging & distribution

Targets: macOS (arm64/amd64), Linux (amd64/arm64), Windows (amd64). Release pipeline:
`goreleaser`.

- **curl installer** — `curl -fsSL https://raw.githubusercontent.com/Rohit94r/layerflow-releases/main/install.sh | bash`
  (public binary repo `Rohit94r/layerflow-releases`; source repo stays private).
- **Standalone binaries** — goreleaser tarballs + `checksums.txt`; `lf upgrade` checks a
  signed `latest.json` (version, SHA, URL) and self-updates atomically.
- **Signing:** macOS notarization (Developer ID + hardened runtime), Windows Authenticode
  (SignTool), Linux `.deb`/`.rpm` via nFPM. All installer shas published in
  `latest.json` and verified before apply.

---

## 21. Observability plan

- **Logging** (`internal/log`): structured JSON (event, level, ts, session_id,
  device_id, dur_ms). Levels `error|warn|info|debug`. Rotating files
  (`~/.local/share/layerflow/logs/lf.log`, size+count rotation), TTY pretty mode.
- **No content by default** — tool payloads are **not** logged unless
  `LF_LOG_DEBUG=1` and `telemetry.includeContent=true` (explicit).
- **Telemetry** (`internal/telemetry`, opt-in): command usage, latency percentiles,
  provider/model mix, crash dump, version. Opt-out via `config` or first-run prompt.
- **`lf doctor`** — sections: config validity, DB open + integrity (`PRAGMA
  integrity_check`), keyring reachability, providers `Ping`, MCP health, audit chain
  verify, sync queue size.
- **Metrics for the daemon** — `/metrics` (Prometheus text) optional; TUI statusbar shows
  live stream/queue counts. Trace spans via `otel` only when enabled.

---
## 22. Testing strategy

| Layer | Tools | Coverage |
| --- | --- | --- |
| Unit | `go test` | providers transforms, router heuristics, permission resolver, sandbox danger list, editor atomic write + CRLF/UTF-8, compact token math, sync lamport merge |
| Provider mocks | `internal/providers/test` | fake SSE stream: deltas, tool-call, disconnect/reconnect, error |
| Tool mocks | `internal/tools/test` | Plan/Execute contract + permission gating |
| Golden TUI snapshots | `github.com/charmbracelet/golden` | conversation, diff view, approval card, status bar |
| Integration | `test/integration` | `lf chat | lf run`s against a mock server; device-code login flow; sync push/pull/conflict; daemon IPC; MCP stdio health |
| E2E CLI | `testbot` (driven helper) | run `lf` in a PTY, assert output/exit codes |
| Fuzz | `go test -fuzz` | diff parser, markdown renderer, search tokenizer |

CI gates: `go vet`, `golangci-lint`, `go test -race ./...`, `test -cover`, golden diffs,
`lf doctor` smoke. Critical paths (permission, sandbox, editor, sync) target ≥80% line
coverage.

---

## 23. Performance plan

| Target | Approach |
| --- | --- |
| Cold start < 500 ms | lazy DB open, no module scan at startup, minimal TUI init, `sync.Once` providers |
| First token < 1.5 s | pre-warm provider connection pool; SSE connect before first delta; keep-alive |
| Index 10k files < 30 s | parallel walk (bounded workers), FTS5 batch inserts, skip by `.gitignore`/mtime cache |
| Memory search < 100 ms | FTS5 + precomputed embeddings in-memory cache; top-k short-circuit |

Bench: `internal/*/*_bench_test.go`; CI asserts regressions against stored baselines
(`test/perf/golden.txt`).

---

## 24. Production readiness checklist

- [ ] **Crash recovery** — WAL; message/session writes are atomic; unflushed stream
  output marked `hidden`/partial on restart.
- [ ] **Migrations** — `golang-migrate`; runs on `lf doctor`/first start; schema version
  in `lf version`.
- [ ] **Backup/restore** — `lf sync export`/`import` (signed archive of DB + keyring-less
  data); restore verified by integrity check.
- [ ] **Token refresh + reconnect** — rotating refresh tokens; SSE auto-reconnect;
  provider health failover to router fallback.
- [ ] **Audit verification** — `lf doctor --audit` validates the hash chain.
- [ ] **Security review** — secret scan, redaction pass verified by golden tests, threat
  model §18 reviewed before beta.
- [ ] **Accessibility review** — full keyboard operation, high-contrast light theme,
  focus order on approval cards, screen-reader labels on key widgets.
- [ ] **Packaging sign-off** — `curl | bash` installer + `lf upgrade` on all 3 OSs.
- [ ] **Offline+sync soak** — 48 h loop: offline edits → reconnect → queue drains, zero
  conflicts unrecoverable.
- [ ] **Telemetry opt-in** verified; no content exfil.

---

## 25. Definition of Done (beta gate)

A release is beta-ready when all of these hold:

1. `go vet`, `golangci-lint`, `go test -race ./...` green on macOS/Linux/Windows CI.
2. Cold start < 500 ms and first token < 1.5 s on a representative laptop.
3. A user can `lf login`, create a session, chat + `/run` a task with tool approvals,
   and `lf sync` — then open the **same session in the browser** and continue, and
   vice-versa (same ID, memory, passport).
4. Slash router + `/model` + `/provider` switch resets state correctly; `/status`
   explains routing; `/compact` shows token savings; `/undo` restores an edit.
5. `lf run "…"` executes a multi-step task with a live, cancellable stream and
   before-action approval cards for write/exec/commit.
6. Hybrid `/search` returns ranked file:line results; indexing 10k files < 30 s.
7. MCP `list/add/remove/health` works with a stdio server; LSP diagnostics gate edits.
8. Offline: chat/memory/search/sync-queue all work with zero network; reconnect drains.
9. `lf doctor` + `--audit` pass; secret redaction verified; no plaintext tokens on disk.
10. Packaging installs clean via `brew install Rohit94r/tap/lf` and `curl | bash`; `lf upgrade` self-updates.
11. Performance/coverage baselines pass CI; telemetry is opt-in and content-free.
12. Security + accessibility reviews signed off (checklist §24).

---

## Appendix A — Configuration system

Priority: **project > user > default**.

```
default:      every option with a built-in
user:         ~/.config/layerflow/config.yaml
project:      .layerflow/config.yaml        (repo-root, may be committed except secrets)
```

Example `~/.config/layerflow/config.yaml`:
```yaml
model: deepseek-chat
provider: openrouter           # or openai|anthropic|gemini|groq|local
scope: project
permissions:
  fs.write: project
  shell.run: session
  git.commit: ask
memory: true
telemetry: false
editor:
  diff: builtin
  line_numbers: true
sync:
  auto: true
  interval: 30s
daemon:
  enabled: true
  indexing: true
providers:
  local:
    base_url: http://localhost:11434/v1
    default_model: llama3.3
mcp:
  servers: []                  # added via `lf mcp add`
```

Project `.layerflow/config.yaml` may override `provider`/`permissions`/`scope` but never
`keys` (keys always come from the OS keyring). A layered merge combines maps and skips
unset keys; `lf doctor` reports which sources set each effective value.

---
*End of LayerFlow Terminal (`lf`) Master Blueprint. All §-reference boundaries above are
the contract a small Go team implements first (packages → interfaces → mocks → TUI →
sync → daemon) to ship the public beta.*
and simplest conflict model for a developer tool, see §7).