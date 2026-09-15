// Package backend connects the ported opencode UI layer to the LayerFlow
// real backend (SQLite sessions, streaming gateway, cloud models).
package backend

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	tea "github.com/charmbracelet/bubbletea"

	"github.com/layerflow/terminal/internal/cloud"
	"github.com/layerflow/terminal/internal/session"

	uiagent "github.com/layerflow/terminal/internal/ui/agent"
	uiapp "github.com/layerflow/terminal/internal/ui/app"
	uiconfig "github.com/layerflow/terminal/internal/ui/config"
	uihist "github.com/layerflow/terminal/internal/ui/history"
	"github.com/layerflow/terminal/internal/ui/logging"
	uilsp "github.com/layerflow/terminal/internal/ui/lsp"
	uimsg "github.com/layerflow/terminal/internal/ui/message"
	uimodels "github.com/layerflow/terminal/internal/ui/models"
	"github.com/layerflow/terminal/internal/ui/permission"
	uipub "github.com/layerflow/terminal/internal/ui/pubsub"
	uisess "github.com/layerflow/terminal/internal/ui/session"
)

// NewApp builds an *app.App wired to the LayerFlow backend.
func NewApp(st *State) *uiapp.App {
	// Register gateway models so the model dialog has a populated provider
	// list and never dereferences an unknown/empty provider.
	registerGatewayModels(st)

	cfg := &uiconfig.Config{
		WorkingDir: st.Project,
		Agents: map[uiconfig.AgentName]uiconfig.Agent{
			uiconfig.AgentCoder: {Model: uimodels.ModelID(st.Model)},
		},
		Providers: map[uimodels.ModelProvider]uiconfig.Provider{
			uimodels.ProviderLayerFlow: {},
		},
		AutoCompact: true,
		TUI:         uiconfig.TUIConfig{},
	}
	uiconfig.Set(cfg)

	sessA := &sessionAdapter{store: st.Sessions, project: st.Project, broker: uipub.NewBroker[uisess.Session]()}
	msgA := &messageAdapter{store: st.Sessions, broker: uipub.NewBroker[uimsg.Message]()}
	perms := permission.NewPermissionService()
	histA := &historyAdapter{project: st.Project, store: st.Sessions}
	lspClients := make(map[string]*uilsp.Client)

	agent := &agentService{
		broker:      uipub.NewBroker[uiagent.AgentEvent](),
		sessions:    sessA,
		messages:    msgA,
		permissions: perms,
		client:      st.Client,
		cfg:         cfg,
		project:     st.Project,
		lspClients:  lspClients,
		prog:        nil, // set after program created
	}

	return &uiapp.App{
		Sessions:    sessA,
		Messages:    msgA,
		History:     histA,
		Permissions: perms,
		CoderAgent:  agent,
		LSPClients:  lspClients,
	}
}

// State is the runtime state passed into the backend.
type State struct {
	Cfg      *uiconfig.Config
	Client   *cloud.Client
	Sessions *session.SQLStore
	Project  string
	Model    string
	Router   *Router
}

// registerGatewayModels populates ui/models.SupportedModels from the gateway
// catalog so the model dialog and KnownModel lookups never hit an unknown ID.
// Offline, it falls back to registering the default model only.
func registerGatewayModels(st *State) {
	defaultID := uimodels.ModelID(cloud.DefaultModel)
	if st.Model != "" {
		defaultID = uimodels.ModelID(st.Model)
	}

	registered := map[uimodels.ModelID]uimodels.Model{
		defaultID: {
			ID:                  defaultID,
			Name:                prettifyModelID(defaultID),
			Provider:            uimodels.ProviderLayerFlow,
			APIModel:            string(defaultID),
			ContextWindow:       128000,
			DefaultMaxTokens:    4096,
			SupportsAttachments: true,
		},
	}

	if st.Client != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		models, err := st.Client.ListModels(ctx)
		cancel()
		if err == nil {
			for _, m := range models {
				id := uimodels.ModelID(m.ID)
				registered[id] = uimodels.Model{
					ID:                  id,
					Name:                prettifyModelID(id),
					Provider:            uimodels.ProviderLayerFlow,
					APIModel:            string(id),
					ContextWindow:       128000,
					DefaultMaxTokens:    4096,
					SupportsAttachments: true,
				}
			}
		}
	}

	uimodels.RegisterModels(registered)
}

