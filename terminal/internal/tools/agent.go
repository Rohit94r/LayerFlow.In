package tools

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
)

// ToolSpec is a JSON-serializable description of a registered tool, suitable
// for forwarding to the gateway as an OpenAI-shaped function definition.
type ToolSpec struct {
	Name        string         `json:"name"`
	Description string         `json:"description"`
	Parameters  map[string]any `json:"parameters"`
}

// DescribeAll returns OpenAI-style tool specs for every registered tool.
func DescribeAll() []ToolSpec {
	list := List()
	specs := make([]ToolSpec, 0, len(list))
	for _, t := range list {
		s := t.Spec()
		specs = append(specs, ToolSpec{
			Name:        s.Name,
			Description: s.Description,
			Parameters:  asParams(s.Args),
		})
	}
	return specs
}

// asParams normalizes an Args declaration into a JSON-schema parameters object.
func asParams(args any) map[string]any {
	switch v := args.(type) {
	case map[string]any:
		if v["type"] == "object" {
			return v
		}
		p := map[string]any{"type": "object"}
		for k, val := range v {
			p[k] = val
		}
		return p
	default:
		return map[string]any{"type": "object"}
	}
}

// ApprovalFunc asks the user whether a tool invocation may proceed. It returns
// true to run, false to deny. Called only for tools whose risk >= RiskWrite
// unless nil (auto-approve reads).
type ApprovalFunc func(spec Spec, plan *Plan) (bool, error)

// ExecuteCall runs a single tool call from the model and returns the resulting
// tool-role message content.
func ExecuteCall(ctx context.Context, name string, rawArgs string, cwd string, approve ApprovalFunc) (string, error) {
	tool, err := Get(name)
	if err != nil {
		return "", err
	}

	var args map[string]any
	if err := json.Unmarshal([]byte(rawArgs), &args); err != nil {
		return "", fmt.Errorf("tool %q: invalid arguments JSON: %w", name, err)
	}

	req := Request{Args: args, CWD: cwd}
	plan, err := tool.Plan(req)
	if err != nil {
		return "", err
	}

	// Read-only tools run without prompting. Write/exec/destructive tools ask
	// the user first unless an approval policy says otherwise.
	if approve != nil && plan.Risk >= RiskWrite {
		ok, err := approve(tool.Spec(), plan)
		if err != nil {
			return "", err
		}
		if !ok {
			return "User denied the tool call: " + name + " (" + plan.Description + ")", nil
		}
	}

	res, err := tool.Execute(ctx, req)
	if err != nil {
		return "", err
	}

	return formatResult(res), nil
}

// formatResult serializes a tool result into a compact tool-role string.
func formatResult(res *Result) string {
	if res == nil {
		return "OK"
	}
	var parts []string
	if res.Stdout != "" {
		parts = append(parts, res.Stdout)
	}
	if res.Stderr != "" {
		parts = append(parts, "[stderr]\n"+res.Stderr)
	}
	if res.Data != nil {
		b, err := json.Marshal(res.Data)
		if err != nil {
			b = []byte(fmt.Sprintf("%v", res.Data))
		}
		parts = append(parts, string(b))
	}
	if len(parts) == 0 {
		return "OK"
	}
	return strings.Join(parts, "\n")
}
