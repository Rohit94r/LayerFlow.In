package tui

import (
	"fmt"
	"strings"

	bkey "github.com/charmbracelet/bubbles/key"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"

	"github.com/layerflow/terminal/internal/cmds"
)

// slashItem is a selectable command entry.
type slashItem struct {
	name        string
	description string
	action      func() (tea.Model, tea.Cmd)
}

// slashPopup is the VS-Code-style command palette shown when the user types
// "/" (or presses Ctrl+P). Fuzzy filtered, arrow-navigated, Esc to close.
type slashPopup struct {
	app      *App
	filter   string
	items    []slashItem
	selected int
}

// openSlashPopup shows the command palette.
func (a *App) openSlashPopup() {
	p := &slashPopup{app: a}
	p.items = p.buildItems()
	a.slash = p
	a.overlay = overlaySlash
}

// buildItems assembles the palette entries: product actions first, then the
// full slash command set (deduped against the curated entries).
func (p *slashPopup) buildItems() []slashItem {
	app := p.app
	items := []slashItem{
		{name: "/new", description: "New chat", action: func() (tea.Model, tea.Cmd) {
			p.close()
			return app.startSession()
		}},
		{name: "/models", description: "Switch model", action: func() (tea.Model, tea.Cmd) {
			p.close()
			return app, app.openModels()
		}},
		{name: "/sessions", description: "Recent chats", action: func() (tea.Model, tea.Cmd) {
			p.close()
			app.openSessions()
			return app, nil
		}},
		{name: "/search", description: "Search memory, chats & files", action: func() (tea.Model, tea.Cmd) {
			p.close()
			app.openSearch()
			return app, nil
		}},
		{name: "/improve", description: "Improve the current prompt", action: func() (tea.Model, tea.Cmd) {
			p.close()
			return app.handleImprove()
		}},
		{name: "/activity", description: "Git, sync & token usage", action: func() (tea.Model, tea.Cmd) {
			p.close()
			app.openActivity()
			return app, app.activity.refresh()
		}},
		{name: "/help", description: "Help & shortcuts", action: func() (tea.Model, tea.Cmd) {
			p.close()
			app.openHelp()
			return app, nil
		}},
	}

	seen := map[string]bool{}
	for _, it := range items {
		seen[it.name] = true
	}

	for _, c := range cmds.ListCommands() {
		c := c
		name := "/" + c.Name
		if seen[name] {
			continue
		}
		seen[name] = true
		items = append(items, slashItem{
			name:        name,
			description: c.Description,
			action: func() (tea.Model, tea.Cmd) {
				p.close()
				app.screen = screenChat
				if err := app.ensureSession(); err == nil {
					app.runSlashCommand(name)
				}
				return app, nil
			},
		})
	}
	return items
}

// fuzzyMatch reports whether needle is a subsequence of hay (case-insensitive),
// enabling VS-Code-style fuzzy filtering like "mo" → /models.
func fuzzyMatch(hay, needle string) bool {
	hay = strings.ToLower(hay)
	needle = strings.ToLower(needle)
	if needle == "" {
		return true
	}
	i := 0
	for j := 0; j < len(hay) && i < len(needle); j++ {
		if hay[j] == needle[i] {
			i++
		}
	}
	return i == len(needle)
}

// fuzzyScore ranks a match so exact/prefix name matches float to the top.
func fuzzyScore(name, desc, needle string) int {
	name = strings.ToLower(strings.TrimPrefix(name, "/"))
	desc = strings.ToLower(desc)
	needle = strings.ToLower(needle)
	if needle == "" {
		return 0
	}
	if strings.HasPrefix(name, needle) {
		return 400
	}
	if strings.Contains(name, needle) {
		return 200
	}
	if strings.Contains(desc, needle) {
		return 50
	}
	return 0
}

func (p *slashPopup) filtered() []slashItem {
	if p.filter == "" {
		return p.items
	}
	type scored struct {
		item  slashItem
		score int
	}
	var out []scored
	for _, it := range p.items {
		hay := it.name + " " + it.description
		if fuzzyMatch(hay, p.filter) {
			out = append(out, scored{item: it, score: fuzzyScore(it.name, it.description, p.filter)})
		}
	}
	// Stable sort by descending score (ties keep the original order).
	for i := 1; i < len(out); i++ {
		for j := i; j > 0 && out[j].score > out[j-1].score; j-- {
			out[j], out[j-1] = out[j-1], out[j]
		}
	}
	items := make([]slashItem, 0, len(out))
	for _, s := range out {
		items = append(items, s.item)
	}
	return items
}

