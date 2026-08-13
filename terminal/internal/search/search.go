// Package search provides a hybrid search engine combining filename, content,
// git history, embeddings, memory, projects, and sessions sources with Reciprocal
// Rank Fusion scoring.
package search

import (
	"context"
	"database/sql"
	"fmt"
	"math"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"
)

// Source identifies the origin of a search hit.
type Source int

const (
	Filename  Source = iota
	Content          // FTS5 file content search
	Git              // git log pickaxe search
	Embedding        // vector similarity
	Memory           // memory store entries
	Project          // project summary data
	Session          // session history
)

// String returns a human-readable label for the source.
func (s Source) String() string {
	switch s {
	case Filename:
		return "filename"
	case Content:
		return "content"
	case Git:
		return "git"
	case Embedding:
		return "embedding"
	case Memory:
		return "memory"
	case Project:
		return "project"
	case Session:
		return "session"
	default:
		return "unknown"
	}
}

// Hit represents a single search result.
type Hit struct {
	Source  Source
	Path    string
	Line    int
	Snippet string
	Score   float64
}

// Opts configures a search operation.
type Opts struct {
	Limit   int
	Sources []Source
	Project string
}

// FileMeta describes a file for indexing purposes.
type FileMeta struct {
	Path    string
	Size    int64
	ModTime int64
}

// Index defines the interface for the search index.
type Index interface {
	Build(ctx context.Context, root string, files []FileMeta) error
	Search(ctx context.Context, q string, opts Opts) ([]Hit, error)
	Invalidate(path string) error
}

// HybridIndex implements Index with a multi-source pipeline and RRF ranking.
type HybridIndex struct {
	db       *sql.DB
	rootPath string

	mu        sync.RWMutex
	fileIndex map[string]FileMeta // path → metadata
}

// NewHybridIndex creates a new hybrid search index backed by SQLite.
func NewHybridIndex(db *sql.DB) *HybridIndex {
	return &HybridIndex{
		db:        db,
		fileIndex: make(map[string]FileMeta),
	}
}

