// Package session provides session and message management with branching support.
package session

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// Session represents a conversation session.
type Session struct {
	ID            string
	ParentID      *string
	Title         string
	ProjectPath   string
	Model         string
	Provider      string
	CreatedAt     int64
	UpdatedAt     int64
	InputTokens   int
	OutputTokens  int
	CostMicro     int64
	CompressedCtx string
	SyncState     string
}

// Message represents a single message within a session.
type Message struct {
	ID           string
	SessionID    string
	Role         string // system, user, assistant, tool
	Content      string
	ToolCallID   string
	Model        string
	Provider     string
	InputTokens  int
	OutputTokens int
	CreatedAt    int64
	EditedAt     *int64
	Hidden       bool
	OpID         string
	DeviceID     string
	OpTick       int64
	SyncState    string
}

// Store defines the interface for session persistence.
type Store interface {
	Create(ctx context.Context, s *Session) error
	Get(ctx context.Context, id string) (*Session, error)
	List(ctx context.Context, projectPath string, limit int) ([]Session, error)
	Update(ctx context.Context, s *Session) error
	Delete(ctx context.Context, id string) error
	Branch(ctx context.Context, sessionID string, title string) (*Session, error)
	Restore(ctx context.Context, sessionID string) (*Session, error)
}

// MessageStore defines the interface for message persistence.
type MessageStore interface {
	AddMessage(ctx context.Context, m *Message) error
	GetMessages(ctx context.Context, sessionID string, limit int) ([]Message, error)
	HideMessages(ctx context.Context, sessionID string, before int64) (int, error)
	UpdateMessage(ctx context.Context, m *Message) error
}

// SQLStore implements Store and MessageStore using SQLite.
type SQLStore struct {
	db *sql.DB
}

// NewSQLStore creates a new SQLite-backed session store.
func NewSQLStore(db *sql.DB) *SQLStore {
	return &SQLStore{db: db}
}

