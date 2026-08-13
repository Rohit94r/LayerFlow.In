package tui

import (
	"fmt"
	"strings"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"

	"github.com/layerflow/terminal/internal/permission"
	"github.com/layerflow/terminal/internal/providers"
	"github.com/layerflow/terminal/internal/search"
	"github.com/layerflow/terminal/internal/session"
)

// Router abstracts provider selection for the TUI.
type Router interface {
	Stream(text string, msgs []session.Message) (<-chan providers.Chunk, error)
}

// ─── Messages ────────────────────────────────────────────────────────────────

// streamChunkMsg delivers a piece of streaming output to the model.
type streamChunkMsg struct {
	chunk providers.Chunk
}

// streamDoneMsg signals the end of a streaming response.
type streamDoneMsg struct {
	usage *providers.FuncUsage
	err   error
}

// errorMsg carries an error from an async operation.
type errorMsg struct {
	err error
}

// ─── Model ───────────────────────────────────────────────────────────────────

// Model is the root Bubble Tea model for the LayerFlow TUI.
type Model struct {
	// Session state
	session  *session.Session
	messages []session.Message
	input    string
	cursor   int
	scroll   int

	// Sub-views
	conversation string
	approval     *ApprovalCard
	diff         *DiffView
	help         bool

	// Components
	statusBar StatusBar
	palette   CommandPalette

	// Services
	providers  Router
	stream     <-chan providers.Chunk
	permission permission.Engine
	search     search.Index

	// UI state
	loading   bool
	streaming bool
	cancelled bool
	width     int
	height    int
}

// StatusBar renders persistent project context at the bottom of the screen.
type StatusBar struct {
	Project   string
	Branch    string
	Model     string
	Provider  string
	Tokens    int
	Cost      float64
	SyncState string
	Daemon    string
	Version   string
}

// ApprovalCard displays a pending tool invocation requiring user consent.
type ApprovalCard struct {
	Tool     string
	Risk     string
	Preview  string
	Decision string // "approve", "deny", "auto"
	Focus    int    // button index: 0=approve, 1=deny, 2=auto
}

// CommandPalette is a fuzzy-searchable command overlay (Ctrl+K).
type CommandPalette struct {
	Visible  bool
	Filter   string
	Items    []PaletteItem
	Selected int
}

// PaletteItem describes a single palette entry.
type PaletteItem struct {
	Name        string
	Description string
	Handler     string
}

// ─── Styles ──────────────────────────────────────────────────────────────────

var (
	styleApp       = lipgloss.NewStyle().Padding(0)
	styleInput     = lipgloss.NewStyle().Border(lipgloss.RoundedBorder()).BorderForeground(lipgloss.Color("62")).Padding(0, 1)
	styleStatus    = lipgloss.NewStyle().Foreground(lipgloss.Color("241")).Background(lipgloss.Color("236")).Padding(0, 1)
	styleUser      = lipgloss.NewStyle().Foreground(lipgloss.Color("39")).Bold(true)
	styleAssistant = lipgloss.NewStyle().Foreground(lipgloss.Color("212"))
	styleSystem    = lipgloss.NewStyle().Foreground(lipgloss.Color("243")).Italic(true)
	styleTool      = lipgloss.NewStyle().Foreground(lipgloss.Color("243")).Border(lipgloss.RoundedBorder()).BorderForeground(lipgloss.Color("240")).Padding(0, 1)
	styleHelp      = lipgloss.NewStyle().Border(lipgloss.RoundedBorder()).BorderForeground(lipgloss.Color("62")).Padding(1, 2)
)

// ─── Constructor ─────────────────────────────────────────────────────────────

// New creates an initial TUI model.
func New(sess *session.Session, prov Router, perm permission.Engine, idx search.Index) Model {
	return Model{
		session:    sess,
		providers:  prov,
		permission: perm,
		search:     idx,
		statusBar: StatusBar{
			Version: "0.1.0",
		},
		palette: CommandPalette{
			Items: defaultPaletteItems(),
		},
	}
}

// ─── tea.Model ───────────────────────────────────────────────────────────────

// Init implements tea.Model.
func (m Model) Init() tea.Cmd {
	return nil
}

