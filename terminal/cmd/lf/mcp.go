package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"sort"
	"strings"

	"github.com/layerflow/terminal/internal/config"
	"github.com/layerflow/terminal/internal/mcp"
	"github.com/spf13/cobra"
)

const defaultMCPServer = "layerflow"

// newMcpCmd creates the `lf mcp` command group.
func newMcpCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "mcp",
		Short: "Manage MCP servers (LayerFlow spend tools for Claude Code / Cursor)",
		Long: `Manage MCP server connections.

The hosted LayerFlow MCP server exposes spend tools (layerflow_get_budget,
layerflow_set_monthly_budget, layerflow_get_spend_summary, layerflow_list_projects)
so an agent can read this month's spend and raise the monthly budget cap:

  lf mcp layerflow --api-key=<lf_live_...>     register the LayerFlow MCP server
  lf mcp list                                  list registered servers
  lf mcp call layerflow layerflow_get_budget   invoke a tool
  lf mcp health layerflow                      check reachability`,
	}

	layerflowCmd := &cobra.Command{
		Use:   "layerflow",
		Short: "Register or refresh the hosted LayerFlow MCP server",
		RunE: func(cmd *cobra.Command, args []string) error {
			apiKey, _ := cmd.Flags().GetString("api-key")
			url, _ := cmd.Flags().GetString("url")
			return registerLayerflow(apiKey, url)
		},
	}
	layerflowCmd.Flags().String("api-key", "", "LayerFlow workspace API key (lf_live_...)")
	layerflowCmd.Flags().String("url", "", "MCP server URL (default: <api-url>/api/mcp or https://api.layerflow.dev/api/mcp)")

	cmd.AddCommand(
		layerflowCmd,
		&cobra.Command{
			Use:   "list",
			Short: "List registered MCP servers",
			RunE:  runMcpList,
		},
		&cobra.Command{
			Use:   "call <server> <tool> [json-args]",
			Short: "Invoke a tool on a registered server",
			Args:  cobra.RangeArgs(2, 3),
			RunE:  runMcpCall,
		},
		&cobra.Command{
			Use:   "health [server]",
			Short: "Check server reachability (all servers when unnamed)",
			Args:  cobra.MaximumNArgs(1),
			RunE:  runMcpHealth,
		},
		&cobra.Command{
			Use:   "remove <name>",
			Short: "Remove a registered MCP server",
			Args:  cobra.ExactArgs(1),
			RunE:  runMcpRemove,
		},
	)

	return cmd
}

// registerLayerflow stores (or refreshes) the hosted LayerFlow MCP server in
// the user config, keyed by the workspace API key.
func registerLayerflow(apiKey, url string) error {
	cfg, err := config.Load("")
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}

	apiKey = strings.TrimSpace(apiKey)
	if apiKey == "" {
		apiKey = strings.TrimSpace(cfg.APIKey)
	}
	if apiKey == "" {
		return errors.New("no API key: pass --api-key or configure one via `lf config api-key`")
	}
	if !strings.HasPrefix(apiKey, "lf_live_") {
		return errors.New("expected a LayerFlow API key (lf_live_…)")
	}

	mcpURL := strings.TrimSpace(url)
	if mcpURL == "" {
		base := strings.TrimSuffix(strings.TrimSpace(cfg.APIURL), "/")
		base = strings.TrimSuffix(base, "/v1")
		if base == "" {
			base = "https://api.layerflow.dev"
		}
		mcpURL = base + "/api/mcp"
	}

	if cfg.MCPServers == nil {
		cfg.MCPServers = map[string]config.MCPServerConfig{}
	}
	cfg.MCPServers[defaultMCPServer] = config.MCPServerConfig{
		URL:     mcpURL,
		Headers: map[string]string{"Authorization": "Bearer " + apiKey},
	}
	if err := cfg.Save(); err != nil {
		return fmt.Errorf("save config: %w", err)
	}

	fmt.Printf("  layerflow MCP server registered: %s\n", mcpURL)
	fmt.Println("  Wire it into Claude Code (~/.claude.json mcpServers) or Cursor as an HTTP MCP server")
	fmt.Println("  using the same URL and Authorization: Bearer <key> header.")
	fmt.Println("  Verify: lf mcp health layerflow && lf mcp call layerflow layerflow_get_budget")
	return nil
}