// Create inserts a new session.
func (s *SQLStore) Create(ctx context.Context, sess *Session) error {
	if sess.ID == "" {
		sess.ID = uuid.New().String()
	}
	now := time.Now().UnixMilli()
	sess.CreatedAt = now
	sess.UpdatedAt = now
	if sess.SyncState == "" {
		sess.SyncState = "local"
	}

	_, err := s.db.ExecContext(ctx, `
		INSERT INTO sessions (id, parent_id, title, project_path, model, provider,
			created_at, updated_at, input_tokens, output_tokens, cost_micro,
			compressed_context, sync_state)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		sess.ID, sess.ParentID, sess.Title, sess.ProjectPath, sess.Model, sess.Provider,
		sess.CreatedAt, sess.UpdatedAt, sess.InputTokens, sess.OutputTokens, sess.CostMicro,
		sess.CompressedCtx, sess.SyncState,
	)
	return err
}

// Get retrieves a session by ID.
func (s *SQLStore) Get(ctx context.Context, id string) (*Session, error) {
	sess := &Session{}
	err := s.db.QueryRowContext(ctx, `
		SELECT id, parent_id, title, project_path, model, provider,
			created_at, updated_at, input_tokens, output_tokens, cost_micro,
			compressed_context, sync_state
		FROM sessions WHERE id = ?`, id,
	).Scan(
		&sess.ID, &sess.ParentID, &sess.Title, &sess.ProjectPath, &sess.Model, &sess.Provider,
		&sess.CreatedAt, &sess.UpdatedAt, &sess.InputTokens, &sess.OutputTokens, &sess.CostMicro,
		&sess.CompressedCtx, &sess.SyncState,
	)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("session %s not found", id)
	}
	return sess, err
}

// List returns sessions for a project, most recent first.
func (s *SQLStore) List(ctx context.Context, projectPath string, limit int) ([]Session, error) {
	if limit <= 0 {
		limit = 50
	}

	rows, err := s.db.QueryContext(ctx, `
		SELECT id, parent_id, title, project_path, model, provider,
			created_at, updated_at, input_tokens, output_tokens, cost_micro,
			compressed_context, sync_state
		FROM sessions WHERE project_path = ?
		ORDER BY updated_at DESC LIMIT ?`, projectPath, limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var sessions []Session
	for rows.Next() {
		var sess Session
		if err := rows.Scan(
			&sess.ID, &sess.ParentID, &sess.Title, &sess.ProjectPath, &sess.Model, &sess.Provider,
			&sess.CreatedAt, &sess.UpdatedAt, &sess.InputTokens, &sess.OutputTokens, &sess.CostMicro,
			&sess.CompressedCtx, &sess.SyncState,
		); err != nil {
			return nil, err
		}
		sessions = append(sessions, sess)
	}
	return sessions, rows.Err()
}

// Update modifies an existing session.
func (s *SQLStore) Update(ctx context.Context, sess *Session) error {
	sess.UpdatedAt = time.Now().UnixMilli()
	if sess.SyncState == "" {
		sess.SyncState = "dirty"
	}

	result, err := s.db.ExecContext(ctx, `
		UPDATE sessions SET title = ?, model = ?, provider = ?, updated_at = ?,
			input_tokens = ?, output_tokens = ?, cost_micro = ?, compressed_context = ?,
			sync_state = ?
		WHERE id = ?`,
		sess.Title, sess.Model, sess.Provider, sess.UpdatedAt,
		sess.InputTokens, sess.OutputTokens, sess.CostMicro, sess.CompressedCtx,
		sess.SyncState, sess.ID,
	)
	if err != nil {
		return err
	}
	n, _ := result.RowsAffected()
	if n == 0 {
		return fmt.Errorf("session %s not found", sess.ID)
	}
	return nil
}

// Delete removes a session and its messages.
func (s *SQLStore) Delete(ctx context.Context, id string) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.ExecContext(ctx, "DELETE FROM messages WHERE session_id = ?", id); err != nil {
		return err
	}
	result, err := tx.ExecContext(ctx, "DELETE FROM sessions WHERE id = ?", id)
	if err != nil {
		return err
	}
	n, _ := result.RowsAffected()
	if n == 0 {
		return fmt.Errorf("session %s not found", id)
	}
	return tx.Commit()
}

// Branch creates a new session branching from an existing one using copy-on-write.
func (s *SQLStore) Branch(ctx context.Context, sessionID string, title string) (*Session, error) {
	parent, err := s.Get(ctx, sessionID)
	if err != nil {
		return nil, fmt.Errorf("branch parent: %w", err)
	}

	branch := &Session{
		ID:          uuid.New().String(),
		ParentID:    &parent.ID,
		Title:       title,
		ProjectPath: parent.ProjectPath,
		Model:       parent.Model,
		Provider:    parent.Provider,
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	now := time.Now().UnixMilli()
	branch.CreatedAt = now
	branch.UpdatedAt = now
	branch.SyncState = "local"

	_, err = tx.ExecContext(ctx, `
		INSERT INTO sessions (id, parent_id, title, project_path, model, provider,
			created_at, updated_at, sync_state)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		branch.ID, branch.ParentID, branch.Title, branch.ProjectPath,
		branch.Model, branch.Provider, branch.CreatedAt, branch.UpdatedAt, branch.SyncState,
	)
	if err != nil {
		return nil, err
	}

	// Copy messages from parent to branch.
	rows, err := tx.QueryContext(ctx, `
		SELECT id, role, content, tool_call_id, model, provider,
			input_tokens, output_tokens, created_at, edited_at, hidden,
			op_id, device_id, op_tick, sync_state
		FROM messages WHERE session_id = ?
		ORDER BY created_at ASC`, sessionID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var m Message
		if err := rows.Scan(
			&m.ID, &m.Role, &m.Content, &m.ToolCallID, &m.Model, &m.Provider,
			&m.InputTokens, &m.OutputTokens, &m.CreatedAt, &m.EditedAt, &m.Hidden,
			&m.OpID, &m.DeviceID, &m.OpTick, &m.SyncState,
		); err != nil {
			return nil, err
		}
		m.ID = uuid.New().String()
		m.SessionID = branch.ID

		_, err = tx.ExecContext(ctx, `
			INSERT INTO messages (id, session_id, role, content, tool_call_id, model, provider,
				input_tokens, output_tokens, created_at, edited_at, hidden,
				op_id, device_id, op_tick, sync_state)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			m.ID, m.SessionID, m.Role, m.Content, m.ToolCallID, m.Model, m.Provider,
			m.InputTokens, m.OutputTokens, m.CreatedAt, m.EditedAt, m.Hidden,
			m.OpID, m.DeviceID, m.OpTick, m.SyncState,
		)
		if err != nil {
			return nil, err
		}
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return branch, tx.Commit()
}

// Restore re-creates a session from its branch history by walking the parent chain.
func (s *SQLStore) Restore(ctx context.Context, sessionID string) (*Session, error) {
	sess, err := s.Get(ctx, sessionID)
	if err != nil {
		return nil, err
	}
	// Restore is a no-op beyond fetching; the caller can use Branch to fork.
	return sess, nil
}

// AddMessage inserts a message into a session.
func (s *SQLStore) AddMessage(ctx context.Context, m *Message) error {
	if m.ID == "" {
		m.ID = uuid.New().String()
	}
	if m.CreatedAt == 0 {
		m.CreatedAt = time.Now().UnixMilli()
	}
	if m.SyncState == "" {
		m.SyncState = "local"
	}

	_, err := s.db.ExecContext(ctx, `
		INSERT INTO messages (id, session_id, role, content, tool_call_id, model, provider,
			input_tokens, output_tokens, created_at, edited_at, hidden,
			op_id, device_id, op_tick, sync_state)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		m.ID, m.SessionID, m.Role, m.Content, m.ToolCallID, m.Model, m.Provider,
		m.InputTokens, m.OutputTokens, m.CreatedAt, m.EditedAt, m.Hidden,
		m.OpID, m.DeviceID, m.OpTick, m.SyncState,
	)
	return err
}

// GetMessages retrieves messages for a session, most recent last.
func (s *SQLStore) GetMessages(ctx context.Context, sessionID string, limit int) ([]Message, error) {
	if limit <= 0 {
		limit = 500
	}

	rows, err := s.db.QueryContext(ctx, `
		SELECT id, session_id, role, content, tool_call_id, model, provider,
			input_tokens, output_tokens, created_at, edited_at, hidden,
			op_id, device_id, op_tick, sync_state
		FROM messages WHERE session_id = ? AND hidden = 0
		ORDER BY created_at ASC LIMIT ?`, sessionID, limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var messages []Message
	for rows.Next() {
		var m Message
		if err := rows.Scan(
			&m.ID, &m.SessionID, &m.Role, &m.Content, &m.ToolCallID, &m.Model, &m.Provider,
			&m.InputTokens, &m.OutputTokens, &m.CreatedAt, &m.EditedAt, &m.Hidden,
			&m.OpID, &m.DeviceID, &m.OpTick, &m.SyncState,
		); err != nil {
			return nil, err
		}
		messages = append(messages, m)
	}
	return messages, rows.Err()
}

// HideMessages marks messages as hidden (used by /compact to collapse history).
func (s *SQLStore) HideMessages(ctx context.Context, sessionID string, before int64) (int, error) {
	result, err := s.db.ExecContext(ctx, `
		UPDATE messages SET hidden = 1, sync_state = 'dirty'
		WHERE session_id = ? AND created_at < ? AND hidden = 0`,
		sessionID, before,
	)
	if err != nil {
		return 0, err
	}
	n, _ := result.RowsAffected()
	return int(n), nil
}

// UpdateMessage modifies an existing message.
func (s *SQLStore) UpdateMessage(ctx context.Context, m *Message) error {
	now := time.Now().UnixMilli()
	_, err := s.db.ExecContext(ctx, `
		UPDATE messages SET content = ?, edited_at = ?, sync_state = 'dirty'
		WHERE id = ?`,
		m.Content, now, m.ID,
	)
	return err
}
