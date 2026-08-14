package sync

import (
	"context"
	"database/sql"
	"testing"

	_ "modernc.org/sqlite"
)

func newTestDB(t *testing.T) *sql.DB {
	t.Helper()
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	t.Cleanup(func() { db.Close() })

	if _, err := db.Exec(`
		CREATE TABLE sync_journal (
			op_id        TEXT PRIMARY KEY,
			entity       TEXT NOT NULL,
			entity_id    TEXT NOT NULL,
			payload_json TEXT NOT NULL DEFAULT '',
			device_id    TEXT NOT NULL DEFAULT '',
			op_tick      INTEGER NOT NULL DEFAULT 0,
			state        TEXT NOT NULL DEFAULT 'pending',
			attempts     INTEGER NOT NULL DEFAULT 0
		)`); err != nil {
		t.Fatalf("create table: %v", err)
	}
	return db
}

func TestSQLJournalAppendPendingAck(t *testing.T) {
	db := newTestDB(t)
	j := NewSQLJournal(db)
	ctx := context.Background()

	op := Operation{
		OpID:     "message-1",
		Entity:   "message",
		EntityID: "1",
		Payload:  map[string]any{"content": "hi"},
		DeviceID: "dev-1",
		OpTick:   5,
		State:    StateQueued,
	}
	if err := j.Append(ctx, op); err != nil {
		t.Fatalf("Append: %v", err)
	}

	// Append is idempotent on op_id.
	if err := j.Append(ctx, op); err != nil {
		t.Fatalf("re-Append: %v", err)
	}

	pending, err := j.Pending(ctx)
	if err != nil {
		t.Fatalf("Pending: %v", err)
	}
	if len(pending) != 1 {
		t.Fatalf("len(pending) = %d, want 1", len(pending))
	}
	if pending[0].OpID != op.OpID || pending[0].State != StateQueued || pending[0].OpTick != 5 {
		t.Errorf("pending op mismatch: %+v", pending[0])
	}

	if err := j.MarkAcked(ctx, op.OpID); err != nil {
		t.Fatalf("MarkAcked: %v", err)
	}
	pending, err = j.Pending(ctx)
	if err != nil {
		t.Fatalf("Pending: %v", err)
	}
	if len(pending) != 0 {
		t.Errorf("len(pending) after ack = %d, want 0", len(pending))
	}
}

func TestSQLJournalPendingOrder(t *testing.T) {
	db := newTestDB(t)
	j := NewSQLJournal(db)
	ctx := context.Background()

	for _, tick := range []int64{2, 9, 1} {
		if err := j.Append(ctx, Operation{
			OpID:   "op-" + string(rune('0'+tick)),
			Entity: "session",
			OpTick: tick,
			State:  StateQueued,
		}); err != nil {
			t.Fatalf("Append: %v", err)
		}
	}

	pending, err := j.Pending(ctx)
	if err != nil {
		t.Fatalf("Pending: %v", err)
	}
	got := []int64{pending[0].OpTick, pending[1].OpTick, pending[2].OpTick}
	want := []int64{1, 2, 9}
	for i := range got {
		if got[i] != want[i] {
			t.Fatalf("order = %v, want %v", got, want)
		}
	}
}

func TestSQLJournalMarkFailedParksConflict(t *testing.T) {
	db := newTestDB(t)
	j := NewSQLJournal(db)
	ctx := context.Background()

	if err := j.Append(ctx, Operation{OpID: "op-f", Entity: "session", State: StateQueued}); err != nil {
		t.Fatalf("Append: %v", err)
	}

	for i := 0; i < 5; i++ {
		if err := j.MarkFailed(ctx, "op-f", "boom"); err != nil {
			t.Fatalf("MarkFailed: %v", err)
		}
	}

	var state string
	var attempts int
	if err := db.QueryRow(`SELECT state, attempts FROM sync_journal WHERE op_id = 'op-f'`).
		Scan(&state, &attempts); err != nil {
		t.Fatalf("query: %v", err)
	}
	if state != string(StateConflict) {
		t.Errorf("state = %q, want %q", state, StateConflict)
	}
	if attempts != 5 {
		t.Errorf("attempts = %d, want 5", attempts)
	}

	// A parked conflict is still surfaced by Pending so the Syncer can
	// report or resolve it, but further failures must not bump attempts.
	pending, err := j.Pending(ctx)
	if err != nil {
		t.Fatalf("Pending: %v", err)
	}
	if len(pending) != 1 || pending[0].State != StateConflict {
		t.Errorf("pending after parking = %+v", pending)
	}
	before := attempts
	_ = j.MarkFailed(ctx, "op-f", "again")
	if err := db.QueryRow(`SELECT attempts FROM sync_journal WHERE op_id = 'op-f'`).
		Scan(&attempts); err != nil {
		t.Fatalf("query attempts: %v", err)
	}
	if attempts != before {
		t.Errorf("attempts grew to %d on parked op, want %d", attempts, before)
	}

	// Retry brings it back into the queue.
	if err := j.Retry(ctx, "op-f"); err != nil {
		t.Fatalf("Retry: %v", err)
	}
	pending, _ = j.Pending(ctx)
	if len(pending) != 1 || pending[0].OpID != "op-f" {
		t.Errorf("pending after retry = %+v", pending)
	}
}
