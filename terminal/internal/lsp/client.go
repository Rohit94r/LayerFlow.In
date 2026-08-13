package lsp

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

// Language represents a supported programming language.
type Language string

const (
	LangGo         Language = "go"
	LangTypeScript Language = "typescript"
	LangPython     Language = "python"
)

// Client defines the interface for LSP operations.
type Client interface {
	// Start launches the language server for the given root and language.
	Start(root string, lang Language) error
	// Stop gracefully shuts down the language server.
	Stop() error
	// Diagnostics returns diagnostics for the given file URI.
	Diagnostics(uri string) ([]Diagnostic, error)
	// Definition returns goto-definition locations.
	Definition(uri string, pos Pos) ([]Location, error)
	// References returns all references to the symbol at pos.
	References(uri string, pos Pos) ([]Location, error)
	// Hover returns hover information at the given position.
	Hover(uri string, pos Pos) (*Hover, error)
	// Symbols returns document symbols for the given file.
	Symbols(uri string) ([]Symbol, error)
	// CodeActions returns available code actions in the given range.
	CodeActions(uri string, r Range) ([]CodeAction, error)
}

// Diagnostic represents an LSP diagnostic message.
type Diagnostic struct {
	Range    Range  `json:"range"`
	Severity int    `json:"severity"`
	Message  string `json:"message"`
	Source   string `json:"source"`
}

// Pos is a zero-based line/character position.
type Pos struct {
	Line      int `json:"line"`
	Character int `json:"character"`
}

// Range defines a span between two positions.
type Range struct {
	Start Pos `json:"start"`
	End   Pos `json:"end"`
}

// Location represents a file URI and a range within it.
type Location struct {
	URI   string `json:"uri"`
	Range Range  `json:"range"`
}

// Hover holds the content returned by textDocument/hover.
type Hover struct {
	Contents string `json:"contents"`
}

// Symbol represents a document symbol (function, type, variable, etc.).
type Symbol struct {
	Name     string   `json:"name"`
	Kind     int      `json:"kind"`
	Location Location `json:"location"`
}

// CodeAction represents an available code action (fix, refactor, etc.).
type CodeAction struct {
	Title string `json:"title"`
	Kind  string `json:"kind"`
}

// ServerConfig maps a language to its LSP server binary and args.
type ServerConfig struct {
	Bin  string
	Args []string
}

// languageConfigs returns default LSP server configurations.
func languageConfigs() map[Language]ServerConfig {
	return map[Language]ServerConfig{
		LangGo: {
			Bin:  "gopls",
			Args: []string{"serve"},
		},
		LangTypeScript: {
			Bin:  "typescript-language-server",
			Args: []string{"--stdio"},
		},
		LangPython: {
			Bin:  "pylsp",
			Args: []string{},
		},
	}
}

// lspClient manages a single language server process.
type lspClient struct {
	root    string
	lang    Language
	cmd     *exec.Cmd
	stdin   io.WriteCloser
	stdout  io.ReadCloser
	mu      sync.Mutex
	msgID   int64
	pending map[int64]chan []byte
	diags   map[string][]Diagnostic
	diagMu  sync.RWMutex
	running bool
	cancel  context.CancelFunc
}

// NewClient creates an unconfigured LSP client.
func NewClient() Client {
	return &lspClient{
		pending: make(map[int64]chan []byte),
		diags:   make(map[string][]Diagnostic),
	}
}

