package tui

import (
	"strings"

	"github.com/charmbracelet/lipgloss"
)

// ─── Brand hero ─────────────────────────────────────────────────────────────
// The visual hero of the home screen: "LayerFlow.dev" rendered as a huge
// orange pixel/block wordmark, centered horizontally and placed in the upper
// half of the terminal. No borders, no boxes — just big bold type.

const (
	taglineText = "AI workspace for developers"
)

// pixelGlyphs is a 5×5 block font. '#' is a lit pixel, '.' is empty. The set
// covers every character in "LayerFlow.dev".
var pixelGlyphs = map[rune][5]string{
	'L': {"#....", "#....", "#....", "#....", "#####"},
	'a': {".....", ".####", "#...#", "#...#", ".####"},
	'y': {"#...#", "#...#", "#####", "..#..", "..#.."},
	'e': {".....", "#####", "#....", "####.", "#####"},
	'r': {".....", "###..", "#...#", "#....", "#...."},
	'F': {"#####", "#....", "####.", "#....", "#...."},
	'l': {"..#..", "..#..", "..#..", "..#..", "..###"},
	'o': {".....", ".###.", "#...#", "#...#", ".###."},
	'w': {"#...#", "#...#", "#.#.#", "#####", "#####"},
	'd': {"....#", "....#", ".####", "#...#", ".###."},
	'v': {"#...#", "#...#", "#...#", ".#.#.", "..#.."},
	'.': {".....", ".....", ".....", ".....", "..#.."},
}

func glyphFor(r rune) [5]string {
	if g, ok := pixelGlyphs[r]; ok {
		return g
	}
	return [5]string{"#####", "#####", "#####", "#####", "#####"}
}

// renderBrand draws "LayerFlow.dev" as a giant orange pixel wordmark that spans
// roughly 70–90% of the terminal width. The block is centered horizontally and
// never wrapped in a border.
func renderBrand(width int) string {
	const text = "LayerFlow.dev"

	// Horizontal scale: at 1× the wordmark is 77 columns wide. Wide terminals
	// jump to 2× (letters doubled, 1-column gap) so the hero keeps dominating.
	hs := 1
	if width >= 158 {
		hs = 2
	}
	// Vertical scale doubles the height for a chunky premium look; very narrow
	// terminals fall back to a single vertical pass so the logo fits.
	vs := 2
	if width < 84 {
		vs = 1
	}

	var lines []string
	for row := 0; row < 5; row++ {
		var sb strings.Builder
		for _, ch := range text {
			g := glyphFor(ch)
			for c := 0; c < 5; c++ {
				for x := 0; x < hs; x++ {
					if g[row][c] == '#' {
						sb.WriteString("█")
					} else {
						sb.WriteString(" ")
					}
				}
			}
			sb.WriteString(" ") // inter-glyph gap
		}
		line := strings.TrimRight(sb.String(), " ")
		for v := 0; v < vs; v++ {
			lines = append(lines, lipgloss.NewStyle().Foreground(ColorAccent).Render(line))
		}
	}

	return lipgloss.NewStyle().Align(lipgloss.Center).Width(width).Render(strings.Join(lines, "\n"))
}

var taglineStyle = lipgloss.NewStyle().Foreground(ColorMuted)
