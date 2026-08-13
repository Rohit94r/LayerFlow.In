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

// GeminiProvider wraps the Google Gemini API into an OpenAI-compatible shape.
type GeminiProvider struct {
	apiKey  string
	baseURL string
	model   string
	mu      sync.Mutex
	client  *http.Client
}

// GeminiConfig holds configuration for the Gemini provider.
type GeminiConfig struct {
	APIKey  string
	BaseURL string
	Model   string
}

// geminiRequest represents the Gemini generateContent request.
type geminiRequest struct {
	Contents          []geminiContent         `json:"contents"`
	SystemInstruction *geminiContent          `json:"systemInstruction,omitempty"`
	GenerationConfig  *geminiGenerationConfig `json:"generationConfig,omitempty"`
	Tools             []geminiTool            `json:"tools,omitempty"`
}

type geminiContent struct {
	Role  string       `json:"role"`
	Parts []geminiPart `json:"parts"`
}

type geminiPart struct {
	Text         string          `json:"text,omitempty"`
	FunctionCall *geminiFuncCall `json:"functionCall,omitempty"`
}

type geminiFuncCall struct {
	Name      string         `json:"name"`
	Arguments map[string]any `json:"args"`
}

type geminiGenerationConfig struct {
	Temperature     float64  `json:"temperature,omitempty"`
	MaxOutputTokens int      `json:"maxOutputTokens,omitempty"`
	StopSequences   []string `json:"stopSequences,omitempty"`
}

type geminiTool struct {
	FunctionDeclarations []geminiFuncDecl `json:"functionDeclarations"`
}

type geminiFuncDecl struct {
	Name        string         `json:"name"`
	Description string         `json:"description"`
	Parameters  map[string]any `json:"parameters,omitempty"`
}

// geminiStreamResponse represents a streaming response from Gemini.
type geminiStreamResponse struct {
	Candidates    []geminiCandidate `json:"candidates"`
	UsageMetadata *geminiUsage      `json:"usageMetadata,omitempty"`
}

type geminiCandidate struct {
	Content      geminiContent `json:"content"`
	FinishReason string        `json:"finishReason,omitempty"`
}

type geminiUsage struct {
	PromptTokenCount     int `json:"promptTokenCount"`
	CandidatesTokenCount int `json:"candidatesTokenCount"`
	TotalTokenCount      int `json:"totalTokenCount"`
}

// NewGeminiProvider creates a new Gemini provider.
func NewGeminiProvider(cfg GeminiConfig) *GeminiProvider {
	baseURL := cfg.BaseURL
	if baseURL == "" {
		baseURL = "https://generativelanguage.googleapis.com/v1beta"
	}
	model := cfg.Model
	if model == "" {
		model = "gemini-1.5-flash"
	}

	return &GeminiProvider{
		apiKey:  cfg.APIKey,
		baseURL: strings.TrimRight(baseURL, "/"),
		model:   model,
		client: &http.Client{
			Timeout: 5 * time.Minute,
		},
	}
}

func (p *GeminiProvider) Name() string {
	return "gemini"
}

func (p *GeminiProvider) Models() []ModelInfo {
	return []ModelInfo{
		{
			ID: "gemini-1.5-pro", Name: "Gemini 1.5 Pro", ContextWindow: 2000000,
			CostPer1kIn: 0.00125, CostPer1kOut: 0.005, SupportsTools: true,
		},
		{
			ID: "gemini-1.5-flash", Name: "Gemini 1.5 Flash", ContextWindow: 1000000,
			CostPer1kIn: 0.000075, CostPer1kOut: 0.0003, SupportsTools: true,
		},
		{
			ID: "gemini-2.0-flash", Name: "Gemini 2.0 Flash", ContextWindow: 1000000,
			CostPer1kIn: 0.0001, CostPer1kOut: 0.0004, SupportsTools: true,
		},
	}
}

