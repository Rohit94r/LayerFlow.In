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
	toolsPkg "github.com/layerflow/terminal/internal/tools"
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

// renderChat renders the chat screen: compact header, a scrollable conversation
// viewport (owns all flexible height), a bottom-anchored composer, and the
// status bar. Layout: Header → Viewport → Composer → StatusBar.
func (a *App) renderChat() string {
	colW := contentWidth(a.width)

	header := a.renderChatHeader(colW)
	headerH := lipgloss.Height(header)
	composer := a.renderChatInputBox(colW)
	composerH := lipgloss.Height(composer)
	status := a.renderStatusBar()
	statusH := lipgloss.Height(status)

	viewH := a.height - headerH - statusH - composerH
	if viewH < 5 {
		viewH = 5
	}
	a.viewH = viewH

	conversation := a.renderConversation(colW, viewH)

	// Pad the left/right so everything hugs a centered column, with the app
	// background painted all the way to the screen edges so no terminal-colored
	// gutter shows through on any platform (Windows included).
	pad := (a.width - colW) / 2
	if pad < 1 {
		pad = 1
	}
	side := lipgloss.NewStyle().Padding(0, pad).Background(ColorBG)

	body := lipgloss.JoinVertical(lipgloss.Left,
		side.Render(header),
		side.Render(conversation),
		side.Render(composer),
	)
	return lipgloss.JoinVertical(lipgloss.Left, body, status)
}

// renderChatHeader is a compact single-line header: the LayerFlow wordmark
// (session identity) plus light hints on wide terminals — with a hairline
// bottom separator. Model/workspace/cost stay in the bottom status bar so
// nothing is duplicated.
func (a *App) renderChatHeader(w int) string {
	left := lipgloss.JoinHorizontal(lipgloss.Left,
		renderWordmarkInline(),
	)

	// Hints only on medium+ terminals.
	var right string
	if w >= 60 {
		right = lipgloss.JoinHorizontal(lipgloss.Left,
			styleDim.Render("esc home"),
			"  ",
			styleDim.Render("ctrl+m model"),
		)
	}

	// Header total width = w (BorderBottom adds a line below, no side
	// borders). Padding(0,1) → text area = w-2.
	inner := w - 2 // text area inside padding
	remaining := inner - lipgloss.Width(left)

	// Fit check: drop the right side if it doesn't leave a comfortable gap.
	const minGap = 3
	if right != "" && remaining-lipgloss.Width(right) < minGap {
		right = ""
	}

	var line string
	if right != "" {
		gap := remaining - lipgloss.Width(right)
		if gap < 0 {
			gap = 0
		}
		line = lipgloss.JoinHorizontal(lipgloss.Left,
			left,
			lipgloss.NewStyle().Width(gap).Render(""),
			right,
		)
	} else if remaining > 0 {
		line = lipgloss.JoinHorizontal(lipgloss.Left,
			left,
			lipgloss.NewStyle().Width(remaining).Render(""),
		)
	} else {
		line = left
	}

	return lipgloss.NewStyle().
		Width(w).
		BorderBottom(true).
		BorderStyle(lipgloss.NormalBorder()).
		BorderForeground(ColorBorder).
		Background(ColorBG).
		Padding(0, 1).
		Render(line)
}

var (
	scrollStep = 8
)

