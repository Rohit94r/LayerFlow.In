-- 001_init.sql — Initial schema for LayerFlow lf.

CREATE TABLE IF NOT EXISTS sessions (
    id              TEXT PRIMARY KEY,
    parent_id       TEXT REFERENCES sessions(id) ON DELETE SET NULL,
    title           TEXT NOT NULL DEFAULT '',
    project_path    TEXT NOT NULL DEFAULT '',
    model           TEXT NOT NULL DEFAULT '',
    provider        TEXT NOT NULL DEFAULT '',
    created_at      INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at      INTEGER NOT NULL DEFAULT (unixepoch()),
    input_tokens    INTEGER NOT NULL DEFAULT 0,
    output_tokens   INTEGER NOT NULL DEFAULT 0,
    cost_micro      INTEGER NOT NULL DEFAULT 0,
    compressed_context TEXT,
    sync_state      TEXT NOT NULL DEFAULT 'synced',
    deleted_at      INTEGER
);

CREATE INDEX IF NOT EXISTS idx_sessions_project     ON sessions(project_path);
CREATE INDEX IF NOT EXISTS idx_sessions_parent      ON sessions(parent_id);
CREATE INDEX IF NOT EXISTS idx_sessions_created     ON sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_sessions_sync        ON sessions(sync_state);

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS messages (
    id              TEXT PRIMARY KEY,
    session_id      TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    role            TEXT NOT NULL,
    content         TEXT NOT NULL DEFAULT '',
    tool_call_id    TEXT,
    model           TEXT NOT NULL DEFAULT '',
    provider        TEXT NOT NULL DEFAULT '',
    input_tokens    INTEGER NOT NULL DEFAULT 0,
    output_tokens   INTEGER NOT NULL DEFAULT 0,
    created_at      INTEGER NOT NULL DEFAULT (unixepoch()),
    edited_at       INTEGER,
    hidden          INTEGER NOT NULL DEFAULT 0,
    op_id           TEXT,
    device_id       TEXT,
    op_tick         INTEGER,
    sync_state      TEXT NOT NULL DEFAULT 'synced'
);

CREATE INDEX IF NOT EXISTS idx_messages_session     ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_role        ON messages(role);
CREATE INDEX IF NOT EXISTS idx_messages_op          ON messages(op_id);
CREATE INDEX IF NOT EXISTS idx_messages_sync        ON messages(sync_state);

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS project_summaries (
    id              TEXT PRIMARY KEY,
    project_path    TEXT NOT NULL UNIQUE,
    overview        TEXT NOT NULL DEFAULT '',
    architecture    TEXT NOT NULL DEFAULT '',
    commands_json   TEXT NOT NULL DEFAULT '{}',
    deps_json       TEXT NOT NULL DEFAULT '{}',
    conventions     TEXT NOT NULL DEFAULT '',
    deploy_notes    TEXT NOT NULL DEFAULT '',
    tasks_json      TEXT NOT NULL DEFAULT '[]',
    generated_at    INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at      INTEGER NOT NULL DEFAULT (unixepoch()),
    sha             TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_projects_path ON project_summaries(project_path);

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS memory (
    id              TEXT PRIMARY KEY,
    type            TEXT NOT NULL DEFAULT '',
    title           TEXT NOT NULL DEFAULT '',
    body            TEXT NOT NULL DEFAULT '',
    project_path    TEXT NOT NULL DEFAULT '',
    importance      INTEGER NOT NULL DEFAULT 3,
    tags_json       TEXT NOT NULL DEFAULT '[]',
    created_at      INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at      INTEGER NOT NULL DEFAULT (unixepoch()),
    op_id           TEXT,
    device_id       TEXT,
    op_tick         INTEGER,
    sync_state      TEXT NOT NULL DEFAULT 'synced'
);

CREATE INDEX IF NOT EXISTS idx_memory_project      ON memory(project_path);
CREATE INDEX IF NOT EXISTS idx_memory_type          ON memory(type);
CREATE INDEX IF NOT EXISTS idx_memory_importance    ON memory(importance);
CREATE INDEX IF NOT EXISTS idx_memory_sync          ON memory(sync_state);

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS permission_decisions (
    id              TEXT PRIMARY KEY,
    tool_key        TEXT NOT NULL DEFAULT '',
    scope           TEXT NOT NULL DEFAULT '',
    project_hash    TEXT NOT NULL DEFAULT '',
    session_id      TEXT REFERENCES sessions(id) ON DELETE SET NULL,
    decision        TEXT NOT NULL DEFAULT '',
    expires_at      INTEGER,
    created_at      INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_perm_tool     ON permission_decisions(tool_key);
CREATE INDEX IF NOT EXISTS idx_perm_scope    ON permission_decisions(scope);
CREATE INDEX IF NOT EXISTS idx_perm_session  ON permission_decisions(session_id);

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS file_snapshots (
    id              TEXT PRIMARY KEY,
    session_id      TEXT REFERENCES sessions(id) ON DELETE SET NULL,
    project_path    TEXT NOT NULL DEFAULT '',
    rel_path        TEXT NOT NULL DEFAULT '',
    content         TEXT NOT NULL DEFAULT '',
    kind            TEXT NOT NULL DEFAULT 'pre',
    created_at      INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_snapshots_session  ON file_snapshots(session_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_path     ON file_snapshots(rel_path);

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit (
    seq             INTEGER PRIMARY KEY AUTOINCREMENT,
    ts              INTEGER NOT NULL DEFAULT (unixepoch()),
    actor           TEXT NOT NULL DEFAULT '',
    action          TEXT NOT NULL DEFAULT '',
    target          TEXT NOT NULL DEFAULT '',
    payload_json    TEXT NOT NULL DEFAULT '{}',
    prev_hash       TEXT NOT NULL DEFAULT '',
    row_hash        TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_audit_ts      ON audit(ts);
CREATE INDEX IF NOT EXISTS idx_audit_actor   ON audit(actor);
CREATE INDEX IF NOT EXISTS idx_audit_action  ON audit(action);

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sync_journal (
    op_id           TEXT PRIMARY KEY,
    entity          TEXT NOT NULL DEFAULT '',
    entity_id       TEXT NOT NULL DEFAULT '',
    payload_json    TEXT NOT NULL DEFAULT '{}',
    device_id       TEXT NOT NULL DEFAULT '',
    op_tick         INTEGER NOT NULL DEFAULT 0,
    state           TEXT NOT NULL DEFAULT 'pending',
    attempts        INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_sync_state    ON sync_journal(state);
CREATE INDEX IF NOT EXISTS idx_sync_entity   ON sync_journal(entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_sync_device   ON sync_journal(device_id);
