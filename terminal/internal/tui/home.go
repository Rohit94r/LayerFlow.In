package tui

import (
	"strings"

	bkey "github.com/charmbracelet/bubbles/key"
	"github.com/charmbracelet/bubbles/textarea"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

// homeInput is the chat entry field on the home screen.
type homeInput struct {
	textarea.Model
}

func newHomeInput() homeInput {
	ta := textarea.New()
	ta.Placeholder = "Ask anything about your code, startup, docs"
	ta.Prompt = ""
	ta.CharLimit = 2000
	ta.MaxHeight = 4
	ta.ShowLineNumbers = false
	ta.SetWidth(60)
	ta.SetHeight(1)
	ta.FocusedStyle.Placeholder = lipgloss.NewStyle().Foreground(ColorDim)
	ta.BlurredStyle.Placeholder = lipgloss.NewStyle().Foreground(ColorDim)
	ta.FocusedStyle.Base = lipgloss.NewStyle().Foreground(ColorText)
	ta.FocusedStyle.CursorLine = lipgloss.NewStyle().Foreground(ColorText)
	ta.FocusedStyle.Prompt = lipgloss.NewStyle().Foreground(ColorMuted)
	ta.FocusedStyle.EndOfBuffer = lipgloss.NewStyle().Foreground(ColorDim)
	ta.Cursor.Style = lipgloss.NewStyle().Foreground(ColorAccent)
	ta.Focus()
	return homeInput{ta}
}

// renderHome renders the premium home screen: a giant pixel wordmark hero in
// the upper half, a single clean chat input, and a whisper of helper text.
// No boxes, no cards, no command list, no diagnostics.
func (a *App) renderHome() string {
	// The hero spans (nearly) the full terminal width so it dominates; the
	// input column below is capped for readability.
	logo := renderBrand(a.width)

	colW := a.width
	if colW > 130 {
		colW = 130
	}
	if colW < 40 {
		colW = 40
	}

	sub := []string{
		lipgloss.NewStyle().Align(lipgloss.Center).Width(colW).Render(taglineStyle.Render(taglineText)),
		"",
		"",
		a.renderHomeInput(colW),
		"",
		renderHomeHints(colW),
	}
	subBlock := lipgloss.NewStyle().Width(colW).Align(lipgloss.Center).Render(lipgloss.JoinVertical(lipgloss.Left, sub...))

	content := lipgloss.JoinVertical(lipgloss.Left, logo, "", subBlock)

	// Anchor the hero to the upper half of the terminal with generous space
	// above; the input and hints fall below the logo's midline.
	top := (a.height*3)/10 - lipgloss.Height(content)/2
	if top < 1 {
		top = 1
	}
	return lipgloss.NewStyle().MarginTop(top).Render(content)
}

// renderHomeInput draws the single chat entry line: a "You " prefix and the
// input on a clean line with a hairline underline. No border box, so no stray
// corners or pipes can leak into the text area.
func (a *App) renderHomeInput(w int) string {
	ti := a.home
	avail := w - len("You ") - 2
	if avail < 20 {
		avail = 20
	}
	ti.SetWidth(avail)
	view := ti.View()

	under := lipgloss.NewStyle().Foreground(ColorBorder).Render(strings.Repeat("─", w))
	if a.homeFocused {
		under = lipgloss.NewStyle().Foreground(ColorAccent).Render(strings.Repeat("─", w))
	}
	return lipgloss.JoinVertical(lipgloss.Left, view, under)
}

// renderHomeHints shows the three helper hints under the input.
func renderHomeHints(w int) string {
	hint := func(text string, hotkey string) string {
		return lipgloss.JoinHorizontal(lipgloss.Left,
			styleMuted.Render(text),
			" ",
			styleChipActive.Render(hotkey),
		)
	}
	row := lipgloss.JoinHorizontal(lipgloss.Center,
		hint("Press", "Enter"),
		"   ",
		hint("Type", "/"),
		"   ",
		hint("Press", "Ctrl+C"),
	)
	return lipgloss.NewStyle().Width(w).Align(lipgloss.Center).Render(row)
}

// updateHome handles input on the premium home screen.
func (a *App) updateHome(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.KeyMsg:
		key := msg.String()

		// A slash starts the command palette without leaving the home screen.
		if key == "/" {
			a.home.SetValue("")
			a.home.Model.SetHeight(1)
			a.openSlashPopup()
			return a, nil
		}

		switch {
		case bkey.Matches(msg, a.keymap.Submit):
			return a.homeSubmit()
		case bkey.Matches(msg, a.keymap.NewSession):
			a.home.SetValue("")
			a.home.Model.SetHeight(1)
			return a.startSession()
		case bkey.Matches(msg, a.keymap.Newline):
			a.home.InsertString("\n")
			a.refreshHomeHeight()
			return a, nil
		}

		var cmd tea.Cmd
		a.home.Model, cmd = a.home.Update(msg)
		a.refreshHomeHeight()
		return a, cmd
	}
	return a, nil
}

// refreshHomeHeight keeps the home input's height in sync with its content so
// the underline always sits directly under the last typed line.
func (a *App) refreshHomeHeight() {
	a.home.Model.SetHeight(composerRows(a.home.Value(), homeComposerWidth(a.width), 4))
}

func homeComposerWidth(width int) int {
	colW := width
	if colW > 130 {
		colW = 130
	}
	if colW < 40 {
		colW = 40
	}
	avail := colW - len("You ") - 2
	if avail < 20 {
		avail = 20
	}
	return avail
}

// homeSubmit sends the typed text as the first message, or just enters the
// chat screen when empty.
func (a *App) homeSubmit() (tea.Model, tea.Cmd) {
	text := strings.TrimSpace(a.home.Value())
	a.home.SetValue("")
	a.home.Model.SetHeight(1)

	// Login first if unauthenticated.
	if !a.st.Authenticated {
		a.openLogin()
		return a, nil
	}

	if text != "" && strings.HasPrefix(text, "/") {
		a.pendingSend = ""
		return a.runSlashCommand(text)
	}

	cm, cmd := a.startSession()
	if text != "" {
		// Queue the first message to send right after the chat screen mounts.
		a.pendingSend = text
		return a, func() tea.Msg { return pendingSendMsg{} }
	}
	return cm, cmd
}
