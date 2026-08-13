// Package diff provides unified/git diff parser and renderer.
package diff

import (
	"fmt"
	"strings"
)

// FileDiff represents a single file's diff.
type FileDiff struct {
	Path    string
	OldPath string
	Status  string // added, modified, deleted, renamed
	Hunks   []Hunk
}

// Hunk represents a diff hunk.
type Hunk struct {
	OldStart int
	OldCount int
	NewStart int
	NewCount int
	Lines    []DiffLine
}

// DiffLine represents a single diff line.
type DiffLine struct {
	Type    string // context, added, removed, header
	Content string
	OldNum  int
	NewNum  int
}

// Stats represents diff statistics.
type Stats struct {
	FilesChanged int
	Insertions   int
	Deletions    int
}

// Parse parses a unified diff string into structured data.
func Parse(input string) ([]FileDiff, Stats) {
	var files []FileDiff
	stats := Stats{}

	lines := strings.Split(input, "\n")
	var current *FileDiff
	var currentHunk *Hunk
	oldLine, newLine := 0, 0

	for _, line := range lines {
		// File header
		if strings.HasPrefix(line, "diff --git") {
			if current != nil {
				files = append(files, *current)
			}
			parts := strings.Split(line, " b/")
			path := ""
			if len(parts) > 1 {
				path = parts[len(parts)-1]
			}
			current = &FileDiff{Path: path}
			stats.FilesChanged++
			currentHunk = nil
			continue
		}

		// File status
		if strings.HasPrefix(line, "--- ") {
			if current != nil {
				current.OldPath = strings.TrimPrefix(line, "--- ")
				if current.OldPath == "/dev/null" {
					current.Status = "added"
				}
			}
			continue
		}
		if strings.HasPrefix(line, "+++ ") {
			if current != nil {
				path := strings.TrimPrefix(line, "+++ ")
				if path == "/dev/null" {
					current.Status = "deleted"
				} else if current.Status == "" {
					current.Status = "modified"
				}
			}
			continue
		}

		// Hunk header
		if strings.HasPrefix(line, "@@") {
			if current != nil {
				if currentHunk != nil {
					current.Hunks = append(current.Hunks, *currentHunk)
				}
				currentHunk = &Hunk{}
				// Parse @@ -old,count +new,count @@
				parts := strings.Split(line[2:], "@@")
				if len(parts) > 0 {
					hunkInfo := strings.TrimSpace(parts[0])
					fmt.Sscanf(hunkInfo, "-%d,%d +%d,%d", &currentHunk.OldStart, &currentHunk.OldCount, &currentHunk.NewStart, &currentHunk.NewCount)
					oldLine = currentHunk.OldStart
					newLine = currentHunk.NewStart
				}
			}
			continue
		}

		// Diff lines
		if currentHunk != nil && len(line) > 0 {
			dl := DiffLine{Content: line[1:]}
			switch line[0] {
			case '+':
				dl.Type = "added"
				dl.NewNum = newLine
				newLine++
				stats.Insertions++
			case '-':
				dl.Type = "removed"
				dl.OldNum = oldLine
				oldLine++
				stats.Deletions++
			case ' ':
				dl.Type = "context"
				dl.OldNum = oldLine
				dl.NewNum = newLine
				oldLine++
				newLine++
			default:
				continue
			}
			currentHunk.Lines = append(currentHunk.Lines, dl)
		}
	}

	if currentHunk != nil && current != nil {
		current.Hunks = append(current.Hunks, *currentHunk)
	}
	if current != nil {
		files = append(files, *current)
	}

	return files, stats
}

// RenderTerminal renders a diff for terminal display.
func RenderTerminal(files []FileDiff, stats Stats) string {
	var out []string

	for _, f := range files {
		status := "modified"
		switch f.Status {
		case "added":
			status = "new file"
		case "deleted":
			status = "deleted"
		case "renamed":
			status = "renamed"
		}
		out = append(out, fmt.Sprintf("  %s: %s (%s)", f.Path, status, f.OldPath))

		for _, hunk := range f.Hunks {
			out = append(out, fmt.Sprintf("@@ -%d,%d +%d,%d @@", hunk.OldStart, hunk.OldCount, hunk.NewStart, hunk.NewCount))
			for _, line := range hunk.Lines {
				prefix := " "
				content := line.Content
				switch line.Type {
				case "added":
					prefix = "+"
				case "removed":
					prefix = "-"
				}
				out = append(out, prefix+content)
			}
		}
	}

	out = append(out, fmt.Sprintf("\n  %d file(s), +%d, -%d", stats.FilesChanged, stats.Insertions, stats.Deletions))
	return strings.Join(out, "\n")
}
