// Package cmds implements the slash command router for LayerFlow.
//
// Slash commands are typed in the TUI input (e.g. /model gpt-4o) and routed
// to their handlers. Each command receives a context with access to sessions,
// providers, memory, search, and configuration.
package cmds

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"os/exec"
	"strings"

	"github.com/zalando/go-keyring"

	"github.com/layerflow/terminal/internal/auth"
	"github.com/layerflow/terminal/internal/config"
	"github.com/layerflow/terminal/internal/memory"
	"github.com/layerflow/terminal/internal/providers"
	"github.com/layerflow/terminal/internal/search"
	"github.com/layerflow/terminal/internal/session"
)

// Command defines a single slash command.
type Command struct {
	Name        string
	Description string
	Handler     func(*CmdContext, []string) error
	Aliases     []string
}

// CmdContext provides dependencies available to all command handlers.
type CmdContext struct {
	Session   string
	Project   string
	Model     string
	Provider  string
	Providers *providers.Registry
	Sessions  session.Store
	Messages  session.MessageStore
	Memory    memory.Store
	Search    search.Index
	Config    *config.Config
	DB        *sql.DB
}

// Route parses a slash command string and dispatches to the appropriate handler.
// Returns true if a command was matched, false otherwise.
func Route(input string, ctx *CmdContext) (bool, error) {
	if !strings.HasPrefix(input, "/") {
		return false, nil
	}

	parts := strings.Fields(strings.TrimPrefix(input, "/"))
	if len(parts) == 0 {
		return false, nil
	}

	name := strings.ToLower(parts[0])
	args := parts[1:]

	cmd, ok := table[name]
	if !ok {
		return false, fmt.Errorf("unknown command: /%s (type /help for available commands)", name)
	}

	if err := cmd.Handler(ctx, args); err != nil {
		return true, fmt.Errorf("/%s: %w", name, err)
	}
	return true, nil
}

// CommandExists reports whether the named command is registered.
func CommandExists(name string) bool {
	_, ok := table[strings.ToLower(name)]
	return ok
}

// ListCommands returns all registered commands.
func ListCommands() []Command {
	var cmds []Command
	for _, cmd := range table {
		cmds = append(cmds, cmd)
	}
	return cmds
}

// CommandNames returns all registered command names and aliases.
func CommandNames() []string {
	var names []string
	for name, cmd := range table {
		names = append(names, "/"+name)
		names = append(names, cmd.Aliases...)
	}
	return names
}

// ─── Command table ───────────────────────────────────────────────────────────

var table map[string]Command

// init builds the command table. It is populated here (not via a package-level
// initializer) to avoid an initialization cycle: handleHelp references table,
// and table references handleHelp.
func init() {
	table = map[string]Command{
		"help":     {Name: "help", Description: "Show available commands", Handler: handleHelp},
		"model":    {Name: "model", Description: "Switch LLM model", Handler: handleModel},
		"provider": {Name: "provider", Description: "Switch LLM provider", Handler: handleProvider},
		"status":   {Name: "status", Description: "Show current status", Handler: handleStatus},
		"new":      {Name: "new", Description: "Create a new session", Aliases: []string{"/reset"}, Handler: handleNew},
		"sessions": {Name: "sessions", Description: "List all sessions", Aliases: []string{"/ls"}, Handler: handleSessions},
		"use":      {Name: "use", Description: "Switch to a session", Handler: handleUse},
		"compact":  {Name: "compact", Description: "Compact conversation history", Aliases: []string{"/summarize"}, Handler: handleCompact},
		"memory":   {Name: "memory", Description: "Memory management", Aliases: []string{"/mem"}, Handler: handleMemory},
		"search":   {Name: "search", Description: "Search project files", Aliases: []string{"/find"}, Handler: handleSearch},
		"project":  {Name: "project", Description: "Show project information", Handler: handleProject},
		"sync":     {Name: "sync", Description: "Sync with cloud", Handler: handleSync},
		"cost":     {Name: "cost", Description: "Show cost breakdown", Aliases: []string{"/billing"}, Handler: handleCost},
		"clear":    {Name: "clear", Description: "Clear terminal screen", Aliases: []string{"/cls"}, Handler: handleClear},
		"rescue":   {Name: "rescue", Description: "Rescue and portability tools", Handler: handleRescue},
		"agents":   {Name: "agents", Description: "Agent management", Handler: handleAgents},
		"doctor":   {Name: "doctor", Description: "Run diagnostics", Handler: handleDoctor},
		"login":    {Name: "login", Description: "Authenticate with LayerFlow Cloud", Handler: handleLogin},
		"logout":   {Name: "logout", Description: "Sign out", Handler: handleLogout},
		"undo":     {Name: "undo", Description: "Undo last file edit", Aliases: []string{"/revert"}, Handler: handleUndo},
		"git":      {Name: "git", Description: "Git operations", Handler: handleGit},
	}
}

