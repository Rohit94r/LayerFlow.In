package tui

import (
	"strings"
	"testing"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

func keyMsg(s string) tea.KeyMsg {
	return tea.KeyMsg(tea.Key{Type: tea.KeyRunes, Runes: []rune(s)})
}

func backspaceMsg() tea.KeyMsg {
	return tea.KeyMsg(tea.Key{Type: tea.KeyBackspace})
}

func pasteMsg(s string) tea.KeyMsg {
	return tea.KeyMsg(tea.Key{Type: tea.KeyRunes, Runes: []rune(s), Paste: true})
}

// TestLineEditorPaste ensures a bracketed-paste key (Paste flag) is inserted
// in full — the core failure users hit pasting a platform key.
func TestLineEditorPaste(t *testing.T) {
	e := newLineEditor("")
	k := tea.KeyMsg(tea.Key{Type: tea.KeyRunes, Runes: []rune("lf_live_abc123"), Paste: true})
	if !e.handleKey(k) {
		t.Fatal("paste should report a change")
	}
	if got := e.Value(); got != "lf_live_abc123" {
		t.Fatalf("value = %q, want pasted key", got)
	}
	if e.cursor != 14 {
		t.Fatalf("cursor = %d, want end of pasted text", e.cursor)
	}
}

// TestLineEditorInsertAtCursor ensures typing lands at the cursor, not the end.
func TestLineEditorInsertAtCursor(t *testing.T) {
	e := newLineEditor("good")
	// move cursor before "good" (position 0)
	e.moveStart()
	if !e.handleKey(keyMsg("X")) {
		t.Fatal("insert should report a change")
	}
	if got := e.Value(); got != "Xgood" {
		t.Fatalf("value = %q, want %q", got, "Xgood")
	}
}

// TestLineEditorCursorNavigation checks left/right/home/end and delete.
func TestLineEditorCursorNavigation(t *testing.T) {
	e := newLineEditor("abcd")
	e.moveLeft() // cursor 3
	if e.cursor != 3 {
		t.Fatalf("cursor = %d, want 3", e.cursor)
	}
	e.deleteForward() // removes 'd' at position 3
	if got := e.Value(); got != "abc" {
		t.Fatalf("value = %q, want %q", got, "abc")
	}

	// home, insert, end
	e = newLineEditor("bc")
	e.moveStart()
	if !e.handleKey(keyMsg("a")) {
		t.Fatal("insert at home should report a change")
	}
	if got := e.Value(); got != "abc" {
		t.Fatalf("value = %q, want %q", got, "abc")
	}
	e.moveEnd()
	e.handleKey(keyMsg("z")) // at end now
	if got := e.Value(); got != "abcz" {
		t.Fatalf("value = %q, want %q", got, "abcz")
	}
}

// TestLineEditorBackspaceAtCursor ensures backspace deletes before the cursor
// and does nothing at the very start.
func TestLineEditorBackspaceAtCursor(t *testing.T) {
	e := newLineEditor("ab")
	e.moveLeft() // cursor 1
	e.backspace()
	if got := e.Value(); got != "b" {
		t.Fatalf("value = %q, want %q", got, "b")
	}
	e.moveStart()
	e.backspace()
	if got := e.Value(); got != "b" {
		t.Fatalf("value = %q after backspace at start, want %q", got, "b")
	}
}

// TestLineEditorMultiByte ensures rune-aware handling of multi-byte text.
func TestLineEditorMultiByte(t *testing.T) {
	e := newLineEditor("héllo")
	if e.cursor != 5 {
		t.Fatalf("cursor = %d, want 5 runes", e.cursor)
	}
	e.backspace()
	if got := e.Value(); got != "héll" {
		t.Fatalf("value = %q, want %q", got, "héll")
	}
	// Navigate back with arrow keys then insert.
	e.moveStart()
	if !e.handleKey(keyMsg("j")) {
		t.Fatal("insert should report a change")
	}
	if got := e.Value(); got != "jhéll" {
		t.Fatalf("value = %q, want %q", got, "jhéll")
	}
}

// TestLineEditorIgnoredKeys verifies control/handled keys don't inject text.
func TestLineEditorIgnoredKeys(t *testing.T) {
	e := newLineEditor("")
	for _, k := range []string{"enter", "esc", "up", "down", "tab"} {
		if e.handleKey(tea.KeyMsg(tea.Key{Type: tea.KeyRunes, Runes: []rune(k)})) {
			t.Fatalf("navigation key %q should not be inserted", k)
		}
	}
	if got := e.Value(); got != "" {
		t.Fatalf("value = %q after navigation keys, want empty", got)
	}
}

// TestShowCaretTail verifies long values render as a bounded tail with the
// caret kept on screen, so login key pastes never overflow their box.
func TestShowCaretTail(t *testing.T) {
	e := newLineEditor("")
	e.insertRunes("lf_live_0123456789abcdef0123456789")
	if got := showCaretTail(e, 50); got != e.cursorView() {
		t.Fatalf("short value should render unchanged, got %q", got)
	}

	long := newLineEditor("")
	for i := 0; i < 100; i++ {
		long.handleKey(keyMsg("x"))
	}
	view := showCaretTail(long, 20)
	if len([]rune(view)) > 20 {
		t.Fatalf("tail view %q exceeds %d runes", view, 20)
	}
	if !strings.HasPrefix(view, "…") {
		t.Fatalf("long tail should start with an ellipsis, got %q", view)
	}
	if !strings.Contains(view, "▍") {
		t.Fatalf("caret should stay visible in the tail, got %q", view)
	}
}

// TestLoginPasteFlow drives the actual login overlay update with a pasted
// platform key and verifies it is captured (enter submission is async, so we
// only assert the value landed in the input).
func TestLoginPasteFlow(t *testing.T) {
	a := testApp()
	a.openLogin()
	if a.login == nil {
		t.Fatal("login overlay not opened")
	}
	// Paste the platform key as a Paste=true key event.
	l := a.login
	l.Update(pasteMsg("lf_live_pasteablekey"))
	if got := l.input.Value(); got != "lf_live_pasteablekey" {
		t.Fatalf("login input = %q, want pasted key", got)
	}

	// Cursor editing: move to start, type one char.
	l.input.moveStart()
	l.Update(keyMsg("z"))
	if got := l.input.Value(); got != "zlf_live_pasteablekey" {
		t.Fatalf("login input after edit = %q", got)
	}

	// View must render the key and the box (no overflow at width 50).
	v := l.View()
	if !strings.Contains(v, "lf_live_pasteablekey") {
		t.Fatalf("login view missing key: %q", v)
	}
}

// TestSearchPasteFlow ensures paste and editing reset search state.
func TestSearchPasteFlow(t *testing.T) {
	a := testApp()
	a.openSearch()
	s := a.search
	s.searched = true

	s.Update(pasteMsg("memory about deploy"))
	if got := s.queryValue(); got != "memory about deploy" {
		t.Fatalf("search query = %q", got)
	}
	if s.searched {
		t.Fatal("editing the query should reset searched state")
	}

	// Backspace handled by editor, resets searched again.
	s.searched = true
	s.Update(backspaceMsg())
	if s.searched {
		t.Fatal("backspace should reset searched state")
	}
	if got := s.queryValue(); got != "memory about deplo" {
		t.Fatalf("search query after backspace = %q", got)
	}
}

// TestSlashFlow verifies the palette filter supports paste and edited text.
func TestSlashFlow(t *testing.T) {
	a := testApp()
	a.openSlashPopup()
	p := a.slash
	if p == nil {
		t.Fatal("slash popup not opened")
	}
	p.Update(pasteMsg("model"))
	if got := p.filterValue(); got != "model" {
		t.Fatalf("slash filter = %q", got)
	}
	if len(p.filtered()) == 0 {
		t.Fatal("expected a model command to match filter")
	}
	// Backspace shortens the filter instead of closing the popup.
	p.Update(backspaceMsg())
	if got := p.filterValue(); got != "mode" {
		t.Fatalf("slash filter after backspace = %q", got)
	}
}

// TestLoginViewRendersKey ensures the caret does not overflow the 50-col box.
func TestLoginViewRendersKey(t *testing.T) {
	a := testApp()
	a.openLogin()
	a.login.Update(pasteMsg("lf_live_0123456789abcdef0123456789"))
	v := a.login.View()
	lines := strings.Split(strings.TrimRight(v, "\n"), "\n")
	for _, ln := range lines {
		if lw := lipgloss.Width(ln); lw > a.width {
			t.Errorf("login line width %d exceeds terminal width %d: %q", lw, a.width, ln)
		}
	}
}