package tui

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"

	"github.com/layerflow/terminal/pkg/diff"
)

// DiffView displays unified diffs with file navigation and optional side-by-side rendering.
type DiffView struct {
	files      []diff.FileDiff
	stats      diff.Stats
	curFile    int
	scroll     int
	sideBySide bool
	width      int
	height     int
}

// NewDiffView creates a new diff view from parsed diff data.
func NewDiffView(files []diff.FileDiff, stats diff.Stats, width, height int) DiffView {
	return DiffView{
		files:  files,
		stats:  stats,
		width:  width,
		height: height,
	}
}

// SetDiff replaces the current diff content.
func (v *DiffView) SetDiff(files []diff.FileDiff, stats diff.Stats) {
	v.files = files
	v.stats = stats
	v.curFile = 0
	v.scroll = 0
}

// Update handles Bubble Tea messages for the diff view.
func (v DiffView) Update(msg tea.Msg) (DiffView, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch msg.String() {
		case "up", "k":
			if v.scroll > 0 {
				v.scroll--
			}
		case "down", "j":
			v.scroll++
		case "pgup":
			for i := 0; i < 10; i++ {
				if v.scroll > 0 {
					v.scroll--
				}
			}
		case "pgdown":
			v.scroll += 10
		case "home":
			v.scroll = 0
		case "end":
			v.scroll = v.totalLines()
		case "tab":
			if len(v.files) > 0 {
				v.curFile = (v.curFile + 1) % len(v.files)
				v.scroll = 0
			}
		case "shift+tab":
			if len(v.files) > 0 {
				v.curFile = (v.curFile + len(v.files) - 1) % len(v.files)
				v.scroll = 0
			}
		case "s":
			v.sideBySide = !v.sideBySide
		}
	case tea.WindowSizeMsg:
		v.width = msg.Width
		v.height = msg.Height
	}
	return v, nil
}

// Render produces the diff view output.
func (v DiffView) Render() string {
	if len(v.files) == 0 {
		return v.renderEmpty()
	}

	var sections []string

	// File tabs
	if len(v.files) > 1 {
		sections = append(sections, v.renderTabs())
	}

	// Stats
	sections = append(sections, v.renderStats())

	// Current file
	if v.curFile < len(v.files) {
		f := v.files[v.curFile]
		if v.sideBySide {
			sections = append(sections, v.renderSideBySide(f))
		} else {
			sections = append(sections, v.renderUnified(f))
		}
	}

	// Scroll hint
	sections = append(sections, v.renderScrollHint())

	// Controls
	controls := lipgloss.NewStyle().Foreground(lipgloss.Color("241")).
		Render("  [↑↓] scroll  [Tab] files  [s] side-by-side  [esc] close")
	sections = append(sections, controls)

	return lipgloss.NewStyle().
		Border(lipgloss.DoubleBorder()).
		BorderForeground(lipgloss.Color("62")).
		Padding(0, 1).
		Width(min(v.width, 100)).
		Render(strings.Join(sections, "\n"))
}

func (v DiffView) renderEmpty() string {
	return lipgloss.NewStyle().
		Foreground(lipgloss.Color("241")).
		Render("  No diff to display")
}

func (v DiffView) renderTabs() string {
	var tabs []string
	for i, f := range v.files {
		label := f.Path
		if f.Status != "" {
			label = fmt.Sprintf("%s (%s)", f.Path, f.Status)
		}

		activeStyle := lipgloss.NewStyle().
			Border(lipgloss.RoundedBorder()).
			BorderForeground(lipgloss.Color("39")).
			Padding(0, 1).
			Bold(true)

		inactiveStyle := lipgloss.NewStyle().
			Border(lipgloss.RoundedBorder()).
			BorderForeground(lipgloss.Color("240")).
			Padding(0, 1)

		if i == v.curFile {
			tabs = append(tabs, activeStyle.Render(label))
		} else {
			tabs = append(tabs, inactiveStyle.Render(label))
		}
	}

	return strings.Join(tabs, " ")
}

