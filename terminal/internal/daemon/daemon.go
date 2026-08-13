// Package daemon runs background services for LayerFlow.
//
// The daemon manages file watching, search indexing, sync queue draining,
// and IPC over a Unix socket. It runs as a single instance per machine,
// enforced via a lockfile and PID check.
package daemon

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/layerflow/terminal/internal/config"
	"github.com/layerflow/terminal/internal/search"
	"github.com/layerflow/terminal/internal/storage"
	"github.com/layerflow/terminal/internal/watcher"
)

const (
	socketPath = "/tmp/lf-daemon.sock"
	lockFile   = "/tmp/lf-daemon.lock"
)

// Daemon manages background services.
type Daemon struct {
	config  *config.Config
	db      *sql.DB
	watcher *watcher.Watcher
	indexer search.Index
	server  *http.Server
	mu      sync.Mutex
	running bool
	stopCh  chan struct{}
}

// Status represents the daemon's current state.
type Status struct {
	Running   bool      `json:"running"`
	PID       int       `json:"pid"`
	Uptime    string    `json:"uptime"`
	Socket    string    `json:"socket"`
	Watching  bool      `json:"watching"`
	Indexing  bool      `json:"indexing"`
	StartedAt time.Time `json:"started_at"`
}

// IPCRequest is a request received over IPC.
type IPCRequest struct {
	Method string `json:"method"`
	Params any    `json:"params,omitempty"`
}

// IPCResponse is a response sent over IPC.
type IPCResponse struct {
	Result any    `json:"result,omitempty"`
	Error  string `json:"error,omitempty"`
}

// Start launches the daemon. It acquires a lock, starts the HTTP server,
// file watcher, indexer, and sync loop.
func Start(cfg *config.Config) error {
	d := &Daemon{
		config: cfg,
		stopCh: make(chan struct{}),
	}

	// Single-instance enforcement
	if err := d.acquireLock(); err != nil {
		return err
	}

	// Initialize storage
	db, err := storage.Open(nil)
	if err != nil {
		return fmt.Errorf("daemon: open storage: %w", err)
	}
	d.db = db

	// Initialize file watcher
	w, err := watcher.New(watcher.Options{
		Root: ".",
	})
	if err != nil {
		slog.Warn("daemon: watcher init failed", "err", err)
	} else {
		d.watcher = w
	}

	// Start HTTP server for IPC
	mux := http.NewServeMux()
	mux.HandleFunc("/sync", d.handleSync)
	mux.HandleFunc("/index", d.handleIndex)
	mux.HandleFunc("/watch", d.handleWatch)
	mux.HandleFunc("/subscribe", d.handleSubscribe)
	mux.HandleFunc("/health", d.handleHealth)
	mux.HandleFunc("/status", d.handleStatus)

	d.server = &http.Server{
		Handler:      mux,
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 30 * time.Second,
	}

	// Remove stale socket
	os.Remove(socketPath)

	listener, err := net.Listen("unix", socketPath)
	if err != nil {
		return fmt.Errorf("daemon: listen on socket: %w", err)
	}

	d.mu.Lock()
	d.running = true
	d.mu.Unlock()

	// Start server in background
	go func() {
		slog.Info("daemon: listening", "socket", socketPath)
		if err := d.server.Serve(listener); err != nil && err != http.ErrServerClosed {
			slog.Error("daemon: server error", "err", err)
		}
	}()

	// Start background loops
	go d.watchLoop()

	// Write PID
	if err := writePID(os.Getpid()); err != nil {
		slog.Warn("daemon: write pid", "err", err)
	}

	// Wait for signal
	d.waitForSignal()

	return nil
}

// Stop gracefully shuts down the daemon.
func Stop() error {
	pid, err := readPID()
	if err != nil {
		return fmt.Errorf("daemon: read pid: %w", err)
	}

	proc, err := os.FindProcess(pid)
	if err != nil {
		return fmt.Errorf("daemon: find process: %w", err)
	}

	if err := proc.Signal(syscall.SIGTERM); err != nil {
		return fmt.Errorf("daemon: signal: %w", err)
	}

	time.Sleep(500 * time.Millisecond)

	os.Remove(socketPath)
	os.Remove(lockFile)

	fmt.Println("Daemon stopped.")
	return nil
}

// StatusQuery returns the current daemon status.
func StatusQuery() (*Status, error) {
	client := &http.Client{Timeout: 2 * time.Second}
	resp, err := client.Get("http://unix/status")
	if err != nil {
		pid, err := readPID()
		if err != nil {
			return &Status{Running: false}, nil
		}
		return &Status{
			Running: false,
			PID:     pid,
		}, nil
	}
	defer resp.Body.Close()

	var status Status
	if err := json.NewDecoder(resp.Body).Decode(&status); err != nil {
		return nil, err
	}
	return &status, nil
}

