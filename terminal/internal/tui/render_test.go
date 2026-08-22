package tui

import (
	"strings"
	"testing"

	"github.com/charmbracelet/lipgloss"

	"github.com/layerflow/terminal/internal/session"
)

func testApp() *App {
	a := NewApp(&State{
		Model:         "llama-3.3-70b-versatile",
		Version:       "0.2.7",
		Authenticated: true,
	})
	a.width = 80
	a.height = 24
	return a
}

// TestRenderBrandCompact checks the wordmark stays small and readable:
// LayerFlow + .dev on a single line, tagline below, no ASCII art.
func TestRenderBrandCompact(t *testing.T) {
	b := renderBrand(80)
	lines := strings.Split(strings.TrimRight(b, "\n"), "\n")
	if len(lines) > 3 {
		t.Fatalf("brand should be at most 3 lines, got %d", len(lines))
	}
	if !strings.Contains(b, "LayerFlow") || !strings.Contains(b, ".dev") {
		t.Fatal("brand must contain LayerFlow.dev")
	}
	if !strings.Contains(b, taglineText) {
		t.Fatalf("brand must contain tagline %q", taglineText)
	}
}

// TestRenderHomeNoOverflow renders the home screen at common terminal sizes
// and asserts nothing exceeds the terminal width.
func TestRenderHomeNoOverflow(t *testing.T) {
	for _, w := range []int{40, 60, 80, 100, 120, 160} {
		for _, h := range []int{10, 24, 50} {
			a := testApp()
			a.width, a.height = w, h
			out := a.renderHome()
			for _, line := range strings.Split(out, "\n") {
				if lw := lipgloss.Width(line); lw > w {
					t.Errorf("home w=%d h=%d: line width %d exceeds terminal width", w, h, lw)
				}
			}
		}
	}
}

// TestRenderChatNoOverflow renders the chat screen (with history, streaming
// text, and markdown) at common terminal sizes.
func TestRenderChatNoOverflow(t *testing.T) {
	for _, w := range []int{40, 60, 80, 100, 120, 160} {
		for _, h := range []int{12, 24, 50} {
			a := testApp()
			a.width, a.height = w, h
			a.screen = screenChat
			a.session = &session.Session{Title: "Fix the authentication bug"}
			a.messages = []session.Message{
				{Role: "user", Content: "Fix the authentication bug in my project."},
				{Role: "assistant", Content: "I'll inspect the flow first.\n\n```go\nfmt.Println(\"auth\")\n```\n\n- one\n- two"},
			}
			a.streamingText.WriteString("Working on it...")
			out := a.renderChat()
			for _, line := range strings.Split(out, "\n") {
				if lw := lipgloss.Width(line); lw > w {
					t.Errorf("chat w=%d h=%d: line width %d exceeds terminal width", w, h, lw)
				}
			}
		}
	}
}

// TestRenderTinyDimensions asserts rendering never panics at degenerate
// terminal sizes.
func TestRenderTinyDimensions(t *testing.T) {
	for _, w := range []int{0, 1, 5, 10, 20} {
		for _, h := range []int{0, 1, 5} {
			a := testApp()
			a.width, a.height = w, h
			_ = a.renderHome()
			_ = a.renderChat()
			_ = a.View()
		}
	}
}

// TestViewInitializing guards the zero-size boot state.
func TestViewInitializing(t *testing.T) {
	a := NewApp(&State{Model: "m", Version: "dev"})
	a.width, a.height = 0, 0
	if got := a.View(); got != "Initializing..." {
		t.Fatalf("expected Initializing..., got %q", got)
	}
}

// TestHomeFirstRunNotices checks the first-run copy for both auth states.
func TestHomeFirstRunNotices(t *testing.T) {
	a := testApp()
	a.width, a.height = 100, 30
	if out := a.renderHome(); !strings.Contains(out, "Ready.") {
		t.Fatal("authenticated home should show Ready.")
	}

	a2 := testApp()
	a2.st.Authenticated = false
	if out := a2.renderHome(); !strings.Contains(out, "You're not signed in.") {
		t.Fatal("unauthenticated home should show sign-in notice")
	}
}

// TestStatusBarCompact checks the status line renders and stays within the
// terminal at narrow widths.
func TestStatusBarCompact(t *testing.T) {
	for _, w := range []int{40, 60, 80, 120} {
		a := testApp()
		a.width = w
		out := a.renderStatusBar()
		for _, line := range strings.Split(out, "\n") {
			if lw := lipgloss.Width(line); lw > w {
				t.Errorf("status w=%d: line width %d exceeds terminal width", w, lw)
			}
		}
	}
}
