package main

import (
	"context"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/charmbracelet/lipgloss"
	"github.com/spf13/cobra"

	"github.com/layerflow/terminal/internal/audit"
	"github.com/layerflow/terminal/internal/auth"
	"github.com/layerflow/terminal/internal/cloud"
	"github.com/layerflow/terminal/internal/config"
	"github.com/layerflow/terminal/internal/daemon"
	"github.com/layerflow/terminal/internal/session"
	"github.com/layerflow/terminal/internal/storage"
	"github.com/layerflow/terminal/internal/tui"
)

var (
	buildVersion string
	buildCommit  string
	buildDate    string
)

// SetVersionInfo sets build version info.
func SetVersionInfo(v, c, d string) {
	buildVersion = v
	buildCommit = c
	buildDate = d
}

// rootCmd is the Cobra root command.
var rootCmd = &cobra.Command{
	Use:   "lf",
	Short: "LayerFlow Terminal — local-first AI workspace",
	Long:  `LayerFlow Terminal (lf) is a local-first AI terminal workspace with streaming, tools, memory, and cloud sync.`,
	RunE: func(cmd *cobra.Command, args []string) error {
		return tui.Run(buildVersion)
	},
}

// Execute runs the root command.
func Execute() error {
	return rootCmd.Execute()
}

func init() {
	rootCmd.AddCommand(
		newChatCmd(),
		newRunCmd(),
		newSessionsCmd(),
		newLoginCmd(),
		newLogoutCmd(),
		newSyncCmd(),
		newModelsCmd(),
		newDoctorCmd(),
		newRescueCmd(),
		newCostCmd(),
		newMCPCmd(),
		newDaemonCmd(),
		newVersionCmd(),
		newUpgradeCmd(),
		newContentCmd(),
	)
}

// newChatCmd creates the `lf chat` command.
func newChatCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "chat [query]",
		Short: "Start or continue a chat session",
		Long:  `Start or continue a chat session with streaming responses. Use --model and --provider to override defaults.`,
		Args:  cobra.MaximumNArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			model, _ := cmd.Flags().GetString("model")
			provider, _ := cmd.Flags().GetString("provider")
			sessionID, _ := cmd.Flags().GetString("id")
			nonInteractive, _ := cmd.Flags().GetBool("non-interactive")

			query := ""
			if len(args) > 0 {
				query = args[0]
			}

			if nonInteractive {
				return runNonInteractive(query, model, provider)
			}
			return runInteractive(query, model, provider, sessionID)
		},
	}

	cmd.Flags().StringP("model", "m", "", "Model to use (overrides config)")
	cmd.Flags().StringP("provider", "p", "", "Provider to use (overrides config)")
	cmd.Flags().String("id", "", "Session ID to continue")
	cmd.Flags().BoolP("non-interactive", "n", false, "Non-interactive mode (pipe output)")

	return cmd
}

// newRunCmd creates the `lf run` command.
func newRunCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "run <task>",
		Short: "Run a single task agent",
		Long:  `Run a non-interactive single task with live step streaming and tool approvals.`,
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			maxSteps, _ := cmd.Flags().GetInt("max-steps")
			model, _ := cmd.Flags().GetString("model")
			provider, _ := cmd.Flags().GetString("provider")

			return runTask(args[0], maxSteps, model, provider)
		},
	}

	cmd.Flags().Int("max-steps", 20, "Maximum steps for the task")
	cmd.Flags().StringP("model", "m", "", "Model to use")
	cmd.Flags().StringP("provider", "p", "", "Provider to use")

	return cmd
}

// newSessionsCmd creates the `lf sessions` command.
func newSessionsCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "sessions",
		Short: "List, restore, branch, or delete sessions",
		Long:  `Manage chat sessions. Use --open to open a session, --id to select one.`,
		RunE: func(cmd *cobra.Command, args []string) error {
			open, _ := cmd.Flags().GetBool("open")
			id, _ := cmd.Flags().GetString("id")
			deleteMode, _ := cmd.Flags().GetBool("delete")

			return listSessions(open, id, deleteMode)
		},
	}

	cmd.Flags().BoolP("open", "o", false, "Open a session interactively")
	cmd.Flags().String("id", "", "Session ID")
	cmd.Flags().BoolP("delete", "d", false, "Delete a session")

	return cmd
}

// newLoginCmd creates the `lf login` command.
func newLoginCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "login",
		Short: "Authenticate with a LayerFlow platform key",
		Long:  `Paste your LayerFlow platform key (lf_live_...). Stored in the OS keyring.`,
		RunE: func(cmd *cobra.Command, args []string) error {
			return performLogin()
		},
	}
}

