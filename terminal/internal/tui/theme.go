package tui

import (
	"strings"

	"github.com/charmbracelet/lipgloss"
)

// ─── Brand palette ──────────────────────────────────────────────────────────
// LayerFlow.dev — premium dark theme.
//
//	Background: near-black      #0B0B0B
//	Primary:    white           #F5F5F5
//	Secondary:  gray            #A3A3A3
//	Accent:     orange          #F97316
//	Border:     zinc-800        #262626
var (
	ColorBG        = lipgloss.Color("#0B0B0B")
	ColorPanel     = lipgloss.Color("#161616")
	ColorPanel2    = lipgloss.Color("#1C1C1C")
	ColorBorder    = lipgloss.Color("#262626")
	ColorBorderHi  = lipgloss.Color("#3F3F3F")
	ColorText      = lipgloss.Color("#F5F5F5")
	ColorDim       = lipgloss.Color("#737373")
	ColorMuted     = lipgloss.Color("#A3A3A3")
	ColorWhite     = lipgloss.Color("#FFFFFF")
	ColorAccent    = lipgloss.Color("#F97316")
	ColorAccentHi  = lipgloss.Color("#FB923C")
	ColorAccentDim = lipgloss.Color("#7C2D12")
	ColorSuccess   = lipgloss.Color("#4ADE80")
	ColorWarn      = lipgloss.Color("#FBBF24")
	ColorError     = lipgloss.Color("#F87171")
	ColorPrompt    = lipgloss.Color("#FDBA74")
)

// Border shapes used across the premium UI.
var roundBorder = lipgloss.RoundedBorder()
var thinBorder = lipgloss.NormalBorder()

var (
	// styleApp is the full-screen background.
	styleApp = lipgloss.NewStyle().
			Background(ColorBG)

	// ── Surfaces ──────────────────────────────────────────────────────────
	styleCard = lipgloss.NewStyle().
			Background(ColorPanel).
			Border(roundBorder).
			BorderForeground(ColorBorder).
			Padding(1, 2)

	styleCardAccent = lipgloss.NewStyle().
			Background(ColorPanel).
			Border(roundBorder).
			BorderForeground(ColorBorderHi).
			Padding(1, 2)

	styleModal = lipgloss.NewStyle().
			Background(ColorPanel2).
			Border(roundBorder).
			BorderForeground(ColorBorderHi).
			Padding(1, 2)

	// ── Text ──────────────────────────────────────────────────────────────
	styleWordmark = lipgloss.NewStyle().
			Foreground(ColorAccent).
			Bold(true)

	styleTitle = lipgloss.NewStyle().
			Foreground(ColorText).
			Bold(true)

	styleSubtitle = lipgloss.NewStyle().
			Foreground(ColorText).
			Bold(true)

	styleTagline = lipgloss.NewStyle().
			Foreground(ColorMuted)

	styleDim = lipgloss.NewStyle().
			Foreground(ColorDim)

	styleMuted = lipgloss.NewStyle().
			Foreground(ColorMuted)

	styleSecondary = lipgloss.NewStyle().
			Foreground(ColorMuted)

	// ── Chips & badges ────────────────────────────────────────────────────
	styleChip = lipgloss.NewStyle().
			Foreground(ColorMuted).
			Border(thinBorder).
			BorderForeground(ColorBorder).
			Padding(0, 1)

	styleChipActive = lipgloss.NewStyle().
			Foreground(ColorText).
			Background(ColorAccent).
			Bold(true).
			Padding(0, 1)

	styleChipModel = lipgloss.NewStyle().
			Foreground(ColorAccentHi).
			Border(thinBorder).
			BorderForeground(ColorAccentDim).
			Padding(0, 1)

	// ── Input ─────────────────────────────────────────────────────────────
	styleInput = lipgloss.NewStyle().
			Border(roundBorder).
			BorderForeground(ColorBorder).
			Padding(0, 1)

	styleInputFocused = lipgloss.NewStyle().
				Border(roundBorder).
				BorderForeground(ColorAccent).
				Padding(0, 1)

	// ── Status / footer ───────────────────────────────────────────────────
	styleStatus = lipgloss.NewStyle().
			Foreground(ColorMuted).
			Padding(0, 1)

	styleFooter = lipgloss.NewStyle().
			Foreground(ColorMuted)

	// ── Toasts ────────────────────────────────────────────────────────────
	styleToastInfo = lipgloss.NewStyle().
			Foreground(ColorText).
			Background(ColorPanel).
			Border(roundBorder).
			BorderForeground(ColorBorderHi).
			Padding(0, 1)

	styleToastSuccess = lipgloss.NewStyle().
				Foreground(ColorText).
				Background(ColorPanel).
				Border(roundBorder).
				BorderForeground(ColorSuccess).
				Padding(0, 1)

	styleToastError = lipgloss.NewStyle().
			Foreground(ColorText).
			Background(ColorPanel).
			Border(roundBorder).
			BorderForeground(ColorError).
			Padding(0, 1)

	// ── Lists & selection ────────────────────────────────────────────────
	styleListSel = lipgloss.NewStyle().
			Foreground(ColorText).
			Background(ColorAccent).
			Bold(true)

	styleListSelDim = lipgloss.NewStyle().
			Foreground(ColorAccentHi).
			Background(ColorPanel2)

	styleListDim = lipgloss.NewStyle().
			Foreground(ColorDim)

	styleHeader = lipgloss.NewStyle().
			Foreground(ColorText).
			Bold(true)

	// ── Role labels (chat) ────────────────────────────────────────────────
	styleRoleUser = lipgloss.NewStyle().
			Foreground(ColorText).
			Bold(true)

	styleRoleAssistant = lipgloss.NewStyle().
				Foreground(ColorAccent).
				Bold(true)

	styleRoleSystem = lipgloss.NewStyle().
			Foreground(ColorDim).
			Italic(true)
)

// widthOr returns the width if positive, otherwise the fallback.
func widthOr(w int, fallback int) int {
	if w <= 0 {
		return fallback
	}
	return w
}

// ── Diff highlighting ────────────────────────────────────────────────────────
var (
	diffStyleHeader = lipgloss.NewStyle().Foreground(ColorAccentHi).Bold(true)
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
