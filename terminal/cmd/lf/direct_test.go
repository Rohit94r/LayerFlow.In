package main

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/layerflow/terminal/internal/config"
)

func TestNormalizeProvider(t *testing.T) {
	cases := []struct {
		name     string
		flag     string
		cfgProv  string
		expected string
	}{
		{"flag wins", "Groq", "deepseek", "groq"},
		{"config used when no flag", "", "deepseek", "deepseek"},
		{"default fallback", "", "", "openai"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			cfg := &config.Config{Provider: tc.cfgProv}
			if got := normalizeProvider(tc.flag, cfg); got != tc.expected {
				t.Fatalf("normalizeProvider(%q) = %q, want %q", tc.flag, got, tc.expected)
			}
		})
	}
}

func TestProviderKeyResolution(t *testing.T) {
	t.Setenv("GROQ_API_KEY", "sk-groq-12345678")
	t.Setenv("XAI_API_KEY", "")

	cfg := &config.Config{Providers: map[string]config.ProviderConfig{
		"deepseek": {APIKey: "sk-deep-12345678"},
		"kimi":     {},
	}}

	cases := []struct {
		provider string
		fromEnv  string
		fromCfg  string
	}{
		{"groq", "sk-groq-12345678", ""},
		{"xai", "", ""},
		{"deepseek", "", "sk-deep-12345678"},
		{"kimi", "", ""},
		{"unknown", "", ""},
	}
	for _, tc := range cases {
		if got := providerKeyFromEnv(tc.provider); got != tc.fromEnv {
			t.Errorf("providerKeyFromEnv(%q) = %q, want %q", tc.provider, got, tc.fromEnv)
		}
		if got := stringsTrim(cfg.Providers[tc.provider].APIKey); got != tc.fromCfg {
			t.Errorf("cfg key for %q = %q, want %q", tc.provider, got, tc.fromCfg)
		}
	}
}

func TestResolveDirectClient(t *testing.T) {
	t.Run("env key + known base", func(t *testing.T) {
		t.Setenv("DEEPSEEK_API_KEY", "sk-dd-12345678")
		cfg := &config.Config{Provider: "deepseek"}
		client, provider, err := resolveDirectClient(cfg, "")
		if err != nil {
			t.Fatalf("resolveDirectClient: %v", err)
		}
		if provider != "deepseek" {
			t.Fatalf("provider = %q, want deepseek", provider)
		}
		if client.BaseURL() != "https://api.deepseek.com" {
			t.Fatalf("base = %q, want https://api.deepseek.com", client.BaseURL())
		}
	})

	t.Run("config key + custom base strips /v1", func(t *testing.T) {
		cfg := &config.Config{
			Provider: "openai",
			Providers: map[string]config.ProviderConfig{
				"openai": {APIKey: "sk-oai-12345678", BaseURL: "https://gateway.example.com/v1"},
			},
		}
		client, _, err := resolveDirectClient(cfg, "")
		if err != nil {
			t.Fatalf("resolveDirectClient: %v", err)
		}
		if client.BaseURL() != "https://gateway.example.com" {
			t.Fatalf("base = %q, want https://gateway.example.com", client.BaseURL())
		}
	})

	t.Run("no key anywhere", func(t *testing.T) {
		t.Setenv("GROQ_API_KEY", "")
		cfg := &config.Config{Provider: "groq", Providers: map[string]config.ProviderConfig{"groq": {}}}
		if _, _, err := resolveDirectClient(cfg, ""); err == nil {
			t.Fatal("expected error when no key is configured")
		}
	})

	t.Run("explicit base but no key", func(t *testing.T) {
		cfg := &config.Config{
			Provider: "anthropic",
			Providers: map[string]config.ProviderConfig{
				"anthropic": {BaseURL: "https://proxy.example.com"},
			},
		}
		if _, _, err := resolveDirectClient(cfg, ""); err == nil {
			t.Fatal("expected error for anthropic with no key")
		}
	})
}

func TestMaskKey(t *testing.T) {
	cases := []struct{ in, want string }{
		{"", "…"},
		{"sk-12345678", "sk-1…5678"},
		{"short", "••••"},
	}
	for _, tc := range cases {
		if got := maskKey(tc.in); got != tc.want {
			t.Errorf("maskKey(%q) = %q, want %q", tc.in, got, tc.want)
		}
	}
}

// TestConfigSubcommands exercises lf config mutation against an isolated HOME.
func TestConfigSubcommands(t *testing.T) {
	home := t.TempDir()
	t.Setenv("HOME", home)
	if err := os.MkdirAll(filepath.Join(home, ".config", "layerflow"), 0o700); err != nil {
		t.Fatal(err)
	}

	if err := setProviderKey([]string{"groq", "sk-groq-12345678"}, false); err != nil {
		t.Fatalf("setProviderKey: %v", err)
	}
	if err := setProviderURL([]string{"groq", "https://proxy.example.com/v1/"}, false); err != nil {
		t.Fatalf("setProviderURL: %v", err)
	}
	if err := getSetString([]string{"openai"}, cfgProvider, setProvider, "provider"); err != nil {
		t.Fatalf("set provider: %v", err)
	}

	cfg, err := config.Load("")
	if err != nil {
		t.Fatalf("load: %v", err)
	}
	if cfg.Provider != "openai" {
		t.Errorf("persisted provider = %q, want openai", cfg.Provider)
	}
	pc := cfg.Providers["groq"]
	if pc.APIKey != "sk-groq-12345678" {
		t.Errorf("persisted groq key = %q", pc.APIKey)
	}
	if pc.BaseURL != "https://proxy.example.com" {
		t.Errorf("persisted groq base = %q (should be trailing-slash-stripped)", pc.BaseURL)
	}

	// Read-only show forms must not error and must not leak full secrets.
	if err := setProviderKey([]string{"groq"}, false); err != nil {
		t.Fatal("key show failed")
	}
	if err := setProviderKey([]string{"groq"}, true); err != nil {
		t.Fatalf("unset key: %v", err)
	}
	if err := setProviderURL([]string{"groq"}, true); err != nil {
		t.Fatalf("unset base: %v", err)
	}
	cfg, _ = config.Load("")
	if cfg.Providers["groq"].APIKey != "" || cfg.Providers["groq"].BaseURL != "" {
		t.Fatal("expected groq overrides to be cleared")
	}

	if err := setProviderKey([]string{"groq", "tiny"}, false); err == nil {
		t.Fatal("expected reject of a too-short key")
	}
}

func stringsTrim(s string) string { return s }
