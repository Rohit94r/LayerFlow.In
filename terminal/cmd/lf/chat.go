package main

import (
	"bufio"
	"context"
	"database/sql"
	"errors"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/layerflow/terminal/internal/cloud"
	"github.com/layerflow/terminal/internal/config"
	"github.com/layerflow/terminal/internal/session"
	"github.com/layerflow/terminal/internal/storage"
	"github.com/layerflow/terminal/internal/sync"
	toolsPkg "github.com/layerflow/terminal/internal/tools"
)

// runNonInteractive streams a single completion for the given query.
func runNonInteractive(query, model, provider string) error {
	if strings.TrimSpace(query) == "" {
		return errors.New("non-interactive chat needs a query: lf chat -n \"your message\"")
	}
	return runChat(chatOptions{query: query, model: model, provider: provider})
}

// runInteractive starts a REPL that persists a session locally.
func runInteractive(query, model, provider, sessionID string) error {
	return runChat(chatOptions{
		query:       query,
		model:       model,
		provider:    provider,
		sessionID:   sessionID,
		interactive: true,
	})
}

// runTask streams a single-shot task agent completion.
func runTask(task string, maxSteps int, model, provider string) error {
	if strings.TrimSpace(task) == "" {
		return errors.New("run requires a task")
	}

	cfg, err := config.Load("")
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}
	key, err := cloud.ResolveAPIKey(cfg)
	if err != nil {
		return err
	}
	client := cloud.NewClient(cloud.ResolveBaseURL(cfg), key)
	m := resolveChatModel(cfg, model)

	ctx := context.Background()
	if picked := cloud.PickAvailableModel(ctx, client, m); picked != m {
		fmt.Fprintf(os.Stderr, "  (model %q unavailable here — using %q)\n", m, picked)
		m = picked
	}

	db, err := storage.Open(&storage.Options{})
	if err != nil {
		return fmt.Errorf("open storage: %w", err)
	}
	defer storage.Close()

	store := session.NewSQLStore(db)
	dir, err := os.Getwd()
	if err != nil {
		return err
	}

	sess := &session.Session{
		Title:       shorten("run: "+task, 60),
		ProjectPath: dir,
		Model:       m,
	}
	if err := store.Create(ctx, sess); err != nil {
		return fmt.Errorf("create session: %w", err)
	}

	runner := &chatRunner{db: db, store: store, client: client, model: m, cwd: dir, policy: toolsPkg.PolicyFromConfig(cfg.Permissions)}

	fmt.Printf("Running task with %s (max %d steps, single-shot)\n", m, maxSteps)

	if err := store.AddMessage(ctx, &session.Message{
		SessionID: sess.ID,
		Role:      "system",
		Content:   taskAgentSystemPrompt,
	}); err != nil {
		return fmt.Errorf("save system prompt: %w", err)
	}

	return runner.exchange(ctx, sess, task)
}

const taskAgentSystemPrompt = `You are an autonomous task agent running inside the LayerFlow terminal (lf).
Complete the task described by the user as completely and correctly as possible.
Work step by step. If the task involves code, produce complete, correct, ready-to-run
code. You cannot run tools in this mode, so reason carefully and deliver the final
result directly in your reply.`

type chatOptions struct {
	query       string
	model       string
	provider    string
	sessionID   string
	interactive bool
}

// chatRunner streams completions through the LayerFlow gateway and persists
// exchanges to the local session store.
type chatRunner struct {
	db     *sql.DB
	store  *session.SQLStore
	client *cloud.Client
	model  string
	cwd    string

	// ToolsEnabled turns on function calling + local tool execution for the
	// interactive agent loop.
	ToolsEnabled bool
	// policy holds the per-tool approval policy resolved from config.
	policy toolsPkg.PolicyMap
	// interactive enables stdin prompting for permission decisions.
	interactive bool
}

