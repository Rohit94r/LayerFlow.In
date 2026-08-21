// Package cloud is the LayerFlow cloud API client used by lf for gateway
// chat completions, model listing, and API-key validation.
package cloud

import (
	"bufio"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/layerflow/terminal/internal/auth"
	"github.com/layerflow/terminal/internal/config"
)

const (
	// DefaultBaseURL is the production host. The shared Hono app serves both
	// /api/* and /v1/* on this host (see docs/DEPLOYMENT.md).
	DefaultBaseURL = "https://layerflow.dev"
	// DefaultModel is the cheapest widely-available gateway model.
	DefaultModel = "deepseek-chat"
)

// ErrInvalidKey is returned when the API key is rejected (HTTP 401).
var ErrInvalidKey = errors.New("invalid LayerFlow API key")

// PickAvailableModel returns the preferred model when the workspace can use
// it, otherwise the first available model advertised by the gateway. It falls
// back to the preferred model when models cannot be listed (offline, or no API
// key configured) so chat still attempts the configured default.
func PickAvailableModel(ctx context.Context, c *Client, preferred string) string {
	if strings.TrimSpace(preferred) == "" {
		preferred = DefaultModel
	}
	models, err := c.ListModels(ctx)
	if err != nil {
		return preferred
	}
	var first string
	for _, m := range models {
		if !m.Available {
			continue
		}
		if first == "" {
			first = m.ID
		}
		if m.ID == preferred {
			return preferred
		}
	}
	if first != "" {
		return first
	}
	return preferred
}

// Message is a single chat message in gateway format.
type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// ChatOptions configures a chat completions call.
type ChatOptions struct {
	Model     string
	Messages  []Message
	MaxTokens *int
	Stream    bool
}

// ChatResponse is the OpenAI-shaped non-streamed completion response.
type ChatResponse struct {
	ID      string `json:"id"`
	Object  string `json:"object"`
	Model   string `json:"model"`
	Created int64  `json:"created"`
	Choices []struct {
		Index        int     `json:"index"`
		Message      Message `json:"message"`
		FinishReason string  `json:"finish_reason"`
	} `json:"choices"`
	Usage struct {
		PromptTokens     int `json:"prompt_tokens"`
		CompletionTokens int `json:"completion_tokens"`
		TotalTokens      int `json:"total_tokens"`
	} `json:"usage"`
}

// Model is an entry from GET /v1/models.
type Model struct {
	ID        string `json:"id"`
	Object    string `json:"object"`
	OwnedBy   string `json:"owned_by"`
	Available bool   `json:"available"`
}

// Client is the LayerFlow cloud API client.
type Client struct {
	baseURL string
	apiKey  string
	http    *http.Client
}

// NewClient creates a cloud client. baseURL defaults to DefaultBaseURL.
func NewClient(baseURL, apiKey string) *Client {
	if strings.TrimSpace(baseURL) == "" {
		baseURL = DefaultBaseURL
	}
	return &Client{
		baseURL: strings.TrimRight(strings.TrimSpace(baseURL), "/"),
		apiKey:  apiKey,
		http:    &http.Client{Timeout: 10 * time.Minute},
	}
}

// BaseURL returns the configured base URL.
func (c *Client) BaseURL() string { return c.baseURL }

// Validate verifies the API key by listing models.
func (c *Client) Validate(ctx context.Context) error {
	_, err := c.ListModels(ctx)
	return err
}

