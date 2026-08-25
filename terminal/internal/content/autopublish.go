package content

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"gopkg.in/yaml.v3"
)

func yamlUnmarshal(data []byte, v any) error { return yaml.Unmarshal(data, v) }
func yamlMarshal(v any) ([]byte, error)      { return yaml.Marshal(v) }

// AutopublishConfig controls the fully-automatic publish loop. It is read
// from content/config.yaml so the behavior is transparent and overridable.
type AutopublishConfig struct {
	// Branch is the git branch committed to. Default "main".
	Branch string `yaml:"branch"`
	// AutoPush, when true, commits and pushes each generated post to the
	// remote automatically. When false, autopublish only writes + stages
	// drafts so nothing is published without an explicit opt-in.
	AutoPush bool `yaml:"auto_push"`
	// MaxPerRun caps how many posts a single run generates/publishes, so a
	// backlog can never dump an unbounded batch (safety guard).
	MaxPerRun int `yaml:"max_per_run"`
	// Repo is an optional separate content/blog git repo to publish into. When
	// empty it uses the LayerFlow repo's own content/ directory.
	Repo string `yaml:"repo"`
	// DraftDir is where generated drafts are written. Relative to Repo when
	// set, otherwise the store directory. Default "content/blog".
	DraftDir string `yaml:"draft_dir"`
	// CommitPrefix is prepended to the auto commit message.
	CommitPrefix string `yaml:"commit_prefix"`
	// Live, when true, also marks posts published after a successful push.
	Live bool `yaml:"live"`
}

// DefaultAutopublish returns a safe default: quality-gated, staged to the
// repo's content/blog, never auto-pushed until AutoPush is enabled.
func DefaultAutopublish() AutopublishConfig {
	return AutopublishConfig{
		Branch:       "main",
		AutoPush:     false,
		MaxPerRun:    2,
		DraftDir:     "content/blog",
		CommitPrefix: "content: publish",
	}
}

// AutopublishConfigPath returns the config file location.
func AutopublishConfigPath(dir string) string {
	return filepath.Join(dir, "config.yaml")
}

// LoadAutopublishConfig reads config.yaml from the store directory, falling
// back to defaults. A missing file returns defaults (safe behavior).
func (s *Store) LoadAutopublishConfig() (AutopublishConfig, error) {
	cfg := DefaultAutopublish()
	data, err := os.ReadFile(AutopublishConfigPath(s.path))
	if err != nil {
		if os.IsNotExist(err) {
			return cfg, nil
		}
		return cfg, err
	}
	if err := yamlUnmarshal(data, &cfg); err != nil {
		return cfg, fmt.Errorf("parse autopublish config: %w", err)
	}
	if cfg.MaxPerRun <= 0 {
		cfg.MaxPerRun = DefaultAutopublish().MaxPerRun
	}
	return cfg, nil
}

// SaveAutopublishConfig persists the config (used by a setup command).
func (s *Store) SaveAutopublishConfig(cfg AutopublishConfig) error {
	data, err := yamlMarshal(cfg)
	if err != nil {
		return err
	}
	return os.WriteFile(AutopublishConfigPath(s.path), data, 0o600)
}

// AutoPublish runs the automatic pipeline for posts due today. It:
//  1. Generates any missing draft for a due, unpublished post (from real data),
//  2. Validates the draft against a quality gate (length, sections, no
//     placeholders) so sub-par content is never pushed,
//  3. Writes it into the configured DraftDir,
//  4. If AutoPush is on, commits + pushes to the repo and (when Live) marks
//     the post published.
//
// A single run never exceeds MaxPerRun posts.
func (s *Store) AutoPublish(cfg AutopublishConfig, data RealData, now time.Time) (*RunReport, error) {
	rep := &RunReport{At: now, Mode: "stage"}
	if cfg.AutoPush || cfg.Live {
		rep.Mode = "publish"
	}

	due := s.Due(now)
	if len(due) == 0 {
		rep.Message = "nothing due today"
		return rep, nil
	}

	// Cap the batch so a backlog can't flood the repo.
	batch := due
	if cfg.MaxPerRun > 0 && len(batch) > cfg.MaxPerRun {
		batch = batch[:cfg.MaxPerRun]
		rep.Skipped = len(due) - cfg.MaxPerRun
	}

	outDir := s.absDraftDir(cfg)
	if err := os.MkdirAll(outDir, 0o700); err != nil {
		return nil, fmt.Errorf("create draft dir: %w", err)
	}

	for i := range batch {
		p := &batch[i]
		// 1. Ensure a draft exists (generate if missing or empty).
		body, err := s.ensuredDraft(p, data, outDir)
		if err != nil {
			rep.Errors = append(rep.Errors, fmt.Sprintf("%s: %v", p.Slug, err))
			continue
		}
		// 2. Quality gate.
		if verr := validateDraft(body); verr != nil {
			rep.Errors = append(rep.Errors, fmt.Sprintf("%s: %v", p.Slug, verr))
			rep.Rejected = append(rep.Rejected, p.Slug)
			continue
		}
		path := filepath.Join(outDir, p.Slug+".md")
		if werr := os.WriteFile(path, []byte(body), 0o600); werr != nil {
			rep.Errors = append(rep.Errors, fmt.Sprintf("%s: %v", p.Slug, werr))
			continue
		}
		if werr := s.SetDraftPath(p.Slug, path); werr != nil {
			rep.Errors = append(rep.Errors, fmt.Sprintf("%s: %v", p.Slug, werr))
			continue
		}
		rep.Generated = append(rep.Generated, p.Slug)

		// 3/4. Push + publish only when configured.
		if cfg.AutoPush || cfg.Live {
			if perr := s.pushPost(p, cfg, path); perr != nil {
				rep.Errors = append(rep.Errors, fmt.Sprintf("%s: %v", p.Slug, perr))
				continue
			}
			rep.Pushed = append(rep.Pushed, p.Slug)
			if cfg.Live {
				if err := s.MarkPublished(p.Slug); err != nil {
					rep.Errors = append(rep.Errors, fmt.Sprintf("%s: %v", p.Slug, err))
					continue
				}
				rep.Published = append(rep.Published, p.Slug)
			}
		}
	}
	return rep, nil
}

