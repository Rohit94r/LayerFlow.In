package providers

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/layerflow/terminal/pkg/oaitype"
)

// AnthropicProvider wraps the Anthropic API into an OpenAI-compatible shape.
type AnthropicProvider struct {
	apiKey  string
	baseURL string
	model   string
	mu      sync.Mutex
	client  *http.Client
}

// AnthropicConfig holds configuration for the Anthropic provider.
type AnthropicConfig struct {
	APIKey  string
	BaseURL string
	Model   string
}

// anthropicRequest represents the Anthropic messages API request.
type anthropicRequest struct {
	Model     string             `json:"model"`
	MaxTokens int                `json:"max_tokens"`
	Messages  []anthropicMessage `json:"messages"`
	System    string             `json:"system,omitempty"`
	Stream    bool               `json:"stream"`
	Tools     []anthropicTool    `json:"tools,omitempty"`
}

type anthropicMessage struct {
	Role    string `json:"role"`
	Content any    `json:"content"`
}

type anthropicTool struct {
	Name        string         `json:"name"`
	Description string         `json:"description"`
	InputSchema map[string]any `json:"input_schema"`
}

// anthropicStreamEvent represents a streaming event from Anthropic.
type anthropicStreamEvent struct {
	Type  string          `json:"type"`
	Delta *anthropicDelta `json:"delta,omitempty"`
	Usage *anthropicUsage `json:"usage,omitempty"`
	Index int             `json:"index,omitempty"`
}

type anthropicDelta struct {
	Type string `json:"type"`
	Text string `json:"text"`
	ID   string `json:"id,omitempty"`
	Name string `json:"name,omitempty"`
}

type anthropicUsage struct {
	InputTokens  int `json:"input_tokens"`
	OutputTokens int `json:"output_tokens"`
}

// NewAnthropicProvider creates a new Anthropic provider.
func NewAnthropicProvider(cfg AnthropicConfig) *AnthropicProvider {
	baseURL := cfg.BaseURL
	if baseURL == "" {
		baseURL = "https://api.anthropic.com/v1"
	}
	model := cfg.Model
	if model == "" {
		model = "claude-3-5-sonnet-latest"
	}

	return &AnthropicProvider{
		apiKey:  cfg.APIKey,
		baseURL: strings.TrimRight(baseURL, "/"),
		model:   model,
		client: &http.Client{
			Timeout: 5 * time.Minute,
		},
	}
}

func (p *AnthropicProvider) Name() string {
	return "anthropic"
}

func (p *AnthropicProvider) Models() []ModelInfo {
	return []ModelInfo{
		{
			ID: "claude-3-5-sonnet-latest", Name: "Claude 3.5 Sonnet", ContextWindow: 200000,
			CostPer1kIn: 0.003, CostPer1kOut: 0.015, SupportsTools: true,
		},
		{
			ID: "claude-3-5-haiku-latest", Name: "Claude 3.5 Haiku", ContextWindow: 200000,
			CostPer1kIn: 0.0008, CostPer1kOut: 0.004, SupportsTools: true,
		},
		{
			ID: "claude-3-opus-20240229", Name: "Claude 3 Opus", ContextWindow: 200000,
			CostPer1kIn: 0.015, CostPer1kOut: 0.075, SupportsTools: true,
		},
	}
}

func (p *AnthropicProvider) Complete(ctx context.Context, opts StreamOpts) (*FuncUsage, error) {
	start := time.Now()

	model := opts.Model
	if model == "" {
		model = p.model
	}

	systemPrompt, messages := extractSystemMessage(opts.Messages)

	reqBody := anthropicRequest{
		Model:     model,
		MaxTokens: opts.MaxTokens,
		Messages:  toAnthropicMessages(messages),
		System:    systemPrompt,
		Stream:    true,
		Tools:     toAnthropicTools(opts.Tools),
	}

	if reqBody.MaxTokens == 0 {
		reqBody.MaxTokens = 4096
	}

	body, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("marshal request: %w", err)
	}

	url := p.baseURL + "/messages"
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("x-api-key", p.apiKey)
	httpReq.Header.Set("anthropic-version", "2023-06-01")

	usage, err := p.streamRequest(ctx, httpReq, opts.OnDelta)
	if err != nil {
		return nil, err
	}

	usage.LatencyMs = time.Since(start).Milliseconds()

	p.mu.Lock()
	p.mu.Unlock()

	return usage, nil
}

func (p *AnthropicProvider) streamRequest(ctx context.Context, req *http.Request, onDelta func(Chunk) error) (*FuncUsage, error) {
	usage := &FuncUsage{}
	var lastErr error
	maxRetries := 3

	for attempt := 0; attempt <= maxRetries; attempt++ {
		if attempt > 0 {
			backoff := time.Duration(1<<uint(attempt-1)) * time.Second
			select {
			case <-ctx.Done():
				return nil, ctx.Err()
			case <-time.After(backoff):
			}
		}

		resp, err := p.client.Do(req.Clone(ctx))
		if err != nil {
			lastErr = fmt.Errorf("request failed: %w", err)
			continue
		}

		if resp.StatusCode != http.StatusOK {
			resp.Body.Close()
			bodyBytes, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
			lastErr = fmt.Errorf("API error %d: %s", resp.StatusCode, string(bodyBytes))

			if resp.StatusCode >= 500 {
				continue
			}
			return nil, lastErr
		}

		err = p.processSSEStream(ctx, resp.Body, onDelta, usage)
		resp.Body.Close()

		if err != nil {
			lastErr = err
			if ctx.Err() != nil {
				return nil, ctx.Err()
			}
			continue
		}

		return usage, nil
	}

	return nil, fmt.Errorf("all retries exhausted: %w", lastErr)
}

