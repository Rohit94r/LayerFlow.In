package tui

import (
	"strings"

	"github.com/charmbracelet/lipgloss"
)

// ─── Bottom Status Bar Helpers ─────────────────────────────────────────────
// These are helper functions for the status bar. The main renderStatusBar
// method is declared in home.go to avoid redeclaration.

// statusLeftStyle renders the left grouping of model + workspace.
var statusLeftStyle = lipgloss.NewStyle().
	Foreground(ColorMuted)

// statusCenterStyle renders the center group (git branch, project, etc).
var statusCenterStyle = lipgloss.NewStyle().
	Foreground(ColorDim)

// statusRightStyle renders the right-aligned group (usage, version).
var statusRightStyle = lipgloss.NewStyle().
	Foreground(ColorMuted)

// statusModelStyle renders the active model name.
var statusModelStyle = lipgloss.NewStyle().
	Foreground(ColorAccentHi).
	Bold(false)

// statusBranchStyle renders the git branch name.
var statusBranchStyle = lipgloss.NewStyle().
	Foreground(ColorSuccess).
	Bold(false)

// statusBarContent builds the status bar inner content (used by home.go's
// renderStatusBar). Returns the three sections as pre-styled strings.
func (a *App) statusBarContent() (left, center, right string) {
	return a.renderStatusLeft(a.width),
		a.renderStatusCenter(a.width),
		a.renderStatusRight(a.width)
}

// renderStatusLeft returns the left portion: Model · Workspace.
func (a *App) renderStatusLeft(inner int) string {
	var parts []string

	model := a.st.Model
	if model == "" {
		model = "auto"
	}
	parts = append(parts, statusModelStyle.Render(model))

	if a.st.Provider != "" {
		parts = append(parts, styleDim.Render("·"), styleDim.Render(shortProvider(a.st.Provider)))
	}

	if inner >= 60 && a.st.Workspace != "" {
		ws := a.st.Workspace
		if len(ws) > 12 {
			ws = ws[:10] + "…"
		}
		parts = append(parts, styleDim.Render("·"), styleDim.Render(ws))
	}

	return lipgloss.JoinHorizontal(lipgloss.Left, parts...)
}

// renderStatusCenter returns the center portion: git branch / project.
func (a *App) renderStatusCenter(inner int) string {
	if !a.st.GitRepo {
		return ""
	}

	branch := a.st.Branch
	if branch == "" {
		branch = "unknown"
	}

	projectType := a.st.ProjectType
	if projectType != "" && inner >= 80 {
		return lipgloss.JoinHorizontal(lipgloss.Left,
			styleChip.Render(projectType),
			" ",
			statusBranchStyle.Render(" "+branch),
		)
	}

	return statusBranchStyle.Render(" " + branch)
}

// renderStatusRight returns the right portion: usage + version.
func (a *App) renderStatusRight(inner int) string {
	var parts []string

	if inner >= 40 {
		usage := a.usageIndicator()
		parts = append(parts, styleMuted.Render(usage))
	}

	if inner >= 100 {
		version := "v" + a.st.Version
		if version == "v" || version == "vdev" {
			version = "dev"
		}
		parts = append(parts, styleDim.Render("·"), styleDim.Render(version))
	}

	return lipgloss.JoinHorizontal(lipgloss.Left, parts...)
}

// usageIndicator returns a compact usage string.
func (a *App) usageIndicator() string {
	if a.st.Authenticated {
		return "◆"
	}
	return "○ offline"
}

// shortProvider shortens a provider name for the status bar.
func shortProvider(p string) string {
	switch strings.ToLower(p) {
	case "openai":
		return "oai"
	case "anthropic":
		return "ant"
	case "google":
		return "gmi"
	case "groq":
		return "grq"
	case "deepseek":
		return "dps"
	case "xai":
		return "xai"
	case "kimi":
		return "kmi"
	default:
		if len(p) > 4 {
			return p[:4]
		}
		return p
	}
}