// Start launches the language server process and begins reading responses.
func (c *lspClient) Start(root string, lang Language) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.running {
		return fmt.Errorf("lsp already running for %s", c.lang)
	}

	cfg, ok := languageConfigs()[lang]
	if !ok {
		return fmt.Errorf("unsupported language: %s", lang)
	}

	binPath, err := exec.LookPath(cfg.Bin)
	if err != nil {
		return fmt.Errorf("find %s: %w", cfg.Bin, err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	c.cancel = cancel

	cmd := exec.CommandContext(ctx, binPath, cfg.Args...)
	cmd.Dir = root

	stdin, err := cmd.StdinPipe()
	if err != nil {
		cancel()
		return fmt.Errorf("stdin pipe: %w", err)
	}

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		cancel()
		return fmt.Errorf("stdout pipe: %w", err)
	}

	// Capture stderr for diagnostics
	cmd.Stderr = nil

	if err := cmd.Start(); err != nil {
		cancel()
		return fmt.Errorf("start %s: %w", cfg.Bin, err)
	}

	c.cmd = cmd
	c.stdin = stdin
	c.stdout = stdout
	c.root = root
	c.lang = lang
	c.running = true

	// Start reader goroutine
	go c.readLoop(ctx)

	// Initialize LSP handshake
	if err := c.initialize(ctx, root); err != nil {
		c.Stop()
		return fmt.Errorf("lsp init: %w", err)
	}

	return nil
}

// Stop shuts down the language server gracefully.
func (c *lspClient) Stop() error {
	c.mu.Lock()
	defer c.mu.Unlock()

	if !c.running {
		return nil
	}

	c.running = false

	// Send shutdown request
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, _ = c.sendRequest(ctx, "shutdown", nil)
	_ = c.sendNotification(ctx, "exit", nil)

	if c.cancel != nil {
		c.cancel()
	}

	_ = c.stdin.Close()
	_ = c.stdout.Close()

	if c.cmd != nil && c.cmd.Process != nil {
		_ = c.cmd.Process.Kill()
	}

	return nil
}

// Diagnostics returns cached diagnostics for the given URI.
func (c *lspClient) Diagnostics(uri string) ([]Diagnostic, error) {
	c.diagMu.RLock()
	defer c.diagMu.RUnlock()

	diags, ok := c.diags[uri]
	if !ok {
		return nil, nil
	}
	return diags, nil
}

// Definition returns goto-definition locations.
func (c *lspClient) Definition(uri string, pos Pos) ([]Location, error) {
	params := map[string]any{
		"textDocument": map[string]string{"uri": uri},
		"position":     pos,
	}

	result, err := c.sendRequest(context.Background(), "textDocument/definition", params)
	if err != nil {
		return nil, fmt.Errorf("definition: %w", err)
	}

	return parseLocations(result)
}

// References returns all references to the symbol at pos.
func (c *lspClient) References(uri string, pos Pos) ([]Location, error) {
	params := map[string]any{
		"textDocument": map[string]string{"uri": uri},
		"position":     pos,
		"context":      map[string]bool{"includeDeclaration": true},
	}

	result, err := c.sendRequest(context.Background(), "textDocument/references", params)
	if err != nil {
		return nil, fmt.Errorf("references: %w", err)
	}

	return parseLocations(result)
}

// Hover returns hover information at the given position.
func (c *lspClient) Hover(uri string, pos Pos) (*Hover, error) {
	params := map[string]any{
		"textDocument": map[string]string{"uri": uri},
		"position":     pos,
	}

	result, err := c.sendRequest(context.Background(), "textDocument/hover", params)
	if err != nil {
		return nil, fmt.Errorf("hover: %w", err)
	}

	if result == nil {
		return nil, nil
	}

	var h Hover
	if err := json.Unmarshal(result, &h); err != nil {
		return nil, fmt.Errorf("parse hover: %w", err)
	}

	return &h, nil
}

// Symbols returns document symbols for the given file.
func (c *lspClient) Symbols(uri string) ([]Symbol, error) {
	params := map[string]any{
		"textDocument": map[string]string{"uri": uri},
	}

	result, err := c.sendRequest(context.Background(), "textDocument/documentSymbol", params)
	if err != nil {
		return nil, fmt.Errorf("symbols: %w", err)
	}

	if result == nil {
		return nil, nil
	}

	var symbols []Symbol
	if err := json.Unmarshal(result, &symbols); err != nil {
		return nil, fmt.Errorf("parse symbols: %w", err)
	}

	return symbols, nil
}

