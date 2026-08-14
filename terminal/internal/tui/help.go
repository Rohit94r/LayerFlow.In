package tui

import (
	"strings"

	bkey "github.com/charmbracelet/bubbles/key"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"

	"github.com/layerflow/terminal/internal/cmds"
)

// helpModel is the "?" help overlay.
type helpModel struct {
	app *App
}

// openHelp shows the help overlay.
func (a *App) openHelp() {
	a.help = &helpModel{app: a}
	a.overlay = overlayHelp
}

// View renders the help overlay.
func (h *helpModel) View() string {
	var body []string
	body = append(body, styleTitle.Render("Keyboard Shortcuts"))
	body = append(body, "")

	type shortcut struct{ key, action string }
	shortcuts := []shortcut{
		{"enter", "send message"},
		{"/", "commands"},
		{"esc", "home / close"},
		{"ctrl+p", "command palette"},
		{"ctrl+r", "search"},
		{"ctrl+k", "recent chats"},
		{"ctrl+l", "switch model"},
		{"ctrl+t", "activity"},
		{"ctrl+n", "new chat"},
		{"ctrl+c", "cancel stream / quit"},
		{"?", "this help"},
	}

	for _, sc := range shortcuts {
		body = append(body, lipgloss.JoinHorizontal(lipgloss.Left,
			styleChipActive.Render(sc.key),
			"  ",
			styleMuted.Render(sc.action),
		))
	}

	body = append(body, "", styleDim.Render("COMMANDS"))
	body = append(body, "")
	for _, c := range cmds.ListCommands() {
		aliases := ""
		if len(c.Aliases) > 0 {
			aliases = " (" + strings.Join(c.Aliases, ", ") + ")"
		}
		body = append(body, lipgloss.JoinHorizontal(lipgloss.Left,
			styleChip.Render("/"+c.Name),
			" ",
			styleMuted.Render(c.Description+aliases),
		))
	}

	body = append(body, "", styleFooter.Render("  esc close"))

	content := lipgloss.JoinVertical(lipgloss.Left, body...)
	box := styleModal.Render(content)

	top := (h.app.height - lipgloss.Height(box)) / 2
	if top < 0 {
		top = 0
	}
	return lipgloss.NewStyle().MarginTop(top).Render(box)
}

// Update handles keys for the help overlay.
func (h *helpModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	if key, ok := msg.(tea.KeyMsg); ok {
		if key.String() == "esc" || bkey.Matches(key, h.app.keymap.Help) {
			h.app.closeOverlay()
			return h.app, nil
		}
	}
	return h.app, nil
}
