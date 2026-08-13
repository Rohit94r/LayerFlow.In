// Package project provides a project summary — a structured overview of a
// repository's architecture, commands, dependencies, and conventions.
package project

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
)

// ProjectSummary holds a structured overview of a project.
type ProjectSummary struct {
	ID           string
	ProjectPath  string
	Overview     string
	Architecture string
	CommandsJSON string
	DepsJSON     string
	Conventions  string
	DeployNotes  string
	TasksJSON    string
	GeneratedAt  int64
	UpdatedAt    int64
	SHA          string
}

// Store defines the interface for project-summary persistence.
type Store interface {
	Get(ctx context.Context, projectPath string) (*ProjectSummary, error)
	Save(ctx context.Context, p *ProjectSummary) error
	Generate(ctx context.Context, root string) (*ProjectSummary, error)
}

// SQLStore implements Store using SQLite.
type SQLStore struct {
	db *sql.DB
}

// NewSQLStore creates a new SQLite-backed project-summary store.
func NewSQLStore(db *sql.DB) *SQLStore {
	return &SQLStore{db: db}
}

// InitSchema creates the project_summaries table.
func (s *SQLStore) InitSchema(ctx context.Context) error {
	_, err := s.db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS project_summaries (
			id            TEXT PRIMARY KEY,
			project_path  TEXT NOT NULL UNIQUE,
			overview      TEXT NOT NULL DEFAULT '',
			architecture  TEXT NOT NULL DEFAULT '',
			commands_json TEXT NOT NULL DEFAULT '{}',
			deps_json     TEXT NOT NULL DEFAULT '{}',
			conventions   TEXT NOT NULL DEFAULT '',
			deploy_notes  TEXT NOT NULL DEFAULT '',
			tasks_json    TEXT NOT NULL DEFAULT '[]',
			generated_at  INTEGER NOT NULL,
			updated_at    INTEGER NOT NULL,
			sha           TEXT NOT NULL DEFAULT ''
		);

		CREATE INDEX IF NOT EXISTS idx_project_path ON project_summaries(project_path);
	`)
	return err
}

// Get retrieves a project summary by path.
func (s *SQLStore) Get(ctx context.Context, projectPath string) (*ProjectSummary, error) {
	p := &ProjectSummary{}
	err := s.db.QueryRowContext(ctx, `
		SELECT id, project_path, overview, architecture, commands_json,
			deps_json, conventions, deploy_notes, tasks_json,
			generated_at, updated_at, sha
		FROM project_summaries WHERE project_path = ?`, projectPath,
	).Scan(
		&p.ID, &p.ProjectPath, &p.Overview, &p.Architecture, &p.CommandsJSON,
		&p.DepsJSON, &p.Conventions, &p.DeployNotes, &p.TasksJSON,
		&p.GeneratedAt, &p.UpdatedAt, &p.SHA,
	)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("project summary not found for %s", projectPath)
	}
	return p, err
}

// Save inserts or replaces a project summary.
func (s *SQLStore) Save(ctx context.Context, p *ProjectSummary) error {
	if p.ID == "" {
		p.ID = uuid.New().String()
	}
	now := time.Now().UnixMilli()
	p.UpdatedAt = now

	_, err := s.db.ExecContext(ctx, `
		INSERT OR REPLACE INTO project_summaries
			(id, project_path, overview, architecture, commands_json,
				deps_json, conventions, deploy_notes, tasks_json,
				generated_at, updated_at, sha)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		p.ID, p.ProjectPath, p.Overview, p.Architecture, p.CommandsJSON,
		p.DepsJSON, p.Conventions, p.DeployNotes, p.TasksJSON,
		p.GeneratedAt, p.UpdatedAt, p.SHA,
	)
	return err
}

// Generate creates a project summary by analyzing the repository structure.
func (s *SQLStore) Generate(ctx context.Context, root string) (*ProjectSummary, error) {
	p := &ProjectSummary{
		ID:          uuid.New().String(),
		ProjectPath: root,
	}

	// Get current git SHA.
	p.SHA = getGitSHA(ctx, root)

	// Generate overview from README.
	p.Overview = generateOverview(ctx, root)

	// Generate architecture from directory structure.
	p.Architecture = generateArchitecture(ctx, root)

	// Extract commands from package.json / go.mod / Makefile.
	p.CommandsJSON = generateCommands(ctx, root)

	// Extract dependencies.
	p.DepsJSON = generateDeps(ctx, root)

	// Infer conventions.
	p.Conventions = generateConventions(ctx, root)

	now := time.Now().UnixMilli()
	p.GeneratedAt = now
	p.UpdatedAt = now

	return p, nil
}

