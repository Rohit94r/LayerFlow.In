package tui

import (
	"context"
	"fmt"

	"github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"

	"github.com/layerflow/terminal/internal/git"
	"github.com/layerflow/terminal/internal/sync"
)

// activityModel is the Ctrl+T activity overlay: git, sync, and workspace health.
type activityModel struct {
	app      *App
	git      git.Status
	gotGit   bool
	pending  int
	syncedAt string
	loading  bool
}

// openActivity shows the activity overlay.
func (a *App) openActivity() {
	act := &activityModel{app: a, loading: true}
	a.activity = act
	a.overlay = overlayActivity
	act.refresh()
}

func (act *activityModel) refresh() {
	act.loading = true
	act.refreshGit()
	act.refreshSync()
}

func (act *activityModel) refreshGit() tea.Cmd {
	return func() tea.Msg {
		st, err := act.app.st.Git.Status(context.Background())
		if err != nil {
			return errorMsg{err: err}
		}
		return gitStatusMsg{status: st}
	}
}

func (act *activityModel) refreshSync() tea.Cmd {
	return func() tea.Msg {
		wm, err := sync.GetWatermark(context.Background(), act.app.st.DB)
		if err != nil {
			return errorMsg{err: err}
		}
		dev, _ := sync.GetDeviceID(context.Background(), act.app.st.DB)
		return activitySyncMsg{watermark: wm, device: dev}
	}
}

// activitySyncMsg carries sync info for the activity panel.
type activitySyncMsg struct {
	watermark int64
	device    string
}

// View renders the activity panel.
func (act *activityModel) View() string {
	var body []string
	body = append(body, styleHeader.Render("Activity"))
	body = append(body, "")

	// Git section
	body = append(body, styleDim.Render("GIT"))
	if act.gotGit {
		branch := act.git.Branch
		if branch == "" {
			branch = "(detached)"
		}
		body = append(body, fmt.Sprintf("  branch   %s", branch))
		body = append(body, fmt.Sprintf("  ahead    %d", act.git.Ahead))
		body = append(body, fmt.Sprintf("  behind   %d", act.git.Behind))
		if len(act.git.Changed) > 0 {
			body = append(body, fmt.Sprintf("  changed  %d file(s)", len(act.git.Changed)))
			for _, f := range act.git.Changed {
				body = append(body, lipgloss.NewStyle().Foreground(ColorDim).Render("    "+f))
			}
		} else {
			body = append(body, styleMuted.Render("  clean working tree"))
		}
	} else {
		body = append(body, styleMuted.Render("  loading…"))
	}

	body = append(body, "")
	body = append(body, styleDim.Render("SYNC"))
	if act.syncedAt != "" {
		body = append(body, fmt.Sprintf("  watermark %s", act.syncedAt))
	}
	dev := act.app.st.ApiKey
	if dev != "" {
		body = append(body, styleMuted.Render("  cloud: authenticated"))
	} else {
		body = append(body, styleMuted.Render("  cloud: not signed in — run lf login"))
	}

	body = append(body, "")
	body = append(body, styleFooter.Render("  r refresh · esc close"))

	content := lipgloss.JoinVertical(lipgloss.Left, body...)
	box := styleCard.Render(content)

	top := (act.app.height - lipgloss.Height(box)) / 2
	if top < 0 {
		top = 0
	}
	return lipgloss.NewStyle().MarginTop(top).Render(box)
}

// Update handles messages for the activity panel.
func (act *activityModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch msg.String() {
		case "esc", "ctrl+t":
			act.app.closeOverlay()
			return act.app, nil
		case "r":
			act.refresh()
			return act.app, nil
		}
	case gitStatusMsg:
		act.git = msg.status
		act.gotGit = true
		act.loading = false
		return act.app, nil
	case activitySyncMsg:
		if msg.watermark > 0 {
			act.syncedAt = fmt.Sprintf("%d", msg.watermark)
		} else {
			act.syncedAt = "never"
		}
		act.loading = false
		return act.app, nil
	case errorMsg:
		act.loading = false
		return act.app, nil
	}
	return act.app, nil
}
