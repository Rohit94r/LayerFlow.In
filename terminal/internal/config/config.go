// Package config provides a layered configuration system for LayerFlow.
//
// Priority order (highest wins): project > user > default.
package config

import (
	"fmt"
	"os"
	"path/filepath"

	"gopkg.in/yaml.v3"
)

// Config holds the full merged configuration.
type Config struct {
	// Model is the default LLM model identifier.
	Model string `yaml:"model"`
	// Provider is the default LLM provider key.
	Provider string `yaml:"provider"`
	// Scope defines the permission scope (e.g. "project", "global").
	Scope string `yaml:"scope"`
	// Permissions maps tool keys to their default decisions.
	Permissions map[string]string `yaml:"permissions"`
	// Memory enables or disables the memory subsystem.
	Memory bool `yaml:"memory"`
	// Telemetry enables or disables anonymous usage telemetry.
	Telemetry bool `yaml:"telemetry"`
	// Editor holds editor-related settings.
	Editor EditorConfig `yaml:"editor"`
	// Sync holds sync/replication settings.
	Sync SyncConfig `yaml:"sync"`
	// Daemon holds background daemon settings.
	Daemon DaemonConfig `yaml:"daemon"`
	// APIKey is the LayerFlow workspace API key (lf_live_...) used to call the cloud.
	APIKey string `yaml:"api_key"`
	// APIURL is the base URL of the LayerFlow cloud (gateway + sync).
	APIURL string `yaml:"api_url"`
	// Providers holds per-provider configuration.
	Providers map[string]ProviderConfig `yaml:"providers"`
	// MCPServers holds MCP server configurations.
	MCPServers map[string]MCPServerConfig `yaml:"mcp_servers"`
}

// EditorConfig holds editor settings.
type EditorConfig struct {
	// Command is the editor command to invoke (e.g. "code", "vim").
	Command string `yaml:"command"`
	// Args are additional arguments passed to the editor.
	Args []string `yaml:"args"`
	// MaxFileSize is the maximum file size in bytes for editor integration.
	MaxFileSize int64 `yaml:"max_file_size"`
}

// SyncConfig holds sync/replication settings.
type SyncConfig struct {
	// Enabled toggles sync.
	Enabled bool `yaml:"enabled"`
	// RemoteURL is the sync server URL.
	RemoteURL string `yaml:"remote_url"`
	// IntervalSeconds is the sync interval in seconds.
	IntervalSeconds int `yaml:"interval_seconds"`
}

// DaemonConfig holds background daemon settings.
type DaemonConfig struct {
	// Enabled toggles the background daemon.
	Enabled bool `yaml:"enabled"`
	// Port is the daemon RPC port.
	Port int `yaml:"port"`
}

// ProviderConfig holds settings for a single LLM provider.
type ProviderConfig struct {
	// APIKey is the provider API key (stored in keyring in production).
	APIKey string `yaml:"api_key"`
	// BaseURL is the provider's base API URL.
	BaseURL string `yaml:"base_url"`
	// MaxTokens is the maximum tokens for requests to this provider.
	MaxTokens int `yaml:"max_tokens"`
}

// MCPServerConfig holds an MCP server configuration.
type MCPServerConfig struct {
	// Command is the server command.
	Command string `yaml:"command"`
	// Args are the server command arguments.
	Args []string `yaml:"args"`
	// Env holds environment variables for the server process.
	Env map[string]string `yaml:"env"`
}

// defaults returns a Config populated with built-in defaults.
func defaults() *Config {
	return &Config{
		Model:       "deepseek-chat",
		Provider:    "deepseek",
		Scope:       "project",
		Permissions: map[string]string{},
		Memory:      true,
		Telemetry:   true,
		Editor: EditorConfig{
			Command:     "",
			Args:        []string{},
			MaxFileSize: 1024 * 1024,
		},
		Sync: SyncConfig{
			Enabled:         false,
			RemoteURL:       "",
			IntervalSeconds: 300,
		},
		Daemon: DaemonConfig{
			Enabled: false,
			Port:    9876,
		},
		Providers:  map[string]ProviderConfig{},
		MCPServers: map[string]MCPServerConfig{},
	}
}

