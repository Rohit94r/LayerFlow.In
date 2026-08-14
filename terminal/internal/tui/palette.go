package tui

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"

	"github.com/layerflow/terminal/internal/cmds"
)

// paletteItem is a selectable command entry.
type paletteItem struct {
	name        string
	description string
	action      func() (tea.Model, tea.Cmd)
}

// paletteModel is the Ctrl+P command palette overlay.
type paletteModel struct {
	app      *App
	filter   string
	items    []paletteItem
	selected int
}

// openPalette shows the command palette.
func (a *App) openPalette() {
	p := &paletteModel{app: a}
	p.items = p.buildItems()
	a.palette = p
	a.overlay = overlayPalette
}

func (a *App) updateOverlay(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch a.overlay {
	case overlayPalette:
		return a.palette.Update(msg)
	case overlaySearch:
		return a.search.Update(msg)
	case overlaySessions:
		return a.sessions.Update(msg)
	case overlayModels:
		return a.models.Update(msg)
	case overlayActivity:
		return a.activity.Update(msg)
	case overlayHelp:
		return a.help.Update(msg)
	case overlayLogin:
		return a.login.Update(msg)
	}
	return a, nil
}

func (p *paletteModel) buildItems() []paletteItem {
	items := []paletteItem{
		{name: "New session", description: "Start a fresh chat", action: func() (tea.Model, tea.Cmd) {
			p.close()
			return p.app.startSession()
		}},
		{name: "Search files", description: "Search project files", action: func() (tea.Model, tea.Cmd) {
			p.close()
			p.app.openSearch()
			return p.app, nil
		}},
		{name: "Sessions", description: "List and switch sessions", action: func() (tea.Model, tea.Cmd) {
			p.close()
			p.app.openSessions()
			return p.app, nil
		}},
		{name: "Models", description: "Switch model", action: func() (tea.Model, tea.Cmd) {
			p.close()
			p.app.openModels()
			return p.app, nil
		}},
		{name: "Activity", description: "Git and sync status", action: func() (tea.Model, tea.Cmd) {
			p.close()
			p.app.openActivity()
			return p.app, nil
		}},
	}

	for _, c := range cmds.ListCommands() {
		c := c
		items = append(items, paletteItem{
			name:        "/" + c.Name,
			description: c.Description,
			action: func() (tea.Model, tea.Cmd) {
				p.close()
				p.app.screen = screenChat
				if err := p.app.ensureSession(); err == nil {
					p.app.runSlashCommand("/" + c.Name)
				}
				return p.app, nil
			},
		})
	}
	return items
}

func (p *paletteModel) filtered() []paletteItem {
	if p.filter == "" {
		return p.items
	}
	lower := strings.ToLower(p.filter)
	var out []paletteItem
	for _, it := range p.items {
		if strings.Contains(strings.ToLower(it.name), lower) ||
			strings.Contains(strings.ToLower(it.description), lower) {
			out = append(out, it)
		}
	}
	return out
}

// View implements the overlay view.
func (p *paletteModel) View() string {
	items := p.filtered()
	if len(items) == 0 {
		return styleCard.Render(
			styleDim.Render("  No matching commands"),
		)
	}

	var lines []string
	for i, it := range items {
		label := fmt.Sprintf("  %-16s %s", it.name, styleDim.Render(it.description))
		if i == p.selected {
			lines = append(lines, styleListSel.Render(label))
		} else {
			lines = append(lines, label)
		}
	}

	content := lipgloss.JoinVertical(lipgloss.Left,
		lipgloss.NewStyle().Border(lipgloss.RoundedBorder()).
			BorderForeground(ColorAccent).
			Padding(0, 1).
			Render("🔍 "+p.filter+"▌"),
		"",
		strings.Join(lines, "\n"),
	)
	box := styleCardAccent.Render(content)

	top := (p.app.height - lipgloss.Height(box)) / 2
	if top < 0 {
		top = 0
	}
	return lipgloss.NewStyle().MarginTop(top).Render(box)
}

// Update implements the overlay update loop.
func (p *paletteModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch key := msg.(type) {
	case tea.KeyMsg:
		switch key.String() {
		case "esc", "ctrl+p":
			p.close()
			return p.app, nil
		case "up":
			if p.selected > 0 {
				p.selected--
			}
			return p.app, nil
		case "down":
			if p.selected < len(p.filtered())-1 {
				p.selected++
			}
			return p.app, nil
		case "enter":
			items := p.filtered()
			if p.selected >= 0 && p.selected < len(items) {
				return items[p.selected].action()
			}
			return p.app, nil
		case "backspace":
			if len(p.filter) > 0 {
				p.filter = p.filter[:len(p.filter)-1]
				p.selected = 0
			}
			return p.app, nil
		default:
			if len(key.String()) == 1 {
				p.filter += key.String()
				p.selected = 0
			}
			return p.app, nil
		}
	}
	return p.app, nil
}

func (p *paletteModel) close() {
	p.app.closeOverlay()
}
