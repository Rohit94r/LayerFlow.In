package tui

import (
	"context"
	"strings"

	"github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"

	"github.com/layerflow/terminal/internal/cloud"
)

// modelMeta carries display metadata for a model (context window, cost,
// latency class) derived from known families. This is display-only; the
// authoritative model list and pricing come from the gateway /v1/models.
type modelMeta struct {
	context string
	cost    string
	latency string
}

func metaFor(id string) modelMeta {
	id = strings.ToLower(id)
	switch {
	case strings.Contains(id, "deepseek"):
		if strings.Contains(id, "reason") || strings.Contains(id, "r1") {
			return modelMeta{context: "64K", cost: "$0.55/M", latency: "slow"}
		}
		return modelMeta{context: "128K", cost: "$0.27/M", latency: "fast"}
	case strings.Contains(id, "kimi"):
		if strings.Contains(id, "thinking") {
			return modelMeta{context: "256K", cost: "$2.60/M", latency: "medium"}
		}
		return modelMeta{context: "256K", cost: "$1.25/M", latency: "fast"}
	case strings.Contains(id, "gemini"):
		if strings.Contains(id, "pro") {
			return modelMeta{context: "1M", cost: "$1.25/M", latency: "medium"}
		}
		return modelMeta{context: "1M", cost: "$0.30/M", latency: "fast"}
	case strings.Contains(id, "grok"):
		if strings.Contains(id, "mini") {
			return modelMeta{context: "131K", cost: "$0.30/M", latency: "fast"}
		}
		return modelMeta{context: "131K", cost: "$3.00/M", latency: "medium"}
	case strings.Contains(id, "llama"):
		return modelMeta{context: "128K", cost: "$0.59/M", latency: "fast"}
	case strings.HasPrefix(id, "gpt"):
		if strings.Contains(id, "mini") || strings.Contains(id, "nano") {
			return modelMeta{context: "128K", cost: "$0.15/M", latency: "fast"}
		}
		return modelMeta{context: "128K", cost: "$2.50/M", latency: "fast"}
	case strings.HasPrefix(id, "claude"):
		if strings.Contains(id, "haiku") {
			return modelMeta{context: "200K", cost: "$0.80/M", latency: "fast"}
		}
		return modelMeta{context: "200K", cost: "$3.00/M", latency: "medium"}
	case strings.Contains(id, "o3") || strings.Contains(id, "o4"):
		return modelMeta{context: "128K", cost: "$7.00/M", latency: "slow"}
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

// providerFor guesses the provider label from a model id for display.
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
	case strings.Contains(id, "nvidia") || strings.Contains(id, "nim"):
		return "NVIDIA"
	case strings.Contains(id, "llama"):
		return "Groq"
	case strings.HasPrefix(id, "openrouter"):
		return "OpenRouter"
	}
	return "LayerFlow"
}

// modelsModel is the model switcher overlay with available/unavailable grouping.
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
		avail, unavail := m.groupModels()

		if len(avail) > 0 {
			body = append(body, "", styleDim.Render("AVAILABLE"))
			body = append(body, m.renderGroup(avail)...)
		}
		if len(unavail) > 0 {
			body = append(body, "", styleDim.Render("ADD A KEY TO USE"))
			body = append(body, m.renderGroup(unavail)...)
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

// groupModels splits by available flag from the gateway. The gateway sets
// available=true when a BYOK or platform key exists for the model's provider.
func (m *modelsModel) groupModels() (available, unavailable []cloud.Model) {
	for _, mdl := range m.models {
		if mdl.Available {
			available = append(available, mdl)
		} else {
			unavailable = append(unavailable, mdl)
		}
	}
	return available, unavailable
}

func (m *modelsModel) renderGroup(models []cloud.Model) []string {
	var rows []string
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

		// Badge: "Included" for available managed models, "BYOK" for user keys
		var badge string
		if mdl.Available {
			badge = lipgloss.NewStyle().Foreground(ColorSuccess).Render("✓")
		} else {
			badge = lipgloss.NewStyle().Foreground(ColorDim).Render("○")
		}

		row := lipgloss.JoinHorizontal(lipgloss.Left,
			marker,
			lipgloss.NewStyle().Bold(true).Render(mdl.ID),
			lipgloss.NewStyle().Width(4).Render(""),
			badge,
			lipgloss.NewStyle().Width(6).Render(""),
			styleMuted.Render(providerFor(mdl.ID)),
			lipgloss.NewStyle().Width(8).Render(""),
			styleMuted.Render(meta.context),
			lipgloss.NewStyle().Width(6).Render(""),
			styleMuted.Render(meta.cost),
			lipgloss.NewStyle().Width(10).Render(""),
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

	// Legend at the bottom of the group
	rows = append(rows, styleDim.Render("    ✓ available  ○ add a key to use"))
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
			m.models = msg.models
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
