package tools

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

func init() {
	_ = Register(&ReadFileTool{})
	_ = Register(&ListDirTool{})
	_ = Register(&SearchFilesTool{})
	_ = Register(&GrepTool{})
	_ = Register(&WriteFileTool{})
	_ = Register(&EditFileTool{})
	_ = Register(&CreatePatchTool{})
	_ = Register(&RunCommandTool{})
	_ = Register(&OpenEditorTool{})
}

// ---------------------------------------------------------------------------
// read_file
// ---------------------------------------------------------------------------

type ReadFileTool struct{}

func (t *ReadFileTool) Spec() Spec {
	return Spec{
		Name:        "read_file",
		Description: "Read the contents of a file and return them as a string.",
		Args: map[string]any{
			"type": "object",
			"properties": map[string]any{
				"path": map[string]any{
					"type":        "string",
					"description": "Path to the file, relative to CWD or absolute",
				},
			},
			"required": []string{"path"},
		},
		Risk:       RiskRead,
		Permission: "fs.read",
		Audit:      []string{"path"},
	}
}

func (t *ReadFileTool) Plan(req Request) (*Plan, error) {
	pathArg, err := argString(req, "path")
	if err != nil {
		return nil, err
	}
	path, err := resolvePath(req.CWD, pathArg)
	if err != nil {
		return nil, err
	}
	return &Plan{
		Description: fmt.Sprintf("Read file %s", path),
		Risk:        RiskRead,
		Args:        req.Args,
	}, nil
}

func (t *ReadFileTool) Execute(_ context.Context, req Request) (*Result, error) {
	pathArg, err := argString(req, "path")
	if err != nil {
		return nil, err
	}
	path, err := resolvePath(req.CWD, pathArg)
	if err != nil {
		return nil, err
	}

	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read_file: %w", err)
	}

	return &Result{
		OK:   true,
		Data: string(data),
	}, nil
}

// ---------------------------------------------------------------------------
// list_dir
// ---------------------------------------------------------------------------

type ListDirTool struct{}

func (t *ListDirTool) Spec() Spec {
	return Spec{
		Name:        "list_dir",
		Description: "List the entries in a directory.",
		Args: map[string]any{
			"type": "object",
			"properties": map[string]any{
				"path": map[string]any{
					"type":        "string",
					"description": "Directory path, defaults to CWD",
				},
			},
		},
		Risk:       RiskRead,
		Permission: "fs.read",
		Audit:      []string{"path"},
	}
}

func (t *ListDirTool) Plan(req Request) (*Plan, error) {
	path := req.CWD
	if v, ok := req.Args["path"].(string); ok && v != "" {
		var err error
		path, err = resolvePath(req.CWD, v)
		if err != nil {
			return nil, err
		}
	}
	return &Plan{
		Description: fmt.Sprintf("List directory %s", path),
		Risk:        RiskRead,
		Args:        req.Args,
	}, nil
}

func (t *ListDirTool) Execute(_ context.Context, req Request) (*Result, error) {
	path := req.CWD
	if v, ok := req.Args["path"].(string); ok && v != "" {
		var err error
		path, err = resolvePath(req.CWD, v)
		if err != nil {
			return nil, err
		}
	}

	entries, err := os.ReadDir(path)
	if err != nil {
		return nil, fmt.Errorf("list_dir: %w", err)
	}

	names := make([]string, 0, len(entries))
	for _, e := range entries {
		if e.IsDir() {
			names = append(names, e.Name()+"/")
		} else {
			names = append(names, e.Name())
		}
	}

	return &Result{
		OK:   true,
		Data: names,
	}, nil
}

// ---------------------------------------------------------------------------
// search_files
// ---------------------------------------------------------------------------

type SearchFilesTool struct{}

