package tui

import (
	"context"
	"fmt"
	"io"
	"os"
	"strings"
	"time"

	bkey "github.com/charmbracelet/bubbles/key"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/glamour"
	"github.com/charmbracelet/lipgloss"

	"github.com/layerflow/terminal/internal/cloud"
	"github.com/layerflow/terminal/internal/cmds"
	"github.com/layerflow/terminal/internal/session"
)

var mdRenderer *glamour.TermRenderer

func init() {
	mdRenderer, _ = glamour.NewTermRenderer(
		glamour.WithStandardStyle("dark"),
		glamour.WithWordWrap(100),
	)
}

// renderChat renders the chat screen.
func (a *App) renderChat() string {
	var sections []string

	// Header
	title := "New session"
	if a.session != nil {
		if a.session.Title != "" {
			title = a.session.Title
		} else {
			title = a.session.ID
		}
	}
	header := lipgloss.JoinHorizontal(lipgloss.Left,
		styleChipActive.Render("lf"),
		" ",
		styleTitle.Render(title),
		"  ",
		styleChip.Render("esc home"),
		" ",
		styleChip.Render("? help"),
	)
	sections = append(sections, header)

	// Conversation
	sections = append(sections, a.renderConversation())

	// Streaming indicator
	if a.streaming {
		sections = append(sections, styleDim.Render("  ● streaming… (ctrl+c to stop)"))
	}

	// Input
	sections = append(sections, a.renderChatInput())

	return lipgloss.JoinVertical(lipgloss.Left, sections...)
}

// renderConversation renders the message history with markdown.
func (a *App) renderConversation() string {
	content := a.buildConversationContent()

	if content == "" {
		return styleCard.Render(styleMuted.Render("  Start a conversation. Type below and press Enter."))
	}

	// Wrap in the viewport height available.
	maxH := a.height - 8
	if maxH < 5 {
		maxH = 5
	}

	var sb strings.Builder
	for _, m := range a.messages {
		sb.WriteString(renderMessage(m))
		sb.WriteString("\n")
	}
	if a.streamingText.Len() > 0 {
		partial := a.streamingText.String()
		if partial != "" {
			rendered := renderMarkdown(partial)
			lines := strings.Split(rendered, "\n")
			if len(lines) > 0 {
				last := lines[len(lines)-1]
				lines[len(lines)-1] = last + "▌"
			}
			rendered = strings.Join(lines, "\n")
			sb.WriteString(lipgloss.NewStyle().Foreground(ColorAccent).Render("  lf ") + rendered + "\n")
		}
	}

	out := sb.String()
	// Truncate to visible height conservatively; scroll is simple (show tail).
	lines := strings.Split(strings.TrimRight(out, "\n"), "\n")
	if len(lines) > maxH {
		lines = lines[len(lines)-maxH:]
	}
	return lipgloss.NewStyle().Render(strings.Join(lines, "\n"))
}

func (a *App) buildConversationContent() string {
	var sb strings.Builder
	for _, m := range a.messages {
		switch m.Role {
		case "user":
			sb.WriteString("user: " + m.Content + "\n")
		case "assistant":
			sb.WriteString(m.Content + "\n")
		}
	}
	return sb.String()
}

// renderMessage renders a single persisted message.
func renderMessage(m session.Message) string {
	switch m.Role {
	case "user":
		return lipgloss.NewStyle().Foreground(ColorWhite).Bold(true).Render("  you ") +
			"\n" + renderMarkdown(m.Content)
	case "assistant":
		return lipgloss.NewStyle().Foreground(ColorAccent).Render("  lf ") +
			"\n" + renderMarkdown(m.Content)
	case "system":
		return styleMuted.Italic(true).Render("  " + m.Content)
	default:
		return renderMarkdown(m.Content)
	}
}

// renderMarkdown renders markdown text with glamour.
func renderMarkdown(content string) string {
	if strings.TrimSpace(content) == "" {
		return ""
	}
	out, err := mdRenderer.Render(content)
	if err != nil || strings.TrimSpace(out) == "" {
		return content
	}
	return strings.TrimRight(out, "\n")
}

// renderChatInput renders the input box.
func (a *App) renderChatInput() string {
	prompt := lipgloss.NewStyle().Foreground(ColorPrompt).Bold(true).Render("❯ ")
	if a.loading {
		return styleInput.Render(prompt + styleDim.Render("…"))
	}
	return styleInput.Render(prompt + a.input + cursorBlock)
}

