package ui

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	tea "github.com/charmbracelet/bubbletea"
	zone "github.com/lrstanley/bubblezone"

	"github.com/layerflow/terminal/internal/tui" // reused to initialise LF storage + config
	"github.com/layerflow/terminal/internal/ui/app"
	"github.com/layerflow/terminal/internal/ui/backend"
	"github.com/layerflow/terminal/internal/ui/logging"
	"github.com/layerflow/terminal/internal/ui/pubsub"
	"github.com/layerflow/terminal/internal/ui/theme"
	"github.com/layerflow/terminal/internal/ui/version"
)

// Run is the entry point called by cmd/lf. It initialises the LayerFlow
// backend (SQLite sessions, cloud client, config) and then launches the
// ported opencode UI on top.
func Run(version_ string) error {
	version.Version = version_
	// Reuse the existing LF bootstrap — opens storage, loads config,
	// creates cloud client, detects git state, etc.
	lfState, err := tui.NewState(version_)
	if err != nil {
		return fmt.Errorf("init layerflow state: %w", err)
	}
	defer lfState.Close()

	// Map into the backend's adapter state
	b := &backend.State{
		Client:   lfState.Client,
		Sessions: lfState.Sessions,
		Project:  lfState.Project,
		Model:    lfState.Model,
		Router:   &backend.Router{},
	}
	b.Router.SetOverride("model", lfState.Model)

	// Theme persistence — write selected theme name to a tiny file in the
	// LF config directory so it survives restarts.
	themeDir := ""
	if home, err := os.UserHomeDir(); err == nil {
		themeDir = filepath.Join(home, ".config", "layerflow")
		_ = os.MkdirAll(themeDir, 0o755)
	}
	theme.SetPersistenceCallback(func(name string) error {
		if themeDir == "" {
			return nil
		}
		return os.WriteFile(filepath.Join(themeDir, "ui-theme"), []byte(name), 0o644)
	})

	// Load persisted theme name (if any); otherwise default to the LayerFlow
	// brand theme.
	themeApplied := false
	if themeDir != "" {
		if data, err := os.ReadFile(filepath.Join(themeDir, "ui-theme")); err == nil {
			if err := theme.SetTheme(strings.TrimSpace(string(data))); err == nil {
				themeApplied = true
			}
		}
	}
	if !themeApplied {
		if err := theme.SetTheme("layerflow"); err != nil {
			_ = theme.SetTheme("opencode") // always registered — last resort
		}
	}

	a := backend.NewApp(b)

	zone.NewGlobal()
	program := tea.NewProgram(
		New(a),
		tea.WithAltScreen(),
	)

	// Forward broker events to the program (same pattern as opencode)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	ch, cancelSubs := setupSubscriptions(a, ctx)

	var tuiWg sync.WaitGroup
	tuiWg.Add(1)
	go func() {
		defer tuiWg.Done()
		for {
			select {
			case <-ctx.Done():
				return
			case msg, ok := <-ch:
				if !ok {
					return
				}
				program.Send(msg)
			}
		}
	}()

	_, err = program.Run()
	cancelSubs()
	cancel()
	tuiWg.Wait()
	if err != nil {
		return fmt.Errorf("tui error: %w", err)
	}
	return nil
}

// ── event forwarding (mirrors opencode's setupSubscriptions) ──────────────────

func setupSubscriptions(a *app.App, ctx context.Context) (chan tea.Msg, func()) {
	ch := make(chan tea.Msg, 100)
	wg := sync.WaitGroup{}
	subCtx, cancel := context.WithCancel(ctx)

	setupSubscriber(subCtx, &wg, "logging", logging.Subscribe, ch)
	setupSubscriber(subCtx, &wg, "sessions", a.Sessions.Subscribe, ch)
	setupSubscriber(subCtx, &wg, "messages", a.Messages.Subscribe, ch)
	setupSubscriber(subCtx, &wg, "permissions", a.Permissions.Subscribe, ch)
	setupSubscriber(subCtx, &wg, "coderAgent", a.CoderAgent.Subscribe, ch)

	cleanup := func() {
		cancel()
		waitCh := make(chan struct{})
		go func() {
			wg.Wait()
			close(waitCh)
		}()
		select {
		case <-waitCh:
			close(ch)
		case <-time.After(5 * time.Second):
			close(ch)
		}
	}
	return ch, cleanup
}

func setupSubscriber[T any](
	ctx context.Context,
	wg *sync.WaitGroup,
	name string,
	subscribe func(context.Context) <-chan pubsub.Event[T],
	outputCh chan<- tea.Msg,
) {
	wg.Add(1)
	go func() {
		defer wg.Done()
		subCh := subscribe(ctx)
		for {
			select {
			case ev, ok := <-subCh:
				if !ok {
					return
				}
				select {
				case outputCh <- ev:
				case <-time.After(2 * time.Second):
				case <-ctx.Done():
					return
				}
			case <-ctx.Done():
				return
			}
		}
	}()
}