// maxSlashItems caps how many rows the palette shows at once, keeping the
// popup compact (VS Code style) on short terminals.
const maxSlashItems = 9

// View renders the centered command palette.
func (p *slashPopup) View() string {
	items := p.filtered()
	if len(items) == 0 {
		return p.renderBox(styleMuted.Render("  No matching commands"), false, 0)
	}

	// Keep the selection centered within a fixed-size window.
	start := p.selected - maxSlashItems/2
	if start < 0 {
		start = 0
	}
	if start > len(items)-maxSlashItems {
		start = len(items) - maxSlashItems
		if start < 0 {
			start = 0
		}
	}
	end := start + maxSlashItems
	if end > len(items) {
		end = len(items)
	}

	var lines []string
	for i, it := range items[start:end] {
		name := lipgloss.NewStyle().Bold(true).Render(it.name)
		desc := styleDim.Render(it.description)
		row := lipgloss.JoinHorizontal(lipgloss.Left, "  ", name, "  ", desc)
		if i+start == p.selected {
			rows := lipgloss.NewStyle().Width(p.maxRowWidth()).Render(row)
			lines = append(lines, styleListSel.Render("  "+rows))
		} else {
			lines = append(lines, lipgloss.NewStyle().Padding(0, 2).Render(
				lipgloss.JoinHorizontal(lipgloss.Left, name, "  ", desc),
			))
		}
	}
	if len(items) > end {
		lines = append(lines, styleDim.Render(fmt.Sprintf("  … %d more", len(items)-end)))
	}
	content := strings.Join(lines, "\n")
	return p.renderBox(content, true, len(items))
}

func (p *slashPopup) maxRowWidth() int {
	w := 0
	for _, it := range p.filtered() {
		n := len(it.name) + 2 + len(it.description) + 2
		if n > w {
			w = n
		}
	}
	return w
}

func (p *slashPopup) renderBox(content string, withFooter bool, count int) string {
	var body []string
	body = append(body, lipgloss.JoinHorizontal(lipgloss.Left,
		styleDim.Render("/"),
		lipgloss.NewStyle().Foreground(ColorAccent).Bold(true).Render(p.filter+"▍"),
	))
	body = append(body, lipgloss.NewStyle().Foreground(ColorBorder).Render(strings.Repeat("─", p.maxRowWidth()+4)))
	body = append(body, content)
	if withFooter {
		footer := []string{
			styleDim.Render("↑↓ navigate"), "  ",
			styleDim.Render("enter select"), "  ",
			styleDim.Render("esc close"),
		}
		if count > 0 {
			footer = append(footer, "  ", styleDim.Render(fmt.Sprintf("%d results", count)))
		}
		body = append(body, "", lipgloss.JoinHorizontal(lipgloss.Left, footer...))
	}
	inner := lipgloss.JoinVertical(lipgloss.Left, body...)
	box := styleModal.Render(inner)

	top := (p.app.height - lipgloss.Height(box)) / 2
	if top < 0 {
		top = 0
	}
	return lipgloss.NewStyle().MarginTop(top).Render(box)
}

// Update implements the overlay update loop.
func (p *slashPopup) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.KeyMsg:
		key := msg
		switch {
		case bkey.Matches(key, p.app.keymap.Back), key.String() == "ctrl+p":
			p.close()
			return p.app, nil
		case bkey.Matches(key, p.app.keymap.Up):
			if p.selected > 0 {
				p.selected--
			}
			return p.app, nil
		case bkey.Matches(key, p.app.keymap.Down):
			if p.selected < len(p.filtered())-1 {
				p.selected++
			}
			return p.app, nil
		case bkey.Matches(key, p.app.keymap.Submit):
			items := p.filtered()
			if p.selected >= 0 && p.selected < len(items) {
				return items[p.selected].action()
			}
			return p.app, nil
		case key.String() == "tab":
			// Autocomplete the filter to the selected command's name.
			items := p.filtered()
			if len(items) > 0 && p.selected >= 0 && p.selected < len(items) {
				p.filter = strings.TrimPrefix(items[p.selected].name, "/")
				p.selected = 0
			}
			return p.app, nil
		case key.String() == "backspace":
			if len(p.filter) > 0 {
				p.filter = p.filter[:len(p.filter)-1]
				p.selected = 0
			} else {
				p.close()
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

func (p *slashPopup) close() {
	// Leaving the palette shouldn't leave a stray "/" in the home input.
	if p.app.screen == screenHome {
		p.app.home.SetValue("")
	}
	p.app.closeOverlay()
}