func (p *GeminiProvider) Complete(ctx context.Context, opts StreamOpts) (*FuncUsage, error) {
	start := time.Now()

	model := opts.Model
	if model == "" {
		model = p.model
	}

	systemPrompt, contents := toGeminiContents(opts.Messages)

	reqBody := geminiRequest{
		Contents: contents,
		GenerationConfig: &geminiGenerationConfig{
			Temperature:     opts.Temp,
			MaxOutputTokens: opts.MaxTokens,
			StopSequences:   opts.Stop,
		},
		Tools: toGeminiTools(opts.Tools),
	}

	if systemPrompt != "" {
		reqBody.SystemInstruction = &geminiContent{
			Parts: []geminiPart{{Text: systemPrompt}},
		}
	}

	body, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("marshal request: %w", err)
	}

	url := fmt.Sprintf("%s/models/%s:streamGenerateContent?alt=sse&key=%s",
		p.baseURL, model, p.apiKey)

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")

	usage, err := p.streamRequest(ctx, httpReq, opts.OnDelta)
	if err != nil {
		return nil, err
	}

	usage.LatencyMs = time.Since(start).Milliseconds()

	p.mu.Lock()
	p.mu.Unlock()

	return usage, nil
}

func (p *GeminiProvider) streamRequest(ctx context.Context, req *http.Request, onDelta func(Chunk) error) (*FuncUsage, error) {
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

func (p *GeminiProvider) processSSEStream(ctx context.Context, body io.Reader, onDelta func(Chunk) error, usage *FuncUsage) error {
	scanner := bufio.NewScanner(body)
	scanner.Buffer(make([]byte, 0, 64*1024), 1024*1024)

	var textBuilder strings.Builder
	toolCalls := make(map[string]*oaitype.ToolCall)

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

		var resp geminiStreamResponse
		if err := json.Unmarshal([]byte(data), &resp); err != nil {
			continue
		}

		if resp.UsageMetadata != nil {
			usage.InputTokens = resp.UsageMetadata.PromptTokenCount
			usage.OutputTokens = resp.UsageMetadata.CandidatesTokenCount
		}

		for _, candidate := range resp.Candidates {
			for _, part := range candidate.Content.Parts {
				if part.Text != "" {
					textBuilder.WriteString(part.Text)

					if onDelta != nil {
						chunk := Chunk{
							Text: part.Text,
							Done: false,
						}
						if err := onDelta(chunk); err != nil {
							return err
						}
					}
				}

				if part.FunctionCall != nil {
					args, _ := json.Marshal(part.FunctionCall.Arguments)
					id := fmt.Sprintf("gemini_%s_%d", part.FunctionCall.Name, len(toolCalls))

					toolCalls[id] = &oaitype.ToolCall{
						ID:   id,
						Type: "function",
						Function: oaitype.FuncCall{
							Name:      part.FunctionCall.Name,
							Arguments: string(args),
						},
					}
				}
			}

			if candidate.FinishReason != "" {
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
	}

	return scanner.Err()
}

func (p *GeminiProvider) Ping(ctx context.Context) error {
	url := fmt.Sprintf("%s/models?key=%s", p.baseURL, p.apiKey)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
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

func (p *GeminiProvider) Reset() error {
	p.mu.Lock()
	defer p.mu.Unlock()
	return nil
}

func toGeminiContents(messages []oaitype.Message) (string, []geminiContent) {
	var system string
	var contents []geminiContent

	for _, msg := range messages {
		if msg.Role == "system" {
			if s, ok := msg.Content.(string); ok {
				system = s
			}
			continue
		}

		role := "user"
		if msg.Role == "assistant" {
			role = "model"
		}

		content := geminiContent{
			Role: role,
			Parts: []geminiPart{
				{Text: fmt.Sprintf("%v", msg.Content)},
			},
		}
		contents = append(contents, content)
	}

	return system, contents
}

func toGeminiTools(tools []oaitype.ToolSpec) []geminiTool {
	if len(tools) == 0 {
		return nil
	}

	decls := make([]geminiFuncDecl, len(tools))
	for i, tool := range tools {
		params, _ := tool.Function.Parameters.(map[string]any)
		decls[i] = geminiFuncDecl{
			Name:        tool.Function.Name,
			Description: tool.Function.Description,
			Parameters:  params,
		}
	}

	return []geminiTool{
		{FunctionDeclarations: decls},
	}
}
