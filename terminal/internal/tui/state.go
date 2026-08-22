package tui

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/layerflow/terminal/internal/cloud"
	"github.com/layerflow/terminal/internal/cmds"
	"github.com/layerflow/terminal/internal/config"
	"github.com/layerflow/terminal/internal/git"
	"github.com/layerflow/terminal/internal/memory"
	"github.com/layerflow/terminal/internal/providers"
	"github.com/layerflow/terminal/internal/search"
	"github.com/layerflow/terminal/internal/session"
	"github.com/layerflow/terminal/internal/storage"
)

// State bundles the services the TUI operates against. It is created once at
// startup and shared across all screens.
type State struct {
	Cfg           *config.Config
	DB            *sql.DB
	Sessions      *session.SQLStore
	Memory        memory.Store
	Client        *cloud.Client
	Search        search.Index
	CmdCtx        *cmds.CmdContext
	Router        *providers.HeuristicRouter
	Project       string
	Branch        string
	GitRepo       bool
	Workspace     string
	ProjectType   string
	Git           *git.Repo
	Version       string
	Model         string
	Provider      string
	Authenticated bool
	ApiKey        string
}

// NewState initializes config, storage, cloud client, search, and git state.
func NewState(version string) (*State, error) {
	dir, err := os.Getwd()
	if err != nil {
		return nil, fmt.Errorf("get working directory: %w", err)
	}

	cfg, err := config.Load(dir)
	if err != nil {
		return nil, fmt.Errorf("load config: %w", err)
	}

	db, err := storage.Open(&storage.Options{})
	if err != nil {
		return nil, fmt.Errorf("open storage: %w", err)
	}

	store := session.NewSQLStore(db)
	mem := memory.NewSQLStore(db)

	key, err := cloud.ResolveAPIKey(cfg)
	authenticated := err == nil && key != ""
	client := cloud.NewClient(cloud.ResolveBaseURL(cfg), key)

	idx := search.NewHybridIndex(db)
	_ = idx.InitSchema(context.Background())

	repo := git.New(dir)
	branch := ""
	gitRepo := false
	if st, err := repo.Status(context.Background()); err == nil {
		branch = st.Branch
		gitRepo = true
	}

	// Workspace + project-type detection (package.json, go.mod, …). Being
	// outside a recognized project is not an error — we just show the folder.
	workspace := homePath(dir)
	_, projectType := detectProject(dir)

	router := providers.NewHeuristicRouter()
	model := cfg.Model
	if model == "" {
		model = cloud.DefaultModel
	}
	provider := cfg.Provider
	router.SetOverride("model", model)
	if provider != "" {
		router.SetOverride("provider", provider)
	}

	reg := providers.NewRegistry()
	_ = reg.Register("openai", func(map[string]any) (providers.Provider, error) {
		return providers.NewOpenAIProvider(providers.OpenAIConfig{}), nil
	})
	_ = reg.Register("anthropic", func(map[string]any) (providers.Provider, error) {
		return providers.NewAnthropicProvider(providers.AnthropicConfig{}), nil
	})
	_ = reg.Register("gemini", func(map[string]any) (providers.Provider, error) {
		return providers.NewGeminiProvider(providers.GeminiConfig{}), nil
	})
	_ = reg.Register("local", func(map[string]any) (providers.Provider, error) {
		return providers.NewLocalProvider(providers.LocalConfig{}), nil
	})

	cmdCtx := &cmds.CmdContext{
		Project:   dir,
		Model:     model,
		Provider:  provider,
		Providers: reg,
		Sessions:  store,
		Messages:  store,
		Memory:    mem,
		Search:    idx,
		Config:    cfg,
		DB:        db,
	}

	return &State{
		Cfg:           cfg,
		DB:            db,
		Sessions:      store,
		Memory:        mem,
		Client:        client,
		Search:        idx,
		CmdCtx:        cmdCtx,
		Router:        router,
		Project:       dir,
		Branch:        branch,
		GitRepo:       gitRepo,
		Workspace:     workspace,
		ProjectType:   projectType,
		Git:           repo,
		Version:       version,
		Model:         model,
		Provider:      provider,
		Authenticated: authenticated,
		ApiKey:        key,
	}, nil
}

// Close releases global resources (the storage singleton).
func (s *State) Close() error {
	return storage.Close()
}

// homePath collapses the user's home directory prefix into "~" for display.
func homePath(p string) string {
	if home, err := os.UserHomeDir(); err == nil && strings.HasPrefix(p, home) {
		return "~" + strings.TrimPrefix(p, home)
	}
	return p
}

// detectProject scans the directory for a recognized project manifest and
// returns (name, type). name is the folder basename; type is "Go", "Node",
// "Python", "Rust", "Java", or "" when nothing is recognized.
func detectProject(dir string) (string, string) {
	name := filepath.Base(dir)
	manifests := []struct {
		file string
		kind string
	}{
		{"go.mod", "Go"},
		{"package.json", "Node"},
		{"pyproject.toml", "Python"},
		{"requirements.txt", "Python"},
		{"Cargo.toml", "Rust"},
		{"pom.xml", "Java"},
		{"build.gradle", "Java"},
		{"build.gradle.kts", "Java"},
	}
	for _, m := range manifests {
		if _, err := os.Stat(filepath.Join(dir, m.file)); err == nil {
			return name, m.kind
		}
	}
	return name, ""
}