// newLogoutCmd creates the `lf logout` command.
func newLogoutCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "logout",
		Short: "Revoke token and purge cached credentials",
		Long:  `Revoke the current session token and remove it from the keyring.`,
		RunE: func(cmd *cobra.Command, args []string) error {
			return performLogout()
		},
	}
}

// newSyncCmd creates the `lf sync` command.
func newSyncCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "sync",
		Short: "Force push/pull sync with cloud",
		Long:  `Synchronize local state with the LayerFlow cloud. Use --dry-run to preview.`,
		RunE: func(cmd *cobra.Command, args []string) error {
			dryRun, _ := cmd.Flags().GetBool("dry-run")
			resolve, _ := cmd.Flags().GetString("resolve")

			return performSync(dryRun, resolve)
		},
	}

	cmd.Flags().Bool("dry-run", false, "Preview sync without applying")
	cmd.Flags().String("resolve", "", "Resolve a specific conflict by ID")

	return cmd
}

// newModelsCmd creates the `lf models` command.
func newModelsCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "models",
		Short: "List gateway models",
		Long:  `List models available through the LayerFlow gateway, with availability.`,
		RunE: func(cmd *cobra.Command, args []string) error {
			asJSON, _ := cmd.Flags().GetBool("json")
			if asJSON {
				return listModelsJSON()
			}
			return listModels()
		},
	}

	cmd.Flags().Bool("json", false, "Emit machine-readable JSON")

	return cmd
}

// newDoctorCmd creates the `lf doctor` command.
func newDoctorCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "doctor",
		Short: "Run diagnostics",
		Long:  `Check config, DB, providers, keyring, MCP health, and audit chain.`,
		RunE: func(cmd *cobra.Command, args []string) error {
			audit, _ := cmd.Flags().GetBool("audit")
			return runDoctor(audit)
		},
	}

	cmd.Flags().Bool("audit", false, "Verify audit chain integrity")

	return cmd
}

// newRescueCmd creates the `lf rescue` command.
func newRescueCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "rescue",
		Short: "Rescue/portability flow",
		Long:  `Generate a report or continue pack for portability.`,
		RunE: func(cmd *cobra.Command, args []string) error {
			return runRescue()
		},
	}
}

// newCostCmd creates the `lf cost` command.
func newCostCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "cost",
		Short: "Show token and cost usage",
		Long:  `Display token and dollar usage for the current session or project.`,
		RunE: func(cmd *cobra.Command, args []string) error {
			sessionID, _ := cmd.Flags().GetString("session")
			project, _ := cmd.Flags().GetBool("project")
			return showCost(sessionID, project)
		},
	}

	cmd.Flags().String("session", "", "Session ID (defaults to current)")
	cmd.Flags().BoolP("project", "p", false, "Show project-level costs")

	return cmd
}

// newMCPCmd creates the `lf mcp` command group.
func newMCPCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "mcp",
		Short: "MCP server management",
		Long:  `Manage Model Context Protocol servers.`,
	}

	cmd.AddCommand(
		&cobra.Command{
			Use:   "list",
			Short: "List connected MCP servers",
			RunE: func(cmd *cobra.Command, args []string) error {
				return listMCPServers()
			},
		},
		&cobra.Command{
			Use:   "add <name> <type> <ref>",
			Short: "Add an MCP server",
			Args:  cobra.ExactArgs(3),
			RunE: func(cmd *cobra.Command, args []string) error {
				return addMCPServer(args[0], args[1], args[2])
			},
		},
		&cobra.Command{
			Use:   "remove <name>",
			Short: "Remove an MCP server",
			Args:  cobra.ExactArgs(1),
			RunE: func(cmd *cobra.Command, args []string) error {
				return removeMCPServer(args[0])
			},
		},
		&cobra.Command{
			Use:   "health <name>",
			Short: "Check MCP server health",
			Args:  cobra.ExactArgs(1),
			RunE: func(cmd *cobra.Command, args []string) error {
				return checkMCPHealth(args[0])
			},
		},
	)

	return cmd
}

