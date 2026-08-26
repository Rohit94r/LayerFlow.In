package tui

import (
	"errors"
	"fmt"
	"regexp"
	"strings"
	"testing"

	"github.com/charmbracelet/lipgloss"

	"github.com/layerflow/terminal/internal/cloud"
	"github.com/layerflow/terminal/internal/session"
)

func testApp() *App {
	a := NewApp(&State{
		Model:         "llama-3.3-70b-versatile",
		Version:       "0.2.10",
		Authenticated: true,
	})
	a.width = 80
	a.height = 24
	return a
}

// TestRenderBrandCompact checks the wordmark renders at all widths without
// overflow, always carries the tagline, and falls back to the compact
// LayerFlow.dev wordmark on narrow terminals.
func TestRenderBrandCompact(t *testing.T) {
	for _, w := range []int{40, 60, 80, 120} {
		for _, h := range []int{10, 24, 50} {
			b := renderBrand(w, h)
			if !strings.Contains(b, taglineText) {
				t.Fatalf("brand must contain tagline %q (w=%d h=%d)", taglineText, w, h)
			}
			lines := strings.Split(strings.TrimRight(b, "\n"), "\n")
			for _, ln := range lines {
				if lw := lipgloss.Width(ln); lw > w {
					t.Errorf("brand w=%d h=%d: line width %d exceeds terminal width", w, h, lw)
				}
			}
		}
	}

	// On a small window the compact inline wordmark is used and still readable.
	if b := renderBrand(40, 24); !strings.Contains(b, "LayerFlow") {
		t.Fatalf("compact brand should contain the LayerFlow text, got:\n%s", b)
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

// TestHomeFirstRunNotices checks the first-run sign-in guidance for both auth
// states. The home screen stays minimal — it must not try to teach the user
// how it works, just point at the composer and sign-in when needed.
func TestHomeFirstRunNotices(t *testing.T) {
	a := testApp()
	a.width, a.height = 100, 30
	if out := a.renderHome(); !strings.Contains(out, "Model") {
		t.Fatal("authenticated home should carry model info in the status bar")
	}

	a2 := testApp()
	a2.st.Authenticated = false
	if out := a2.renderHome(); !strings.Contains(out, "Enter to sign in") {
		t.Fatal("unauthenticated home should show sign-in guidance in the hints")
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

// TestHomeStatusBarCarriesWorkspaceAndGit checks the workspace + git live in
// the bottom status bar (not as a block above the composer) and that a
// non-git directory never surfaces a raw git error.
func TestHomeStatusBarCarriesWorkspaceAndGit(t *testing.T) {
	a := testApp()
	a.width, a.height = 100, 28
	a.st.GitRepo = false
	a.st.Workspace = "~/Documents"
	out := a.renderHome()
	if !strings.Contains(out, "~/Documents") {
		t.Fatal("home status bar should show the workspace")
	}
	if strings.Contains(out, "fatal:") || strings.Contains(out, "exit status") {
		t.Fatal("home must not surface raw git errors")
	}

	// Inside a repo the branch appears in the status bar: " · main".
	b := testApp()
	b.width, b.height = 100, 28
	b.st.GitRepo = true
	b.st.Branch = "main"
	b.st.Workspace = "~/Documents/LayerFlow"
	if out := b.renderHome(); !strings.Contains(out, "main") {
		t.Fatalf("git repo should show the branch in the status bar, got: %s", out)
	}
}

// TestHomeNoContextBlockAboveComposer verifies the clean layout: there is no
// workspace/model/git/status block sitting directly above the chat input.
func TestHomeNoContextBlockAboveComposer(t *testing.T) {
	a := testApp()
	a.width, a.height = 120, 40
	out := a.renderHome()
	// The composer is the primary element; workspace must live in the status
	// bar (bottom), not repeated near the brand.
	if strings.Index(out, "Workspace\n") >= 0 {
		t.Fatal("home should not show a 'Workspace' label block above the composer")
	}
	if !strings.Contains(out, "Ask anything") {
		t.Fatal("home should show the composer placeholder 'Ask anything'")
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

// TestUserErrorFriendly confirms raw provider/model errors are converted to
// short, user-visible messages and never surface verbatim.
func TestUserErrorFriendly(t *testing.T) {
	rawModel := `Error: The model "llama-3.3-70b-versatile" does not exist or you do not have access to it.`
	if got := userError(errors.New(rawModel)); strings.Contains(got, "llama-3.3-70b") || strings.Contains(got, "does not exist") {
		t.Fatalf("raw model error must not leak through userError, got: %s", got)
	}
	if got := userError(errors.New("post https://layerflow.dev: connection refused")); !strings.Contains(got, "Unable to reach LayerFlow") {
		t.Fatalf("connection error should be friendly, got: %s", got)
	}
	if got := userError(cloud.ErrInvalidKey); !strings.Contains(got, "lf login") {
		t.Fatalf("invalid key should point at login, got: %s", got)
	}
}

// TestSystemNoticeTruncates ensures internal multi-line content renders as a
// single compact line, never as raw chat body.
func TestSystemNoticeTruncates(t *testing.T) {
	internal := "You are LayerFlow, a coding agent.\nPerform a repository audit now.\nReport only JSON output.\n"
	if got := systemNotice(internal); strings.Contains(got, "repository audit") || strings.Contains(got, "coding agent") || strings.Contains(got, "\n") {
		t.Fatalf("system notice must hide internal instructions, got: %q", got)
	}
	if got := systemNotice("          "); strings.TrimSpace(got) == "" {
		t.Fatalf("system notice should still render a placeholder, got empty")
	}
}

// TestConversationScrollNoOverflow renders a scrollable conversation when the
// user is scrolled up (scrollOffset > 0) and confirms no width overflow and a
// follow hint appears.
func TestConversationScrollNoOverflow(t *testing.T) {
	for _, w := range []int{60, 80, 100, 120} {
		a := testApp()
		a.width, a.height = w, 24
		a.screen = screenChat
		var lines []string
		for i := 0; i < 80; i++ {
			lines = append(lines, fmt.Sprintf("line number %02d", i))
		}
		a.messages = []session.Message{{Role: "assistant", Content: strings.Join(lines, "\n")}}
		a.scrollOffset = 20
		out := a.renderConversation(contentWidth(w), 14)
		if !strings.Contains(out, "follow") {
			t.Fatalf("scrolled view should show a follow hint at w=%d", w)
		}
		for _, line := range strings.Split(out, "\n") {
			if lw := lipgloss.Width(line); lw > w {
				t.Errorf("conv w=%d: line width %d exceeds terminal width", w, lw)
			}
		}
	}
}

// TestStreamErrorUsesFriendlyNotice appends a friendly system notice (never a
// raw error) when a stream fails and fallback is exhausted.
func TestStreamErrorUsesFriendlyNotice(t *testing.T) {
	a := testApp()
	a.width, a.height = 100, 30
	a.fallbackTried = true // skip fallback so no network call is made
	_, _ = a.handleStreamError(cloud.ErrInvalidKey)
	found := false
	for _, m := range a.messages {
		if m.Role == "system" {
			if strings.Contains(m.Content, "lf login") {
				found = true
			}
			if strings.Contains(m.Content, "invalid LayerFlow API key") || strings.Contains(m.Content, "Error:") {
				t.Fatalf("raw error leaked into chat: %s", m.Content)
			}
		}
	}
	if !found {
		t.Fatalf("expected a friendly login notice in system messages, got %+v", a.messages)
	}
}

// TestNoPanelBackgroundBands is a regression guard for the gray/blue
// rectangle bug: the chat header, status bar, and input must not paint a
// distinct rectangular background (ColorPanel #161616) behind normal text.
// Everything sits flat on the near-black base background.
func TestNoPanelBackgroundBands(t *testing.T) {
	const panelBand = "48;2;22;22;22" // #161616 background ANSI code
	for _, w := range []int{60, 80, 100, 120} {
		a := testApp()
		a.width, a.height = w, 30
		a.screen = screenChat
		a.session = &session.Session{Title: "Fix auth"}
		a.messages = []session.Message{{Role: "user", Content: "hi"}}
		for name, out := range map[string]string{
			"chat":   a.renderChat(),
			"home":   a.renderHome(),
			"status": a.renderStatusBar(),
			"header": a.renderChatHeader(w),
		} {
			if strings.Contains(out, panelBand) {
				t.Errorf("%s w=%d: rendered a gray panel background band", name, w)
			}
		}
	}
}

// TestModelErrorDoesNotClaimConnected ensures an unavailable model is not
// reported with a false "Connected"/green state in the status bar; model
// identity always reflects the real configured value.
func TestModelErrorDoesNotClaimConnected(t *testing.T) {
	a := testApp()
	a.width, a.height = 100, 30
	a.st.Authenticated = false
	out := a.renderStatusBar()
	if strings.Contains(out, "Connected") {
		t.Fatalf("unauthenticated status must not claim Connected: %q", out)
	}
	if !strings.Contains(out, "○") {
		t.Fatalf("unauthenticated status should show an open (○) dot, got: %q", out)
	}

	// Authenticated shows the filled dot.
	b := testApp()
	b.width, b.height = 100, 30
	b.st.Authenticated = true
	if !strings.Contains(b.renderStatusBar(), "●") {
		t.Fatalf("authenticated status should show a dot, got: %q", b.renderStatusBar())
	}
}

// TestNoBackgroundArtifacts guards against ANY background-emit code in the
// main chat/home/status rendering paths, so nothing can render as a gray or
// colored rectangle behind text. Only the base near-black background and the
// H1 accent heading may carry a background.
func TestNoBackgroundArtifacts(t *testing.T) {
	re := regexp.MustCompile(`48;2;\d+;\d+;\d+|48;5;\d+`)
	a := testApp()
	a.width, a.height = 100, 30
	a.screen = screenChat
	a.session = &session.Session{Title: "x"}
	a.messages = []session.Message{
		{Role: "user", Content: "hi"},
		{Role: "assistant", Content: "use `inline` code\n\n```go\npackage main\n```"},
		{Role: "system", Content: "some system note"},
	}
	for name, out := range map[string]string{
		"home":         a.renderHome(),
		"status":       a.renderStatusBar(),
		"header":       a.renderChatHeader(94),
		"inputbox":     a.renderChatInputBox(94),
		"conversation": a.renderConversation(94, 16),
	} {
		if m := re.FindAllString(out, -1); len(m) > 0 {
			t.Errorf("%s emitted background codes: %v", name, m)
		}
	}
	// Message rendering directly (inline code must be flat).
	if m := re.FindAllString(renderMessage(a.messages[1], 90), -1); len(m) > 0 {
		t.Errorf("assistant message emitted background codes: %v", m)
	}
}
