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

// performLogin authenticates the CLI. By default it uses the browser
// device-code flow: the server mints a workspace API key on approval and
// returns it as the OAuth access_token, which we store as the CLI's platform
// key. If the device endpoint is unreachable or the user passes --api-key
// (or sets LF_API_KEY), it falls back to pasting a platform key.
//
// There are two kinds of LayerFlow keys:
//   - Platform keys (lf_live_...) — LayerFlow-hosted, billed through your
//     plan. This is what the CLI uses.
//   - Private own keys (BYOK) — your own provider accounts, managed in the
//     dashboard (API Keys → Private own keys).
func performLogin(useAPIKey bool) error {
	// 1) Browser device-code flow (default) — the pro experience. Transparently
	//    falls back to the API-key paste flow if the server endpoint is
	//    unavailable or the user set LF_API_KEY / passed --api-key.
	if !useAPIKey && strings.TrimSpace(os.Getenv("LF_API_KEY")) == "" {
		a := auth.New()
		if err := a.Login(); err != nil {
			fmt.Fprintf(os.Stderr, "Browser login unavailable (%v); falling back to API key.\n", err)
		} else if key := a.AccessToken(); strings.HasPrefix(key, "lf_live_") {
			return finishLogin(key)
		}
	}

	// 2) API-key paste / env flow.
	key := strings.TrimSpace(os.Getenv("LF_API_KEY"))
	if key == "" {
		cfg, err := config.Load("")
		if err == nil && strings.TrimSpace(cfg.APIKey) != "" {
			key = strings.TrimSpace(cfg.APIKey)
		}
	}
	if key == "" {
		fmt.Print("Paste your LayerFlow platform key (lf_live_...): ")
		scanner := bufio.NewScanner(os.Stdin)
		if !scanner.Scan() {
			return errors.New("no API key entered")
		}
		key = strings.TrimSpace(scanner.Text())
	}
	if !strings.HasPrefix(key, "lf_live_") {
		return errors.New("that does not look like a LayerFlow platform key (expected lf_live_…). Create one in the dashboard: API Keys → Platform keys, or run `lf login` for the browser flow")
	}
	return finishLogin(key)
}

// finishLogin validates the platform key against the cloud and persists it to
// the OS keyring, falling back to the config file when the keyring is
// unavailable (headless shells, locked keychain, sandboxes).
func finishLogin(key string) error {
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
			return errors.New("that platform key was rejected. Generate one in the dashboard: API Keys → Platform keys")
		}
		return fmt.Errorf("could not reach LayerFlow: %w", err)
	}

	if err := auth.SetAPIKey(key); err != nil {
		if ferr := storeAPIKeyInConfig(cfg, key); ferr != nil {
			return fmt.Errorf("store API key (keyring and config both failed): %v; keyring error: %w", ferr, err)
		}
		fmt.Println("Authenticated. Platform key stored in config file (OS keyring unavailable).")
		fmt.Println("Get started: lf chat \"hello\" · lf sync · lf run \"build a landing page\"")
		return nil
	}
	fmt.Println("Authenticated. Platform key stored securely in your OS keyring.")
	fmt.Println("Tip: add your own provider accounts under API Keys → Private own keys in the dashboard, or just use LayerFlow's platform keys.")
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
