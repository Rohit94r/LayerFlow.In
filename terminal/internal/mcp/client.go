package mcp

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os/exec"
	"strings"
	"sync"
	"time"
)

// ConnState represents the connection state of an MCP server.
type ConnState int

const (
	StateDisconnected ConnState = iota
	StateConnected
	StateError
)

// Server describes an MCP server and its available tools.
type Server struct {
	Name  string     `json:"name"`
	Kind  string     `json:"kind"` // stdio, sse, http
	Ref   string     `json:"ref"`  // binary path or URL
	Tools []ToolInfo `json:"tools"`
	state ConnState
	mu    sync.Mutex
}

// ToolInfo describes a single tool exposed by an MCP server.
type ToolInfo struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	InputSchema any    `json:"input_schema"`
}

// CallResult is the response from a tool invocation.
type CallResult struct {
	Content any    `json:"content"`
	Error   string `json:"error"`
}

// Health represents the health status of an MCP server.
type Health struct {
	Status  string `json:"status"`
	Latency int64  `json:"latency_ms"`
}

// Client defines the interface for interacting with MCP servers.
type Client interface {
	// List returns all registered servers and their tools.
	List(ctx context.Context) ([]*Server, error)
	// Add registers a new MCP server.
	Add(ctx context.Context, s *Server) error
	// Remove deregisters an MCP server by name.
	Remove(ctx context.Context, name string) error
	// Call invokes a tool on the named server.
	Call(ctx context.Context, server, tool string, args any) (*CallResult, error)
	// Health checks if the named server is reachable.
	Health(ctx context.Context, name string) (Health, error)
}

// Registry manages a set of MCP server connections.
type Registry struct {
	servers map[string]*Server
	mu      sync.RWMutex
}

// NewRegistry creates an empty MCP registry.
func NewRegistry() *Registry {
	return &Registry{
		servers: make(map[string]*Server),
	}
}

// List returns all registered servers.
func (r *Registry) List(ctx context.Context) ([]*Server, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	result := make([]*Server, 0, len(r.servers))
	for _, s := range r.servers {
		result = append(result, s)
	}
	return result, nil
}

// Add registers a server in the registry and connects to it.
func (r *Registry) Add(ctx context.Context, s *Server) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.servers[s.Name]; exists {
		return fmt.Errorf("server %q already registered", s.Name)
	}

	r.servers[s.Name] = s
	return nil
}

// Remove deregisters a server and disconnects it.
func (r *Registry) Remove(ctx context.Context, name string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	s, ok := r.servers[name]
	if !ok {
		return fmt.Errorf("server %q not found", name)
	}

	s.mu.Lock()
	s.state = StateDisconnected
	s.mu.Unlock()

	delete(r.servers, name)
	return nil
}

// Call invokes a tool on the named server using the appropriate transport.
func (r *Registry) Call(ctx context.Context, serverName, tool string, args any) (*CallResult, error) {
	r.mu.RLock()
	s, ok := r.servers[serverName]
	r.mu.RUnlock()

	if !ok {
		return nil, fmt.Errorf("server %q not found", serverName)
	}

	switch s.Kind {
	case "stdio":
		return callStdio(ctx, s, tool, args)
	case "sse":
		return callHTTP(ctx, s, tool, args)
	case "http":
		return callHTTP(ctx, s, tool, args)
	default:
		return nil, fmt.Errorf("unsupported transport: %s", s.Kind)
	}
}

// Health checks if a server is reachable and responsive.
func (r *Registry) Health(ctx context.Context, name string) (Health, error) {
	r.mu.RLock()
	s, ok := r.servers[name]
	r.mu.RUnlock()

	if !ok {
		return Health{}, fmt.Errorf("server %q not found", name)
	}

	start := time.Now()

	switch s.Kind {
	case "http", "sse":
		health, err := healthHTTP(ctx, s)
		if err != nil {
			return Health{Status: "error", Latency: time.Since(start).Milliseconds()}, nil
		}
		return health, nil
	case "stdio":
		// For stdio, a health check is just verifying the process can accept a ping
		_, err := callStdio(ctx, s, "ping", nil)
		if err != nil {
			return Health{Status: "error", Latency: time.Since(start).Milliseconds()}, nil
		}
		return Health{Status: "ok", Latency: time.Since(start).Milliseconds()}, nil
	default:
		return Health{Status: "unknown"}, nil
	}
}

// ToolNames returns fully qualified tool names in the format "server::tool".
func (r *Registry) ToolNames() []string {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var names []string
	for _, s := range r.servers {
		for _, t := range s.Tools {
			names = append(names, s.Name+"::"+t.Name)
		}
	}
	return names
}