func prettifyModelID(id uimodels.ModelID) string {
	words := strings.Fields(strings.ReplaceAll(strings.ReplaceAll(string(id), "-", " "), "_", " "))
	for i, w := range words {
		if w == "" {
			continue
		}
		words[i] = strings.ToUpper(w[:1]) + w[1:]
	}
	return strings.Join(words, " ")
}

// Router is a thin shim used for the model override.
type Router struct {
	mu    sync.RWMutex
	model string
}

func (r *Router) SetOverride(_, model string) {
	r.mu.Lock()
	r.model = model
	r.mu.Unlock()
}
func (r *Router) Model() string {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.model
}

// ─── session adapter ───────────────────────────────────────────────────────────

type sessionAdapter struct {
	store   *session.SQLStore
	project string
	broker  *uipub.Broker[uisess.Session]
}

func (a *sessionAdapter) Subscribe(ctx context.Context) <-chan uipub.Event[uisess.Session] {
	return a.broker.Subscribe(ctx)
}

func (a *sessionAdapter) Create(ctx context.Context, title string) (uisess.Session, error) {
	lf := &session.Session{Title: title, ProjectPath: a.project}
	if err := a.store.Create(ctx, lf); err != nil {
		return uisess.Session{}, err
	}
	out := toUISession(lf)
	a.broker.Publish(uipub.CreatedEvent, out)
	return out, nil
}

func (a *sessionAdapter) CreateTitleSession(ctx context.Context, parentSessionID string) (uisess.Session, error) {
	id := "title-" + parentSessionID
	lf := &session.Session{ID: id, Title: "Generate a title", ProjectPath: a.project}
	if p, err := a.store.Get(ctx, parentSessionID); err == nil && p != nil {
		lf.ParentID = &parentSessionID
	}
	if err := a.store.Create(ctx, lf); err != nil {
		return uisess.Session{}, err
	}
	out := toUISession(lf)
	a.broker.Publish(uipub.CreatedEvent, out)
	return out, nil
}

func (a *sessionAdapter) CreateTaskSession(ctx context.Context, toolCallID, parentSessionID, title string) (uisess.Session, error) {
	lf := &session.Session{ID: toolCallID, Title: title, ProjectPath: a.project}
	if p, err := a.store.Get(ctx, parentSessionID); err == nil && p != nil {
		lf.ParentID = &parentSessionID
	}
	if err := a.store.Create(ctx, lf); err != nil {
		return uisess.Session{}, err
	}
	out := toUISession(lf)
	a.broker.Publish(uipub.CreatedEvent, out)
	return out, nil
}

func (a *sessionAdapter) Get(ctx context.Context, id string) (uisess.Session, error) {
	lf, err := a.store.Get(ctx, id)
	if err != nil {
		return uisess.Session{}, err
	}
	return toUISession(lf), nil
}

func (a *sessionAdapter) List(ctx context.Context) ([]uisess.Session, error) {
	lfSess, err := a.store.List(ctx, a.project, 1000)
	if err != nil {
		return nil, err
	}
	out := make([]uisess.Session, len(lfSess))
	for i := range lfSess {
		out[i] = toUISession(&lfSess[i])
	}
	return out, nil
}

func (a *sessionAdapter) Save(ctx context.Context, s uisess.Session) (uisess.Session, error) {
	lf := &session.Session{
		ID:           s.ID,
		Title:        s.Title,
		ProjectPath:  a.project,
		InputTokens:  int(s.PromptTokens),
		OutputTokens: int(s.CompletionTokens),
		CostMicro:    int64(s.Cost * 1e6),
		UpdatedAt:    time.Now().UnixMilli(),
	}
	if err := a.store.Update(ctx, lf); err != nil {
		return uisess.Session{}, err
	}
	out := toUISession(lf)
	a.broker.Publish(uipub.UpdatedEvent, out)
	return out, nil
}

func (a *sessionAdapter) Delete(ctx context.Context, id string) error {
	return a.store.Delete(ctx, id)
}

