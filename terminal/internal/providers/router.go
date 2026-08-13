package providers

import (
	"strings"
)

// Router selects which provider and model to use for a given task.
type Router interface {
	Decide(in DecisionInput) (Choice, error)
}

// DecisionInput describes the context for a routing decision.
type DecisionInput struct {
	Task       string
	FileTypes  []string
	HasTools   bool
	TokenCount int
	Budget     float64
	Latency    string // "interactive" or "background"
}

// Choice is the result of a routing decision.
type Choice struct {
	Provider string
	Model    string
	Reason   string
}

// HeuristicRouter implements Router using rule-based heuristics.
type HeuristicRouter struct {
	defaultProvider string
	defaultModel    string
	overrides       map[string]string // "/model" and "/provider" overrides
}

// NewHeuristicRouter creates a router with sensible defaults.
func NewHeuristicRouter() *HeuristicRouter {
	return &HeuristicRouter{
		defaultProvider: "openai",
		defaultModel:    "gpt-4o",
		overrides:       make(map[string]string),
	}
}

// SetOverride sets a manual override for provider or model.
// Supported keys: "provider", "model".
func (r *HeuristicRouter) SetOverride(key, value string) {
	r.overrides[key] = value
}

// ClearOverrides removes all manual overrides.
func (r *HeuristicRouter) ClearOverrides() {
	r.overrides = make(map[string]string)
}

// Decide selects the best provider and model based on input heuristics.
func (r *HeuristicRouter) Decide(in DecisionInput) (Choice, error) {
	// Manual overrides take priority
	if model, ok := r.overrides["model"]; ok {
		provider := r.defaultProvider
		if p, ok := r.overrides["provider"]; ok {
			provider = p
		}
		return Choice{
			Provider: provider,
			Model:    model,
			Reason:   "manual override",
		}, nil
	}

	if provider, ok := r.overrides["provider"]; ok {
		return Choice{
			Provider: provider,
			Model:    r.pickModelForProvider(provider, in),
			Reason:   "manual provider override",
		}, nil
	}

	return r.heuristicDecide(in), nil
}

func (r *HeuristicRouter) heuristicDecide(in DecisionInput) Choice {
	fileTypes := normalizeExtensions(in.FileTypes)

	// Coding tasks: .go, .ts, .rs files or tool use
	if isCodingTask(in, fileTypes) {
		if in.TokenCount > 80000 {
			return Choice{
				Provider: "openai",
				Model:    "gpt-4o",
				Reason:   "coding task with large context, using gpt-4o",
			}
		}
		return Choice{
			Provider: "openai",
			Model:    "gpt-4o",
			Reason:   "coding task, using gpt-4o for best tool support",
		}
	}

	// Reasoning tasks: explanations, why/how questions
	if isReasoningTask(in) {
		return Choice{
			Provider: "openai",
			Model:    "gpt-4o",
			Reason:   "reasoning task, using gpt-4o",
		}
	}

	// Background tasks: cheap and fast
	if in.Latency == "background" {
		return Choice{
			Provider: "openai",
			Model:    "gpt-4o-mini",
			Reason:   "background task, using cheaper model",
		}
	}

	// Budget-constrained
	if in.Budget > 0 && in.Budget < 0.01 {
		return Choice{
			Provider: "openai",
			Model:    "gpt-4o-mini",
			Reason:   "budget constrained, using cheaper model",
		}
	}

	// Large context window needed
	if in.TokenCount > 32000 {
		return Choice{
			Provider: "openai",
			Model:    "gpt-4o",
			Reason:   "large context window required",
		}
	}

	// Default: balanced
	return Choice{
		Provider: r.defaultProvider,
		Model:    r.defaultModel,
		Reason:   "default selection",
	}
}

func (r *HeuristicRouter) pickModelForProvider(provider string, in DecisionInput) string {
	switch provider {
	case "anthropic":
		if in.TokenCount > 100000 {
			return "claude-3-5-sonnet-latest"
		}
		return "claude-3-5-sonnet-latest"
	case "gemini":
		if in.TokenCount > 100000 {
			return "gemini-1.5-pro"
		}
		return "gemini-1.5-flash"
	case "ollama":
		return "codellama"
	default:
		if in.TokenCount > 80000 {
			return "gpt-4o"
		}
		return "gpt-4o-mini"
	}
}

func isCodingTask(in DecisionInput, fileTypes map[string]bool) bool {
	codingExtensions := map[string]bool{
		".go": true, ".ts": true, ".js": true, ".rs": true,
		".py": true, ".java": true, ".cpp": true, ".c": true,
		".rb": true, ".swift": true, ".kt": true,
	}

	for ft := range fileTypes {
		if codingExtensions[ft] {
			return true
		}
	}

	if in.HasTools {
		return true
	}

	codingKeywords := []string{
		"write", "implement", "create", "fix", "refactor",
		"debug", "test", "code", "function", "struct",
		"interface", "package", "module", "import",
	}
	taskLower := strings.ToLower(in.Task)
	for _, kw := range codingKeywords {
		if strings.Contains(taskLower, kw) {
			return true
		}
	}

	return false
}

func isReasoningTask(in DecisionInput) bool {
	reasoningKeywords := []string{
		"explain", "why", "how does", "what is", "describe",
		"summarize", "analyze", "compare", "difference between",
		"pros and cons", "trade-off", "approach",
	}

	taskLower := strings.ToLower(in.Task)
	for _, kw := range reasoningKeywords {
		if strings.Contains(taskLower, kw) {
			return true
		}
	}
	return false
}

func normalizeExtensions(fileTypes []string) map[string]bool {
	result := make(map[string]bool)
	for _, ft := range fileTypes {
		if !strings.HasPrefix(ft, ".") {
			ft = "." + ft
		}
		result[strings.ToLower(ft)] = true
	}
	return result
}
