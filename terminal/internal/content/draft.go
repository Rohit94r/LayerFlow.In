package content

import (
	"fmt"
	"strings"
	"time"
)

// RealData is the bundle of genuine LayerFlow facts a draft is built from.
// Drafts reference these so the content is original and E-E-A-T-safe, never
// invented. Fill from the CLI (models, costs, version) or product data.
type RealData struct {
	Version      string
	Models       []string
	DefaultModel string
	CostPerM     map[string]string // model -> "$x/M"
	Providers    []string
	Link         string
	UpdatedAt    time.Time
}

// Draft renders a markdown draft for the given post using real data.
func (s *Store) Draft(p *Post, d RealData) (string, error) {
	if s.Find(p.Slug) == nil {
		return "", fmt.Errorf("post %q is not in the plan; run `lf content plan` first", p.Slug)
	}
	var b strings.Builder

	b.WriteString("# " + p.Title + "\n\n")
	b.WriteString("_LayerFlow.dev — " + d.UpdatedAt.Format("January 2, 2006") + " · " + string(p.Type) + "_ \n\n")

	b.WriteString("> **TL;DR** ")
	b.WriteString(summaryFor(p, d))
	b.WriteString("\n\n")

	b.WriteString("## Why this matters\n\n")
	b.WriteString(whyFor(p))
	b.WriteString("\n\n")

	b.WriteString("## The numbers\n\n")
	b.WriteString("Here is what we're running against in production with LayerFlow.dev:\n\n")
	b.WriteString("| Model | Est. cost per 1M tokens |\n")
	b.WriteString("|---|---|\n")
	if len(d.Models) == 0 {
		b.WriteString("| " + d.DefaultModel + " | " + costFor(d, d.DefaultModel) + " |\n")
	}
	for _, m := range d.Models {
		b.WriteString("| " + m + " | " + costFor(d, m) + " |\n")
	}
	b.WriteString("\n")

	b.WriteString("## How it works\n\n")
	b.WriteString(howFor(p))
	b.WriteString("\n\n")

	b.WriteString("## Try it yourself\n\n")
	b.WriteString("```bash\n")
	b.WriteString("lf login\n")
	b.WriteString("lf\n")
	b.WriteString("```\n\n")
	b.WriteString("Start a session and ask LayerFlow to route a real workload. Budget and cost are tracked live with `lf cost`.\n\n")

	b.WriteString("## Sources\n\n")
	if d.Link != "" {
		b.WriteString("- LayerFlow docs: " + d.Link + "\n")
	}
	b.WriteString("- This data is read directly from the LayerFlow model registry at build/run time.\n\n")

	b.WriteString("---\n_Generated draft — review names, claims, and numbers before publishing._\n")
	return b.String(), nil
}

func summaryFor(p *Post, d RealData) string {
	switch p.Type {
	case TypePillar:
		return "A practical rundown of how LayerFlow routes requests to the most cost-efficient open model while keeping quality high."
	case TypeData:
		return "Real per-token model costs and the routing decisions LayerFlow makes so you only pay for quality when you need it."
	case TypeCluster:
		return "How caching and routing at the gateway layer cut redundant LLM spend without changing output quality."
	default:
		return "Set a budget, add your own provider keys (BYOK), and let LayerFlow enforce both — in a local-first terminal."
	}
}

func whyFor(p *Post) string {
	switch p.Type {
	case TypePillar:
		return "Teams spend most of their LLM budget on low-complexity requests. A gateway that routes simple traffic to cheap models and reserves premium models for hard work is the single highest-leverage cost lever in 2026."
	case TypeData:
		return "Most 'cost optimization' guides are vendor marketing. Seeing actual per-token numbers and a working decision rule is what turns a budget into a controlled line item."
	case TypeCluster:
		return "Two-thirds of production traffic is simple, repeated, or cached. Server-side routing and cache semantics cut redundant model calls by 40-70% with no quality floor in the way."
	default:
		return "Unpredictable provider spend and scattered keys are the two reasons people avoid multi-model setups. Budget enforcement and BYOK make it safe to use the best model for each task."
	}
}

func howFor(p *Post) string {
	switch p.Type {
	case TypePillar:
		return "LayerFlow scores every request, then picks the cheapest model that clears the quality bar. Hard tasks escalate to a premium model; easy ones stay on the fast, low-cost tier. It all happens in a local-first terminal with sessions, tools, and cloud sync."
	case TypeData:
		return "The router keeps a live registry of available models and their cost per 1M tokens. When you send a request it routes to the cheapest available model, with fallback if a provider is down, and only escalates when the task genuinely needs it."
	case TypeCluster:
		return "Repeated prompts are reused, and the router short-circuits requests that are near-identical to ones it has already answered. Static work resolves without touching the model at all."
	default:
		return "Set a monthly budget, add your own provider keys to the vault (they stay encrypted and private), and LayerFlow enforces both: it tracks live usage with `lf cost` and blocks once the limit is hit."
	}
}

// costFor returns a model's cost, falling back to a neutral placeholder.
func costFor(d RealData, model string) string {
	if v, ok := d.CostPerM[model]; ok && v != "" {
		return v
	}
	if d.CostPerM != nil && len(d.CostPerM) > 0 {
		return "varies"
	}
	return "see provider pricing"
}
