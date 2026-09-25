package main

import (
	"fmt"
	"sort"
	"strings"

	"github.com/layerflow/terminal/internal/cloud"
	"github.com/layerflow/terminal/internal/config"
	"github.com/spf13/cobra"
)

// newConfigCmd creates the `lf config` command group.
func newConfigCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "config",
		Short: "View or set LayerFlow configuration",
		Long: `View or update the user configuration stored at ~/.config/layerflow/config.yaml.

Run ` + "`lf config`" + ` alone to see the effective settings. Subcommands set a single
value; secrets are never printed back in full:

  lf config provider [NAME]          default provider (openai, deepseek, groq, ...)
  lf config model [ID]               default model identifier
  lf config base-url PROVIDER [URL]  OpenAI-compatible base URL for a provider
  lf config key PROVIDER [KEY]       provider API key (direct mode, no gateway)
  lf config api-url [URL]            LayerFlow gateway / sync URL
  lf config api-key [KEY]            LayerFlow workspace API key (lf_live_...)

Subcommands accept --unset to clear a stored value.`,
		RunE: func(cmd *cobra.Command, args []string) error {
			return showEffectiveConfig()
		},
	}

	cmd.AddCommand(
		&cobra.Command{
			Use:   "provider [name]",
			Short: "Show or set the default provider",
			Args:  cobra.MaximumNArgs(1),
			RunE: func(cmd *cobra.Command, args []string) error {
				return getSetString(args, cfgProvider, setProvider, "provider")
			},
		},
		&cobra.Command{
			Use:   "model [id]",
			Short: "Show or set the default model",
			Args:  cobra.MaximumNArgs(1),
			RunE: func(cmd *cobra.Command, args []string) error {
				return getSetString(args, cfgModel, setModel, "model")
			},
		},
		&cobra.Command{
			Use:   "api-url [url]",
			Short: "Show or set the LayerFlow gateway URL",
			Args:  cobra.MaximumNArgs(1),
			RunE: func(cmd *cobra.Command, args []string) error {
				return getSetString(args, cfgAPIURL, setAPIURL, "api url")
			},
		},
		&cobra.Command{
			Use:   "api-key [key]",
			Short: "Show or set the LayerFlow workspace API key",
			Args:  cobra.MaximumNArgs(1),
			RunE: func(cmd *cobra.Command, args []string) error {
				return getSetString(args, cfgAPIKey, setAPIKeyCfg, "api key")
			},
		},
		&cobra.Command{
			Use:   "base-url <provider> [url]",
			Short: "Show or set an OpenAI-compatible base URL for a provider",
			Args:  cobra.RangeArgs(1, 2),
			RunE: func(cmd *cobra.Command, args []string) error {
				unset, _ := cmd.Flags().GetBool("unset")
				return setProviderURL(args, unset)
			},
		},
		&cobra.Command{
			Use:   "key <provider> [key]",
			Short: "Show or set a provider API key for direct mode",
			Args:  cobra.RangeArgs(1, 2),
			RunE: func(cmd *cobra.Command, args []string) error {
				unset, _ := cmd.Flags().GetBool("unset")
				return setProviderKey(args, unset)
			},
		},
	)

	for _, sub := range cmd.Commands() {
		if sub.Use == "base-url <provider> [url]" || sub.Use == "key <provider> [key]" {
			sub.Flags().Bool("unset", false, "clear the stored value")
		}
	}

	return cmd
}

// Accessors + setters used by getSetString.

func cfgProvider(c *config.Config) string     { return c.Provider }
func cfgModel(c *config.Config) string        { return c.Model }
func cfgAPIURL(c *config.Config) string       { return c.APIURL }
func cfgAPIKey(c *config.Config) string       { return c.APIKey }
func setProvider(c *config.Config, v string)  { c.Provider = v }
func setModel(c *config.Config, v string)     { c.Model = v }
func setAPIURL(c *config.Config, v string)    { c.APIURL = v }
func setAPIKeyCfg(c *config.Config, v string) { c.APIKey = v }

func showEffectiveConfig() error {
	cfg, err := config.Load("")
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}

	fmt.Println("LayerFlow config")
	fmt.Println("────────────────")
	fmt.Printf("  provider:      %-18s (env/default effective: %s)\n", strOr(cfg.Provider, "none"), normalizeProvider("", cfg))
	fmt.Printf("  model:         %-18s\n", strOr(cfg.Model, "none"))
	fmt.Printf("  api url:       %-18s (effective: %s)\n", strOr(cfg.APIURL, "(default)"), cloud.ResolveBaseURL(cfg))
	fmt.Printf("  api key:       %s\n", resolvedKeyStatus())

	if len(cfg.Providers) == 0 && len(openAICompatBases) > 0 {
		fmt.Println()
		fmt.Println("  No per-provider overrides configured.")
		fmt.Println("  Use `lf config base-url PROVIDER [URL]` and `lf config key PROVIDER [KEY]`.")
		return nil
	}

	fmt.Println()
	fmt.Println("  Providers (sorted):")
	names := make([]string, 0, len(cfg.Providers))
	for name := range cfg.Providers {
		names = append(names, name)
	}
	sort.Strings(names)
	for _, name := range names {
		pc := cfg.Providers[name]
		base := strOr(pc.BaseURL, openAICompatBases[name])
		if base == "" {
			base = "(none — set with `lf config base-url " + name + " <url>`)"
		}
		fmt.Printf("    %-12s base-url: %s\n", name, base)
		fmt.Printf("               key: %s\n", providerKeyStatus(name, pc))
	}

	fmt.Println()
	fmt.Println("  API key precedence: LF_API_KEY > OS keyring > config api_key")
	fmt.Println("  Provider base URL precedence: providers.<name>.base_url > known default")
	return nil
}

