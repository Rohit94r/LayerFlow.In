package tui

import (
	"context"
	"fmt"
	"io"
	"os"
	"strings"
	"time"

	bkey "github.com/charmbracelet/bubbles/key"
	"github.com/charmbracelet/bubbles/textarea"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"

	"github.com/layerflow/terminal/internal/cloud"
	"github.com/layerflow/terminal/internal/cmds"
	"github.com/layerflow/terminal/internal/session"
)

// maxComposerHeight caps how tall the chat composer (and home input) can grow
// before they start scrolling internally.
const maxComposerHeight = 5

// composerRows estimates how many terminal rows a value needs at the given
// wrap width, capping at max. Empty lines still occupy a row.
func composerRows(value string, width, max int) int {
	if width < 1 {
		width = 1
	}
	if max < 1 {
		max = 1
	}
	rows := 0
	for _, line := range strings.Split(value, "\n") {
		w := lipgloss.Width(line)
		if w < 1 {
			w = 1
		}
		rows += (w + width - 1) / width
		if rows > max {
			return max
		}
	}
	if rows < 1 {
		rows = 1
	}
	return rows
}

func newChatInput() textarea.Model {
	ta := textarea.New()
	ta.Placeholder = "Message LayerFlow…"
	ta.Prompt = ""
	ta.CharLimit = 4000
	ta.MaxHeight = maxComposerHeight
	ta.ShowLineNumbers = false
	ta.SetWidth(60)
	ta.SetHeight(1)
	ta.FocusedStyle.Placeholder = lipgloss.NewStyle().Foreground(ColorDim)
	ta.BlurredStyle.Placeholder = lipgloss.NewStyle().Foreground(ColorDim)
	ta.FocusedStyle.Base = lipgloss.NewStyle().Foreground(ColorText)
	ta.FocusedStyle.CursorLine = lipgloss.NewStyle().Foreground(ColorText)
	ta.FocusedStyle.Prompt = lipgloss.NewStyle().Foreground(ColorMuted)
	ta.FocusedStyle.EndOfBuffer = lipgloss.NewStyle().Foreground(ColorDim)
	ta.Cursor.Style = lipgloss.NewStyle().Foreground(ColorAccent)
	ta.Focus()
	return ta
}

// ─── Chat screen ────────────────────────────────────────────────────────────

// renderChat renders the chat screen: slim header, conversation, composer.
func (a *App) renderChat() string {
	colW := a.width - 8
	if colW < 60 {
		colW = a.width - 2
	}
	if colW < 40 {
		colW = 40
	}

	header := a.renderChatHeader(colW)
	composer := a.renderChatInput(colW)
	composerH := lipgloss.Height(composer)
	conversation := a.renderConversation(colW, a.height-3-composerH)

	// Pad the left/right so text hugs a centered column like ChatGPT.
	pad := (a.width - colW) / 2
	if pad < 1 {
		pad = 1
	}

	return lipgloss.JoinVertical(lipgloss.Left,
		lipgloss.NewStyle().Padding(0, pad).Render(header),
		conversation,
		lipgloss.NewStyle().Padding(0, pad).Render(composer),
	)
}

// renderChatHeader is a slim one-line header: model badge, session title,
// and quiet navigation hints.
func (a *App) renderChatHeader(w int) string {
	title := "New session"
	if a.session != nil {
		if a.session.Title != "" {
			title = a.session.Title
		} else {
			title = a.session.ID
		}
	}

	model := a.st.Model
	if model == "" {
		model = "default"
	}

	left := lipgloss.JoinHorizontal(lipgloss.Left,
		styleWordmark.Render("LayerFlow"),
		"  ",
		styleChipModel.Render(model),
		"  ",
		lipgloss.NewStyle().Foreground(ColorText).Bold(true).Render(shorten(title, 48)),
	)

	right := lipgloss.JoinHorizontal(lipgloss.Left,
		styleDim.Render("esc home"),
		" ",
		styleDim.Render("ctrl+i improve"),
	)

	spacer := w - lipgloss.Width(left) - lipgloss.Width(right) - 4
	if spacer < 1 {
		spacer = 1
	}
	line := lipgloss.JoinHorizontal(lipgloss.Left,
		left,
		lipgloss.NewStyle().Width(spacer).Render(""),
		right,
	)

	return lipgloss.JoinVertical(lipgloss.Left,
		line,
		lipgloss.NewStyle().Foreground(ColorBorder).Render(strings.Repeat("─", w)),
	)
}

