package tui

import (
	"strings"

	"github.com/charmbracelet/bubbles/textinput"
	bkey "github.com/charmbracelet/bubbles/key"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

// homeInput is the single chat entry field on the home screen.
type homeInput struct {
	textinput.Model
}

func newHomeInput() homeInput {
	ti := textinput.New()
	ti.Placeholder = "Ask anything about your code, startup, docs"
	ti.Prompt = ""
	ti.CharLimit = 2000
	ti.PlaceholderStyle = lipgloss.NewStyle().Foreground(ColorDim)
	ti.PromptStyle = lipgloss.NewStyle().Foreground(ColorMuted)
	ti.Cursor.Style = lipgloss.NewStyle().Foreground(ColorAccent)
	ti.Focus()
	return homeInput{ti}
}

// renderHome renders the premium home screen: brand hero, a single chat input,
// and a whisper of helper text. No cards, no command list, no diagnostics.
func (a *App) renderHome() string {
	// Clamp the content column for wide terminals so the hero doesn't stretch
	// awkwardly.
	colW := a.width
	if colW > 120 {
		colW = 120
	}
	if colW < 40 {
		colW = 40
	}

	var block []string

	// Brand hero.
	block = append(block, renderBrand(colW))

	// Breathing room.
	block = append(block, "", "")

	// The one big input.
	block = append(block, a.renderHomeInputBox(colW))

	// Minimal helper text.
	block = append(block, "", renderHomeHints(colW))

	// Center vertically.
	content := lipgloss.JoinVertical(lipgloss.Left, block...)
	content = lipgloss.NewStyle().Width(colW).Align(lipgloss.Center).Render(content)

	top := (a.height - lipgloss.Height(content)) / 2
	if top < 0 {
		top = 0
	}
	return lipgloss.NewStyle().Padding(0, (a.width-colW)/2).MarginTop(top).Render(content)
}

// renderHomeInputBox draws the chat entry field with an accent border.
func (a *App) renderHomeInputBox(w int) string {
	ti := a.home
	ti.Width = w - 8
	if ti.Width < 20 {
		ti.Width = 20
	}

	// Prompt prefix "You ▸" for the ChatGPT feel.
	prefix := lipgloss.NewStyle().Foreground(ColorMuted).Bold(true).Render("You ")
	view := prefix + ti.View()

	box := styleInput.Render(view)
	if a.homeFocused {
		box = styleInputFocused.Render(view)
	}
	return box
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
			a.home.SetValue("/")
			a.openSlashPopup()
			return a, nil
		}

		switch {
		case bkey.Matches(msg, a.keymap.Submit):
			return a.homeSubmit()
		case bkey.Matches(msg, a.keymap.NewSession):
			a.home.SetValue("")
			return a.startSession()
		}

		var cmd tea.Cmd
		a.home.Model, cmd = a.home.Update(msg)
		return a, cmd
	}
	return a, nil
}

// homeSubmit sends the typed text as the first message, or just enters the
// chat screen when empty.
func (a *App) homeSubmit() (tea.Model, tea.Cmd) {
	text := strings.TrimSpace(a.home.Value())
	a.home.SetValue("")

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
