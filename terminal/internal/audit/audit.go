// Package audit provides an append-only, hash-chained audit log for LayerFlow.
//
// Every row references the previous row's hash, forming an immutable chain.
// Tampering with any row breaks the chain and is detected by VerifyChain.
package audit

import (
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"
)

// EventKind enumerates auditable event types.
type EventKind string

const (
	EventToolRun      EventKind = "tool_run"
	EventToolApprove  EventKind = "tool_approve"
	EventToolDeny     EventKind = "tool_deny"
	EventSyncPush     EventKind = "sync_push"
	EventSyncPull     EventKind = "sync_pull"
	EventLogin        EventKind = "login"
	EventLogout       EventKind = "logout"
	EventSessionNew   EventKind = "session_new"
	EventSessionUse   EventKind = "session_use"
	EventModelSwitch  EventKind = "model_switch"
	EventConfigChange EventKind = "config_change"
	EventAgentCreate  EventKind = "agent_create"
	EventAgentDelete  EventKind = "agent_delete"
)

// Row represents a single audit log entry.
type Row struct {
	ID        int64     `json:"id"`
	PrevHash  string    `json:"prev_hash"`
	RowHash   string    `json:"row_hash"`
	Timestamp time.Time `json:"timestamp"`
	Session   string    `json:"session"`
	Kind      EventKind `json:"kind"`
	Summary   string    `json:"summary"`
	Detail    string    `json:"detail,omitempty"`
	Metadata  any       `json:"metadata,omitempty"`
}

// VerifyResult reports the outcome of a chain integrity check.
type VerifyResult struct {
	Valid    bool   `json:"valid"`
	Rows     int    `json:"rows"`
	BrokenAt int64  `json:"broken_at,omitempty"`
	Expected string `json:"expected,omitempty"`
	Actual   string `json:"actual,omitempty"`
}

// Log is the append-only audit log backed by SQLite.
type Log struct {
	db *sql.DB
}

