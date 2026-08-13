package git

import (
	"bytes"
	"context"
	"fmt"
	"os/exec"
	"strconv"
	"strings"
	"time"
)

// Repo represents a local git repository.
type Repo struct {
	Root string
}

// Status holds the working tree status.
type Status struct {
	Branch  string   `json:"branch"`
	Ahead   int      `json:"ahead"`
	Behind  int      `json:"behind"`
	Dirty   bool     `json:"dirty"`
	Changed []string `json:"changed"`
}

// Diff represents the diff of a ref against HEAD.
type Diff struct {
	Files []FileDiff `json:"files"`
	Stats Stats      `json:"stats"`
}

// Stats summarizes the diff numerics.
type Stats struct {
	Added    int `json:"added"`
	Removed  int `json:"removed"`
	Modified int `json:"modified"`
}

// FileDiff describes changes in a single file.
type FileDiff struct {
	Path   string `json:"path"`
	Status string `json:"status"` // added, modified, deleted, renamed
	Hunks  []Hunk `json:"hunks"`
}

// Hunk is a contiguous block of changed lines.
type Hunk struct {
	OldStart int    `json:"old_start"`
	OldLines int    `json:"old_lines"`
	NewStart int    `json:"new_start"`
	NewLines int    `json:"new_lines"`
	Context  string `json:"context"`
}

// Commit is a simplified git commit record.
type Commit struct {
	Hash    string `json:"hash"`
	Author  string `json:"author"`
	Date    int64  `json:"date"`
	Message string `json:"message"`
}

// Blame represents a single line from git-blame output.
type Blame struct {
	Line    int    `json:"line"`
	Commit  string `json:"commit"`
	Author  string `json:"author"`
	Date    int64  `json:"date"`
	Content string `json:"content"`
}

// New creates a Repo at the given root directory.
func New(root string) *Repo {
	return &Repo{Root: root}
}

// Status returns the current branch, ahead/behind counts, and dirty files.
func (r *Repo) Status(ctx context.Context) (Status, error) {
	var s Status

	// Current branch
	branch, err := r.run(ctx, "git", "rev-parse", "--abbrev-ref", "HEAD")
	if err != nil {
		return Status{}, fmt.Errorf("get branch: %w", err)
	}
	s.Branch = strings.TrimSpace(branch)

	// Ahead/behind upstream
	upstream, err := r.run(ctx, "git", "rev-list", "--left-right", "--count", fmt.Sprintf("%s@{upstream}", s.Branch))
	if err == nil {
		parts := strings.Fields(strings.TrimSpace(upstream))
		if len(parts) == 2 {
			s.Ahead, _ = strconv.Atoi(parts[0])
			s.Behind, _ = strconv.Atoi(parts[1])
		}
	}

	// Check for uncommitted changes
	statusOut, err := r.run(ctx, "git", "status", "--porcelain")
	if err != nil {
		return Status{}, fmt.Errorf("get status: %w", err)
	}

	lines := strings.Split(strings.TrimSpace(statusOut), "\n")
	if len(lines) == 1 && lines[0] == "" {
		s.Dirty = false
		return s, nil
	}

	s.Dirty = true
	for _, line := range lines {
		if len(line) < 4 {
			continue
		}
		// Format: XY filename
		code := line[:2]
		path := strings.TrimSpace(line[3:])
		if code == "??" {
			continue // untracked
		}
		s.Changed = append(s.Changed, path)
	}

	return s, nil
}

// Diff computes the diff of a ref against HEAD.
// Use an empty string to diff the working tree against HEAD.
func (r *Repo) Diff(ctx context.Context, ref string) (Diff, error) {
	args := []string{"diff", "--no-color"}
	if ref != "" {
		args = append(args, ref)
	}

	out, err := r.run(ctx, "git", args...)
	if err != nil {
		return Diff{}, fmt.Errorf("git diff: %w", err)
	}

	return parseDiff(out), nil
}