// newDaemonCmd creates the `lf daemon` command group.
func newDaemonCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "daemon",
		Short: "Background daemon lifecycle",
		Long:  `Manage the background daemon for sync, indexing, and notifications.`,
	}

	cmd.AddCommand(
		&cobra.Command{
			Use:   "start",
			Short: "Start the daemon",
			RunE: func(cmd *cobra.Command, args []string) error {
				return startDaemon()
			},
		},
		&cobra.Command{
			Use:   "stop",
			Short: "Stop the daemon",
			RunE: func(cmd *cobra.Command, args []string) error {
				return stopDaemon()
			},
		},
		&cobra.Command{
			Use:   "status",
			Short: "Show daemon status",
			RunE: func(cmd *cobra.Command, args []string) error {
				return showDaemonStatus()
			},
		},
	)

	return cmd
}

// newVersionCmd creates the `lf version` command.
func newVersionCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "version",
		Short: "Show version",
		Run: func(cmd *cobra.Command, args []string) {
			fmt.Printf("lf %s (commit: %s, built: %s)\n", buildVersion, buildCommit, buildDate)
		},
	}
}

// newUpgradeCmd creates the `lf upgrade` command.
func newUpgradeCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "upgrade",
		Short: "Self-update to the latest version",
		Long:  `Check for updates and self-update atomically.`,
		RunE: func(cmd *cobra.Command, args []string) error {
			return performUpgrade()
		},
	}
}

// --- Command implementations ---

var (
	passStyle = lipgloss.NewStyle().Foreground(lipgloss.Color("2")).Bold(true)
	failStyle = lipgloss.NewStyle().Foreground(lipgloss.Color("1")).Bold(true)
	warnStyle = lipgloss.NewStyle().Foreground(lipgloss.Color("3")).Bold(true)
	nameStyle = lipgloss.NewStyle().Bold(true)
)

// stubNotice prints an honest "not wired" message pointing at what is
// available and at the README. Used for commands whose real internals
// are not implemented yet.
func stubNotice(what string) {
	fmt.Printf("%s is not wired in this build yet.\n", what)
	fmt.Println("Available command surface:")
	fmt.Println("  lf login / lf logout              API-key login with the LayerFlow cloud")
	fmt.Println("  lf chat [query] [-n] [--model X]  streaming chat via the LayerFlow gateway")
	fmt.Println("  lf run <task>                     single-shot task agent")
	fmt.Println("  lf sync [--dry-run]               push/pull with the cloud sync API")
	fmt.Println("  lf sessions [--id ID] [--delete]  list or delete persisted sessions")
	fmt.Println("  lf doctor [--audit]               config, storage, keychain, audit chain checks")
	fmt.Println("  lf cost [--session ID]            token and cost usage from the local store")
	fmt.Println("  lf mcp list                       list MCP servers from config")
	fmt.Println("  lf daemon start|stop|status       background daemon lifecycle")
	fmt.Println("  lf version                        show build version")
	fmt.Println("Full command reference: README.md at the repository root.")
}

func listSessions(open bool, id string, delete bool) error {
	if open {
		stubNotice("Interactive session open")
		return nil
	}

	db, err := storage.Open(&storage.Options{})
	if err != nil {
		return fmt.Errorf("open storage: %w", err)
	}
	defer storage.Close()

	store := session.NewSQLStore(db)
	ctx := context.Background()

	if delete {
		if id == "" {
			return fmt.Errorf("delete requires --id <session-id>")
		}
		if err := store.Delete(ctx, id); err != nil {
			return fmt.Errorf("delete session: %w", err)
		}
		fmt.Printf("Deleted session %s\n", id)
		return nil
	}

	dir, err := os.Getwd()
	if err != nil {
		return err
	}
	sessions, err := store.List(ctx, dir, 50)
	if err != nil {
		return fmt.Errorf("list sessions: %w", err)
	}
	if len(sessions) == 0 {
		fmt.Println("No sessions found for the current project.")
		return nil
	}
	fmt.Println("Sessions:")
	for _, s := range sessions {
		title := s.Title
		if title == "" {
			title = "(untitled)"
		}
		fmt.Printf("  %s  %-32s  %s/%s\n", s.ID, title, s.Provider, s.Model)
	}
	return nil
}

