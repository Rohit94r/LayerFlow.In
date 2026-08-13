package permission

import (
	"database/sql"
	"fmt"
	"log/slog"
	"strings"
	"sync"
	"time"
)

// Scope determines the duration for which a permission decision is valid.
type Scope int

const (
	ScopeOnce    Scope = iota // This invocation only
	ScopeSession              // Until the session ends
	ScopeProject              // Stored in the project .lf/ directory
	ScopeGlobal               // Stored in the user's config directory
)

func (s Scope) String() string {
	switch s {
	case ScopeOnce:
		return "once"
	case ScopeSession:
		return "session"
	case ScopeProject:
		return "project"
	case ScopeGlobal:
		return "global"
	default:
		return "unknown"
	}
}

// Decision records the outcome of a permission check.
type Decision struct {
	ToolKey string     // Tool that was allowed or denied
	Scope   Scope      // Duration of this decision
	Allow   bool       // Whether the action is permitted
	Reason  string     // Human-readable explanation
	Expiry  *time.Time // When the decision expires (nil = never)
}

// ScopeRef provides context for resolving scope-level decisions.
type ScopeRef struct {
	SessionID   string // Current session identifier
	ProjectHash string // Hash of the project root for project-scoped decisions
}

// Engine is the interface for resolving and persisting permission decisions.
type Engine interface {
	// Resolve checks whether a tool invocation is permitted.
	// Returns the decision and true if a stored decision was found,
	// or zero Decision and false if no stored decision exists (caller should ask the user).
	Resolve(toolKey string, scope Scope, ref ScopeRef) (Decision, bool)

	// Remember persists a permission decision for future Resolve calls.
	Remember(d Decision, ref ScopeRef) error

	// AuditLog returns all recorded permission decisions for inspection.
	AuditLog() ([]AuditEntry, error)
}

// AuditEntry is a single row from the permission audit log.
type AuditEntry struct {
	ID          int64
	ToolKey     string
	Scope       string
	Allow       bool
	Reason      string
	SessionID   string
	ProjectHash string
	CreatedAt   time.Time
}

// DefaultPolicy defines the default permission for each tool scope.
type DefaultPolicy struct {
	AllowRiskRead    bool // Whether read operations are allowed by default
	AskOnWrite       bool // Whether write operations require user confirmation
	AskOnExec        bool // Whether exec operations require user confirmation
	AskOnDestructive bool // Whether destructive operations require user confirmation
}

// DefaultPolicies returns the standard LayerFlow permission defaults.
func DefaultPolicies() map[string]DefaultPolicy {
	return map[string]DefaultPolicy{
		"fs.read":    {AllowRiskRead: true},
		"fs.write":   {AllowRiskRead: true, AskOnWrite: true},
		"shell.run":  {AllowRiskRead: true, AskOnExec: true},
		"git.commit": {AllowRiskRead: true, AskOnWrite: true},
		"git.push":   {AllowRiskRead: true, AskOnWrite: true, AskOnDestructive: true},
	}
}

// DangerousPatterns are command substrings that elevate a tool's effective risk.
var DangerousPatterns = []string{
	"rm -rf",
	"rm -fr",
	"rmdir",
	"mkfs",
	"dd if=",
	"dd of=",
	":(){ :|:& };:", // fork bomb
	"sudo rm",
	"git push --force",
	"git push -f",
	"git reset --hard",
	"git clean -fd",
	"chmod -R 777",
	"chown -R",
}

// sqliteEngine is the SQLite-backed permission engine.
type sqliteEngine struct {
	db     *sql.DB
	mu     sync.RWMutex
	logger *slog.Logger
}

// NewSQLiteEngine opens or creates a SQLite database at the given path and
// returns a permission engine backed by it.
func NewSQLiteEngine(dbPath string, logger *slog.Logger) (Engine, error) {
	if logger == nil {
		logger = slog.Default()
	}

	db, err := sql.Open("sqlite3", dbPath+"?_journal_mode=WAL&_busy_timeout=5000")
	if err != nil {
		return nil, fmt.Errorf("permission: open database: %w", err)
	}

	if err := migrate(db); err != nil {
		db.Close()
		return nil, fmt.Errorf("permission: migrate: %w", err)
	}

	return &sqliteEngine{
		db:     db,
		logger: logger,
	}, nil
}

// migrate creates the required tables if they don't exist.
func migrate(db *sql.DB) error {
	schema := `
	CREATE TABLE IF NOT EXISTS permission_decisions (
		id            INTEGER PRIMARY KEY AUTOINCREMENT,
		tool_key      TEXT NOT NULL,
		scope         TEXT NOT NULL,
		allow         INTEGER NOT NULL DEFAULT 0,
		reason        TEXT NOT NULL DEFAULT '',
		session_id    TEXT NOT NULL DEFAULT '',
		project_hash  TEXT NOT NULL DEFAULT '',
		expires_at    DATETIME,
		created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
	);

	CREATE INDEX IF NOT EXISTS idx_permission_tool_key ON permission_decisions(tool_key);
	CREATE INDEX IF NOT EXISTS idx_permission_scope ON permission_decisions(scope);
	CREATE INDEX IF NOT EXISTS idx_permission_session ON permission_decisions(session_id);
	`
	_, err := db.Exec(schema)
	return err
}

