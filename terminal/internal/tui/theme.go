package tui

import (
	"strings"

	"github.com/charmbracelet/lipgloss"
)

// Color palette — dark background, soft-gray text, white primary, blue accent.
var (
	ColorBG      = lipgloss.Color("0")
	ColorPanel   = lipgloss.Color("236")
	ColorBorder  = lipgloss.Color("239")
	ColorText    = lipgloss.Color("252")
	ColorDim     = lipgloss.Color("240")
	ColorMuted   = lipgloss.Color("243")
	ColorWhite   = lipgloss.Color("15")
	ColorAccent  = lipgloss.Color("39")
	ColorAccent2 = lipgloss.Color("69")
	ColorSuccess = lipgloss.Color("2")
	ColorWarn    = lipgloss.Color("3")
	ColorError   = lipgloss.Color("1")
	ColorPrompt  = lipgloss.Color("75")
)

var (
	styleApp = lipgloss.NewStyle().
			Background(ColorBG)

	styleCard = lipgloss.NewStyle().
			Background(ColorPanel).
			Border(lipgloss.RoundedBorder()).
			BorderForeground(ColorBorder).
			Padding(1, 2)

	styleCardAccent = lipgloss.NewStyle().
			Background(ColorPanel).
			Border(lipgloss.RoundedBorder()).
			BorderForeground(ColorAccent).
			Padding(1, 2)

	styleWordmark = lipgloss.NewStyle().
			Foreground(ColorAccent).
			Bold(true)

	styleTitle = lipgloss.NewStyle().
			Foreground(ColorWhite).
			Bold(true)

	styleTagline = lipgloss.NewStyle().
			Foreground(ColorMuted)

	styleDim = lipgloss.NewStyle().
			Foreground(ColorDim)

	styleMuted = lipgloss.NewStyle().
			Foreground(ColorMuted)

	styleChip = lipgloss.NewStyle().
			Foreground(ColorAccent2).
			Border(lipgloss.RoundedBorder()).
			BorderForeground(ColorBorder).
			Padding(0, 1)

	styleChipActive = lipgloss.NewStyle().
			Foreground(ColorWhite).
			Background(ColorAccent).
			Padding(0, 1)

	styleInput = lipgloss.NewStyle().
			Border(lipgloss.RoundedBorder()).
			BorderForeground(ColorBorder).
			Padding(0, 1)

	styleInputFocused = lipgloss.NewStyle().
				Border(lipgloss.RoundedBorder()).
				BorderForeground(ColorAccent).
				Padding(0, 1)

	styleStatus = lipgloss.NewStyle().
			Foreground(ColorMuted).
			Background(ColorPanel).
			Padding(0, 1)

	styleToastInfo = lipgloss.NewStyle().
			Foreground(ColorText).
			Background(ColorPanel).
			Border(lipgloss.RoundedBorder()).
			BorderForeground(ColorAccent).
			Padding(0, 1)

	styleToastSuccess = lipgloss.NewStyle().
				Foreground(ColorText).
				Background(ColorPanel).
				Border(lipgloss.RoundedBorder()).
				BorderForeground(ColorSuccess).
				Padding(0, 1)

	styleToastError = lipgloss.NewStyle().
			Foreground(ColorText).
			Background(ColorPanel).
			Border(lipgloss.RoundedBorder()).
			BorderForeground(ColorError).
			Padding(0, 1)

	styleListSel = lipgloss.NewStyle().
			Foreground(ColorWhite).
			Background(ColorAccent)

	styleListDim = lipgloss.NewStyle().
			Foreground(ColorDim)

	styleHeader = lipgloss.NewStyle().
			Foreground(ColorWhite).
			Bold(true)

	styleFooter = lipgloss.NewStyle().
			Foreground(ColorMuted)
)

func widthOr(w int, fallback int) int {
	if w <= 0 {
		return fallback
	}
	return w
}

var (
	diffStyleHeader = lipgloss.NewStyle().Foreground(ColorAccent2).Bold(true)
	diffStyleAdd    = lipgloss.NewStyle().Foreground(ColorSuccess)
	diffStyleRemove = lipgloss.NewStyle().Foreground(ColorError)
	diffStyleHunk   = lipgloss.NewStyle().Foreground(ColorAccent)
)

// colorizeDiffLine applies syntax coloring to a single diff line.
func colorizeDiffLine(line string) string {
	if len(line) == 0 {
		return line
	}

	switch {
	case strings.HasPrefix(line, "+++") || strings.HasPrefix(line, "---"):
		return diffStyleHeader.Render(line)
	case strings.HasPrefix(line, "@@"):
		return diffStyleHunk.Render(line)
	case strings.HasPrefix(line, "+"):
		return diffStyleAdd.Render(line)
	case strings.HasPrefix(line, "-"):
		return diffStyleRemove.Render(line)
	default:
		return line
	}
}
