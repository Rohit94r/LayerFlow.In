package sync

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
)

// SQLJournal is a durable SQLite-backed sync journal. Operations persist in
// the sync_journal table so pending work survives process restarts.
type SQLJournal struct {
	db *sql.DB
}

// NewSQLJournal creates a SQLite-backed journal.
func NewSQLJournal(db *sql.DB) *SQLJournal {
	return &SQLJournal{db: db}
}

// Pending returns all operations awaiting sync, oldest first.
func (j *SQLJournal) Pending(ctx context.Context) ([]Operation, error) {
	rows, err := j.db.QueryContext(ctx, `
		SELECT op_id, entity, entity_id, payload_json, device_id, op_tick, state, attempts
		FROM sync_journal WHERE state != 'synced'
		ORDER BY op_tick ASC, op_id ASC`)
	if err != nil {
		return nil, fmt.Errorf("query pending ops: %w", err)
	}
	defer rows.Close()

	var ops []Operation
	for rows.Next() {
		var (
			op      Operation
			payload string
		)
		if err := rows.Scan(
			&op.OpID, &op.Entity, &op.EntityID, &payload,
			&op.DeviceID, &op.OpTick, &op.State, &op.Attempts,
		); err != nil {
			return nil, err
		}
		if payload != "" {
			if err := json.Unmarshal([]byte(payload), &op.Payload); err != nil {
				op.Payload = map[string]any{"_unparsed": payload}
			}
		}
		ops = append(ops, op)
	}
	return ops, rows.Err()
}

// MarkAcked marks an operation as successfully synced.
func (j *SQLJournal) MarkAcked(ctx context.Context, opID string) error {
	_, err := j.db.ExecContext(ctx,
		`UPDATE sync_journal SET state = 'synced' WHERE op_id = ?`, opID)
	return err
}

// MarkFailed records a failure for an operation. After 5 attempts the
// operation is parked as a conflict so it no longer blocks the queue.
func (j *SQLJournal) MarkFailed(ctx context.Context, opID, reason string) error {
	_, err := j.db.ExecContext(ctx, `
		UPDATE sync_journal SET
			attempts = CASE WHEN state = 'conflict' THEN attempts ELSE attempts + 1 END,
			state = CASE
				WHEN state = 'conflict' THEN 'conflict'
				WHEN attempts + 1 >= 5 THEN 'conflict'
				ELSE 'pending'
			END
		WHERE op_id = ?`, opID)
	return err
}

// Retry resets an operation so it is pushed again on the next sync.
func (j *SQLJournal) Retry(ctx context.Context, opID string) error {
	_, err := j.db.ExecContext(ctx,
		`UPDATE sync_journal SET state = 'pending', attempts = 0 WHERE op_id = ?`, opID)
	return err
}

// Append adds a new operation to the journal (idempotent on op_id).
func (j *SQLJournal) Append(ctx context.Context, op Operation) error {
	payload, err := json.Marshal(op.Payload)
	if err != nil {
		return fmt.Errorf("marshal payload: %w", err)
	}
	if op.State == "" {
		op.State = "pending"
	}
	_, err = j.db.ExecContext(ctx, `
		INSERT OR REPLACE INTO sync_journal
			(op_id, entity, entity_id, payload_json, device_id, op_tick, state, attempts)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		op.OpID, op.Entity, op.EntityID, string(payload),
		op.DeviceID, op.OpTick, op.State, op.Attempts,
	)
	return err
}
