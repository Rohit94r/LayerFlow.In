package tui

import (
	"fmt"
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

// inputBoxStyle wraps the chat input in a rounded border.
var inputBoxStyle = lipgloss.NewStyle().
	Border(roundBorder).
	BorderForeground(ColorBorder).
	Padding(0, 1)

var inputBoxFocusedStyle = lipgloss.NewStyle().
	Border(roundBorder).
	BorderForeground(ColorAccent).
	Padding(0, 1)

// statusBarStyle is the compact bottom status line.
var statusBarStyle = lipgloss.NewStyle().
	Foreground(ColorMuted).
	Background(ColorPanel).
	Padding(0, 1)

// contentWidth clamps the main content column to a comfortable reading
// width: at most 100 columns and never wider than the terminal.
func contentWidth(w int) int {
	cw := w - 2
	if cw > 100 {
		cw = 100
	}
	if cw < 20 {
		cw = 20
	}
	return cw
}

// renderHome renders the chat-first home screen: the LayerFlow.dev wordmark
// with tagline, a compact context block (workspace/model/git/status), the
// input box, key hints, a rotating tip, and a status line at the bottom.
func (a *App) renderHome() string {
	brand := renderBrand(a.width)
	colW := contentWidth(a.width)

	contextBlock := a.renderHomeContext(colW)
	inputBox := a.renderHomeInputBox(colW)
	hints := renderHomeHints(colW, a.st.Authenticated)
	tip := renderTip(colW, a.st.Authenticated)
	status := a.renderStatusBar()

	mainContent := lipgloss.JoinVertical(lipgloss.Center,
		brand,
		"",
		contextBlock,
		"",
		inputBox,
		"",
		hints,
		"",
		tip,
	)

	// Keep the content around the upper third so the input sits near the
	// natural eye line, above the status bar.
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

// renderHomeContext draws a compact, subtle context block under the brand:
//
//	Workspace   ~/Documents/LayerFlow
//	Model       llama-3.3-70b · auto
//	Git         main ✓
//	Status      ● Connected
//
// Rows drop off on narrow terminals so the input always has room.
func (a *App) renderHomeContext(w int) string {
	const labelW = 11

	row := func(label, value string) string {
		return lipgloss.JoinHorizontal(lipgloss.Left,
			styleDim.Render(label),
			lipgloss.NewStyle().Width(labelW-len(label)).Render(""),
			styleMuted.Render(value),
		)
	}

	workspace := a.st.Workspace
	if workspace == "" {
		workspace = a.st.Project
	}

	model := a.st.Model
	if model == "" {
		model = "default"
	}
	modelLine := shorten(model, 40) + " · auto"

	// Git row: only meaningful inside a repo; outside is shown subtly.
	gitLine := "not a repository"
	if a.st.GitRepo {
		b := a.st.Branch
		if b == "" {
			b = "(detached)"
		}
		gitLine = b + " ✓"
	}

	// Connection row.
	statusLine := lipgloss.JoinHorizontal(lipgloss.Left,
		lipgloss.NewStyle().Foreground(ColorSuccess).Render("●"),
		" ",
		styleMuted.Render("Connected"),
	)
	if !a.st.Authenticated {
		statusLine = lipgloss.JoinHorizontal(lipgloss.Left,
			lipgloss.NewStyle().Foreground(ColorDim).Render("○"),
			" ",
			styleMuted.Render("Not signed in"),
		)
	}

	var rows []string
	rows = append(rows, row("Workspace", workspace))
	rows = append(rows, row("Model", modelLine))
	if w >= 60 {
		rows = append(rows, row("Git", gitLine))
	}
	if w >= 52 {
		rows = append(rows, row("Status", statusLine))
	}

	// Sign-in guidance for first-run users, below the context block.
	if !a.st.Authenticated {
		rows = append(rows, "")
		rows = append(rows, styleDim.Render("Press Enter to sign in · type /help for commands"))
	}

	return lipgloss.NewStyle().Width(w).Align(lipgloss.Center).Render(
		lipgloss.JoinVertical(lipgloss.Left, rows...),
	)
}

// renderHomeInputBox draws the input inside a rounded border box. The box's
// total width — borders and padding included — is exactly w, so it never
// overflows the terminal. lipgloss Width(N) includes padding but excludes
// border, so N = w-2 and the text area = N-2 = w-4.
func (a *App) renderHomeInputBox(w int) string {
	n := w - 2 // style width (excludes border, includes padding)
	if n < 6 {
		n = 6
	}
	textW := n - 2 // exclude padding → text area
	if textW < 10 {
		textW = 10
	}
	a.home.SetWidth(textW)

	style := inputBoxStyle
	if a.homeFocused {
		style = inputBoxFocusedStyle
	}
	return style.Width(n).Render(a.home.View())
}

// renderHomeHints shows the key hints under the input. Secondary hints hide
// on narrow terminals. The first hint adapts to auth state.
func renderHomeHints(w int, authenticated bool) string {
	hint := func(hotkey, text string) string {
		return lipgloss.JoinHorizontal(lipgloss.Left,
			styleMuted.Bold(true).Render(hotkey),
			" ",
			styleDim.Render(text),
		)
	}
	first := hint("Enter", "to send")
	if !authenticated {
		first = hint("Enter", "to sign in")
	}
	parts := []string{
		first,
		hint("/", "commands"),
	}
	if w >= 64 {
		parts = append(parts, hint("Ctrl+P", "palette"))
	}
	if w >= 86 {
		parts = append(parts, hint("Ctrl+K", "sessions"))
	}
	row := strings.Join(parts, "    ")
	return lipgloss.NewStyle().Width(w).Align(lipgloss.Center).Render(row)
}

// renderStatusBar draws one compact status line: auth dot, model · provider
// on the left; session, usage, and version on the right (hidden on narrow
// terminals).
func (a *App) renderStatusBar() string {
	model := a.st.Model
	if model == "" {
		model = "default"
	}

	authDot := lipgloss.NewStyle().Foreground(ColorDim).Render("○")
	if a.st.Authenticated {
		authDot = lipgloss.NewStyle().Foreground(ColorSuccess).Render("●")
	}

	left := lipgloss.JoinHorizontal(lipgloss.Left,
		" ", authDot, " ",
		styleDim.Render("Model "),
		lipgloss.NewStyle().Foreground(ColorAccentHi).Render(shorten(model, 44)),
		styleDim.Render(" · "),
		styleMuted.Render(providerFor(model)),
	)

	session := "new"
	usage := "$0.00"
	if a.session != nil {
		if t := a.session.Title; t != "" && t != "New session" {
			session = shorten(t, 16)
		}
		usage = fmt.Sprintf("$%.2f", float64(a.session.CostMicro)/1_000_000)
	}

	var rightParts []string
	if a.width >= 70 {
		rightParts = append(rightParts,
			styleDim.Render("Session "),
			styleMuted.Render(session),
			styleDim.Render(" · "),
			styleMuted.Render(usage),
		)
	}
	if a.width >= 90 {
		version := "v" + a.st.Version
		if version == "v" || version == "vdev" {
			version = "dev"
		}
		rightParts = append(rightParts, styleDim.Render(" · "), styleDim.Render(version))
	}
	right := lipgloss.JoinHorizontal(lipgloss.Left, rightParts...)

	// statusBarStyle has Padding(0,1) and no border, so Width(a.width) gives
	// a total block of a.width with a text area of a.width-2.
	barW := a.width
	if barW < 4 {
		barW = 4
	}
	inner := barW - 2 // text area inside padding
	spacer := inner - lipgloss.Width(left) - lipgloss.Width(right)
	if spacer < 0 {
		// Not enough room: drop the secondary side entirely.
		right = ""
		spacer = inner - lipgloss.Width(left)
		if spacer < 0 {
			spacer = 0
		}
	}

	bar := lipgloss.JoinHorizontal(lipgloss.Left,
		left,
		lipgloss.NewStyle().Width(spacer).Render(""),
		right,
	)

	return statusBarStyle.Width(barW).Render(bar)
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
	w := contentWidth(width) - 4 // text area inside border + padding
	if w < 10 {
		w = 10
	}
	return w
}

// homeSubmit sends the typed text as the first message, or just enters the
// chat screen when empty. Unauthenticated users are sent through login with
// their text preserved in the input.
func (a *App) homeSubmit() (tea.Model, tea.Cmd) {
	if !a.st.Authenticated {
		a.openLogin()
		return a, nil
	}

	text := strings.TrimSpace(a.home.Value())
	a.home.SetValue("")
	a.home.Model.SetHeight(1)

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