// resolvedKeyStatus reports whether a LayerFlow API key is available without
// printing the secret itself.
func resolvedKeyStatus() string {
	cfg, err := config.Load("")
	if err != nil {
		return "unknown"
	}
	if _, err := cloud.ResolveAPIKey(cfg); err == nil {
		raw, _ := cloud.ResolveAPIKey(cfg)
		return "set (effective, " + maskKey(raw) + ")"
	}
	return "not set — run `lf login` or set LF_API_KEY to use the gateway"
}

// providerKeyStatus shows a provider key's source + masked value.
func providerKeyStatus(name string, pc config.ProviderConfig) string {
	fromEnv := providerKeyFromEnv(name)
	if fromEnv != "" {
		return "set via env (" + providerEnvVar(name) + ", " + maskKey(fromEnv) + ")"
	}
	if strings.TrimSpace(pc.APIKey) != "" {
		return "set via config (" + maskKey(pc.APIKey) + ")"
	}
	return "not set — use `lf config key " + name + " <key>` or an env var"
}

// getSetString shows a scalar setting, or stores a new value when one is given.
func getSetString(args []string, get func(*config.Config) string, set func(*config.Config, string), label string) error {
	cfg, err := config.Load("")
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}
	if len(args) == 0 {
		fmt.Printf("  %s: %s\n", label, strOr(get(cfg), "none"))
		return nil
	}
	value := strings.TrimSpace(args[0])
	if value == "" {
		return fmt.Errorf("value cannot be empty (use the config file to clear it)")
	}
	set(cfg, value)
	if err := cfg.Save(); err != nil {
		return fmt.Errorf("save config: %w", err)
	}
	if strings.Contains(label, "key") {
		fmt.Printf("  %s: set (%s)\n", label, maskKey(value))
		return nil
	}
	fmt.Printf("  %s: %s\n", label, value)
	return nil
}

func setProviderURL(args []string, unset bool) error {
	provider := normalizeProvider(args[0], nil)
	cfg, err := config.Load("")
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}

	if len(args) == 1 && !unset {
		base := strings.TrimSpace(cfg.Providers[provider].BaseURL)
		if base == "" {
			base = openAICompatBases[provider]
		}
		if base == "" {
			return fmt.Errorf("no base URL for provider %q", provider)
		}
		fmt.Printf("  base-url %-10s %s\n", provider, base)
		return nil
	}

	if cfg.Providers == nil {
		cfg.Providers = map[string]config.ProviderConfig{}
	}
	pc := cfg.Providers[provider]
	pc.BaseURL = ""
	if !unset {
		pc.BaseURL = strings.TrimSuffix(strings.TrimSpace(args[1]), "/")
		pc.BaseURL = strings.TrimSuffix(pc.BaseURL, "/v1")
		if !strings.HasPrefix(pc.BaseURL, "http://") && !strings.HasPrefix(pc.BaseURL, "https://") {
			return fmt.Errorf("base URL must start with http:// or https://")
		}
	}
	cfg.Providers[provider] = pc
	if err := cfg.Save(); err != nil {
		return fmt.Errorf("save config: %w", err)
	}
	if unset {
		fmt.Printf("  Cleared base-url for %s\n", provider)
	} else {
		fmt.Printf("  base-url %-10s %s\n", provider, pc.BaseURL)
	}
	return nil
}

func setProviderKey(args []string, unset bool) error {
	provider := normalizeProvider(args[0], nil)
	cfg, err := config.Load("")
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}

	if len(args) == 1 && !unset {
		fromEnv := providerKeyFromEnv(provider)
		fromCfg := strings.TrimSpace(cfg.Providers[provider].APIKey)
		if fromEnv == "" && fromCfg == "" {
			return fmt.Errorf("no key for provider %q (set %s or run `lf config key %s <key>`)", provider, envNameDisplay(provider), provider)
		}
		fmt.Printf("  key %-10s %s\n", provider, providerKeyStatus(provider, cfg.Providers[provider]))
		return nil
	}

	if cfg.Providers == nil {
		cfg.Providers = map[string]config.ProviderConfig{}
	}
	pc := cfg.Providers[provider]
	pc.APIKey = ""
	if !unset {
		pc.APIKey = strings.TrimSpace(args[1])
		if len(pc.APIKey) < 8 {
			return fmt.Errorf("API key looks too short (%d chars)", len(pc.APIKey))
		}
	}
	cfg.Providers[provider] = pc
	if err := cfg.Save(); err != nil {
		return fmt.Errorf("save config: %w", err)
	}
	if unset {
		fmt.Printf("  Cleared key for %s\n", provider)
	} else {
		fmt.Printf("  key %-10s %s\n", provider, maskKey(pc.APIKey))
	}
	return nil
}

// maskKey shows only the leading and trailing few characters of a secret.
func maskKey(key string) string {
	k := strings.TrimSpace(key)
	if k == "" {
		return "…"
	}
	if len(k) <= 8 {
		return "••••"
	}
	return k[:4] + "…" + k[len(k)-4:]
}

func strOr(s, fallback string) string {
	if strings.TrimSpace(s) == "" {
		return fallback
	}
	return s
}
