package tui

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

// ApprovalView displays tool invocation details and awaits user consent.
type ApprovalView struct {
	tool    string
	risk    string
	preview string
	focus   int // 0=approve, 1=deny, 2=auto
	visible bool
	width   int
	height  int
}

// NewApprovalView creates a new approval card view.
func NewApprovalView(width, height int) ApprovalView {
	return ApprovalView{
		width:  width,
		height: height,
	}
}

// Show displays the approval card for the given tool invocation.
func (v *ApprovalView) Show(tool, risk, preview string) {
	v.tool = tool
	v.risk = risk
	v.preview = preview
	v.focus = 0
	v.visible = true
}

// Hide dismisses the approval card.
func (v *ApprovalView) Hide() {
	v.visible = false
}

// IsVisible returns whether the card is currently shown.
func (v ApprovalView) IsVisible() bool {
	return v.visible
}

// Decision returns the user's decision after they respond.
// Returns "" if no decision has been made yet.
func (v ApprovalView) Decision() string {
	if !v.visible {
		return ""
	}
	switch v.focus {
	case 0:
		return "approve"
	case 1:
		return "deny"
	case 2:
		return "auto"
	}
	return ""
}

// Update handles Bubble Tea messages for the approval view.
func (v ApprovalView) Update(msg tea.Msg) (ApprovalView, tea.Cmd) {
	if !v.visible {
		return v, nil
	}

	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch msg.String() {
		case "tab":
			v.focus = (v.focus + 1) % 3
		case "shift+tab":
			v.focus = (v.focus + 2) % 3
		case "y", "left":
			v.focus = 0
			v.visible = false
			return v, nil
		case "n", "right":
			v.focus = 1
			v.visible = false
			return v, nil
		case "a":
			v.focus = 2
			v.visible = false
			return v, nil
		case "esc":
			v.focus = 1
			v.visible = false
			return v, nil
		case "enter":
			v.visible = false
			return v, nil
		}
	case tea.WindowSizeMsg:
		v.width = msg.Width
		v.height = msg.Height
	}
	return v, nil
}

// Render produces the approval card output.
func (v ApprovalView) Render() string {
	if !v.visible {
		return ""
	}

	var sections []string

	// Title bar
	riskColor := "2"
	switch v.risk {
	case "write":
		riskColor = "3"
	case "exec":
		riskColor = "208"
	case "destructive":
		riskColor = "1"
	}

	title := fmt.Sprintf("  tool: %s  risk: %s",
		lipgloss.NewStyle().Bold(true).Render(v.tool),
		lipgloss.NewStyle().Foreground(lipgloss.Color(riskColor)).Render(v.risk),
	)
	sections = append(sections, title)

	// Separator
	sections = append(sections, lipgloss.NewStyle().
		Border(lipgloss.NormalBorder(), false, false, false, false).
		BorderForeground(lipgloss.Color("240")).
		Render(""))

	// Preview content
	if v.preview != "" {
		previewHeight := v.height - 10
		if previewHeight < 3 {
			previewHeight = 3
		}

		previewLines := strings.Split(v.preview, "\n")
		if len(previewLines) > previewHeight {
			previewLines = previewLines[:previewHeight]
			previewLines = append(previewLines, lipgloss.NewStyle().Faint(true).Render("  ..."))
		}
		sections = append(sections, strings.Join(previewLines, "\n"))
		sections = append(sections, "")
	}

	// Buttons
	sections = append(sections, v.renderButtons())

	// Help text
	help := lipgloss.NewStyle().Foreground(lipgloss.Color("241")).
		Render("  [y] approve  [n] deny  [a] auto  [Tab] switch  [esc] deny")
	sections = append(sections, help)

	return lipgloss.NewStyle().
		Border(lipgloss.DoubleBorder()).
		BorderForeground(lipgloss.Color("208")).
		Padding(0, 1).
		Width(min(v.width, 70)).
		Render(strings.Join(sections, "\n"))
}

func (v ApprovalView) renderButtons() string {
	btnStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("241"))
	activeStyle := lipgloss.NewStyle().
		Foreground(lipgloss.Color("15")).
		Background(lipgloss.Color("62")).
		Bold(true).
		Padding(0, 2)

	approve := btnStyle.Render("[ Approve ]")
	deny := btnStyle.Render("[ Deny ]")
	auto := btnStyle.Render("[ Auto ]")

	switch v.focus {
	case 0:
		approve = activeStyle.Render("[ Approve ]")
	case 1:
		deny = activeStyle.Render("[ Deny ]")
	case 2:
		auto = activeStyle.Render("[ Auto ]")
	}

	return fmt.Sprintf("  %s    %s    %s", approve, deny, auto)
}
