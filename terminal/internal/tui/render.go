package tui

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/lipgloss"
)

var (
	diffStyleHeader = lipgloss.NewStyle().Foreground(lipgloss.Color("33")).Bold(true)
	diffStyleAdd    = lipgloss.NewStyle().Foreground(lipgloss.Color("2"))
	diffStyleRemove = lipgloss.NewStyle().Foreground(lipgloss.Color("1"))
	diffStyleHunk   = lipgloss.NewStyle().Foreground(lipgloss.Color("6"))
)

// renderDiff renders the diff view overlay within the TUI model.
func (m Model) renderDiff() string {
	if m.diff == nil {
		return ""
	}
	d := *m.diff
	d.width = m.width
	d.height = m.height
	return d.Render()
}

// renderConversation renders the message history within the given height.
func (m Model) renderConversation(convHeight int) string {
	conv := NewConversationView(m.width, convHeight)
	conv.SetMessages(m.messages)
	if m.scroll >= len(m.messages) {
		conv.ScrollToBottom()
	} else {
		conv.scroll = m.scroll
	}
	return conv.Render()
}

// renderApproval renders the approval card overlay.
func (m Model) renderApproval() string {
	if m.approval == nil {
		return ""
	}
	a := m.approval

	var sections []string

	// Title
	riskColor := "2" // green
	switch a.Risk {
	case "write":
		riskColor = "3" // yellow
	case "exec":
		riskColor = "208" // orange
	case "destructive":
		riskColor = "1" // red
	}

	title := fmt.Sprintf("  tool: %s  risk: %s",
		lipgloss.NewStyle().Bold(true).Render(a.Tool),
		lipgloss.NewStyle().Foreground(lipgloss.Color(riskColor)).Render(a.Risk),
	)
	sections = append(sections, title)

	// Preview
	if a.Preview != "" {
		sections = append(sections, "")
		previewLines := strings.Split(a.Preview, "\n")
		previewHeight := m.height - 10
		if previewHeight < 5 {
			previewHeight = 5
		}
		if len(previewLines) > previewHeight {
			previewLines = previewLines[:previewHeight]
			previewLines = append(previewLines, lipgloss.NewStyle().Faint(true).Render("  ..."))
		}
		sections = append(sections, strings.Join(previewLines, "\n"))
	}

	// Buttons
	sections = append(sections, "")
	buttons := m.renderApprovalButtons()
	sections = append(sections, buttons)

	// Help
	help := lipgloss.NewStyle().Foreground(lipgloss.Color("241")).
		Render("  [y] approve  [n] deny  [a] auto-approve  [Tab] switch  [esc] deny")
	sections = append(sections, help)

	return lipgloss.NewStyle().
		Border(lipgloss.DoubleBorder()).
		BorderForeground(lipgloss.Color("208")).
		Padding(0, 1).
		Render(strings.Join(sections, "\n"))
}

func (m Model) renderApprovalButtons() string {
	approveBtn := "[ Approve ]"
	denyBtn := "[ Deny ]"
	autoBtn := "[ Auto ]"

	style := lipgloss.NewStyle().Foreground(lipgloss.Color("241"))
	activeStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("39")).Bold(true)

	switch m.approval.Focus {
	case 0:
		approveBtn = activeStyle.Render(approveBtn)
		denyBtn = style.Render(denyBtn)
		autoBtn = style.Render(autoBtn)
	case 1:
		approveBtn = style.Render(approveBtn)
		denyBtn = activeStyle.Render(denyBtn)
		autoBtn = style.Render(autoBtn)
	case 2:
		approveBtn = style.Render(approveBtn)
		denyBtn = style.Render(denyBtn)
		autoBtn = activeStyle.Render(autoBtn)
	}

	return fmt.Sprintf("  %s  %s  %s", approveBtn, denyBtn, autoBtn)
}

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

// renderHelp renders the help overlay.
func (m Model) renderHelp() string {
	help := `
  Keyboard Shortcuts
  ───────────────────
  Enter       Send message
  ↑/↓         Scroll messages
  PgUp/PgDn   Scroll faster
  Home/End    Jump to top/bottom
  Ctrl+K      Command palette
  ?           Toggle this help
  Ctrl+C      Cancel / Quit

  Slash Commands
  ───────────────────
  /help       Show help
  /model      Switch model
  /provider   Switch provider
  /new        New session
  /sessions   List sessions
  /compact    Compact history
  /memory     Memory management
  /search     Search files
  /status     Show status
  /cost       Show cost
  /git        Git operations
  /doctor     Diagnostics
  /clear      Clear screen
`

	return lipgloss.NewStyle().
		Border(lipgloss.RoundedBorder()).
		BorderForeground(lipgloss.Color("62")).
		Padding(1, 2).
		Render(help)
}

// renderInput renders the user input line at the bottom of the screen.
func (m Model) renderInput() string {
	prompt := lipgloss.NewStyle().Foreground(lipgloss.Color("62")).Bold(true).Render("❯ ")
	input := m.input

	if m.loading || m.streaming {
		return lipgloss.NewStyle().Foreground(lipgloss.Color("241")).Render("  " + input + "...")
	}

	return styleInput.Render(prompt + input + "█")
}

// renderStatusBar renders the persistent status bar at the very bottom.
func (m Model) renderStatusBar() string {
	s := m.statusBar

	left := fmt.Sprintf(" %s  %s ", s.Project, s.Branch)
	center := fmt.Sprintf(" %s/%s ", s.Provider, s.Model)
	right := fmt.Sprintf(" tokens:%d  $%.4f  %s ", s.Tokens, s.Cost, s.Version)

	// Calculate widths to fill the bar
	leftWidth := lipgloss.Width(left)
	centerWidth := lipgloss.Width(center)
	rightWidth := lipgloss.Width(right)
	remaining := m.width - leftWidth - centerWidth - rightWidth
	if remaining < 0 {
		remaining = 0
	}

	pad := strings.Repeat(" ", remaining)
	bar := left + pad + center + right

	return lipgloss.NewStyle().
		Foreground(lipgloss.Color("241")).
		Background(lipgloss.Color("236")).
		Width(m.width).
		Render(bar)
}

// renderPalette renders the command palette overlay.
func (m Model) renderPalette() string {
	var sections []string

	// Search input
	searchLine := lipgloss.NewStyle().
		Border(lipgloss.RoundedBorder()).
		BorderForeground(lipgloss.Color("62")).
		Padding(0, 1).
		Render("🔍 " + m.palette.Filter + "█")
	sections = append(sections, searchLine)

	// Items
	maxItems := 10
	if len(m.palette.Items) < maxItems {
		maxItems = len(m.palette.Items)
	}
	start := 0
	if m.palette.Selected >= maxItems {
		start = m.palette.Selected - maxItems + 1
	}

	for i := start; i < start+maxItems && i < len(m.palette.Items); i++ {
		item := m.palette.Items[i]
		label := fmt.Sprintf("  %-12s %s", item.Name, item.Description)

		if i == m.palette.Selected {
			sections = append(sections, lipgloss.NewStyle().
				Background(lipgloss.Color("62")).
				Foreground(lipgloss.Color("15")).
				Render(label))
		} else {
			sections = append(sections, label)
		}
	}

	if len(m.palette.Items) == 0 {
		sections = append(sections, lipgloss.NewStyle().Faint(true).Render("  No matching commands"))
	}

	return lipgloss.NewStyle().
		Border(lipgloss.RoundedBorder()).
		BorderForeground(lipgloss.Color("62")).
		Padding(0, 1).
		Width(40).
		Render(strings.Join(sections, "\n"))
}
