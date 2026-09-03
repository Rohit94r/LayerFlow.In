package project

import (
	"os/exec"
	"strings"
)

// ── Language / Build system detection ────────────────────────────

func detectLanguage(configs []ContextFile) string {
	for _, c := range configs {
		switch c.Path {
		case "package.json":
			return "TypeScript / JavaScript"
		case "go.mod":
			return "Go"
		case "requirements.txt", "pyproject.toml":
			return "Python"
		case "Cargo.toml":
			return "Rust"
		case "pom.xml":
			return "Java"
		case "composer.json":
			return "PHP"
		case "Gemfile":
			return "Ruby"
		case "build.gradle", "build.gradle.kts":
			return "Java / Kotlin"
		}
	}
	return "Unknown"
}

func detectBuildSystem(configs []ContextFile) string {
	for _, c := range configs {
		switch c.Path {
		case "package.json":
			return "npm / node"
		case "go.mod":
			return "go"
		case "requirements.txt", "pyproject.toml":
			return "pip / poetry"
		case "Cargo.toml":
			return "cargo"
		case "pom.xml":
			return "maven"
		case "composer.json":
			return "composer"
		case "Gemfile":
			return "bundler"
		case "build.gradle", "build.gradle.kts":
			return "gradle"
		}
	}
	return "Unknown"
}

func detectGit(root string) GitState {
	state := GitState{}
	if out, err := exec.Command("git", "-C", root, "branch", "--show-current").Output(); err == nil {
		state.Branch = strings.TrimSpace(string(out))
	}
	if out, err := exec.Command("git", "-C", root, "rev-parse", "--short", "HEAD").Output(); err == nil {
		state.Commit = strings.TrimSpace(string(out))
	}
	if out, err := exec.Command("git", "-C", root, "status", "--porcelain").Output(); err == nil {
		state.HasUnstaged = len(strings.TrimSpace(string(out))) > 0
	}
	if out, err := exec.Command("git", "-C", root, "remote", "-v").Output(); err == nil {
		for _, line := range strings.Split(string(out), "\n") {
			parts := strings.Fields(line)
			if len(parts) >= 2 {
				state.Remotes = append(state.Remotes, parts[1])
			}
		}
	}
	return state
}

func extractXMLTag(line, tag string) string {
	start := "<" + tag + ">"
	end := "</" + tag + ">"
	begin := strings.Index(line, start)
	if begin < 0 {
		return ""
	}
	begin += len(start)
	endIdx := strings.Index(line[begin:], end)
	if endIdx < 0 {
		return ""
	}
	return line[begin : begin+endIdx]
}