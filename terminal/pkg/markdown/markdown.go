// Package markdown provides terminal-safe markdown rendering.
package markdown

import (
	"strings"
)

// Render converts markdown to terminal-safe formatted text.
func Render(input string, width int) string {
	if width <= 0 {
		width = 80
	}

	lines := strings.Split(input, "\n")
	var out []string

	for _, line := range lines {
		trimmed := strings.TrimSpace(line)

		// Headers
		if strings.HasPrefix(trimmed, "### ") {
			out = append(out, "  "+strings.TrimPrefix(trimmed, "### "))
			continue
		}
		if strings.HasPrefix(trimmed, "## ") {
			out = append(out, "  "+strings.TrimPrefix(trimmed, "## "))
			continue
		}
		if strings.HasPrefix(trimmed, "# ") {
			out = append(out, "  "+strings.TrimPrefix(trimmed, "# "))
			continue
		}

		// Code blocks
		if strings.HasPrefix(trimmed, "```") {
			out = append(out, "───")
			continue
		}

		// Inline code
		trimmed = renderInlineCode(trimmed)

		// Bold
		trimmed = renderBold(trimmed)

		// Italic
		trimmed = renderItalic(trimmed)

		out = append(out, line)
	}

	return strings.Join(out, "\n")
}

func renderInlineCode(s string) string {
	for {
		start := strings.Index(s, "`")
		if start == -1 {
			break
		}
		end := strings.Index(s[start+1:], "`")
		if end == -1 {
			break
		}
		end += start + 1
		code := s[start+1 : end]
		s = s[:start] + code + s[end+1:]
	}
	return s
}

func renderBold(s string) string {
	for {
		start := strings.Index(s, "**")
		if start == -1 {
			break
		}
		end := strings.Index(s[start+2:], "**")
		if end == -1 {
			break
		}
		end += start + 2
		text := s[start+2 : end]
		s = s[:start] + text + s[end+2:]
	}
	return s
}

func renderItalic(s string) string {
	for {
		start := strings.Index(s, "*")
		if start == -1 {
			break
		}
		if start+1 < len(s) && s[start+1] == '*' {
			continue
		}
		end := strings.Index(s[start+1:], "*")
		if end == -1 {
			break
		}
		end += start + 1
		text := s[start+1 : end]
		s = s[:start] + text + s[end+1:]
	}
	return s
}

// StripMarkdown removes markdown formatting for plain text output.
func StripMarkdown(input string) string {
	lines := strings.Split(input, "\n")
	var out []string

	for _, line := range lines {
		trimmed := strings.TrimSpace(line)

		// Headers
		for _, prefix := range []string{"### ", "## ", "# "} {
			if strings.HasPrefix(trimmed, prefix) {
				trimmed = strings.TrimPrefix(trimmed, prefix)
				break
			}
		}

		// Code blocks
		if trimmed == "```" {
			continue
		}

		// Bold markers
		trimmed = strings.ReplaceAll(trimmed, "**", "")
		// Italic markers
		trimmed = strings.ReplaceAll(trimmed, "*", "")

		out = append(out, line)
	}

	return strings.Join(out, "\n")
}