func runDoctor(checkAudit bool) error {
	fmt.Println("LayerFlow Doctor")
	fmt.Println("─────────────────────")

	type level int
	const (
		lvlPass level = iota
		lvlWarn
		lvlFail
	)
	type report struct {
		name   string
		detail string
		err    error
		lvl    level
	}
	var reports []report

	// Config file present and parseable.
	cfgPath := ""
	if home, err := os.UserHomeDir(); err == nil {
		cfgPath = filepath.Join(home, ".config", "layerflow", "config.yaml")
	}
	if _, err := os.Stat(cfgPath); err != nil {
		reports = append(reports, report{"config", cfgPath + " (missing)", err, lvlWarn})
	} else if _, err := config.Load(""); err != nil {
		reports = append(reports, report{"config", cfgPath, err, lvlFail})
	} else {
		reports = append(reports, report{"config", cfgPath, nil, lvlPass})
	}

	// SQLite storage opens and migrations are applied.
	db, openErr := storage.Open(&storage.Options{})
	if openErr != nil {
		reports = append(reports, report{"storage", "open failed", openErr, lvlFail})
	} else {
		defer storage.Close()
		if _, err := db.Exec("SELECT 1"); err != nil {
			reports = append(reports, report{"storage", "schema not queryable", err, lvlFail})
		} else {
			reports = append(reports, report{"storage", "open + migrations OK", nil, lvlPass})
		}
	}

	// Keychain has a stored refresh token.
	if auth.New().IsAuthenticated() {
		reports = append(reports, report{"authentication", "refresh token present", nil, lvlPass})
	} else {
		reports = append(reports, report{"authentication", "not signed in", errors.New("run `lf login`"), lvlWarn})
	}

	// Git integration: git binary present + whether cwd is inside a repo.
	// Being outside a git repository is a warning, never a failure.
	if _, err := exec.LookPath("git"); err != nil {
		reports = append(reports, report{"git", "git not installed", err, lvlWarn})
	} else if cmd := exec.Command("git", "rev-parse", "--is-inside-work-tree"); cmd.Run() != nil {
		reports = append(reports, report{"git", "available — cwd is not a repository", nil, lvlWarn})
	} else {
		reports = append(reports, report{"git", "available — repository detected", nil, lvlPass})
	}

	// Workspace project detection (informational).
	if dir, err := os.Getwd(); err == nil {
		if _, kind := detectProjectType(dir); kind != "" {
			reports = append(reports, report{"workspace", kind + " project detected", nil, lvlPass})
		} else {
			reports = append(reports, report{"workspace", "no recognized project manifest", nil, lvlWarn})
		}
	}

	// Audit chain integrity.
	if checkAudit {
		if openErr != nil {
			reports = append(reports, report{"audit", "skipped (storage failed)", openErr, lvlFail})
		} else {
			auditLog, err := audit.New(db)
			if err != nil {
				reports = append(reports, report{"audit", "init", err, lvlFail})
			} else {
				vr, err := auditLog.VerifyChain()
				if err != nil {
					reports = append(reports, report{"audit", "verify", err, lvlFail})
				} else if !vr.Valid {
					reports = append(reports, report{"audit",
						fmt.Sprintf("chain broken at row %d", vr.BrokenAt), errors.New("hash mismatch"), lvlFail})
				} else {
					reports = append(reports, report{"audit", fmt.Sprintf("%d rows verified", vr.Rows), nil, lvlPass})
				}
			}
		}
	}

	passed := 0
	for _, r := range reports {
		switch r.lvl {
		case lvlFail:
			fmt.Printf("%s  %-14s %s\n", failStyle.Render("FAIL"), nameStyle.Render(r.name), r.detail)
		case lvlWarn:
			fmt.Printf("%s  %-14s %s\n", warnStyle.Render("WARN"), nameStyle.Render(r.name), r.detail)
		default:
			fmt.Printf("%s  %-14s %s\n", passStyle.Render("PASS"), nameStyle.Render(r.name), r.detail)
			passed++
		}
	}
	fmt.Printf("\n%d/%d checks passed\n", passed, len(reports))
	return nil
}

