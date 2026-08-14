package tui

import (
	"strings"

	bkey "github.com/charmbracelet/bubbles/key"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

// renderHome renders the home screen: wordmark, tagline, workspace, model chip,
// sync status, agent pills, and a prompt to start.
func (a *App) renderHome() string {
	contentW := widthOr(a.width, 80)
	if contentW > 90 {
		contentW = 90
	}

	// Wordmark + tagline block
	var block []string
	block = append(block, lipgloss.NewStyle().Margin(1, 0, 0, 0).Render(
		styleWordmark.Render("LayerFlow"),
	))
	block = append(block, styleTagline.Render("Local-first AI workspace in your terminal"))
	block = append(block, "")

	// Workspace card
	workspace := styleCard.Render(lipgloss.JoinVertical(lipgloss.Left,
		styleDim.Render("WORKSPACE"),
		a.renderWorkspaceLine(),
		"",
		styleDim.Render("MODEL / PROVIDER"),
		a.renderModelChipLine(),
		"",
		styleDim.Render("SYNC"),
		a.renderSyncLine(),
	))

	block = append(block, workspace)

	// Pills
	block = append(block, "")
	block = append(block, a.renderPills())

	// Prompt line
	block = append(block, "")
	block = append(block, styleInputFocused.Render(
		lipgloss.JoinHorizontal(lipgloss.Left,
			lipgloss.NewStyle().Foreground(ColorPrompt).Bold(true).Render("❯ "),
			styleMuted.Render("Press "),
			styleChipActive.Render("Enter"),
			styleMuted.Render(" to chat   "),
			styleChip.Render("ctrl+p palette"),
			" ",
			styleChip.Render("ctrl+k sessions"),
			" ",
			styleChip.Render("? help"),
		),
	))

	// Center the block vertically-ish
	content := lipgloss.JoinVertical(lipgloss.Left, block...)
	content = lipgloss.NewStyle().Width(contentW).Align(lipgloss.Left).Render(content)

	top := (a.height - lipgloss.Height(content)) / 2
	if top < 0 {
		top = 0
	}
	left := (a.width - lipgloss.Width(content)) / 2
	if left < 0 {
		left = 0
	}
	return lipgloss.NewStyle().Padding(0, left).MarginTop(top).Render(content)
}

func (a *App) renderWorkspaceLine() string {
	return lipgloss.JoinHorizontal(lipgloss.Left,
		styleTitle.Render(a.st.Project),
	)
}

func (a *App) renderModelChipLine() string {
	model := a.st.Model
	if model == "" {
		model = "default"
	}
	provider := a.st.Provider
	if provider == "" {
		provider = "auto"
	}
	return lipgloss.JoinHorizontal(lipgloss.Left,
		styleChip.Render(provider),
		" ",
		styleChip.Render(model),
	)
}

func (a *App) renderSyncLine() string {
	var parts []string
	if a.st.Branch != "" {
		parts = append(parts, styleChip.Render("git: "+a.st.Branch))
	} else {
		parts = append(parts, styleChip.Render("no git repo"))
	}
	if a.st.Authenticated {
		parts = append(parts, styleChip.Render("● cloud"))
	} else {
		parts = append(parts, styleChipActive.Render("sign in required"))
	}
	return lipgloss.JoinHorizontal(lipgloss.Left, parts...)
}

// renderPills shows the available agents/actions as selectable chips.
func (a *App) renderPills() string {
	pills := []struct {
		label string
		key   string
	}{
		{"Chat", "enter"},
		{"Search files", "ctrl+r"},
		{"Models", "ctrl+l"},
		{"Activity", "ctrl+t"},
		{"New session", "ctrl+n"},
	}
	var chips []string
	for _, p := range pills {
		chips = append(chips, lipgloss.JoinHorizontal(lipgloss.Left,
			styleChip.Render(p.label),
			" ",
			styleDim.Render(p.key),
		))
	}
	return lipgloss.NewStyle().Width(widthOr(a.width, 80)).Render(strings.Join(chips, "   "))
}

// updateHome handles input on the home screen. Enter starts a chat session.
func (a *App) updateHome(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch key := msg.(type) {
	case tea.KeyMsg:
		switch {
		case bkey.Matches(key, a.keymap.Submit):
			// Login flow first if unauthenticated.
			if !a.st.Authenticated {
				a.openLogin()
				return a, nil
			}
			return a.startSession()
		case key.String() == "ctrl+n":
			return a.startSession()
		}
	}
	return a, nil
}
