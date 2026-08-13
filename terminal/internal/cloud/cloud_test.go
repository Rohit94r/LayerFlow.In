package cloud

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
)

func TestChatStreamParsesSSE(t *testing.T) {
	var gotPath atomic.Value
	gotPath.Store("")

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotPath.Store(r.URL.Path)
		if got := r.Header.Get("Authorization"); got != "Bearer lf_live_test" {
			t.Errorf("Authorization = %q, want Bearer lf_live_test", got)
		}
		w.Header().Set("Content-Type", "text/event-stream")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("data: {\"choices\":[{\"delta\":{\"content\":\"Hel\"}}]}\n\n"))
		_, _ = w.Write([]byte("data: {\"choices\":[{\"delta\":{\"content\":\"lo\"},\"finish_reason\":\"stop\"}]}\n\n"))
		_, _ = w.Write([]byte("data: {\"usage\":{\"prompt_tokens\":10,\"completion_tokens\":5,\"total_tokens\":15}}\n\n"))
		_, _ = w.Write([]byte("data: [DONE]\n\n"))
	}))

	c := NewClient(srv.URL, "lf_live_test")
	var got strings.Builder
	resp, err := c.ChatStream(context.Background(), ChatOptions{
		Model:    "deepseek-chat",
		Messages: []Message{{Role: "user", Content: "hi"}},
	}, func(d string) { got.WriteString(d) })
	if err != nil {
		t.Fatalf("ChatStream: %v", err)
	}
	if got.String() != "Hello" {
		t.Errorf("streamed content = %q, want %q", got.String(), "Hello")
	}
	if resp.Choices[0].Message.Content != "Hello" {
		t.Errorf("final content = %q, want %q", resp.Choices[0].Message.Content, "Hello")
	}
	if resp.Usage.TotalTokens != 15 {
		t.Errorf("total tokens = %d, want 15", resp.Usage.TotalTokens)
	}
	if p, _ := gotPath.Load().(string); p != "/v1/chat/completions" {
		t.Errorf("path = %q, want /v1/chat/completions", p)
	}
}

func TestChatStreamRejectsErrorChunk(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/event-stream")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("data: {\"error\":{\"code\":\"insufficient_balance\",\"message\":\"Insufficient Balance\"}}\n\n"))
		_, _ = w.Write([]byte("data: [DONE]\n\n"))
	}))

	c := NewClient(srv.URL, "lf_live_test")
	_, err := c.ChatStream(context.Background(), ChatOptions{
		Model:    "deepseek-chat",
		Messages: []Message{{Role: "user", Content: "hi"}},
	}, nil)
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if !strings.Contains(err.Error(), "Insufficient Balance") {
		t.Errorf("error = %v, want it to mention the gateway message", err)
	}
}

func TestChatStreamUnauthorized(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		_, _ = w.Write([]byte(`{"error":{"code":"unauthorized"}}`))
	}))

	c := NewClient(srv.URL, "lf_live_bad")
	_, err := c.ChatStream(context.Background(), ChatOptions{
		Model:    "deepseek-chat",
		Messages: []Message{{Role: "user", Content: "hi"}},
	}, nil)
	if !errors.Is(err, ErrInvalidKey) {
		t.Errorf("error = %v, want ErrInvalidKey", err)
	}
}

func TestChatNonStream(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{
			"id": "cmpl-1",
			"object": "chat.completion",
			"model": "deepseek-chat",
			"choices": [{"index": 0, "message": {"role": "assistant", "content": "42"}, "finish_reason": "stop"}],
			"usage": {"prompt_tokens": 3, "completion_tokens": 1, "total_tokens": 4}
		}`))
	}))

	c := NewClient(srv.URL, "lf_live_test")
	resp, err := c.Chat(context.Background(), ChatOptions{
		Model:    "deepseek-chat",
		Messages: []Message{{Role: "user", Content: "2+2"}},
	})
	if err != nil {
		t.Fatalf("Chat: %v", err)
	}
	if resp.Choices[0].Message.Content != "42" {
		t.Errorf("content = %q, want 42", resp.Choices[0].Message.Content)
	}
}

func TestListModels(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/models" {
			t.Errorf("path = %q, want /v1/models", r.URL.Path)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"data":[{"id":"deepseek-chat","available":true},{"id":"gpt-4o","available":false}]}`))
	}))

	c := NewClient(srv.URL, "lf_live_test")
	models, err := c.ListModels(context.Background())
	if err != nil {
		t.Fatalf("ListModels: %v", err)
	}
	if len(models) != 2 {
		t.Fatalf("len(models) = %d, want 2", len(models))
	}
	if !models[0].Available || models[1].Available {
		t.Errorf("availability flags wrong: %+v", models)
	}
}

func TestResolveAPIKeyPriority(t *testing.T) {
	t.Setenv("LF_API_KEY", "env-key")
	if k, err := ResolveAPIKey(nil); err != nil || k != "env-key" {
		t.Errorf("env not honored: %q, %v", k, err)
	}
}

func TestResolveBaseURLPriority(t *testing.T) {
	t.Setenv("LF_API_URL", "http://env")
	if got := ResolveBaseURL(nil); got != "http://env" {
		t.Errorf("base url = %q, want http://env", got)
	}
}

func TestRequestEncoding(t *testing.T) {
	var reqBody map[string]any
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewDecoder(r.Body).Decode(&reqBody)
		_, _ = w.Write([]byte(`{"choices":[{"message":{"role":"assistant","content":"ok"}}]}`))
	}))

	c := NewClient(srv.URL, "lf_live_test")
	_, err := c.Chat(context.Background(), ChatOptions{
		Model:    "deepseek-chat",
		Messages: []Message{{Role: "user", Content: "hi"}},
	})
	if err != nil {
		t.Fatalf("Chat: %v", err)
	}
	if reqBody["model"] != "deepseek-chat" {
		t.Errorf("model in body = %v", reqBody["model"])
	}
	if _, hasStream := reqBody["stream"]; hasStream {
		t.Errorf("non-stream request should not carry stream flag")
	}
}