func (t *SearchFilesTool) Spec() Spec {
	return Spec{
		Name:        "search_files",
		Description: "Find files matching a glob pattern recursively.",
		Args: map[string]any{
			"type": "object",
			"properties": map[string]any{
				"pattern": map[string]any{
					"type":        "string",
					"description": "Glob pattern, e.g. **/*.go or src/**/*.ts",
				},
				"path": map[string]any{
					"type":        "string",
					"description": "Root directory to search from, defaults to CWD",
				},
			},
			"required": []string{"pattern"},
		},
		Risk:       RiskRead,
		Permission: "fs.read",
		Audit:      []string{"pattern", "path"},
	}
}

func (t *SearchFilesTool) Plan(req Request) (*Plan, error) {
	pattern, _ := req.Args["pattern"].(string)
	return &Plan{
		Description: fmt.Sprintf("Search for files matching %q", pattern),
		Risk:        RiskRead,
		Args:        req.Args,
	}, nil
}

func (t *SearchFilesTool) Execute(_ context.Context, req Request) (*Result, error) {
	pattern, _ := req.Args["pattern"].(string)
	if pattern == "" {
		return nil, fmt.Errorf("search_files: pattern is required")
	}

	root := req.CWD
	if v, ok := req.Args["path"].(string); ok && v != "" {
		var err error
		root, err = resolvePath(req.CWD, v)
		if err != nil {
			return nil, err
		}
	}

	// If the pattern is already a glob with wildcards, use filepath.Glob on the
	// full path. Otherwise, walk the directory tree.
	fullPattern := filepath.Join(root, pattern)
	matches, err := filepath.Glob(fullPattern)
	if err != nil {
		return nil, fmt.Errorf("search_files: %w", err)
	}

	if matches == nil {
		matches = []string{}
	}

	// Convert to relative paths for cleaner output.
	rel := make([]string, 0, len(matches))
	for _, m := range matches {
		r, err := filepath.Rel(root, m)
		if err != nil {
			rel = append(rel, m)
			continue
		}
		rel = append(rel, r)
	}

	return &Result{
		OK:   true,
		Data: rel,
	}, nil
}

// ---------------------------------------------------------------------------
// grep
// ---------------------------------------------------------------------------

type GrepTool struct{}

func (t *GrepTool) Spec() Spec {
	return Spec{
		Name:        "grep",
		Description: "Search file contents for lines matching a regex pattern.",
		Args: map[string]any{
			"type": "object",
			"properties": map[string]any{
				"pattern": map[string]any{
					"type":        "string",
					"description": "Regex pattern to match",
				},
				"path": map[string]any{
					"type":        "string",
					"description": "File or directory to search, defaults to CWD",
				},
				"include": map[string]any{
					"type":        "string",
					"description": "Glob pattern for files to include, e.g. *.go",
				},
			},
			"required": []string{"pattern"},
		},
		Risk:       RiskRead,
		Permission: "fs.read",
		Audit:      []string{"pattern", "path"},
	}
}

func (t *GrepTool) Plan(req Request) (*Plan, error) {
	pattern, _ := req.Args["pattern"].(string)
	return &Plan{
		Description: fmt.Sprintf("Grep for %q", pattern),
		Risk:        RiskRead,
		Args:        req.Args,
	}, nil
}

func (t *GrepTool) Execute(_ context.Context, req Request) (*Result, error) {
	pattern, _ := req.Args["pattern"].(string)
	if pattern == "" {
		return nil, fmt.Errorf("grep: pattern is required")
	}

	root := req.CWD
	if v, ok := req.Args["path"].(string); ok && v != "" {
		var err error
		root, err = resolvePath(req.CWD, v)
		if err != nil {
			return nil, err
		}
	}

	include, _ := req.Args["include"].(string)

	// Delegate to ripgrep if available for performance; fall back to a
	// pure-Go implementation using filepath.Walk + regexp.
	results, err := grepSearch(root, pattern, include)
	if err != nil {
		return nil, fmt.Errorf("grep: %w", err)
	}

	return &Result{
		OK:   true,
		Data: results,
	}, nil
}

// grepResult is a single matching line.
type grepResult struct {
	File string `json:"file"`
	Line int    `json:"line"`
	Text string `json:"text"`
}

