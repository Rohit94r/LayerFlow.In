package main

import (
	"fmt"
	"os"
	"strings"

	"github.com/layerflow/terminal/internal/cloud"
	"github.com/layerflow/terminal/internal/config"
)

// providerEnvVars maps a provider name to the conventional API-key
// environment variables used by its first-party SDK/CLI tooling. The first
// non-empty variable wins.
var providerEnvVars = map[string][]string{
	"openai":     {"OPENAI_API_KEY"},
	"anthropic":  {"ANTHROPIC_API_KEY"},
	"google":     {"GEMINI_API_KEY", "GOOGLE_API_KEY"},
	"deepseek":   {"DEEPSEEK_API_KEY"},
	"groq":       {"GROQ_API_KEY"},
	"xai":        {"XAI_API_KEY", "GROK_API_KEY"},
	"kimi":       {"KIMI_API_KEY", "MOONSHOT_API_KEY"},
	"openrouter": {"OPENROUTER_API_KEY"},
}

// openAICompatBases holds providers with a well-known OpenAI-compatible
// surface whose base URL (scheme + host, no /v1) is safe to default to. The
// cloud client appends /v1/chat/completions to this base.
var openAICompatBases = map[string]string{
	"openai":     "https://api.openai.com",
	"groq":       "https://api.groq.com",
	"deepseek":   "https://api.deepseek.com",
	"xai":        "https://api.xai.com",
	"kimi":       "https://api.moonshot.ai",
	"openrouter": "https://openrouter.ai/api",
}

// providerEnvVar returns the primary env var name for a provider, or "".
func providerEnvVar(provider string) string {
	vars := providerEnvVars[provider]
	if len(vars) == 0 {
		return ""
	}
	return vars[0]
}

// providerKeyFromEnv returns the first non-empty provider API key from the
// environment, or "".
func providerKeyFromEnv(provider string) string {
	for _, name := range providerEnvVars[provider] {
		if v := strings.TrimSpace(os.Getenv(name)); v != "" {
			return v
		}
	}
	return ""
}

// normalizeProvider returns the effective provider name from a flag, config,
// or the default.
func normalizeProvider(flag string, cfg *config.Config) string {
	if p := strings.ToLower(strings.TrimSpace(flag)); p != "" {
		return p
	}
	if cfg != nil {
		if p := strings.ToLower(strings.TrimSpace(cfg.Provider)); p != "" {
			return p
		}
	}
	return "openai"
}

// resolveDirectClient builds an OpenAI-compatible client pointed straight at a
// provider from an API key on disk (config providers.<name>.api_key) or in the
// conventional environment variable. Returns the client and the resolved
// provider name, or an error with guidance when nothing is configured.
func resolveDirectClient(cfg *config.Config, providerFlag string) (*cloud.Client, string, error) {
	provider := normalizeProvider(providerFlag, cfg)

	apiKey := providerKeyFromEnv(provider)
	if apiKey == "" {
		apiKey = strings.TrimSpace(cfg.Providers[provider].APIKey)
	}
	if apiKey == "" {
		return nil, provider, fmt.Errorf(
			"no API key for provider %q — set %s in the environment, run `lf config key %s <key>`, or route through LayerFlow with `lf login`",
			provider, envNameDisplay(provider), provider)
	}

	base := strings.TrimSpace(cfg.Providers[provider].BaseURL)
	if base == "" {
		base = openAICompatBases[provider]
	}
	if base == "" {
		return nil, provider, fmt.Errorf(
			"provider %q has no known OpenAI-compatible base URL — run `lf config base-url %s <url>` first",
			provider, provider)
	}
	base = strings.TrimSuffix(base, "/")
	base = strings.TrimSuffix(base, "/v1")

	return cloud.NewClient(base, apiKey), provider, nil
}

// envNameDisplay prettifies the env var hint for a provider.
func envNameDisplay(provider string) string {
	if name := providerEnvVar(provider); name != "" {
		return name
	}
	return provider + " API key"
}
