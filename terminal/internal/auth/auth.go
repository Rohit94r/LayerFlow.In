// Package auth provides device-code OAuth authentication and OS keyring
// integration for LayerFlow.
package auth

import (
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"os"
	"sync"
	"time"

	"github.com/zalando/go-keyring"
)

const (
	keyringService  = "layerflow-lf"
	keyringUser     = "default"
	keyringAPIKey   = "api-key"
	tokenTTLBuffer  = 30 * seconds
	defaultPollWait = 5
)

const seconds = time.Second

// DeviceAuthURL is the base URL for the device authorization endpoint.
var DeviceAuthURL = "https://layerflow.dev/api/v1/auth/device"

// TokenURL is the base URL for the token endpoint.
var TokenURL = "https://layerflow.dev/api/v1/auth/token"

// ClientID is the public OAuth client ID.
var ClientID = "layerflow-lf-cli"

// ─────────────────────────────────────────────────────────────────────────────

// Auth manages device-code OAuth lifecycle.
type Auth struct {
	mu      sync.Mutex
	token   *tokenPair
	refresh string
	client  *http.Client
}

// tokenPair holds access and refresh tokens.
type tokenPair struct {
	AccessToken  string    `json:"access_token"`
	RefreshToken string    `json:"refresh_token"`
	ExpiresAt    time.Time `json:"expires_at"`
	TokenType    string    `json:"token_type"`
}

// DeviceCodeResponse represents the device authorization response.
type DeviceCodeResponse struct {
	DeviceCode      string `json:"device_code"`
	UserCode        string `json:"user_code"`
	VerificationURI string `json:"verification_uri"`
	ExpiresIn       int    `json:"expires_in"`
	Interval        int    `json:"interval"`
}

// TokenResponse represents the token response.
type TokenResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"`
	TokenType    string `json:"token_type"`
}

// New creates a new Auth instance. It attempts to load a stored refresh token.
func New() *Auth {
	a := &Auth{client: &http.Client{Timeout: 30 * seconds}}
	a.refresh, _ = keyring.Get(keyringService, keyringUser)
	return a
}

// GetAPIKey returns the stored workspace API key (lf_live_...), if any.
func GetAPIKey() (string, error) {
	return keyring.Get(keyringService, keyringAPIKey)
}

// SetAPIKey stores the workspace API key in the OS keyring.
func SetAPIKey(key string) error {
	return keyring.Set(keyringService, keyringAPIKey, key)
}

// ClearAPIKey removes the stored workspace API key from the keyring.
func ClearAPIKey() error {
	return keyring.Delete(keyringService, keyringAPIKey)
}

// IsAuthenticated returns true if a valid or refreshable session exists.
func (a *Auth) IsAuthenticated() bool {
	a.mu.Lock()
	defer a.mu.Unlock()

	if a.token != nil && time.Now().Before(a.token.ExpiresAt) {
		return true
	}
	return a.refresh != ""
}

// Token returns a valid access token, refreshing or re-authenticating as needed.
func (a *Auth) Token() (string, error) {
	a.mu.Lock()
	defer a.mu.Unlock()

	// Return cached valid token.
	if a.token != nil && time.Now().Before(a.token.ExpiresAt.Add(-tokenTTLBuffer)) {
		return a.token.AccessToken, nil
	}

	// Try refresh.
	if a.refresh != "" {
		if err := a.refreshToken(); err != nil {
			slog.Warn("refresh failed, falling back to device code", "err", err)
		} else {
			return a.token.AccessToken, nil
		}
	}

	return "", fmt.Errorf("not authenticated — run `lf auth login`")
}

