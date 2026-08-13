package sandbox

import (
	"bytes"
	"context"
	"fmt"
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

// Config holds the configuration for the sandbox.
type Config struct {
	// ProjectRoot is the absolute path to the project root directory.
	ProjectRoot string

	// Timeout is the maximum duration for a single command execution.
	// Defaults to 30 seconds if zero.
	Timeout time.Duration

	// AllowedCommands is an allow-list of command prefixes. If non-empty,
	// only commands starting with one of these prefixes are permitted.
	AllowedCommands []string

	// BlockedCommands is a block-list of command prefixes that are never
	// permitted, regardless of AllowAll.
	BlockedCommands []string

	// EnvAllowlist, if non-empty, is the only set of environment variables
	// that will be passed to the subprocess. If empty, the default filter
	// is applied.
	EnvAllowlist []string

	// Logger for sandbox events.
	Logger *slog.Logger
}

// Result captures the output of a sandboxed command execution.
type Result struct {
	Stdout   string        // Captured standard output
	Stderr   string        // Captured standard error
	ExitCode int           // Process exit code (0 for success)
	Duration time.Duration // Wall-clock time for the execution
	TimedOut bool          // True if the command was killed due to timeout
}

// Sandbox provides isolated shell execution with safety controls.
type Sandbox struct {
	config Config
	logger *slog.Logger
	mu     sync.Mutex
}

// New creates a Sandbox with the given configuration.
func New(cfg Config) *Sandbox {
	if cfg.Timeout == 0 {
		cfg.Timeout = 30 * time.Second
	}
	if cfg.ProjectRoot == "" {
		cfg.ProjectRoot = mustGetwd()
	}
	if cfg.Logger == nil {
		cfg.Logger = slog.Default()
	}

	return &Sandbox{
		config: cfg,
		logger: cfg.Logger,
	}
}

// Exec runs a shell command inside the sandbox and returns the captured output.
func (s *Sandbox) Exec(ctx context.Context, command string, opts ...ExecOption) (*Result, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Apply options.
	cfg := execConfig{
		timeout: s.config.Timeout,
		cwd:     s.config.ProjectRoot,
		env:     os.Environ(),
	}
	for _, opt := range opts {
		opt(&cfg)
	}

	// Validate the command.
	if err := s.validate(command); err != nil {
		return nil, err
	}

	// Apply timeout.
	timeout := cfg.timeout
	if timeout == 0 {
		timeout = s.config.Timeout
	}
	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	// Prepare environment.
	env := filterEnv(cfg.env, s.config.EnvAllowlist)

	cmd := exec.CommandContext(ctx, "sh", "-c", command)
	cmd.Dir = cfg.cwd
	cmd.Env = env

	// Ensure the working directory is within the project root.
	if err := s.validateCWD(cfg.cwd); err != nil {
		return nil, err
	}

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	start := time.Now()
	err := cmd.Run()
	duration := time.Since(start)

	timedOut := ctx.Err() == context.DeadlineExceeded

	exitCode := 0
	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			exitCode = exitErr.ExitCode()
		} else {
			return nil, fmt.Errorf("sandbox: exec: %w", err)
		}
	}

	result := &Result{
		Stdout:   stdout.String(),
		Stderr:   stderr.String(),
		ExitCode: exitCode,
		Duration: duration,
		TimedOut: timedOut,
	}

	s.logger.Info("command executed",
		"command", command,
		"exit_code", exitCode,
		"duration", duration,
		"timed_out", timedOut,
	)

	return result, nil
}

// ExecOption configures a single Exec call.
type ExecOption func(*execConfig)

type execConfig struct {
	timeout time.Duration
	cwd     string
	env     []string
}

// WithTimeout overrides the default timeout for this invocation.
func WithTimeout(d time.Duration) ExecOption {
	return func(c *execConfig) { c.timeout = d }
}

// WithCWD overrides the working directory for this invocation.
func WithCWD(dir string) ExecOption {
	return func(c *execConfig) { c.cwd = dir }
}

// WithEnv overrides the environment for this invocation.
func WithEnv(env []string) ExecOption {
	return func(c *execConfig) { c.env = env }
}