func toUISession(s *session.Session) uisess.Session {
	var parentID string
	if s.ParentID != nil {
		parentID = *s.ParentID
	}
	return uisess.Session{
		ID:               s.ID,
		ParentSessionID:  parentID,
		Title:            s.Title,
		PromptTokens:     int64(s.InputTokens),
		CompletionTokens: int64(s.OutputTokens),
		SummaryMessageID: "",
		Cost:             float64(s.CostMicro) / 1e6,
		CreatedAt:        s.CreatedAt,
		UpdatedAt:        s.UpdatedAt,
	}
}

// ─── message adapter ──────────────────────────────────────────────────────────

type messageAdapter struct {
	store  *session.SQLStore
	broker *uipub.Broker[uimsg.Message]
}

func (a *messageAdapter) Subscribe(ctx context.Context) <-chan uipub.Event[uimsg.Message] {
	return a.broker.Subscribe(ctx)
}

func (a *messageAdapter) Create(ctx context.Context, sessionID string, params uimsg.CreateMessageParams) (uimsg.Message, error) {
	parts := params.Parts
	if params.Role != uimsg.Assistant {
		parts = append(parts, uimsg.Finish{Reason: uimsg.FinishReasonEndTurn, Time: time.Now().UnixMilli() / 1000})
	}
	partsJSON, err := uimsg.MarshallParts(parts)
	if err != nil {
		return uimsg.Message{}, err
	}
	var tc []cloud.ToolCall
	for _, p := range parts {
		if t, ok := p.(uimsg.ToolCall); ok {
			tc = append(tc, cloud.ToolCall{ID: t.ID, Type: "function", Function: struct {
				Name      string `json:"name"`
				Arguments string `json:"arguments"`
			}{Name: t.Name, Arguments: t.Input}})
		}
	}
	var toolCallID string
	for _, p := range parts {
		if t, ok := p.(uimsg.ToolResult); ok {
			toolCallID = t.ToolCallID
		}
	}
	lf := &session.Message{
		ID:           newID(),
		SessionID:    sessionID,
		Role:         string(params.Role),
		Content:      string(partsJSON),
		Model:        string(params.Model),
		ToolCalls:    tc,
		ToolCallID:   toolCallID,
		InputTokens:  0,
		OutputTokens: 0,
	}
	if err := a.store.AddMessage(ctx, lf); err != nil {
		return uimsg.Message{}, err
	}
	out := toUIMessage(lf)
	a.broker.Publish(uipub.CreatedEvent, out)
	return out, nil
}

func (a *messageAdapter) Update(ctx context.Context, msg uimsg.Message) error {
	partsJSON, err := uimsg.MarshallParts(msg.Parts)
	if err != nil {
		return err
	}
	var tc []cloud.ToolCall
	for _, p := range msg.Parts {
		if t, ok := p.(uimsg.ToolCall); ok {
			tc = append(tc, cloud.ToolCall{ID: t.ID, Type: "function", Function: struct {
				Name      string `json:"name"`
				Arguments string `json:"arguments"`
			}{Name: t.Name, Arguments: t.Input}})
		}
	}
	lf := &session.Message{
		ID:        msg.ID,
		SessionID: msg.SessionID,
		Role:      string(msg.Role),
		Content:   string(partsJSON),
		Model:     string(msg.Model),
		ToolCalls: tc,
	}
	now := time.Now().UnixMilli()
	lf.EditedAt = &now
	if err := a.store.UpdateMessage(ctx, lf); err != nil {
		return err
	}
	a.broker.Publish(uipub.UpdatedEvent, msg)
	return nil
}

func (a *messageAdapter) Get(ctx context.Context, id string) (uimsg.Message, error) {
	// The store has no GetMessage-by-ID; search via messages list.
	// Messages are fetched by sessionID. Without sessionID we can't efficiently
	// look up a single message. For the cases the TUI actually uses Get,
	// return not-found and let the UI handle it.
	return uimsg.Message{}, fmt.Errorf("message not found: %s", id)
}

func (a *messageAdapter) List(ctx context.Context, sessionID string) ([]uimsg.Message, error) {
	lfMsgs, err := a.store.GetMessages(ctx, sessionID, 0)
	if err != nil {
		return nil, err
	}
	out := make([]uimsg.Message, len(lfMsgs))
	for i := range lfMsgs {
		out[i] = toUIMessage(&lfMsgs[i])
	}
	return out, nil
}

