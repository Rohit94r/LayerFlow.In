package main

import (
	"bufio"
	"context"
	"errors"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/zalando/go-keyring"

	"github.com/layerflow/terminal/internal/auth"
	"github.com/layerflow/terminal/internal/cloud"
	"github.com/layerflow/terminal/internal/config"
)

// performLogin authenticates the CLI with a LayerFlow workspace API key
// (lf_live_...), validating it against the cloud before storing it in the
// OS keyring. The key comes from LF_API_KEY or an interactive prompt.
func performLogin() error {
	key := strings.TrimSpace(os.Getenv("LF_API_KEY"))
	if key == "" {
		cfg, err := config.Load("")
		if err == nil && strings.TrimSpace(cfg.APIKey) != "" {
			key = strings.TrimSpace(cfg.APIKey)
		}
	}
	if key == "" {
		fmt.Print("Paste your LayerFlow API key (lf_live_...): ")
		scanner := bufio.NewScanner(os.Stdin)
		if !scanner.Scan() {
			return errors.New("no API key entered")
		}
		key = strings.TrimSpace(scanner.Text())
	}
	if !strings.HasPrefix(key, "lf_live_") {
		return errors.New("that does not look like a LayerFlow API key (expected lf_live_…)")
	}

	cfg, err := config.Load("")
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}
	baseURL := cloud.ResolveBaseURL(cfg)
	client := cloud.NewClient(baseURL, key)

	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	fmt.Printf("Checking key against %s…\n", baseURL)
	if err := client.Validate(ctx); err != nil {
		if errors.Is(err, cloud.ErrInvalidKey) {
			return errors.New("that API key was rejected. Generate a workspace key in the dashboard: Settings → API Keys.")
		}
		return fmt.Errorf("could not reach LayerFlow: %w", err)
	}

	if err := auth.SetAPIKey(key); err != nil {
		// The OS keyring may be unavailable (headless shells, locked keychain,
		// sandboxes). Fall back to storing the key in the config file so the
		// CLI stays usable; warn so the user knows it is not keyring-encrypted.
		if ferr := storeAPIKeyInConfig(cfg, key); ferr != nil {
			return fmt.Errorf("store API key (keyring and config both failed): %v; keyring error: %w", ferr, err)
		}
		fmt.Println("Authenticated. API key stored in config file (OS keyring unavailable).")
		fmt.Println("Get started: lf chat \"hello\" · lf sync · lf run \"build a landing page\"")
		return nil
	}
	fmt.Println("Authenticated. API key stored securely in your OS keyring.")
	fmt.Println("Get started: lf chat \"hello\" · lf sync · lf run \"build a landing page\"")
	return nil
}

// storeAPIKeyInConfig persists the API key into the user config file so it
// survives restart when the OS keyring is not available.
func storeAPIKeyInConfig(cfg *config.Config, key string) error {
	if err := cfg.SetAPIKey(key); err != nil {
		return err
	}
	return cfg.Save()
}

// performLogout revokes the stored refresh token and clears the API key.
func performLogout() error {
	a := auth.New()
	if err := a.Logout(); err != nil && !errors.Is(err, keyring.ErrNotFound) {
		return fmt.Errorf("logout: %w", err)
	}
	if err := auth.ClearAPIKey(); err != nil && !errors.Is(err, keyring.ErrNotFound) {
		return fmt.Errorf("logout: %w", err)
	}
	fmt.Println("Logged out.")
	return nil
}
