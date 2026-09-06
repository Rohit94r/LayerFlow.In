package tools

import (
	"context"
	"os"
	"os/exec"
	"path/filepath"
	"testing"
)

// initScratchRepo creates a throwaway git repo at t.TempDir() and returns the
// path. Commits a base file so status has something meaningful to report.
func initScratchRepo(t *testing.T) string {
	t.Helper()
	dir := t.TempDir()

	git := func(args ...string) {
		t.Helper()
		cmd := exec.Command("git", args...)
		cmd.Dir = dir
		cmd.Env = append(os.Environ(), "GIT_CONFIG_NOSYSTEM=1", "HOME="+dir)
		out, err := cmd.CombinedOutput()
		if err != nil {
			t.Fatalf("git %v: %v\n%s", args, err, out)
		}
	}
	git("init", "-q")
	git("config", "user.email", "test@example.com")
	git("config", "user.name", "Test")
	if err := os.WriteFile(filepath.Join(dir, "base.txt"), []byte("hello\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	git("add", ".")
	git("commit", "-q", "-m", "initial")
	return dir
}

func TestGitStatusTool(t *testing.T) {
	dir := initScratchRepo(t)
	tool := &GitStatusTool{}
	spec := tool.Spec()
	if spec.Permission != "fs.read" {
		t.Errorf("permission = %q, want fs.read", spec.Permission)
	}

	ctx := context.Background()
	res, err := tool.Execute(ctx, Request{Args: map[string]any{}, CWD: dir})
	if err != nil {
		t.Fatalf("git_status: %v", err)
	}
	if !res.OK {
		t.Fatalf("git_status not OK: %v", res.Stderr)
	}
	if res.Stdout == "" {
		t.Fatal("git_status returned empty output")
	}

	// Dirty the tree and confirm status reflects it.
	if err := os.WriteFile(filepath.Join(dir, "base.txt"), []byte("changed\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	res, err = tool.Execute(ctx, Request{Args: map[string]any{}, CWD: dir})
	if err != nil {
		t.Fatalf("git_status (dirty): %v", err)
	}
	if !res.OK || res.Stdout == "" {
		t.Fatalf("dirty status failed: ok=%v out=%q", res.OK, res.Stdout)
	}
}

// TestGitPushNoRemote confirms pushing without a remote reports a failure
// (ok=false + stderr) rather than silently succeeding.
func TestGitPushNoRemote(t *testing.T) {
	dir := initScratchRepo(t)
	tool := &GitPushTool{}
	ctx := context.Background()

	res, err := tool.Execute(ctx, Request{Args: map[string]any{}, CWD: dir})
	if err != nil {
		t.Fatalf("unexpected error from Execute: %v", err)
	}
	if res == nil || res.OK {
		t.Fatalf("push without remote should not be OK (res=%+v)", res)
	}
	if res.Stdout == "" && res.Stderr == "" {
		t.Error("expected diagnostic output describing the push failure")
	}
}
