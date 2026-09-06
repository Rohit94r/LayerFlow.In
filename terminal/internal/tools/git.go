package tools

import (
	"context"
	"fmt"
	"os"
	"os/exec"
)

// ---------------------------------------------------------------------------
// git_status
// ---------------------------------------------------------------------------

type GitStatusTool struct{}

func (t *GitStatusTool) Spec() Spec {
	return Spec{
		Name:        "git_status",
		Description: "Show the current git branch and working tree status (changed files, staged/unstaged).",
		Args: map[string]any{
			"type": "object",
			"properties": map[string]any{
				"path": map[string]any{
					"type":        "string",
					"description": "Repository path, defaults to the request CWD",
				},
			},
		},
		Risk:       RiskRead,
		Permission: "fs.read",
		Audit:      []string{"path"},
	}
}

func (t *GitStatusTool) Plan(req Request) (*Plan, error) {
	path, err := gitPath(req)
	if err != nil {
		return nil, err
	}
	return &Plan{
		Description: fmt.Sprintf("Show git status in %s", path),
		Risk:        RiskRead,
		Args:        req.Args,
	}, nil
}

func (t *GitStatusTool) Execute(ctx context.Context, req Request) (*Result, error) {
	path, err := gitPath(req)
	if err != nil {
		return nil, err
	}
	branch := gitOutput(ctx, path, "branch", "--show-current")
	status := gitOutput(ctx, path, "status", "--short", "--branch")
	if branch == "" && status == "" {
		return &Result{OK: false, Stderr: "not a git repository: " + path}, nil
	}
	out := "branch: " + branch
	if status != "" {
		out += "\n" + status
	}
	return &Result{OK: true, Stdout: out}, nil
}

// ---------------------------------------------------------------------------
// git_pull
// ---------------------------------------------------------------------------

type GitPullTool struct{}

func (t *GitPullTool) Spec() Spec {
	return Spec{
		Name:        "git_pull",
		Description: "Pull the latest changes from the git remote into the current branch.",
		Args: map[string]any{
			"type": "object",
			"properties": map[string]any{
				"path": map[string]any{
					"type":        "string",
					"description": "Repository path, defaults to the request CWD",
				},
				"rebase": map[string]any{
					"type":        "boolean",
					"description": "Use --rebase when pulling (default false)",
				},
			},
		},
		Risk:       RiskWrite,
		Permission: "git.pull",
		Audit:      []string{"path"},
	}
}

func (t *GitPullTool) Plan(req Request) (*Plan, error) {
	path, err := gitPath(req)
	if err != nil {
		return nil, err
	}
	return &Plan{
		Description: fmt.Sprintf("Git pull in %s", path),
		Risk:        RiskWrite,
		Args:        req.Args,
	}, nil
}

func (t *GitPullTool) Execute(ctx context.Context, req Request) (*Result, error) {
	path, err := gitPath(req)
	if err != nil {
		return nil, err
	}
	args := []string{"pull"}
	if v, _ := req.Args["rebase"].(bool); v {
		args = append(args, "--rebase")
	}
	out, err := gitOutputErr(ctx, path, args...)
	return &Result{OK: err == nil, Stdout: out, Stderr: stderrOf(err)}, nil
}

// ---------------------------------------------------------------------------
// git_push
// ---------------------------------------------------------------------------

type GitPushTool struct{}

func (t *GitPushTool) Spec() Spec {
	return Spec{
		Name:        "git_push",
		Description: "Push the current branch's committed changes to its git remote.",
		Args: map[string]any{
			"type": "object",
			"properties": map[string]any{
				"path": map[string]any{
					"type":        "string",
					"description": "Repository path, defaults to the request CWD",
				},
				"remote": map[string]any{
					"type":        "string",
					"description": "Remote name (default: origin)",
				},
				"branch": map[string]any{
					"type":        "string",
					"description": "Branch name to push (default: current branch)",
				},
				"set_upstream": map[string]any{
					"type":        "boolean",
					"description": "Set the upstream tracking ref (-u) when pushing a new branch",
				},
				"force": map[string]any{
					"type":        "boolean",
					"description": "Force push (dangerous, requires higher permission)",
				},
			},
		},
		Risk:       RiskDestructive,
		Permission: "git.push",
		Audit:      []string{"path", "remote", "branch", "force"},
	}
}

func (t *GitPushTool) Plan(req Request) (*Plan, error) {
	path, err := gitPath(req)
	if err != nil {
		return nil, err
	}
	force, _ := req.Args["force"].(bool)
	risk := RiskWrite
	if force {
		risk = RiskDestructive
	}
	desc := fmt.Sprintf("Git push in %s", path)
	if force {
		desc += " (force)"
	}
	return &Plan{
		Description: desc,
		Risk:        risk,
		Args:        req.Args,
	}, nil
}

func (t *GitPushTool) Execute(ctx context.Context, req Request) (*Result, error) {
	path, err := gitPath(req)
	if err != nil {
		return nil, err
	}
	args := []string{"push"}
	if force, _ := req.Args["force"].(bool); force {
		args = append(args, "--force")
	}
	if setUpstream, _ := req.Args["set_upstream"].(bool); setUpstream {
		args = append(args, "-u")
	}
	remote, _ := req.Args["remote"].(string)
	if remote != "" {
		args = append(args, remote)
	}
	branch, _ := req.Args["branch"].(string)
	if branch != "" {
		args = append(args, branch)
	}
	out, err := gitOutputErr(ctx, path, args...)
	return &Result{OK: err == nil, Stdout: out, Stderr: stderrOf(err)}, nil
}

// gitPath resolves the repository path from args or falls back to req.CWD.
func gitPath(req Request) (string, error) {
	p := req.CWD
	if v, ok := req.Args["path"].(string); ok && v != "" {
		abs, err := resolvePath(req.CWD, v)
		if err != nil {
			return "", err
		}
		p = abs
	}
	if p == "" {
		return "", fmt.Errorf("git: no working directory")
	}
	return p, nil
}

// gitOutput runs a git command and returns trimmed stdout (empty on error).
func gitOutput(ctx context.Context, dir string, args ...string) string {
	return gitRun(ctx, dir, args...)
}

// gitOutputErr runs git and returns stdout; the returned error carries stderr.
func gitOutputErr(ctx context.Context, dir string, args ...string) (string, error) {
	return gitRunErr(ctx, dir, args...)
}

func stderrOf(err error) string {
	if err == nil {
		return ""
	}
	if ee, ok := err.(*exec.ExitError); ok {
		return string(ee.Stderr)
	}
	return err.Error()
}

func gitRun(ctx context.Context, dir string, args ...string) string {
	out, _ := gitRunErr(ctx, dir, args...)
	return out
}

func gitRunErr(ctx context.Context, dir string, args ...string) (string, error) {
	cmd := exec.CommandContext(ctx, "git", args...)
	cmd.Dir = dir
	cmd.Env = filterEnv(os.Environ())
	out, err := cmd.CombinedOutput()
	return string(out), err
}
