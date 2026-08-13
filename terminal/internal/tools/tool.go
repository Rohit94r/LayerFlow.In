package tools

import (
	"context"
	"fmt"
	"sync"
)

// Risk classifies the potential impact of a tool invocation.
type Risk int

const (
	RiskRead        Risk = iota // Read-only operations
	RiskWrite                   // Mutating operations
	RiskExec                    // Command execution
	RiskDestructive             // Irreversible or high-impact operations
)

func (r Risk) String() string {
	switch r {
	case RiskRead:
		return "read"
	case RiskWrite:
		return "write"
	case RiskExec:
		return "exec"
	case RiskDestructive:
		return "destructive"
	default:
		return "unknown"
	}
}

// Spec declares a tool's metadata, risk profile, and permission requirements.
type Spec struct {
	Name        string   // Unique identifier, e.g. "read_file"
	Description string   // Human-readable summary for the LLM and the user
	Args        any      // JSON Schema describing accepted arguments
	Risk        Risk     // Risk classification
	Permission  string   // Permission scope key, e.g. "fs.read"
	Audit       []string // Fields to extract from args for the audit log
}

// Result is the uniform return type from every tool execution.
type Result struct {
	OK       bool      // Whether the operation succeeded
	Data     any       // Structured payload (tool-specific)
	Stdout   string    // Captured stdout for exec-type tools
	Stderr   string    // Captured stderr for exec-type tools
	Snapshot *Snapshot // Optional pre/post snapshot for rollback
}

// Snapshot records file state before or after a mutation.
type Snapshot struct {
	Path    string // Absolute path of the file
	Content string // Full file contents at snapshot time
	Kind    string // "pre" before mutation, "post" after mutation
}

// Plan is produced by Tool.Plan and describes what the tool will do
// before it is executed, enabling user confirmation and dry-runs.
type Plan struct {
	Description string         // Human-readable description of the planned action
	Risk        Risk           // Risk level of this specific invocation
	Args        map[string]any // Resolved arguments
	Snapshots   []*Snapshot    // Pre-mutation snapshots that will be taken
}

// Request carries the inputs for a single tool invocation.
type Request struct {
	Args    map[string]any // Tool-specific arguments
	CWD     string         // Working directory for the invocation
	Session string         // Session identifier for audit and permissions
}

// Tool is the interface every tool must implement.
type Tool interface {
	// Spec returns the static metadata for this tool.
	Spec() Spec

	// Plan produces a description of what Execute would do without side effects.
	Plan(req Request) (*Plan, error)

	//Execute performs the actual operation and returns a Result.
	Execute(ctx context.Context, req Request) (*Result, error)
}

// registry is the global set of registered tools, protected for concurrent use.
var (
	mu       sync.RWMutex
	registry = make(map[string]Tool)
)

// Register adds a tool to the global registry. It returns an error if a tool
// with the same name is already registered.
func Register(tool Tool) error {
	spec := tool.Spec()
	if spec.Name == "" {
		return fmt.Errorf("tools: tool name must not be empty")
	}

	mu.Lock()
	defer mu.Unlock()

	if _, exists := registry[spec.Name]; exists {
		return fmt.Errorf("tools: tool %q is already registered", spec.Name)
	}

	registry[spec.Name] = tool
	return nil
}

// Get retrieves a tool by name. Returns an error if the tool is not found.
func Get(name string) (Tool, error) {
	mu.RLock()
	defer mu.RUnlock()

	tool, ok := registry[name]
	if !ok {
		return nil, fmt.Errorf("tools: unknown tool %q", name)
	}
	return tool, nil
}

// List returns all registered tools in insertion order.
func List() []Tool {
	mu.RLock()
	defer mu.RUnlock()

	list := make([]Tool, 0, len(registry))
	for _, tool := range registry {
		list = append(list, tool)
	}
	return list
}

// Names returns the names of all registered tools.
func Names() []string {
	mu.RLock()
	defer mu.RUnlock()

	names := make([]string, 0, len(registry))
	for name := range registry {
		names = append(names, name)
	}
	return names
}

// Clear removes all registered tools. Intended for testing only.
func Clear() {
	mu.Lock()
	defer mu.Unlock()
	registry = make(map[string]Tool)
}
