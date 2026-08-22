package tui

import (
	"context"
	"fmt"
	"strings"

	"github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"

	"github.com/layerflow/terminal/internal/git"
	"github.com/layerflow/terminal/internal/sync"
)

// activityModel is the Ctrl+T activity drawer: git, sync, tokens, and cost.
type activityModel struct {
	app      *App
	git      git.Status
	gotGit   bool
	notRepo  bool
	pending  int
	syncedAt string
	loading  bool
}

// openActivity shows the activity drawer.
func (a *App) openActivity() {
	act := &activityModel{app: a, loading: true}
	a.activity = act
	a.overlay = overlayActivity
}

// refresh re-fetches git and sync state, returning a batched command so the
// Bubble Tea runtime actually dispatches the async results back into Update.
func (act *activityModel) refresh() tea.Cmd {
	act.loading = true
	return tea.Batch(act.refreshGit(), act.refreshSync())
}

// activityGitMsg carries the git status result for the activity drawer. It
// is distinct from gitStatusMsg so the drawer never clobbers the main App's
// git state (which is shared with the home screen).
type activityGitMsg struct {
	status  git.Status
	repo    bool
	notRepo bool
}

// refreshGit fetches git status. Being outside a repository is normal and
// must surface as "not a git repository", never as a red error.
func (act *activityModel) refreshGit() tea.Cmd {
	return func() tea.Msg {
		st, err := act.app.st.Git.Status(context.Background())
		if err != nil {
			return activityGitMsg{notRepo: true}
		}
		return activityGitMsg{status: st, repo: true}
	}
}

// refreshSync fetches the cloud sync watermark and device id.
func (act *activityModel) refreshSync() tea.Cmd {
	return func() tea.Msg {
		wm, err := sync.GetWatermark(context.Background(), act.app.st.DB)
		if err != nil {
			return activitySyncMsg{err: err}
		}
		dev, _ := sync.GetDeviceID(context.Background(), act.app.st.DB)
		return activitySyncMsg{watermark: wm, device: dev}
	}
}

// activitySyncMsg carries sync info for the activity panel.
type activitySyncMsg struct {
	watermark int64
	device    string
	err       error
}

// drawerWidth is the fixed width of the activity panel.
const drawerWidth = 44

// View renders the activity drawer as a right-anchored panel.
func (act *activityModel) View() string {
	var body []string
	body = append(body, lipgloss.JoinHorizontal(lipgloss.Left,
		styleTitle.Render("Activity"),
		"  ",
		styleDim.Render("r refresh · esc close"),
	))

	// ── Repository ──
	body = append(body, "", styleDim.Render("REPOSITORY"))
	if act.gotGit {
		branch := act.git.Branch
		if branch == "" {
			branch = "(detached)"
		}
		body = append(body, act.drawerRow("branch", branch))
		body = append(body, act.drawerRow("ahead/behind", fmt.Sprintf("%d / %d", act.git.Ahead, act.git.Behind)))
		if len(act.git.Changed) > 0 {
			body = append(body, act.drawerRow("modified", fmt.Sprintf("%d file(s)", len(act.git.Changed))))
			for _, f := range act.git.Changed {
				body = append(body, lipgloss.NewStyle().Foreground(ColorDim).Render("    "+shorten(f, drawerWidth-10)))
			}
		} else {
			body = append(body, act.drawerRow("status", "clean working tree"))
		}
	} else if act.notRepo {
		body = append(body, act.drawerRow("status", "not a git repository"))
	} else {
		body = append(body, styleMuted.Render("  loading…"))
	}

	// ── This session ──
	body = append(body, "", styleDim.Render("SESSION"))
	inTok, outTok := 0, 0
	var cost float64
	if act.app.session != nil {
		inTok = act.app.session.InputTokens
		outTok = act.app.session.OutputTokens
		cost = float64(act.app.session.CostMicro) / 1_000_000
	}
	body = append(body, act.drawerRow("model", act.app.st.Model))
	body = append(body, act.drawerRow("tokens", fmt.Sprintf("%d in / %d out", inTok, outTok)))
	body = append(body, act.drawerRow("est. cost", fmt.Sprintf("$%.4f", cost)))

	if act.app.streaming {
		body = append(body, act.drawerRow("task", "streaming reply…"))
	}

	// ── Recent commands ──
	if n := len(inputHistory); n > 0 {
		body = append(body, "", styleDim.Render("RECENT COMMANDS"))
		start := n - 4
		if start < 0 {
			start = 0
		}
		for _, c := range inputHistory[start:] {
			body = append(body, lipgloss.NewStyle().Foreground(ColorDim).Render("  "+shorten(strings.TrimSpace(c), drawerWidth-6)))
		}
	}

	// ── Sync ──
	body = append(body, "", styleDim.Render("SYNC"))
	if act.syncedAt != "" {
		body = append(body, act.drawerRow("watermark", act.syncedAt))
	}
	if act.app.st.Authenticated {
		body = append(body, act.drawerRow("cloud", "● authenticated"))
	} else {
		body = append(body, act.drawerRow("cloud", "sign in with /login"))
	}
	body = append(body, act.drawerRow("device", shorten(act.app.st.Project, drawerWidth-10)))

	inner := lipgloss.JoinVertical(lipgloss.Left, body...)
	panel := lipgloss.NewStyle().
		Background(ColorPanel2).
		Border(roundBorder).
		BorderForeground(ColorBorderHi).
		Padding(1, 2).
		Width(drawerWidth).
		Height(act.app.height).
		Render(inner)

	// Anchor the drawer to the right edge.
	return lipgloss.NewStyle().Padding(0, 2).Render(panel)
}

// drawerRow renders a key/value row aligned for the drawer. Values are
// truncated so a single row never wraps inside the panel.
func (act *activityModel) drawerRow(key, value string) string {
	contentW := drawerWidth - 2 - 4 // border + padding
	keyW := 14
	maxValue := contentW - keyW - 1
	value = shorten(value, maxValue)
	return lipgloss.JoinHorizontal(lipgloss.Left,
		lipgloss.NewStyle().Width(keyW).Foreground(ColorMuted).Render(key),
		lipgloss.NewStyle().Foreground(ColorText).Render(value),
	)
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
			return act.app, act.refresh()
		}
	case activityGitMsg:
		act.git = msg.status
		act.gotGit = msg.repo
		act.notRepo = msg.notRepo
		act.loading = false
		return act.app, nil
	case gitStatusMsg:
		act.git = msg.status
		act.gotGit = msg.repo
		act.notRepo = !msg.repo
		act.loading = false
		return act.app, nil
	case activitySyncMsg:
		if msg.err == nil {
			if msg.watermark > 0 {
				act.syncedAt = fmt.Sprintf("%d", msg.watermark)
			} else {
				act.syncedAt = "never"
			}
		}
		act.loading = false
		return act.app, nil
	case errorMsg:
		act.loading = false
		return act.app, nil
	}
	return act.app, nil
}
