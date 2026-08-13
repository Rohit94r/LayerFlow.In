// Package log provides a structured JSON logger with rotating file output
// and optional TTY pretty-printing for LayerFlow.
package log

import (
	"fmt"
	"io"
	"log/slog"
	"os"
	"path/filepath"
	"runtime"
	"sync"
	"time"
)

// Level aliases for slog levels.
const (
	LevelError = slog.LevelError
	LevelWarn  = slog.LevelWarn
	LevelInfo  = slog.LevelInfo
	LevelDebug = slog.LevelDebug
)

// Default rotation settings.
const (
	defaultMaxSizeMB  = 50
	defaultMaxBackups = 5
)

var (
	globalLogger *slog.Logger
	globalFile   *os.File
	globalMu     sync.Once
)

// Options configures the logger.
type Options struct {
	// Level is the minimum log level (default: info).
	Level slog.Level
	// Dir overrides the log directory (~/.local/share/layerflow/logs/).
	Dir string
	// MaxSizeMB is the maximum size of a single log file before rotation.
	MaxSizeMB int
	// MaxBackups is the maximum number of rotated log files to keep.
	MaxBackups int
	// Pretty forces pretty output even when not connected to a TTY.
	Pretty bool
	// AddSource adds source file and line to log entries.
	AddSource bool
}

// Init initialises the global structured logger. Safe to call multiple times.
func Init(opts *Options) error {
	var initErr error
	globalMu.Do(func() {
		initErr = initLogger(opts)
	})
	return initErr
}

func initLogger(opts *Options) error {
	if opts == nil {
		opts = &Options{}
	}
	if opts.Level == 0 {
		opts.Level = LevelInfo
	}
	if opts.MaxSizeMB <= 0 {
		opts.MaxSizeMB = defaultMaxSizeMB
	}
	if opts.MaxBackups <= 0 {
		opts.MaxBackups = defaultMaxBackups
	}

	logDir, err := resolveLogDir(opts.Dir)
	if err != nil {
		return fmt.Errorf("resolve log dir: %w", err)
	}
	if err := os.MkdirAll(logDir, 0o700); err != nil {
		return fmt.Errorf("create log dir %s: %w", logDir, err)
	}

	logPath := filepath.Join(logDir, "lf.log")

	writers := []io.Writer{}

	// Rotating file writer.
	fw, err := newRotatingWriter(logPath, opts.MaxSizeMB, opts.MaxBackups)
	if err != nil {
		return fmt.Errorf("open rotating writer: %w", err)
	}
	writers = append(writers, fw)
	globalFile = fw.currentFile()

	// Pretty output to stderr when in TTY or when forced.
	if opts.Pretty || isTerminal() {
		writers = append(writers, &prettyWriter{dst: os.Stderr})
	}

	mw := io.MultiWriter(writers...)

	handlerOpts := &slog.HandlerOptions{
		Level:     opts.Level,
		AddSource: opts.AddSource,
	}

	globalLogger = slog.New(slog.NewJSONHandler(mw, handlerOpts))
	slog.SetDefault(globalLogger)

	return nil
}

// Logger returns the global structured logger.
func Logger() *slog.Logger {
	if globalLogger == nil {
		// Fallback before Init is called.
		globalLogger = slog.New(slog.NewJSONHandler(os.Stderr, &slog.HandlerOptions{
			Level: LevelInfo,
		}))
	}
	return globalLogger
}

// Close flushes and closes the log file.
func Close() error {
	if globalFile != nil {
		return globalFile.Close()
	}
	return nil
}

// ─────────────────────────────────────────────────────────────────────────────
// Rotating file writer
// ─────────────────────────────────────────────────────────────────────────────

type rotatingWriter struct {
	mu         sync.Mutex
	path       string
	file       *os.File
	size       int64
	maxSizeMB  int
	maxBackups int
}

func newRotatingWriter(path string, maxSizeMB, maxBackups int) (*rotatingWriter, error) {
	f, err := os.OpenFile(path, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0o600)
	if err != nil {
		return nil, err
	}
	info, _ := f.Stat()
	var size int64
	if info != nil {
		size = info.Size()
	}
	return &rotatingWriter{
		path:       path,
		file:       f,
		size:       size,
		maxSizeMB:  maxSizeMB,
		maxBackups: maxBackups,
	}, nil
}

func (w *rotatingWriter) Write(p []byte) (int, error) {
	w.mu.Lock()
	defer w.mu.Unlock()

	if w.size+int64(len(p)) > int64(w.maxSizeMB)*1024*1024 {
		if err := w.rotate(); err != nil {
			return 0, fmt.Errorf("rotate: %w", err)
		}
	}

	n, err := w.file.Write(p)
	w.size += int64(n)
	return n, err
}

func (w *rotatingWriter) rotate() error {
	w.file.Close()

	ts := time.Now().Format("20060102-150405")
	backup := fmt.Sprintf("%s.%s", w.path, ts)
	if err := os.Rename(w.path, backup); err != nil && !os.IsNotExist(err) {
		return err
	}

	f, err := os.OpenFile(w.path, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0o600)
	if err != nil {
		return err
	}
	w.file = f
	w.size = 0

	w.prune()
	return nil
}

func (w *rotatingWriter) prune() {
	entries, err := filepath.Glob(w.path + ".*")
	if err != nil {
		return
	}
	if len(entries) <= w.maxBackups {
		return
	}
	// Remove oldest files.
	for i := 0; i < len(entries)-w.maxBackups; i++ {
		os.Remove(entries[i])
	}
}

func (w *rotatingWriter) currentFile() *os.File {
	return w.file
}

// ─────────────────────────────────────────────────────────────────────────────
// Pretty writer (TTY)
// ─────────────────────────────────────────────────────────────────────────────

type prettyWriter struct {
	dst io.Writer
}

func (pw *prettyWriter) Write(p []byte) (int, error) {
	line := formatPretty(p)
	return pw.dst.Write([]byte(line))
}

func formatPretty(p []byte) string {
	ts := time.Now().Format("15:04:05.000")
	return fmt.Sprintf("%s %s\n", ts, string(p))
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

func resolveLogDir(dir string) (string, error) {
	if dir != "" {
		return dir, nil
	}
	switch runtime.GOOS {
	case "windows":
		appData := os.Getenv("LOCALAPPDATA")
		if appData == "" {
			return "", fmt.Errorf("LOCALAPPDATA not set")
		}
		return filepath.Join(appData, "layerflow", "logs"), nil
	default:
		home, err := os.UserHomeDir()
		if err != nil {
			return "", err
		}
		return filepath.Join(home, ".local", "share", "layerflow", "logs"), nil
	}
}

func isTerminal() bool {
	fi, err := os.Stderr.Stat()
	if err != nil {
		return false
	}
	return fi.Mode()&os.ModeCharDevice != 0
}