// Login initiates the device-code OAuth flow and blocks until the user
// authorises or the device code expires.
func (a *Auth) Login() error {
	a.mu.Lock()
	defer a.mu.Unlock()

	resp, err := a.startDeviceFlow()
	if err != nil {
		return fmt.Errorf("start device flow: %w", err)
	}

	fmt.Fprintf(os.Stderr, "\nTo authenticate, open:\n  %s\n", resp.VerificationURI)
	fmt.Fprintf(os.Stderr, "Enter code: %s\n\n", resp.UserCode)

	interval := resp.Interval
	if interval <= 0 {
		interval = defaultPollWait
	}

	expires := time.Now().Add(time.Duration(resp.ExpiresIn) * seconds)
	for time.Now().Before(expires) {
		time.Sleep(time.Duration(interval) * seconds)

		tok, err := a.pollToken(resp.DeviceCode)
		if err != nil {
			return fmt.Errorf("poll token: %w", err)
		}
		if tok != nil {
			a.token = &tokenPair{
				AccessToken:  tok.AccessToken,
				RefreshToken: tok.RefreshToken,
				ExpiresAt:    time.Now().Add(time.Duration(tok.ExpiresIn) * seconds),
				TokenType:    tok.TokenType,
			}
			a.refresh = tok.RefreshToken
			return a.storeRefreshToken(tok.RefreshToken)
		}
	}

	return fmt.Errorf("device code expired")
}

// Logout clears the stored refresh token and in-memory token.
func (a *Auth) Logout() error {
	a.mu.Lock()
	defer a.mu.Unlock()

	a.token = nil
	a.refresh = ""
	return keyring.Delete(keyringService, keyringUser)
}

// ─────────────────────────────────────────────────────────────────────────────

func (a *Auth) startDeviceFlow() (*DeviceCodeResponse, error) {
	data := url.Values{
		"client_id": {ClientID},
		"scope":     {"openid profile"},
	}
	resp, err := a.client.PostForm(DeviceAuthURL, data)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("device auth returned %d: %s", resp.StatusCode, body)
	}

	var dc DeviceCodeResponse
	if err := json.NewDecoder(resp.Body).Decode(&dc); err != nil {
		return nil, fmt.Errorf("decode device code response: %w", err)
	}
	return &dc, nil
}

func (a *Auth) pollToken(deviceCode string) (*TokenResponse, error) {
	data := url.Values{
		"grant_type":  {"urn:ietf:params:oauth:grant-type:device_code"},
		"device_code": {deviceCode},
		"client_id":   {ClientID},
	}
	resp, err := a.client.PostForm(TokenURL, data)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	switch resp.StatusCode {
	case http.StatusOK:
		var tok TokenResponse
		if err := json.Unmarshal(body, &tok); err != nil {
			return nil, fmt.Errorf("decode token: %w", err)
		}
		return &tok, nil

	case http.StatusConflict, http.StatusRequestTimeout:
		// authorization_pending or slow_down — caller should retry.
		return nil, nil

	default:
		return nil, fmt.Errorf("token poll returned %d: %s", resp.StatusCode, body)
	}
}

func (a *Auth) refreshToken() error {
	data := url.Values{
		"grant_type":    {"refresh_token"},
		"refresh_token": {a.refresh},
		"client_id":     {ClientID},
	}
	resp, err := a.client.PostForm(TokenURL, data)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("refresh returned %d: %s", resp.StatusCode, body)
	}

	var tok TokenResponse
	if err := json.Unmarshal(body, &tok); err != nil {
		return fmt.Errorf("decode refresh response: %w", err)
	}

	a.token = &tokenPair{
		AccessToken:  tok.AccessToken,
		RefreshToken: tok.RefreshToken,
		ExpiresAt:    time.Now().Add(time.Duration(tok.ExpiresIn) * seconds),
		TokenType:    tok.TokenType,
	}
	a.refresh = tok.RefreshToken
	return a.storeRefreshToken(tok.RefreshToken)
}

func (a *Auth) storeRefreshToken(refresh string) error {
	if err := keyring.Set(keyringService, keyringUser, refresh); err != nil {
		slog.Warn("failed to store refresh token in keyring", "err", err)
	}
	return nil
}
