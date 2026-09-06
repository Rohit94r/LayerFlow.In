package tui

import (
	"strings"

	tea "github.com/charmbracelet/bubbletea"
)

// lineEditor is a minimal single-line text input used by the hand-rolled
// overlays (login key paste, search query, slash filter). Unlike plain string
// appending, it supports:
//
//   - terminal paste: Bubble Tea delivers bracketed paste as a single
//     KeyMsg with Paste:true holding every rune. Overlays forward it here so
//     "Cmd/Ctrl+V" of a pasted platform key or query works.
//   - cursor editing: left/right moves, home/end, delete, insert-in-the-middle.
//
// Text is kept as a rune slice so multi-byte (and pasted) text is handled
// correctly, and helpers are cursor-aware for MID-insertion.
type lineEditor struct {
	runes  []rune
	cursor int // index into runes, 0..len(runes)
}

// newLineEditor creates an editor pre-seeded with value, cursor at the end.
func newLineEditor(value string) *lineEditor {
	runes := []rune(value)
	return &lineEditor{runes: runes, cursor: len(runes)}
}

// Value returns the current text.
func (e *lineEditor) Value() string {
	return string(e.runes)
}

// Empty reports whether the editor has no text.
func (e *lineEditor) Empty() bool {
	return len(e.runes) == 0
}

// SetValue replaces the text and moves the cursor to the end.
func (e *lineEditor) SetValue(value string) {
	e.runes = []rune(value)
	e.cursor = len(e.runes)
}

// cursorView renders the text with a block caret at the cursor position.
// An empty buffer shows just the caret. Widths are computed from rune count so
// multi-byte characters align the caret correctly.
func (e *lineEditor) cursorView() string {
	if len(e.runes) == 0 {
		return "▍"
	}
	if e.cursor >= len(e.runes) {
		return string(e.runes) + "▍"
	}
	head := e.runes[:e.cursor]
	tail := e.runes[e.cursor:]
	return string(head) + "▍" + string(tail)
}

// insertRunes inserts text at the cursor and advances past it.
func (e *lineEditor) insertRunes(text string) {
	if text == "" {
		return
	}
	in := []rune(text)
	out := make([]rune, 0, len(e.runes)+len(in))
	out = append(out, e.runes[:e.cursor]...)
	out = append(out, in...)
	out = append(out, e.runes[e.cursor:]...)
	e.runes = out
	e.cursor += len(in)
}

// backspace removes the rune before the cursor (or does nothing at the start).
func (e *lineEditor) backspace() {
	if e.cursor == 0 {
		return
	}
	e.runes = append(e.runes[:e.cursor-1], e.runes[e.cursor:]...)
	e.cursor--
}

// deleteForward removes the rune at the cursor (or does nothing at the end).
func (e *lineEditor) deleteForward() {
	if e.cursor >= len(e.runes) {
		return
	}
	e.runes = append(e.runes[:e.cursor], e.runes[e.cursor+1:]...)
}

// moveLeft / moveRight / moveStart / moveEnd move the cursor.
func (e *lineEditor) moveLeft() {
	if e.cursor > 0 {
		e.cursor--
	}
}

func (e *lineEditor) moveRight() {
	if e.cursor < len(e.runes) {
		e.cursor++
	}
}

func (e *lineEditor) moveStart() {
	e.cursor = 0
}

func (e *lineEditor) moveEnd() {
	e.cursor = len(e.runes)
}

// handleKey applies a single Bubble Tea key event to the editor, returning
// true if the input changed (so callers can reset e.g. search/selection
// state). Unrelated keys (enter, esc, up/down navigation, …) return false.
func (e *lineEditor) handleKey(key tea.KeyMsg) bool {
	// Pasted text arrives as one KeyMsg marked Paste:true with every rune
	// (see bubbletea detectBracketedPaste). Insert all of it at the cursor.
	if key.Paste {
		e.insertRunes(string(key.Runes))
		return true
	}

	switch key.String() {
	case "left", "ctrl+b":
		e.moveLeft()
		return false
	case "right", "ctrl+f":
		e.moveRight()
		return false
	case "home", "ctrl+a":
		e.moveStart()
		return false
	case "end", "ctrl+e":
		e.moveEnd()
		return false
	case "backspace":
		e.backspace()
		return true
	case "delete", "ctrl+d":
		e.deleteForward()
		return true
	default:
		// Text input: Bubble Tea delivers normal typing as a single-rune
		// KeyRunes event, and pasted text as one KeyRunes event carrying every
		// rune — the Paste flag is often unset on Windows legacy consoles, so
		// rely on the type, not the flag. Insert all printable runes at once.
		// The KeySpace type inserts a space. Control/editorial keys (arrows,
		// enter, esc, …) have their own types and never reach this branch.
		switch key.Type {
		case tea.KeyRunes:
			var sb strings.Builder
			for _, r := range key.Runes {
				if r >= ' ' {
					sb.WriteRune(r)
				}
			}
			if sb.Len() == 0 {
				return false
			}
			e.insertRunes(sb.String())
			return true
		case tea.KeySpace:
			e.insertRunes(" ")
			return true
		}
		return false
	}
}

// showCaretTail renders the editor value so the caret always stays on screen,
// truncating the head when the content is longer than max. Used by single-line
// boxes (login key paste) where a long value must never overflow the border.
func showCaretTail(e *lineEditor, max int) string {
	if max < 4 {
		max = 4
	}
	runes := e.runes
	if len(runes) <= max {
		return e.cursorView()
	}
	// Show the tail so the caret (at the end when typing/pasting forward) is
	// visible even for very long values; keep a leading "…" affordance. Total
	// width stays within max: "…" + window + caret.
	n := max - 2
	out := make([]rune, 0, n+2)
	out = append(out, '…')
	if e.cursor > len(runes)-n {
		// caret is within the visible tail window
		start := len(runes) - n
		out = append(out, runes[start:e.cursor]...)
		out = append(out, '▍')
		out = append(out, runes[e.cursor:]...)
	} else {
		// caret is further left; show the tail plain
		out = append(out, runes[len(runes)-n:]...)
		out = append(out, '▍')
	}
	return string(out)
}