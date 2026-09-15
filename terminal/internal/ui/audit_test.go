package ui

import (
	"context"
	"testing"
	"time"

	tea "github.com/charmbracelet/bubbletea"

	"github.com/layerflow/terminal/internal/cloud"
	"github.com/layerflow/terminal/internal/session"
	"github.com/layerflow/terminal/internal/storage"
	"github.com/layerflow/terminal/internal/ui/backend"
	"github.com/layerflow/terminal/internal/ui/components/chat"
)

func newAuditApp(t *testing.T) (tea.Model, session.MessageStore, string) {
	t.Helper()
	db, err := storage.Open(&storage.Options{DataDir: t.TempDir()})
	if err != nil {
		t.Fatalf("open storage: %v", err)
	}
	t.Cleanup(func() { storage.Close() })

	store := session.NewSQLStore(db)
	ctx := context.Background()
	sess := &session.Session{Title: "Alpha Beta", ProjectPath: "."}
	if err := store.Create(ctx, sess); err != nil {
		t.Fatalf("create: %v", err)
	}
	for i := 0; i < 3; i++ {
		store.AddMessage(ctx, &session.Message{SessionID: sess.ID, Role: "user", Content: "hello " + string(rune('a'+i))})
		store.AddMessage(ctx, &session.Message{SessionID: sess.ID, Role: "assistant", Content: "reply " + string(rune('A'+i))})
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
	m = runCmd(m, m.Init())
	if m2, cmd := m.Update(tea.WindowSizeMsg{Width: 120, Height: 40}); true {
		m = runCmd(m2, cmd)
	}
	if m2, cmd := m.Update(chat.SessionSelectedMsg{ID: sess.ID, Title: "Alpha Beta"}); true {
		m = runCmd(m2, cmd)
	}
	return m, store, sess.ID
}

// runCmd executes a returned command, recursively unwrapping tea.BatchMsg
// just like the bubbletea runtime does. Subscription commands that block on a
// channel are skipped after a short grace period instead of hanging the test.
func runCmd(m tea.Model, cmd tea.Cmd) tea.Model {
	var walk func(tea.Model, tea.Cmd, int) tea.Model
	walk = func(m tea.Model, cmd tea.Cmd, depth int) tea.Model {
		if cmd == nil || depth > 6 {
			return m
		}
		msgCh := make(chan tea.Msg, 1)
		go func() {
			msgCh <- cmd()
		}()
		var msg tea.Msg
		select {
		case msg = <-msgCh:
		case <-time.After(500 * time.Millisecond):
			return m
		}
		if msg == nil {
			return m
		}
		if bm, ok := msg.(tea.BatchMsg); ok {
			for _, c := range bm {
				m = walk(m, c, depth+1)
			}
			return m
		}
		var next tea.Cmd
		m, next = m.Update(msg)
		return walk(m, next, depth+1)
	}
	return walk(m, cmd, 0)
}

func feedKey(m tea.Model, k tea.KeyMsg) tea.Model {
	m, cmd := m.Update(k)
	return runCmd(m, cmd)
}

func audit(t *testing.T, name string, m tea.Model) {
	t.Helper()
	out := m.View()
	t.Logf("\n══════════════════ %s ══════════════════\n%s\n", name, out)
}

func TestAuditAll(t *testing.T) {
	m, _, _ := newAuditApp(t)

	audit(t, "MAIN CHAT", m)

	m = feedKey(m, tea.KeyMsg{Type: tea.KeyCtrlL})
	audit(t, "LOGS PAGE", m)

	m = feedKey(m, tea.KeyMsg{Type: tea.KeyEsc})
	audit(t, "BACK TO CHAT (esc from logs)", m)

	m = feedKey(m, tea.KeyMsg{Type: tea.KeyCtrlS})
	audit(t, "SESSION DIALOG (ctrl+s)", m)
	m = feedKey(m, tea.KeyMsg{Type: tea.KeyEsc})
	audit(t, "AFTER ESC close session", m)

	m = feedKey(m, tea.KeyMsg{Type: tea.KeyCtrlT})
	audit(t, "THEME DIALOG (ctrl+t)", m)
	m = feedKey(m, tea.KeyMsg{Type: tea.KeyEsc})
	audit(t, "AFTER ESC close theme", m)

	m = feedKey(m, tea.KeyMsg{Type: tea.KeyCtrlO})
	audit(t, "MODEL DIALOG (ctrl+o)", m)
	m = feedKey(m, tea.KeyMsg{Type: tea.KeyEsc})
	audit(t, "AFTER ESC close model", m)

	m = feedKey(m, tea.KeyMsg{Type: tea.KeyCtrlC})
	audit(t, "QUIT DIALOG (ctrl+c)", m)
	m = feedKey(m, tea.KeyMsg{Type: tea.KeyEsc})
	audit(t, "AFTER ESC close quit", m)
}

func TestAuditHelpAndCommands(t *testing.T) {
	m, _, _ := newAuditApp(t)
	m = feedKey(m, tea.KeyMsg{Type: tea.KeyCtrlH})
	audit(t, "HELP DIALOG (ctrl+h)", m)
	m = feedKey(m, tea.KeyMsg{Type: tea.KeyEsc})
	audit(t, "AFTER ESC close help", m)

	m = feedKey(m, tea.KeyMsg{Type: tea.KeyCtrlK})
	audit(t, "COMMAND DIALOG (ctrl+k)", m)
	m = feedKey(m, tea.KeyMsg{Type: tea.KeyEsc})
	audit(t, "AFTER ESC close commands", m)
}

func TestAuditFilepicker(t *testing.T) {
	m, _, _ := newAuditApp(t)
	m = feedKey(m, tea.KeyMsg{Type: tea.KeyCtrlF})
	audit(t, "FILEPICKER (ctrl+f)", m)
}

func TestAuditEditorKeys(t *testing.T) {
	m, _, _ := newAuditApp(t)
	// send some typed text, exercise ctrl+e (external editor), ctrl+r
	m = feedKey(m, tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune("hello world")})
	audit(t, "EDITOR WITH TEXT", m)
}