func (p *AnthropicProvider) processSSEStream(ctx context.Context, body io.Reader, onDelta func(Chunk) error, usage *FuncUsage) error {
	scanner := bufio.NewScanner(body)
	scanner.Buffer(make([]byte, 0, 64*1024), 1024*1024)

	var textBuilder strings.Builder
	toolCalls := make(map[string]*oaitype.ToolCall)
	eventType := ""

	for scanner.Scan() {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		line := scanner.Text()

		if strings.HasPrefix(line, "event: ") {
			eventType = strings.TrimPrefix(line, "event: ")
			continue
		}

		if !strings.HasPrefix(line, "data: ") {
			continue
		}

		data := strings.TrimPrefix(line, "data: ")
		data = strings.TrimSpace(data)

		var event anthropicStreamEvent
		if err := json.Unmarshal([]byte(data), &event); err != nil {
			continue
		}

		switch eventType {
		case "content_block_delta":
			if event.Delta != nil && event.Delta.Text != "" {
				textBuilder.WriteString(event.Delta.Text)

				if onDelta != nil {
					chunk := Chunk{
						Text: event.Delta.Text,
						Done: false,
					}
					if err := onDelta(chunk); err != nil {
						return err
					}
				}
			}

			if event.Delta != nil && event.Delta.Type == "tool_use" {
				id := event.Delta.ID
				if id == "" {
					id = fmt.Sprintf("tool_%d", event.Index)
				}

				existing, ok := toolCalls[id]
				if !ok {
					toolCalls[id] = &oaitype.ToolCall{
						ID:   id,
						Type: "function",
						Function: oaitype.FuncCall{
							Name: event.Delta.Name,
						},
					}
				} else {
					if event.Delta.Name != "" {
						existing.Function.Name = event.Delta.Name
					}
				}
			}

		case "content_block_stop":
			if event.Type == "content_block_stop" {
				// Check if this is a tool use block
				for _, tc := range toolCalls {
					if tc.Function.Name != "" && tc.Function.Arguments == "" {
						// Tool call completed
					}
				}
			}

		case "message_delta":
			if event.Usage != nil {
				usage.OutputTokens = event.Usage.OutputTokens
			}

		case "message_start":
			if event.Usage != nil {
				usage.InputTokens = event.Usage.InputTokens
			}

		case "message_stop":
			finalToolCalls := make([]oaitype.ToolCall, 0, len(toolCalls))
			for _, tc := range toolCalls {
				finalToolCalls = append(finalToolCalls, *tc)
			}

			chunk := Chunk{
				Text:      textBuilder.String(),
				ToolCalls: finalToolCalls,
				Usage:     usage,
				Done:      true,
			}
			if onDelta != nil {
				if err := onDelta(chunk); err != nil {
					return err
				}
			}
			return nil
		}
	}

	return scanner.Err()
}

func (p *AnthropicProvider) Ping(ctx context.Context) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, p.baseURL+"/models", nil)
	if err != nil {
		return err
	}

	req.Header.Set("x-api-key", p.apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	resp, err := p.client.Do(req)
	if err != nil {
		return fmt.Errorf("ping failed: %w", err)
	}
	resp.Body.Close()

	// Anthropic doesn't have a models endpoint, so 404 is expected
	if resp.StatusCode == http.StatusNotFound {
		return nil
	}

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("ping returned status %d", resp.StatusCode)
	}
	return nil
}

func (p *AnthropicProvider) Reset() error {
	p.mu.Lock()
	defer p.mu.Unlock()
	return nil
}

func extractSystemMessage(messages []oaitype.Message) (string, []oaitype.Message) {
	var system string
	var others []oaitype.Message

	for _, msg := range messages {
		if msg.Role == "system" {
			if s, ok := msg.Content.(string); ok {
				system = s
			}
		} else {
			others = append(others, msg)
		}
	}

	return system, others
}

func toAnthropicMessages(messages []oaitype.Message) []anthropicMessage {
	result := make([]anthropicMessage, len(messages))
	for i, msg := range messages {
		result[i] = anthropicMessage{
			Role:    msg.Role,
			Content: msg.Content,
		}
	}
	return result
}

func toAnthropicTools(tools []oaitype.ToolSpec) []anthropicTool {
	result := make([]anthropicTool, len(tools))
	for i, tool := range tools {
		result[i] = anthropicTool{
			Name:        tool.Function.Name,
			Description: tool.Function.Description,
			InputSchema: func() map[string]any {
				if m, ok := tool.Function.Parameters.(map[string]any); ok {
					return m
				}
				return nil
			}(),
		}
	}
	return result
}
