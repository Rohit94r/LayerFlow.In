package tools

import (
	"sort"
	"strings"
)

// Policy controls how a tool invocation is approved.
type Policy int

const (
	// PolicyDefault follows the risk-based default: read tools run without
	// prompting; write/exec/destructive tools ask for confirmation.
	PolicyDefault Policy = iota
	// PolicyAllow always runs the tool without prompting.
	PolicyAllow
	// PolicyAsk always prompts the user for confirmation.
	PolicyAsk
	// PolicyDeny refuses to run the tool.
	PolicyDeny
)

func (p Policy) String() string {
	switch p {
	case PolicyAllow:
		return "allow"
	case PolicyAsk:
		return "ask"
	case PolicyDeny:
		return "deny"
	default:
		return "default"
	}
}

// ParsePolicy maps a config string to a Policy. Unknown values fall back to
// PolicyDefault.
func ParsePolicy(s string) Policy {
	switch strings.ToLower(strings.TrimSpace(s)) {
	case "allow", "always", "yes", "on":
		return PolicyAllow
	case "ask", "prompt":
		return PolicyAsk
	case "deny", "never", "no", "off":
		return PolicyDeny
	default:
		return PolicyDefault
	}
}

// PolicyMap is a per-tool permission policy keyed by tool name.
type PolicyMap map[string]Policy

// DefaultPolicyFor returns the risk-based default policy for a tool (used when
// no explicit policy is set).
func DefaultPolicyFor(spec Spec) Policy {
	switch spec.Risk {
	case RiskWrite, RiskExec, RiskDestructive:
		return PolicyAsk
	default:
		return PolicyAllow
	}
}

// PolicyFor resolves the effective policy for a tool. An explicit per-tool
// policy wins, then the global "all" policy, then the risk-based default.
func (m PolicyMap) PolicyFor(name string, spec Spec) Policy {
	if p, ok := m[name]; ok {
		return p
	}
	if p, ok := m["all"]; ok {
		return p
	}
	return DefaultPolicyFor(spec)
}

// ApprovalFunc returns an approver that consults the per-tool policy map. When
// a tool needs confirmation (PolicyAsk or the default asking path), prompt is
// called so the interactive layer (CLI/TUI) can ask the user; prompt may be nil
// to auto-approve read tools and deny without a prompt otherwise.
func (m PolicyMap) ApprovalFunc(prompt func(spec Spec, plan *Plan) (bool, error)) ApprovalFunc {
	return func(spec Spec, plan *Plan) (bool, error) {
		switch m.PolicyFor(spec.Name, spec) {
		case PolicyAllow:
			return true, nil
		case PolicyDeny:
			return false, nil
		default:
			// Risk-based default or explicit "ask": prompt when possible.
			if prompt != nil {
				return prompt(spec, plan)
			}
			// No prompt available: allow reads, ask (deny) writes.
			return plan.Risk == RiskRead, nil
		}
	}
}

// PolicyFromConfig builds a PolicyMap from a raw map (e.g. config.Permissions).
func PolicyFromConfig(raw map[string]string) PolicyMap {
	m := make(PolicyMap, len(raw))
	for k, v := range raw {
		m[k] = ParsePolicy(v)
	}
	return m
}

// Describe builds a stable, sorted human-readable summary of the effective
// policy for every registered tool, including the scope key and risk.
func Describe(pm PolicyMap) []PolicyLine {
	list := List()
	lines := make([]PolicyLine, 0, len(list))
	for _, t := range list {
		spec := t.Spec()
		lines = append(lines, PolicyLine{
			Name:        spec.Name,
			Scope:       spec.Permission,
			Risk:        spec.Risk.String(),
			Policy:      pm.PolicyFor(spec.Name, spec).String(),
			Description: spec.Description,
		})
	}
	sort.Slice(lines, func(i, j int) bool { return lines[i].Name < lines[j].Name })
	return lines
}

// PolicyLine is a single row in a permissions listing.
type PolicyLine struct {
	Name        string
	Scope       string
	Risk        string
	Policy      string
	Description string
}