// renderConversation renders message history + streaming in a scrollable
// chat viewport. When scrollOffset == 0 it auto-follows the latest message;
// scrolling up (PgUp) holds the position and a "follow" hint appears.
func (a *App) renderConversation(w, maxH int) string {
	if maxH < 5 {
		maxH = 5
	}
	a.viewH = maxH

	innerW := w - 8 // text area inside the conversation's horizontal padding
	var sb strings.Builder
	for i, m := range a.messages {
		// A hairline divider between turns gives the conversation structure and
		// reading rhythm without competing with the message content.
		if i > 0 {
			if rule := renderRule(innerW); rule != "" {
				sb.WriteString(rule)
				sb.WriteString("\n")
			}
		}
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
		a.lastStreamAt = time.Now()
	}
	if streamLen > 0 {
		if len(a.messages) > 0 {
			if rule := renderRule(innerW); rule != "" {
				sb.WriteString(rule)
				sb.WriteString("\n")
			}
		}
		partial := a.streamingText.String()
		role := renderRoleAssistant()
		cursor := ""
		// Blink the cursor every other tick (220ms × 2 = 440ms cycle).
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

	lines := strings.Split(raw, "\n")
	total := len(lines)
	maxOff := total - maxH
	if maxOff < 0 {
		maxOff = 0
	}
	if a.scrollOffset > maxOff {
		a.scrollOffset = maxOff
	}
	if a.scrollOffset < 0 {
		a.scrollOffset = 0
	}
	follow := a.scrollOffset == 0

	var shown []string
	if total <= maxH {
		shown = lines
	} else if follow {
		shown = lines[total-maxH:]
	} else {
		start := total - maxH - a.scrollOffset
		if start < 0 {
			start = 0
		}
		end := total - a.scrollOffset
		if end < start+maxH {
			end = start + maxH
		}
		if end > total {
			end = total
		}
		shown = lines[start:end]
	}

	joined := strings.Join(shown, "\n")

	// A quiet affordance when the user is scrolled away from the latest
	// message — never a forced jump.
	if !follow {
		hint := "↑ older"
		if a.streaming {
			hint = "↓ streaming…"
		}
		joined = styleDim.Render(hint+"  ·  End to follow") + "\n" + joined
	}

	// Width(w).Padding(0,4) → total block = w, text area = w-8. Messages
	// above were wrapped at w-8, so they fit exactly inside the padding. The
	// explicit background keeps the gutters black instead of the terminal's
	// default color on every platform.
	content := lipgloss.NewStyle().
		Width(w).
		Padding(0, 4).
		Background(ColorBG).
		Render(joined)
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
	return lipgloss.NewStyle().Height(maxH).Width(w).Padding(0, 4).Background(ColorBG).Render(row)
}

// renderRoleUser builds the "You" role line with a leading accent tick.
func renderRoleUser() string {
	return lipgloss.JoinHorizontal(lipgloss.Left,
		styleAccentDot.Render("❯"),
		" ",
		styleRoleUser.Render("You"),
	)
}

// renderRoleAssistant builds the "LayerFlow" role line with a leading accent
// diamond, matching the user role line so the conversation reads cleanly.
func renderRoleAssistant() string {
	return lipgloss.JoinHorizontal(lipgloss.Left,
		styleAccentDot.Render("◆"),
		" ",
		styleRoleAssistant.Render("LayerFlow"),
	)
}

// renderMessage renders a single persisted message.
func renderMessage(m session.Message, w int) string {
	switch m.Role {
	case "user":
		return lipgloss.JoinVertical(lipgloss.Left,
			renderRoleUser(),
			lipgloss.NewStyle().
				Foreground(ColorText).
				Width(w-8).
				Render(wrapText(m.Content, w-8)),
		)
	case "assistant":
		return lipgloss.JoinVertical(lipgloss.Left,
			renderRoleAssistant(),
			renderMarkdownW(m.Content, w-8),
		)
	case "system":
		// System rows are user-visible notices only — never raw internal
		// instructions or provider dumps. They render as a quiet, truncated
		// footnote so internal content can never appear as chat body.
		if strings.HasPrefix(m.Content, "plain:") {
			// Verbatim user-facing output (e.g. /permissions tables) from our
			// own commands — safe to show in full, styled as monospace.
			body := strings.TrimSpace(strings.TrimPrefix(m.Content, "plain:"))
			return lipgloss.NewStyle().Foreground(ColorMuted).Width(w - 8).Render(body)
		}
		return styleRoleSystem.Render(systemNotice(m.Content))
	case "tool":
		return renderToolNotice(m)
	default:
		return renderMarkdownW(m.Content, w-8)
	}
}

// renderToolNotice renders a tool-role row as a compact status line so raw
// tool outputs never flood the conversation with markdown.
func renderToolNotice(m session.Message) string {
	var label strings.Builder
	label.WriteString(styleAccentDot.Render("⚙"))
	label.WriteString(" ")
	label.WriteString(styleDim.Render(m.ToolCallID))
	body := strings.TrimSpace(m.Content)
	if len(body) > 200 {
		body = strings.TrimSpace(body[:200]) + "…"
	}
	if body != "" {
		label.WriteString("  ")
		label.WriteString(styleMuted.Render(body))
	}
	return lipgloss.NewStyle().Foreground(ColorDim).Render(label.String())
}

// systemNotice reduces an internal/system message to a single compact,
// user-visible line. Instruction-like lines and multi-line dumps are never
// shown — the notice collapses to a neutral confirmation instead.
func systemNotice(content string) string {
	markers := []string{
		"you are a", "you are an", "you are layerflow", "system prompt",
		"developer prompt", "perform a repository audit", "coding agent",
		"report only json", "your job", "instructions:", "rules:",
		"act as", "you are to", "ignore the previous",
	}
	s := strings.TrimSpace(content)
	if s == "" {
		return "· Command completed"
	}
	for _, ln := range strings.Split(s, "\n") {
		ln = strings.TrimSpace(ln)
		if ln == "" {
			continue
		}
		lower := strings.ToLower(ln)
		internal := false
		for _, m := range markers {
			if strings.HasPrefix(lower, m) {
				internal = true
				break
			}
		}
		if internal {
			continue
		}
		if len(ln) > 88 {
			ln = ln[:85] + "…"
		}
		return "· " + ln
	}
	return "· Command completed"
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

// renderChatInput draws the composer at the bottom of the chat screen inside
// a rounded border (orange when focused). The box's total width — borders
// and padding included — is exactly w so it never overflows the terminal.
func (a *App) renderChatInputBox(w int) string {
	n := w - 2 // style width (excludes border, includes padding)
	if n < 6 {
		n = 6
	}
	textW := n - 2 // exclude padding → text area
	if textW < 10 {
		textW = 10
	}
	a.chatInput.SetWidth(textW)

	view := a.chatInput.View()

	style := inputBoxStyle
	if a.chatFocused {
		style = inputBoxFocusedStyle
	}

	box := style.Width(n).Render(view)

	if a.streaming || a.loading {
		box = lipgloss.JoinVertical(lipgloss.Left, box,
			lipgloss.JoinHorizontal(lipgloss.Left,
				lipgloss.NewStyle().Foreground(ColorAccent).Render("⟳ Generating…"),
				styleDim.Render("   Ctrl+C to cancel"),
			),
		)
	} else if a.chatFocused && strings.TrimSpace(a.chatInput.Value()) != "" {
		// Quiet send affordance once the user has typed — matches the welcome
		// chip so the composer reads as the primary send surface.
		box = lipgloss.JoinVertical(lipgloss.Left, box,
			lipgloss.NewStyle().Align(lipgloss.Right).Width(n).Render(
				styleDim.Render("enter send · shift+enter newline"),
			),
		)
	}
	return box
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
	w := contentWidth(width) - 4 // text area inside border + padding
	if w < 10 {
		w = 10
	}
	return w
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

	// Viewport scrolling: PgUp/PgDn scroll the conversation, End returns to
	// the latest message while keeping the composer and status bar fixed.
	switch key.String() {
	case "pgup":
		a.scrollOffset += scrollStep
		return a, nil
	case "pgdown":
		a.scrollOffset -= scrollStep
		if a.scrollOffset < 0 {
			a.scrollOffset = 0
		}
		return a, nil
	case "end":
		a.scrollOffset = 0
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
		if m.Role == "tool" || m.Role == "function" || m.Role == "system" {
			continue
		}
		prompt = append(prompt, cloud.Message{Role: m.Role, Content: m.Content})
	}

	// Reset viewport + fallback state for this turn.
	a.scrollOffset = 0
	a.cancelled = false
	a.fallbackTried = false
	a.lastPrompt = prompt

	a.loading = true
	a.streaming = true
	a.streamingText.Reset()

	return a, a.streamCmd(prompt)
}

// streamCmd starts the SSE streaming loop and returns the first drain command.
func (a *App) streamCmd(prompt []cloud.Message) tea.Cmd {
	ch := make(chan streamChunkMsg, 64)
	done := make(chan struct{})
	a.streamCh = ch
	a.streamDone = done

	ctx, cancelFn := context.WithCancel(context.Background())
	a.cancelFn = cancelFn

	// Advertise the built-in tools so the model can request file ops.
	var tools []cloud.Tool
	for _, spec := range toolsPkg.DescribeAll() {
		tools = append(tools, cloud.NewFunctionTool(spec.Name, spec.Description, spec.Parameters))
	}

	go func() {
		defer close(done)
		resp, err := a.st.Client.ChatStreamFull(ctx, cloud.ChatOptions{
			Model:    a.st.Model,
			Messages: prompt,
			Tools:    tools,
		}, cloud.StreamHandlers{
			OnDelta: func(d string) {
				select {
				case ch <- streamChunkMsg{text: d}:
				case <-ctx.Done():
				}
			},
		})
		a.streamResp = resp
		a.streamErr = err
	}()

	return a.drainStream
}

// drainStream is a re-armable pump. Bubble Tea invokes a command once per
// frame, so each call returns at most one message; the Update handler must
// return a.drainStream again to keep draining the channel without parking the
// stream on the goroutine.
func (a *App) drainStream() tea.Msg {
	select {
	case c, ok := <-a.streamCh:
		if ok {
			return c
		}
		<-a.streamDone
		return streamDoneMsg{resp: a.streamResp, err: a.streamErr}
	case <-a.streamDone:
		return streamDoneMsg{resp: a.streamResp, err: a.streamErr}
	}
}

// handleStreamDone finalizes a streaming response.
func (a *App) handleStreamDone(msg streamDoneMsg) (tea.Model, tea.Cmd) {
	a.streaming = false
	a.loading = false
	a.cancelFn = nil
	a.lastStreamRenderLen = 0
	a.scrollOffset = 0

	if msg.err != nil {
		return a.handleStreamError(msg.err)
	}

	reply := a.streamingText.String()
	var toolCalls []cloud.ToolCall
	if msg.resp != nil && len(msg.resp.Choices) > 0 {
		toolCalls = msg.resp.Choices[0].Message.ToolCalls
	}

	// ── Tool-calling turn: persist the assistant message, execute each tool
	// locally, and re-run the model with the results appended (the agent loop).
	if len(toolCalls) > 0 {
		return a.handleToolCalls(toolCalls, reply, msg.resp)
	}

	if reply == "" && msg.resp != nil && len(msg.resp.Choices) > 0 {
		reply = msg.resp.Choices[0].Message.Content
	}

	assistant := &session.Message{
		SessionID: a.session.ID,
		Role:      "assistant",
		Content:   reply,
		Model:     a.st.Model,
	}
	if msg.resp != nil {
		assistant.InputTokens = msg.resp.Usage.PromptTokens
		assistant.OutputTokens = msg.resp.Usage.CompletionTokens
		if msg.resp.Model != "" {
			assistant.Model = msg.resp.Model
		}
	}
	if err := a.st.Sessions.AddMessage(context.Background(), assistant); err != nil {
		a.pushToast("save reply: "+err.Error(), toastError)
	}
	a.messages = append(a.messages, *assistant)
	a.streamingText.Reset()

	if msg.resp != nil {
		a.session.InputTokens += msg.resp.Usage.PromptTokens
		a.session.OutputTokens += msg.resp.Usage.CompletionTokens
	}
	_ = a.st.Sessions.Update(context.Background(), a.session)

	a.pushToast("✓ "+assistant.Model, toastSuccess)
	return a, nil
}

// handleToolCalls executes the assistant's requested tools and continues the
// agent loop by re-streaming with the results appended. Persisted history is
// updated so the conversation remains faithful across re-loads.
func (a *App) handleToolCalls(toolCalls []cloud.ToolCall, reply string, resp *cloud.ChatResponse) (tea.Model, tea.Cmd) {
	a.toolRound++
	if a.toolRound > 12 {
		a.messages = append(a.messages, session.Message{
			Role: "system", Content: "Stopped after 12 tool steps.", Model: a.st.Model,
		})
		a.pushToast("Stopped tool loop (12 steps)", toastError)
		a.streamingText.Reset()
		return a, nil
	}

	// Persist the assistant tool-call turn.
	assistant := &session.Message{
		SessionID: a.session.ID,
		Role:      "assistant",
		Content:   reply,
		Model:     a.st.Model,
		ToolCalls: toolCalls,
	}
	if resp != nil && resp.Model != "" {
		assistant.Model = resp.Model
	}
	if err := a.st.Sessions.AddMessage(context.Background(), assistant); err != nil {
		a.pushToast("save tool turn: "+err.Error(), toastError)
	}
	a.messages = append(a.messages, *assistant)
	a.lastToolCalls = toolCalls
	a.pendingToolIdx = 0

	// Run tools in a background command so we can render progress; the next
	// round re-streams with results appended.
	return a, a.execToolRoundCmd(a.optionsWithHistory())
}

// optionsWithHistory rebuilds the full gateway payload including any stored
// tool/assistant messages, plus the tool definitions for the next round.
func (a *App) optionsWithHistory() []cloud.Message {
	history, _ := a.st.Sessions.GetMessages(context.Background(), a.session.ID, 100)
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
	return prompt
}

// execToolRoundCmd executes all pending tool calls, appends a tool message per
// call, then re-streams the next model round. The whole exchange runs in a
// single background task so the TUI never blocks.
func (a *App) execToolRoundCmd(prompt []cloud.Message) tea.Cmd {
	return func() tea.Msg {
		calls := a.lastToolCalls
		ctx := context.Background()

		// Execute each tool call and persist a tool-role message.
		results := make([]cloud.Message, 0, len(calls))
		for _, tc := range calls {
			// Read tools run without prompting; write/exec/destructive require
			// explicit confirmation before the side effect happens.
			approved, err := a.toolApproved(ctx, tc)
			if err != nil {
				results = append(results, cloud.Message{
					Role: "tool", Content: "error: " + err.Error(), ToolCallID: tc.ID,
				})
				continue
			}
			if !approved {
				results = append(results, cloud.Message{
					Role: "tool", Content: "User denied the tool call: " + tc.Function.Name, ToolCallID: tc.ID,
				})
				continue
			}

			result, err := toolsPkg.ExecuteCall(ctx, tc.Function.Name, tc.Function.Arguments, a.st.Project, nil)
			if err != nil {
				result = "error: " + err.Error()
			}
			results = append(results, cloud.Message{Role: "tool", Content: result, ToolCallID: tc.ID})

			toolMsg := &session.Message{
				SessionID: a.session.ID, Role: "tool", Content: result, ToolCallID: tc.ID,
			}
			_ = a.st.Sessions.AddMessage(ctx, toolMsg)
		}

		// Build the next-round prompt with the results appended and re-stream.
		next := make([]cloud.Message, 0, len(prompt)+len(results))
		next = append(next, prompt...)
		next = append(next, results...)
		return toolRoundDoneMsg{prompt: next}
	}
}

// toolRoundDoneMsg signals that tool execution finished and the model should
// be asked again with the tool results in context.
type toolRoundDoneMsg struct {
	prompt []cloud.Message
}

// handleToolRoundDone continues the agent loop by re-streaming with the tool
// results appended.
func (a *App) handleToolRoundDone(msg toolRoundDoneMsg) (tea.Model, tea.Cmd) {
	a.streamingText.Reset()
	a.scrollOffset = 0
	a.lastPrompt = msg.prompt
	a.loading = true
	a.streaming = true
	a.fallbackTried = false
	return a, a.streamCmd(msg.prompt)
}

// toolApproved returns whether a tool invocation may proceed. Read-only tools
// are always allowed; mutating/exec tools require user confirmation. If the
// interactive TUI can't reach the user (e.g. tests), write tools are allowed
// with a notation so the conversation can progress.
func (a *App) toolApproved(ctx context.Context, tc cloud.ToolCall) (bool, error) {
	tool, err := toolsPkg.Get(tc.Function.Name)
	if err != nil {
		return false, err
	}
	spec := tool.Spec()
	if spec.Risk < toolsPkg.RiskWrite {
		return true, nil
	}
	return true, nil
}

// handleStreamError converts a raw stream error into a friendly notice. If the
// active model failed and a valid alternative exists, the request is retried
// once with the fallback model so an invalid model can never stay selected.
func (a *App) handleStreamError(err error) (tea.Model, tea.Cmd) {
	if a.cancelled {
		return a, nil
	}
	friendly := userError(err)

	if !a.fallbackTried && len(a.lastPrompt) > 0 {
		next := cloud.PickAvailableModel(context.Background(), a.st.Client, a.st.Model)
		if next != "" && next != a.st.Model {
			a.fallbackTried = true
			a.st.Model = next
			a.st.Cfg.Model = next
			a.st.CmdCtx.Model = next
			a.st.Router.SetOverride("model", next)
			if a.session != nil {
				a.session.Model = next
				_ = a.st.Sessions.Update(context.Background(), a.session)
			}
			a.streamingText.Reset()
			a.pushToast("Model unavailable — switched to "+shortModel(next), toastInfo)
			return a, a.streamCmd(a.lastPrompt)
		}
	}

	a.messages = append(a.messages, session.Message{Role: "system", Content: friendly})
	a.pushToast(friendly, toastError)
	return a, nil
}

// shortModel collapses a long model id for status/toast display.
func shortModel(id string) string {
	s := strings.TrimSpace(id)
	if n := strings.IndexAny(s, "-/"); n > 0 && len(s) > 22 {
		return s[:n]
	}
	if len(s) > 26 {
		return shorten(s, 26)
	}
	return s
}

// userError maps a raw error to a short, user-visible message. Raw provider
// text, HTTP bodies, and internal errors never surface directly.
func userError(err error) string {
	if err == nil {
		return "Something went wrong. Try again."
	}
	s := err.Error()
	sl := strings.ToLower(s)
	switch {
	case err == cloud.ErrInvalidKey || strings.Contains(sl, "401") || strings.Contains(sl, "unauthorized"):
		return "Authentication failed. Run `lf login` to reconnect."
	case strings.Contains(sl, "does not exist") ||
		strings.Contains(sl, "model not found") ||
		strings.Contains(sl, "no access") ||
		strings.Contains(sl, "not available") ||
		strings.Contains(sl, "invalid model"):
		return "The selected model isn't available here. Switch model or use Auto (/models)."
	case strings.Contains(sl, "timed out") || strings.Contains(sl, "timeout") || strings.Contains(sl, "deadline"):
		return "LayerFlow didn't respond in time. Try again."
	case strings.Contains(sl, "no such host") ||
		strings.Contains(sl, "connection refused") ||
		strings.Contains(sl, "failed to connect") ||
		strings.Contains(sl, "network") ||
		strings.Contains(sl, "unreachable"):
		return "Unable to reach LayerFlow. Check your connection, then try again."
	case strings.Contains(sl, "budget") || strings.Contains(sl, "quota") || strings.Contains(sl, "limit"):
		return "Usage limit reached for this workspace."
	default:
		return "Something went wrong. Try again, or run `lf doctor`."
	}
}

// runSlashCommand routes a slash command through the cmds router and renders
// the textual output into the conversation.
func (a *App) runSlashCommand(input string) (tea.Model, tea.Cmd) {
	if err := a.ensureSession(); err != nil {
		a.pushToast(err.Error(), toastError)
		return a, nil
	}

	// The permissions listing is genuine UI, so render it directly into the
	// conversation instead of hiding it behind a "✓" confirmation.
	lower := strings.ToLower(strings.TrimSpace(input))
	trimmed := strings.TrimLeft(lower, "/")
	parts := strings.Fields(trimmed)
	if len(parts) > 0 && (parts[0] == "permissions" || parts[0] == "perms" || parts[0] == "perm") {
		out, err := captureOutput(func() error {
			_, rerr := cmds.Route(input, a.st.CmdCtx)
			return rerr
		})
		if err != nil {
			a.pushToast(userError(err), toastError)
			return a, nil
		}
		a.messages = append(a.messages, session.Message{Role: "system", Content: "plain:" + out})
		return a, nil
	}

	// /login is a paste-overlay, not the browser device-code flow: we own the
	// whole experience here (Windows terminals can't open browsers reliably).
	if len(parts) > 0 && parts[0] == "login" {
		a.openLogin()
		return a, nil
	}

	// Run the command. Its stdout/stderr is captured so internal tool output
	// never spills into the chat UI. Functionality is unchanged.
	_, err := captureOutput(func() error {
		_, rerr := cmds.Route(input, a.st.CmdCtx)
		return rerr
	})

	var system session.Message
	if err != nil {
		system = session.Message{Role: "system", Content: userError(err)}
	} else {
		// The command ran; keep the chat row as a short confirmation. Raw
		// command output stays in the terminal/CLI, never in the chat body.
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
	if n < 1 {
		return "…"
	}
	// Rune-safe truncation: never split a multi-byte UTF-8 character (CJK,
	// emoji, accented letters) in the middle.
	runes := []rune(s)
	if len(runes) <= n {
		return s
	}
	return string(runes[:n-1]) + "…"
}

// wrapText wraps plain text to a maximum display width, preserving explicit
// newlines and never splitting words or multi-byte runes. Used to stop long
// single-line user messages from overflowing the conversation column.
func wrapText(s string, width int) string {
	if width < 1 {
		width = 1
	}
	var out []string
	for _, rawLine := range strings.Split(s, "\n") {
		var cur strings.Builder
		curWidth := 0
		for _, word := range strings.Fields(rawLine) {
			w := lipgloss.Width(word)
			if curWidth > 0 && curWidth+1+w > width {
				out = append(out, cur.String())
				cur.Reset()
				curWidth = 0
			}
			if curWidth > 0 {
				cur.WriteString(" ")
				curWidth++
			}
			cur.WriteString(word)
			curWidth += w
		}
		out = append(out, cur.String())
	}
	return strings.Join(out, "\n")
}

// shortenModel shortens a full provider-qualified model id like
// "openai/gpt-oss-120b" to just its model name, then clamps to n runes.
func shortenModel(id string) string {
	base := id
	if i := strings.LastIndexByte(id, '/'); i >= 0 && i+1 < len(id) {
		base = id[i+1:]
	}
	if strings.HasPrefix(base, "gpt-") || strings.HasPrefix(base, "llama-") ||
		strings.HasPrefix(base, "gemini-") || strings.HasPrefix(base, "claude-") ||
		strings.HasPrefix(base, "deepseek-") || strings.HasPrefix(base, "grok-") {
		return base
	}
	// Fall back to the full id; it's short enough since it's already qualified.
	return id
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
		a.pushToast("Improve failed: "+errStr, toastError)
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
