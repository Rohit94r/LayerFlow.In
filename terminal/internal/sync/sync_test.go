package sync

import (
	"context"
	"testing"
)

// Regression: materializeOp used to build a session store with a nil *sql.DB
// and panic when a pulled op arrived without a local DB handle. It must skip
// silently instead.
func TestMaterializeOpNilDBDoesNotPanic(t *testing.T) {
	ctx := context.Background()

	remote := Operation{
		OpID:     "op_1",
		Entity:   "session",
		EntityID: "sess-1",
		Payload: map[string]any{
			"title":      "Synced session",
			"model":      "grok-3-mini",
			"created_at": float64(1700000000),
			"updated_at": float64(1700000000),
		},
		State: StateSynced,
	}

	if err := materializeOp(ctx, nil, &remote, nil); err != nil {
		t.Fatalf("materializeOp with nil db returned error: %v", err)
	}

	msg := Operation{
		OpID:     "op_2",
		Entity:   "message",
		EntityID: "msg-1",
		Payload: map[string]any{
			"session_id": "sess-1",
			"role":       "assistant",
			"content":    "hello",
		},
		State: StateSynced,
	}
	if err := materializeOp(ctx, nil, &msg, nil); err != nil {
		t.Fatalf("materializeOp message with nil db returned error: %v", err)
	}
}

// With a real DB the same op materializes into the session store without error.
func TestMaterializeOpWithDB(t *testing.T) {
	ctx := context.Background()
	db := newTestDB(t)

	if _, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS sessions (
			id TEXT PRIMARY KEY,
			parent_id TEXT,
			title TEXT,
			project_path TEXT,
			model TEXT,
			provider TEXT,
			created_at INTEGER,
			updated_at INTEGER,
			input_tokens INTEGER,
			output_tokens INTEGER,
			cost_micro INTEGER,
			compressed_context TEXT,
			sync_state TEXT
		)`); err != nil {
		t.Fatalf("create sessions table: %v", err)
	}

	remote := Operation{
		OpID:     "op_sess",
		Entity:   "session",
		EntityID: "sess-materialized",
		Payload: map[string]any{
			"title":      "Materialized",
			"model":      "deepseek-chat",
			"created_at": float64(1700000000),
			"updated_at": float64(1700000001),
		},
		State: StateSynced,
	}

	if err := materializeOp(ctx, nil, &remote, db); err != nil {
		t.Fatalf("materializeOp with db returned error: %v", err)
	}

	var title string
	if err := db.QueryRowContext(ctx, `SELECT title FROM sessions WHERE id = ?`, "sess-materialized").Scan(&title); err != nil {
		t.Fatalf("materialized session missing: %v", err)
	}
	if title != "Materialized" {
		t.Fatalf("unexpected session title %q", title)
	}
}