// Package memory provides a local-first memory engine backed by SQLite with FTS5 search.
package memory

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"math"
	"strings"
	"time"

	"github.com/google/uuid"
)

// EntryType represents the kind of memory entry.
type EntryType string

const (
	TypePreference       EntryType = "preference"
	TypeCodingStyle      EntryType = "coding_style"
	TypeProjectFact      EntryType = "project_fact"
	TypeRecurringCommand EntryType = "recurring_command"
	TypeArchDecision     EntryType = "architecture_decision"
)

// Entry represents a single memory entry.
type Entry struct {
	ID          string
	Type        EntryType
	Title       string
	Body        string
	ProjectPath string
	Importance  int
	Tags        []string
	CreatedAt   int64
	UpdatedAt   int64
	OpID        string
	DeviceID    string
	OpTick      int64
	SyncState   string
}

// Store defines the interface for memory persistence and retrieval.
type Store interface {
	Add(ctx context.Context, e Entry) (string, error)
	List(ctx context.Context, project string) ([]Entry, error)
	Get(ctx context.Context, id string) (*Entry, error)
	Update(ctx context.Context, id string, e Entry) error
	Delete(ctx context.Context, id string) error
	Search(ctx context.Context, q string, n int) ([]Entry, error)
	Remember(ctx context.Context, q string, k int) ([]Entry, error)
}

// SQLStore implements Store using SQLite with FTS5 for full-text search.
type SQLStore struct {
	db *sql.DB
}

// NewSQLStore creates a new SQLite-backed memory store.
func NewSQLStore(db *sql.DB) *SQLStore {
	return &SQLStore{db: db}
}

// InitSchema creates the memory tables and FTS5 virtual table.
func (s *SQLStore) InitSchema(ctx context.Context) error {
	_, err := s.db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS memory_entries (
			id            TEXT PRIMARY KEY,
			type          TEXT NOT NULL,
			title         TEXT NOT NULL,
			body          TEXT NOT NULL,
			project_path  TEXT NOT NULL DEFAULT '',
			importance    INTEGER NOT NULL DEFAULT 5,
			tags          TEXT NOT NULL DEFAULT '[]',
			created_at    INTEGER NOT NULL,
			updated_at    INTEGER NOT NULL,
			op_id         TEXT NOT NULL DEFAULT '',
			device_id     TEXT NOT NULL DEFAULT '',
			op_tick       INTEGER NOT NULL DEFAULT 0,
			sync_state    TEXT NOT NULL DEFAULT 'local'
		);

		CREATE INDEX IF NOT EXISTS idx_memory_project ON memory_entries(project_path);
		CREATE INDEX IF NOT EXISTS idx_memory_type ON memory_entries(type);
		CREATE INDEX IF NOT EXISTS idx_memory_importance ON memory_entries(importance DESC);
	`)
	if err != nil {
		return fmt.Errorf("create memory tables: %w", err)
	}

	// FTS5 virtual table for full-text search. Using contentless table
	// so deletes propagate correctly via triggers.
	_, err = s.db.ExecContext(ctx, `
		CREATE VIRTUAL TABLE IF NOT EXISTS memory_fts USING fts5(
			title, body, tags,
			content=memory_entries,
			content_rowid=rowid
		)`)
	if err != nil {
		// FTS5 may already exist; ignore if so.
		if !strings.Contains(err.Error(), "already exists") {
			return fmt.Errorf("create memory FTS: %w", err)
		}
	}

	// Triggers to keep FTS in sync.
	for _, trigger := range []string{
		`CREATE TRIGGER IF NOT EXISTS memory_ai AFTER INSERT ON memory_entries BEGIN
			INSERT INTO memory_fts(rowid, title, body, tags)
			VALUES (new.rowid, new.title, new.body, new.tags);
		END`,
		`CREATE TRIGGER IF NOT EXISTS memory_ad AFTER DELETE ON memory_entries BEGIN
			INSERT INTO memory_fts(memory_fts, rowid, title, body, tags)
			VALUES ('delete', old.rowid, old.title, old.body, old.tags);
		END`,
		`CREATE TRIGGER IF NOT EXISTS memory_au AFTER UPDATE ON memory_entries BEGIN
			INSERT INTO memory_fts(memory_fts, rowid, title, body, tags)
			VALUES ('delete', old.rowid, old.title, old.body, old.tags);
			INSERT INTO memory_fts(rowid, title, body, tags)
			VALUES (new.rowid, new.title, new.body, new.tags);
		END`,
	} {
		if _, err := s.db.ExecContext(ctx, trigger); err != nil {
			return fmt.Errorf("create memory trigger: %w", err)
		}
	}

	return nil
}

// Add inserts a new memory entry and returns its ID.
func (s *SQLStore) Add(ctx context.Context, e Entry) (string, error) {
	if e.ID == "" {
		e.ID = uuid.New().String()
	}
	now := time.Now().UnixMilli()
	e.CreatedAt = now
	e.UpdatedAt = now
	if e.Importance == 0 {
		e.Importance = 5
	}
	if e.SyncState == "" {
		e.SyncState = "local"
	}

	tagsJSON, err := json.Marshal(e.Tags)
	if err != nil {
		return "", fmt.Errorf("marshal tags: %w", err)
	}

	_, err = s.db.ExecContext(ctx, `
		INSERT INTO memory_entries (id, type, title, body, project_path, importance, tags,
			created_at, updated_at, op_id, device_id, op_tick, sync_state)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		e.ID, string(e.Type), e.Title, e.Body, e.ProjectPath, e.Importance, string(tagsJSON),
		e.CreatedAt, e.UpdatedAt, e.OpID, e.DeviceID, e.OpTick, e.SyncState,
	)
	if err != nil {
		return "", fmt.Errorf("insert memory: %w", err)
	}
	return e.ID, nil
}