func (a *messageAdapter) Delete(ctx context.Context, id string) error {
	return nil // not needed for core flow
}

func (a *messageAdapter) DeleteSessionMessages(ctx context.Context, sessionID string) error {
	_, err := a.store.HideMessages(ctx, sessionID, time.Now().UnixMilli())
	return err
}

func toUIMessage(m *session.Message) uimsg.Message {
	role := uimsg.MessageRole(m.Role)
	var parts []uimsg.ContentPart
	// Try to unmarshal stored parts JSON
	if json.Valid([]byte(m.Content)) && len(m.Content) > 2 && (m.Content[0] == '[' || m.Content[0] == '{') {
		if parsed, err := uimsg.UnmarshallParts([]byte(m.Content)); err == nil && len(parsed) > 0 {
			parts = parsed
		}
	}
	if len(parts) == 0 {
		parts = []uimsg.ContentPart{uimsg.TextContent{Text: m.Content}}
	}
	for _, tc := range m.ToolCalls {
		parts = append(parts, uimsg.ToolCall{ID: tc.ID, Name: tc.Function.Name, Input: tc.Function.Arguments, Type: tc.Type})
	}
	var updatedAt int64
	if m.EditedAt != nil {
		updatedAt = *m.EditedAt
	}
	return uimsg.Message{
		ID:        m.ID,
		SessionID: m.SessionID,
		Role:      role,
		Parts:     parts,
		Model:     uimodels.ModelID(m.Model),
		CreatedAt: m.CreatedAt,
		UpdatedAt: updatedAt,
	}
}

var idCounter atomic.Int64

func newID() string {
	return strconv.FormatInt(time.Now().UnixNano(), 36) + "-" + strconv.FormatInt(idCounter.Add(1), 16)
}

// ─── history adapter ──────────────────────────────────────────────────────────

type historyAdapter struct {
	project string
	store   *session.SQLStore
	mu      sync.Mutex
	files   map[string][]uihist.File // sessionID → []File
}

func (a *historyAdapter) Subscribe(_ context.Context) <-chan uipub.Event[uihist.File] {
	ch := make(chan uipub.Event[uihist.File])
	return ch
}

func (a *historyAdapter) Create(ctx context.Context, sessionID, path, content string) (uihist.File, error) {
	return a.createVersion(ctx, sessionID, path, content, uihist.InitialVersion)
}

func (a *historyAdapter) CreateVersion(ctx context.Context, sessionID, path, content string) (uihist.File, error) {
	return a.createVersion(ctx, sessionID, path, content, fmt.Sprintf("v%d", time.Now().UnixMilli()))
}

func (a *historyAdapter) createVersion(_ context.Context, sessionID, path, content, version string) (uihist.File, error) {
	a.mu.Lock()
	defer a.mu.Unlock()
	file := uihist.File{
		ID:        newID(),
		SessionID: sessionID,
		Path:      path,
		Content:   content,
		Version:   version,
		CreatedAt: time.Now().UnixMilli(),
	}
	a.files[sessionID] = append(a.files[sessionID], file)
	return file, nil
}

func (a *historyAdapter) Get(_ context.Context, id string) (uihist.File, error) {
	return uihist.File{}, fmt.Errorf("not found: %s", id)
}

func (a *historyAdapter) GetByPathAndSession(_ context.Context, path, sessionID string) (uihist.File, error) {
	a.mu.Lock()
	defer a.mu.Unlock()
	for _, f := range a.files[sessionID] {
		if f.Path == path {
			return f, nil
		}
	}
	return uihist.File{}, fmt.Errorf("not found")
}

func (a *historyAdapter) ListBySession(_ context.Context, sessionID string) ([]uihist.File, error) {
	a.mu.Lock()
	defer a.mu.Unlock()
	return a.files[sessionID], nil
}

func (a *historyAdapter) ListLatestSessionFiles(_ context.Context, sessionID string) ([]uihist.File, error) {
	a.mu.Lock()
	defer a.mu.Unlock()
	latest := make(map[string]uihist.File)
	for _, f := range a.files[sessionID] {
		if existing, ok := latest[f.Path]; !ok || f.CreatedAt > existing.CreatedAt {
			latest[f.Path] = f
		}
	}
	out := make([]uihist.File, 0, len(latest))
	for _, f := range latest {
		out = append(out, f)
	}
	return out, nil
}

