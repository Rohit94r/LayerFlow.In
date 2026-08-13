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

// LocalProvider implements Provider for local LLM servers (Ollama, LM Studio).
type LocalProvider struct {
	baseURL string
	model   string
	mu      sync.Mutex
	client  *http.Client
	models  []ModelInfo
}

// LocalConfig holds configuration for a local provider.
type LocalConfig struct {
	BaseURL string
	Model   string
}

// ollamaTagsResponse represents the response from /api/tags.
type ollamaTagsResponse struct {
	Models []ollamaModel `json:"models"`
}

type ollamaModel struct {
	Name       string `json:"name"`
	Size       int64  `json:"size"`
	Digest     string `json:"digest"`
	ModifiedAt string `json:"modified_at"`
}

// NewLocalProvider creates a new local provider.
func NewLocalProvider(cfg LocalConfig) *LocalProvider {
	baseURL := cfg.BaseURL
	if baseURL == "" {
		baseURL = "http://localhost:11434"
	}
	model := cfg.Model
	if model == "" {
		model = "llama3"
	}

	return &LocalProvider{
		baseURL: strings.TrimRight(baseURL, "/"),
		model:   model,
		client: &http.Client{
			Timeout: 10 * time.Minute,
		},
	}
}

func (p *LocalProvider) Name() string {
	return "local"
}

func (p *LocalProvider) Models() []ModelInfo {
	p.mu.Lock()
	defer p.mu.Unlock()

	if p.models != nil {
		return p.models
	}

	_ = p.refreshModels()
	return p.models
}

func (p *LocalProvider) refreshModels() error {
	url := p.baseURL + "/api/tags"

	resp, err := p.client.Get(url)
	if err != nil {
		p.models = []ModelInfo{
			{ID: p.model, Name: p.model, ContextWindow: 8192, SupportsTools: false},
		}
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		p.models = []ModelInfo{
			{ID: p.model, Name: p.model, ContextWindow: 8192, SupportsTools: false},
		}
		return fmt.Errorf("tags endpoint returned %d", resp.StatusCode)
	}

	var tagsResp ollamaTagsResponse
	if err := json.NewDecoder(resp.Body).Decode(&tagsResp); err != nil {
		return err
	}

	p.models = make([]ModelInfo, 0, len(tagsResp.Models))
	for _, m := range tagsResp.Models {
		p.models = append(p.models, ModelInfo{
			ID:            m.Name,
			Name:          m.Name,
			ContextWindow: 8192,
			SupportsTools: false,
		})
	}

	if len(p.models) == 0 {
		p.models = []ModelInfo{
			{ID: p.model, Name: p.model, ContextWindow: 8192, SupportsTools: false},
		}
	}

	return nil
}

func (p *LocalProvider) Complete(ctx context.Context, opts StreamOpts) (*FuncUsage, error) {
	start := time.Now()

	model := opts.Model
	if model == "" {
		model = p.model
	}

	// Try OpenAI-compatible endpoint first
	usage, err := p.completeOpenAI(ctx, model, opts)
	if err == nil {
		usage.LatencyMs = time.Since(start).Milliseconds()
		return usage, nil
	}

	// Fall back to native Ollama API
	usage, err = p.completeOllama(ctx, model, opts)
	if err != nil {
		return nil, err
	}

	usage.LatencyMs = time.Since(start).Milliseconds()
	return usage, nil
}

func (p *LocalProvider) completeOpenAI(ctx context.Context, model string, opts StreamOpts) (*FuncUsage, error) {
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

	url := p.baseURL + "/v1/chat/completions"
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := p.client.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBytes, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
		return nil, fmt.Errorf("openai endpoint error %d: %s", resp.StatusCode, string(respBytes))
	}

	return p.processSSEStream(ctx, resp.Body, opts.OnDelta)
}

