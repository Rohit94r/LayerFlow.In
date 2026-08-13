// Package watcher provides a debounced, .gitignore-respecting file system watcher.
//
// It wraps fsnotify and emits structured events when project files change.
// Callers can subscribe to receive invalidation signals for search indexes,
// LSP caches, and project summaries.
package watcher

import (
	"log/slog"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/fsnotify/fsnotify"
)

// Event describes a file system change.
type Event struct {
	Path string
	Op   Op
}

// Op is a bitmask of file operations.
type Op int

const (
	OpCreate Op = 1 << iota
	OpWrite
	OpRemove
	OpRename
)

// Subscriber is a callback that receives file change events.
type Subscriber func(Event)

// Watcher monitors a directory tree for changes with debouncing and gitignore support.
type Watcher struct {
	root     string
	fs       *fsnotify.Watcher
	mu       sync.RWMutex
	subs     []Subscriber
	ignore   *gitignore
	debounce time.Duration
	events   chan Event
	done     chan struct{}
	once     sync.Once
}

// Options configures the file watcher.
type Options struct {
	// Root is the project root directory to watch.
	Root string
	// Debounce sets the debounce interval for rapid changes. Default 200ms.
	Debounce time.Duration
	// ExtraIgnore patterns beyond .gitignore (e.g. "*.log").
	ExtraIgnore []string
}

// New creates a new file watcher for the given project root.
func New(opts Options) (*Watcher, error) {
	if opts.Root == "" {
		cwd, err := os.Getwd()
		if err != nil {
			return nil, err
		}
		opts.Root = cwd
	}
	if opts.Debounce == 0 {
		opts.Debounce = 200 * time.Millisecond
	}

	fsw, err := fsnotify.NewWatcher()
	if err != nil {
		return nil, err
	}

	w := &Watcher{
		root:     opts.Root,
		fs:       fsw,
		debounce: opts.Debounce,
		events:   make(chan Event, 64),
		done:     make(chan struct{}),
	}

	ig, err := loadGitignore(opts.Root, opts.ExtraIgnore)
	if err != nil {
		slog.Warn("watcher: could not load .gitignore", "err", err)
		ig = newGitignore(opts.ExtraIgnore)
	}
	w.ignore = ig

	if err := w.addRecursive(opts.Root); err != nil {
		fsw.Close()
		return nil, err
	}

	go w.loop()

	return w, nil
}

// Subscribe registers a callback to receive file change events.
func (w *Watcher) Subscribe(fn Subscriber) {
	w.mu.Lock()
	defer w.mu.Unlock()
	w.subs = append(w.subs, fn)
}

// Close stops the watcher and releases resources.
func (w *Watcher) Close() {
	w.once.Do(func() {
		close(w.done)
		w.fs.Close()
	})
}

// Events returns the channel of debounced file events.
func (w *Watcher) Events() <-chan Event {
	return w.events
}

func (w *Watcher) loop() {
	timer := time.NewTimer(0)
	if !timer.Stop() {
		<-timer.C
	}
	pending := make(map[Op]struct{})

	defer timer.Stop()
	defer close(w.events)

	for {
		select {
		case <-w.done:
			return

		case ev, ok := <-w.fs.Events:
			if !ok {
				return
			}
			if w.ignored(ev.Name) {
				continue
			}
			op := fsOpToOp(ev.Op)
			w.broadcast(Event{Path: ev.Name, Op: op})

			if !timer.Stop() {
				select {
				case <-timer.C:
				default:
				}
			}
			timer.Reset(w.debounce)
			pending[op] = struct{}{}

		case <-timer.C:
			for op := range pending {
				_ = op
			}
			pending = make(map[Op]struct{})

		case err, ok := <-w.fs.Errors:
			if !ok {
				return
			}
			slog.Error("watcher: fsnotify error", "err", err)
		}
	}
}

func (w *Watcher) broadcast(ev Event) {
	w.mu.RLock()
	defer w.mu.RUnlock()
	for _, sub := range w.subs {
		sub(ev)
	}
}

func (w *Watcher) addRecursive(dir string) error {
	return filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if !info.IsDir() {
			return nil
		}
		if w.ignored(path) {
			return filepath.SkipDir
		}
		return w.fs.Add(path)
	})
}

func (w *Watcher) ignored(path string) bool {
	rel, err := filepath.Rel(w.root, path)
	if err != nil {
		return false
	}
	if rel == "." {
		return false
	}
	return w.ignore.match(rel)
}

func fsOpToOp(op fsnotify.Op) Op {
	var o Op
	if op&fsnotify.Create != 0 {
		o |= OpCreate
	}
	if op&fsnotify.Write != 0 {
		o |= OpWrite
	}
	if op&fsnotify.Remove != 0 {
		o |= OpRemove
	}
	if op&fsnotify.Rename != 0 {
		o |= OpRename
	}
	return o
}

// gitignore handles pattern matching against .gitignore rules.
type gitignore struct {
	patterns []string
}

func newGitignore(extra []string) *gitignore {
	return &gitignore{patterns: extra}
}

func loadGitignore(root string, extra []string) (*gitignore, error) {
	data, err := os.ReadFile(filepath.Join(root, ".gitignore"))
	if err != nil {
		if os.IsNotExist(err) {
			return newGitignore(extra), nil
		}
		return nil, err
	}

	var patterns []string
	for _, line := range strings.Split(string(data), "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		patterns = append(patterns, line)
	}
	patterns = append(patterns, extra...)
	return &gitignore{patterns: patterns}, nil
}

func (g *gitignore) match(rel string) bool {
	base := filepath.Base(rel)
	if base == ".git" || base == "node_modules" || base == ".next" {
		return true
	}
	for _, p := range g.patterns {
		matched, _ := filepath.Match(p, base)
		if matched {
			return true
		}
		matched, _ = filepath.Match(p, rel)
		if matched {
			return true
		}
	}
	return false
}
