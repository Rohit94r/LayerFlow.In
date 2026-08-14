package tui

import (
	"context"
	"database/sql"
	"fmt"
	"os"

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
	if st, err := repo.Status(context.Background()); err == nil {
		branch = st.Branch
	}

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
