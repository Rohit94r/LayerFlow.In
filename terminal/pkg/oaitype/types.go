// Package oaitype provides OpenAI-compatible request/response types.
package oaitype

// Message represents a chat message.
type Message struct {
	Role       string     `json:"role"`
	Content    any        `json:"content"`
	ToolCalls  []ToolCall `json:"tool_calls,omitempty"`
	ToolCallID string     `json:"tool_call_id,omitempty"`
	Name       string     `json:"name,omitempty"`
}

// ContentPart represents a part of a multi-modal content.
type ContentPart struct {
	Type     string    `json:"type"`
	Text     string    `json:"text,omitempty"`
	ImageURL *ImageURL `json:"image_url,omitempty"`
}

// ImageURL represents an image URL in a content part.
type ImageURL struct {
	URL string `json:"url"`
}

// ToolCall represents a tool call from the assistant.
type ToolCall struct {
	ID       string   `json:"id"`
	Type     string   `json:"type"`
	Index    int      `json:"index,omitempty"`
	Function FuncCall `json:"function"`
}

// FuncCall represents a function call.
type FuncCall struct {
	Name      string `json:"name"`
	Arguments string `json:"arguments"`
}

// ToolSpec represents a tool specification for the API.
type ToolSpec struct {
	Type     string       `json:"type"`
	Function ToolSpecFunc `json:"function"`
}

// ToolSpecFunc represents a tool function specification.
type ToolSpecFunc struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Parameters  any    `json:"parameters"`
}

// ChatRequest represents an OpenAI-compatible chat request.
type ChatRequest struct {
	Model       string     `json:"model"`
	Messages    []Message  `json:"messages"`
	Tools       []ToolSpec `json:"tools,omitempty"`
	MaxTokens   int        `json:"max_tokens,omitempty"`
	Temperature float64    `json:"temperature,omitempty"`
	Stream      bool       `json:"stream"`
	Stop        []string   `json:"stop,omitempty"`
}

// ChatResponse represents an OpenAI-compatible chat response.
type ChatResponse struct {
	ID      string   `json:"id"`
	Choices []Choice `json:"choices"`
	Usage   Usage    `json:"usage"`
}

// Choice represents a response choice.
type Choice struct {
	Index        int     `json:"index"`
	Message      Message `json:"message"`
	FinishReason string  `json:"finish_reason"`
}

// Usage represents token usage.
type Usage struct {
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens int `json:"completion_tokens"`
	TotalTokens      int `json:"total_tokens"`
}

// StreamDelta represents a streaming response delta.
type StreamDelta struct {
	ID      string         `json:"id"`
	Choices []StreamChoice `json:"choices"`
	Usage   *Usage         `json:"usage,omitempty"`
}

// StreamChoice represents a streaming choice.
type StreamChoice struct {
	Index        int             `json:"index"`
	Delta        StreamDeltaData `json:"delta"`
	FinishReason *string         `json:"finish_reason"`
}

// StreamDeltaData represents streaming delta data.
type StreamDeltaData struct {
	Role      string     `json:"role,omitempty"`
	Content   string     `json:"content,omitempty"`
	ToolCalls []ToolCall `json:"tool_calls,omitempty"`
}