// ─── Handlers ────────────────────────────────────────────────────────────────

func handleHelp(ctx *CmdContext, args []string) error {
	fmt.Println("Available commands:")
	fmt.Println()
	for _, cmd := range table {
		aliases := ""
		if len(cmd.Aliases) > 0 {
			aliases = fmt.Sprintf(" (aliases: %s)", strings.Join(cmd.Aliases, ", "))
		}
		fmt.Printf("  /%-12s %s%s\n", cmd.Name, cmd.Description, aliases)
	}
	fmt.Println()
	fmt.Println("Press Ctrl+K for the command palette.")
	return nil
}

func handleModel(ctx *CmdContext, args []string) error {
	if len(args) == 0 {
		fmt.Printf("Current model: %s\n", ctx.Model)
		fmt.Println("Usage: /model <model-name>")
		return nil
	}
	ctx.Model = args[0]
	fmt.Printf("Model switched to: %s\n", args[0])
	return nil
}

func handleProvider(ctx *CmdContext, args []string) error {
	if len(args) == 0 {
		fmt.Printf("Current provider: %s\n", ctx.Provider)
		fmt.Println("Available providers:")
		for _, name := range ctx.Providers.List() {
			fmt.Printf("  - %s\n", name)
		}
		return nil
	}
	ctx.Provider = args[0]
	fmt.Printf("Provider switched to: %s\n", args[0])
	return nil
}

func handleStatus(ctx *CmdContext, args []string) error {
	fmt.Println("LayerFlow Status")
	fmt.Println("─────────────────")
	fmt.Printf("  Session:   %s\n", ctx.Session)
	fmt.Printf("  Model:     %s\n", ctx.Model)
	fmt.Printf("  Provider:  %s\n", ctx.Provider)
	fmt.Printf("  Project:   %s\n", ctx.Project)
	return nil
}

func handleNew(ctx *CmdContext, args []string) error {
	sess := &session.Session{
		ProjectPath: ctx.Project,
		Model:       ctx.Model,
		Provider:    ctx.Provider,
	}
	if len(args) > 0 {
		sess.Title = args[0]
	}

	if err := ctx.Sessions.Create(context.Background(), sess); err != nil {
		return fmt.Errorf("create session: %w", err)
	}

	ctx.Session = sess.ID
	fmt.Printf("New session: %s\n", sess.ID)
	return nil
}

func handleSessions(ctx *CmdContext, args []string) error {
	sessions, err := ctx.Sessions.List(context.Background(), ctx.Project, 50)
	if err != nil {
		return fmt.Errorf("list sessions: %w", err)
	}

	if len(sessions) == 0 {
		fmt.Println("No sessions found.")
		return nil
	}

	fmt.Println("Sessions:")
	fmt.Println("─────────")
	for _, s := range sessions {
		marker := "  "
		if s.ID == ctx.Session {
			marker = "→ "
		}
		title := s.Title
		if title == "" {
			title = "(untitled)"
		}
		fmt.Printf("%s%s  %s  %s\n", marker, s.ID, title, s.Model)
	}
	return nil
}

func handleUse(ctx *CmdContext, args []string) error {
	if len(args) == 0 {
		return fmt.Errorf("usage: /use <session-id>")
	}

	sess, err := ctx.Sessions.Get(context.Background(), args[0])
	if err != nil {
		return fmt.Errorf("get session: %w", err)
	}

	ctx.Session = sess.ID
	fmt.Printf("Switched to session: %s\n", sess.ID)
	return nil
}