// registryFromConfig rebuilds an in-memory MCP registry from the stored servers
// so the subcommands work without syncing anything.
func registryFromConfig(cfg *config.Config) *mcp.Registry {
	reg := mcp.NewRegistry()
	for name, sc := range cfg.MCPServers {
		server := &mcp.Server{Name: name, Headers: sc.Headers}
		switch {
		case sc.URL != "":
			server.Kind = "http"
			server.Ref = sc.URL
		case sc.Command != "":
			server.Kind = "stdio"
			server.Ref = sc.Command
		default:
			continue
		}
		_ = reg.Add(context.Background(), server)
	}
	return reg
}

func runMcpList(cmd *cobra.Command, args []string) error {
	cfg, err := config.Load("")
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}

	servers, err := registryFromConfig(cfg).List(context.Background())
	if err != nil {
		return err
	}
	if len(servers) == 0 {
		fmt.Println("  (no MCP servers configured)")
		fmt.Println("  `lf mcp layerflow --api-key=<lf_live_...>` registers the LayerFlow spend server.")
		return nil
	}

	sort.Slice(servers, func(i, j int) bool { return servers[i].Name < servers[j].Name })
	for _, s := range servers {
		fmt.Printf("  %-16s %-5s %s\n", s.Name, s.Kind, s.Ref)
	}
	return nil
}

func runMcpCall(cmd *cobra.Command, args []string) error {
	cfg, err := config.Load("")
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}

	rawArgs := "{}"
	if len(args) == 3 {
		rawArgs = args[2]
	}
	var toolArgs any
	if err := json.Unmarshal([]byte(rawArgs), &toolArgs); err != nil {
		return fmt.Errorf("json-args must be valid JSON: %w", err)
	}

	res, err := registryFromConfig(cfg).Call(context.Background(), args[0], args[1], toolArgs)
	if err != nil {
		return err
	}
	if res.Error != "" {
		return errors.New(res.Error)
	}

	data, _ := json.Marshal(res.Content)
	var r struct {
		Content []struct {
			Type string `json:"type"`
			Text string `json:"text"`
		} `json:"content"`
		IsError bool `json:"isError"`
	}
	_ = json.Unmarshal(data, &r)

	var out strings.Builder
	for _, part := range r.Content {
		out.WriteString(part.Text)
		out.WriteString("\n")
	}
	if r.IsError {
		return errors.New(strings.TrimSpace(out.String()))
	}
	fmt.Print(out.String())
	return nil
}

func runMcpHealth(cmd *cobra.Command, args []string) error {
	cfg, err := config.Load("")
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}

	reg := registryFromConfig(cfg)
	names := args
	if len(names) == 0 {
		servers, _ := reg.List(context.Background())
		for _, s := range servers {
			names = append(names, s.Name)
		}
	}
	if len(names) == 0 {
		fmt.Println("  (no MCP servers configured)")
		return nil
	}

	unhealthy := false
	for _, name := range names {
		h, err := reg.Health(context.Background(), name)
		if err != nil || h.Status != "ok" {
			unhealthy = true
			reason := ""
			if err != nil {
				reason = err.Error()
			}
			fmt.Printf("  %-16s error %s\n", name, reason)
			continue
		}
		fmt.Printf("  %-16s ok (%dms)\n", name, h.Latency)
	}
	if unhealthy {
		return errors.New("one or more MCP servers are unhealthy")
	}
	return nil
}

func runMcpRemove(cmd *cobra.Command, args []string) error {
	if err := config.RemoveMCPServer(args[0]); err != nil {
		if os.IsNotExist(err) {
			fmt.Printf("  MCP server %s not configured\n", args[0])
			return nil
		}
		return err
	}
	fmt.Printf("  Removed MCP server %s\n", args[0])
	return nil
}