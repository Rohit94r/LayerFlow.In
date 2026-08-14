package tui

import "github.com/charmbracelet/lipgloss"

// ─── Brand block ────────────────────────────────────────────────────────────
// The visual hero of the home screen: an orange "LF" monogram, the
// LayerFlow.dev wordmark, and the tagline. Centered as one block.

const (
	wordmarkMain = "LayerFlow"
	wordmarkDot  = ".dev"
	taglineText  = "AI workspace for developers"
)

var (
	logoBox = lipgloss.NewStyle().
		Border(lipgloss.RoundedBorder()).
		BorderForeground(ColorAccent).
		Foreground(ColorAccent).
		Bold(true).
		Padding(0, 1)

	wordmarkMainStyle = lipgloss.NewStyle().
				Foreground(ColorText).
				Bold(true)

	wordmarkDevStyle = lipgloss.NewStyle().
				Foreground(ColorAccent).
				Bold(true)

	taglineStyle = lipgloss.NewStyle().
			Foreground(ColorMuted)
)

// renderBrand returns the full centered brand block (monogram + wordmark +
// tagline). width is the available terminal width; wide terminals get more
// breathing room.
func renderBrand(width int) string {
	wordmark := lipgloss.JoinHorizontal(lipgloss.Left,
		wordmarkMainStyle.Render(wordmarkMain),
		wordmarkDevStyle.Render(wordmarkDot),
	)

	logo := logoBox.Render("LF")
	logoLine := lipgloss.NewStyle().
		Align(lipgloss.Center).
		Width(width).
		Render(logo)

	markLine := lipgloss.NewStyle().
		Align(lipgloss.Center).
		Width(width).
		Render(wordmark)

	tagLine := lipgloss.NewStyle().
		Align(lipgloss.Center).
		Width(width).
		Render(taglineStyle.Render(taglineText))

	return lipgloss.JoinVertical(lipgloss.Center,
		logoLine,
		"",
		markLine,
		tagLine,
	)
}
