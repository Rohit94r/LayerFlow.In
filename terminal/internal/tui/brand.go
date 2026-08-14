package tui

import (
	"strings"

	"github.com/charmbracelet/lipgloss"
)

// ─── Brand hero ─────────────────────────────────────────────────────────────
// The visual hero of the home screen: "LayerFlow.dev" rendered as a large
// orange block wordmark (classic banner-letters style), centered horizontally
// and placed in the upper half of the terminal. No borders, no boxes — solid,
// contiguous, instantly readable type that scales with the terminal width.

const (
	taglineText = "AI workspace for developers"
)

// blockGlyphs is a 7-row banner alphabet (banner3 style) covering every
// character in "LayerFlow.dev". '#' is a lit pixel, ' ' is empty.
var blockGlyphs = map[rune][7]string{
	'L': {"##", "##", "##", "##", "##", "##", "########"},
	'a': {"   ###", "  ## ##", " ##   ##", "##     ##", "#########", "##     ##", "##     ##"},
	'y': {"##    ##", " ##  ##", "  ####", "   ##", "   ##", "   ##", "   ##"},
	'e': {"########", "##", "##", "######", "##", "##", "########"},
	'r': {"########", "##     ##", "##     ##", "########", "##   ##", "##    ##", "##     ##"},
	'F': {"########", "##", "##", "######", "##", "##", "##"},
	'l': {"##", "##", "##", "##", "##", "##", "########"},
	'o': {" #######", "##     ##", "##     ##", "##     ##", "##     ##", "##     ##", " #######"},
	'w': {"##      ##", "##  ##  ##", "##  ##  ##", "##  ##  ##", "##  ##  ##", "##  ##  ##", " ###  ###"},
	'.': {"", "", "", "", "", "###", "###"},
	'd': {"########", "##     ##", "##     ##", "##     ##", "##     ##", "##     ##", "########"},
	'v': {"##     ##", "##     ##", "##     ##", "##     ##", " ##   ##", "  ## ##", "   ###"},
}

func blockRow(g [7]string, band int) string {
	row := g[band]
	var sb strings.Builder
	for i := 0; i < len(row); i++ {
		if row[i] == '#' {
			sb.WriteString("█")
		} else {
			sb.WriteString(" ")
		}
	}
	return sb.String()
}

// renderBlockRows lays out the given text as banner blocks with `gap` columns
// between glyphs, returning one styled string per terminal row.
func renderBlockRows(text string, gap int) []string {
	var rows []string
	for band := 0; band < 7; band++ {
		var sb strings.Builder
		for _, ch := range text {
			sb.WriteString(blockRow(blockGlyphs[ch], band))
			sb.WriteString(strings.Repeat(" ", gap))
		}
		rows = append(rows, strings.TrimRight(sb.String(), " "))
	}
	return rows
}

func colorizeRows(rows []string) []string {
	styled := make([]string, len(rows))
	for i, r := range rows {
		styled[i] = lipgloss.NewStyle().Foreground(ColorAccent).Render(r)
	}
	return styled
}

// renderBrand draws "LayerFlow.dev" as a large orange banner wordmark that
// spans most of the terminal width. Very wide terminals get extra letter
// spacing so the hero keeps dominating; narrow terminals fall back to a
// smaller "LayerFlow" banner (with a ".dev" suffix) and finally to a clean
// bold wordmark. The block is centered horizontally, never boxed.
func renderBrand(width int) string {
	// "LayerFlow.dev" sums to 108 glyph columns; gap fills the rest.
	switch {
	case width >= 120:
		gap := 1
		if width > 165 {
			gap = (width*82/100 - 108) / 12
			if gap < 1 {
				gap = 1
			}
			if gap > 10 {
				gap = 10
			}
		}
		rows := colorizeRows(renderBlockRows("LayerFlow.dev", gap))
		return lipgloss.NewStyle().Align(lipgloss.Center).Width(width).Render(strings.Join(rows, "\n"))

	case width >= 95:
		rows := colorizeRows(renderBlockRows("LayerFlow", 1))
		dev := lipgloss.NewStyle().Foreground(ColorAccent).Bold(true).Render(".dev")
		block := lipgloss.JoinHorizontal(lipgloss.Center, strings.Join(rows, "\n"), "  ", dev)
		return lipgloss.NewStyle().Align(lipgloss.Center).Width(width).Render(block)

	default:
		word := lipgloss.JoinHorizontal(lipgloss.Left,
			lipgloss.NewStyle().Foreground(ColorText).Bold(true).Render("LayerFlow"),
			lipgloss.NewStyle().Foreground(ColorAccent).Bold(true).Render(".dev"),
		)
		return lipgloss.NewStyle().Align(lipgloss.Center).Width(width).Render(word)
	}
}

var taglineStyle = lipgloss.NewStyle().Foreground(ColorMuted)