func (a *historyAdapter) Update(_ context.Context, f uihist.File) (uihist.File, error) {
	a.mu.Lock()
	defer a.mu.Unlock()
	files := a.files[f.SessionID]
	for i := range files {
		if files[i].ID == f.ID {
			files[i] = f
			a.files[f.SessionID] = files
			return f, nil
		}
	}
	return f, nil
}

func (a *historyAdapter) Delete(_ context.Context, id string) error {
	return nil
}

func (a *historyAdapter) DeleteSessionFiles(_ context.Context, sessionID string) error {
	a.mu.Lock()
	defer a.mu.Unlock()
	delete(a.files, sessionID)
	return nil
}

// ─── agent service ────────────────────────────────────────────────────────────

type agentService struct {
	broker      *uipub.Broker[uiagent.AgentEvent]
	sessions    *sessionAdapter
	messages    *messageAdapter
	permissions permission.Service
	client      *cloud.Client
	cfg         *uiconfig.Config
	project     string
	lspClients  map[string]*uilsp.Client
	prog        *tea.Program

	active sync.Map // sessionID → context.CancelFunc
	busy   atomic.Bool
}

func (a *agentService) Model() uimodels.Model {
	id := uimodels.ModelID(a.cfg.Agents[uiconfig.AgentCoder].Model)
	if id == "" {
		id = uimodels.ModelID(cloud.DefaultModel)
	}
	return uimodels.KnownModel(id)
}

func (a *agentService) Update(name uiconfig.AgentName, modelID uimodels.ModelID) (uimodels.Model, error) {
	ag := a.cfg.Agents[name]
	ag.Model = modelID
	a.cfg.Agents[name] = ag
	return uimodels.KnownModel(modelID), nil
}

func (a *agentService) IsBusy() bool {
	return a.busy.Load()
}

func (a *agentService) IsSessionBusy(sessionID string) bool {
	_, ok := a.active.Load(sessionID)
	return ok
}

func (a *agentService) Cancel(sessionID string) {
	if cancel, ok := a.active.Load(sessionID); ok {
		cancel.(context.CancelFunc)()
		a.active.Delete(sessionID)
	}
}

func (a *agentService) Subscribe(_ context.Context) <-chan uipub.Event[uiagent.AgentEvent] {
	return a.broker.Subscribe(context.Background())
}

func (a *agentService) Summarize(_ context.Context, _ string) error {
	return nil // not supported yet
}

func (a *agentService) Run(ctx context.Context, sessionID, prompt string, attachments ...uimsg.Attachment) (<-chan uiagent.AgentEvent, error) {
	if _, err := a.sessions.Get(ctx, sessionID); err != nil {
		return nil, fmt.Errorf("session not found: %w", err)
	}

	// Create user message in store
	userParts := []uimsg.ContentPart{uimsg.TextContent{Text: prompt}}
	for _, att := range attachments {
		userParts = append(userParts, uimsg.BinaryContent{MIMEType: att.MimeType, Data: att.Content})
	}
	userMsg, err := a.messages.Create(ctx, sessionID, uimsg.CreateMessageParams{
		Role:  uimsg.User,
		Parts: userParts,
		Model: uimodels.ModelID(a.cfg.Agents[uiconfig.AgentCoder].Model),
	})
	if err != nil {
		return nil, fmt.Errorf("create user message: %w", err)
	}
	_ = userMsg

	// Create assistant message placeholder (empty)
	assistantMsg, err := a.messages.Create(ctx, sessionID, uimsg.CreateMessageParams{
		Role:  uimsg.Assistant,
		Parts: []uimsg.ContentPart{},
		Model: uimodels.ModelID(a.cfg.Agents[uiconfig.AgentCoder].Model),
	})
	if err != nil {
		return nil, fmt.Errorf("create assistant message: %w", err)
	}

	a.busy.Store(true)
	runCtx, cancel := context.WithCancel(ctx)
	a.active.Store(sessionID, cancel)

	ch := make(chan uiagent.AgentEvent, 50)
	go func() {
		defer close(ch)
		defer a.active.Delete(sessionID)
		defer a.busy.Store(false)

		a.runLoop(runCtx, sessionID, assistantMsg, ch)
	}()

	return ch, nil
}

