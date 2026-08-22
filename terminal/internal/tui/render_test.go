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
		Version:       "0.2.9",
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
	if out := a.renderHome(); !strings.Contains(out, "Connected") {
		t.Fatal("authenticated home should show Connected status")
	}

	a2 := testApp()
	a2.st.Authenticated = false
	if out := a2.renderHome(); !strings.Contains(out, "Not signed in") || !strings.Contains(out, "Press Enter to sign in") {
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

// TestHomeContextBlock checks the workspace/model/git/status rows render and
// that a non-git directory shows a subtle "not a repository" instead of an
// error.
func TestHomeContextBlock(t *testing.T) {
	a := testApp()
	a.width, a.height = 100, 28
	a.st.GitRepo = false
	a.st.Workspace = "~/Documents"
	out := a.renderHome()
	if !strings.Contains(out, "Workspace") || !strings.Contains(out, "Model") {
		t.Fatal("home context should show Workspace and Model rows")
	}
	if !strings.Contains(out, "not a repository") {
		t.Fatal("non-git directory should show 'not a repository', not an error")
	}
	if strings.Contains(out, "fatal:") || strings.Contains(out, "exit status") {
		t.Fatal("home must not surface raw git errors")
	}

	// Inside a repo: shows branch ✓.
	b := testApp()
	b.width, b.height = 100, 28
	b.st.GitRepo = true
	b.st.Branch = "main"
	if out := b.renderHome(); !strings.Contains(out, "main ✓") {
		t.Fatalf("git repo should show branch ✓, got: %s", out)
	}
}

// TestHomeTipArea checks the rotating tip row renders on the home screen and
// stays within the terminal width.
func TestHomeTipArea(t *testing.T) {
	for _, w := range []int{40, 60, 80, 120} {
		a := testApp()
		a.width, a.height = w, 24
		out := a.renderHome()
		if !strings.Contains(out, "Tip") {
			t.Fatalf("home should contain a Tip row at w=%d", w)
		}
		for _, line := range strings.Split(out, "\n") {
			if lw := lipgloss.Width(line); lw > w {
				t.Errorf("tip w=%d: line width %d exceeds terminal width", w, lw)
			}
		}
	}
}

// TestWelcomeScreen checks the first-run celebration renders without
// overflow and contains the key branding + congratulations copy.
func TestWelcomeScreen(t *testing.T) {
	for _, w := range []int{40, 60, 80, 120} {
		for _, h := range []int{10, 20, 30} {
			a := testApp()
			a.width, a.height = w, h
			a.welcome = &welcomeScreen{app: a}
			out := a.View()
			if !strings.Contains(out, "LayerFlow") {
				t.Fatalf("welcome should contain LayerFlow at w=%d h=%d", w, h)
			}
			if !strings.Contains(out, "Congratulations") {
				t.Fatalf("welcome should contain Congratulations at w=%d h=%d", w, h)
			}
			if !strings.Contains(out, "successfully installed") {
				t.Fatalf("welcome should contain 'successfully installed' at w=%d h=%d", w, h)
			}
			for _, line := range strings.Split(out, "\n") {
				if lw := lipgloss.Width(line); lw > w {
					t.Errorf("welcome w=%d h=%d: line width %d exceeds terminal width", w, h, lw)
				}
			}
		}
	}
}

// TestWelcomeNoOverflow asserts the welcome screen never panics at tiny sizes.
func TestWelcomeNoOverflow(t *testing.T) {
	for _, w := range []int{0, 1, 5, 10, 20} {
		for _, h := range []int{0, 1, 5} {
			a := testApp()
			a.width, a.height = w, h
			a.welcome = &welcomeScreen{app: a}
			_ = a.View()
		}
	}
}