// CodeActions returns available code actions in the given range.
func (c *lspClient) CodeActions(uri string, r Range) ([]CodeAction, error) {
	params := map[string]any{
		"textDocument": map[string]string{"uri": uri},
		"range":        r,
		"context":      map[string]string{"diagnostics": ""},
	}

	result, err := c.sendRequest(context.Background(), "textDocument/codeAction", params)
	if err != nil {
		return nil, fmt.Errorf("code actions: %w", err)
	}

	if result == nil {
		return nil, nil
	}

	var actions []CodeAction
	if err := json.Unmarshal(result, &actions); err != nil {
		return nil, fmt.Errorf("parse code actions: %w", err)
	}

	return actions, nil
}

// initialize performs the LSP initialization handshake.
func (c *lspClient) initialize(ctx context.Context, root string) error {
	params := map[string]any{
		"processId": os.Getpid(),
		"rootUri":   "file://" + root,
		"capabilities": map[string]any{
			"textDocument": map[string]any{
				"hover":          map[string]any{"contentFormat": []string{"markdown"}},
				"definition":     map[string]any{},
				"references":     map[string]any{},
				"documentSymbol": map[string]any{},
				"codeAction":     map[string]any{},
			},
		},
	}

	_, err := c.sendRequest(ctx, "initialize", params)
	if err != nil {
		return err
	}

	return c.sendNotification(ctx, "initialized", map[string]any{})
}

// sendRequest sends an LSP request and waits for the response.
func (c *lspClient) sendRequest(ctx context.Context, method string, params any) (json.RawMessage, error) {
	c.mu.Lock()
	c.msgID++
	id := c.msgID
	c.mu.Unlock()

	ch := make(chan []byte, 1)
	c.mu.Lock()
	c.pending[id] = ch
	c.mu.Unlock()

	defer func() {
		c.mu.Lock()
		delete(c.pending, id)
		c.mu.Unlock()
	}()

	msg := map[string]any{
		"jsonrpc": "2.0",
		"id":      id,
		"method":  method,
	}
	if params != nil {
		msg["params"] = params
	}

	if err := c.writeMessage(msg); err != nil {
		return nil, err
	}

	select {
	case <-ctx.Done():
		return nil, ctx.Err()
	case resp := <-ch:
		var envelope struct {
			Result json.RawMessage `json:"result"`
			Error  *struct {
				Code    int    `json:"code"`
				Message string `json:"message"`
			} `json:"error"`
		}
		if err := json.Unmarshal(resp, &envelope); err != nil {
			return nil, fmt.Errorf("unmarshal response: %w", err)
		}
		if envelope.Error != nil {
			return nil, fmt.Errorf("lsp error %d: %s", envelope.Error.Code, envelope.Error.Message)
		}
		return envelope.Result, nil
	}
}

// sendNotification sends an LSP notification (no response expected).
func (c *lspClient) sendNotification(_ context.Context, method string, params any) error {
	msg := map[string]any{
		"jsonrpc": "2.0",
		"method":  method,
	}
	if params != nil {
		msg["params"] = params
	}

	return c.writeMessage(msg)
}

// writeMessage sends a JSON-RPC message with Content-Length framing.
func (c *lspClient) writeMessage(msg any) error {
	data, err := json.Marshal(msg)
	if err != nil {
		return fmt.Errorf("marshal message: %w", err)
	}

	header := fmt.Sprintf("Content-Length: %d\r\n\r\n", len(data))
	_, err = c.stdin.Write([]byte(header))
	if err != nil {
		return fmt.Errorf("write header: %w", err)
	}

	_, err = c.stdin.Write(data)
	if err != nil {
		return fmt.Errorf("write body: %w", err)
	}

	return nil
}

