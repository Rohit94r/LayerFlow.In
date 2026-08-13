// Package providers implements LLM provider adapters.
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

// OpenAIProvider implements Provider for OpenAI-compatible APIs.
type OpenAIProvider struct {
	apiKey   string
	baseURL  string
	model    string
	mu       sync.Mutex
	lastUsed time.Time
	client   *http.Client
}

// OpenAIConfig holds configuration for an OpenAI-compatible provider.
type OpenAIConfig struct {
	APIKey  string
	BaseURL string
	Model   string
}

// NewOpenAIProvider creates a new OpenAI-compatible provider.
func NewOpenAIProvider(cfg OpenAIConfig) *OpenAIProvider {
	baseURL := cfg.BaseURL
	if baseURL == "" {
		baseURL = "https://api.openai.com/v1"
	}
	model := cfg.Model
	if model == "" {
		model = "gpt-4o"
	}

	return &OpenAIProvider{
		apiKey:  cfg.APIKey,
		baseURL: strings.TrimRight(baseURL, "/"),
		model:   model,
		client: &http.Client{
			Timeout: 5 * time.Minute,
		},
	}
}

func (p *OpenAIProvider) Name() string {
	return "openai"
}

func (p *OpenAIProvider) Models() []ModelInfo {
	return []ModelInfo{
		{
			ID: "gpt-4o", Name: "GPT-4o", ContextWindow: 128000,
			CostPer1kIn: 0.0025, CostPer1kOut: 0.01, SupportsTools: true,
		},
		{
			ID: "gpt-4o-mini", Name: "GPT-4o Mini", ContextWindow: 128000,
			CostPer1kIn: 0.00015, CostPer1kOut: 0.0006, SupportsTools: true,
		},
		{
			ID: "gpt-4-turbo", Name: "GPT-4 Turbo", ContextWindow: 128000,
			CostPer1kIn: 0.01, CostPer1kOut: 0.03, SupportsTools: true,
		},
		{
			ID: "gpt-3.5-turbo", Name: "GPT-3.5 Turbo", ContextWindow: 16385,
			CostPer1kIn: 0.0005, CostPer1kOut: 0.0015, SupportsTools: true,
		},
	}
}

func (p *OpenAIProvider) Complete(ctx context.Context, opts StreamOpts) (*FuncUsage, error) {
	start := time.Now()

	model := opts.Model
	if model == "" {
		model = p.model
	}

	reqBody := oaitype.ChatRequest{
		Model:       model,
		Messages:    opts.Messages,
		Tools:       opts.Tools,
		MaxTokens:   opts.MaxTokens,
		Temperature: opts.Temp,
		Stream:      true,
		Stop:        opts.Stop,
	}

	body, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("marshal request: %w", err)
	}

	url := p.baseURL + "/chat/completions"
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")
	if p.apiKey != "" {
		httpReq.Header.Set("Authorization", "Bearer "+p.apiKey)
	}

	usage, err := p.streamRequest(ctx, httpReq, opts.OnDelta)
	if err != nil {
		return nil, err
	}

	usage.LatencyMs = time.Since(start).Milliseconds()

	p.mu.Lock()
	p.lastUsed = time.Now()
	p.mu.Unlock()

	return usage, nil
}

func (p *OpenAIProvider) streamRequest(ctx context.Context, req *http.Request, onDelta func(Chunk) error) (*FuncUsage, error) {
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
			body, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
			lastErr = fmt.Errorf("API error %d: %s", resp.StatusCode, string(body))

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

func (p *OpenAIProvider) processSSEStream(ctx context.Context, body io.Reader, onDelta func(Chunk) error, usage *FuncUsage) error {
	scanner := bufio.NewScanner(body)
	scanner.Buffer(make([]byte, 0, 64*1024), 1024*1024)

	var textBuilder strings.Builder
	toolCalls := make(map[int]*oaitype.ToolCall)

	for scanner.Scan() {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		line := scanner.Text()

		if !strings.HasPrefix(line, "data: ") {
			continue
		}

		data := strings.TrimPrefix(line, "data: ")
		data = strings.TrimSpace(data)

		if data == "[DONE]" {
			// Finalize any pending tool calls
			finalToolCalls := make([]oaitype.ToolCall, 0, len(toolCalls))
			for i := 0; i < len(toolCalls); i++ {
				if tc, ok := toolCalls[i]; ok {
					finalToolCalls = append(finalToolCalls, *tc)
				}
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

		var delta oaitype.StreamDelta
		if err := json.Unmarshal([]byte(data), &delta); err != nil {
			continue
		}

		if delta.Usage != nil {
			usage.InputTokens = delta.Usage.PromptTokens
			usage.OutputTokens = delta.Usage.CompletionTokens
		}

		for _, choice := range delta.Choices {
			if choice.Delta.Content != "" {
				textBuilder.WriteString(choice.Delta.Content)
			}

			for _, tc := range choice.Delta.ToolCalls {
				idx := tc.Index
				if idx < 0 {
					idx = len(toolCalls)
				}

				existing, ok := toolCalls[idx]
				if !ok {
					toolCalls[idx] = &oaitype.ToolCall{
						ID:   tc.ID,
						Type: tc.Type,
						Function: oaitype.FuncCall{
							Name:      tc.Function.Name,
							Arguments: tc.Function.Arguments,
						},
					}
				} else {
					if tc.ID != "" {
						existing.ID = tc.ID
					}
					if tc.Type != "" {
						existing.Type = tc.Type
					}
					if tc.Function.Name != "" {
						existing.Function.Name = tc.Function.Name
					}
					existing.Function.Arguments += tc.Function.Arguments
				}
			}

			if choice.FinishReason != nil {
				finalToolCalls := make([]oaitype.ToolCall, 0, len(toolCalls))
				for i := 0; i < len(toolCalls); i++ {
					if tc, ok := toolCalls[i]; ok {
						finalToolCalls = append(finalToolCalls, *tc)
					}
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

			if onDelta != nil {
				chunk := Chunk{
					Text:      choice.Delta.Content,
					ToolCalls: nil,
					Usage:     nil,
					Done:      false,
				}
				if err := onDelta(chunk); err != nil {
					return err
				}
			}
		}
	}

	return scanner.Err()
}

func (p *OpenAIProvider) Ping(ctx context.Context) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, p.baseURL+"/models", nil)
	if err != nil {
		return err
	}

	if p.apiKey != "" {
		req.Header.Set("Authorization", "Bearer "+p.apiKey)
	}

	resp, err := p.client.Do(req)
	if err != nil {
		return fmt.Errorf("ping failed: %w", err)
	}
	resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("ping returned status %d", resp.StatusCode)
	}
	return nil
}

func (p *OpenAIProvider) Reset() error {
	p.mu.Lock()
	defer p.mu.Unlock()
	return nil
}