func (e *sqliteEngine) Resolve(toolKey string, scope Scope, ref ScopeRef) (Decision, bool) {
	e.mu.RLock()
	defer e.mu.RUnlock()

	// Check for an existing decision, ordered from most specific to least.
	queries := []struct {
		query string
		args  []any
	}{
		{
			"SELECT allow, reason, expires_at FROM permission_decisions WHERE tool_key = ? AND scope = 'once' AND session_id = ? ORDER BY created_at DESC LIMIT 1",
			[]any{toolKey, ref.SessionID},
		},
		{
			"SELECT allow, reason, expires_at FROM permission_decisions WHERE tool_key = ? AND scope = 'session' AND session_id = ? ORDER BY created_at DESC LIMIT 1",
			[]any{toolKey, ref.SessionID},
		},
		{
			"SELECT allow, reason, expires_at FROM permission_decisions WHERE tool_key = ? AND scope = 'project' AND project_hash = ? ORDER BY created_at DESC LIMIT 1",
			[]any{toolKey, ref.ProjectHash},
		},
		{
			"SELECT allow, reason, expires_at FROM permission_decisions WHERE tool_key = ? AND scope = 'global' AND project_hash = '' ORDER BY created_at DESC LIMIT 1",
			[]any{toolKey},
		},
	}

	for _, q := range queries {
		var allow int
		var reason string
		var expiresAt sql.NullTime

		err := e.db.QueryRow(q.query, q.args...).Scan(&allow, &reason, &expiresAt)
		if err != nil {
			continue
		}

		// Check expiry.
		if expiresAt.Valid && expiresAt.Time.Before(time.Now()) {
			continue
		}

		decision := Decision{
			ToolKey: toolKey,
			Scope:   scope,
			Allow:   allow == 1,
			Reason:  reason,
		}
		if expiresAt.Valid {
			decision.Expiry = &expiresAt.Time
		}

		e.logger.Info("permission resolved",
			"tool", toolKey,
			"allow", decision.Allow,
			"reason", reason,
			"scope", scope.String(),
		)

		return decision, true
	}

	return Decision{}, false
}

func (e *sqliteEngine) Remember(d Decision, ref ScopeRef) error {
	e.mu.Lock()
	defer e.mu.Unlock()

	scopeStr := d.Scope.String()
	allowInt := 0
	if d.Allow {
		allowInt = 1
	}

	var expiresAt sql.NullTime
	if d.Expiry != nil {
		expiresAt = sql.NullTime{Time: *d.Expiry, Valid: true}
	}

	_, err := e.db.Exec(
		`INSERT INTO permission_decisions (tool_key, scope, allow, reason, session_id, project_hash, expires_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`,
		d.ToolKey, scopeStr, allowInt, d.Reason, ref.SessionID, ref.ProjectHash, expiresAt,
	)
	if err != nil {
		return fmt.Errorf("permission: remember: %w", err)
	}

	e.logger.Info("permission remembered",
		"tool", d.ToolKey,
		"allow", d.Allow,
		"scope", d.Scope.String(),
		"reason", d.Reason,
	)

	return nil
}

func (e *sqliteEngine) AuditLog() ([]AuditEntry, error) {
	e.mu.RLock()
	defer e.mu.RUnlock()

	rows, err := e.db.Query(
		`SELECT id, tool_key, scope, allow, reason, session_id, project_hash, created_at
		 FROM permission_decisions ORDER BY created_at DESC LIMIT 1000`,
	)
	if err != nil {
		return nil, fmt.Errorf("permission: audit log: %w", err)
	}
	defer rows.Close()

	var entries []AuditEntry
	for rows.Next() {
		var entry AuditEntry
		if err := rows.Scan(&entry.ID, &entry.ToolKey, &entry.Scope, &entry.Allow, &entry.Reason, &entry.SessionID, &entry.ProjectHash, &entry.CreatedAt); err != nil {
			return nil, fmt.Errorf("permission: audit log scan: %w", err)
		}
		entries = append(entries, entry)
	}

	return entries, rows.Err()
}

// Close closes the underlying database connection.
func (e *sqliteEngine) Close() error {
	return e.db.Close()
}

// ContainsDangerousPattern returns true if the given command matches any
// known dangerous pattern.
func ContainsDangerousPattern(command string) bool {
	lower := strings.ToLower(command)
	for _, pattern := range DangerousPatterns {
		if strings.Contains(lower, strings.ToLower(pattern)) {
			return true
		}
	}
	return false
}
