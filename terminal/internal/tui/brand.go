package tui

import (
	"strings"

	"github.com/charmbracelet/lipgloss"
)

// ─── Brand identity ─────────────────────────────────────────────────────────
// LayerFlow.dev is expressed as a strong, terminal-native wordmark:
//   - On terminals with enough room, a large 5-row block-letter "LayerFlow"
//     logo in the orange accent, with the tagline below.
//   - On small windows, a compact single-line "LayerFlow.dev" wordmark.
//
// Every block glyph is exactly 5 columns wide so the rows stay perfectly
// aligned when joined — no misalignment, always readable.

// taglineText is the secondary branding line under the wordmark.
const taglineText = "AI workspace for developers"

// taglineStyle renders the secondary branding line under the wordmark.
var taglineStyle = lipgloss.NewStyle().Foreground(ColorMuted)

// brandGlyphs is the block-letter alphabet: 5 rows × 5 columns per glyph.
var brandGlyphs = map[rune][5]string{
	'L': {"█    ", "█    ", "█    ", "█    ", "█████"},
	'A': {"  █  ", " █ █ ", "█████", "█   █", "█   █"},
	'Y': {"█   █", " █ █ ", "  █  ", "  █  ", "  █  "},
	'E': {"█████", "█    ", "███  ", "█    ", "█████"},
	'R': {"████ ", "█   █", "████ ", "█ █  ", "█   █"},
	'F': {"█████", "█    ", "███  ", "█    ", "█    "},
	'O': {" ███ ", "█   █", "█   █", "█   █", " ███ "},
	'W': {"█   █", "█   █", "█   █", "█ █ █", " ███ "},
}

// blockLogoWidth returns the rendered width of a word at the given spacing.
func blockLogoWidth(chars int, sep int) int {
	return chars*5 + (chars-1)*sep
}

// renderBlockBrand builds the "LayerFlow" block-letter logo rows, using one
// space of letter-spacing on narrow terminals and two on wide ones. The word
// is uppercased so every glyph resolves from the accent-keyed alphabet.
func renderBlockBrand(width int) []string {
	word := strings.ToUpper("LayerFlow")
	chars := len(word)
	sep := 2
	if width > 0 && blockLogoWidth(chars, 2) > width-2 {
		sep = 1
	}
	rows := make([]string, 5)
	for r := 0; r < 5; r++ {
		var b strings.Builder
		for i := range word {
			ch := rune(word[i])
			if i > 0 {
				b.WriteString(strings.Repeat(" ", sep))
			}
			b.WriteString(brandGlyphs[ch][r])
		}
		rows[r] = b.String()
	}
	return rows
}

// renderBrand draws the centered LayerFlow identity. It scales with the
// available terminal space: a large block wordmark when there is room, and a
// compact single-line wordmark when the window is small or short.
func renderBrand(width, height int) string {
	w := width
	if w < 10 {
		w = 10
	}

	// Large block wordmark needs horizontal + vertical room.
	if width >= 60 && height >= 16 && width >= blockLogoWidth(len("LayerFlow"), 1)+2 {
		logo := make([]string, 0, 7)
		for _, r := range renderBlockBrand(width) {
			logo = append(logo, lipgloss.NewStyle().Foreground(ColorAccent).Bold(true).Render(r))
		}
		logo = append(logo, "", taglineStyle.Render(taglineText))
		content := lipgloss.JoinVertical(lipgloss.Center, logo...)
		return lipgloss.NewStyle().Align(lipgloss.Center).Width(w).Render(content)
	}

	// Compact fallback: single-line wordmark + tagline.
	content := lipgloss.JoinVertical(lipgloss.Center,
		renderWordmarkInline(),
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
