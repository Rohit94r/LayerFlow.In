package editor

import (
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"strings"
	"sync"
)

// Edit describes a single text replacement to apply to a file.
type Edit struct {
	Old string `json:"old"` // Exact text to find (must be unique within the file)
	New string `json:"new"` // Replacement text
}

// Snapshot records the state of a file before a mutation for undo support.
type Snapshot struct {
	Path    string // Absolute path of the file
	Content string // Full file contents at snapshot time
}

// Editor provides safe file editing with atomic writes, snapshots, and undo.
type Editor struct {
	// Snapshots maps file paths to their pre-mutation state.
	snapshots map[string]*Snapshot
	mu        sync.RWMutex
	logger    *slog.Logger
}

// New creates an Editor.
func New(logger *slog.Logger) *Editor {
	if logger == nil {
		logger = slog.Default()
	}
	return &Editor{
		snapshots: make(map[string]*Snapshot),
		logger:    logger,
	}
}

// Write atomically writes content to a file. If the file exists, a pre-edit
// snapshot is automatically taken for undo support.
func (e *Editor) Write(path string, content string) error {
	absPath, err := filepath.Abs(path)
	if err != nil {
		return fmt.Errorf("editor: invalid path: %w", err)
	}

	// Take a pre-edit snapshot if the file exists.
	if err := e.snapshot(absPath); err != nil {
		return fmt.Errorf("editor: snapshot: %w", err)
	}

	// Ensure the parent directory exists.
	dir := filepath.Dir(absPath)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return fmt.Errorf("editor: mkdir %s: %w", dir, err)
	}

	// Normalize line endings to LF.
	normalized := normalizeLineEndings(content)

	// Write to a temporary file in the same directory, then rename.
	tmpPath := absPath + ".lf-tmp"
	if err := os.WriteFile(tmpPath, []byte(normalized), 0o644); err != nil {
		return fmt.Errorf("editor: write temp: %w", err)
	}

	if err := os.Rename(tmpPath, absPath); err != nil {
		os.Remove(tmpPath) // best-effort cleanup
		return fmt.Errorf("editor: atomic rename: %w", err)
	}

	e.logger.Info("file written", "path", absPath, "bytes", len(normalized))
	return nil
}

// Edit applies a list of text replacements to a file. Each Edit.Old must
// appear exactly once in the file. A diff preview is logged before the write.
func (e *Editor) Edit(path string, edits []Edit) error {
	absPath, err := filepath.Abs(path)
	if err != nil {
		return fmt.Errorf("editor: invalid path: %w", err)
	}

	data, err := os.ReadFile(absPath)
	if err != nil {
		return fmt.Errorf("editor: read %s: %w", absPath, err)
	}

	// Take a snapshot before editing.
	if err := e.snapshot(absPath); err != nil {
		return fmt.Errorf("editor: snapshot: %w", err)
	}

	content := string(data)

	// Validate and apply edits.
	for i, edit := range edits {
		if edit.Old == "" {
			return fmt.Errorf("editor: edits[%d].old must not be empty", i)
		}

		count := strings.Count(content, edit.Old)
		if count == 0 {
			return fmt.Errorf("editor: edits[%d].old not found in %s", i, absPath)
		}
		if count > 1 {
			return fmt.Errorf("editor: edits[%d].old is not unique in %s (found %d occurrences)", i, absPath, count)
		}

		content = strings.Replace(content, edit.Old, edit.New, 1)
	}

	// Log a simple diff preview.
	e.logDiff(absPath, string(data), content)

	// Atomic write.
	normalized := normalizeLineEndings(content)
	tmpPath := absPath + ".lf-tmp"
	if err := os.WriteFile(tmpPath, []byte(normalized), 0o644); err != nil {
		return fmt.Errorf("editor: write temp: %w", err)
	}

	if err := os.Rename(tmpPath, absPath); err != nil {
		os.Remove(tmpPath)
		return fmt.Errorf("editor: atomic rename: %w", err)
	}

	e.logger.Info("file edited", "path", absPath, "edits", len(edits))
	return nil
}

// Undo restores a file to its last snapshot. Returns an error if no
// snapshot exists for the path.
func (e *Editor) Undo(path string) error {
	absPath, err := filepath.Abs(path)
	if err != nil {
		return fmt.Errorf("editor: invalid path: %w", err)
	}

	e.mu.Lock()
	snap, ok := e.snapshots[absPath]
	if ok {
		delete(e.snapshots, absPath)
	}
	e.mu.Unlock()

	if !ok {
		return fmt.Errorf("editor: no snapshot available for %s", absPath)
	}

	// Atomic restore.
	tmpPath := absPath + ".lf-undo-tmp"
	if err := os.WriteFile(tmpPath, []byte(snap.Content), 0o644); err != nil {
		return fmt.Errorf("editor: write undo temp: %w", err)
	}

	if err := os.Rename(tmpPath, absPath); err != nil {
		os.Remove(tmpPath)
		return fmt.Errorf("editor: atomic undo rename: %w", err)
	}

	e.logger.Info("file undone", "path", absPath, "restored_bytes", len(snap.Content))
	return nil
}

// Snapshot returns the current pre-edit snapshot for a path, if one exists.
func (e *Editor) Snapshot(path string) (*Snapshot, bool) {
	absPath, err := filepath.Abs(path)
	if err != nil {
		return nil, false
	}

	e.mu.RLock()
	defer e.mu.RUnlock()
	snap, ok := e.snapshots[absPath]
	return snap, ok
}

// snapshot takes a pre-edit snapshot if one doesn't already exist.
func (e *Editor) snapshot(absPath string) error {
	e.mu.Lock()
	defer e.mu.Unlock()

	// Don't overwrite an existing snapshot (preserve the original state).
	if _, exists := e.snapshots[absPath]; exists {
		return nil
	}

	data, err := os.ReadFile(absPath)
	if err != nil {
		if os.IsNotExist(err) {
			// New file — no snapshot needed.
			return nil
		}
		return err
	}

	e.snapshots[absPath] = &Snapshot{
		Path:    absPath,
		Content: string(data),
	}

	return nil
}

// logDiff logs a simple line-by-line diff between old and new content.
func (e *Editor) logDiff(path, old, new string) {
	oldLines := strings.Split(old, "\n")
	newLines := strings.Split(new, "\n")

	var additions, deletions int
	maxLines := len(oldLines)
	if len(newLines) > maxLines {
		maxLines = len(newLines)
	}

	for i := 0; i < maxLines; i++ {
		var oldLine, newLine string
		if i < len(oldLines) {
			oldLine = oldLines[i]
		}
		if i < len(newLines) {
			newLine = newLines[i]
		}

		if oldLine != newLine {
			if i < len(oldLines) {
				deletions++
			}
			if i < len(newLines) {
				additions++
			}
		}
	}

	e.logger.Info("diff preview",
		"path", path,
		"additions", additions,
		"deletions", deletions,
	)
}

// normalizeLineEndings converts CRLF to LF.
func normalizeLineEndings(s string) string {
	return strings.ReplaceAll(s, "\r\n", "\n")
}
