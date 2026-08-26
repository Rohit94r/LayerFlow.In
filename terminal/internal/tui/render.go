package tui

import (
	"fmt"
	"strings"
	"sync"

	"github.com/charmbracelet/glamour"
	"github.com/charmbracelet/glamour/ansi"
	"github.com/charmbracelet/lipgloss"
)

// ─── LayerFlow custom markdown renderer ─────────────────────────────────────
// Custom dark theme matching LayerFlow's orange/black palette, with dynamic
// width and post-processing for rich output: bar charts, tree graphs, and
// enhanced table rendering.

var (
	rendererMu      sync.Mutex
	rendererWidth   int
	mdRendererLight *glamour.TermRenderer
)

// layerflowStyle is a custom glamour StyleConfig that matches the LayerFlow
// terminal theme: dark background, orange accents for headings and links,
// dim gray for secondary text, green for code.
func layerflowStyle() ansi.StyleConfig {
	s := ansi.StyleConfig{
		Document: ansi.StyleBlock{
			StylePrimitive: ansi.StylePrimitive{BlockPrefix: "\n", BlockSuffix: "\n"},
		},
		BlockQuote: ansi.StyleBlock{
			StylePrimitive: ansi.StylePrimitive{Color: stringPtr("243")},
			Indent:         uintPtr(1),
			IndentToken:    strPtr("│ "),
		},
		Paragraph: ansi.StyleBlock{},
		List: ansi.StyleList{
			StyleBlock:  ansi.StyleBlock{StylePrimitive: ansi.StylePrimitive{}},
			LevelIndent: 2,
		},
		Heading: ansi.StyleBlock{
			StylePrimitive: ansi.StylePrimitive{
				Color:       stringPtr("#F97316"),
				Bold:        boolPtr(true),
				BlockSuffix: "\n",
			},
		},
		H1: ansi.StyleBlock{
			StylePrimitive: ansi.StylePrimitive{
				Prefix:          " ",
				Suffix:          " ",
				Color:           stringPtr("#0B0B0B"),
				BackgroundColor: stringPtr("#F97316"),
				Bold:            boolPtr(true),
			},
		},
		H2: ansi.StyleBlock{
			StylePrimitive: ansi.StylePrimitive{
				Prefix: "## ",
				Color:  stringPtr("#FB923C"),
				Bold:   boolPtr(true),
			},
		},
		H3: ansi.StyleBlock{
			StylePrimitive: ansi.StylePrimitive{
				Prefix: "### ",
				Color:  stringPtr("#FB923C"),
				Bold:   boolPtr(true),
			},
		},
		H4: ansi.StyleBlock{
			StylePrimitive: ansi.StylePrimitive{
				Prefix: "#### ",
				Color:  stringPtr("#A3A3A3"),
				Bold:   boolPtr(true),
			},
		},
		H5: ansi.StyleBlock{
			StylePrimitive: ansi.StylePrimitive{
				Prefix: "##### ",
				Color:  stringPtr("#A3A3A3"),
			},
		},
		H6: ansi.StyleBlock{
			StylePrimitive: ansi.StylePrimitive{
				Prefix: "###### ",
				Color:  stringPtr("#737373"),
			},
		},
		Text:          ansi.StylePrimitive{},
		Strikethrough: ansi.StylePrimitive{CrossedOut: boolPtr(true)},
		Emph:          ansi.StylePrimitive{Italic: boolPtr(true), Color: stringPtr("#A3A3A3")},
		Strong:        ansi.StylePrimitive{Bold: boolPtr(true), Color: stringPtr("#F5F5F5")},
		HorizontalRule: ansi.StylePrimitive{
			Color:  stringPtr("#262626"),
			Format: "\n────────────────────────────────────────\n",
		},
		Item:        ansi.StylePrimitive{BlockPrefix: "• "},
		Enumeration: ansi.StylePrimitive{BlockPrefix: ". "},
		Task: ansi.StyleTask{
			StylePrimitive: ansi.StylePrimitive{},
			Ticked:         "[✓] ",
			Unticked:       "[ ] ",
		},
		Link:      ansi.StylePrimitive{Color: stringPtr("#F97316"), Underline: boolPtr(true)},
		LinkText:  ansi.StylePrimitive{Color: stringPtr("#FB923C"), Bold: boolPtr(true)},
		Image:     ansi.StylePrimitive{Color: stringPtr("#F97316"), Underline: boolPtr(true)},
		ImageText: ansi.StylePrimitive{Color: stringPtr("#FB923C")},
		Code: ansi.StyleBlock{
			StylePrimitive: ansi.StylePrimitive{
				// Foreground-only inline code. Deliberately no background so
				// it sits flat on the near-black screen (a background here
				// renders as a gray chip behind the word).
				Color: stringPtr("#4ADE80"),
			},
		},
		CodeBlock: ansi.StyleCodeBlock{
			StyleBlock: ansi.StyleBlock{
				StylePrimitive: ansi.StylePrimitive{Color: stringPtr("#F5F5F5")},
			},
			Theme: "dracula",
		},
		Table: ansi.StyleTable{
			StyleBlock: ansi.StyleBlock{
				StylePrimitive: ansi.StylePrimitive{},
			},
			CenterSeparator: strPtr("┼"),
			ColumnSeparator: strPtr("│"),
			RowSeparator:    strPtr("─"),
		},
		DefinitionList: ansi.StyleBlock{},
		DefinitionTerm: ansi.StylePrimitive{
			Color: stringPtr("#FB923C"),
			Bold:  boolPtr(true),
		},
		DefinitionDescription: ansi.StylePrimitive{Color: stringPtr("#A3A3A3")},
		HTMLBlock:             ansi.StyleBlock{},
		HTMLSpan:              ansi.StyleBlock{},
	}
	return s
}