// renderConversation renders message history + streaming, ChatGPT style:
// a role label and plain content — no heavy borders around messages.
// Uses a render cache so persisted messages are only glamour-rendered once;
// only the streaming buffer is re-rendered when new text arrives.
func (a *App) renderConversation(w, maxH int) string {
	if maxH < 5 {
		maxH = 5
	}

	var sb strings.Builder
	for _, m := range a.messages {
		if m.ID != "" {
			if cached, ok := a.renderedCache[m.ID]; ok {
				sb.WriteString(cached)
				sb.WriteString("\n")
				continue
			}
		}
		rendered := renderMessage(m, w)
		if m.ID != "" {
			a.renderedCache[m.ID] = rendered
		}
		sb.WriteString(rendered)
		sb.WriteString("\n")
	}

	// Streaming block with blinking cursor — only re-render if new text arrived.
	streamLen := a.streamingText.Len()
	if streamLen > 0 && streamLen != a.lastStreamRenderLen {
		a.lastStreamRenderLen = streamLen
	}
	if streamLen > 0 {
		partial := a.streamingText.String()
		role := styleRoleAssistant.Render("LayerFlow")
		cursor := ""
		// Blink the cursor every other tick (220ms × 2 = 440ms cycle) for
		// a smoother feel — not aggressive flashing.
		if a.cursorOn && streamLen%2 == 0 {
			cursor = "▍"
		}
		body := renderMarkdownW(partial, w-8)
		body = strings.TrimRight(body, "\n")
		sb.WriteString(lipgloss.JoinVertical(lipgloss.Left, role, body+cursor))
		sb.WriteString("\n")
	}

	raw := strings.TrimRight(sb.String(), "\n")
	if raw == "" {
		return a.renderChatWelcome(w, maxH)
	}

	// Tail-based auto-scroll: show the last maxH lines.
	lines := strings.Split(raw, "\n")
	if len(lines) > maxH {
		lines = lines[len(lines)-maxH:]
	}

	content := lipgloss.NewStyle().
		Width(w).
		Padding(0, 4).
		Render(strings.Join(lines, "\n"))
	return content
}

// renderChatWelcome is shown before any message: a quiet suggestion row.
func (a *App) renderChatWelcome(w, maxH int) string {
	hint := lipgloss.JoinHorizontal(lipgloss.Center,
		styleDim.Render("Ask about your code, docs, or your day"),
		"   ",
		styleChip.Render("enter send"),
	)
	row := lipgloss.NewStyle().Width(w).Align(lipgloss.Center).Render(hint)
	return lipgloss.NewStyle().Height(maxH).Width(w).Render(row)
}

// renderMessage renders a single persisted message.
func renderMessage(m session.Message, w int) string {
	switch m.Role {
	case "user":
		return lipgloss.JoinVertical(lipgloss.Left,
			styleRoleUser.Render("You"),
			lipgloss.NewStyle().Width(w-8).Render(m.Content),
		)
	case "assistant":
		return lipgloss.JoinVertical(lipgloss.Left,
			styleRoleAssistant.Render("LayerFlow"),
			renderMarkdownW(m.Content, w-8),
		)
	case "system":
		return styleRoleSystem.Render("  " + m.Content)
	default:
		return renderMarkdownW(m.Content, w-8)
	}
}

// renderMarkdown renders markdown text with the LayerFlow theme and rich
// output support (charts, trees, enhanced tables). Uses a default width
// for cases where the conversation width isn't available.
func renderMarkdown(content string) string {
	if strings.TrimSpace(content) == "" {
		return ""
	}
	return renderMarkdownRich(content, 100)
}

// renderMarkdownW renders markdown with a specific width — used by the
// conversation view so word-wrap matches the actual column width.
func renderMarkdownW(content string, width int) string {
	if strings.TrimSpace(content) == "" {
		return ""
	}
	return renderMarkdownRich(content, width)
}

// renderChatInput draws the composer at the bottom of the chat screen: a
// "You " prefix and the input on clean lines with a hairline underline. There
// is no border box, so no stray corners or pipes can leak into the text.
func (a *App) renderChatInput(w int) string {
	ti := a.chatInput
	avail := w - 4
	if avail < 20 {
		avail = 20
	}
	ti.SetWidth(avail)

	prefix := lipgloss.NewStyle().Foreground(ColorMuted).Bold(true).Render("You ")
	view := prefix + ti.View()

	under := lipgloss.NewStyle().Foreground(ColorBorder).Render(strings.Repeat("─", w))
	if a.chatFocused {
		under = lipgloss.NewStyle().Foreground(ColorAccent).Render(strings.Repeat("─", w))
	}
	block := lipgloss.JoinVertical(lipgloss.Left, view, under)

	if a.loading {
		block = lipgloss.JoinVertical(lipgloss.Left, block, styleDim.Render("Working…"))
	}
	return block
}

// ─── Chat input handling ────────────────────────────────────────────────────

