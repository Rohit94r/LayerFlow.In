// Package storage provides SQLite-backed persistent storage for LayerFlow.
package storage

import (
	"database/sql"
	"fmt"
	"io/fs"
	"log/slog"
	"os"
	"path/filepath"
	"runtime"
	"sort"
	"strings"
	"sync"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/sqlite"
	"github.com/golang-migrate/migrate/v4/source/iofs"
	_ "modernc.org/sqlite"
)

var (
	globalMu sync.RWMutex
	globalDB *sql.DB
)

// Options configures the storage layer.
type Options struct {
	// DataDir overrides the default data directory.
	DataDir string
	// ReadOnly opens the database in read-only mode.
	ReadOnly bool
	// SQLCipherKey is reserved for future encryption support.
	SQLCipherKey string
}

// Open initializes the SQLite database and runs pending migrations.
// The database file is stored at ~/.local/share/layerflow/lf.db (or
// %LOCALAPPDATA%\layerflow\lf.db on Windows) unless opts.DataDir is set.
func Open(opts *Options) (*sql.DB, error) {
	globalMu.Lock()
	defer globalMu.Unlock()

	if globalDB != nil {
		return globalDB, nil
	}

	dataDir, err := resolveDataDir(opts)
	if err != nil {
		return nil, fmt.Errorf("resolve data dir: %w", err)
	}

	if err := os.MkdirAll(dataDir, 0o700); err != nil {
		return nil, fmt.Errorf("create data dir %s: %w", dataDir, err)
	}

	dbPath := filepath.Join(dataDir, "lf.db")

	dsn := dbPath
	if opts != nil && opts.ReadOnly {
		dsn = "file:" + dbPath + "?mode=ro"
	}

	// TODO: integrate SQLCipher key via DSN parameter when encryption is ready.
	if opts != nil && opts.SQLCipherKey != "" {
		slog.Warn("SQLCipher encryption not yet enabled — storing key placeholder")
	}

	// modernc.org/sqlite is a pure-Go driver (no cgo), so the release binaries
	// can be cross-compiled statically for macOS/Linux/Windows.
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, fmt.Errorf("open database: %w", err)
	}

	if err := configurePragmas(db); err != nil {
		db.Close()
		return nil, fmt.Errorf("configure pragmas: %w", err)
	}

	if err := runMigrations(db); err != nil {
		db.Close()
		return nil, fmt.Errorf("run migrations: %w", err)
	}

	globalDB = db
	slog.Info("storage opened", "path", dbPath)
	return db, nil
}

// Close releases the global database connection.
func Close() error {
	globalMu.Lock()
	defer globalMu.Unlock()

	if globalDB == nil {
		return nil
	}

	err := globalDB.Close()
	globalDB = nil
	return err
}

// DB returns the global database handle. Panics if Open has not been called.
func DB() *sql.DB {
	globalMu.RLock()
	defer globalMu.RUnlock()

	if globalDB == nil {
		panic("storage: DB() called before Open()")
	}
	return globalDB
}

// ─── internals ───────────────────────────────────────────────────────────────

func configurePragmas(db *sql.DB) error {
	pragmas := []string{
		"PRAGMA foreign_keys = ON",
		"PRAGMA journal_mode = WAL",
		"PRAGMA busy_timeout = 5000",
		"PRAGMA synchronous = NORMAL",
		"PRAGMA temp_store = MEMORY",
		"PRAGMA mmap_size = 268435456",
		"PRAGMA cache_size = -4096",
	}
	for _, p := range pragmas {
		if _, err := db.Exec(p); err != nil {
			return fmt.Errorf("%s: %w", p, err)
		}
	}
	return nil
}

func runMigrations(db *sql.DB) error {
	src, err := iofs.New(migrationsFS, "migrations")
	if err != nil {
		return fmt.Errorf("create migration source: %w", err)
	}

	driver, err := sqlite.WithInstance(db, &sqlite.Config{})
	if err != nil {
		return fmt.Errorf("create sqlite driver: %w", err)
	}

	m, err := migrate.NewWithInstance("iofs", src, "sqlite", driver)
	if err != nil {
		return fmt.Errorf("create migrator: %w", err)
	}

	// Note: we deliberately do NOT call m.Close() here. The migrate sqlite
	// database driver's Close() closes the underlying *sql.DB connection pool
	// that we own, which would invalidate the database handle returned by
	// storage.Open.

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		return fmt.Errorf("migrate up: %w", err)
	}

	slog.Info("migrations applied")
	return nil
}

func resolveDataDir(opts *Options) (string, error) {
	if opts != nil && opts.DataDir != "" {
		return opts.DataDir, nil
	}

	switch runtime.GOOS {
	case "windows":
		appData := os.Getenv("LOCALAPPDATA")
		if appData == "" {
			return "", fmt.Errorf("LOCALAPPDATA not set")
		}
		return filepath.Join(appData, "layerflow"), nil
	default:
		home, err := os.UserHomeDir()
		if err != nil {
			return "", fmt.Errorf("get home dir: %w", err)
		}
		return filepath.Join(home, ".local", "share", "layerflow"), nil
	}
}

// ListMigrationFiles returns sorted migration file names embedded in migrationsFS.
func ListMigrationFiles() ([]string, error) {
	entries, err := fs.ReadDir(migrationsFS, "migrations")
	if err != nil {
		return nil, err
	}
	var names []string
	for _, e := range entries {
		if !e.IsDir() && strings.HasSuffix(e.Name(), ".sql") {
			names = append(names, e.Name())
		}
	}
	sort.Strings(names)
	return names, nil
}
