package tui

import (
	"context"
	"fmt"
	"strings"

	"github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"

	"github.com/layerflow/terminal/internal/search"
)

// searchModel is the Ctrl+R file search overlay.
type searchModel struct {
	app       *App
	query     string
	hits      []search.Hit
	selected  int
	searching bool
	searched  bool
}

// openSearch shows the search overlay.
func (a *App) openSearch() {
	a.search = &searchModel{app: a}
	a.overlay = overlaySearch
}

func (s *searchModel) run() tea.Cmd {
	s.searching = true
	s.searched = false
	return func() tea.Msg {
		query := s.query
		hits, err := s.app.st.Search.Search(context.Background(), query, search.Opts{Limit: 30, Project: s.app.st.Project})
		return searchResultsMsg{query: query, hits: hits, err: err}
	}
}

// View renders the search overlay.
func (s *searchModel) View() string {
	searchLine := lipgloss.NewStyle().Border(lipgloss.RoundedBorder()).
		BorderForeground(ColorAccent).
		Padding(0, 1).
		Render("🔍 " + s.query + "▌")

	var body []string
	body = append(body, searchLine)

	if s.searching {
		body = append(body, "", styleDim.Render("  searching…"))
	} else if s.searched {
		if len(s.hits) == 0 {
			body = append(body, "", styleMuted.Render("  No results for "+s.query))
		} else {
			body = append(body, "")
			for i, h := range s.hits {
				label := fmt.Sprintf("  %-9s %s:%d  %s",
					styleChip.Render(h.Source.String()),
					h.Path,
					h.Line,
					styleDim.Render(shorten(strings.TrimSpace(h.Snippet), 40)),
				)
				if i == s.selected {
					body = append(body, styleListSel.Render(label))
				} else {
					body = append(body, label)
				}
			}
		}
	} else {
		body = append(body, "", styleMuted.Render("  Type a query and press Enter to search project files."))
	}

	content := lipgloss.JoinVertical(lipgloss.Left, body...)
	box := styleCardAccent.Render(content)

	top := (s.app.height - lipgloss.Height(box)) / 2
	if top < 0 {
		top = 0
	}
	return lipgloss.NewStyle().MarginTop(top).Render(box)
}

// Update handles keys for the search overlay.
func (s *searchModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch key := msg; key.String() {
		case "esc", "ctrl+r":
			s.app.closeOverlay()
			return s.app, nil
		case "enter":
			if s.query != "" {
				return s.app, s.run()
			}
			return s.app, nil
		case "up":
			if s.selected > 0 {
				s.selected--
			}
			return s.app, nil
		case "down":
			if s.selected < len(s.hits)-1 {
				s.selected++
			}
			return s.app, nil
		case "backspace":
			if len(s.query) > 0 {
				s.query = s.query[:len(s.query)-1]
				s.searched = false
			}
			return s.app, nil
		default:
			if len(key.String()) == 1 {
				s.query += key.String()
				s.searched = false
			}
			return s.app, nil
		}
	case searchResultsMsg:
		s.searching = false
		s.searched = true
		s.hits = msg.hits
		s.selected = 0
		return s.app, nil
	}
	return s.app, nil
}