const cursorBlock = "█"

// updateChat handles keys and messages on the chat screen.
func (a *App) updateChat(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.KeyMsg:
		return a.handleChatKey(msg)
	}
	return a, nil
}

func (a *App) handleChatKey(key tea.KeyMsg) (tea.Model, tea.Cmd) {
	// Navigate home with esc (when not streaming) or ctrl+h.
	if bkey.Matches(key, a.keymap.Home) && !a.streaming {
		a.screen = screenHome
		a.input = ""
		return a, nil
	}
	if bkey.Matches(key, a.keymap.NewSession) && !a.streaming {
		return a.startSession()
	}

	// While streaming, only allow cancel.
	if a.streaming {
		if key.String() == "ctrl+c" {
			a.cancelStream()
		}
		return a, nil
	}

	switch {
	case bkey.Matches(key, a.keymap.Submit):
		return a.submitInput()
	case bkey.Matches(key, a.keymap.Newline):
		a.input += "\n"
		return a, nil
	case key.String() == "backspace":
		if len(a.input) > 0 {
			a.input = a.input[:len(a.input)-1]
		}
		return a, nil
	case key.String() == "up":
		a.moveCursorHistory(1)
		return a, nil
	case key.String() == "down":
		a.moveCursorHistory(-1)
		return a, nil
	default:
		if len(key.String()) == 1 {
			a.input += key.String()
			return a, nil
		}
	}

	return a, nil
}

// history tracks previous inputs for arrow-key recall.
var inputHistory []string
var historyIndex = -1

func (a *App) moveCursorHistory(delta int) {
	if len(inputHistory) == 0 {
		return
	}
	historyIndex += delta
	if historyIndex < 0 {
		historyIndex = 0
	}
	if historyIndex >= len(inputHistory) {
		historyIndex = len(inputHistory) - 1
	}
	a.input = inputHistory[historyIndex]
}

// submitInput sends the current input (slash command or chat message).
func (a *App) submitInput() (tea.Model, tea.Cmd) {
	text := strings.TrimSpace(a.input)
	if text == "" {
		return a, nil
	}
	a.input = ""
	historyIndex = -1

	if strings.HasPrefix(text, "/") {
		return a.runSlashCommand(text)
	}
	return a.sendMessage(text)
}

// ensureSession creates a session if none is active.
func (a *App) ensureSession() error {
	if a.session != nil {
		return nil
	}
	sess := &session.Session{
		Title:       "New session",
		ProjectPath: a.st.Project,
		Model:       a.st.Model,
		Provider:    a.st.Provider,
	}
	if err := a.st.Sessions.Create(context.Background(), sess); err != nil {
		return fmt.Errorf("create session: %w", err)
	}
	a.session = sess
	return nil
}

// startSession switches to the chat screen with a fresh session.
func (a *App) startSession() (tea.Model, tea.Cmd) {
	if err := a.ensureSession(); err != nil {
		a.pushToast(err.Error(), toastError)
		return a, nil
	}
	a.screen = screenChat
	a.messages = nil
	a.streamingText.Reset()
	return a, nil
}

// sendMessage persists the user message and streams a reply.
func (a *App) sendMessage(text string) (tea.Model, tea.Cmd) {
	if err := a.ensureSession(); err != nil {
		a.pushToast(err.Error(), toastError)
		return a, nil
	}
	if !a.st.Authenticated {
		a.openLogin()
		return a, nil
	}

	userMsg := &session.Message{SessionID: a.session.ID, Role: "user", Content: text, Model: a.st.Model}
	if err := a.st.Sessions.AddMessage(context.Background(), userMsg); err != nil {
		a.pushToast("save message: "+err.Error(), toastError)
		return a, nil
	}
	a.messages = append(a.messages, *userMsg)
	inputHistory = append(inputHistory, text)

	if a.session.Title == "" || a.session.Title == "New session" {
		a.session.Title = shorten(text, 40)
		_ = a.st.Sessions.Update(context.Background(), a.session)
	}

	// Build prompt from history.
	history, err := a.st.Sessions.GetMessages(context.Background(), a.session.ID, 100)
	if err != nil {
		a.pushToast("load history: "+err.Error(), toastError)
		return a, nil
	}
	prompt := make([]cloud.Message, 0, len(history))
	for _, m := range history {
		if m.Role == "tool" || m.Role == "function" {
			continue
		}
		prompt = append(prompt, cloud.Message{Role: m.Role, Content: m.Content})
	}

	a.loading = true
	a.streaming = true
	a.streamingText.Reset()

	return a, a.streamCmd(prompt)
}