// RunReport summarises an automatic run.
type RunReport struct {
	At        time.Time
	Mode      string
	Generated []string
	Pushed    []string
	Published []string
	Rejected  []string
	Errors    []string
	Skipped   int
	Message   string
}

// String renders a compact, human-readable report.
func (r *RunReport) String() string {
	if r.Message != "" {
		return "autopublish: " + r.Message
	}
	var b strings.Builder
	b.WriteString(fmt.Sprintf("autopublish [%s] at %s\n", r.Mode, r.At.Format("2006-01-02 15:04")))
	if len(r.Generated) > 0 {
		b.WriteString(fmt.Sprintf("  generated: %s\n", strings.Join(r.Generated, ", ")))
	}
	if len(r.Pushed) > 0 {
		b.WriteString(fmt.Sprintf("  pushed:    %s\n", strings.Join(r.Pushed, ", ")))
	}
	if len(r.Published) > 0 {
		b.WriteString(fmt.Sprintf("  published: %s\n", strings.Join(r.Published, ", ")))
	}
	if len(r.Rejected) > 0 {
		b.WriteString(fmt.Sprintf("  rejected (quality gate): %s\n", strings.Join(r.Rejected, ", ")))
	}
	if r.Skipped > 0 {
		b.WriteString(fmt.Sprintf("  skipped (backlog cap): %d\n", r.Skipped))
	}
	if len(r.Errors) > 0 {
		b.WriteString(fmt.Sprintf("  errors: %s\n", strings.Join(r.Errors, "; ")))
	}
	return b.String()
}

// ensuredDraft returns an existing draft body, or generates a new one.
func (s *Store) ensuredDraft(p *Post, data RealData, outDir string) (string, error) {
	path := filepath.Join(outDir, p.Slug+".md")
	if body, err := os.ReadFile(path); err == nil && len(strings.TrimSpace(string(body))) >= 200 {
		return string(body), nil
	}
	body, err := s.Draft(p, data)
	if err != nil {
		return "", err
	}
	return body, nil
}

// validateDraft blocks sub-par content from ever reaching the repo. A post
// must meet a minimum length and contain the required sections.
func validateDraft(body string) error {
	if len(strings.Fields(body)) < 150 {
		return fmt.Errorf("below minimum length (quality gate)")
	}
	for _, section := range []string{"## Why this matters", "## How it works", "## Try it yourself"} {
		if !strings.Contains(body, section) {
			return fmt.Errorf("missing required section %q", section)
		}
	}
	if strings.Contains(body, "$0.00") || strings.Contains(body, "TBD") ||
		strings.Contains(body, "TODO") || strings.Contains(body, "placeholder") {
		return fmt.Errorf("contains placeholder/invented content")
	}
	return nil
}

// absDraftDir resolves the output directory relative to the repo/store.
func (s *Store) absDraftDir(cfg AutopublishConfig) string {
	dir := cfg.DraftDir
	if dir == "" {
		dir = DefaultAutopublish().DraftDir
	}
	if cfg.Repo != "" {
		return filepath.Join(cfg.Repo, dir)
	}
	return filepath.Join(s.path, dir)
}

// pushPost commits the drafted file and pushes it to the repo remote. It is
// idempotent: if the file is unchanged (nothing new to commit) it skips the
// commit and just pushes, so a nightly re-run never fails on "working tree
// clean".
func (s *Store) pushPost(p *Post, cfg AutopublishConfig, path string) error {
	repo := cfg.Repo
	if repo == "" {
		repo = s.path
	}
	git := func(args ...string) error {
		cmd := exec.Command("git", args...)
		cmd.Dir = repo
		cmd.Stdout = nil
		cmd.Stderr = os.Stderr
		return cmd.Run()
	}
	// Relative path inside the repo for the commit.
	rel := strings.TrimPrefix(path, repo+string(os.PathSeparator))
	if rel == path {
		// file outside repo; fall back to basename under DraftDir
		rel = filepath.Join(cfg.DraftDir, p.Slug+".md")
	}
	if err := git("add", rel); err != nil {
		return fmt.Errorf("git add: %w", err)
	}
	// Nothing staged → already committed; just push (idempotent re-run).
	if err := git("diff", "--cached", "--quiet"); err == nil {
		// no staged changes; fall through to push
	} else {
		msg := fmt.Sprintf("%s: %s", cfg.CommitPrefix, p.Title)
		if err := git("commit", "-m", msg); err != nil {
			return fmt.Errorf("git commit: %w", err)
		}
	}
	// Push to the remote; try to set upstream if none exists yet.
	if err := git("push"); err != nil {
		if usErr := git("push", "-u", "origin", cfg.Branch); usErr != nil {
			return fmt.Errorf("git push: %v", usErr)
		}
	}
	return nil
}
