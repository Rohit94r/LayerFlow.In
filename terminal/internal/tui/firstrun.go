package tui

import (
	"os"
	"path/filepath"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

// welcomeScreen is the celebratory first-run experience. It shows once after a
// fresh install, then never again (a marker file is written on dismiss).
type welcomeScreen struct {
	app *App
}

// isFirstRun reports whether this is the first time the user launches LayerFlow.
// Detection: a marker file at ~/.config/layerflow/.welcomed is absent.
func isFirstRun() bool {
	home, err := os.UserHomeDir()
	if err != nil {
		return false
	}
	marker := filepath.Join(home, ".config", "layerflow", ".welcomed")
	_, err = os.Stat(marker)
	return os.IsNotExist(err)
}

// markWelcomed writes the marker file so the welcome screen never shows again.
func markWelcomed() {
	home, err := os.UserHomeDir()
	if err != nil {
		return
	}
	dir := filepath.Join(home, ".config", "layerflow")
	_ = os.MkdirAll(dir, 0o700)
	marker := filepath.Join(dir, ".welcomed")
	_ = os.WriteFile(marker, []byte("1"), 0o600)
}

// renderWelcome draws the full-screen celebration: confetti, big brand
// wordmark, a congratulations banner, and a "press any key" prompt.
func (w *welcomeScreen) View() string {
	width := w.app.width
	if width < 1 {
		width = 80
	}
	height := w.app.height
	if height < 1 {
		height = 24
	}

	// Confetti row — colorful scattered dots across the top.
	confetti := renderConfetti(width)

	// The big brand.
	brand := renderBigWordmark(width)

	// Congratulations banner.
	congrats := renderCongratsBanner(width)

	// Tagline + hint.
	tagline := lipgloss.NewStyle().Foreground(ColorMuted).Render("AI workspace for developers")
	hint := lipgloss.NewStyle().Foreground(ColorDim).Render("press any key to continue")

	content := lipgloss.JoinVertical(lipgloss.Center,
		confetti,
		"",
		"",
		brand,
		"",
		congrats,
		"",
		tagline,
		"",
		hint,
	)

	// Vertically center the whole block.
	contentH := lipgloss.Height(content)
	top := (height - contentH) / 2
	if top < 1 {
		top = 1
	}

	return lipgloss.NewStyle().
		Align(lipgloss.Center).
		Width(width).
		Height(height).
		MarginTop(top).
		Render(content)
}

// renderConfetti produces a row of colored dots scattered across the width.
func renderConfetti(width int) string {
	colors := []lipgloss.Color{
		ColorAccent, ColorAccentHi, ColorSuccess, ColorWarn, ColorPrompt,
	}
	dots := []string{"✦", "✧", "◆", "◇", "★", "✦", "·", "✧"}
	var row string
	pos := 0
	for i := 0; i < width; i += 3 {
		c := colors[i%len(colors)]
		d := dots[pos%len(dots)]
		pos++
		rendered := lipgloss.NewStyle().Foreground(c).Render(d)
		// Spread them out with spaces.
		row += rendered + "  "
	}
	return lipgloss.NewStyle().Width(width).Align(lipgloss.Center).Render(row)
}

// renderBigWordmark renders a larger LayerFlow.dev wordmark for the welcome
// screen. It scales down gracefully on narrow terminals.
func renderBigWordmark(width int) string {
	name := lipgloss.NewStyle().
		Foreground(ColorAccent).
		Bold(true).
		Render("LayerFlow")
	dotdev := lipgloss.NewStyle().
		Foreground(ColorDim).
		Bold(true).
		Render(".dev")
	mark := lipgloss.JoinHorizontal(lipgloss.Left, name, dotdev)
	return lipgloss.NewStyle().Width(width).Align(lipgloss.Center).Render(mark)
}

// renderCongratsBanner renders the "Congratulations!" celebration message.
func renderCongratsBanner(width int) string {
	// Party line above the message.
	party := lipgloss.NewStyle().Foreground(ColorWarn).Render("🎉 ")
	label := lipgloss.NewStyle().
		Foreground(ColorText).
		Bold(true).
		Render("Congratulations!")
	party2 := lipgloss.NewStyle().Foreground(ColorAccentHi).Render(" 🎉")

	line1 := lipgloss.JoinHorizontal(lipgloss.Left, party, label, party2)

	// Success subtitle.
	line2 := lipgloss.NewStyle().Foreground(ColorSuccess).Render(
		"LayerFlow successfully installed",
	)

	// Next-step hint.
	line3 := lipgloss.NewStyle().Foreground(ColorMuted).Render(
		"type layerflow to open the workspace",
	)

	content := lipgloss.JoinVertical(lipgloss.Center, line1, "", line2, "", line3)
	return lipgloss.NewStyle().Width(width).Align(lipgloss.Center).Render(content)
}

// Update handles any key on the welcome screen — dismisses it and marks
// the user as welcomed so it never shows again.
func (w *welcomeScreen) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	if _, ok := msg.(tea.KeyMsg); ok {
		markWelcomed()
		w.app.welcome = nil
		w.app.screen = screenHome
		return w.app, nil
	}
	return w.app, nil
}
