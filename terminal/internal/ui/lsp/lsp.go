package lsp

import (
	"github.com/layerflow/terminal/internal/ui/lsp/protocol"
)

// ServerState mirrors the lifecycle of an LSP server connection.
type ServerState int

const (
	StateStarting ServerState = iota
	StateRunning
	StateStopped
	StateError
	StateNotStarted
)

func (s ServerState) String() string {
	switch s {
	case StateStarting:
		return "starting"
	case StateRunning:
		return "running"
	case StateStopped:
		return "stopped"
	case StateError:
		return "error"
	default:
		return "not started"
	}
}

// Client is the LSP client surface the status bar renders.
type Client struct {
	name   string
	state  ServerState
	diags  map[string][]protocol.Diagnostic
	info   *ServerInfo
	config Command
}

// Command describes how an LSP server is launched.
type Command struct {
	Command string
	Args    []string
	Options any
}

// ServerInfo is optional metadata about a connected server.
type ServerInfo struct {
	Name    string
	Version string
}

func NewClient(name string, config Command) *Client {
	return &Client{name: name, config: config, state: StateNotStarted, diags: make(map[string][]protocol.Diagnostic)}
}

func (c *Client) Name() string {
	return c.name
}

func (c *Client) GetConfig() Command {
	return c.config
}

func (c *Client) SetServerState(state ServerState) {
	c.state = state
}

func (c *Client) GetServerState() ServerState {
	return c.state
}

// GetDiagnostics returns the aggregate per-location diagnostics, keyed by
// language server name.
func (c *Client) GetDiagnostics() map[string][]protocol.Diagnostic {
	return c.diags
}

// AddDiagnostics replaces the cached diagnostics entries for a server.
func (c *Client) AddDiagnostics(key string, diags []protocol.Diagnostic) {
	c.diags[key] = diags
}