// FindTool looks up a tool by its fully qualified name ("server::tool").
func (r *Registry) FindTool(fqName string) (*Server, *ToolInfo, error) {
	parts := strings.SplitN(fqName, "::", 2)
	if len(parts) != 2 {
		return nil, nil, fmt.Errorf("invalid tool name %q, expected server::tool", fqName)
	}

	r.mu.RLock()
	defer r.mu.RUnlock()

	s, ok := r.servers[parts[0]]
	if !ok {
		return nil, nil, fmt.Errorf("server %q not found", parts[0])
	}

	for i := range s.Tools {
		if s.Tools[i].Name == parts[1] {
			return s, &s.Tools[i], nil
		}
	}

	return nil, nil, fmt.Errorf("tool %q not found on server %q", parts[1], parts[0])
}

// callStdio invokes a tool via JSON-RPC 2.0 over stdin/stdout of a subprocess.
func callStdio(ctx context.Context, s *Server, tool string, args any) (*CallResult, error) {
	s.mu.Lock()
	s.state = StateConnected
	s.mu.Unlock()

	cmd := exec.CommandContext(ctx, s.Ref)
	cmd.Dir = "."

	stdin, err := cmd.StdinPipe()
	if err != nil {
		return nil, fmt.Errorf("stdin pipe: %w", err)
	}

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return nil, fmt.Errorf("stdout pipe: %w", err)
	}

	if err := cmd.Start(); err != nil {
		s.mu.Lock()
		s.state = StateError
		s.mu.Unlock()
		return nil, fmt.Errorf("start process: %w", err)
	}

	// Send JSON-RPC 2.0 request
	req := map[string]any{
		"jsonrpc": "2.0",
		"id":      1,
		"method":  "tools/call",
		"params": map[string]any{
			"name":      tool,
			"arguments": args,
		},
	}

	data, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("marshal request: %w", err)
	}

	// Content-Length framing
	header := fmt.Sprintf("Content-Length: %d\r\n\r\n", len(data))
	if _, err := stdin.Write([]byte(header)); err != nil {
		return nil, fmt.Errorf("write header: %w", err)
	}
	if _, err := stdin.Write(data); err != nil {
		return nil, fmt.Errorf("write body: %w", err)
	}

	// Read response
	reader := bufio.NewReader(stdout)
	contentLength, err := readContentLength(reader)
	if err != nil {
		return nil, fmt.Errorf("read response header: %w", err)
	}

	respBody := make([]byte, contentLength)
	if _, err := io.ReadFull(reader, respBody); err != nil {
		return nil, fmt.Errorf("read response body: %w", err)
	}

	_ = stdin.Close()
	_ = cmd.Process.Kill()

	var resp struct {
		Result CallResult `json:"result"`
		Error  *struct {
			Code    int    `json:"code"`
			Message string `json:"message"`
		} `json:"error"`
	}

	if err := json.Unmarshal(respBody, &resp); err != nil {
		return nil, fmt.Errorf("unmarshal response: %w", err)
	}

	if resp.Error != nil {
		return &CallResult{Error: resp.Error.Message}, nil
	}

	return &resp.Result, nil
}

// callHTTP invokes a tool via HTTP POST with JSON-RPC 2.0 payload.
func callHTTP(ctx context.Context, s *Server, tool string, args any) (*CallResult, error) {
	s.mu.Lock()
	s.state = StateConnected
	s.mu.Unlock()

	req := map[string]any{
		"jsonrpc": "2.0",
		"id":      1,
		"method":  "tools/call",
		"params": map[string]any{
			"name":      tool,
			"arguments": args,
		},
	}

	data, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("marshal request: %w", err)
	}

	httpClient := &http.Client{Timeout: 60 * time.Second}
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, s.Ref, bytes.NewReader(data))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Accept", "application/json")

	resp, err := httpClient.Do(httpReq)
	if err != nil {
		s.mu.Lock()
		s.state = StateError
		s.mu.Unlock()
		return nil, fmt.Errorf("http request: %w", err)
	}
	defer resp.Body.Close()

	respBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}

	if resp.StatusCode >= 400 {
		s.mu.Lock()
		s.state = StateError
		s.mu.Unlock()
		return &CallResult{Error: fmt.Sprintf("server error %d: %s", resp.StatusCode, string(respBytes))}, nil
	}

	var rpcResp struct {
		Result CallResult `json:"result"`
		Error  *struct {
			Code    int    `json:"code"`
			Message string `json:"message"`
		} `json:"error"`
	}

	if err := json.Unmarshal(respBytes, &rpcResp); err != nil {
		return nil, fmt.Errorf("unmarshal response: %w", err)
	}

	if rpcResp.Error != nil {
		return &CallResult{Error: rpcResp.Error.Message}, nil
	}

	return &rpcResp.Result, nil
}

