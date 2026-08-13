package tui

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/glamour"
	"github.com/charmbracelet/lipgloss"

	"github.com/layerflow/terminal/internal/session"
)

// ConversationView is a focused view for rendering message history with streaming.
type ConversationView struct {
	messages  []session.Message
	streaming string
	scroll    int
	width     int
	height    int
}

// NewConversationView creates a new conversation view.
func NewConversationView(width, height int) ConversationView {
	return ConversationView{
		width:  width,
		height: height,
	}
}

// SetMessages replaces the message list.
func (v *ConversationView) SetMessages(msgs []session.Message) {
	v.messages = msgs
}

// AppendStreaming appends partial text to the current streaming message.
func (v *ConversationView) AppendStreaming(text string) {
	v.streaming += text
}

// ClearStreaming resets the streaming buffer.
func (v *ConversationView) ClearStreaming() {
	v.streaming = ""
}

// ScrollUp moves the view up.
func (v *ConversationView) ScrollUp() {
	if v.scroll > 0 {
		v.scroll--
	}
}

// ScrollDown moves the view down.
func (v *ConversationView) ScrollDown() {
	v.scroll++
}

// ScrollToBottom jumps to the latest messages.
func (v *ConversationView) ScrollToBottom() {
	v.scroll = max(0, len(v.messages)-v.visibleLines())
}

// Update handles Bubble Tea messages for the conversation view.
func (v ConversationView) Update(msg tea.Msg) (ConversationView, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch msg.String() {
		case "up", "k":
			v.ScrollUp()
		case "down", "j":
			v.ScrollDown()
		case "pgup":
			for i := 0; i < 10; i++ {
				v.ScrollUp()
			}
		case "pgdown":
			for i := 0; i < 10; i++ {
				v.ScrollDown()
			}
		case "home":
			v.scroll = 0
		case "end":
			v.ScrollToBottom()
		}
	case tea.WindowSizeMsg:
		v.width = msg.Width
		v.height = msg.Height
	}
	return v, nil
}

// Render produces the conversation view output.
func (v ConversationView) Render() string {
	if len(v.messages) == 0 && v.streaming == "" {
		return v.renderWelcome()
	}

	var lines []string
	visible := v.visibleLines()

	// Calculate message window
	start := v.scroll
	if start > len(v.messages) {
		start = len(v.messages)
	}

	for _, msg := range v.messages[start:] {
		block := v.renderMessage(msg)
		lines = append(lines, block)
	}

	// Streaming buffer
	if v.streaming != "" {
		lines = append(lines, v.renderStreaming())
	}

	// Trim to visible area
	if len(lines) > visible {
		lines = lines[len(lines)-visible:]
	}

	// Scroll indicator
	scrollInfo := v.scrollIndicator()
	if scrollInfo != "" {
		lines = append(lines, scrollInfo)
	}

	content := strings.Join(lines, "\n")
	return lipgloss.NewStyle().Height(v.height - 2).Render(content)
}

func (v ConversationView) renderMessage(msg session.Message) string {
	content := msg.Content

	switch msg.Role {
	case "user":
		return v.renderUser(content)
	case "assistant":
		return v.renderAssistant(content)
	case "system":
		return v.renderSystem(content)
	case "tool":
		return v.renderTool(msg)
	default:
		return content
	}
}

func (v ConversationView) renderUser(content string) string {
	role := lipgloss.NewStyle().Foreground(lipgloss.Color("39")).Bold(true).Render("you")
	return fmt.Sprintf("  %s  %s", role, content)
}

func (v ConversationView) renderAssistant(content string) string {
	role := lipgloss.NewStyle().Foreground(lipgloss.Color("212")).Render("lf")
	rendered := v.renderMarkdown(content)
	return fmt.Sprintf("  %s  %s", role, rendered)
}

func (v ConversationView) renderSystem(content string) string {
	style := lipgloss.NewStyle().Foreground(lipgloss.Color("243")).Italic(true)
	return style.Render("  " + content)
}

func (v ConversationView) renderTool(msg session.Message) string {
	// Tool calls use ToolCallID to identify the tool; display it inline
	header := lipgloss.NewStyle().Foreground(lipgloss.Color("33")).Bold(true).
		Render("tool: " + msg.ToolCallID)

	box := lipgloss.NewStyle().
		Border(lipgloss.RoundedBorder()).
		BorderForeground(lipgloss.Color("240")).
		Padding(0, 1).
		Render(header + "\n" + msg.Content)

	return "  " + box
}

func (v ConversationView) renderStreaming() string {
	if v.streaming == "" {
		return ""
	}
	role := lipgloss.NewStyle().Foreground(lipgloss.Color("212")).Render("lf")
	partial := lipgloss.NewStyle().Faint(true).Render(v.streaming)
	return fmt.Sprintf("  %s  %s▌", role, partial)
}

func (v ConversationView) renderMarkdown(content string) string {
	if content == "" {
		return ""
	}

	width := v.width - 20
	if width < 40 {
		width = 40
	}

	r, err := glamour.NewTermRenderer(
		glamour.WithAutoStyle(),
		glamour.WithWordWrap(width),
	)
	if err != nil {
		return content
	}

	out, err := r.Render(content)
	if err != nil {
		return content
	}

	return strings.TrimRight(out, "\n")
}

func (v ConversationView) renderWelcome() string {
	welcome := `
  LayerFlow Terminal v0.1.0

  Type your message to start a conversation.
  Use /help for available commands.
  Press Ctrl+K for the command palette.
`
	return lipgloss.NewStyle().
		Foreground(lipgloss.Color("241")).
		Border(lipgloss.RoundedBorder()).
		BorderForeground(lipgloss.Color("62")).
		Padding(1, 2).
		Render(strings.TrimSpace(welcome))
}

func (v ConversationView) scrollIndicator() string {
	total := len(v.messages)
	visible := v.visibleLines()
	start := v.scroll

	if total <= visible && v.streaming == "" {
		return ""
	}

	var parts []string
	if start > 0 {
		parts = append(parts, fmt.Sprintf("↑ %d above", start))
	}
	if start+visible < total {
		parts = append(parts, fmt.Sprintf("↓ %d below", total-start-visible))
	}

	if len(parts) == 0 {
		return ""
	}
	return lipgloss.NewStyle().Foreground(lipgloss.Color("241")).Italic(true).
		Render("  " + strings.Join(parts, "  "))
}

func (v ConversationView) visibleLines() int {
	h := v.height - 4
	if h < 1 {
		h = 1
	}
	return h
}
