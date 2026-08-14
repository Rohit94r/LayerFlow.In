package tui

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"

	"github.com/layerflow/terminal/internal/session"
)

// sessionsModel is the Ctrl+K sessions list overlay.
type sessionsModel struct {
	app      *App
	sessions []session.Session
	selected int
	loading  bool
	loaded   bool
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
		return sessionsLoadedMsg{sessions: ss, err: err}
	}
}

// View renders the sessions list.
func (s *sessionsModel) View() string {
	var body []string
	body = append(body, styleHeader.Render("Sessions"))

	if s.loading {
		body = append(body, "", styleDim.Render("  loading…"))
	} else if s.loaded && len(s.sessions) == 0 {
		body = append(body, "", styleMuted.Render("  No sessions for this project yet."))
	} else if s.loaded {
		body = append(body, "")
		for i, sess := range s.sessions {
			title := sess.Title
			if strings.TrimSpace(title) == "" {
				title = "(untitled)"
			}
			t := time.UnixMilli(sess.UpdatedAt)
			model := sess.Model
			if model == "" {
				model = "default"
			}
			line := fmt.Sprintf("  %-28s %-10s %s  %s",
				shorten(title, 28),
				styleChip.Render(model),
				styleDim.Render(t.Format("Jan 02 15:04")),
				styleDim.Render(shorten(sess.ID, 12)),
			)
			if i == s.selected {
				body = append(body, styleListSel.Render(line))
			} else {
				body = append(body, line)
			}
		}
		body = append(body, "")
		body = append(body, styleFooter.Render("  enter open · ctrl+d delete · esc close"))
	}

	content := lipgloss.JoinVertical(lipgloss.Left, body...)
	box := styleCard.Render(content)

	top := (s.app.height - lipgloss.Height(box)) / 2
	if top < 0 {
		top = 0
	}
	return lipgloss.NewStyle().MarginTop(top).Render(box)
}

// Update handles keys for the sessions overlay.
func (s *sessionsModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
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
			if s.selected < len(s.sessions)-1 {
				s.selected++
			}
			return s.app, nil
		case "enter":
			if len(s.sessions) == 0 {
				return s.app, nil
			}
			sess := s.sessions[s.selected]
			return s.app, s.openSession(sess)
		case "ctrl+d":
			if len(s.sessions) == 0 {
				return s.app, nil
			}
			sess := s.sessions[s.selected]
			if err := s.app.st.Sessions.Delete(context.Background(), sess.ID); err != nil {
				s.app.pushToast("delete failed: "+err.Error(), toastError)
			} else {
				s.app.pushToast("Deleted session", toastSuccess)
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
		s.sessions = msg.sessions
		s.selected = 0
		return s.app, nil
	}
	return s.app, nil
}

// openSession loads the session messages and switches to chat.
func (s *sessionsModel) openSession(sess session.Session) tea.Cmd {
	s.app.session = &sess
	s.app.screen = screenChat
	s.app.messages = nil
	s.app.streamingText.Reset()
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

func (s *sessionsModel) reload() tea.Cmd {
	s.loading = true
	return s.load()
}