// streamCmd starts the SSE streaming loop.
func (a *App) streamCmd(prompt []cloud.Message) tea.Cmd {
	ch := make(chan streamChunkMsg, 64)
	done := make(chan struct{})

	ctx, cancelFn := context.WithCancel(context.Background())
	a.cancelFn = cancelFn

	go func() {
		defer close(done)
		resp, err := a.st.Client.ChatStream(ctx, cloud.ChatOptions{Model: a.st.Model, Messages: prompt}, func(d string) {
			select {
			case ch <- streamChunkMsg{text: d}:
			case <-ctx.Done():
			}
		})
		a.streamResp = resp
		a.streamErr = err
	}()

	// Pump channel into the tea program.
	return func() tea.Msg {
		select {
		case c, ok := <-ch:
			if ok {
				return c
			}
			<-done
			return streamDoneMsg{resp: a.streamResp, err: a.streamErr}
		case <-done:
			return streamDoneMsg{resp: a.streamResp, err: a.streamErr}
		}
	}
}

// handleStreamDone finalizes a streaming response.
func (a *App) handleStreamDone(msg streamDoneMsg) (tea.Model, tea.Cmd) {
	a.streaming = false
	a.loading = false
	a.cancelFn = nil

	if msg.err != nil {
		a.pushToast(msg.err.Error(), toastError)
		a.messages = append(a.messages, session.Message{
			Role:    "system",
			Content: "Error: " + msg.err.Error(),
		})
		return a, nil
	}

	reply := a.streamingText.String()
	if reply == "" && msg.resp != nil && len(msg.resp.Choices) > 0 {
		reply = msg.resp.Choices[0].Message.Content
	}

	assistant := &session.Message{
		SessionID:    a.session.ID,
		Role:         "assistant",
		Content:      reply,
		Model:        a.st.Model,
		InputTokens:  msg.resp.Usage.PromptTokens,
		OutputTokens: msg.resp.Usage.CompletionTokens,
	}
	if msg.resp != nil && msg.resp.Model != "" {
		assistant.Model = msg.resp.Model
	}
	if err := a.st.Sessions.AddMessage(context.Background(), assistant); err != nil {
		a.pushToast("save reply: "+err.Error(), toastError)
	}
	a.messages = append(a.messages, *assistant)
	a.streamingText.Reset()

	// Update session usage.
	if msg.resp != nil {
		a.session.InputTokens += msg.resp.Usage.PromptTokens
		a.session.OutputTokens += msg.resp.Usage.CompletionTokens
	}
	_ = a.st.Sessions.Update(context.Background(), a.session)

	a.pushToast(fmt.Sprintf("✓ %s  %d tok", assistant.Model, msg.resp.Usage.TotalTokens), toastSuccess)
	return a, nil
}

// runSlashCommand routes a slash command through the cmds router and renders
// the textual output into the conversation.
func (a *App) runSlashCommand(input string) (tea.Model, tea.Cmd) {
	if err := a.ensureSession(); err != nil {
		a.pushToast(err.Error(), toastError)
		return a, nil
	}

	// The cmds handlers write to stdout. Capture it.
	out, err := captureOutput(func() error {
		_, rerr := cmds.Route(input, a.st.CmdCtx)
		return rerr
	})

	var system session.Message
	if err != nil {
		system = session.Message{Role: "system", Content: "Error: " + err.Error()}
	} else if strings.TrimSpace(out) != "" {
		system = session.Message{Role: "system", Content: strings.TrimSpace(out)}
	} else {
		system = session.Message{Role: "system", Content: "✓ " + input}
	}
	a.messages = append(a.messages, system)
	return a, nil
}

// captureOutput runs fn while capturing all writes to stdout.
func captureOutput(fn func() error) (string, error) {
	r, w, err := os.Pipe()
	if err != nil {
		return "", err
	}
	old := os.Stdout
	os.Stdout = w

	runErr := fn()

	_ = w.Close()
	os.Stdout = old

	_ = r.SetReadDeadline(timeNow().Add(2 * timeSecond))
	data, _ := io.ReadAll(r)
	return string(data), runErr
}

func shorten(s string, n int) string {
	s = strings.Join(strings.Fields(s), " ")
	if len(s) <= n {
		return s
	}
	return s[:n-1] + "…"
}

func timeNow() time.Time { return time.Now() }

const timeSecond = time.Second