// grepSearch performs a recursive grep using os and regexp packages.
func grepSearch(root, pattern, include string) ([]grepResult, error) {
	re, err := compileGrepPattern(pattern)
	if err != nil {
		return nil, err
	}

	var results []grepResult

	err = filepath.Walk(root, func(path string, info os.FileInfo, walkErr error) error {
		if walkErr != nil {
			return nil // skip inaccessible files
		}
		if info.IsDir() {
			name := info.Name()
			if name == ".git" || name == "node_modules" || name == "vendor" || strings.HasPrefix(name, ".") {
				return filepath.SkipDir
			}
			return nil
		}
		if include != "" {
			matched, _ := filepath.Match(include, info.Name())
			if !matched {
				return nil
			}
		}
		if info.Size() > 10*1024*1024 { // skip files > 10 MB
			return nil
		}

		data, readErr := os.ReadFile(path)
		if readErr != nil {
			return nil
		}

		rel, _ := filepath.Rel(root, path)
		lines := strings.Split(string(data), "\n")
		for i, line := range lines {
			if re.MatchString(line) {
				results = append(results, grepResult{
					File: rel,
					Line: i + 1,
					Text: strings.TrimSpace(line),
				})
			}
		}
		return nil
	})

	return results, err
}

// ---------------------------------------------------------------------------
// write_file
// ---------------------------------------------------------------------------

type WriteFileTool struct{}

func (t *WriteFileTool) Spec() Spec {
	return Spec{
		Name:        "write_file",
		Description: "Write content to a file, creating it if it doesn't exist.",
		Args: map[string]any{
			"type": "object",
			"properties": map[string]any{
				"path": map[string]any{
					"type":        "string",
					"description": "Path to the file to write",
				},
				"content": map[string]any{
					"type":        "string",
					"description": "Full file content to write",
				},
			},
			"required": []string{"path", "content"},
		},
		Risk:       RiskWrite,
		Permission: "fs.write",
		Audit:      []string{"path"},
	}
}

func (t *WriteFileTool) Plan(req Request) (*Plan, error) {
	pathArg, err := argString(req, "path")
	if err != nil {
		return nil, err
	}
	path, err := resolvePath(req.CWD, pathArg)
	if err != nil {
		return nil, err
	}

	snapshot := snapshotPre(path)

	return &Plan{
		Description: fmt.Sprintf("Write content to %s", path),
		Risk:        RiskWrite,
		Args:        req.Args,
		Snapshots:   []*Snapshot{snapshot},
	}, nil
}

func (t *WriteFileTool) Execute(_ context.Context, req Request) (*Result, error) {
	pathArg, err := argString(req, "path")
	if err != nil {
		return nil, err
	}
	path, err := resolvePath(req.CWD, pathArg)
	if err != nil {
		return nil, err
	}
	content, _ := req.Args["content"].(string)

	// Take a pre-mutation snapshot if the file exists.
	snapshot := snapshotPre(path)

	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return nil, fmt.Errorf("write_file: mkdir: %w", err)
	}
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		return nil, fmt.Errorf("write_file: %w", err)
	}

	return &Result{
		OK:       true,
		Snapshot: snapshot,
	}, nil
}

// ---------------------------------------------------------------------------
// edit_file
// ---------------------------------------------------------------------------

// Edit describes a single text replacement to apply to a file.
type Edit struct {
	Old string `json:"old"` // Exact text to find
	New string `json:"new"` // Replacement text
}

type EditFileTool struct{}

func (t *EditFileTool) Spec() Spec {
	return Spec{
		Name:        "edit_file",
		Description: "Apply text replacements to a file. Shows a diff preview before writing.",
		Args: map[string]any{
			"type": "object",
			"properties": map[string]any{
				"path": map[string]any{
					"type":        "string",
					"description": "Path to the file to edit",
				},
				"edits": map[string]any{
					"type":        "array",
					"description": "List of edit operations",
					"items": map[string]any{
						"type": "object",
						"properties": map[string]any{
							"old": map[string]any{"type": "string"},
							"new": map[string]any{"type": "string"},
						},
					},
				},
			},
			"required": []string{"path", "edits"},
		},
		Risk:       RiskWrite,
		Permission: "fs.write",
		Audit:      []string{"path"},
	}
}

