package tui

import (
	"github.com/charmbracelet/lipgloss"
)

// ─── Brand wordmark ─────────────────────────────────────────────────────────
// A clean, terminal-native wordmark: "LayerFlow" in bold orange with ".dev"
// in a secondary tone, plus the tagline underneath. Two lines tall, centered,
// responsive — no ASCII art, no border box.

// taglineText is the secondary branding line under the wordmark.
const taglineText = "AI workspace for developers"

// taglineStyle renders the secondary branding line under the wordmark.
var taglineStyle = lipgloss.NewStyle().Foreground(ColorMuted)

// renderBrand draws the centered LayerFlow.dev wordmark and tagline. It is
// intentionally compact (1–2 lines) so the chat input stays the visual focus
// of the home screen.
func renderBrand(width int) string {
	content := lipgloss.JoinVertical(lipgloss.Center,
		renderWordmarkInline(),
		taglineStyle.Render(taglineText),
	)

	w := width
	if w < 10 {
		w = 10
	}
	return lipgloss.NewStyle().
		Align(lipgloss.Center).
		Width(w).
		Render(content)
}

// renderWordmarkInline renders the one-line LayerFlow.dev wordmark for
// headers and status areas: "LayerFlow" bold orange + ".dev" secondary.
func renderWordmarkInline() string {
	name := lipgloss.NewStyle().
		Foreground(ColorAccent).
		Bold(true).
		Render("LayerFlow")

	dotdev := lipgloss.NewStyle().
		Foreground(ColorDim).
		Bold(true).
		Render(".dev")

	return lipgloss.JoinHorizontal(lipgloss.Left, name, dotdev)
}
