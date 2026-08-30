package tui

import (
	"context"
	"fmt"
	"strings"

	"github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"

	"github.com/layerflow/terminal/internal/search"
)

// searchGroupTitle maps a search source to a UI group label.
func searchGroupTitle(s search.Source) string {
	switch s {
	case search.Session:
		return "Chats"
	case search.Memory:
		return "Memories"
	case search.Content, search.Filename:
		return "Files"
	case search.Project:
		return "Project"
	case search.Git:
		return "Git history"
	case search.Embedding:
		return "Semantic"
	}
	return "Results"
}

// searchModel is the global search overlay with grouped results.
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

// View renders the search overlay, results grouped by source.
func (s *searchModel) View() string {
	searchLine := lipgloss.JoinHorizontal(lipgloss.Left,
		styleDim.Render("🔍"),
		" ",
		lipgloss.NewStyle().Foreground(ColorAccent).Bold(true).Render(s.query+"▍"),
	)

	var body []string
	body = append(body, searchLine)
	body = append(body, lipgloss.NewStyle().Foreground(ColorBorder).Render(strings.Repeat("─", s.rowWidth()+4)))

	if s.searching {
		body = append(body, "", styleDim.Render("  searching…"))
	} else if s.searched {
		if len(s.hits) == 0 {
			body = append(body, "", styleMuted.Render("  No results for “"+s.query+"”."))
		} else {
			groups := s.grouped()
			for _, g := range groups {
				body = append(body, "", renderSectionLabel(g.title))
				for _, h := range g.hits {
					body = append(body, s.renderHit(h))
				}
			}
		}
	} else {
		body = append(body, "", styleMuted.Render("  Search chats, memories, files, agents and history. Type then press Enter."))
	}
	body = append(body, "", styleFooter.Render("  enter search · ↑↓ navigate · esc close"))

	inner := lipgloss.JoinVertical(lipgloss.Left, body...)
	box := styleModal.Render(inner)

	top := (s.app.height - lipgloss.Height(box)) / 2
	if top < 0 {
		top = 0
	}
	return lipgloss.NewStyle().MarginTop(top).Render(box)
}

// group holds hits sharing a source.
type group struct {
	title string
	hits  []search.Hit
}

// grouped splits hits into ordered groups by source.
func (s *searchModel) grouped() []group {
	var out []group
	index := map[search.Source]int{}
	for _, h := range s.hits {
		t := searchGroupTitle(h.Source)
		i, ok := index[h.Source]
		if !ok {
			i = len(out)
			index[h.Source] = i
			out = append(out, group{title: t})
		}
		out[i].hits = append(out[i].hits, h)
	}
	return out
}

func (s *searchModel) rowWidth() int {
	w := 40
	for _, h := range s.hits {
		n := len(h.Path) + 8 + len(shorten(strings.TrimSpace(h.Snippet), 40))
		if n > w {
			w = n
		}
	}
	if w > s.app.width-10 {
		w = s.app.width - 10
	}
	return w
}

func (s *searchModel) renderHit(h search.Hit) string {
	line := fmt.Sprintf("  %-7s %s:%d  %s",
		styleChip.Render(h.Source.String()),
		h.Path,
		h.Line,
		styleDim.Render(shorten(strings.TrimSpace(h.Snippet), 40)),
	)
	if s.hits[s.selected].Path == h.Path && s.hits[s.selected].Line == h.Line {
		return styleListSel.Render(line)
	}
	return line
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