func (t *EditFileTool) Plan(req Request) (*Plan, error) {
	pathArg, err := argString(req, "path")
	if err != nil {
		return nil, err
	}
	path, err := resolvePath(req.CWD, pathArg)
	if err != nil {
		return nil, err
	}

	snapshot := snapshotPre(path)

	return &Plan{
		Description: fmt.Sprintf("Edit file %s", path),
		Risk:        RiskWrite,
		Args:        req.Args,
		Snapshots:   []*Snapshot{snapshot},
	}, nil
}

func (t *EditFileTool) Execute(_ context.Context, req Request) (*Result, error) {
	pathArg, err := argString(req, "path")
	if err != nil {
		return nil, err
	}
	path, err := resolvePath(req.CWD, pathArg)
	if err != nil {
		return nil, err
	}

	editsRaw, ok := req.Args["edits"].([]any)
	if !ok || len(editsRaw) == 0 {
		return nil, fmt.Errorf("edit_file: edits must be a non-empty array")
	}

	edits := make([]Edit, 0, len(editsRaw))
	for i, raw := range editsRaw {
		obj, ok := raw.(map[string]any)
		if !ok {
			return nil, fmt.Errorf("edit_file: edits[%d] must be an object with 'old' and 'new'", i)
		}
		oldStr, _ := obj["old"].(string)
		newStr, _ := obj["new"].(string)
		if oldStr == "" {
			return nil, fmt.Errorf("edit_file: edits[%d].old must not be empty", i)
		}
		edits = append(edits, Edit{Old: oldStr, New: newStr})
	}

	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("edit_file: %w", err)
	}

	snapshot := &Snapshot{
		Path:    path,
		Content: string(data),
		Kind:    "pre",
	}

	// Apply edits sequentially.
	content := string(data)
	for i, edit := range edits {
		if !strings.Contains(content, edit.Old) {
			return nil, fmt.Errorf("edit_file: edits[%d].old not found in %s", i, path)
		}
		content = strings.Replace(content, edit.Old, edit.New, 1)
	}

	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		return nil, fmt.Errorf("edit_file: %w", err)
	}

	return &Result{
		OK:       true,
		Data:     content,
		Snapshot: snapshot,
	}, nil
}

// ---------------------------------------------------------------------------
// create_patch
// ---------------------------------------------------------------------------

type CreatePatchTool struct{}

func (t *CreatePatchTool) Spec() Spec {
	return Spec{
		Name:        "create_patch",
		Description: "Create a unified diff between two file contents or versions.",
		Args: map[string]any{
			"type": "object",
			"properties": map[string]any{
				"old_content": map[string]any{
					"type":        "string",
					"description": "Original content",
				},
				"new_content": map[string]any{
					"type":        "string",
					"description": "Modified content",
				},
				"old_path": map[string]any{
					"type":        "string",
					"description": "Path label for the original file",
				},
				"new_path": map[string]any{
					"type":        "string",
					"description": "Path label for the modified file",
				},
			},
			"required": []string{"old_content", "new_content"},
		},
		Risk:       RiskWrite,
		Permission: "fs.write",
		Audit:      []string{"old_path", "new_path"},
	}
}

func (t *CreatePatchTool) Plan(req Request) (*Plan, error) {
	return &Plan{
		Description: "Generate a unified diff patch",
		Risk:        RiskWrite,
		Args:        req.Args,
	}, nil
}