// ListModels returns the gateway model catalog for the workspace.
func (c *Client) ListModels(ctx context.Context) ([]Model, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+"/v1/models", nil)
	if err != nil {
		return nil, err
	}
	c.auth(req)

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("list models: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusUnauthorized {
		return nil, ErrInvalidKey
	}
	if resp.StatusCode >= 400 {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("list models failed (%d): %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}

	var out struct {
		Data []Model `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return nil, fmt.Errorf("decode models: %w", err)
	}
	return out.Data, nil
}

// Chat performs a non-streamed chat completion.
func (c *Client) Chat(ctx context.Context, opts ChatOptions) (*ChatResponse, error) {
	if len(opts.Messages) == 0 {
		return nil, errors.New("no messages to send")
	}
	if strings.TrimSpace(opts.Model) == "" {
		opts.Model = DefaultModel
	}

	req, err := c.post(ctx, "/v1/chat/completions", opts.requestBody())
	if err != nil {
		return nil, err
	}

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("chat request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusUnauthorized {
		return nil, ErrInvalidKey
	}
	if resp.StatusCode >= 400 {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("chat request failed (%d): %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}

	var out ChatResponse
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return nil, fmt.Errorf("decode chat response: %w", err)
	}
	return &out, nil
}

// ChatStream streams an SSE chat completion, invoking onDelta for each
// content delta. The returned ChatResponse carries the streamed content and
// usage (when the gateway includes it).
func (c *Client) ChatStream(ctx context.Context, opts ChatOptions, onDelta func(string)) (*ChatResponse, error) {
	if len(opts.Messages) == 0 {
		return nil, errors.New("no messages to send")
	}
	if strings.TrimSpace(opts.Model) == "" {
		opts.Model = DefaultModel
	}

	body := opts.requestBody()
	body["stream"] = true

	req, err := c.post(ctx, "/v1/chat/completions", body)
	if err != nil {
		return nil, err
	}

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("chat stream: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusUnauthorized {
		return nil, ErrInvalidKey
	}
	if resp.StatusCode >= 400 {
		rb, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("chat stream failed (%d): %s", resp.StatusCode, strings.TrimSpace(string(rb)))
	}

	out := &ChatResponse{Object: "chat.completion", Model: opts.Model}
	var content strings.Builder

	scanner := bufio.NewScanner(resp.Body)
	scanner.Buffer(make([]byte, 0, 64*1024), 1*1024*1024)
	for scanner.Scan() {
		line := scanner.Text()
		if !strings.HasPrefix(line, "data:") {
			continue
		}
		data := strings.TrimSpace(strings.TrimPrefix(line, "data:"))
		if data == "[DONE]" {
			break
		}

		var chunk struct {
			Choices []struct {
				Delta struct {
					Content string `json:"content"`
				} `json:"delta"`
				FinishReason *string `json:"finish_reason"`
			} `json:"choices"`
			Usage *struct {
				PromptTokens     int `json:"prompt_tokens"`
				CompletionTokens int `json:"completion_tokens"`
				TotalTokens      int `json:"total_tokens"`
			} `json:"usage"`
			Error *struct {
				Code    string `json:"code"`
				Message string `json:"message"`
			} `json:"error"`
		}
		if err := json.Unmarshal([]byte(data), &chunk); err != nil {
			continue
		}

		if chunk.Error != nil {
			msg := chunk.Error.Message
			if msg == "" {
				msg = chunk.Error.Code
			}
			if msg == "" {
				msg = "stream failed"
			}
			return nil, errors.New(msg)
		}
		if len(chunk.Choices) > 0 {
			delta := chunk.Choices[0].Delta.Content
			if delta != "" {
				content.WriteString(delta)
				if onDelta != nil {
					onDelta(delta)
				}
			}
		}
		if chunk.Usage != nil {
			out.Usage.PromptTokens = chunk.Usage.PromptTokens
			out.Usage.CompletionTokens = chunk.Usage.CompletionTokens
			out.Usage.TotalTokens = chunk.Usage.TotalTokens
		}
	}
	if err := scanner.Err(); err != nil {
		return nil, fmt.Errorf("read stream: %w", err)
	}

	out.Choices = []struct {
		Index        int     `json:"index"`
		Message      Message `json:"message"`
		FinishReason string  `json:"finish_reason"`
	}{
		{Index: 0, Message: Message{Role: "assistant", Content: content.String()}, FinishReason: "stop"},
	}
	return out, nil
}

func (o ChatOptions) requestBody() map[string]any {
	body := map[string]any{
		"model":    o.Model,
		"messages": o.Messages,
	}
	if o.MaxTokens != nil {
		body["max_tokens"] = *o.MaxTokens
	}
	return body
}

func (c *Client) post(ctx context.Context, path string, body any) (*http.Request, error) {
	payload, err := json.Marshal(body)
	if err != nil {
		return nil, fmt.Errorf("marshal request: %w", err)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+path, strings.NewReader(string(payload)))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "lf-cli")
	c.auth(req)
	return req, nil
}

func (c *Client) auth(req *http.Request) {
	if c.apiKey != "" {
		req.Header.Set("Authorization", "Bearer "+c.apiKey)
	}
}

// ResolveBaseURL returns the cloud base URL from, in order of priority:
// LF_API_URL env var, config api_url, config sync.remote_url, then the default.
func ResolveBaseURL(cfg *config.Config) string {
	if v := strings.TrimSpace(os.Getenv("LF_API_URL")); v != "" {
		return v
	}
	if cfg != nil {
		if v := strings.TrimSpace(cfg.APIURL); v != "" {
			return v
		}
		if v := strings.TrimSpace(cfg.Sync.RemoteURL); v != "" {
			return v
		}
	}
	return DefaultBaseURL
}

// ResolveAPIKey returns the workspace API key from, in order of priority:
// LF_API_KEY env var, the OS keyring, then config api_key.
func ResolveAPIKey(cfg *config.Config) (string, error) {
	if v := strings.TrimSpace(os.Getenv("LF_API_KEY")); v != "" {
		return v, nil
	}
	if v, err := auth.GetAPIKey(); err == nil && strings.TrimSpace(v) != "" {
		return strings.TrimSpace(v), nil
	}
	if cfg != nil && strings.TrimSpace(cfg.APIKey) != "" {
		return strings.TrimSpace(cfg.APIKey), nil
	}
	return "", errors.New("no API key configured — run `lf login` or set LF_API_KEY")
}

// ImproveResponse is the result of a prompt improvement call.
type ImproveResponse struct {
	ImprovedContent string `json:"improvedContent"`
	Score           int    `json:"score"`
	OriginalScore   int    `json:"originalScore"`
	TokensSaved     int    `json:"tokensSaved"`
	Explanation     string `json:"explanation"`
}

// ImprovePrompt sends a prompt to the API for improvement.
func (c *Client) ImprovePrompt(ctx context.Context, content, targetModel string) (*ImproveResponse, error) {
	body := map[string]any{"content": content}
	if targetModel != "" {
		body["targetModel"] = targetModel
	}

	req, err := c.post(ctx, "/v1/improve", body)
	if err != nil {
		return nil, err
	}

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("improve request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusUnauthorized {
		return nil, ErrInvalidKey
	}
	if resp.StatusCode >= 400 {
		raw, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("improve failed (%d): %s", resp.StatusCode, strings.TrimSpace(string(raw)))
	}

	var out ImproveResponse
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return nil, fmt.Errorf("decode improve response: %w", err)
	}
	return &out, nil
}

// UsageResponse is the workspace budget + plan info from GET /v1/usage.
type UsageResponse struct {
	Budget struct {
		MonthlyLimitMicro int64   `json:"monthlyLimitMicro"`
		SpentMicro        int64   `json:"spentMicro"`
		RemainingMicro    int64   `json:"remainingMicro"`
		PercentUsed       float64 `json:"percentUsed"`
		Blocked           bool    `json:"blocked"`
		HardBlock         bool    `json:"hardBlock"`
	} `json:"budget"`
	Plan struct {
		Plan             string  `json:"plan"`
		Active           bool    `json:"active"`
		CurrentPeriodEnd *string `json:"currentPeriodEnd"`
	} `json:"plan"`
}

// GetUsage fetches workspace budget and plan info from the API.
func (c *Client) GetUsage(ctx context.Context) (*UsageResponse, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+"/v1/usage", nil)
	if err != nil {
		return nil, err
	}
	c.auth(req)

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("get usage: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusUnauthorized {
		return nil, ErrInvalidKey
	}
	if resp.StatusCode >= 400 {
		raw, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("get usage failed (%d): %s", resp.StatusCode, strings.TrimSpace(string(raw)))
	}

	var out UsageResponse
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return nil, fmt.Errorf("decode usage response: %w", err)
	}
	return &out, nil
}
