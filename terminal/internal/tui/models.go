package tui

import (
	"context"
	"strings"

	"github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"

	"github.com/layerflow/terminal/internal/cloud"
)

// modelMeta carries display metadata for a model (context window, cost,
// latency class) derived from known families.
type modelMeta struct {
	context string
	cost    string
	latency string // "fast", "medium", "slow"
}

var modelCatalog = map[string]modelMeta{
	"deepseek-chat":          {context: "128K", cost: "$0.27/M", latency: "fast"},
	"deepseek-reasoner":      {context: "64K", cost: "$0.55/M", latency: "slow"},
	"kimi-k2":                {context: "256K", cost: "$1.25/M", latency: "fast"},
	"kimi-k1.5":              {context: "128K", cost: "$0.60/M", latency: "fast"},
	"gemini-2.5-pro":         {context: "1M", cost: "$1.25/M", latency: "medium"},
	"gemini-2.5-flash":       {context: "1M", cost: "$0.30/M", latency: "fast"},
	"grok-3":                 {context: "131K", cost: "$3.00/M", latency: "medium"},
	"grok-3-mini":            {context: "131K", cost: "$0.30/M", latency: "fast"},
	"llama-3.3-70b-versatile": {context: "128K", cost: "$0.59/M", latency: "fast"},
	"gpt-4o":                 {context: "128K", cost: "$2.50/M", latency: "fast"},
	"gpt-4o-mini":            {context: "128K", cost: "$0.15/M", latency: "fast"},
	"claude-3-5-sonnet":      {context: "200K", cost: "$3.00/M", latency: "medium"},
	"claude-3-7-sonnet":      {context: "200K", cost: "$3.00/M", latency: "medium"},
	"claude-3-5-haiku":       {context: "200K", cost: "$0.80/M", latency: "fast"},
}

func metaFor(id string) modelMeta {
	if m, ok := modelCatalog[strings.ToLower(id)]; ok {
		return m
	}
	switch {
	case strings.Contains(id, "llama"):
		return modelMeta{context: "128K", cost: "varies", latency: "medium"}
	case strings.Contains(id, "qwen"):
		return modelMeta{context: "131K", cost: "varies", latency: "fast"}
	case strings.Contains(id, "openrouter"):
		return modelMeta{context: "varies", cost: "varies", latency: "medium"}
	}
	return modelMeta{context: "varies", cost: "varies", latency: "medium"}
}

// latencyDot renders a color-coded latency indicator.
func latencyDot(class string) string {
	c := ColorWarn
	label := "medium"
	switch class {
	case "fast":
		c = ColorSuccess
		label = "fast"
	case "slow":
		c = ColorError
		label = "slow"
	}
	return lipgloss.NewStyle().Foreground(c).Render("● ") + styleDim.Render(label)
}

// byokPrefixes are providers whose models use the user's own API key.
var byokPrefixes = []string{
	"openai", "anthropic", "gemini", "grok", "openrouter", "deepseek",
}

// providerFor guesses the provider label from a model id.
func providerFor(id string) string {
	id = strings.ToLower(id)
	switch {
	case strings.HasPrefix(id, "gpt") || strings.Contains(id, "openai"):
		return "OpenAI"
	case strings.HasPrefix(id, "claude"):
		return "Anthropic"
	case strings.Contains(id, "gemini"):
		return "Google"
	case strings.Contains(id, "grok"):
		return "xAI"
	case strings.HasPrefix(id, "deepseek"):
		return "DeepSeek"
	case strings.Contains(id, "kimi"):
		return "Moonshot"
	case strings.Contains(id, "nvidia"):
		return "NVIDIA"
	case strings.HasPrefix(id, "openrouter"):
		return "OpenRouter"
	}
	return "LayerFlow"
}

// isByOK reports whether the model is typically served with the user's own key.
func isByOK(id string) bool {
	id = strings.ToLower(id)
	for _, p := range byokPrefixes {
		if strings.HasPrefix(id, p) {
			return true
		}
	}
	return false
}

// modelsModel is the model switcher overlay with managed/byok grouping.
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

// View renders the grouped model list.
func (m *modelsModel) View() string {
	var body []string
	body = append(body, lipgloss.JoinHorizontal(lipgloss.Left,
		styleTitle.Render("Switch model"),
		"  ",
		styleDim.Render("enter select · esc close"),
	))

	if m.loading {
		body = append(body, "", styleDim.Render("  loading…"))
	} else if len(m.models) == 0 {
		body = append(body, "", styleMuted.Render("  No models advertised by the gateway."))
	} else {
		managed, byok := m.groupModels()

		if len(managed) > 0 {
			body = append(body, "", styleDim.Render("MANAGED BY LAYERFLOW"))
			body = append(body, m.renderGroup(managed)...)
		}
		if len(byok) > 0 {
			body = append(body, "", styleDim.Render("MY API KEYS"))
			body = append(body, m.renderGroup(byok)...)
		}
		body = append(body, "")
		body = append(body, styleFooter.Render("  Selection applies to the active session instantly."))
	}

	inner := lipgloss.JoinVertical(lipgloss.Left, body...)
	box := styleModal.Render(inner)

	top := (m.app.height - lipgloss.Height(box)) / 2
	if top < 0 {
		top = 0
	}
	return lipgloss.NewStyle().MarginTop(top).Render(box)
}

// groupModels splits the model list into managed and BYOK groups.
func (m *modelsModel) groupModels() (managed, byok []cloud.Model) {
	for _, mdl := range m.models {
		if isByOK(mdl.ID) {
			byok = append(byok, mdl)
		} else {
			managed = append(managed, mdl)
		}
	}
	return managed, byok
}

func (m *modelsModel) renderGroup(models []cloud.Model) []string {
	var rows []string
	// Header row.
	rows = append(rows, lipgloss.JoinHorizontal(lipgloss.Left,
		styleDim.Render("    model"),
		lipgloss.NewStyle().Width(12).Render(""),
		styleDim.Render("provider"),
		lipgloss.NewStyle().Width(14).Render(""),
		styleDim.Render("context"),
		lipgloss.NewStyle().Width(10).Render(""),
		styleDim.Render("est. cost"),
		lipgloss.NewStyle().Width(16).Render(""),
		styleDim.Render("latency"),
	))

	for i, mdl := range models {
		meta := metaFor(mdl.ID)
		marker := "  "
		if mdl.ID == m.app.st.Model {
			marker = "● "
		}
		row := lipgloss.JoinHorizontal(lipgloss.Left,
			marker,
			lipgloss.NewStyle().Bold(true).Render(mdl.ID),
			lipgloss.NewStyle().Width(12).Render(""),
			styleMuted.Render(providerFor(mdl.ID)),
			lipgloss.NewStyle().Width(14).Render(""),
			styleMuted.Render(meta.context),
			lipgloss.NewStyle().Width(10).Render(""),
			styleMuted.Render(meta.cost),
			lipgloss.NewStyle().Width(16).Render(""),
			latencyDot(meta.latency),
		)
		if i == m.selected {
			rows = append(rows, styleListSel.Render("  "+row))
		} else if mdl.ID == m.app.st.Model {
			rows = append(rows, styleListSelDim.Render("  "+row))
		} else {
			rows = append(rows, "  "+row)
		}
	}
	return rows
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
