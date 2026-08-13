// Package providers defines the core LLM provider interface and registry.
package providers

import (
	"context"
	"fmt"
	"sync"

	"github.com/layerflow/terminal/pkg/oaitype"
)

// Provider is the core interface for LLM providers.
type Provider interface {
	// Name returns the provider name (e.g., "openai", "anthropic").
	Name() string

	// Models returns the list of available models for this provider.
	Models() []ModelInfo

	// Complete sends a streaming completion request and returns usage stats.
	Complete(ctx context.Context, opts StreamOpts) (*FuncUsage, error)

	// Ping checks if the provider is reachable.
	Ping(ctx context.Context) error

	// Reset clears any cached state for this provider.
	Reset() error
}

// ModelInfo describes a model offered by a provider.
type ModelInfo struct {
	ID            string
	Name          string
	ContextWindow int
	CostPer1kIn   float64
	CostPer1kOut  float64
	SupportsTools bool
}

// FuncUsage reports resource consumption for a single completion call.
type FuncUsage struct {
	InputTokens  int
	OutputTokens int
	CostMicro    int64
	LatencyMs    int64
}

// StreamOpts configures a streaming completion request.
type StreamOpts struct {
	Model     string
	Messages  []oaitype.Message
	Tools     []oaitype.ToolSpec
	MaxTokens int
	Temp      float64
	Stop      []string
	OnDelta   func(Chunk) error
	CTX       context.Context
}

// Chunk is a piece of a streaming response.
type Chunk struct {
	Text      string
	ToolCalls []oaitype.ToolCall
	Usage     *FuncUsage
	Done      bool
	Err       error
}

// ProviderFactory constructs a Provider from a configuration map.
type ProviderFactory func(config map[string]any) (Provider, error)

// Registry holds provider factories keyed by name.
type Registry struct {
	mu        sync.RWMutex
	factories map[string]ProviderFactory
}

// NewRegistry creates an empty registry.
func NewRegistry() *Registry {
	return &Registry{
		factories: make(map[string]ProviderFactory),
	}
}

// Register adds a provider factory under the given name.
// It returns an error if the name is already taken.
func (r *Registry) Register(name string, factory ProviderFactory) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.factories[name]; exists {
		return fmt.Errorf("provider %q already registered", name)
	}
	r.factories[name] = factory
	return nil
}

// Get returns a new Provider instance for the named provider.
func (r *Registry) Get(name string, config map[string]any) (Provider, error) {
	r.mu.RLock()
	factory, ok := r.factories[name]
	r.mu.RUnlock()

	if !ok {
		return nil, fmt.Errorf("unknown provider %q", name)
	}
	return factory(config)
}

// List returns the names of all registered providers.
func (r *Registry) List() []string {
	r.mu.RLock()
	defer r.mu.RUnlock()

	names := make([]string, 0, len(r.factories))
	for name := range r.factories {
		names = append(names, name)
	}
	return names
}