func (a *agentService) runLoop(ctx context.Context, sessionID string, assistantMsg uimsg.Message, out chan<- uiagent.AgentEvent) {
	modelID := string(assistantMsg.Model)
	if modelID == "" {
		modelID = cloud.DefaultModel
	}

	const maxRounds = 10
	for round := 0; round < maxRounds; round++ {
		if ctx.Err() != nil {
			a.publishFinish(ctx, sessionID, assistantMsg, uimsg.FinishReasonCanceled, out)
			return
		}

		cloudMessages := a.buildMessages(ctx, sessionID)
		reqCtx, reqCancel := context.WithCancel(ctx)
		done := make(chan struct{})
		var lastResponse *cloud.ChatResponse
		var lastErr error

		a.messages.Update(ctx, assistantMsg) // clear for new delta stream
		assistantMsg.Parts = []uimsg.ContentPart{}
		assistantMsg.AppendContent("")
		a.messages.Update(ctx, assistantMsg)

		go func() {
			defer close(done)
			resp, err := a.client.ChatStreamFull(reqCtx, cloud.ChatOptions{
				Model:    modelID,
				Messages: cloudMessages,
			}, cloud.StreamHandlers{
				OnDelta: func(delta string) {
					assistantMsg.AppendContent(delta)
					a.messages.Update(ctx, assistantMsg)
				},
				OnToolCall: func(tc cloud.ToolCall) {
					assistantMsg.AddToolCall(uimsg.ToolCall{
						ID:    tc.ID,
						Name:  tc.Function.Name,
						Input: tc.Function.Arguments,
						Type:  "function",
					})
					a.messages.Update(ctx, assistantMsg)
				},
			})
			lastResponse = resp
			lastErr = err
			reqCancel()
		}()

		<-done
		assistantMsg.AddFinish(uimsg.FinishReasonEndTurn)
		a.messages.Update(ctx, assistantMsg)

		// Extract token counts from response
		if lastResponse != nil {
			a.updateSessionTokens(ctx, sessionID, lastResponse.Usage.PromptTokens, lastResponse.Usage.CompletionTokens)
		}

		if lastErr != nil {
			if ctx.Err() != nil {
				a.publishFinish(ctx, sessionID, assistantMsg, uimsg.FinishReasonCanceled, out)
				return
			}
			slog.Error("agent stream error", "error", lastErr)
			a.publishFinish(ctx, sessionID, assistantMsg, uimsg.FinishReasonError, out)
			return
		}

		toolCalls := assistantMsg.ToolCalls()
		if len(toolCalls) == 0 {
			a.publishFinish(ctx, sessionID, assistantMsg, uimsg.FinishReasonEndTurn, out)
			return
		}

		// Execute each tool and append results
		for _, tc := range toolCalls {
			if ctx.Err() != nil {
				a.publishFinish(ctx, sessionID, assistantMsg, uimsg.FinishReasonCanceled, out)
				return
			}
			result := executeTool(ctx, a.project, tc)
			assistantMsg.AddToolResult(uimsg.ToolResult{
				ToolCallID: tc.ID,
				Name:       tc.Name,
				Content:    result,
			})
			a.messages.Update(ctx, assistantMsg)
		}

		// Persist tool results as separate message
		if _, err := a.messages.Create(ctx, sessionID, uimsg.CreateMessageParams{
			Role:  uimsg.Tool,
			Parts: []uimsg.ContentPart{},
			Model: uimodels.ModelID(assistantMsg.Model),
		}); err != nil {
			slog.Error("create tool message", "error", err)
		}
	}

	a.publishFinish(ctx, sessionID, assistantMsg, uimsg.FinishReasonMaxTokens, out)
}

func (a *agentService) publishFinish(ctx context.Context, sessionID string, msg uimsg.Message, reason uimsg.FinishReason, out chan<- uiagent.AgentEvent) {
	// Ensure finish part is attached
	if msg.FinishPart() == nil {
		msg.AddFinish(reason)
		a.messages.Update(ctx, msg)
	}
	out <- uiagent.AgentEvent{Type: uiagent.AgentEventTypeResponse, Message: msg, Done: true}
	a.broker.Publish(uipub.UpdatedEvent, uiagent.AgentEvent{Type: uiagent.AgentEventTypeResponse, Message: msg, Done: true})
}