// Load merges configuration layers and returns the result.
// projectDir is used to locate .layerflow/config.yaml; pass "" to skip.
func Load(projectDir string) (*Config, error) {
	cfg := defaults()

	userPath, err := userConfigPath()
	if err != nil {
		return nil, fmt.Errorf("resolve user config path: %w", err)
	}

	projectPath := ""
	if projectDir != "" {
		projectPath = filepath.Join(projectDir, ".layerflow", "config.yaml")
	}

	// Merge user config.
	if err := mergeFile(cfg, userPath); err != nil {
		return nil, fmt.Errorf("merge user config: %w", err)
	}

	// Merge project config.
	if projectPath != "" {
		if err := mergeFile(cfg, projectPath); err != nil {
			return nil, fmt.Errorf("merge project config: %w", err)
		}
	}

	return cfg, nil
}

// mergeFile reads a YAML file and merges its values into cfg.
func mergeFile(cfg *Config, path string) error {
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil // file absent — nothing to merge
		}
		return fmt.Errorf("read %s: %w", path, err)
	}

	override := &Config{}
	if err := yaml.Unmarshal(data, override); err != nil {
		return fmt.Errorf("parse %s: %w", path, err)
	}

	applyOverride(cfg, override)
	return nil
}

// applyOverride applies non-zero values from override into base.
func applyOverride(base, override *Config) {
	if override.Model != "" {
		base.Model = override.Model
	}
	if override.Provider != "" {
		base.Provider = override.Provider
	}
	if override.Scope != "" {
		base.Scope = override.Scope
	}
	if len(override.Permissions) > 0 {
		for k, v := range override.Permissions {
			base.Permissions[k] = v
		}
	}
	// Bool fields are always overwritten when a layer sets them.
	base.Memory = override.Memory || base.Memory
	base.Telemetry = override.Telemetry || base.Telemetry

	if override.Editor.Command != "" {
		base.Editor.Command = override.Editor.Command
	}
	if len(override.Editor.Args) > 0 {
		base.Editor.Args = override.Editor.Args
	}
	if override.Editor.MaxFileSize > 0 {
		base.Editor.MaxFileSize = override.Editor.MaxFileSize
	}

	if override.Sync.RemoteURL != "" {
		base.Sync.RemoteURL = override.Sync.RemoteURL
	}
	if override.Sync.IntervalSeconds > 0 {
		base.Sync.IntervalSeconds = override.Sync.IntervalSeconds
	}
	// Only enable sync if the override explicitly sets it.
	if override.Sync.Enabled {
		base.Sync.Enabled = true
	}

	if override.APIKey != "" {
		base.APIKey = override.APIKey
	}
	if override.APIURL != "" {
		base.APIURL = override.APIURL
	}

	if override.Daemon.Port > 0 {
		base.Daemon.Port = override.Daemon.Port
	}
	if override.Daemon.Enabled {
		base.Daemon.Enabled = true
	}

	for k, v := range override.Providers {
		if base.Providers == nil {
			base.Providers = map[string]ProviderConfig{}
		}
		base.Providers[k] = v
	}

	for k, v := range override.MCPServers {
		if base.MCPServers == nil {
			base.MCPServers = map[string]MCPServerConfig{}
		}
		base.MCPServers[k] = v
	}
}

func userConfigPath() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(home, ".config", "layerflow", "config.yaml"), nil
}

// SetAPIKey sets the workspace API key on the configuration.
func (c *Config) SetAPIKey(key string) error {
	c.APIKey = key
	return nil
}

// Save persists the configuration to the user config file, merging with any
// existing file so unrelated settings are not clobbered.
func (c *Config) Save() error {
	path, err := userConfigPath()
	if err != nil {
		return err
	}

	existing := &Config{}
	if data, err := os.ReadFile(path); err == nil {
		_ = yaml.Unmarshal(data, existing)
	}
	applyOverride(existing, c)

	if err := os.MkdirAll(filepath.Dir(path), 0o700); err != nil {
		return err
	}
	data, err := yaml.Marshal(existing)
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0o600)
}