func runChat(opts chatOptions) error {
	cfg, err := config.Load("")
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}
	key, err := cloud.ResolveAPIKey(cfg)
	if err != nil {
		return err
	}
	client := cloud.NewClient(cloud.ResolveBaseURL(cfg), key)
	model := resolveChatModel(cfg, opts.model)

	// Make sure the configured model is usable on this workspace; otherwise
	// auto-pick the first available gateway model so chat works out of the box.
	ctx := context.Background()
	if picked := cloud.PickAvailableModel(ctx, client, model); picked != model {
		fmt.Fprintf(os.Stderr, "  (model %q unavailable here — using %q)\n", model, picked)
		model = picked
	}

	db, err := storage.Open(&storage.Options{})
	if err != nil {
		return fmt.Errorf("open storage: %w", err)
	}
	defer storage.Close()

	store := session.NewSQLStore(db)
	dir, err := os.Getwd()
	if err != nil {
		return err
	}

	var sess *session.Session
	if opts.sessionID != "" {
		sess, err = store.Get(ctx, opts.sessionID)
		if err != nil {
			return fmt.Errorf("open session: %w", err)
		}
	} else {
		sess = &session.Session{
			Title:       "lf chat",
			ProjectPath: dir,
			Model:       model,
			Provider:    strings.TrimSpace(opts.provider),
		}
		if err := store.Create(ctx, sess); err != nil {
			return fmt.Errorf("create session: %w", err)
		}
	}

	runner := &chatRunner{db: db, store: store, client: client, model: model, cwd: dir, ToolsEnabled: true, policy: toolsPkg.PolicyFromConfig(cfg.Permissions), interactive: opts.interactive}

	if q := strings.TrimSpace(opts.query); q != "" {
		if sess.Title == "" || sess.Title == "lf chat" {
			sess.Title = shorten(q, 60)
			_ = store.Update(ctx, sess)
		}
		if err := runner.exchange(ctx, sess, q); err != nil {
			return err
		}
		if !opts.interactive {
			return nil
		}
	}

	if !opts.interactive {
		return nil
	}
	return runner.repl(ctx, sess)
}