func (a *agentService) updateSessionTokens(ctx context.Context, sessionID string, promptTokens, completionTokens int) {
	sess, err := a.sessions.Get(ctx, sessionID)
	if err != nil {
		return
	}
	sess.PromptTokens += int64(promptTokens)
	sess.CompletionTokens += int64(completionTokens)
	sess.UpdatedAt = time.Now().UnixMilli()
	a.sessions.Save(ctx, sess)
}

func (a *agentService) buildMessages(ctx context.Context, sessionID string) []cloud.Message {
	msgs, err := a.messages.List(ctx, sessionID)
	if err != nil {
		return nil
	}
	var out []cloud.Message
	for _, m := range msgs {
		switch m.Role {
		case uimsg.User:
			out = append(out, cloud.Message{Role: "user", Content: m.Content().String()})
		case uimsg.Assistant:
			var tc []cloud.ToolCall
			for _, t := range m.ToolCalls() {
				tc = append(tc, cloud.ToolCall{ID: t.ID, Type: "function", Function: struct {
					Name      string `json:"name"`
					Arguments string `json:"arguments"`
				}{Name: t.Name, Arguments: t.Input}})
			}
			out = append(out, cloud.Message{Role: "assistant", Content: m.Content().String(), ToolCalls: tc})
		case uimsg.Tool:
			for _, tr := range m.ToolResults() {
				out = append(out, cloud.Message{Role: "tool", Content: tr.Content, ToolCallID: tr.ToolCallID})
			}
		}
	}
	return out
}

// ─── basic local tool execution ────────────────────────────────────────────────

func executeTool(ctx context.Context, project string, tc uimsg.ToolCall) string {
	switch tc.Name {
	case "bash":
		var p struct {
			Command string `json:"command"`
		}
		if err := json.Unmarshal([]byte(tc.Input), &p); err != nil {
			return fmt.Sprintf("error: %v", err)
		}
		cmd := exec.CommandContext(ctx, "sh", "-c", p.Command)
		cmd.Dir = project
		out, err := cmd.CombinedOutput()
		if err != nil {
			return fmt.Sprintf("%s\nerror: %v", out, err)
		}
		return string(out)
	case "view":
		var p struct {
			FilePath string `json:"file_path"`
			Limit    int    `json:"limit"`
			Offset   int    `json:"offset"`
		}
		if err := json.Unmarshal([]byte(tc.Input), &p); err != nil {
			return fmt.Sprintf("error: %v", err)
		}
		data, err := readFile(p.FilePath, p.Offset, p.Limit)
		if err != nil {
			return fmt.Sprintf("error: %v", err)
		}
		return data
	case "edit":
		return editTool(project, tc.Input)
	case "write":
		return writeTool(project, tc.Input)
	default:
		return fmt.Sprintf("[tool %q not implemented]", tc.Name)
	}
}

// resolvePath resolves a tool file path against the active project directory.
func resolvePath(project, p string) string {
	if p == "" || filepath.IsAbs(p) {
		return filepath.Clean(p)
	}
	return filepath.Join(project, p)
}

type editArgs struct {
	Command    string `json:"command"`
	FilePath   string `json:"file_path"`
	OldString  string `json:"old_string"`
	NewString  string `json:"new_string"`
	InsertLine int    `json:"insert_line"`
	FileText   string `json:"file_text"`
}

