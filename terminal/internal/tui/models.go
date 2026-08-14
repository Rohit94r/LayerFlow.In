package tui

import (
	"context"
	"strings"

	"github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"

	"github.com/layerflow/terminal/internal/cloud"
)

// modelsModel is the Ctrl+L model switcher overlay.
type modelsModel struct {
	app      *App
	models   []cloud.Model
	selected int
	loading  bool
	loaded   bool
}

// openModels shows the model switcher.
func (a *App) openModels() {
	m := &modelsModel{app: a, loading: true}
	a.models = m
	a.overlay = overlayModels

	// Seed with the current model so there's always something selectable.
	m.models = []cloud.Model{{ID: a.st.Model, Available: true}}
	m.load()
}

func (m *modelsModel) load() tea.Cmd {
	return func() tea.Msg {
		models, err := m.app.st.Client.ListModels(context.Background())
		return modelsLoadedMsg{models: models, err: err}
	}
}

// View renders the model list.
func (m *modelsModel) View() string {
	var body []string
	body = append(body, styleHeader.Render("Models"))

	if m.loading {
		body = append(body, "", styleDim.Render("  loading…"))
	} else if len(m.models) == 0 {
		body = append(body, "", styleMuted.Render("  No models advertised by the gateway."))
	} else {
		body = append(body, "")
		for i, mdl := range m.models {
			avail := "✓"
			if !mdl.Available {
				avail = "·"
			}
			line := lipgloss.JoinHorizontal(lipgloss.Left,
				styleDim.Render(avail+" "),
				mdl.ID,
			)
			if i == m.selected {
				body = append(body, styleListSel.Render(line))
			} else {
				body = append(body, line)
			}
		}
		body = append(body, "")
		body = append(body, styleFooter.Render("  enter switch · esc close"))
	}

	content := lipgloss.JoinVertical(lipgloss.Left, body...)
	box := styleCard.Render(content)

	top := (m.app.height - lipgloss.Height(box)) / 2
	if top < 0 {
		top = 0
	}
	return lipgloss.NewStyle().MarginTop(top).Render(box)
}

// Update handles keys for the model switcher.
func (m *modelsModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch key := msg; key.String() {
		case "esc", "ctrl+l":
			m.app.closeOverlay()
			return m.app, nil
		case "up":
			if m.selected > 0 {
				m.selected--
			}
			return m.app, nil
		case "down":
			if m.selected < len(m.models)-1 {
				m.selected++
			}
			return m.app, nil
		case "enter":
			if len(m.models) == 0 {
				return m.app, nil
			}
			m.app.switchModel(strings.TrimSpace(m.models[m.selected].ID))
			m.app.closeOverlay()
			return m.app, nil
		}
	case modelsLoadedMsg:
		m.loading = false
		m.loaded = true
		if msg.err != nil {
			m.app.pushToast("load models: "+msg.err.Error(), toastError)
			return m.app, nil
		}
		if len(msg.models) > 0 {
			// Only offer models the workspace can actually use.
			var avail []cloud.Model
			for _, mdl := range msg.models {
				if mdl.Available {
					avail = append(avail, mdl)
				}
			}
			if len(avail) > 0 {
				m.models = avail
			}
		}
		// Keep selection on the current model if present.
		for i, mdl := range m.models {
			if mdl.ID == m.app.st.Model {
				m.selected = i
				break
			}
		}
		return m.app, nil
	}
	return m.app, nil
}

// switchModel updates the active model in state, config, and the router.
func (a *App) switchModel(model string) {
	if model == "" {
		return
	}
	a.st.Model = model
	a.st.Cfg.Model = model
	a.st.CmdCtx.Model = model
	a.st.Router.SetOverride("model", model)
	if a.session != nil {
		a.session.Model = model
		_ = a.st.Sessions.Update(context.Background(), a.session)
	}
	a.pushToast("Model → "+model, toastSuccess)
}