func stringPtr(s string) *string { return &s }
func uintPtr(u uint) *uint       { return &u }
func strPtr(s string) *string    { return &s }
func boolPtr(b bool) *bool       { return &b }

// newMarkdownRenderer creates a glamour renderer with the LayerFlow theme
// and the given width.
func newMarkdownRenderer(width int) *glamour.TermRenderer {
	if width < 40 {
		width = 40
	}
	r, _ := glamour.NewTermRenderer(
		glamour.WithStyles(layerflowStyle()),
		glamour.WithWordWrap(width),
	)
	return r
}

// renderMarkdownRich renders markdown with the LayerFlow theme, then
// post-processes the output for rich visual elements:
//   - ```chart blocks → ASCII bar charts with orange coloring
//   - ```tree blocks → tree structure with ├── └── connectors
//   - Tables get enhanced borders (handled by glamour's StyleTable)
func renderMarkdownRich(content string, width int) string {
	if strings.TrimSpace(content) == "" {
		return ""
	}

	rendererMu.Lock()
	if mdRendererLight == nil || rendererWidth != width {
		mdRendererLight = newMarkdownRenderer(width)
		rendererWidth = width
	}
	r := mdRendererLight
	rendererMu.Unlock()

	if r == nil {
		return content
	}

	out, err := r.Render(content)
	if err != nil || strings.TrimSpace(out) == "" {
		return content
	}

	result := strings.TrimRight(out, "\n")

	// Post-process: enhance chart and tree code blocks
	result = enhanceRichBlocks(result, width)

	return result
}

// enhanceRichBlocks finds code blocks tagged as ```chart or ```tree and
// replaces them with visual representations.
func enhanceRichBlocks(input string, width int) string {
	lines := strings.Split(input, "\n")
	var output []string
	i := 0

	for i < len(lines) {
		line := lines[i]

		// Detect chart code block
		if strings.Contains(line, "```chart") {
			block, chartLines := extractCodeBlock(lines, i+1)
			output = append(output, renderBarChart(chartLines, width))
			i = block
			continue
		}

		// Detect tree code block
		if strings.Contains(line, "```tree") {
			block, treeLines := extractCodeBlock(lines, i+1)
			output = append(output, renderTree(treeLines))
			i = block
			continue
		}

		output = append(output, line)
		i++
	}

	return strings.Join(output, "\n")
}

