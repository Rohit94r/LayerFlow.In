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

// renderHome renders the chat-first home screen. It follows a strict order —
// BRAND → COMPOSER → HINTS → TIP — with nothing competing for attention:
//
//	                         LayerFlow.dev
//	                    AI workspace for developers
//
//	┌─────────────────────────────────────────────────┐
//	│ Ask anything about your code, projects, docs    │
//	└─────────────────────────────────────────────────┘
//
//	          Enter Send     / Commands      Ctrl+P
//
//	                     ● Tip  Type something
func (a *App) renderHome() string {
	brand := renderBrand(a.width, a.height)
	boxW := homeComposerBoxWidth(a.width)
	inputBox := a.renderHomeInputBox(boxW)
	hints := renderHomeHints(a.width, a.st.Authenticated)
	tip := renderTip(a.width, a.st.Authenticated)
	status := a.renderStatusBar()

	mainContent := lipgloss.JoinVertical(lipgloss.Center,
		brand,
		"",
		inputBox,
		"",
		hints,
		"  ",
		tip,
	)

	// Reserve the status bar at the bottom, then center the remaining content
	// vertically with a slight upward bias so the composer sits naturally.
	availableH := a.height - lipgloss.Height(status) - 1
	contentH := lipgloss.Height(mainContent)
	top := (availableH - contentH) / 2
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

// homeComposerBoxWidth returns the total width (borders + padding included) of
// the home composer. It uses ~80% of the terminal width so the input is wide
// and dominant, clamped to a comfortable maximum and never overflowing.
func homeComposerBoxWidth(total int) int {
	w := int(float64(total) * 0.8)
	if w > 100 {
		w = 100
	}
	if w < 30 && total > 2 {
		w = total - 2
	}
	if w < 12 {
		w = 12
	}
	return w
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

// renderStatusBar draws one clean status line: auth dot + model on the left,
// workspace · git in the middle (wide terminals only), and session · usage ·
// version on the right. Secondary info hides automatically on narrow windows.
//
//	● Model · llama-3.3-70b        ~/Documents/LayerFlow · main        Session new · $0.00
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
		lipgloss.NewStyle().Foreground(ColorAccentHi).Render(shorten(model, 26)),
	)

	// Middle: workspace · git branch. Shown only when there is horizontal room
	// and real value (never a raw git error — outside a repo we show nothing).
	var center string
	if a.width >= 92 {
		ws := a.st.Workspace
		if ws == "" {
			ws = homePath(a.st.Project)
		}
		ws = shorten(ws, 36)
		git := ""
		if a.st.GitRepo {
			b := a.st.Branch
			if b == "" {
				b = "(detached)"
			}
			git = " · " + b
		}
		center = lipgloss.JoinHorizontal(lipgloss.Left, styleMuted.Render(ws), styleDim.Render(git))
	}

	session := "new"
	usage := "$0.00"
	if a.session != nil {
		if t := a.session.Title; t != "" && t != "New session" {
			session = shorten(t, 14)
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
	} else {
		rightParts = append(rightParts, styleMuted.Render(usage))
	}
	if a.width >= 100 {
		version := "v" + a.st.Version
		if version == "v" || version == "vdev" {
			version = "dev"
		}
		rightParts = append(rightParts, styleDim.Render(" · "), styleDim.Render(version))
	}
	right := lipgloss.JoinHorizontal(lipgloss.Left, rightParts...)

	// statusBarStyle has Padding(0,1) and no border, so Width(a.width) gives a
	// total block of a.width with a text area of a.width-2.
	barW := a.width
	if barW < 4 {
		barW = 4
	}
	inner := barW - 2 // text area inside padding

	midGroup := lipgloss.JoinHorizontal(lipgloss.Left, left, "  ", center)
	spacer := inner - lipgloss.Width(midGroup) - lipgloss.Width(right)
	if spacer < 0 {
		// Not enough room: drop the middle group's center, then the right side.
		midGroup = left
		spacer = inner - lipgloss.Width(midGroup) - lipgloss.Width(right)
		if spacer < 0 {
			right = ""
			spacer = inner - lipgloss.Width(midGroup)
			if spacer < 1 {
				spacer = 1
			}
		}
	}
	if spacer < 1 {
		spacer = 1
	}

	bar := lipgloss.JoinHorizontal(lipgloss.Left,
		midGroup,
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
	w := homeComposerBoxWidth(width) - 4 // text area inside border + padding
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
