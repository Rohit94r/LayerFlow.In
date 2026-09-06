package tools

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// TestExecuteCallWriteFile exercises the actual agent entrypoint (ExecuteCall)
// with a default policy to confirm the terminal can create files end-to-end.
func TestExecuteCallWriteFile(t *testing.T) {
	dir := t.TempDir()
	ctx := context.Background()

	policy := PolicyMap{}
	promptCalls := 0
	approve := policy.ApprovalFunc(func(spec Spec, plan *Plan) (bool, error) {
		promptCalls++
		return true, nil
	})

	const content = "hello world from lf agent\n"
	out, err := ExecuteCall(ctx, "write_file",
		`{"path":"README.md","content":"hello world from lf agent\n","overwrite":true}`,
		dir, approve)
	if err != nil {
		t.Fatalf("write_file ExecuteCall: %v", err)
	}
	if strings.TrimSpace(out) == "" {
		t.Error("write_file returned empty output")
	}

	data, err := os.ReadFile(filepath.Join(dir, "README.md"))
	if err != nil {
		t.Fatalf("README.md not created: %v", err)
	}
	if string(data) != content {
		t.Errorf("file content = %q, want %q", data, content)
	}

	// Default risk policy requires a prompt for write tools.
	if promptCalls != 1 {
		t.Errorf("promptCalls = %d, want 1 (write should prompt by default)", promptCalls)
	}
}

// TestExecuteCallDenyPolicy confirms a denied tool refuses to run and reports
// the denial in the tool result instead of executing.
func TestExecuteCallDenyPolicy(t *testing.T) {
	dir := t.TempDir()
	ctx := context.Background()

	policy := PolicyMap{"write_file": PolicyDeny}
	approve := policy.ApprovalFunc(nil)

	out, err := ExecuteCall(ctx, "write_file",
		`{"path":"should-not-exist.txt","content":"nope","overwrite":true}`,
		dir, approve)
	if err != nil {
		t.Fatalf("execute denied tool: %v", err)
	}
	if !strings.Contains(out, "denied") {
		t.Errorf("denied result = %q, want denial notice", out)
	}
	if _, statErr := os.Stat(filepath.Join(dir, "should-not-exist.txt")); !os.IsNotExist(statErr) {
		t.Errorf("denied tool still created the file (stat err=%v)", statErr)
	}
}
