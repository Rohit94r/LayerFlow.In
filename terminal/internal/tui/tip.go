package tui

import (
	"time"

	"github.com/charmbracelet/lipgloss"
)

// homeTips is the rotating set of contextual tips shown on the home screen.
// They are purely educational — no debug or technical messages.
var homeTips = []string{
	"Press / for commands",
	"Ctrl+P opens the command palette",
	"Tab switches to agents",
	"Ctrl+K opens recent chats",
	"Ctrl+L switches the model",
	"Type a question and press Enter to start",
	"Ctrl+T shows git, sync & usage",
	"Esc returns to the home screen",
	"? opens help & shortcuts",
}

// renderTip draws the contextual tip row: a yellow dot + "Tip" label + the
// current tip text, centered to match the home layout. The tip rotates over
// time so the user sees different guidance on subsequent visits.
func renderTip(width int, authenticated bool) string {
	idx := int(time.Now().Unix()/8) % len(homeTips)
	tip := homeTips[idx]

	// Unauthenticated users get the sign-in tip first.
	if !authenticated {
		tip = "Press Enter to sign in · type /help for commands"
	}

	dot := lipgloss.NewStyle().Foreground(ColorWarn).Render("●")
	label := lipgloss.NewStyle().Foreground(ColorWarn).Bold(true).Render("Tip")
	text := styleDim.Render("  " + tip)

	row := lipgloss.JoinHorizontal(lipgloss.Left, dot, " ", label, text)
	return lipgloss.NewStyle().Width(width).Align(lipgloss.Center).Render(row)
}