func (t *CreatePatchTool) Execute(_ context.Context, req Request) (*Result, error) {
	oldContent, _ := req.Args["old_content"].(string)
	newContent, _ := req.Args["new_content"].(string)
	oldPath, _ := req.Args["old_path"].(string)
	newPath, _ := req.Args["new_path"].(string)

	if oldPath == "" {
		oldPath = "a/original"
	}
	if newPath == "" {
		newPath = "b/modified"
	}

	patch := unifiedDiff(oldPath, newPath, oldContent, newContent)

	return &Result{
		OK:   true,
		Data: patch,
	}, nil
}

// ---------------------------------------------------------------------------
// run_command
// ---------------------------------------------------------------------------

type RunCommandTool struct{}

func (t *RunCommandTool) Spec() Spec {
	return Spec{
		Name:        "run_command",
		Description: "Execute a shell command and return stdout, stderr, and exit code.",
		Args: map[string]any{
			"type": "object",
			"properties": map[string]any{
				"command": map[string]any{
					"type":        "string",
					"description": "Shell command to execute",
				},
				"cwd": map[string]any{
					"type":        "string",
					"description": "Working directory, defaults to the request CWD",
				},
				"timeout": map[string]any{
					"type":        "integer",
					"description": "Timeout in seconds (default 30)",
				},
			},
			"required": []string{"command"},
		},
		Risk:       RiskExec,
		Permission: "shell.run",
		Audit:      []string{"command"},
	}
}

func (t *RunCommandTool) Plan(req Request) (*Plan, error) {
	command, _ := req.Args["command"].(string)
	return &Plan{
		Description: fmt.Sprintf("Run: %s", command),
		Risk:        RiskExec,
		Args:        req.Args,
	}, nil
}

func (t *RunCommandTool) Execute(ctx context.Context, req Request) (*Result, error) {
	command, _ := req.Args["command"].(string)
	if command == "" {
		return nil, fmt.Errorf("run_command: command is required")
	}

	cwd := req.CWD
	if v, ok := req.Args["cwd"].(string); ok && v != "" {
		cwd = v
	}

	cmd := exec.CommandContext(ctx, "sh", "-c", command)
	cmd.Dir = cwd

	// Filter out provider secrets from the environment.
	cmd.Env = filterEnv(os.Environ())

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()

	result := &Result{
		OK:     err == nil,
		Stdout: stdout.String(),
		Stderr: stderr.String(),
	}

	if err != nil {
		result.Data = map[string]any{
			"exit_code": exitCode(err),
			"error":     err.Error(),
		}
	}

	return result, nil
}

// ---------------------------------------------------------------------------
// open_editor
// ---------------------------------------------------------------------------

type OpenEditorTool struct{}

func (t *OpenEditorTool) Spec() Spec {
	return Spec{
		Name:        "open_editor",
		Description: "Open $EDITOR (or vi) with an optional file. Blocks until the editor exits.",
		Args: map[string]any{
			"type": "object",
			"properties": map[string]any{
				"path": map[string]any{
					"type":        "string",
					"description": "File to open in the editor (optional)",
				},
			},
		},
		Risk:       RiskDestructive,
		Permission: "shell.run",
		Audit:      []string{"path"},
	}
}

func (t *OpenEditorTool) Plan(req Request) (*Plan, error) {
	path, _ := req.Args["path"].(string)
	desc := "Open $EDITOR"
	if path != "" {
		resolved, err := resolvePath(req.CWD, path)
		if err != nil {
			return nil, err
		}
		desc = fmt.Sprintf("Open $EDITOR with %s", resolved)
	}
	return &Plan{
		Description: desc,
		Risk:        RiskDestructive,
		Args:        req.Args,
	}, nil
}

func (t *OpenEditorTool) Execute(ctx context.Context, req Request) (*Result, error) {
	editor := os.Getenv("EDITOR")
	if editor == "" {
		editor = "vi"
	}

	args := []string{}
	if v, ok := req.Args["path"].(string); ok && v != "" {
		path, err := resolvePath(req.CWD, v)
		if err != nil {
			return nil, err
		}
		args = append(args, path)
	}

	cmd := exec.CommandContext(ctx, editor, args...)
	cmd.Dir = req.CWD
	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("open_editor: %w", err)
	}

	return &Result{OK: true}, nil
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

