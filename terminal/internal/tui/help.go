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
	body = append(body, styleHeader.Render("Keyboard Shortcuts"))
	body = append(body, "")

	type shortcut struct{ key, action string }
	shortcuts := []shortcut{
		{"enter", "send message"},
		{"shift+enter", "newline"},
		{"esc", "home / close"},
		{"ctrl+p", "command palette"},
		{"ctrl+r", "search files"},
		{"ctrl+k", "sessions"},
		{"ctrl+l", "models"},
		{"ctrl+t", "activity"},
		{"ctrl+n", "new session"},
		{"ctrl+c", "cancel stream / quit"},
		{"?", "this help"},
	}

	for _, sc := range shortcuts {
		body = append(body, lipgloss.JoinHorizontal(lipgloss.Left,
			styleChip.Render(sc.key),
			" ",
			styleMuted.Render(sc.action),
		))
	}

	body = append(body, "")
	body = append(body, styleDim.Render("SLASH COMMANDS"))
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

	body = append(body, "")
	body = append(body, styleFooter.Render("  esc close"))

	content := lipgloss.JoinVertical(lipgloss.Left, body...)
	box := styleCard.Render(content)

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

// loginModel is the sign-in overlay (platform key paste).
type loginModel struct {
	app    *App
	input  string
	buffer string
	busy   bool
}

// openLogin shows the login overlay.
func (a *App) openLogin() {
	a.login = &loginModel{app: a}
	a.overlay = overlayLogin
}

// View renders the login overlay.
func (l *loginModel) View() string {
	var body []string
	body = append(body, styleTitle.Render("Sign in to LayerFlow Cloud"))
	body = append(body, "")
	body = append(body, styleMuted.Render("Paste your platform key (lf_live_…). It is stored in your OS keyring."))
	body = append(body, "")

	visible := l.input
	box := lipgloss.NewStyle().Border(lipgloss.RoundedBorder()).
		BorderForeground(ColorAccent).
		Padding(0, 1).
		Width(50).
		Render("key  " + visible + "▌")

	body = append(body, box)
	if l.busy {
		body = append(body, "", styleDim.Render("  validating…"))
	}
	body = append(body, "", styleFooter.Render("  enter submit · esc cancel"))

	content := lipgloss.JoinVertical(lipgloss.Left, body...)
	card := styleCardAccent.Render(content)

	top := (l.app.height - lipgloss.Height(card)) / 2
	if top < 0 {
		top = 0
	}
	return lipgloss.NewStyle().MarginTop(top).Render(card)
}

// Update handles keys for the login overlay.
func (l *loginModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch key := msg; key.String() {
		case "esc":
			l.app.closeOverlay()
			return l.app, nil
		case "enter":
			if l.input == "" || l.busy {
				return l.app, nil
			}
			l.busy = true
			key := l.input
			return l.app, func() tea.Msg {
				return loginResultMsg{err: performTuiLogin(key)}
			}
		case "backspace":
			if len(l.input) > 0 {
				l.input = l.input[:len(l.input)-1]
			}
			return l.app, nil
		case "ctrl+v", "shift+insert":
			// handled below via rune paste
			return l.app, nil
		default:
			if len(key.String()) == 1 {
				l.input += key.String()
			}
			return l.app, nil
		}
	case loginResultMsg:
		l.busy = false
		return l.app.handleLoginResult(msg)
	}
	return l.app, nil
}