func handleCompact(ctx *CmdContext, args []string) error {
	// Hide messages older than the last 20 visible ones
	msgs, err := ctx.Messages.GetMessages(context.Background(), ctx.Session, 0)
	if err != nil {
		return fmt.Errorf("get messages: %w", err)
	}

	if len(msgs) <= 20 {
		fmt.Println("Nothing to compact.")
		return nil
	}

	cutoff := msgs[len(msgs)-20].CreatedAt
	hidden, err := ctx.Messages.HideMessages(context.Background(), ctx.Session, cutoff)
	if err != nil {
		return fmt.Errorf("compact: %w", err)
	}

	fmt.Printf("Compacted %d messages.\n", hidden)
	return nil
}

func handleMemory(ctx *CmdContext, args []string) error {
	if ctx.Memory == nil {
		return fmt.Errorf("memory not available")
	}

	if len(args) == 0 {
		entries, err := ctx.Memory.List(context.Background(), ctx.Project)
		if err != nil {
			return fmt.Errorf("list memory: %w", err)
		}
		fmt.Printf("Memory entries: %d\n", len(entries))
		fmt.Println("Usage: /memory <add|get|list|delete> [args...]")
		return nil
	}

	switch args[0] {
	case "list":
		entries, err := ctx.Memory.List(context.Background(), ctx.Project)
		if err != nil {
			return err
		}
		for _, e := range entries {
			fmt.Printf("  [%s] %s: %s\n", e.Type, e.Title, e.Body)
		}
	case "get":
		if len(args) < 2 {
			return fmt.Errorf("usage: /memory get <id>")
		}
		entry, err := ctx.Memory.Get(context.Background(), args[1])
		if err != nil {
			return err
		}
		fmt.Printf("  [%s] %s\n  %s\n", entry.Type, entry.Title, entry.Body)
	case "add":
		if len(args) < 3 {
			return fmt.Errorf("usage: /memory add <title> <body>")
		}
		e := memory.Entry{
			Type:        memory.TypePreference,
			Title:       args[1],
			Body:        strings.Join(args[2:], " "),
			ProjectPath: ctx.Project,
		}
		id, err := ctx.Memory.Add(context.Background(), e)
		if err != nil {
			return err
		}
		fmt.Printf("Memory added: %s\n", id)
	case "delete":
		if len(args) < 2 {
			return fmt.Errorf("usage: /memory delete <id>")
		}
		if err := ctx.Memory.Delete(context.Background(), args[1]); err != nil {
			return err
		}
		fmt.Printf("Memory deleted: %s\n", args[1])
	default:
		return fmt.Errorf("unknown subcommand: %s (use add|get|list|delete)", args[0])
	}
	return nil
}

func handleSearch(ctx *CmdContext, args []string) error {
	if len(args) == 0 {
		return fmt.Errorf("usage: /search <query>")
	}

	query := strings.Join(args, " ")
	results, err := ctx.Search.Search(context.Background(), query, search.Opts{Limit: 20, Project: ctx.Project})
	if err != nil {
		return fmt.Errorf("search: %w", err)
	}

	if len(results) == 0 {
		fmt.Println("No results found.")
		return nil
	}

	fmt.Printf("Results for %q:\n", query)
	for i, r := range results {
		if i >= 20 {
			fmt.Printf("  ... and %d more results\n", len(results)-20)
			break
		}
		fmt.Printf("  %s:%d  %s\n", r.Path, r.Line, r.Snippet)
	}
	return nil
}

func handleProject(ctx *CmdContext, args []string) error {
	fmt.Println("Project Information")
	fmt.Println("───────────────────")
	fmt.Printf("  Path: %s\n", ctx.Project)
	return nil
}

func handleSync(ctx *CmdContext, args []string) error {
	// The durable sync loop lives in the lf CLI (`lf sync`), which pushes and
	// pulls through the cloud sync API using the SQLite journal.
	fmt.Println("Run `lf sync [--dry-run]` in a terminal to push/pull with the cloud.")
	fmt.Println("  Local changes are journaled in ~/.local/share/layerflow/lf.db.")
	return nil
}