// exchange sends one user message, runs the agent loop (streams the assistant
// reply, executes any requested tools locally, then continues until the model
// answers), and persists both sides of the conversation.
func (r *chatRunner) exchange(ctx context.Context, sess *session.Session, text string) error {
	userMsg := &session.Message{SessionID: sess.ID, Role: "user", Content: text, Model: r.model}
	if err := r.store.AddMessage(ctx, userMsg); err != nil {
		return fmt.Errorf("save user message: %w", err)
	}
	if err := r.enqueue(ctx, sess.ID, "message", userMsg.ID, userMsg); err != nil {
		fmt.Fprintf(os.Stderr, "  (journal skipped: %v)\n", err)
	}

	history, err := r.store.GetMessages(ctx, sess.ID, 100)
	if err != nil {
		return err
	}
	prompt := make([]cloud.Message, 0, len(history))
	for _, m := range history {
		if m.Role == "function" {
			continue
		}
		msg := cloud.Message{Role: m.Role, Content: m.Content}
		if m.Role == "assistant" && len(m.ToolCalls) > 0 {
			msg.ToolCalls = m.ToolCalls
		}
		if m.Role == "tool" {
			msg.ToolCallID = m.ToolCallID
		}
		prompt = append(prompt, msg)
	}

	var tools []cloud.Tool
	if r.ToolsEnabled {
		for _, spec := range toolsPkg.DescribeAll() {
			tools = append(tools, cloud.NewFunctionTool(spec.Name, spec.Description, spec.Parameters))
		}
	}

	// Agent loop: keep streaming until the model either stops (final answer) or
	// returns no tool calls. Each tool round appends assistant tool_calls + tool
	// results to the transcript and re-asks.
	approve := func(spec toolsPkg.Spec, plan *toolsPkg.Plan) (bool, error) {
		if !r.interactive {
			return true, nil
		}
		fmt.Printf("\n  ⚙ %s — %s [y/N] ", spec.Name, plan.Description)
		reader := bufio.NewReader(os.Stdin)
		line, _ := reader.ReadString('\n')
		line = strings.ToLower(strings.TrimSpace(line))
		return line == "y" || line == "yes", nil
	}
	approver := r.policy.ApprovalFunc(approve)

	maxToolRounds := 12
	for round := 0; round < maxToolRounds; round++ {
		fmt.Print("\n")
		var out strings.Builder
		resp, err := r.client.ChatStreamFull(ctx, cloud.ChatOptions{
			Model:    r.model,
			Messages: prompt,
			Tools:    tools,
		}, cloud.StreamHandlers{
			OnDelta: func(d string) {
				out.WriteString(d)
				fmt.Print(d)
			},
		})
		fmt.Print("\n")
		if err != nil {
			return err
		}

		var toolCalls []cloud.ToolCall
		if resp != nil && len(resp.Choices) > 0 {
			toolCalls = resp.Choices[0].Message.ToolCalls
		}
		reply := out.String()

		if len(toolCalls) == 0 {
			if reply == "" && resp != nil && len(resp.Choices) > 0 {
				reply = resp.Choices[0].Message.Content
			}

			assistant := &session.Message{
				SessionID:    sess.ID,
				Role:         "assistant",
				Content:      reply,
				Model:        r.model,
				InputTokens:  resp.Usage.PromptTokens,
				OutputTokens: resp.Usage.CompletionTokens,
			}
			if resp.Model != "" {
				assistant.Model = resp.Model
			}
			if err := r.store.AddMessage(ctx, assistant); err != nil {
				return fmt.Errorf("save assistant message: %w", err)
			}
			if err := r.enqueue(ctx, sess.ID, "message", assistant.ID, assistant); err != nil {
				fmt.Fprintf(os.Stderr, "  (journal skipped: %v)\n", err)
			}
			sess.InputTokens += resp.Usage.PromptTokens
			sess.OutputTokens += resp.Usage.CompletionTokens
			if err := r.store.Update(ctx, sess); err != nil {
				return fmt.Errorf("update session: %w", err)
			}
			if err := r.enqueue(ctx, sess.ID, "session", sess.ID, sess); err != nil {
				fmt.Fprintf(os.Stderr, "  (journal skipped: %v)\n", err)
			}
			if err := r.syncAfter(ctx); err != nil {
				fmt.Fprintf(os.Stderr, "  (sync skipped: %v)\n", err)
			}
			if resp.Usage.TotalTokens > 0 {
				fmt.Printf("\n  [%s · %d in / %d out tokens · saved to session %s]\n",
					resp.Model, resp.Usage.PromptTokens, resp.Usage.CompletionTokens, sess.ID)
			}
			return nil
		}

		// Persist the assistant's tool-call turn, run each tool locally, and
		// append the results to the prompt for the next round.
		assistant := &session.Message{
			SessionID: sess.ID,
			Role:      "assistant",
			Content:   reply,
			Model:     r.model,
			ToolCalls: toolCalls,
		}
		if resp.Model != "" {
			assistant.Model = resp.Model
		}
		if err := r.store.AddMessage(ctx, assistant); err != nil {
			return fmt.Errorf("save tool-call message: %w", err)
		}
		_ = r.enqueue(ctx, sess.ID, "message", assistant.ID, assistant)

		prompt = append(prompt, cloud.Message{Role: "assistant", Content: reply, ToolCalls: toolCalls})

		for _, tc := range toolCalls {
			fmt.Fprintf(os.Stderr, "\n  ⚙ %s\n", tc.Function.Name)
			result, err := toolsPkg.ExecuteCall(ctx, tc.Function.Name, tc.Function.Arguments, r.cwd, approver)
			if err != nil {
				result = "error: " + err.Error()
			}
			toolMsg := &session.Message{
				SessionID:  sess.ID,
				Role:       "tool",
				Content:    result,
				ToolCallID: tc.ID,
			}
			if err := r.store.AddMessage(ctx, toolMsg); err != nil {
				return fmt.Errorf("save tool result: %w", err)
			}
			_ = r.enqueue(ctx, sess.ID, "message", toolMsg.ID, toolMsg)
			prompt = append(prompt, cloud.Message{Role: "tool", Content: result, ToolCallID: tc.ID})
		}
	}

	return fmt.Errorf("tool loop exceeded %d rounds", maxToolRounds)
}