// healthHTTP performs a health check via HTTP.
func healthHTTP(ctx context.Context, s *Server) (Health, error) {
	start := time.Now()

	httpClient := &http.Client{Timeout: 5 * time.Second}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, s.Ref+"/health", nil)
	if err != nil {
		return Health{Status: "error", Latency: time.Since(start).Milliseconds()}, err
	}

	resp, err := httpClient.Do(req)
	if err != nil {
		return Health{Status: "error", Latency: time.Since(start).Milliseconds()}, err
	}
	defer resp.Body.Close()

	latency := time.Since(start).Milliseconds()

	if resp.StatusCode >= 400 {
		return Health{Status: "error", Latency: latency}, nil
	}

	return Health{Status: "ok", Latency: latency}, nil
}

// readContentLength reads an LSP-style Content-Length header from a stream.
func readContentLength(reader *bufio.Reader) (int, error) {
	for {
		line, err := reader.ReadString('\n')
		if err != nil {
			return 0, err
		}

		line = strings.TrimSpace(line)
		if line == "" {
			break
		}

		if strings.HasPrefix(line, "Content-Length: ") {
			var length int
			if _, err := fmt.Sscanf(line, "Content-Length: %d", &length); err == nil {
				return length, nil
			}
		}
	}

	return 0, fmt.Errorf("no Content-Length header found")
}

// PermissionPrompter is called when a tool requires user permission.
type PermissionPrompter interface {
	// Prompt asks the user to approve a tool call.
	Prompt(server, tool string, args any) bool
}

// PermissionRegistry wraps Registry with permission checks before tool calls.
type PermissionRegistry struct {
	registry *Registry
	prompter PermissionPrompter
}

// NewPermissionRegistry creates a Registry that gates calls behind permissions.
func NewPermissionRegistry(r *Registry, p PermissionPrompter) *PermissionRegistry {
	return &PermissionRegistry{
		registry: r,
		prompter: p,
	}
}

// List returns all registered servers.
func (pr *PermissionRegistry) List(ctx context.Context) ([]*Server, error) {
	return pr.registry.List(ctx)
}

// Add registers a new server.
func (pr *PermissionRegistry) Add(ctx context.Context, s *Server) error {
	return pr.registry.Add(ctx, s)
}

// Remove deregisters a server.
func (pr *PermissionRegistry) Remove(ctx context.Context, name string) error {
	return pr.registry.Remove(ctx, name)
}

// Call prompts for permission before invoking the tool.
func (pr *PermissionRegistry) Call(ctx context.Context, server, tool string, args any) (*CallResult, error) {
	if pr.prompter != nil && !pr.prompter.Prompt(server, tool, args) {
		return &CallResult{Error: "permission denied by user"}, nil
	}
	return pr.registry.Call(ctx, server, tool, args)
}

// Health delegates to the underlying registry.
func (pr *PermissionRegistry) Health(ctx context.Context, name string) (Health, error) {
	return pr.registry.Health(ctx, name)
}

// ExponentialBackoff retries a health check with increasing delays.
func ExponentialBackoff(ctx context.Context, name string, check func(ctx context.Context, name string) (Health, error), maxAttempts int) (Health, error) {
	delay := 500 * time.Millisecond
	var lastErr error

	for attempt := 0; attempt < maxAttempts; attempt++ {
		health, err := check(ctx, name)
		if err == nil && health.Status == "ok" {
			return health, nil
		}

		lastErr = err

		select {
		case <-ctx.Done():
			return health, ctx.Err()
		case <-time.After(delay):
		}

		delay *= 2
		if delay > 30*time.Second {
			delay = 30 * time.Second
		}
	}

	return Health{Status: "error"}, fmt.Errorf("health check failed after %d attempts: %w", maxAttempts, lastErr)
}

// ServerState returns the connection state of a server.
func (r *Registry) ServerState(name string) (ConnState, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	s, ok := r.servers[name]
	if !ok {
		return StateDisconnected, fmt.Errorf("server %q not found", name)
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	return s.state, nil
}

// SetState manually sets the connection state of a server.
func (r *Registry) SetState(name string, state ConnState) error {
	r.mu.RLock()
	defer r.mu.RUnlock()

	s, ok := r.servers[name]
	if !ok {
		return fmt.Errorf("server %q not found", name)
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	s.state = state
	return nil
}
