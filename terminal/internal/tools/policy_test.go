package tools

import (
	"testing"
)

func TestParsePolicy(t *testing.T) {
	cases := map[string]Policy{
		"allow":   PolicyAllow,
		"ALWAYS":  PolicyAllow,
		"yes":     PolicyAllow,
		"ask":     PolicyAsk,
		"prompt":  PolicyAsk,
		"deny":    PolicyDeny,
		"never":   PolicyDeny,
		"garbage": PolicyDefault,
		"":        PolicyDefault,
	}
	for in, want := range cases {
		if got := ParsePolicy(in); got != want {
			t.Errorf("ParsePolicy(%q) = %v, want %v", in, got, want)
		}
	}
}

func TestDefaultPolicyFor(t *testing.T) {
	read := Spec{Name: "read_file", Risk: RiskRead}
	write := Spec{Name: "write_file", Risk: RiskWrite}
	exec := Spec{Name: "run_command", Risk: RiskExec}
	destructive := Spec{Name: "git_push", Risk: RiskDestructive}

	if got := DefaultPolicyFor(read); got != PolicyAllow {
		t.Errorf("read default = %v, want allow", got)
	}
	if got := DefaultPolicyFor(write); got != PolicyAsk {
		t.Errorf("write default = %v, want ask", got)
	}
	if got := DefaultPolicyFor(exec); got != PolicyAsk {
		t.Errorf("exec default = %v, want ask", got)
	}
	if got := DefaultPolicyFor(destructive); got != PolicyAsk {
		t.Errorf("destructive default = %v, want ask", got)
	}
}

func TestPolicyMapPolicyFor(t *testing.T) {
	m := PolicyMap{
		"write_file":  PolicyAllow,
		"run_command": PolicyDeny,
		"all":         PolicyAsk,
	}

	// Explicit per-tool wins.
	if got := m.PolicyFor("write_file", Spec{Risk: RiskWrite}); got != PolicyAllow {
		t.Errorf("write_file = %v, want allow", got)
	}
	if got := m.PolicyFor("run_command", Spec{Risk: RiskExec}); got != PolicyDeny {
		t.Errorf("run_command = %v, want deny", got)
	}

	// Global "all" fallback.
	if got := m.PolicyFor("git_push", Spec{Risk: RiskDestructive}); got != PolicyAsk {
		t.Errorf("git_push = %v, want ask (global)", got)
	}

	// No explicit policy, no global: risk-based default.
	empty := PolicyMap{}
	if got := empty.PolicyFor("read_file", Spec{Risk: RiskRead}); got != PolicyAllow {
		t.Errorf("read default = %v, want allow", got)
	}
	if got := empty.PolicyFor("write_file", Spec{Risk: RiskWrite}); got != PolicyAsk {
		t.Errorf("write default = %v, want ask", got)
	}
}

func TestPolicyFromConfig(t *testing.T) {
	raw := map[string]string{"write_file": "allow", "git_push": "deny"}
	m := PolicyFromConfig(raw)
	if got := m.PolicyFor("write_file", Spec{Risk: RiskWrite}); got != PolicyAllow {
		t.Errorf("write_file = %v, want allow", got)
	}
	if got := m.PolicyFor("git_push", Spec{Risk: RiskDestructive}); got != PolicyDeny {
		t.Errorf("git_push = %v, want deny", got)
	}
}

func TestApprovalFuncPolicy(t *testing.T) {
	m := PolicyMap{"write_file": PolicyAllow, "run_command": PolicyDeny}
	approve := m.ApprovalFunc(nil)

	spec := Spec{Name: "write_file", Risk: RiskWrite}
	plan := &Plan{Risk: RiskWrite}
	ok, err := approve(spec, plan)
	if err != nil || !ok {
		t.Errorf("allow policy should approve, got ok=%v err=%v", ok, err)
	}

	denySpec := Spec{Name: "run_command", Risk: RiskExec}
	ok, err = approve(denySpec, &Plan{Risk: RiskExec})
	if err != nil || ok {
		t.Errorf("deny policy should refuse, got ok=%v err=%v", ok, err)
	}
}