// repl runs the interactive chat loop.
func (r *chatRunner) repl(ctx context.Context, sess *session.Session) error {
	fmt.Printf("  lf chat · model %s · session %s\n", r.model, sess.ID)
	fmt.Println("  type /help for commands · /exit to quit")

	scanner := bufio.NewScanner(os.Stdin)
	for {
		fmt.Print("\n> ")
		if !scanner.Scan() {
			break
		}
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}
		if strings.HasPrefix(line, "/") {
			cont, err := r.handleCommand(ctx, sess, line)
			if err != nil {
				return err
			}
			if !cont {
				break
			}
			continue
		}
		if err := r.exchange(ctx, sess, line); err != nil {
			fmt.Fprintf(os.Stderr, "error: %v\n", err)
		}
	}
	fmt.Println()
	return nil
}

func (r *chatRunner) handleCommand(ctx context.Context, sess *session.Session, line string) (bool, error) {
	parts := strings.Fields(line)
	cmd := strings.ToLower(parts[0])

	switch cmd {
	case "/exit", "/quit":
		return false, nil

	case "/help":
		fmt.Println("  /exit        quit")
		fmt.Println("  /new         start a fresh session")
		fmt.Println("  /model <id>  switch model (e.g. /model gpt-4o-mini)")
		fmt.Println("  /models      list gateway models and availability")
		fmt.Println("  /permissions view/set tool approval policy")
		fmt.Println("  /clear       reset the conversation context")
		return true, nil

	case "/new":
		dir, _ := os.Getwd()
		sess = &session.Session{Title: "lf chat", ProjectPath: dir, Model: r.model}
		if err := r.store.Create(ctx, sess); err != nil {
			return false, fmt.Errorf("create session: %w", err)
		}
		fmt.Printf("  New session %s\n", sess.ID)
		return true, nil

	case "/model":
		if len(parts) < 2 {
			fmt.Printf("  Current model: %s\n", r.model)
			return true, nil
		}
		r.model = parts[1]
		sess.Model = parts[1]
		_ = r.store.Update(ctx, sess)
		fmt.Printf("  Model set to %s\n", r.model)
		return true, nil

	case "/models":
		models, err := r.client.ListModels(ctx)
		if err != nil {
			return false, err
		}
		for _, m := range models {
			avail := "unavailable"
			if m.Available {
				avail = "available"
			}
			fmt.Printf("  %-28s %s\n", m.ID, avail)
		}
		return true, nil

	case "/clear":
		before := time.Now().UnixMilli()
		n, err := r.store.HideMessages(ctx, sess.ID, before)
		if err != nil {
			return false, err
		}
		fmt.Printf("  Cleared %d message(s) — context reset\n", n)
		return true, nil

	case "/permissions", "/perms", "/perm":
		return true, r.permissionsCmd(ctx, parts)

	default:
		fmt.Printf("  Unknown command %q — try /help\n", cmd)
		return true, nil
	}
}

// enqueue appends a durable sync operation for a persisted local write so it
// will be pushed to the cloud on the next sync. Never fatal to chat.
func (r *chatRunner) enqueue(ctx context.Context, sessionID, entity, entityID string, payload any) error {
	journal := sync.NewSQLJournal(r.db)
	deviceID, err := sync.GetDeviceID(ctx, r.db)
	if err != nil {
		return err
	}
	tick, err := sync.GetWatermark(ctx, r.db)
	if err != nil {
		tick = 0
	}
	return journal.Append(ctx, sync.Operation{
		OpID:     entity + "-" + entityID,
		Entity:   entity,
		EntityID: entityID,
		Payload:  payload,
		DeviceID: deviceID,
		OpTick:   tick + 1,
		State:    sync.StateQueued,
	})
}

