package tui

import (
	"github.com/charmbracelet/lipgloss"
)

// ─── Brand hero ─────────────────────────────────────────────────────────────
// A polished, bordered logo block for the home screen. "LayerFlow" in large
// orange bold text inside a rounded border box with a tagline below.

const (
	taglineText = "The AI Coding Platform That Never Forgets"
)

// logoBoxStyle wraps the wordmark in a rounded border with orange accent.
var logoBoxStyle = lipgloss.NewStyle().
	Border(roundBorder).
	BorderForeground(ColorAccentDim).
	Padding(1, 4).
	MarginBottom(1)

// renderBrand draws a polished logo: "LayerFlow" in a bordered box with the
// tagline below it. Centered, with orange accents.
func renderBrand(width int) string {
	name := lipgloss.NewStyle().
		Foreground(ColorAccent).
		Bold(true).
		Render("LayerFlow")

	dotdev := lipgloss.NewStyle().
		Foreground(ColorDim).
		Bold(true).
		Render(".dev")

	word := lipgloss.JoinHorizontal(lipgloss.Left, name, dotdev)

	// Wrap in a bordered box for a proper app feel.
	boxed := logoBoxStyle.Render(word)

	tagline := taglineStyle.Render(taglineText)

	content := lipgloss.JoinVertical(lipgloss.Center, boxed, tagline)

	return lipgloss.NewStyle().
		Align(lipgloss.Center).
		Width(width).
		Render(content)
}

var taglineStyle = lipgloss.NewStyle().Foreground(ColorMuted)