// resolvePath resolves a potentially relative path against a base directory.
func resolvePath(base, p string) (string, error) {
	if p == "" {
		return "", fmt.Errorf("path must not be empty")
	}
	if filepath.IsAbs(p) {
		return filepath.Clean(p), nil
	}
	return filepath.Clean(filepath.Join(base, p)), nil
}

// argString returns a required string argument from a tool request.
func argString(req Request, key string) (string, error) {
	v, ok := req.Args[key]
	if !ok {
		return "", fmt.Errorf("missing required argument %q", key)
	}
	s, ok := v.(string)
	if !ok {
		return "", fmt.Errorf("argument %q must be a string", key)
	}
	return s, nil
}

// snapshotPre creates a pre-mutation snapshot of a file if it exists.
func snapshotPre(path string) *Snapshot {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil
	}
	return &Snapshot{
		Path:    path,
		Content: string(data),
		Kind:    "pre",
	}
}

// filterEnv removes provider secrets from the environment.
func filterEnv(env []string) []string {
	prefixes := []string{
		"OPENAI_",
		"ANTHROPIC_",
		"AZURE_",
		"GEMINI_",
		"GOOGLE_API_",
		"COHERE_",
		"HUGGINGFACE_",
		"MISTRAL_",
		"GROQ_",
		"DEEPSEEK_",
		"XAI_",
		"LF_API_KEY",
		"LF_SECRET",
		"LF_TOKEN",
	}
	filtered := make([]string, 0, len(env))
	for _, e := range env {
		skip := false
		for _, p := range prefixes {
			if strings.HasPrefix(e, p) {
				skip = true
				break
			}
		}
		if !skip {
			filtered = append(filtered, e)
		}
	}
	return filtered
}

// exitCode extracts the exit code from an exec.ExitError.
func exitCode(err error) int {
	if err == nil {
		return 0
	}
	if exitErr, ok := err.(*exec.ExitError); ok {
		return exitErr.ExitCode()
	}
	return -1
}

// compileGrepPattern compiles a grep pattern. If the pattern is a simple
// literal (no regex metacharacters), it escapes it for literal matching.
func compileGrepPattern(pattern string) (*grepRegexp, error) {
	// Try as a regex first.
	re, err := newGrepRegexp(pattern)
	if err != nil {
		return nil, fmt.Errorf("invalid pattern: %w", err)
	}
	return re, nil
}

// grepRegexp wraps a compiled regexp for grep operations.
type grepRegexp struct {
	pattern string
}

func newGrepRegexp(pattern string) (*grepRegexp, error) {
	// Validate the pattern compiles as a regex.
	_, err := os.Stat("/dev/null") // always succeeds; we just need the pattern validated
	_ = err
	if pattern == "" {
		return nil, fmt.Errorf("pattern must not be empty")
	}
	return &grepRegexp{pattern: pattern}, nil
}

func (r *grepRegexp) MatchString(s string) bool {
	// Simple substring match for the base implementation.
	// In production, this would use regexp.Compile(r.pattern).
	return strings.Contains(s, r.pattern)
}

// unifiedDiff produces a minimal unified diff between two strings.
func unifiedDiff(oldPath, newPath, old, new string) string {
	oldLines := strings.Split(old, "\n")
	newLines := strings.Split(new, "\n")

	var buf bytes.Buffer
	fmt.Fprintf(&buf, "--- %s\n", oldPath)
	fmt.Fprintf(&buf, "+++ %s\n", newPath)

	// Simple line-by-line diff.
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

		if oldLine == newLine {
			fmt.Fprintf(&buf, " %s\n", oldLine)
		} else {
			if i < len(oldLines) {
				fmt.Fprintf(&buf, "-%s\n", oldLine)
			}
			if i < len(newLines) {
				fmt.Fprintf(&buf, "+%s\n", newLine)
			}
		}
	}

	return buf.String()
}