func (p *LocalProvider) completeOllama(ctx context.Context, model string, opts StreamOpts) (*FuncUsage, error) {
	type ollamaMessage struct {
		Role    string `json:"role"`
		Content string `json:"content"`
	}

	type ollamaOptions struct {
		Temperature float64 `json:"temperature,omitempty"`
		NumPredict  int     `json:"num_predict,omitempty"`
	}

	type ollamaRequest struct {
		Model    string          `json:"model"`
		Messages []ollamaMessage `json:"messages"`
		Stream   bool            `json:"stream"`
		Options  *ollamaOptions  `json:"options,omitempty"`
	}

	messages := make([]ollamaMessage, len(opts.Messages))
	for i, msg := range opts.Messages {
		content := fmt.Sprintf("%v", msg.Content)
		messages[i] = ollamaMessage{
			Role:    msg.Role,
			Content: content,
		}
	}

	reqBody := ollamaRequest{
		Model:    model,
		Messages: messages,
		Stream:   true,
	}

	if opts.Temp > 0 || opts.MaxTokens > 0 {
		reqBody.Options = &ollamaOptions{
			Temperature: opts.Temp,
			NumPredict:  opts.MaxTokens,
		}
	}

	body, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("marshal request: %w", err)
	}

	url := p.baseURL + "/api/chat"
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := p.client.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBytes, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
		return nil, fmt.Errorf("ollama endpoint error %d: %s", resp.StatusCode, string(respBytes))
	}

	usage := &FuncUsage{}

	scanner := bufio.NewScanner(resp.Body)
	scanner.Buffer(make([]byte, 0, 64*1024), 1024*1024)

	for scanner.Scan() {
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		default:
		}

		line := scanner.Text()
		if line == "" {
			continue
		}

		var ollamaResp struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
			Done            bool `json:"done"`
			EvalCount       int  `json:"eval_count"`
			PromptEvalCount int  `json:"prompt_eval_count"`
		}

		if err := json.Unmarshal([]byte(line), &ollamaResp); err != nil {
			continue
		}

		if ollamaResp.Message.Content != "" && opts.OnDelta != nil {
			chunk := Chunk{
				Text: ollamaResp.Message.Content,
				Done: false,
			}
			if err := opts.OnDelta(chunk); err != nil {
				return nil, err
			}
		}

		if ollamaResp.Done {
			usage.OutputTokens = ollamaResp.EvalCount
			usage.InputTokens = ollamaResp.PromptEvalCount

			if opts.OnDelta != nil {
				chunk := Chunk{
					Done:  true,
					Usage: usage,
				}
				if err := opts.OnDelta(chunk); err != nil {
					return nil, err
				}
			}
			return usage, nil
		}
	}

	return usage, scanner.Err()
}

func (p *LocalProvider) processSSEStream(ctx context.Context, body io.Reader, onDelta func(Chunk) error) (*FuncUsage, error) {
	usage := &FuncUsage{}

	scanner := bufio.NewScanner(body)
	scanner.Buffer(make([]byte, 0, 64*1024), 1024*1024)

	for scanner.Scan() {
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		default:
		}

		line := scanner.Text()

		if !strings.HasPrefix(line, "data: ") {
			continue
		}

		data := strings.TrimPrefix(line, "data: ")
		data = strings.TrimSpace(data)

		if data == "[DONE]" {
			if onDelta != nil {
				chunk := Chunk{
					Usage: usage,
					Done:  true,
				}
				if err := onDelta(chunk); err != nil {
					return nil, err
				}
			}
			return usage, nil
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
			if choice.Delta.Content != "" && onDelta != nil {
				chunk := Chunk{
					Text: choice.Delta.Content,
					Done: false,
				}
				if err := onDelta(chunk); err != nil {
					return nil, err
				}
			}

			if choice.FinishReason != nil {
				if onDelta != nil {
					chunk := Chunk{
						Usage: usage,
						Done:  true,
					}
					if err := onDelta(chunk); err != nil {
						return nil, err
					}
				}
				return usage, nil
			}
		}
	}

	return usage, scanner.Err()
}

func (p *LocalProvider) Ping(ctx context.Context) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, p.baseURL+"/api/tags", nil)
	if err != nil {
		return err
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

func (p *LocalProvider) Reset() error {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.models = nil
	return nil
}