// New creates a new audit log on the given database connection.
// It ensures the audit table exists.
func New(db *sql.DB) (*Log, error) {
	if _, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS audit_log (
			id          INTEGER PRIMARY KEY AUTOINCREMENT,
			prev_hash   TEXT    NOT NULL DEFAULT '',
			row_hash    TEXT    NOT NULL,
			timestamp   TEXT    NOT NULL,
			session     TEXT    NOT NULL DEFAULT '',
			kind        TEXT    NOT NULL,
			summary     TEXT    NOT NULL DEFAULT '',
			detail      TEXT    NOT NULL DEFAULT '',
			metadata    TEXT    NOT NULL DEFAULT ''
		)
	`); err != nil {
		return nil, fmt.Errorf("audit: create table: %w", err)
	}

	if _, err := db.Exec(`
		CREATE INDEX IF NOT EXISTS idx_audit_log_kind ON audit_log(kind)
	`); err != nil {
		return nil, fmt.Errorf("audit: create index: %w", err)
	}

	return &Log{db: db}, nil
}

// Append records a new audit event. The row is hash-chained to the previous entry.
func (l *Log) Append(session, kind, summary, detail string, metadata any) error {
	prevHash, err := l.lastHash()
	if err != nil {
		return fmt.Errorf("audit: get last hash: %w", err)
	}

	var metaJSON string
	if metadata != nil {
		b, err := json.Marshal(metadata)
		if err != nil {
			return fmt.Errorf("audit: marshal metadata: %w", err)
		}
		metaJSON = string(b)
	}

	now := time.Now().UTC()
	rowHash := computeHash(prevHash, now, session, kind, summary, detail, metaJSON)

	_, err = l.db.Exec(`
		INSERT INTO audit_log (prev_hash, row_hash, timestamp, session, kind, summary, detail, metadata)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`, prevHash, rowHash, now.Format(time.RFC3339Nano), session, kind, summary, detail, metaJSON)
	if err != nil {
		return fmt.Errorf("audit: insert: %w", err)
	}

	slog.Debug("audit: appended", "kind", kind, "summary", summary)
	return nil
}

// Query returns audit rows matching the given filters.
// Pass empty strings to skip filtering on that field.
func (l *Log) Query(session, kind string, limit int) ([]Row, error) {
	query := "SELECT id, prev_hash, row_hash, timestamp, session, kind, summary, detail, metadata FROM audit_log WHERE 1=1"
	args := []any{}

	if session != "" {
		query += " AND session = ?"
		args = append(args, session)
	}
	if kind != "" {
		query += " AND kind = ?"
		args = append(args, kind)
	}

	query += " ORDER BY id DESC"

	if limit > 0 {
		query += " LIMIT ?"
		args = append(args, limit)
	}

	rows, err := l.db.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("audit: query: %w", err)
	}
	defer rows.Close()

	var result []Row
	for rows.Next() {
		var r Row
		var ts string
		if err := rows.Scan(&r.ID, &r.PrevHash, &r.RowHash, &ts, &r.Session, &r.Kind, &r.Summary, &r.Detail, &r.Metadata); err != nil {
			return nil, fmt.Errorf("audit: scan: %w", err)
		}
		r.Timestamp, _ = time.Parse(time.RFC3339Nano, ts)
		result = append(result, r)
	}
	return result, rows.Err()
}

// VerifyChain walks the entire log and checks that every row's hash is correct.
func (l *Log) VerifyChain() (*VerifyResult, error) {
	rows, err := l.db.Query(`
		SELECT id, prev_hash, row_hash, timestamp, session, kind, summary, detail, metadata
		FROM audit_log ORDER BY id ASC
	`)
	if err != nil {
		return nil, fmt.Errorf("audit: verify query: %w", err)
	}
	defer rows.Close()

	result := &VerifyResult{Valid: true}
	prevExpected := ""
	count := 0

	for rows.Next() {
		var r Row
		var ts string
		if err := rows.Scan(&r.ID, &r.PrevHash, &r.RowHash, &ts, &r.Session, &r.Kind, &r.Summary, &r.Detail, &r.Metadata); err != nil {
			return nil, fmt.Errorf("audit: verify scan: %w", err)
		}
		r.Timestamp, _ = time.Parse(time.RFC3339Nano, ts)
		count++

		if r.PrevHash != prevExpected {
			result.Valid = false
			result.BrokenAt = r.ID
			result.Expected = prevExpected
			result.Actual = r.PrevHash
			return result, nil
		}

		metaStr := ""
		if r.Metadata != nil {
			if s, ok := r.Metadata.(string); ok {
				metaStr = s
			}
		}
		recomputed := computeHash(r.PrevHash, r.Timestamp, r.Session, string(r.Kind), r.Summary, r.Detail, metaStr)
		if recomputed != r.RowHash {
			result.Valid = false
			result.BrokenAt = r.ID
			result.Expected = recomputed
			result.Actual = r.RowHash
			return result, nil
		}

		prevExpected = r.RowHash
	}

	result.Rows = count
	return result, rows.Err()
}

// Count returns the total number of audit rows.
func (l *Log) Count() (int, error) {
	var count int
	err := l.db.QueryRow("SELECT COUNT(*) FROM audit_log").Scan(&count)
	return count, err
}

// lastHash returns the row_hash of the most recent entry, or "" if empty.
func (l *Log) lastHash() (string, error) {
	var hash string
	err := l.db.QueryRow("SELECT row_hash FROM audit_log ORDER BY id DESC LIMIT 1").Scan(&hash)
	if err == sql.ErrNoRows {
		return "", nil
	}
	if err != nil {
		return "", err
	}
	return hash, nil
}

// computeHash produces a SHA-256 hex digest from the chain components.
func computeHash(prevHash string, ts time.Time, session, kind, summary, detail, meta string) string {
	h := sha256.New()
	h.Write([]byte(prevHash))
	h.Write([]byte(ts.Format(time.RFC3339Nano)))
	h.Write([]byte(session))
	h.Write([]byte(kind))
	h.Write([]byte(summary))
	h.Write([]byte(detail))
	h.Write([]byte(meta))
	return hex.EncodeToString(h.Sum(nil))
}