// ChangedFiles returns the list of files with uncommitted changes.
func (r *Repo) ChangedFiles(ctx context.Context) ([]string, error) {
	out, err := r.run(ctx, "git", "diff", "--name-only", "HEAD")
	if err != nil {
		return nil, fmt.Errorf("changed files: %w", err)
	}

	lines := strings.Split(strings.TrimSpace(out), "\n")
	var files []string
	for _, l := range lines {
		l = strings.TrimSpace(l)
		if l != "" {
			files = append(files, l)
		}
	}
	return files, nil
}

// Commit creates a git commit with the given message and staged files.
// Returns the commit hash on success.
func (r *Repo) Commit(ctx context.Context, msg string, files []string) (string, error) {
	// Stage specified files
	args := []string{"add"}
	args = append(args, files...)
	if _, err := r.run(ctx, "git", args...); err != nil {
		return "", fmt.Errorf("git add: %w", err)
	}

	// Create commit
	out, err := r.run(ctx, "git", "commit", "-m", msg, "--allow-empty")
	if err != nil {
		return "", fmt.Errorf("git commit: %w", err)
	}

	// Extract commit hash from output
	hash, err := r.run(ctx, "git", "rev-parse", "HEAD")
	if err != nil {
		return "", fmt.Errorf("get commit hash: %w", err)
	}

	_ = out // commit output available if needed
	return strings.TrimSpace(hash), nil
}

// Blame returns blame info for a file, optionally limited to a line range.
func (r *Repo) Blame(ctx context.Context, path string, line int) ([]Blame, error) {
	args := []string{"blame", "-p", "--line-porcelain"}
	if line > 0 {
		args = append(args, "-L", fmt.Sprintf("%d,%d", line, line))
	}
	args = append(args, path)

	out, err := r.run(ctx, "git", args...)
	if err != nil {
		return nil, fmt.Errorf("git blame: %w", err)
	}

	return parseBlame(out, line), nil
}

// Log searches commits that touch a file, optionally filtering by a pickaxe query (-S).
func (r *Repo) Log(ctx context.Context, path string, q string) ([]Commit, error) {
	args := []string{"log", "--format=%H|%an|%at|%s", "-n", "50"}
	if q != "" {
		args = append(args, "-S", q)
	}
	if path != "" {
		args = append(args, "--", path)
	}

	out, err := r.run(ctx, "git", args...)
	if err != nil {
		return nil, fmt.Errorf("git log: %w", err)
	}

	return parseLog(out), nil
}

// HeaderBar returns a compact status string: "branch • n changed • ahead/behind".
func (r *Repo) HeaderBar(ctx context.Context) (string, error) {
	s, err := r.Status(ctx)
	if err != nil {
		return "", err
	}

	parts := []string{s.Branch}

	if len(s.Changed) > 0 {
		parts = append(parts, fmt.Sprintf("%d changed", len(s.Changed)))
	}

	if s.Ahead > 0 || s.Behind > 0 {
		parts = append(parts, fmt.Sprintf("↑%d ↓%d", s.Ahead, s.Behind))
	}

	return strings.Join(parts, " • "), nil
}

// run executes a git command and returns its combined output.
func (r *Repo) run(ctx context.Context, name string, args ...string) (string, error) {
	cmd := exec.CommandContext(ctx, name, args...)
	cmd.Dir = r.Root

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		if stderr.Len() > 0 {
			return "", fmt.Errorf("%s %s: %w: %s", name, strings.Join(args, " "), err, strings.TrimSpace(stderr.String()))
		}
		return "", fmt.Errorf("%s %s: %w", name, strings.Join(args, " "), err)
	}

	return stdout.String(), nil
}