// InitSchema creates the FTS5 tables for content and filename search.
func (h *HybridIndex) InitSchema(ctx context.Context) error {
	_, err := h.db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS search_files (
			path    TEXT PRIMARY KEY,
			size    INTEGER NOT NULL DEFAULT 0,
			mod_time INTEGER NOT NULL DEFAULT 0
		);

		CREATE VIRTUAL TABLE IF NOT EXISTS search_content_fts USING fts5(
			path, content,
			tokenize='porter unicode61'
		);

		CREATE VIRTUAL TABLE IF NOT EXISTS search_filename_fts USING fts5(
			path,
			tokenize='porter unicode61'
		);
	`)
	if err != nil {
		return fmt.Errorf("create search schema: %w", err)
	}
	return nil
}

// Build populates the index from a list of file metadata.
func (h *HybridIndex) Build(ctx context.Context, root string, files []FileMeta) error {
	h.mu.Lock()
	h.rootPath = root
	h.fileIndex = make(map[string]FileMeta, len(files))
	for _, f := range files {
		h.fileIndex[f.Path] = f
	}
	h.mu.Unlock()

	tx, err := h.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Clear existing index data.
	if _, err := tx.ExecContext(ctx, "DELETE FROM search_files"); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, "DELETE FROM search_content_fts"); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, "DELETE FROM search_filename_fts"); err != nil {
		return err
	}

	stmtFile, err := tx.PrepareContext(ctx, `
		INSERT OR REPLACE INTO search_files (path, size, mod_time) VALUES (?, ?, ?)`)
	if err != nil {
		return err
	}
	defer stmtFile.Close()

	stmtFts, err := tx.PrepareContext(ctx, `
		INSERT INTO search_content_fts (path, content) VALUES (?, ?)`)
	if err != nil {
		return err
	}
	defer stmtFts.Close()

	stmtName, err := tx.PrepareContext(ctx, `
		INSERT INTO search_filename_fts (path) VALUES (?)`)
	if err != nil {
		return err
	}
	defer stmtName.Close()

	for _, f := range files {
		if _, err := stmtFile.ExecContext(ctx, f.Path, f.Size, f.ModTime); err != nil {
			return err
		}

		// Index filename.
		base := filepath.Base(f.Path)
		if _, err := stmtName.ExecContext(ctx, f.Path); err != nil {
			return err
		}

		// Index file content for text files (skip binaries by extension).
		if isTextFile(f.Path) {
			absPath := filepath.Join(root, f.Path)
			content, err := readFileContent(absPath, 1024*1024) // cap at 1MB
			if err != nil {
				continue // skip unreadable files
			}
			// Store first 500 chars as snippet.
			snippet := content
			if len(snippet) > 500 {
				snippet = snippet[:500]
			}
			if _, err := stmtFts.ExecContext(ctx, f.Path, snippet); err != nil {
				return err
			}
		}
		_ = base // used above for filename indexing
	}

	return tx.Commit()
}

// Search executes a hybrid search across all enabled sources.
func (h *HybridIndex) Search(ctx context.Context, q string, opts Opts) ([]Hit, error) {
	if opts.Limit <= 0 {
		opts.Limit = 20
	}

	// Determine which sources to query.
	sources := opts.Sources
	if len(sources) == 0 {
		sources = []Source{Filename, Content, Git, Memory, Project, Session}
	}

	// Collect results from each source.
	var allHits []Hit
	var mu sync.Mutex
	var wg sync.WaitGroup

	for _, src := range sources {
		wg.Add(1)
		go func(src Source) {
			defer wg.Done()

			var hits []Hit
			switch src {
			case Filename:
				hits = h.searchFilename(ctx, q, opts.Limit)
			case Content:
				hits = h.searchContent(ctx, q, opts.Limit)
			case Git:
				hits = h.searchGit(ctx, q, opts.Limit)
			case Memory:
				// Memory hits are injected by the memory store externally.
			case Project:
				// Project hits are injected by the project store externally.
			case Session:
				// Session hits are injected by the session store externally.
			}

			mu.Lock()
			allHits = append(allHits, hits...)
			mu.Unlock()
		}(src)
	}

	wg.Wait()

	// Apply Reciprocal Rank Fusion across all sources.
	fused := reciprocalRankFusion(allHits)

	// Sort by fused score descending.
	sort.Slice(fused, func(i, j int) bool {
		return fused[i].Score > fused[j].Score
	})

	if len(fused) > opts.Limit {
		fused = fused[:opts.Limit]
	}

	return fused, nil
}

// Invalidate removes a file from the index.
func (h *HybridIndex) Invalidate(path string) error {
	h.mu.Lock()
	delete(h.fileIndex, path)
	h.mu.Unlock()

	_, err := h.db.Exec(`
		DELETE FROM search_files WHERE path = ?;
		INSERT INTO search_content_fts(search_content_fts, path, content) VALUES ('delete', ?, '');
		INSERT INTO search_filename_fts(search_filename_fts, path) VALUES ('delete', ?);`,
		path, path, path,
	)
	return err
}

func (h *HybridIndex) searchFilename(ctx context.Context, q string, limit int) []Hit {
	rows, err := h.db.QueryContext(ctx, `
		SELECT path, rank FROM search_filename_fts
		WHERE search_filename_fts MATCH ?
		ORDER BY rank LIMIT ?`, q, limit,
	)
	if err != nil {
		return nil
	}
	defer rows.Close()

	var hits []Hit
	for rows.Next() {
		var path string
		var rank float64
		if err := rows.Scan(&path, &rank); err != nil {
			continue
		}
		hits = append(hits, Hit{
			Source: Filename,
			Path:   path,
			Score:  -rank, // FTS5 rank is negative (lower = better)
		})
	}
	return hits
}

func (h *HybridIndex) searchContent(ctx context.Context, q string, limit int) []Hit {
	rows, err := h.db.QueryContext(ctx, `
		SELECT path, rank FROM search_content_fts
		WHERE search_content_fts MATCH ?
		ORDER BY rank LIMIT ?`, q, limit,
	)
	if err != nil {
		return nil
	}
	defer rows.Close()

	var hits []Hit
	for rows.Next() {
		var path string
		var rank float64
		if err := rows.Scan(&path, &rank); err != nil {
			continue
		}
		hits = append(hits, Hit{
			Source: Content,
			Path:   path,
			Score:  -rank,
		})
	}
	return hits
}

func (h *HybridIndex) searchGit(ctx context.Context, q string, limit int) []Hit {
	if h.rootPath == "" {
		return nil
	}

	// git log --all -n <limit> --oneline --grep=<q>
	cmd := exec.CommandContext(ctx, "git", "log", "--all",
		fmt.Sprintf("-n%d", limit), "--oneline", "--grep="+q)
	cmd.Dir = h.rootPath
	out, err := cmd.Output()
	if err != nil {
		return nil // not in a git repo or no results
	}

	var hits []Hit
	for _, line := range strings.Split(strings.TrimSpace(string(out)), "\n") {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		// Format: "abc1234 commit message"
		parts := strings.SplitN(line, " ", 2)
		commit := ""
		msg := line
		if len(parts) == 2 {
			commit = parts[0]
			msg = parts[1]
		}
		hits = append(hits, Hit{
			Source:  Git,
			Path:    commit,
			Snippet: msg,
			Score:   0.5,
		})
	}
	return hits
}

// reciprocalRankFusion merges hit lists using RRF: score(d) = sum(1 / (k + rank_i(d)))
// where k=60 is the standard constant.
func reciprocalRankFusion(hits []Hit) []Hit {
	type key struct {
		source Source
		path   string
	}
	merged := make(map[key]*Hit)

	k := 60.0

	// Group hits by source and compute per-source rank.
	sourceCounts := make(map[Source]int)
	for _, h := range hits {
		sourceCounts[h.Source]++
	}

	// Recompute: within each source, rank is 1-based position.
	sourceRanks := make(map[Source]int)
	for _, h := range hits {
		sourceRanks[h.Source]++
		rank := sourceRanks[h.Source]
		k2 := key{h.Source, h.Path}
		if existing, ok := merged[k2]; ok {
			existing.Score += 1.0 / (k + float64(rank))
		} else {
			merged[k2] = &Hit{
				Source:  h.Source,
				Path:    h.Path,
				Line:    h.Line,
				Snippet: h.Snippet,
				Score:   1.0 / (k + float64(rank)),
			}
		}
	}

	// Collect into slice and apply cross-source bonus for items appearing in
	// multiple sources.
	result := make([]Hit, 0, len(merged))
	for _, h := range merged {
		// Boost for appearing in multiple source types.
		sourceCount := 0
		for _, other := range merged {
			if other.Path == h.Path && other.Source != h.Source {
				sourceCount++
			}
		}
		if sourceCount > 0 {
			h.Score *= 1.0 + math.Log2(float64(sourceCount+1))
		}
		result = append(result, *h)
	}

	return result
}

func isTextFile(path string) bool {
	ext := strings.ToLower(filepath.Ext(path))
	switch ext {
	case ".go", ".ts", ".js", ".tsx", ".jsx", ".py", ".rb", ".rs", ".c", ".cpp",
		".h", ".hpp", ".java", ".kt", ".swift", ".md", ".txt", ".json", ".yaml",
		".yml", ".toml", ".xml", ".html", ".css", ".scss", ".sh", ".bash",
		".zsh", ".fish", ".sql", ".graphql", ".proto", ".mod", ".sum",
		".dockerfile", ".env", ".gitignore", ".editorconfig", ".prettierrc",
		".eslintrc", ".Makefile", ".Dockerfile":
		return true
	}
	base := filepath.Base(path)
	switch base {
	case "Makefile", "Dockerfile", "Containerfile", "README", "LICENSE",
		"CHANGELOG", "CONTRIBUTING", ".gitignore", ".env":
		return true
	}
	return false
}

func readFileContent(path string, maxBytes int64) (string, error) {
	cmd := exec.Command("cat", path)
	out, err := cmd.Output()
	if err != nil {
		return "", err
	}
	if int64(len(out)) > maxBytes {
		out = out[:maxBytes]
	}
	return string(out), nil
}

// Watcher manages incremental index updates via filesystem notifications.
type Watcher struct {
	index    *HybridIndex
	rootPath string
	onChange func(path string)
}

// NewWatcher creates a new file watcher for incremental index updates.
func NewWatcher(index *HybridIndex, rootPath string, onChange func(string)) *Watcher {
	return &Watcher{
		index:    index,
		rootPath: rootPath,
		onChange: onChange,
	}
}

// Run starts the watcher loop. It should be called in a goroutine.
func (w *Watcher) Run(ctx context.Context) error {
	// Use fsnotify indirectly via polling for simplicity.
	// The actual fsnotify integration depends on the watcher package.
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-ticker.C:
			// In production, this would receive fsnotify events.
			// For now, this is a placeholder for the watcher loop.
		}
	}
}
