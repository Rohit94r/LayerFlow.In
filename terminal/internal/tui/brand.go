package tui

import (
	"strings"

	"github.com/charmbracelet/lipgloss"
)

// ─── Brand identity ─────────────────────────────────────────────────────────
// LayerFlow.dev is rendered as a clean, terminal-native wordmark: bold orange
// "LayerFlow" + dim ".dev", with the tagline beneath. No ASCII block art — it
// stays crisp at every terminal size and matches the web wordmark, like the
// OpenCode one-line logo.

// taglineText is the secondary branding line under the wordmark.
const taglineText = "AI workspace for developers"

// taglineStyle renders the secondary branding line under the wordmark.
var taglineStyle = lipgloss.NewStyle().Foreground(ColorMuted)

// heroRuleMin is the minimum side-rule length before we drop the decorative
// rules and just center the wordmark (so tiny terminals stay clean).
const heroRuleMin = 10

// renderHeroRule returns one decorative rule of the given length.
func renderHeroRule(n int) string {
	if n < 1 {
		return ""
	}
	return styleRule.Render(strings.Repeat("─", n))
}

// renderBrand draws the centered LayerFlow identity: the inline wordmark
// flanked by decorative hairlines (a premium title rule), with the tagline
// centered beneath. On narrow terminals the rules fade out and the wordmark
// just centers — it never overflows at any size.
func renderBrand(width, height int) string {
	w := width
	if w < 10 {
		w = 10
	}
	_ = height

	wordmark := renderWordmarkInline()
	wordW := lipgloss.Width(wordmark)

	var hero string
	side := w - wordW - 2
	if side >= heroRuleMin*2 {
		left := side / 2
		hero = lipgloss.JoinHorizontal(lipgloss.Left,
			renderHeroRule(left),
			" ",
			wordmark,
			" ",
			renderHeroRule(side-left),
		)
	} else {
		hero = wordmark
	}

	content := lipgloss.JoinVertical(lipgloss.Center,
		hero,
		taglineStyle.Render(taglineText),
	)
	return lipgloss.NewStyle().Align(lipgloss.Center).Width(w).Render(content)
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