func getGitSHA(ctx context.Context, root string) string {
	cmd := exec.CommandContext(ctx, "git", "rev-parse", "HEAD")
	cmd.Dir = root
	out, err := cmd.Output()
	if err != nil {
		return ""
	}
	return strings.TrimSpace(string(out))
}

func generateOverview(ctx context.Context, root string) string {
	// Try README.md first, then README.
	for _, name := range []string{"README.md", "README", "readme.md"} {
		path := filepath.Join(root, name)
		data, err := os.ReadFile(path)
		if err != nil {
			continue
		}
		content := string(data)
		// Extract first paragraph (non-empty lines before first blank line).
		lines := strings.Split(content, "\n")
		var overview []string
		for _, line := range lines {
			trimmed := strings.TrimSpace(line)
			if trimmed == "" && len(overview) > 0 {
				break
			}
			if trimmed != "" && !strings.HasPrefix(trimmed, "#") {
				overview = append(overview, trimmed)
			}
		}
		if len(overview) > 0 {
			return strings.Join(overview, " ")
		}
	}
	return ""
}

func generateArchitecture(ctx context.Context, root string) string {
	// Walk top-level directories to describe structure.
	entries, err := os.ReadDir(root)
	if err != nil {
		return ""
	}

	var dirs []string
	for _, e := range entries {
		if e.IsDir() && !strings.HasPrefix(e.Name(), ".") &&
			e.Name() != "node_modules" && e.Name() != "vendor" {
			dirs = append(dirs, e.Name())
		}
	}

	if len(dirs) == 0 {
		return ""
	}

	return fmt.Sprintf("Top-level directories: %s", strings.Join(dirs, ", "))
}

func generateCommands(ctx context.Context, root string) string {
	commands := make(map[string]string)

	// Check package.json scripts.
	pkgPath := filepath.Join(root, "package.json")
	if data, err := os.ReadFile(pkgPath); err == nil {
		var pkg struct {
			Scripts map[string]string `json:"scripts"`
		}
		if json.Unmarshal(data, &pkg) == nil {
			for name, cmd := range pkg.Scripts {
				commands[name] = cmd
			}
		}
	}

	// Check Makefile targets.
	makePath := filepath.Join(root, "Makefile")
	if data, err := os.ReadFile(makePath); err == nil {
		lines := strings.Split(string(data), "\n")
		for _, line := range lines {
			line = strings.TrimSpace(line)
			if strings.HasSuffix(line, ":") && !strings.HasPrefix(line, "\t") {
				target := strings.TrimSuffix(line, ":")
				if target != "" && !strings.Contains(target, "$") {
					commands[target] = fmt.Sprintf("make %s", target)
				}
			}
		}
	}

	data, _ := json.MarshalIndent(commands, "", "  ")
	return string(data)
}

func generateDeps(ctx context.Context, root string) string {
	deps := make(map[string]string)

	// Go modules.
	goModPath := filepath.Join(root, "go.mod")
	if data, err := os.ReadFile(goModPath); err == nil {
		lines := strings.Split(string(data), "\n")
		inRequire := false
		for _, line := range lines {
			line = strings.TrimSpace(line)
			if line == "require (" {
				inRequire = true
				continue
			}
			if inRequire && line == ")" {
				inRequire = false
				continue
			}
			if inRequire {
				parts := strings.Fields(line)
				if len(parts) >= 2 {
					deps[parts[0]] = parts[1]
				}
			}
		}
	}

	// Node dependencies.
	pkgPath := filepath.Join(root, "package.json")
	if data, err := os.ReadFile(pkgPath); err == nil {
		var pkg struct {
			Deps    map[string]string `json:"dependencies"`
			DevDeps map[string]string `json:"devDependencies"`
		}
		if json.Unmarshal(data, &pkg) == nil {
			for name, ver := range pkg.Deps {
				deps[name] = ver
			}
			for name, ver := range pkg.DevDeps {
				deps[name+" (dev)"] = ver
			}
		}
	}

	data, _ := json.MarshalIndent(deps, "", "  ")
	return string(data)
}

func generateConventions(ctx context.Context, root string) string {
	var conventions []string

	// Check for common config files.
	configs := map[string]string{
		".editorconfig":     "EditorConfig",
		".prettierrc":       "Prettier",
		".eslintrc":         "ESLint",
		"eslint.config.mjs": "ESLint",
		".golangci.yml":     "golangci-lint",
		"tsconfig.json":     "TypeScript",
		"go.mod":            "Go modules",
		".gitignore":        "Git ignore patterns",
	}

	for file, name := range configs {
		path := filepath.Join(root, file)
		if _, err := os.Stat(path); err == nil {
			conventions = append(conventions, fmt.Sprintf("- Uses %s (see %s)", name, file))
		}
	}

	if len(conventions) == 0 {
		return ""
	}
	return strings.Join(conventions, "\n")
}
