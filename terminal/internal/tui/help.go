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

// helpSection is a titled group of key/action rows.
type helpSection struct {
	title string
	rows  [][2]string // {key, action}
}

// View renders the help overlay as scannable categorized sections.
func (h *helpModel) View() string {
	sections := []helpSection{
		{
			title: "Getting Started",
			rows: [][2]string{
				{"lf", "Start LayerFlow"},
				{"lf chat", "Open the chat screen"},
				{"lf login", "Sign in to LayerFlow"},
			},
		},
		{
			title: "Work",
			rows: [][2]string{
				{"lf run", "Run an agent task"},
				{"lf search", "Search project files"},
				{"lf sessions", "View previous sessions"},
			},
		},
		{
			title: "Models",
			rows: [][2]string{
				{"lf models", "Switch AI model"},
				{"/models", "Switch model (in TUI)"},
			},
		},
		{
			title: "Account",
			rows: [][2]string{
				{"lf cost", "View usage and cost"},
				{"lf sync", "Sync with LayerFlow"},
				{"lf logout", "Sign out"},
			},
		},
		{
			title: "Keyboard",
			rows: [][2]string{
				{"/", "Commands"},
				{"Ctrl+P", "Command palette"},
				{"Ctrl+K", "Sessions"},
				{"Ctrl+L", "Models"},
				{"Ctrl+T", "Activity"},
				{"Ctrl+N", "New chat"},
				{"Esc", "Home / close"},
				{"Ctrl+C", "Stop / quit"},
			},
		},
	}

	var body []string
	body = append(body, renderWordmarkInline())
	body = append(body, styleTagline.Render(taglineText))
	body = append(body, "")

	keyW := 12
	for _, s := range sections {
		body = append(body, styleDim.Render(s.title))
		for _, r := range s.rows {
			body = append(body, lipgloss.JoinHorizontal(lipgloss.Left,
				lipgloss.NewStyle().Width(keyW).Bold(true).Render(r[0]),
				styleMuted.Render(r[1]),
			))
		}
		body = append(body, "")
	}

	// Slash commands reference (compact, from the real registry).
	body = append(body, styleDim.Render("Slash Commands"))
	for _, c := range cmds.ListCommands() {
		aliases := ""
		if len(c.Aliases) > 0 {
			aliases = " (" + strings.Join(c.Aliases, ", ") + ")"
		}
		body = append(body, lipgloss.JoinHorizontal(lipgloss.Left,
			lipgloss.NewStyle().Width(keyW).Render("/"+c.Name),
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