// syncAfter pushes any pending local operations to the cloud. Silent no-op
// when no API key is configured; never fatal to chat.
func (r *chatRunner) syncAfter(ctx context.Context) error {
	cfg, err := config.Load("")
	if err != nil {
		return err
	}
	key, err := cloud.ResolveAPIKey(cfg)
	if err != nil {
		return nil
	}

	client := sync.NewHTTPClientWithKey(cloud.ResolveBaseURL(cfg), key)
	journal := sync.NewSQLJournal(r.db)

	deviceID, err := sync.GetDeviceID(ctx, r.db)
	if err != nil {
		return err
	}
	ops, err := journal.Pending(ctx)
	if err != nil {
		return err
	}
	if len(ops) == 0 {
		return nil
	}
	for i := range ops {
		ops[i].DeviceID = deviceID
	}

	res, err := client.Push(ctx, ops)
	if err != nil {
		return err
	}
	for _, id := range res.Accepted {
		_ = journal.MarkAcked(ctx, id)
	}
	for _, rej := range res.Rejected {
		_ = journal.MarkFailed(ctx, rej.OpID, rej.Reason)
	}
	if res.ServerWatermark > 0 {
		cur, _ := sync.GetWatermark(ctx, r.db)
		if res.ServerWatermark > cur {
			_ = sync.SetWatermark(ctx, r.db, res.ServerWatermark)
		}
	}
	return nil
}

// permissionsCmd lists and edits the per-tool approval policy. Forms:
//
//	/permissions                      list all tools + their policy
//	/permissions <tool> <policy>      set a policy (allow|ask|deny|default)
//	/permissions reset                restore risk-based defaults
func (r *chatRunner) permissionsCmd(ctx context.Context, parts []string) error {
	// List-only form.
	if len(parts) < 2 {
		fmt.Println("  Permissions — per-tool approval policy")
		fmt.Println("  ───────────────────────────────────────")
		for _, l := range toolsPkg.Describe(r.policy) {
			fmt.Printf("  %-16s %-9s %-11s %s\n", l.Name, l.Risk, "["+l.Policy+"]", l.Scope)
		}
		fmt.Println()
		fmt.Println("  Usage: /permissions <tool> <allow|ask|deny|default>   or   /permissions reset")
		return nil
	}

	// Reset form.
	if parts[1] == "reset" {
		cfg, err := config.Load("")
		if err != nil {
			return err
		}
		clear(cfg.Permissions)
		if err := cfg.Save(); err != nil {
			return err
		}
		r.policy = toolsPkg.PolicyFromConfig(cfg.Permissions)
		fmt.Println("  Permissions reset to risk-based defaults.")
		return nil
	}

	if len(parts) < 3 {
		fmt.Println("  Usage: /permissions <tool> <allow|ask|deny|default>")
		return nil
	}

	name := parts[1]
	policy := toolsPkg.ParsePolicy(parts[2])

	// Validate the tool exists (or allow "all").
	if name != "all" {
		if _, err := toolsPkg.Get(name); err != nil {
			fmt.Printf("  Unknown tool %q. See /permissions for the list.\n", name)
			return nil
		}
	}

	cfg, err := config.Load("")
	if err != nil {
		return err
	}
	if cfg.Permissions == nil {
		cfg.Permissions = map[string]string{}
	}

	if policy == toolsPkg.PolicyDefault {
		delete(cfg.Permissions, name)
	} else {
		cfg.Permissions[name] = policy.String()
	}
	if err := cfg.Save(); err != nil {
		return err
	}

	// Refresh the live policy map and clear any denied grants.
	r.policy = toolsPkg.PolicyFromConfig(cfg.Permissions)
	if name == "all" {
		fmt.Printf("  Saved global policy %q for all tools.\n", policy)
	} else {
		fmt.Printf("  Saved policy %q for %s.\n", policy, name)
	}
	return nil
}

// resolveChatModel picks the effective model from a --model flag, config, or default.
func resolveChatModel(cfg *config.Config, flag string) string {
	if m := strings.TrimSpace(flag); m != "" {
		return m
	}
	if cfg != nil {
		if m := strings.TrimSpace(cfg.Model); m != "" {
			return m
		}
	}
	return cloud.DefaultModel
}

func shorten(s string, n int) string {
	s = strings.Join(strings.Fields(s), " ")
	if n < 1 {
		return "…"
	}
	// Rune-safe truncation so multi-byte UTF-8 (CJK, emoji) never gets split.
	runes := []rune(s)
	if len(runes) <= n {
		return s
	}
	if n <= 3 {
		return string(runes[:n])
	}
	return strings.TrimSpace(string(runes[:n-1])) + "…"
}
