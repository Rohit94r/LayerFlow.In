package tui

import (
	"context"
	"fmt"
	"strings"
	"time"

	bkey "github.com/charmbracelet/bubbles/key"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"

	"github.com/layerflow/terminal/internal/auth"
	"github.com/layerflow/terminal/internal/cloud"
	"github.com/layerflow/terminal/internal/git"
	"github.com/layerflow/terminal/internal/search"
	"github.com/layerflow/terminal/internal/session"
)

// screen identifies the primary view.
type screen int

const (
	screenHome screen = iota
	screenChat
)

// overlay identifies an open modal on top of the current screen.
type overlay int

const (
	overlayNone overlay = iota
	overlayPalette
	overlaySearch
	overlaySessions
	overlayModels
	overlayActivity
	overlayHelp
	overlayLogin
)

// toastKind styles a transient notification.
type toastKind int

const (
	toastInfo toastKind = iota
	toastSuccess
	toastError
)

// toast is a transient notification.
type toast struct {
	text string
	kind toastKind
}

// ─── Messages ────────────────────────────────────────────────────────────────

type streamChunkMsg struct{ text string }

type streamDoneMsg struct {
	resp *cloud.ChatResponse
	err  error
}

type toastMsg struct {
	text string
	kind toastKind
}

type tickMsg struct{}

type modelsLoadedMsg struct {
	models []cloud.Model
	err    error
}

type sessionsLoadedMsg struct {
	sessions []session.Session
	err      error
}

type gitStatusMsg struct {
	status git.Status
}

type searchResultsMsg struct {
	query string
	hits  []search.Hit
	err   error
}

type loginResultMsg struct {
	err error
}

// ─── App ─────────────────────────────────────────────────────────────────────

// App is the root Bubble Tea model.
type App struct {
	st     *State
	keymap KeyMap
	prog   *tea.Program

	width  int
	height int

	screen  screen
	overlay overlay

	// Chat state
	session       *session.Session
	messages      []session.Message
	streamingText strings.Builder
	streaming     bool
	cancelled     bool
	loading       bool
	input         string

	// Toast state
	toasts []toast

	// Home input
	homeInput string

	// Overlay instances
	palette  *paletteModel
	search   *searchModel
	sessions *sessionsModel
	models   *modelsModel
	activity *activityModel
	login    *loginModel
	help     *helpModel

	// Streaming cancellation
	cancelFn func()

	// Streaming result scratch (read by the pump after channel closes)
	streamResp *cloud.ChatResponse
	streamErr  error
}

// NewApp creates the root app model.
func NewApp(st *State) *App {
	return &App{
		st:      st,
		keymap:  DefaultKeyMap(),
		screen:  screenHome,
		overlay: overlayNone,
	}
}

// Init implements tea.Model.
func (a *App) Init() tea.Cmd {
	return tea.Batch(
		a.tickCmd(),
		a.loadGitStatus(),
	)
}

// View implements tea.Model.
func (a *App) View() string {
	if a.width == 0 || a.height == 0 {
		return "Initializing…"
	}

	var body string
	switch a.screen {
	case screenHome:
		body = a.renderHome()
	case screenChat:
		body = a.renderChat()
	}

	// Overlays draw on top of the current screen.
	switch a.overlay {
	case overlayPalette:
		body = a.palette.View()
	case overlaySearch:
		body = a.search.View()
	case overlaySessions:
		body = a.sessions.View()
	case overlayModels:
		body = a.models.View()
	case overlayActivity:
		body = a.activity.View()
	case overlayHelp:
		body = a.help.View()
	case overlayLogin:
		body = a.login.View()
	}

	return lipgloss.JoinVertical(lipgloss.Left, body, a.renderToasts())
}

// Update implements tea.Model.
func (a *App) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		a.width = msg.Width
		a.height = msg.Height
		return a, nil

	case tickMsg:
		return a, a.tickCmd()

	case toastMsg:
		a.pushToast(msg.text, msg.kind)
		return a, nil

	case streamChunkMsg:
		a.streamingText.WriteString(msg.text)
		return a, nil

	case streamDoneMsg:
		return a.handleStreamDone(msg)

	case gitStatusMsg:
		a.st.Branch = msg.status.Branch
		return a, nil

	case loginResultMsg:
		return a.handleLoginResult(msg)
	case errorMsg:
		a.pushToast(fmt.Sprintf("Error: %v", msg.err), toastError)
		a.loading = false
		return a, nil
	}

	// Route to overlay first; overlays consume most keys.
	if a.overlay != overlayNone {
		return a.updateOverlay(msg)
	}

	// Global keys when no overlay is open.
	if key, ok := msg.(tea.KeyMsg); ok {
		if handled, cmd := a.handleGlobalKey(key); handled {
			return a, cmd
		}
	}

	switch a.screen {
	case screenHome:
		return a.updateHome(msg)
	case screenChat:
		return a.updateChat(msg)
	}

	return a, nil
}