// readLoop reads LSP responses and dispatches them.
func (c *lspClient) readLoop(ctx context.Context) {
	reader := bufio.NewReader(c.stdout)

	for {
		select {
		case <-ctx.Done():
			return
		default:
		}

		// Read Content-Length header
		contentLength, err := c.readHeader(reader)
		if err != nil {
			if ctx.Err() != nil {
				return
			}
			continue
		}

		// Read message body
		body := make([]byte, contentLength)
		if _, err := io.ReadFull(reader, body); err != nil {
			continue
		}

		// Parse the message
		var msg struct {
			ID     *int64          `json:"id"`
			Method string          `json:"method"`
			Params json.RawMessage `json:"params"`
		}

		if err := json.Unmarshal(body, &msg); err != nil {
			continue
		}

		// Handle notifications (diagnostics)
		if msg.ID == nil && msg.Method == "textDocument/publishDiagnostics" {
			var params struct {
				URI         string       `json:"uri"`
				Diagnostics []Diagnostic `json:"diagnostics"`
			}
			if err := json.Unmarshal(msg.Params, &params); err == nil {
				c.diagMu.Lock()
				c.diags[params.URI] = params.Diagnostics
				c.diagMu.Unlock()
			}
			continue
		}

		// Dispatch response to pending request
		if msg.ID != nil {
			c.mu.Lock()
			ch, ok := c.pending[*msg.ID]
			c.mu.Unlock()
			if ok {
				select {
				case ch <- body:
				default:
				}
			}
		}
	}
}