// updateChat handles keys and messages on the chat screen.
func (a *App) updateChat(msg tea.Msg) (tea.Model, tea.Cmd) {
	a.chatFocused = true
	a.chatInput.SetWidth(chatComposerWidth(a.width))
	switch msg := msg.(type) {
	case tea.KeyMsg:
		return a.handleChatKey(msg)
	}
	return a, nil
}

func chatComposerWidth(width int) int {
	colW := width - 8
	if colW < 60 {
		colW = width - 2
	}
	if colW < 40 {
		colW = 40
	}
	avail := colW - 4
	if avail < 20 {
		avail = 20
	}
	return avail
}

func (a *App) handleChatKey(key tea.KeyMsg) (tea.Model, tea.Cmd) {
	// Navigate home with esc (when not streaming) or ctrl+h.
	if bkey.Matches(key, a.keymap.Home) && !a.streaming {
		a.screen = screenHome
		a.chatInput.SetValue("")
		a.chatInput.SetHeight(1)
		return a, nil
	}
	if bkey.Matches(key, a.keymap.NewSession) && !a.streaming {
		return a.startSession()
	}

	// Slash popup opens without leaving the chat screen.
	if key.String() == "/" {
		a.openSlashPopup()
		return a, nil
	}

	// Improve prompt (Ctrl+I).
	if bkey.Matches(key, a.keymap.Improve) {
		return a.handleImprove()
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
		a.chatInput.InsertString("\n")
		a.refreshChatHeight()
		return a, nil
	case key.String() == "up":
		if a.chatInput.Value() == "" {
			a.moveCursorHistory(1)
			return a, nil
		}
	case key.String() == "down":
		if a.chatInput.Value() == "" {
			a.moveCursorHistory(-1)
			return a, nil
		}
	}

	var cmd tea.Cmd
	a.chatInput, cmd = a.chatInput.Update(key)
	a.refreshChatHeight()
	return a, cmd
}

// refreshChatHeight keeps the composer's height in sync with its content so the
// underline always sits directly under the last typed line and the conversation
// never has to overlap it.
func (a *App) refreshChatHeight() {
	a.chatInput.SetHeight(composerRows(a.chatInput.Value(), chatComposerWidth(a.width), maxComposerHeight))
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
	a.chatInput.SetValue(inputHistory[historyIndex])
	a.refreshChatHeight()
}

// submitInput sends the current input (slash command or chat message).
func (a *App) submitInput() (tea.Model, tea.Cmd) {
	text := strings.TrimSpace(a.chatInput.Value())
	if text == "" {
		return a, nil
	}
	a.chatInput.SetValue("")
	a.chatInput.SetHeight(1)
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
	a.renderedCache = make(map[string]string)
	a.lastStreamRenderLen = 0
	a.chatInput.SetValue("")
	a.chatInput.SetHeight(1)
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
	a.lastStreamRenderLen = 0

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

// ─── Improve prompt ──────────────────────────────────────────────────────────

// handleImprove sends the current composer text to the improve API and
// replaces it with the improved version. Triggered by /improve or Ctrl+I.
func (a *App) handleImprove() (tea.Model, tea.Cmd) {
	text := strings.TrimSpace(a.chatInput.Value())
	if text == "" {
		a.pushToast("Type a prompt first, then improve", toastInfo)
		return a, nil
	}
	if !a.st.Authenticated {
		a.openLogin()
		return a, nil
	}

	a.loading = true
	a.pushToast("Improving prompt…", toastInfo)

	return a, func() tea.Msg {
		result, err := a.st.Client.ImprovePrompt(context.Background(), text, a.st.Model)
		return improveResultMsg{result: result, err: err}
	}
}

// handleImproveResult replaces the composer text with the improved prompt.
func (a *App) handleImproveResult(msg improveResultMsg) (tea.Model, tea.Cmd) {
	a.loading = false

	if msg.err != nil {
		errStr := msg.err.Error()
		if len(errStr) > 60 {
			errStr = errStr[:60] + "…"
		}
		a.pushToast("Improve failed: " + errStr, toastError)
		return a, nil
	}

	if msg.result == nil || msg.result.ImprovedContent == "" {
		a.pushToast("Improve returned empty result", toastError)
		return a, nil
	}

	a.chatInput.SetValue(msg.result.ImprovedContent)
	a.refreshChatHeight()

	scoreMsg := fmt.Sprintf("Improved ✓ Score: %d/100", msg.result.Score)
	if msg.result.OriginalScore > 0 {
		scoreMsg = fmt.Sprintf("Improved ✓ %d → %d/100", msg.result.OriginalScore, msg.result.Score)
	}
	a.pushToast(scoreMsg, toastSuccess)
	return a, nil
}
