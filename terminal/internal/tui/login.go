package tui

import (
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

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
	body = append(body, lipgloss.JoinHorizontal(lipgloss.Left,
		styleAccentDot.Render("◆"),
		" ",
		styleTitle.Render("Sign in to LayerFlow Cloud"),
	))
	body = append(body, "")
	body = append(body, styleMuted.Render("Paste your platform key (lf_live_…). It is stored in your OS keyring."))
	body = append(body, "")

	visible := l.input
	box := lipgloss.NewStyle().Border(lipgloss.RoundedBorder()).
		BorderForeground(ColorAccent).
		Padding(0, 1).
		Width(50).
		Render(lipgloss.JoinHorizontal(lipgloss.Left,
			styleDim.Render("key "),
			lipgloss.NewStyle().Foreground(ColorAccent).Bold(true).Render(visible+"▍"),
		))

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