// validate checks whether a command is permitted by the sandbox policy.
func (s *Sandbox) validate(command string) error {
	trimmed := strings.TrimSpace(command)
	if trimmed == "" {
		return fmt.Errorf("sandbox: command must not be empty")
	}

	// Check blocked commands first.
	for _, blocked := range s.config.BlockedCommands {
		if strings.HasPrefix(trimmed, blocked) {
			return fmt.Errorf("sandbox: command %q is blocked (matches %q)", trimmed, blocked)
		}
	}

	// Check allow-list if configured.
	if len(s.config.AllowedCommands) > 0 {
		allowed := false
		for _, prefix := range s.config.AllowedCommands {
			if strings.HasPrefix(trimmed, prefix) {
				allowed = true
				break
			}
		}
		if !allowed {
			return fmt.Errorf("sandbox: command %q is not in the allow-list", trimmed)
		}
	}

	// Check for dangerous patterns.
	if danger, reason := detectDanger(trimmed); danger {
		return fmt.Errorf("sandbox: command blocked: %s", reason)
	}

	return nil
}

// validateCWD ensures the working directory is within the project root.
func (s *Sandbox) validateCWD(cwd string) error {
	abs, err := filepath.Abs(cwd)
	if err != nil {
		return fmt.Errorf("sandbox: invalid working directory: %w", err)
	}

	projectRoot, err := filepath.Abs(s.config.ProjectRoot)
	if err != nil {
		return fmt.Errorf("sandbox: invalid project root: %w", err)
	}

	// Check that cwd is either the project root or a descendant of it.
	rel, err := filepath.Rel(projectRoot, abs)
	if err != nil || strings.HasPrefix(rel, "..") {
		return fmt.Errorf("sandbox: working directory %s is outside project root %s", abs, projectRoot)
	}

	return nil
}

// filterEnv filters environment variables, removing secrets and optionally
// restricting to an allow-list.
func filterEnv(env []string, allowlist []string) []string {
	// Secret prefixes to strip.
	secretPrefixes := []string{
		"OPENAI_",
		"ANTHROPIC_",
		"AZURE_",
		"GEMINI_",
		"GOOGLE_API_",
		"COHERE_",
		"HUGGINGFACE_",
		"MISTRAL_",
		"GROQ_",
		"DEEPSEEK_",
		"XAI_",
		"LF_API_KEY",
		"LF_SECRET",
		"LF_TOKEN",
	}

	if len(allowlist) > 0 {
		// Only keep variables in the allow-list.
		allowSet := make(map[string]bool, len(allowlist))
		for _, k := range allowlist {
			allowSet[k] = true
		}
		filtered := make([]string, 0, len(allowlist))
		for _, e := range env {
			key := strings.SplitN(e, "=", 2)[0]
			if allowSet[key] {
				filtered = append(filtered, e)
			}
		}
		return filtered
	}

	// Default: strip secrets.
	filtered := make([]string, 0, len(env))
	for _, e := range env {
		key := strings.SplitN(e, "=", 2)[0]
		skip := false
		for _, prefix := range secretPrefixes {
			if strings.HasPrefix(key, prefix) {
				skip = true
				break
			}
		}
		if !skip {
			filtered = append(filtered, e)
		}
	}
	return filtered
}

// detectDanger returns true and a reason if the command matches a dangerous pattern.
func detectDanger(command string) (bool, string) {
	dangerous := []struct {
		pattern string
		reason  string
	}{
		{"rm -rf", "recursive force-delete"},
		{"rm -fr", "recursive force-delete"},
		{":(){ :|:& };:", "fork bomb"},
		{"sudo rm", "elevated recursive delete"},
		{"git push --force", "force push to remote"},
		{"git push -f", "force push to remote"},
		{"git reset --hard", "hard reset discards commits"},
		{"git clean -fd", "force clean untracked files"},
		{"mkfs", "filesystem format"},
		{"dd if=", "raw disk write"},
		{"dd of=", "raw disk write"},
		{"chmod -R 777", "recursive permission open"},
		{"rmdir", "directory removal"},
	}

	lower := strings.ToLower(command)
	for _, d := range dangerous {
		if strings.Contains(lower, d.pattern) {
			return true, d.reason
		}
	}

	return false, ""
}

func mustGetwd() string {
	wd, err := os.Getwd()
	if err != nil {
		return "/"
	}
	return wd
}