// Update implements tea.Model.
func (m Model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		return m, nil

	case tea.KeyMsg:
		return m.handleKey(msg)

	case streamChunkMsg:
		return m.handleStreamChunk(msg.chunk)

	case streamDoneMsg:
		m.streaming = false
		if msg.err != nil {
			m.messages = append(m.messages, session.Message{
				Role:    "system",
				Content: fmt.Sprintf("Error: %v", msg.err),
			})
		}
		if msg.usage != nil {
			m.statusBar.Tokens += msg.usage.InputTokens + msg.usage.OutputTokens
			m.statusBar.Cost += float64(msg.usage.CostMicro) / 1_000_000
		}
		return m, nil

	case errorMsg:
		m.loading = false
		m.messages = append(m.messages, session.Message{
			Role:    "system",
			Content: fmt.Sprintf("Error: %v", msg.err),
		})
		return m, nil
	}

	return m, nil
}

// View implements tea.Model.
func (m Model) View() string {
	if m.width == 0 || m.height == 0 {
		return "Initializing..."
	}

	var sections []string

	// Conversation area
	convHeight := m.height - 3 // reserve for input + status
	sections = append(sections, m.renderConversation(convHeight))

	// Approval card overlay
	if m.approval != nil {
		sections = append(sections, m.renderApproval())
	}

	// Diff view overlay
	if m.diff != nil {
		sections = append(sections, m.renderDiff())
	}

	// Input area
	sections = append(sections, m.renderInput())

	// Status bar
	sections = append(sections, m.renderStatusBar())

	// Help overlay
	if m.help {
		sections = append(sections, m.renderHelp())
	}

	// Command palette overlay
	if m.palette.Visible {
		sections = append(sections, m.renderPalette())
	}

	return lipgloss.JoinVertical(lipgloss.Left, sections...)
}

// ─── Key handling ────────────────────────────────────────────────────────────

func (m Model) handleKey(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	// Global keys
	switch msg.String() {
	case "ctrl+c":
		if m.streaming {
			m.cancelled = true
			return m, nil
		}
		return m, tea.Quit

	case "ctrl+k":
		m.palette.Visible = !m.palette.Visible
		if m.palette.Visible {
			m.palette.Filter = ""
			m.palette.Selected = 0
		}
		return m, nil

	case "?":
		if m.input == "" {
			m.help = !m.help
			return m, nil
		}
	}

	// Command palette mode
	if m.palette.Visible {
		return m.handlePaletteKey(msg)
	}

	// Approval card mode
	if m.approval != nil {
		return m.handleApprovalKey(msg)
	}

	// Diff view mode
	if m.diff != nil {
		return m.handleDiffKey(msg)
	}

	// Normal input mode
	switch msg.String() {
	case "enter":
		if m.input == "" || m.loading || m.streaming {
			return m, nil
		}
		cmd := m.submitInput()
		return m, cmd

	case "backspace":
		if len(m.input) > 0 {
			m.input = m.input[:len(m.input)-1]
			m.cursor--
		}
		return m, nil

	case "up":
		m.scrollUp()
		return m, nil

	case "down":
		m.scrollDown()
		return m, nil

	case "pgup":
		for i := 0; i < 10; i++ {
			m.scrollUp()
		}
		return m, nil

	case "pgdown":
		for i := 0; i < 10; i++ {
			m.scrollDown()
		}
		return m, nil

	case "home":
		m.scroll = 0
		return m, nil

	case "end":
		m.scrollToBottom()
		return m, nil

	default:
		if len(msg.String()) == 1 {
			m.input += msg.String()
			m.cursor++
		}
	}

	return m, nil
}

func (m Model) handlePaletteKey(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "esc", "ctrl+k":
		m.palette.Visible = false
		return m, nil

	case "up":
		if m.palette.Selected > 0 {
			m.palette.Selected--
		}
		return m, nil

	case "down":
		if m.palette.Selected < len(m.palette.Items)-1 {
			m.palette.Selected++
		}
		return m, nil

	case "enter":
		m.palette.Visible = false
		if m.palette.Selected >= 0 && m.palette.Selected < len(m.palette.Items) {
			item := m.palette.Items[m.palette.Selected]
			m.input = "/" + item.Handler + " "
		}
		return m, nil

	default:
		if len(msg.String()) == 1 {
			m.palette.Filter += msg.String()
			m.palette.Selected = 0
			m.palette.Items = filterPaletteItems(defaultPaletteItems(), m.palette.Filter)
		}
	}
	return m, nil
}