func editTool(project, input string) string {
	var a editArgs
	if err := json.Unmarshal([]byte(input), &a); err != nil {
		return fmt.Sprintf("error parsing edit: %v", err)
	}
	path := resolvePath(project, a.FilePath)
	if path == "" {
		return "error: missing file_path"
	}
	data, err := readFileBytes(path)
	if err != nil {
		return fmt.Sprintf("error: %v", err)
	}
	original := string(data)

	var result string
	switch a.Command {
	case "create":
		if _, err := os.Stat(path); err == nil {
			return "error: file already exists (use write to overwrite)"
		}
		result = a.FileText
	case "write":
		result = a.FileText
	case "str_replace":
		if a.OldString == "" {
			return "error: old_string is required"
		}
		n := strings.Count(original, a.OldString)
		if n == 0 {
			return "error: old_string not found in file"
		}
		if n > 1 {
			return fmt.Sprintf("error: old_string matches %d times; include more context", n)
		}
		result = strings.Replace(original, a.OldString, a.NewString, 1)
	case "insert":
		lines := strings.Split(original, "\n")
		idx := a.InsertLine
		if idx < 0 || idx > len(lines) {
			return fmt.Sprintf("error: insert_line %d out of range (0..%d)", idx, len(lines))
		}
		lines = append(lines[:idx], append([]string{a.NewString}, lines[idx:]...)...)
		result = strings.Join(lines, "\n")
	case "replace":
		lines := strings.Split(original, "\n")
		idx := a.InsertLine
		if idx < 0 || idx >= len(lines) {
			return fmt.Sprintf("error: insert_line %d out of range (0..%d)", idx, len(lines)-1)
		}
		lines[idx] = a.NewString
		result = strings.Join(lines, "\n")
	default:
		return fmt.Sprintf("error: unknown edit command %q", a.Command)
	}

	if result == original {
		return "no changes made"
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return fmt.Sprintf("error: %v", err)
	}
	if err := os.WriteFile(path, []byte(result), 0o644); err != nil {
		return fmt.Sprintf("error: %v", err)
	}
	return fmt.Sprintf("File %s updated successfully (%d bytes)", path, len(result))
}

type writeArgs struct {
	FilePath string `json:"file_path"`
	Content  string `json:"content"`
}

func writeTool(project, input string) string {
	var a writeArgs
	if err := json.Unmarshal([]byte(input), &a); err != nil {
		return fmt.Sprintf("error parsing write: %v", err)
	}
	path := resolvePath(project, a.FilePath)
	if path == "" {
		return "error: missing file_path"
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return fmt.Sprintf("error: %v", err)
	}
	if err := os.WriteFile(path, []byte(a.Content), 0o644); err != nil {
		return fmt.Sprintf("error: %v", err)
	}
	return fmt.Sprintf("File %s written successfully (%d bytes)", path, len(a.Content))
}

func readFile(path string, offset, limit int) (string, error) {
	data, err := readFileBytes(path)
	if err != nil {
		return "", err
	}
	lines := strings.Split(string(data), "\n")
	if offset > 0 {
		if offset > len(lines) {
			offset = len(lines)
		}
		lines = lines[offset:]
	}
	if limit > 0 && limit < len(lines) {
		lines = lines[:limit]
	}
	return strings.Join(lines, "\n"), nil
}

func readFileBytes(path string) ([]byte, error) {
	var out strings.Builder
	cmd := exec.Command("cat", path)
	cmd.Stdout = &out
	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("cat %s: %w", path, err)
	}
	return []byte(out.String()), nil
}

// ─── event forwarder commands ──────────────────────────────────────────────────

// ListenLogging returns a cmd that reads one log event and re-arms itself.
func ListenLogging() tea.Cmd {
	ctx := context.Background()
	ch := logging.Subscribe(ctx)
	return func() tea.Msg {
		if ev, ok := <-ch; ok {
			return ev
		}
		return nil
	}
}

// ListenAgentEvents returns a cmd that reads one agent event from the given
// broker and re-arms itself.
func ListenAgentEvents(broker *uipub.Broker[uiagent.AgentEvent]) tea.Cmd {
	ctx := context.Background()
	ch := broker.Subscribe(ctx)
	return func() tea.Msg {
		if ev, ok := <-ch; ok {
			return ev
		}
		return nil
	}
}

// ListenSessionEvents returns a cmd that reads one session event from the given
// broker and re-arms itself.
func ListenSessionEvents(broker *uipub.Broker[uisess.Session]) tea.Cmd {
	ctx := context.Background()
	ch := broker.Subscribe(ctx)
	return func() tea.Msg {
		if ev, ok := <-ch; ok {
			return ev
		}
		return nil
	}
}

// ListenPermissionEvents returns a cmd that reads one permission event.
func ListenPermissionEvents(svc permission.Service) tea.Cmd {
	ctx := context.Background()
	ch := svc.Subscribe(ctx)
	return func() tea.Msg {
		if ev, ok := <-ch; ok {
			return ev
		}
		return nil
	}
}
