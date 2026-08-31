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

	// Pad the left/right so everything hugs a centered column.
	pad := (a.width - colW) / 2
	if pad < 1 {
		pad = 1
	}
	side := lipgloss.NewStyle().Padding(0, pad)

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
	// above were wrapped at w-8, so they fit exactly inside the padding.
	content := lipgloss.NewStyle().
		Width(w).
		Padding(0, 4).
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
	return lipgloss.NewStyle().Height(maxH).Width(w).Padding(0, 4).Render(row)
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
			lipgloss.NewStyle().Foreground(ColorText).Width(w-8).Render(m.Content),
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
		return styleRoleSystem.Render(systemNotice(m.Content))
	default:
		return renderMarkdownW(m.Content, w-8)
	}
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