// List returns all memory entries for a project.
func (s *SQLStore) List(ctx context.Context, project string) ([]Entry, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, type, title, body, project_path, importance, tags,
			created_at, updated_at, op_id, device_id, op_tick, sync_state
		FROM memory_entries
		WHERE project_path = ?
		ORDER BY importance DESC, updated_at DESC`, project,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return scanEntries(rows)
}

// Get retrieves a single memory entry by ID.
func (s *SQLStore) Get(ctx context.Context, id string) (*Entry, error) {
	row := s.db.QueryRowContext(ctx, `
		SELECT id, type, title, body, project_path, importance, tags,
			created_at, updated_at, op_id, device_id, op_tick, sync_state
		FROM memory_entries WHERE id = ?`, id,
	)

	e := &Entry{}
	var tagsRaw string
	err := row.Scan(
		&e.ID, &e.Type, &e.Title, &e.Body, &e.ProjectPath, &e.Importance, &tagsRaw,
		&e.CreatedAt, &e.UpdatedAt, &e.OpID, &e.DeviceID, &e.OpTick, &e.SyncState,
	)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("memory entry %s not found", id)
	}
	if err != nil {
		return nil, err
	}
	if err := json.Unmarshal([]byte(tagsRaw), &e.Tags); err != nil {
		return nil, fmt.Errorf("unmarshal tags: %w", err)
	}
	return e, nil
}

// Update modifies an existing memory entry.
func (s *SQLStore) Update(ctx context.Context, id string, e Entry) error {
	e.UpdatedAt = time.Now().UnixMilli()
	if e.SyncState == "" {
		e.SyncState = "dirty"
	}

	tagsJSON, err := json.Marshal(e.Tags)
	if err != nil {
		return fmt.Errorf("marshal tags: %w", err)
	}

	result, err := s.db.ExecContext(ctx, `
		UPDATE memory_entries
		SET type = ?, title = ?, body = ?, project_path = ?, importance = ?, tags = ?,
			updated_at = ?, sync_state = ?
		WHERE id = ?`,
		string(e.Type), e.Title, e.Body, e.ProjectPath, e.Importance, string(tagsJSON),
		e.UpdatedAt, e.SyncState, id,
	)
	if err != nil {
		return err
	}
	n, _ := result.RowsAffected()
	if n == 0 {
		return fmt.Errorf("memory entry %s not found", id)
	}
	return nil
}

// Delete removes a memory entry by ID.
func (s *SQLStore) Delete(ctx context.Context, id string) error {
	result, err := s.db.ExecContext(ctx, "DELETE FROM memory_entries WHERE id = ?", id)
	if err != nil {
		return err
	}
	n, _ := result.RowsAffected()
	if n == 0 {
		return fmt.Errorf("memory entry %s not found", id)
	}
	return nil
}

// Search performs full-text search using FTS5.
func (s *SQLStore) Search(ctx context.Context, q string, n int) ([]Entry, error) {
	if n <= 0 {
		n = 10
	}
	if q == "" {
		return nil, nil
	}

	// Escape FTS5 query special characters.
	safeQ := strings.ReplaceAll(q, "\"", "\"\"")

	rows, err := s.db.QueryContext(ctx, `
		SELECT me.id, me.type, me.title, me.body, me.project_path, me.importance, me.tags,
			me.created_at, me.updated_at, me.op_id, me.device_id, me.op_tick, me.sync_state
		FROM memory_entries me
		JOIN memory_fts fts ON me.rowid = fts.rowid
		WHERE memory_fts MATCH ?
		ORDER BY rank
		LIMIT ?`, safeQ, n,
	)
	if err != nil {
		return nil, fmt.Errorf("FTS search: %w", err)
	}
	defer rows.Close()

	return scanEntries(rows)
}

// Remember retrieves top-k entries by a combined importance × recency score.
// This is used to inject relevant memories into the context window.
func (s *SQLStore) Remember(ctx context.Context, q string, k int) ([]Entry, error) {
	if k <= 0 {
		k = 5
	}

	// If there's a query, use FTS to narrow the candidates, then re-rank.
	var candidates []Entry
	if q != "" {
		// Retrieve more candidates than needed for re-ranking.
		var err error
		candidates, err = s.Search(ctx, q, k*4)
		if err != nil {
			return nil, err
		}
	} else {
		rows, err := s.db.QueryContext(ctx, `
			SELECT id, type, title, body, project_path, importance, tags,
				created_at, updated_at, op_id, device_id, op_tick, sync_state
			FROM memory_entries
			ORDER BY importance DESC, updated_at DESC
			LIMIT ?`, k*4,
		)
		if err != nil {
			return nil, err
		}
		defer rows.Close()

		candidates, err = scanEntries(rows)
		if err != nil {
			return nil, err
		}
	}

	// Apply decay: score = importance × recency_factor
	// recency_factor decays exponentially based on days since last update.
	now := time.Now().UnixMilli()
	type scored struct {
		entry Entry
		score float64
	}
	var scored_list []scored
	for _, e := range candidates {
		daysSinceUpdate := float64(now-e.UpdatedAt) / (24 * 60 * 60 * 1000)
		recency := math.Exp(-daysSinceUpdate / 30.0) // half-life ~30 days
		score := float64(e.Importance) * recency
		scored_list = append(scored_list, scored{entry: e, score: score})
	}

	// Sort descending by score.
	for i := 0; i < len(scored_list); i++ {
		for j := i + 1; j < len(scored_list); j++ {
			if scored_list[j].score > scored_list[i].score {
				scored_list[i], scored_list[j] = scored_list[j], scored_list[i]
			}
		}
	}

	limit := k
	if limit > len(scored_list) {
		limit = len(scored_list)
	}
	result := make([]Entry, limit)
	for i := 0; i < limit; i++ {
		result[i] = scored_list[i].entry
	}

	return result, nil
}

func scanEntries(rows *sql.Rows) ([]Entry, error) {
	var entries []Entry
	for rows.Next() {
		var e Entry
		var tagsRaw string
		if err := rows.Scan(
			&e.ID, &e.Type, &e.Title, &e.Body, &e.ProjectPath, &e.Importance, &tagsRaw,
			&e.CreatedAt, &e.UpdatedAt, &e.OpID, &e.DeviceID, &e.OpTick, &e.SyncState,
		); err != nil {
			return nil, err
		}
		if err := json.Unmarshal([]byte(tagsRaw), &e.Tags); err != nil {
			return nil, fmt.Errorf("unmarshal tags: %w", err)
		}
		entries = append(entries, e)
	}
	return entries, rows.Err()
}
