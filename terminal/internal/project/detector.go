// Repository context detection — identifies project metadata from common
// config files (package.json, go.mod, requirements.txt, etc.) and builds a
// project context index for agent use.
package project

// ContextFile describes an important config file found in the repository.
type ContextFile struct {
	Path    string `json:"path"`
	Type    string `json:"type"`
	Summary string `json:"summary"`
}

// ProjectContext is the full context index for a repository.
type ProjectContext struct {
	RootPath    string        `json:"root_path"`
	FileTree    []string      `json:"file_tree"`
	ConfigFiles []ContextFile `json:"config_files"`
	GitState    GitState      `json:"git_state"`
	Language    string        `json:"language"`
	BuildSystem string        `json:"build_system"`
}

// GitState captures current git status.
type GitState struct {
	Branch      string   `json:"branch"`
	Commit      string   `json:"commit"`
	HasUnstaged bool     `json:"has_unstaged"`
	Remotes     []string `json:"remotes"`
}