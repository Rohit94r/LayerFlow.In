package ui

import (
	"context"
	"strings"
	"testing"

	tea "github.com/charmbracelet/bubbletea"

	"github.com/layerflow/terminal/internal/cloud"
	"github.com/layerflow/terminal/internal/session"
	"github.com/layerflow/terminal/internal/storage"
	"github.com/layerflow/terminal/internal/ui/backend"
	"github.com/layerflow/terminal/internal/ui/components/chat"
)

func TestRenderSmoke(t *testing.T) {
	db, err := storage.Open(&storage.Options{DataDir: t.TempDir()})
	if err != nil {
		t.Fatalf("open storage: %v", err)
	}
	defer storage.Close()

	store := session.NewSQLStore(db)
	ctx := context.Background()
	sess := &session.Session{Title: "Demo", ProjectPath: "."}
	if err := store.Create(ctx, sess); err != nil {
		t.Fatalf("create: %v", err)
	}
	if err := store.AddMessage(ctx, &session.Message{
		SessionID: sess.ID,
		Role:      "user",
		Content:   "[]",
	}); err != nil {
		t.Fatalf("add msg: %v", err)
	}

	b := &backend.State{
		Client:   cloud.NewClient("", ""),
		Sessions: store,
		Project:  ".",
		Model:    cloud.DefaultModel,
		Router:   &backend.Router{},
	}
	a := backend.NewApp(b)

	m := New(a)

	m, _ = m.Update(tea.WindowSizeMsg{Width: 120, Height: 40})
	m, _ = m.Update(chat.SessionSelectedMsg{ID: sess.ID, Title: "Demo"})

	out := m.View()
	if out == "" {
		t.Fatal("empty render")
	}
	t.Logf("\n%s", out)
}

func TestRunHeadlessQuit(t *testing.T) {
	db, err := storage.Open(&storage.Options{DataDir: t.TempDir()})
	if err != nil {
		t.Fatalf("open storage: %v", err)
	}
	defer storage.Close()

	store := session.NewSQLStore(db)
	ctx := context.Background()
	sess := &session.Session{Title: "Smoke", ProjectPath: "."}
	if err := store.Create(ctx, sess); err != nil {
		t.Fatalf("create: %v", err)
	}
	if err := store.AddMessage(ctx, &session.Message{
		SessionID: sess.ID,
		Role:      "assistant",
		Content:   strings.Repeat("[]", 0) + "[]",
	}); err != nil {
		t.Fatalf("add msg: %v", err)
	}

	b := &backend.State{
		Client:   cloud.NewClient("", ""),
		Sessions: store,
		Project:  ".",
		Model:    cloud.DefaultModel,
		Router:   &backend.Router{},
	}
	a := backend.NewApp(b)

	m := New(a)

	m, _ = m.Update(tea.WindowSizeMsg{Width: 120, Height: 40})
	m, _ = m.Update(chat.SessionSelectedMsg{ID: sess.ID, Title: "Smoke"})
	m, cmd := m.Update(tea.KeyMsg{}) // exercise key path
	_ = cmd

	out := m.View()
	if out == "" {
		t.Fatal("empty render after session select")
	}
	t.Logf("rendered %d bytes after session select", len(out))
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