// handleGlobalKey processes keys that work on every screen.
// Returns true if the key was consumed.
func (a *App) handleGlobalKey(key tea.KeyMsg) (bool, tea.Cmd) {
	switch {
	case bkey.Matches(key, a.keymap.Palette):
		a.openPalette()
		return true, nil
	case bkey.Matches(key, a.keymap.Search):
		a.openSearch()
		return true, nil
	case bkey.Matches(key, a.keymap.Sessions):
		a.openSessions()
		return true, nil
	case bkey.Matches(key, a.keymap.Models):
		a.openModels()
		return true, nil
	case bkey.Matches(key, a.keymap.Activity):
		a.openActivity()
		return true, nil
	case bkey.Matches(key, a.keymap.Help):
		a.openHelp()
		return true, nil
	case key.String() == "ctrl+c":
		if a.streaming {
			a.cancelStream()
			return true, nil
		}
		if a.overlay != overlayNone {
			a.closeOverlay()
			return true, nil
		}
		// Quit.
		return true, tea.Quit
	}
	return false, nil
}

func (a *App) cancelStream() {
	if a.cancelFn != nil {
		a.cancelFn()
		a.cancelFn = nil
	}
	a.streaming = false
	a.pushToast("Streaming cancelled", toastInfo)
}

func (a *App) cancel() {
	if a.cancelFn != nil {
		a.cancelFn()
		a.cancelFn = nil
	}
}

// ─── Toasts ──────────────────────────────────────────────────────────────────

func (a *App) tickCmd() tea.Cmd {
	return tea.Tick(200*time.Millisecond, func(time.Time) tea.Msg { return tickMsg{} })
}

func (a *App) pushToast(text string, kind toastKind) {
	a.toasts = append(a.toasts, toast{text: text, kind: kind})
	if len(a.toasts) > 5 {
		a.toasts = a.toasts[len(a.toasts)-5:]
	}
}

func (a *App) renderToasts() string {
	if len(a.toasts) == 0 {
		return ""
	}
	var lines []string
	for _, t := range a.toasts {
		var s lipgloss.Style
		switch t.kind {
		case toastSuccess:
			s = styleToastSuccess
		case toastError:
			s = styleToastError
		default:
			s = styleToastInfo
		}
		lines = append(lines, s.Render(t.text))
	}
	return lipgloss.NewStyle().Margin(0, 1).Render(strings.Join(lines, "\n"))
}

// ─── Async helpers ───────────────────────────────────────────────────────────

func (a *App) loadGitStatus() tea.Cmd {
	return func() tea.Msg {
		st, err := a.st.Git.Status(context.Background())
		if err != nil {
			return errorMsg{err: err}
		}
		return gitStatusMsg{status: st}
	}
}

func (a *App) loadModels() tea.Cmd {
	return func() tea.Msg {
		models, err := a.st.Client.ListModels(context.Background())
		return modelsLoadedMsg{models: models, err: err}
	}
}

func (a *App) loadSessions() tea.Cmd {
	return func() tea.Msg {
		sessions, err := a.st.Sessions.List(context.Background(), a.st.Project, 100)
		return sessionsLoadedMsg{sessions: sessions, err: err}
	}
}

// errorMsg carries an error from an async operation.
type errorMsg struct{ err error }

// handleLoginResult processes the async login outcome.
func (a *App) handleLoginResult(msg loginResultMsg) (tea.Model, tea.Cmd) {
	a.login = nil
	a.overlay = overlayNone
	if msg.err != nil {
		a.pushToast(msg.err.Error(), toastError)
		return a, nil
	}
	a.st.Authenticated = true
	a.pushToast("Authenticated. Welcome back!", toastSuccess)
	return a, nil
}

// closeOverlay closes the current overlay.
func (a *App) closeOverlay() {
	a.overlay = overlayNone
	a.palette = nil
	a.search = nil
	a.sessions = nil
	a.models = nil
	a.activity = nil
	a.help = nil
	a.login = nil
}

// performTuiLogin validates a platform key and stores it in the keyring.
func performTuiLogin(key string) error {
	key = strings.TrimSpace(key)
	if key == "" {
		return fmt.Errorf("empty key")
	}
	client := cloud.NewClient(cloud.DefaultBaseURL, key)
	if err := client.Validate(context.Background()); err != nil {
		if err == cloud.ErrInvalidKey {
			return fmt.Errorf("that platform key was rejected")
		}
		return fmt.Errorf("could not reach LayerFlow: %w", err)
	}
	if err := auth.SetAPIKey(key); err != nil {
		return fmt.Errorf("store key: %w", err)
	}
	return nil
}

// Run launches the full-screen TUI. It returns when the program exits.
func Run(version string) error {
	st, err := NewState(version)
	if err != nil {
		return fmt.Errorf("init tui state: %w", err)
	}
	defer st.Close()

	app := NewApp(st)
	prog := tea.NewProgram(app, tea.WithAltScreen(), tea.WithMouseCellMotion())
	app.prog = prog
	_, err = prog.Run()
	return err
}