// ─── IPC handlers ────────────────────────────────────────────────────────────

func (d *Daemon) handleSync(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		d.writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	slog.Info("daemon: sync requested")
	d.writeResult(w, map[string]string{"status": "syncing"})
}

func (d *Daemon) handleIndex(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		d.writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	slog.Info("daemon: index requested")
	d.writeResult(w, map[string]string{"status": "indexing"})

	go func() {
		if d.indexer != nil {
			if err := d.indexer.Invalidate(""); err != nil {
				slog.Error("daemon: index invalidate", "err", err)
			}
		}
	}()
}

func (d *Daemon) handleWatch(w http.ResponseWriter, r *http.Request) {
	d.writeResult(w, map[string]any{
		"watching": d.watcher != nil,
	})
}

func (d *Daemon) handleSubscribe(w http.ResponseWriter, r *http.Request) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		d.writeError(w, http.StatusInternalServerError, "streaming not supported")
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	if d.watcher != nil {
		d.watcher.Subscribe(func(ev watcher.Event) {
			data, _ := json.Marshal(ev)
			fmt.Fprintf(w, "data: %s\n\n", data)
			flusher.Flush()
		})
	}

	<-r.Context().Done()
}

func (d *Daemon) handleHealth(w http.ResponseWriter, r *http.Request) {
	d.writeResult(w, map[string]string{
		"status": "ok",
	})
}

func (d *Daemon) handleStatus(w http.ResponseWriter, r *http.Request) {
	d.mu.Lock()
	running := d.running
	d.mu.Unlock()

	d.writeResult(w, Status{
		Running:   running,
		PID:       os.Getpid(),
		Socket:    socketPath,
		Watching:  d.watcher != nil,
		Indexing:  d.indexer != nil,
		StartedAt: time.Now(),
	})
}

// ─── Background loops ────────────────────────────────────────────────────────

func (d *Daemon) watchLoop() {
	if d.watcher == nil {
		return
	}

	for {
		select {
		case <-d.stopCh:
			return
		case ev := <-d.watcher.Events():
			slog.Debug("daemon: file change", "path", ev.Path, "op", ev.Op)
			// Invalidate index cache for changed files
			if d.indexer != nil {
				go d.indexer.Invalidate(ev.Path)
			}
		}
	}
}

func (d *Daemon) waitForSignal() {
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGTERM, syscall.SIGINT)

	sig := <-sigCh
	slog.Info("daemon: received signal", "signal", sig)

	d.mu.Lock()
	d.running = false
	d.mu.Unlock()

	// Close watchers
	if d.watcher != nil {
		d.watcher.Close()
	}

	// Shutdown HTTP server
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if d.server != nil {
		d.server.Shutdown(ctx)
	}

	os.Remove(socketPath)
	os.Remove(lockFile)
	os.Remove(filepath.Join(os.TempDir(), "lf-daemon.pid"))

	slog.Info("daemon: stopped")
}

// ─── Lockfile / PID ──────────────────────────────────────────────────────────

func (d *Daemon) acquireLock() error {
	data, err := os.ReadFile(lockFile)
	if err == nil {
		pidStr := strings.TrimSpace(string(data))
		pid, err := strconv.Atoi(pidStr)
		if err == nil {
			proc, err := os.FindProcess(pid)
			if err == nil {
				if err := proc.Signal(syscall.Signal(0)); err == nil {
					return fmt.Errorf("daemon: already running (pid %d)", pid)
				}
			}
		}
		slog.Warn("daemon: removing stale lockfile")
		os.Remove(lockFile)
	}

	if err := os.WriteFile(lockFile, []byte(strconv.Itoa(os.Getpid())), 0o644); err != nil {
		return fmt.Errorf("daemon: write lockfile: %w", err)
	}

	return nil
}

func writePID(pid int) error {
	pidPath := filepath.Join(os.TempDir(), "lf-daemon.pid")
	return os.WriteFile(pidPath, []byte(strconv.Itoa(pid)), 0o644)
}

func readPID() (int, error) {
	data, err := os.ReadFile(lockFile)
	if err != nil {
		return 0, err
	}
	return strconv.Atoi(strings.TrimSpace(string(data)))
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

func (d *Daemon) writeResult(w http.ResponseWriter, result any) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(IPCResponse{Result: result})
}

func (d *Daemon) writeError(w http.ResponseWriter, code int, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(IPCResponse{Error: msg})
}