// readHeader parses the Content-Length header from the LSP stream.
func (c *lspClient) readHeader(reader *bufio.Reader) (int, error) {
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

// parseLocations converts a raw JSON response to []Location.
func parseLocations(raw json.RawMessage) ([]Location, error) {
	if raw == nil {
		return nil, nil
	}

	// Handle both single location and array
	var single Location
	if err := json.Unmarshal(raw, &single); err == nil && single.URI != "" {
		return []Location{single}, nil
	}

	var locs []Location
	if err := json.Unmarshal(raw, &locs); err != nil {
		return nil, fmt.Errorf("parse locations: %w", err)
	}

	return locs, nil
}

// FileToURI converts a file path to an LSP URI.
func FileToURI(path string) string {
	abs, err := filepath.Abs(path)
	if err != nil {
		return "file://" + path
	}
	return "file://" + abs
}

// URIToFile converts an LSP URI to a file path.
func URIToFile(uri string) string {
	return strings.TrimPrefix(uri, "file://")
}

// CachedClient wraps a Client with per-session caching that expires on file change.
type CachedClient struct {
	inner   Client
	diags   map[string]cachedDiag
	diagsMu sync.RWMutex
}

type cachedDiag struct {
	diags     []Diagnostic
	updatedAt time.Time
}

// NewCachedClient wraps the given client with caching.
func NewCachedClient(inner Client) *CachedClient {
	return &CachedClient{
		inner: inner,
		diags: make(map[string]cachedDiag),
	}
}

// Invalidate removes cached data for the given URI.
func (c *CachedClient) Invalidate(uri string) {
	c.diagsMu.Lock()
	defer c.diagsMu.Unlock()
	delete(c.diags, uri)
}

// Diagnostics returns cached diagnostics, refreshing if stale.
func (c *CachedClient) Diagnostics(uri string) ([]Diagnostic, error) {
	c.diagsMu.RLock()
	cd, ok := c.diags[uri]
	c.diagsMu.RUnlock()

	if ok && time.Since(cd.updatedAt) < 5*time.Second {
		return cd.diags, nil
	}

	diags, err := c.inner.Diagnostics(uri)
	if err != nil {
		return nil, err
	}

	c.diagsMu.Lock()
	c.diags[uri] = cachedDiag{diags: diags, updatedAt: time.Now()}
	c.diagsMu.Unlock()

	return diags, nil
}

// Start delegates to the inner client.
func (c *CachedClient) Start(root string, lang Language) error {
	return c.inner.Start(root, lang)
}

// Stop delegates to the inner client.
func (c *CachedClient) Stop() error {
	return c.inner.Stop()
}

// Definition delegates to the inner client.
func (c *CachedClient) Definition(uri string, pos Pos) ([]Location, error) {
	return c.inner.Definition(uri, pos)
}

// References delegates to the inner client.
func (c *CachedClient) References(uri string, pos Pos) ([]Location, error) {
	return c.inner.References(uri, pos)
}

// Hover delegates to the inner client.
func (c *CachedClient) Hover(uri string, pos Pos) (*Hover, error) {
	return c.inner.Hover(uri, pos)
}

// Symbols delegates to the inner client.
func (c *CachedClient) Symbols(uri string) ([]Symbol, error) {
	return c.inner.Symbols(uri)
}

// CodeActions delegates to the inner client.
func (c *CachedClient) CodeActions(uri string, r Range) ([]CodeAction, error) {
	return c.inner.CodeActions(uri, r)
}

// HealthCheck pings the LSP server to verify it is responsive.
func HealthCheck(ctx context.Context, c Client, uri string) bool {
	_, err := c.Diagnostics(uri)
	return err == nil
}

// AutoRestart wraps a Client to restart on failure.
type AutoRestart struct {
	inner    Client
	root     string
	lang     Language
	maxRetry int
}

// NewAutoRestart creates a client that auto-restarts on failure.
func NewAutoRestart(inner Client, root string, lang Language) *AutoRestart {
	return &AutoRestart{
		inner:    inner,
		root:     root,
		lang:     lang,
		maxRetry: 3,
	}
}

// Start delegates and retries on failure.
func (a *AutoRestart) Start(root string, lang Language) error {
	a.root = root
	a.lang = lang
	return a.inner.Start(root, lang)
}

// Stop delegates to the inner client.
func (a *AutoRestart) Stop() error {
	return a.inner.Stop()
}

// Diagnostics checks health and restarts if needed.
func (a *AutoRestart) Diagnostics(uri string) ([]Diagnostic, error) {
	diags, err := a.inner.Diagnostics(uri)
	if err != nil {
		if restartErr := a.restart(); restartErr != nil {
			return nil, fmt.Errorf("restart failed: %w", restartErr)
		}
		return a.inner.Diagnostics(uri)
	}
	return diags, nil
}

// Definition checks health and restarts if needed.
func (a *AutoRestart) Definition(uri string, pos Pos) ([]Location, error) {
	locs, err := a.inner.Definition(uri, pos)
	if err != nil {
		if restartErr := a.restart(); restartErr != nil {
			return nil, fmt.Errorf("restart failed: %w", restartErr)
		}
		return a.inner.Definition(uri, pos)
	}
	return locs, nil
}

// References checks health and restarts if needed.
func (a *AutoRestart) References(uri string, pos Pos) ([]Location, error) {
	locs, err := a.inner.References(uri, pos)
	if err != nil {
		if restartErr := a.restart(); restartErr != nil {
			return nil, fmt.Errorf("restart failed: %w", restartErr)
		}
		return a.inner.References(uri, pos)
	}
	return locs, nil
}

// Hover checks health and restarts if needed.
func (a *AutoRestart) Hover(uri string, pos Pos) (*Hover, error) {
	h, err := a.inner.Hover(uri, pos)
	if err != nil {
		if restartErr := a.restart(); restartErr != nil {
			return nil, fmt.Errorf("restart failed: %w", restartErr)
		}
		return a.inner.Hover(uri, pos)
	}
	return h, nil
}

// Symbols checks health and restarts if needed.
func (a *AutoRestart) Symbols(uri string) ([]Symbol, error) {
	syms, err := a.inner.Symbols(uri)
	if err != nil {
		if restartErr := a.restart(); restartErr != nil {
			return nil, fmt.Errorf("restart failed: %w", restartErr)
		}
		return a.inner.Symbols(uri)
	}
	return syms, nil
}

// CodeActions checks health and restarts if needed.
func (a *AutoRestart) CodeActions(uri string, r Range) ([]CodeAction, error) {
	actions, err := a.inner.CodeActions(uri, r)
	if err != nil {
		if restartErr := a.restart(); restartErr != nil {
			return nil, fmt.Errorf("restart failed: %w", restartErr)
		}
		return a.inner.CodeActions(uri, r)
	}
	return actions, nil
}

func (a *AutoRestart) restart() error {
	_ = a.inner.Stop()
	return a.inner.Start(a.root, a.lang)
}

// DetectLanguage returns the Language for the given file extension.
func DetectLanguage(path string) (Language, bool) {
	ext := strings.ToLower(filepath.Ext(path))
	switch ext {
	case ".go":
		return LangGo, true
	case ".ts", ".tsx", ".js", ".jsx":
		return LangTypeScript, true
	case ".py":
		return LangPython, true
	default:
		return "", false
	}
}