// parseDiff converts raw unified diff output into structured Diff.
func parseDiff(raw string) Diff {
	var d Diff
	var current *FileDiff
	var stats Stats

	lines := strings.Split(raw, "\n")
	for _, line := range lines {
		// New file header
		if strings.HasPrefix(line, "diff --git") {
			parts := strings.Split(line, " b/")
			if len(parts) == 2 {
				fd := FileDiff{Path: parts[1]}
				d.Files = append(d.Files, fd)
				current = &d.Files[len(d.Files)-1]
			}
			continue
		}

		if current == nil {
			continue
		}

		// File status from index line
		if strings.HasPrefix(line, "new file") {
			current.Status = "added"
			stats.Added++
		} else if strings.HasPrefix(line, "deleted file") {
			current.Status = "deleted"
			stats.Removed++
		} else if strings.HasPrefix(line, "rename from") {
			current.Status = "renamed"
		}

		// Parse hunk headers
		if strings.HasPrefix(line, "@@") {
			hunk := parseHunkHeader(line)
			if hunk != nil {
				current.Hunks = append(current.Hunks, *hunk)
				stats.Modified++
			}
		}
	}

	d.Stats = stats
	return d
}

// parseHunkHeader extracts hunk metadata from a @@ header line.
func parseHunkHeader(line string) *Hunk {
	start := strings.Index(line, "-")
	end := strings.Index(line, "+")
	if start < 0 || end < 0 {
		return nil
	}

	old, new := "", ""
	parts := strings.SplitN(line[start+1:end], ",", 2)
	if len(parts) >= 1 {
		old = parts[0]
	}
	parts = strings.SplitN(line[end+1:], ",", 2)
	if len(parts) >= 1 {
		new = parts[0]
	}

	h := &Hunk{}
	fmt.Sscanf(old, "%d", &h.OldStart)
	fmt.Sscanf(new, "%d", &h.NewStart)
	return h
}

// parseBlame parses porcelain blame output.
func parseBlame(raw string, targetLine int) []Blame {
	var result []Blame
	var current Blame

	lines := strings.Split(raw, "\n")
	for _, line := range lines {
		if strings.HasPrefix(line, "\t") {
			// Content line
			current.Content = strings.TrimPrefix(line, "\t")
			if targetLine > 0 {
				current.Line = targetLine
			} else {
				current.Line = len(result) + 1
			}
			result = append(result, current)
			current = Blame{}
			continue
		}

		parts := strings.SplitN(line, " ", 2)
		if len(parts) != 2 {
			continue
		}
		key, val := parts[0], parts[1]
		switch key {
		case "author":
			current.Author = val
		case "committer-time":
			t, err := strconv.ParseInt(val, 10, 64)
			if err == nil {
				current.Date = t
			}
		}
	}

	return result
}

// parseLog parses simplified log output (hash|author|date|message).
func parseLog(raw string) []Commit {
	var commits []Commit
	lines := strings.Split(strings.TrimSpace(raw), "\n")

	for _, line := range lines {
		parts := strings.SplitN(line, "|", 4)
		if len(parts) < 4 {
			continue
		}

		date, _ := strconv.ParseInt(parts[2], 10, 64)
		commits = append(commits, Commit{
			Hash:    parts[0],
			Author:  parts[1],
			Date:    date,
			Message: parts[3],
		})
	}

	return commits
}

// IsRepo checks if the given directory is inside a git repository.
func IsRepo(ctx context.Context, path string) bool {
	cmd := exec.CommandContext(ctx, "git", "rev-parse", "--git-dir")
	cmd.Dir = path
	return cmd.Run() == nil
}

// CurrentBranch returns the short branch name for the repo at the given path.
func CurrentBranch(ctx context.Context, path string) (string, error) {
	cmd := exec.CommandContext(ctx, "git", "rev-parse", "--abbrev-ref", "HEAD")
	cmd.Dir = path

	out, err := cmd.Output()
	if err != nil {
		return "", fmt.Errorf("get current branch: %w", err)
	}

	return strings.TrimSpace(string(out)), nil
}

// LastCommitTime returns the time of the most recent commit.
func (r *Repo) LastCommitTime(ctx context.Context) (time.Time, error) {
	out, err := r.run(ctx, "git", "log", "-1", "--format=%at")
	if err != nil {
		return time.Time{}, fmt.Errorf("get last commit time: %w", err)
	}

	ts, err := strconv.ParseInt(strings.TrimSpace(out), 10, 64)
	if err != nil {
		return time.Time{}, fmt.Errorf("parse timestamp: %w", err)
	}

	return time.Unix(ts, 0), nil
}
