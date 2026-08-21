package tui

import (
	"strings"

	"github.com/charmbracelet/lipgloss"
)

// ─── Brand hero ─────────────────────────────────────────────────────────────
// Clean text wordmark for the home screen — "LayerFlow" in orange bold + ".dev"
// in dim, centered. No ASCII art, no pixel blocks. Simple, clean, professional.

const (
	taglineText = "The AI Coding Platform That Never Forgets"
)

// renderBrand draws a clean, centered text wordmark. The size scales subtly
// with terminal width: wide terminals get letter-spacing, narrow ones stay
// compact. Always readable, never cluttered.
func renderBrand(width int) string {
	name := lipgloss.NewStyle().
		Foreground(ColorAccent).
		Bold(true).
		Render("LayerFlow")

	dotdev := lipgloss.NewStyle().
		Foreground(ColorDim).
		Bold(true).
		Render(".dev")

	// Letter-spacing on wide terminals for a premium feel.
	if width >= 100 {
		spaced := lipgloss.NewStyle().
			Foreground(ColorAccent).
			Bold(true).
			Render(spacedText("LayerFlow", 2))
		word := lipgloss.JoinHorizontal(lipgloss.Left, spaced, dotdev)
		return lipgloss.NewStyle().
			Align(lipgloss.Center).
			Width(width).
			MarginTop(2).
			Render(word)
	}

	word := lipgloss.JoinHorizontal(lipgloss.Left, name, dotdev)
	return lipgloss.NewStyle().
		Align(lipgloss.Center).
		Width(width).
		MarginTop(2).
		Render(word)
}

// spacedText inserts `gap` spaces between each character of s.
func spacedText(s string, gap int) string {
	pad := strings.Repeat(" ", gap)
	var sb strings.Builder
	for i, r := range s {
		if i > 0 {
			sb.WriteString(pad)
		}
		sb.WriteRune(r)
	}
	return sb.String()
}

var taglineStyle = lipgloss.NewStyle().Foreground(ColorMuted)
