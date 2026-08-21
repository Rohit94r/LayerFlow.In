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
	ta.Placeholder = "Ask anything about your code, startup, docs..."
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

// inputBoxStyle wraps the home input in a rounded border.
var inputBoxStyle = lipgloss.NewStyle().
	Border(roundBorder).
	BorderForeground(ColorBorder).
	Padding(0, 1)

var inputBoxFocusedStyle = lipgloss.NewStyle().
			Border(roundBorder).
			BorderForeground(ColorAccent).
			Padding(0, 1)

// statusBarStyle is the bottom status bar.
var statusBarStyle = lipgloss.NewStyle().
			Foreground(ColorMuted).
			Background(ColorPanel).
			Padding(0, 1)

// renderHome renders the home screen: bordered logo, bordered input, hints,
// and a status bar at the bottom.
func (a *App) renderHome() string {
	logo := renderBrand(a.width)

	colW := a.width
	if colW > 100 {
		colW = 100
	}
	if colW < 40 {
		colW = 40
	}

	// Bordered input box
	inputBox := a.renderHomeInputBox(colW)

	// Hints row
	hints := renderHomeHints(colW)

	// Status bar at the bottom
	status := a.renderStatusBar()

	mainContent := lipgloss.JoinVertical(lipgloss.Center,
		logo,
		"",
		inputBox,
		"",
		hints,
	)

	// Center the main content vertically, leaving room for the status bar.
	availableH := a.height - lipgloss.Height(status) - 2
	contentH := lipgloss.Height(mainContent)
	top := (availableH - contentH) / 3
	if top < 1 {
		top = 1
	}

	centered := lipgloss.NewStyle().
		Align(lipgloss.Center).
		Width(a.width).
		MarginTop(top).
		Render(mainContent)

	return lipgloss.JoinVertical(lipgloss.Left, centered, status)
}

// renderHomeInputBox draws the input inside a rounded border box.
func (a *App) renderHomeInputBox(w int) string {
	ti := a.home
	avail := w - 4
	if avail < 20 {
		avail = 20
	}
	ti.SetWidth(avail)

	view := ti.View()

	style := inputBoxStyle
	if a.homeFocused {
		style = inputBoxFocusedStyle
	}
	return style.Width(w).Render(view)
}

// renderHomeHints shows the helper hints under the input.
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
		"  ",
		hint("Type", "/ for commands"),
		"  ",
		hint("Press", "Ctrl+C to quit"),
	)
	return lipgloss.NewStyle().Width(w).Align(lipgloss.Center).Render(row)
}

// renderStatusBar draws a bottom status bar with model, session, and auth info.
func (a *App) renderStatusBar() string {
	model := a.st.Model
	if model == "" {
		model = "default"
	}

	// Auth status
	authBadge := styleDim.Render("○ not logged in")
	if a.st.Authenticated {
		authBadge = lipgloss.NewStyle().Foreground(ColorSuccess).Render("● connected")
	}

	// Model badge
	modelBadge := styleChipModel.Render(model)

	// Version
	version := "v" + a.st.Version
	if version == "v" || version == "vdev" {
		version = "dev"
	}
	versionBadge := styleDim.Render(version)

	// Build the bar
	left := lipgloss.JoinHorizontal(lipgloss.Left,
		" ", modelBadge, "  ", authBadge,
	)
	right := lipgloss.JoinHorizontal(lipgloss.Left,
		versionBadge, " ",
	)

	spacer := a.width - lipgloss.Width(left) - lipgloss.Width(right) - 2
	if spacer < 0 {
		spacer = 0
	}

	bar := lipgloss.JoinHorizontal(lipgloss.Left,
		left,
		lipgloss.NewStyle().Width(spacer).Render(""),
		right,
	)

	return statusBarStyle.Width(a.width).Render(bar)
}

// updateHome handles input on the home screen.
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

// refreshHomeHeight keeps the home input's height in sync with its content.
func (a *App) refreshHomeHeight() {
	a.home.Model.SetHeight(composerRows(a.home.Value(), homeComposerWidth(a.width), 4))
}

func homeComposerWidth(width int) int {
	colW := width
	if colW > 100 {
		colW = 100
	}
	if colW < 40 {
		colW = 40
	}
	avail := colW - 4
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
		return cm, func() tea.Msg { return pendingSendMsg{} }
	}
	return cm, cmd
}
