package config

import (
	"os"
	"path/filepath"

	"github.com/layerflow/terminal/internal/ui/models"
)

type AgentName string

const (
	AgentCoder      AgentName = "coder"
	AgentSummarizer AgentName = "summarizer"
	AgentTask       AgentName = "task"
	AgentTitle      AgentName = "title"
)

// Agent defines configuration for different LLM models and their token limits.
type Agent struct {
	Model           models.ModelID `json:"model"`
	MaxTokens       int64          `json:"maxTokens"`
	ReasoningEffort string         `json:"reasoningEffort"`
}

// Provider defines configuration for an LLM provider.
type Provider struct {
	APIKey   string `json:"apiKey"`
	Disabled bool   `json:"disabled"`
}

// Data defines storage configuration.
type Data struct {
	Directory string `json:"directory,omitempty"`
}

// LSPConfig defines configuration for Language Server Protocol integration.
type LSPConfig struct {
	Disabled bool     `json:"enabled"`
	Command  string   `json:"command"`
	Args     []string `json:"args"`
	Options  any      `json:"options"`
}

// TUIConfig defines the configuration for the Terminal User Interface.
type TUIConfig struct {
	Theme string `json:"theme,omitempty"`
}

// Config is the main configuration structure for the UI + backend.
type Config struct {
	Data         Data                              `json:"data"`
	WorkingDir   string                            `json:"wd,omitempty"`
	Providers    map[models.ModelProvider]Provider `json:"providers,omitempty"`
	LSP          map[string]LSPConfig              `json:"lsp,omitempty"`
	Agents       map[AgentName]Agent               `json:"agents,omitempty"`
	Debug        bool                              `json:"debug,omitempty"`
	DebugLSP     bool                              `json:"debugLSP,omitempty"`
	ContextPaths []string                          `json:"contextPaths,omitempty"`
	TUI          TUIConfig                         `json:"tui"`
	AutoCompact  bool                              `json:"autoCompact,omitempty"`
}

var current *Config

// Set installs the runtime configuration populated by the LayerFlow backend.
func Set(cfg *Config) {
	current = cfg
}

func Get() *Config {
	if current == nil {
		current = &Config{
			Agents: map[AgentName]Agent{},
			LSP:    map[string]LSPConfig{},
		}
	}
	return current
}

func WorkingDirectory() string {
	return Get().WorkingDir
}

const memoryFileName = "AGENTS.md"

func ShouldShowInitDialog() (bool, error) {
	if WorkingDirectory() == "" {
		return false, nil
	}
	path := filepath.Join(WorkingDirectory(), memoryFileName)
	if _, err := os.Stat(path); err == nil {
		return false, nil
	}
	return true, nil
}

func MarkProjectInitialized() error {
	if WorkingDirectory() == "" {
		return nil
	}
	path := filepath.Join(WorkingDirectory(), memoryFileName)
	if _, err := os.Stat(path); err == nil {
		return nil
	}
	return os.WriteFile(path, []byte("# Agents\n\n"), 0o644)
}

// UpdateTheme persists the selected theme name.
func UpdateTheme(themeName string) error {
	Get().TUI.Theme = themeName
	return ApplyThemePersistence(themeName)
}

// ApplyThemePersistence is set by the run layer to persist theme changes.
var ApplyThemePersistence = func(_ string) error { return nil }
