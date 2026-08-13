// Package app provides dependency injection and application composition.
package app

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"path/filepath"
	"runtime"
	"syscall"

	"github.com/google/uuid"
	"github.com/layerflow/terminal/internal/auth"
	"github.com/layerflow/terminal/internal/cloud"
	"github.com/layerflow/terminal/internal/config"
	"github.com/layerflow/terminal/internal/log"
	"github.com/layerflow/terminal/internal/mcp"
	"github.com/layerflow/terminal/internal/memory"
	"github.com/layerflow/terminal/internal/permission"
	"github.com/layerflow/terminal/internal/providers"
	"github.com/layerflow/terminal/internal/search"
	"github.com/layerflow/terminal/internal/session"
	"github.com/layerflow/terminal/internal/storage"
	"github.com/layerflow/terminal/internal/sync"
)

// App is the main application container.
type App struct {
	Config     *config.Config
	DB         *sql.DB
	Logger     *slog.Logger
	Auth       *auth.Auth
	Providers  *providers.Registry
	Router     providers.Router
	Sessions   session.Store
	Messages   session.MessageStore
	Memory     memory.Store
	Search     search.Index
	Permission permission.Engine
	Sync       *sync.Syncer
	MCP        mcp.Client
}

// New creates and initializes the application.
func New(projectDir string) (*App, error) {
	a := &App{}

	// Load config
	cfg, err := config.Load(projectDir)
	if err != nil {
		return nil, fmt.Errorf("load config: %w", err)
	}
	a.Config = cfg

	// Initialize storage. Open resolves the data dir, opens SQLite and
	// runs the embedded migrations.
	dataDir, err := defaultDataDir()
	if err != nil {
		return nil, fmt.Errorf("get storage path: %w", err)
	}

	db, err := storage.Open(&storage.Options{DataDir: dataDir})
	if err != nil {
		return nil, fmt.Errorf("open database: %w", err)
	}
	a.DB = db

	// Initialize logger
	if err := log.Init(nil); err != nil {
		db.Close()
		return nil, fmt.Errorf("create logger: %w", err)
	}
	a.Logger = log.Logger()

	// Initialize auth
	a.Auth = auth.New()

	// Initialize providers
	a.Providers = providers.NewRegistry()
	a.Router = providers.NewHeuristicRouter()

	// Initialize stores
	sess := session.NewSQLStore(db)
	a.Sessions = sess
	a.Messages = sess
	a.Memory = memory.NewSQLStore(db)

	// Initialize search
	a.Search = search.NewHybridIndex(db)

	// Initialize permission engine. NewSQLiteEngine opens its own
	// connection to the same lf.db file used above.
	perm, err := permission.NewSQLiteEngine(filepath.Join(dataDir, "lf.db"), a.Logger)
	if err != nil {
		db.Close()
		return nil, fmt.Errorf("create permission engine: %w", err)
	}
	a.Permission = perm

	// Initialize sync. Uses the durable SQLite journal; the client is
	// Bearer-authenticated whenever a workspace API key is available.
	var syncClient sync.Client
	deviceID, err := sync.GetDeviceID(context.Background(), db)
	if err != nil {
		deviceID = uuid.New().String()
	}
	journal := sync.NewSQLJournal(db)
	if key, keyErr := cloud.ResolveAPIKey(cfg); keyErr == nil && key != "" {
		syncClient = sync.NewHTTPClientWithKey(cloud.ResolveBaseURL(cfg), key)
	}
	a.Sync = sync.NewSyncer(syncClient, journal, sync.DefaultMerger{}, deviceID)

	// Initialize MCP registry
	a.MCP = mcp.NewRegistry()

	return a, nil
}

// defaultDataDir returns the default LayerFlow data directory, mirroring
// internal/storage so paths can be shared (e.g. for the permission engine).
func defaultDataDir() (string, error) {
	if runtime.GOOS == "windows" {
		appData := os.Getenv("LOCALAPPDATA")
		if appData == "" {
			return "", fmt.Errorf("LOCALAPPDATA not set")
		}
		return filepath.Join(appData, "layerflow"), nil
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(home, ".local", "share", "layerflow"), nil
}

// Close cleans up resources.
func (a *App) Close() error {
	if a.DB != nil {
		return a.DB.Close()
	}
	return nil
}

// RunWithSignal runs a function with signal handling.
func (a *App) RunWithSignal(ctx context.Context, fn func(ctx context.Context) error) error {
	ctx, cancel := signal.NotifyContext(ctx, syscall.SIGINT, syscall.SIGTERM)
	defer cancel()

	return fn(ctx)
}
