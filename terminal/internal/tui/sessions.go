package tui

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/charmbracelet/bubbles/textinput"
	"github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"

	"github.com/layerflow/terminal/internal/session"
)

// sessionRow is a session plus a cached preview line.
type sessionRow struct {
	session.Session
	preview string
}

// sessionsModel is the sessions manager overlay.
type sessionsModel struct {
	app      *App
	rows     []sessionRow
	selected int
	loading  bool
	loaded   bool
	renaming bool
	rename   textinput.Model
}

// openSessions shows the sessions overlay.
func (a *App) openSessions() {
	s := &sessionsModel{app: a, loading: true}
	a.sessions = s
	a.overlay = overlaySessions
	s.load()
}

func (s *sessionsModel) load() tea.Cmd {
	return func() tea.Msg {
		ss, err := s.app.st.Sessions.List(context.Background(), s.app.st.Project, 50)
		if err != nil {
			return sessionsLoadedMsg{err: err}
		}
		// Grab a one-line preview for each session.
		rows := make([]sessionRow, 0, len(ss))
		for _, sess := range ss {
			row := sessionRow{Session: sess}
			msgs, merr := s.app.st.Sessions.GetMessages(context.Background(), sess.ID, 20)
			if merr == nil {
				for i := len(msgs) - 1; i >= 0; i-- {
					if msgs[i].Role == "user" || msgs[i].Role == "assistant" {
						row.preview = firstLine(msgs[i].Content)
						break
					}
				}
			}
			rows = append(rows, row)
		}
		return sessionsLoadedMsg{sessions: nil, rows: rows, err: nil}
	}
}

func (s *sessionsModel) reload() tea.Cmd {
	s.loading = true
	return s.load()
}

func firstLine(text string) string {
	line := strings.Split(text, "\n")[0]
	line = strings.TrimSpace(line)
	if len(line) > 60 {
		return line[:57] + "…"
	}
	return line
}

// View renders the sessions list.
func (s *sessionsModel) View() string {
	var body []string
	body = append(body, lipgloss.JoinHorizontal(lipgloss.Left,
		styleTitle.Render("Recent chats"),
		"  ",
		styleDim.Render("enter open · r rename · b branch · e export · ⌫ delete · esc close"),
	))

	if s.loading {
		body = append(body, "", styleDim.Render("  loading…"))
	} else if s.loaded && len(s.rows) == 0 {
		body = append(body, "", styleMuted.Render("  No chats for this project yet. Start one from the home screen."))
	} else if s.loaded {
		body = append(body, "")
		for i, row := range s.rows {
			body = append(body, s.renderRow(i, row))
		}
		body = append(body, "", styleFooter.Render("  Select a chat to open or act on it."))
	}

	inner := lipgloss.JoinVertical(lipgloss.Left, body...)
	box := styleModal.Render(inner)

	top := (s.app.height - lipgloss.Height(box)) / 2
	if top < 0 {
		top = 0
	}
	return lipgloss.NewStyle().MarginTop(top).Render(box)
}

func (s *sessionsModel) renderRow(i int, row sessionRow) string {
	title := row.Title
	if strings.TrimSpace(title) == "" {
		title = "(untitled)"
	}
	t := time.UnixMilli(row.UpdatedAt)

	model := row.Model
	if model == "" {
		model = "default"
	}

	line := lipgloss.JoinHorizontal(lipgloss.Left,
		" ",
		lipgloss.NewStyle().Bold(true).Render(shorten(title, 32)),
		"  ",
		styleMuted.Render(shorten(row.preview, 46)),
		"  ",
		styleChipModel.Render(model),
		"  ",
		styleDim.Render(t.Format("Jan 02 15:04")),
	)

	if s.renaming && i == s.selected {
		ti := s.rename
		ti.Width = 42
		row := lipgloss.JoinHorizontal(lipgloss.Left,
			"  ",
			lipgloss.NewStyle().Foreground(ColorAccent).Bold(true).Render("✎ "),
			ti.View(),
		)
		return styleListSel.Render(row)
	}

	if i == s.selected {
		return styleListSel.Render(line)
	}
	return line
}