func (v DiffView) renderStats() string {
	s := v.stats
	return lipgloss.NewStyle().Foreground(lipgloss.Color("241")).
		Render(fmt.Sprintf("  %d file(s)  +%d  -%d", s.FilesChanged, s.Insertions, s.Deletions))
}

func (v DiffView) renderUnified(f diff.FileDiff) string {
	var lines []string

	// File header
	statusColor := "33"
	switch f.Status {
	case "added":
		statusColor = "2"
	case "deleted":
		statusColor = "1"
	}
	header := lipgloss.NewStyle().Foreground(lipgloss.Color(statusColor)).Bold(true).
		Render(fmt.Sprintf("  %s  (%s)", f.Path, f.Status))
	lines = append(lines, header)

	// Hunk headers and lines
	for _, hunk := range f.Hunks {
		hunkLine := lipgloss.NewStyle().Foreground(lipgloss.Color("6")).
			Render(fmt.Sprintf("@@ -%d,%d +%d,%d @@", hunk.OldStart, hunk.OldCount, hunk.NewStart, hunk.NewCount))
		lines = append(lines, hunkLine)

		for _, dl := range hunk.Lines {
			prefix := " "
			switch dl.Type {
			case "added":
				prefix = "+"
			case "removed":
				prefix = "-"
			}
			lines = append(lines, colorizeDiffLine(prefix+dl.Content))
		}
	}

	// Scroll window
	visible := v.height - 8
	start := v.scroll
	if start > len(lines) {
		start = len(lines)
	}
	end := start + visible
	if end > len(lines) {
		end = len(lines)
	}

	return strings.Join(lines[start:end], "\n")
}

func (v DiffView) renderSideBySide(f diff.FileDiff) string {
	leftWidth := (v.width - 6) / 2
	rightWidth := v.width - leftWidth - 6

	var leftLines, rightLines []string
	leftLines = append(leftLines, lipgloss.NewStyle().Bold(true).Render(
		fmt.Sprintf("  %s (old)", f.Path)))
	rightLines = append(rightLines, lipgloss.NewStyle().Bold(true).Render(
		fmt.Sprintf("  %s (new)", f.Path)))

	for _, hunk := range f.Hunks {
		for _, dl := range hunk.Lines {
			switch dl.Type {
			case "removed":
				leftLines = append(leftLines, diffStyleRemove.Render(fmt.Sprintf("- %s", dl.Content)))
				rightLines = append(rightLines, "")
			case "added":
				leftLines = append(leftLines, "")
				rightLines = append(rightLines, diffStyleAdd.Render(fmt.Sprintf("+ %s", dl.Content)))
			default:
				leftLines = append(leftLines, dl.Content)
				rightLines = append(rightLines, dl.Content)
			}
		}
	}

	// Scroll window
	visible := v.height - 8
	start := v.scroll
	if start > len(leftLines) {
		start = len(leftLines)
	}
	end := start + visible
	if end > len(leftLines) {
		end = len(leftLines)
	}

	left := lipgloss.NewStyle().Width(leftWidth).Render(strings.Join(leftLines[start:end], "\n"))
	right := lipgloss.NewStyle().Width(rightWidth).Render(strings.Join(rightLines[start:end], "\n"))

	return lipgloss.JoinHorizontal(lipgloss.Top, left, "  │  ", right)
}

func (v DiffView) renderScrollHint() string {
	total := v.totalLines()
	visible := v.height - 8
	start := v.scroll

	if total <= visible {
		return ""
	}

	var parts []string
	if start > 0 {
		parts = append(parts, fmt.Sprintf("↑ %d", start))
	}
	if start+visible < total {
		parts = append(parts, fmt.Sprintf("↓ %d more", total-start-visible))
	}

	if len(parts) == 0 {
		return ""
	}
	return lipgloss.NewStyle().Foreground(lipgloss.Color("241")).Italic(true).
		Render("  " + strings.Join(parts, "  "))
}

func (v DiffView) totalLines() int {
	if v.curFile >= len(v.files) {
		return 0
	}
	f := v.files[v.curFile]
	count := 0
	for _, hunk := range f.Hunks {
		count += len(hunk.Lines) + 1
	}
	return count
}