// extractCodeBlock collects lines until the closing ``` and returns the
// next index after the block, plus the content lines.
func extractCodeBlock(lines []string, start int) (nextIdx int, content []string) {
	i := start
	for i < len(lines) {
		if strings.TrimSpace(lines[i]) == "```" {
			return i + 1, content
		}
		content = append(content, lines[i])
		i++
	}
	return i, content
}

// renderBarChart creates an ASCII bar chart from lines like "label: value".
func renderBarChart(lines []string, width int) string {
	if len(lines) == 0 {
		return ""
	}

	type entry struct {
		label string
		value float64
	}

	var entries []entry
	maxVal := 0.0
	maxLabel := 0

	for _, line := range lines {
		parts := strings.SplitN(line, ":", 2)
		if len(parts) != 2 {
			continue
		}
		label := strings.TrimSpace(parts[0])
		var val float64
		fmt.Sscanf(strings.TrimSpace(parts[1]), "%f", &val)
		if val > maxVal {
			maxVal = val
		}
		if len(label) > maxLabel {
			maxLabel = len(label)
		}
		entries = append(entries, entry{label: label, value: val})
	}

	if len(entries) == 0 || maxVal == 0 {
		return ""
	}

	// Calculate bar width
	barArea := width - maxLabel - 12
	if barArea < 10 {
		barArea = 10
	}

	labelStyle := lipgloss.NewStyle().Foreground(ColorMuted).Width(maxLabel)
	barStyle := lipgloss.NewStyle().Foreground(ColorAccent)
	valStyle := lipgloss.NewStyle().Foreground(ColorText).Bold(true)

	var rows []string
	rows = append(rows, styleDim.Render("  ┌ Chart ──────────────────────────────────"))
	for _, e := range entries {
		barLen := int(e.value / maxVal * float64(barArea))
		if barLen < 1 && e.value > 0 {
			barLen = 1
		}
		bar := strings.Repeat("█", barLen)
		rows = append(rows, fmt.Sprintf("  %s │%s %s",
			labelStyle.Render(e.label),
			barStyle.Render(bar),
			valStyle.Render(fmt.Sprintf("%.1f", e.value)),
		))
	}
	rows = append(rows, styleDim.Render("  └──────────────────────────────────────────"))

	return strings.Join(rows, "\n")
}

// renderTree formats tree-indented text with proper ├── └── connectors
// and orange coloring for branch nodes.
func renderTree(lines []string) string {
	if len(lines) == 0 {
		return ""
	}

	branchStyle := lipgloss.NewStyle().Foreground(ColorAccent)
	leafStyle := lipgloss.NewStyle().Foreground(ColorText)
	dimStyle := lipgloss.NewStyle().Foreground(ColorDim)

	var rows []string
	rows = append(rows, dimStyle.Render("  ┌ Tree ─────────────────────────"))
	for _, line := range lines {
		// Detect indentation level (spaces or tabs)
		trimmed := strings.TrimLeft(line, " \t")
		indent := len(line) - len(trimmed)
		level := indent / 2

		var prefix string
		if level == 0 {
			prefix = "  "
		} else {
			prefix = "  " + strings.Repeat("  │  ", level-1)
			if strings.HasPrefix(trimmed, "├") || strings.HasPrefix(trimmed, "└") {
				prefix = ""
			}
		}

		// Color branches vs leaves
		if strings.Contains(trimmed, "/") || strings.HasSuffix(trimmed, ":") {
			rows = append(rows, prefix+branchStyle.Render(trimmed))
		} else if strings.HasPrefix(trimmed, "├") || strings.HasPrefix(trimmed, "└") {
			rows = append(rows, "  "+branchStyle.Render(trimmed))
		} else {
			rows = append(rows, prefix+leafStyle.Render(trimmed))
		}
	}
	rows = append(rows, dimStyle.Render("  └───────────────────────────────"))

	return strings.Join(rows, "\n")
}