// detectProjectType scans dir for a recognized project manifest and returns
// (name, type). Mirrors the TUI's detection so `lf doctor` stays consistent.
func detectProjectType(dir string) (string, string) {
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

func showCost(sessionID string, project bool) error {
	db, err := storage.Open(&storage.Options{})
	if err != nil {
		return fmt.Errorf("open storage: %w", err)
	}
	defer storage.Close()

	store := session.NewSQLStore(db)
	ctx := context.Background()

	dir, err := os.Getwd()
	if err != nil {
		return err
	}

	var inTok, outTok int
	var costMicro int64

	if sessionID != "" {
		sess, err := store.Get(ctx, sessionID)
		if err != nil {
			return fmt.Errorf("get session: %w", err)
		}
		inTok, outTok = sess.InputTokens, sess.OutputTokens
		costMicro = sess.CostMicro
	} else {
		sessions, err := store.List(ctx, dir, 50)
		if err != nil {
			return fmt.Errorf("list sessions: %w", err)
		}
		for _, s := range sessions {
			inTok += s.InputTokens
			outTok += s.OutputTokens
			costMicro += s.CostMicro
		}
	}

	// Local session costs
	fmt.Println("Cost Breakdown")
	fmt.Println("──────────────")
	fmt.Printf("  Input tokens:   %s\n", formatTokens(inTok))
	fmt.Printf("  Output tokens:  %s\n", formatTokens(outTok))
	fmt.Printf("  Estimated cost: $%.4f\n", float64(costMicro)/1_000_000)

	// Fetch workspace budget + plan from the API
	cfg, cfgErr := config.Load("")
	if cfgErr == nil {
		key, keyErr := cloud.ResolveAPIKey(cfg)
		if keyErr == nil {
			client := cloud.NewClient(cloud.ResolveBaseURL(cfg), key)
			usage, err := client.GetUsage(ctx)
			if err == nil && usage != nil {
				fmt.Println()
				fmt.Println("Workspace Budget")
				fmt.Println("────────────────")
				limitUSD := float64(usage.Budget.MonthlyLimitMicro) / 1_000_000
				spentUSD := float64(usage.Budget.SpentMicro) / 1_000_000
				remainingUSD := float64(usage.Budget.RemainingMicro) / 1_000_000
				fmt.Printf("  Monthly limit:  $%.2f\n", limitUSD)
				fmt.Printf("  Spent this mo: $%.2f  (%.1f%%)\n", spentUSD, usage.Budget.PercentUsed)
				fmt.Printf("  Remaining:     $%.2f\n", remainingUSD)

				// Visual progress bar
				pct := usage.Budget.PercentUsed
				if pct > 100 {
					pct = 100
				}
				barWidth := 30
				filled := int(pct / 100 * float64(barWidth))
				if filled > barWidth {
					filled = barWidth
				}
				bar := strings.Repeat("█", filled) + strings.Repeat("░", barWidth-filled)
				statusBar := bar
				if usage.Budget.Blocked {
					statusBar += "  BLOCKED"
				}
				fmt.Printf("  [%s]\n", statusBar)

				fmt.Println()
				fmt.Println("Plan")
				fmt.Println("────")
				planLabel := usage.Plan.Plan
				if planLabel == "" {
					planLabel = "free"
				}
				if !usage.Plan.Active && planLabel != "free" {
					planLabel += " (inactive)"
				}
				fmt.Printf("  Current plan:   %s\n", planLabel)
				if usage.Plan.CurrentPeriodEnd != nil {
					fmt.Printf("  Renews:         %s\n", *usage.Plan.CurrentPeriodEnd)
				}
			}
		}
	}

	return nil
}

func formatTokens(n int) string {
	if n >= 1_000_000 {
		return fmt.Sprintf("%.1fM", float64(n)/1_000_000)
	}
	if n >= 1_000 {
		return fmt.Sprintf("%.1fK", float64(n)/1_000)
	}
	return fmt.Sprintf("%d", n)
}

func listMCPServers() error {
	cfg, err := config.Load("")
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}

	if len(cfg.MCPServers) == 0 {
		fmt.Println("No MCP servers configured.")
		fmt.Println("  Add them under ~/.config/layerflow/config.yaml or .layerflow/config.yaml:")
		fmt.Println("  mcp_servers:")
		fmt.Println("    my-server:")
		fmt.Println("      command: npx")
		fmt.Println("      args: [\"-y\", \"@modelcontextprotocol/server-xyz\"]")
		return nil
	}

	fmt.Println("Configured MCP servers:")
	for name, s := range cfg.MCPServers {
		args := strings.Join(s.Args, " ")
		if args != "" {
			args = " " + args
		}
		fmt.Printf("  %-24s %s%s\n", name, s.Command, args)
	}
	return nil
}

func addMCPServer(name, serverType, ref string) error {
	stubNotice("MCP add")
	return nil
}

func removeMCPServer(name string) error {
	stubNotice("MCP remove")
	return nil
}

func checkMCPHealth(name string) error {
	stubNotice("MCP health")
	return nil
}

func startDaemon() error {
	cfg, err := config.Load("")
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}
	fmt.Println("Starting daemon...")
	return daemon.Start(cfg)
}

func stopDaemon() error {
	return daemon.Stop()
}

func showDaemonStatus() error {
	st, err := daemon.StatusQuery()
	if err != nil {
		return fmt.Errorf("daemon status: %w", err)
	}
	state := "not running"
	if st.Running {
		state = "running"
	}
	fmt.Printf("Daemon %s (pid %d, socket %s)\n", state, st.PID, st.Socket)
	return nil
}