// Update handles keys for the sessions overlay.
func (s *sessionsModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	// Rename mode grabs all keys except enter/esc.
	if s.renaming {
		switch key := msg.(type) {
		case tea.KeyMsg:
			switch key.String() {
			case "enter":
				return s.commitRename()
			case "esc":
				s.renaming = false
				return s.app, nil
			}
			var cmd tea.Cmd
			s.rename, cmd = s.rename.Update(msg)
			return s.app, cmd
		}
	}

	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch key := msg; key.String() {
		case "esc", "ctrl+k":
			s.app.closeOverlay()
			return s.app, nil
		case "up":
			if s.selected > 0 {
				s.selected--
			}
			return s.app, nil
		case "down":
			if s.selected < len(s.rows)-1 {
				s.selected++
			}
			return s.app, nil
		case "enter":
			if len(s.rows) == 0 {
				return s.app, nil
			}
			row := s.rows[s.selected]
			return s.app, s.openSession(row.Session)
		case "r":
			if len(s.rows) == 0 {
				return s.app, nil
			}
			ti := textinput.New()
			ti.SetValue(s.rows[s.selected].Title)
			ti.Focus()
			s.rename = ti
			s.renaming = true
			return s.app, nil
		case "b":
			if len(s.rows) == 0 {
				return s.app, nil
			}
			return s.app, s.branchSession(s.rows[s.selected].Session)
		case "e":
			if len(s.rows) == 0 {
				return s.app, nil
			}
			s.exportSession(s.rows[s.selected].Session)
			return s.app, nil
		case "ctrl+d", "backspace":
			if len(s.rows) == 0 {
				return s.app, nil
			}
			row := s.rows[s.selected]
			if err := s.app.st.Sessions.Delete(context.Background(), row.ID); err != nil {
				s.app.pushToast("delete failed: "+err.Error(), toastError)
			} else {
				s.app.pushToast("Deleted chat", toastSuccess)
			}
			return s.app, s.reload()
		case "ctrl+n":
			s.app.closeOverlay()
			return s.app.startSession()
		}
	case sessionsLoadedMsg:
		s.loading = false
		s.loaded = true
		if msg.err != nil {
			s.app.pushToast("load sessions: "+msg.err.Error(), toastError)
			s.app.closeOverlay()
			return s.app, nil
		}
		s.rows = msg.rows
		s.selected = 0
		return s.app, nil
	}
	return s.app, nil
}

func (s *sessionsModel) commitRename() (tea.Model, tea.Cmd) {
	s.renaming = false
	if s.selected >= len(s.rows) {
		return s.app, nil
	}
	row := &s.rows[s.selected]
	newTitle := strings.TrimSpace(s.rename.Value())
	if newTitle == "" {
		return s.app, nil
	}
	row.Title = newTitle
	if err := s.app.st.Sessions.Update(context.Background(), &row.Session); err != nil {
		s.app.pushToast("rename failed: "+err.Error(), toastError)
		return s.app, s.reload()
	}
	s.app.pushToast("Renamed chat", toastSuccess)
	return s.app, nil
}

// branchSession duplicates the session as a new chat and opens it.
func (s *sessionsModel) branchSession(sess session.Session) tea.Cmd {
	branch, err := s.app.st.Sessions.Branch(context.Background(), sess.ID, sess.Title+" (branch)")
	if err != nil {
		s.app.pushToast("branch failed: "+err.Error(), toastError)
		return nil
	}
	s.app.pushToast("Branched into a new chat", toastSuccess)
	return s.openSession(*branch)
}

// exportSession writes the conversation to a markdown file in the project dir.
func (s *sessionsModel) exportSession(sess session.Session) {
	msgs, err := s.app.st.Sessions.GetMessages(context.Background(), sess.ID, 1000)
	if err != nil {
		s.app.pushToast("export failed: "+err.Error(), toastError)
		return
	}
	var sb strings.Builder
	sb.WriteString("# " + sess.Title + "\n\n")
	for _, m := range msgs {
		switch m.Role {
		case "user":
			sb.WriteString("## You\n\n" + m.Content + "\n\n")
		case "assistant":
			sb.WriteString("## LayerFlow\n\n" + m.Content + "\n\n")
		}
	}

	safe := strings.Map(func(r rune) rune {
		if r == '/' || r == '\\' || r == ':' || r == '*' || r == '?' || r == '"' || r == '<' || r == '>' || r == '|' {
			return '-'
		}
		return r
	}, sess.Title)
	if strings.TrimSpace(safe) == "" {
		safe = sess.ID
	}
	path := filepath.Join(s.app.st.Project, safe+".md")
	if err := os.WriteFile(path, []byte(sb.String()), 0o644); err != nil {
		s.app.pushToast("export failed: "+err.Error(), toastError)
		return
	}
	s.app.pushToast("Exported → "+path, toastSuccess)
}

// openSession loads the session messages and switches to chat.
func (s *sessionsModel) openSession(sess session.Session) tea.Cmd {
	s.app.session = &sess
	s.app.screen = screenChat
	s.app.messages = nil
	s.app.streamingText.Reset()
	s.app.chatInput.SetValue("")
	s.app.chatInput.SetHeight(1)
	s.app.closeOverlay()
	return func() tea.Msg {
		msgs, err := s.app.st.Sessions.GetMessages(context.Background(), sess.ID, 200)
		if err != nil {
			return errorMsg{err: err}
		}
		for _, m := range msgs {
			s.app.messages = append(s.app.messages, m)
		}
		return nil
	}
}