func (m Model) handleApprovalKey(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	a := m.approval
	switch msg.String() {
	case "tab":
		a.Focus = (a.Focus + 1) % 3
		return m, nil

	case "shift+tab":
		a.Focus = (a.Focus + 2) % 3
		return m, nil

	case "y":
		a.Decision = "approve"
		m.approval = nil
		return m, m.onApprovalDecision(a)

	case "n":
		a.Decision = "deny"
		m.approval = nil
		return m, m.onApprovalDecision(a)

	case "a":
		a.Decision = "auto"
		m.approval = nil
		return m, m.onApprovalDecision(a)

	case "esc":
		a.Decision = "deny"
		m.approval = nil
		return m, m.onApprovalDecision(a)
	}
	return m, nil
}

func (m Model) handleDiffKey(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "esc", "q":
		m.diff = nil
		return m, nil
	}

	if m.diff != nil {
		updated, _ := m.diff.Update(msg)
		m.diff = &updated
	}
	return m, nil
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

func (m *Model) scrollUp() {
	if m.scroll > 0 {
		m.scroll--
	}
}

func (m *Model) scrollDown() {
	m.scroll++
}

func (m *Model) scrollToBottom() {
	m.scroll = len(m.messages)
}

func (m Model) submitInput() tea.Cmd {
	text := strings.TrimSpace(m.input)
	if text == "" {
		return nil
	}

	// Slash commands
	if strings.HasPrefix(text, "/") {
		return m.handleSlashCommand(text)
	}

	m.messages = append(m.messages, session.Message{
		Role:    "user",
		Content: text,
	})
	m.input = ""
	m.cursor = 0
	m.loading = true
	m.scroll = len(m.messages)

	return m.sendToProvider(text)
}

func (m Model) sendToProvider(text string) tea.Cmd {
	return func() tea.Msg {
		// Placeholder: real implementation streams via Router
		return streamDoneMsg{err: nil}
	}
}

func (m Model) handleSlashCommand(text string) tea.Cmd {
	// Placeholder: delegates to cmds.Route
	m.input = ""
	m.cursor = 0
	return nil
}

func (m Model) onApprovalDecision(a *ApprovalCard) tea.Cmd {
	return func() tea.Msg {
		// Placeholder: real implementation sends decision to permission.Engine
		return nil
	}
}

func (m Model) handleStreamChunk(chunk providers.Chunk) (tea.Model, tea.Cmd) {
	if chunk.Done {
		m.streaming = false
		return m, nil
	}
	if chunk.Err != nil {
		m.streaming = false
		return m, nil
	}

	// Append partial text to the last assistant message
	if len(m.messages) > 0 && m.messages[len(m.messages)-1].Role == "assistant" {
		last := &m.messages[len(m.messages)-1]
		last.Content += chunk.Text
	} else {
		m.messages = append(m.messages, session.Message{
			Role:    "assistant",
			Content: chunk.Text,
		})
	}

	m.scrollToBottom()

	if chunk.Usage != nil {
		return m, func() tea.Msg {
			return streamDoneMsg{usage: chunk.Usage}
		}
	}
	return m, nil
}

// ─── Palette ─────────────────────────────────────────────────────────────────

func defaultPaletteItems() []PaletteItem {
	return []PaletteItem{
		{Name: "help", Description: "Show help", Handler: "help"},
		{Name: "model", Description: "Switch model", Handler: "model"},
		{Name: "provider", Description: "Switch provider", Handler: "provider"},
		{Name: "new", Description: "New session", Handler: "new"},
		{Name: "sessions", Description: "List sessions", Handler: "sessions"},
		{Name: "compact", Description: "Compact history", Handler: "compact"},
		{Name: "memory", Description: "Memory management", Handler: "memory"},
		{Name: "search", Description: "Search files", Handler: "search"},
		{Name: "status", Description: "Show status", Handler: "status"},
		{Name: "cost", Description: "Show cost", Handler: "cost"},
		{Name: "git", Description: "Git operations", Handler: "git"},
		{Name: "doctor", Description: "Diagnostics", Handler: "doctor"},
		{Name: "clear", Description: "Clear screen", Handler: "clear"},
	}
}

func filterPaletteItems(items []PaletteItem, filter string) []PaletteItem {
	if filter == "" {
		return items
	}
	lower := strings.ToLower(filter)
	var filtered []PaletteItem
	for _, item := range items {
		if strings.Contains(strings.ToLower(item.Name), lower) ||
			strings.Contains(strings.ToLower(item.Description), lower) {
			filtered = append(filtered, item)
		}
	}
	return filtered
}