func handleCost(ctx *CmdContext, args []string) error {
	sessions, err := ctx.Sessions.List(context.Background(), ctx.Project, 50)
	if err != nil {
		return fmt.Errorf("list sessions: %w", err)
	}

	var inTok, outTok int
	var costMicro int64
	for _, s := range sessions {
		inTok += s.InputTokens
		outTok += s.OutputTokens
		costMicro += s.CostMicro
	}

	fmt.Println("Cost Breakdown")
	fmt.Println("──────────────")
	fmt.Printf("  Sessions:        %d\n", len(sessions))
	fmt.Printf("  Input tokens:    %d\n", inTok)
	fmt.Printf("  Output tokens:   %d\n", outTok)
	fmt.Printf("  Estimated cost:  $%.4f\n", float64(costMicro)/1_000_000)
	return nil
}

func handleClear(ctx *CmdContext, args []string) error {
	fmt.Print("\033[2J\033[H")
	return nil
}

func handleRescue(ctx *CmdContext, args []string) error {
	fmt.Println("Rescue & Portability")
	fmt.Println("────────────────────")
	fmt.Println("  Run `lf rescue` in a terminal to export a portable pack of")
	fmt.Println("  sessions, messages, and sync identity to ~/.local/share/layerflow/exports/.")
	return nil
}

func handleAgents(ctx *CmdContext, args []string) error {
	fmt.Println("Agent Management")
	fmt.Println("────────────────")
	fmt.Println("  Agent management is not wired in this build yet.")
	return nil
}

func handleDoctor(ctx *CmdContext, args []string) error {
	fmt.Println("LayerFlow Diagnostics")
	fmt.Println("─────────────────────")

	checks := []struct {
		name string
		fn   func() error
	}{
		{"storage", func() error {
			_, err := ctx.DB.Exec("SELECT 1")
			return err
		}},
		{"providers", func() error {
			names := ctx.Providers.List()
			if len(names) == 0 {
				return fmt.Errorf("no providers registered")
			}
			return nil
		}},
	}

	passed := 0
	for _, c := range checks {
		if err := c.fn(); err != nil {
			fmt.Printf("  ✗ %s: %v\n", c.name, err)
		} else {
			fmt.Printf("  ✓ %s\n", c.name)
			passed++
		}
	}

	fmt.Printf("\n%d/%d checks passed\n", passed, len(checks))
	return nil
}

func handleLogin(ctx *CmdContext, args []string) error {
	return auth.New().Login()
}

func handleLogout(ctx *CmdContext, args []string) error {
	a := auth.New()
	if err := a.Logout(); err != nil && !errors.Is(err, keyring.ErrNotFound) {
		return fmt.Errorf("logout: %w", err)
	}
	fmt.Println("Signed out.")
	return nil
}

func handleUndo(ctx *CmdContext, args []string) error {
	// Undo needs a snapshot or diff-revert engine, which does not exist
	// yet. Refuse rather than pretend.
	return fmt.Errorf("undo has no snapshot engine yet; review changes with /git diff first")
}

func handleGit(ctx *CmdContext, args []string) error {
	if len(args) == 0 {
		fmt.Println("Git Operations")
		fmt.Println("───────────────")
		fmt.Println("  Usage: /git <status|diff|log|branch|commit> [args...]")
		fmt.Println("  Arguments are passed to git as-is (no shell interpretation).")
		return nil
	}

	sub := args[0]
	var cmdArgs []string
	switch sub {
	case "status", "diff", "log", "branch", "stash":
		cmdArgs = append([]string{sub}, args[1:]...)
	case "commit":
		if len(args) < 2 {
			return fmt.Errorf("usage: /git commit <message>")
		}
		cmdArgs = []string{"commit", "-m", strings.Join(args[1:], " ")}
	default:
		return fmt.Errorf("unknown git subcommand: %s", sub)
	}

	cmd := exec.CommandContext(context.Background(), "git", cmdArgs...)
	cmd.Dir = ctx.Project
	out, err := cmd.CombinedOutput()
	fmt.Print(string(out))
	if err != nil {
		return fmt.Errorf("git %s: %w", sub, err)
	}
	return nil
}
