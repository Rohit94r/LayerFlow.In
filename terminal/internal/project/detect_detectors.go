package project

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"
)

// ── Config file detectors ────────────────────────────────────────

func detectPackageJSON(path string) (string, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	var pkg struct {
		Name    string            `json:"name"`
		Version string            `json:"version"`
		Scripts map[string]string `json:"scripts"`
		Deps    map[string]string `json:"dependencies"`
		DevDeps map[string]string `json:"devDependencies"`
	}
	if err := json.Unmarshal(data, &pkg); err != nil {
		return "", err
	}
	parts := []string{}
	if pkg.Name != "" {
		parts = append(parts, fmt.Sprintf("name=%s", pkg.Name))
	}
	if pkg.Version != "" {
		parts = append(parts, fmt.Sprintf("version=%s", pkg.Version))
	}
	parts = append(parts, fmt.Sprintf("deps=%d", len(pkg.Deps)+len(pkg.DevDeps)))
	parts = append(parts, fmt.Sprintf("scripts=%d", len(pkg.Scripts)))
	return strings.Join(parts, " · "), nil
}

func detectGoMod(path string) (string, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	lines := strings.Split(string(data), "\n")
	var module string
	var deps int
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "module ") {
			module = strings.TrimPrefix(line, "module ")
		}
		if strings.Contains(line, "\t") && !strings.HasPrefix(line, "//") &&
			!strings.HasPrefix(line, "exclude") && !strings.HasPrefix(line, "replace") {
			parts := strings.Fields(line)
			if len(parts) >= 2 && !strings.Contains(parts[0], "(") && !strings.Contains(parts[0], ")") {
				deps++
			}
		}
	}
	summary := fmt.Sprintf("module=%s · deps=%d", module, deps)
	if module == "" {
		summary = fmt.Sprintf("deps=%d", deps)
	}
	return summary, nil
}

func detectRequirementsTXT(path string) (string, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	lines := strings.Split(string(data), "\n")
	var count int
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line != "" && !strings.HasPrefix(line, "#") && !strings.HasPrefix(line, "--") {
			count++
		}
	}
	return fmt.Sprintf("requirements=%d", count), nil
}

func detectPyProjectTOML(path string) (string, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	content := string(data)
	var name string
	for _, line := range strings.Split(content, "\n") {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "name = ") {
			name = strings.Trim(strings.TrimPrefix(line, "name = "), "\"")
		}
	}
	return fmt.Sprintf("project=%s", name), nil
}

func detectCargoTOML(path string) (string, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	content := string(data)
	var name, edition string
	for _, line := range strings.Split(content, "\n") {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "name = ") {
			name = strings.Trim(strings.TrimPrefix(line, "name = "), "\"")
		}
		if strings.HasPrefix(line, "edition = ") {
			edition = strings.Trim(strings.TrimPrefix(line, "edition = "), "\"")
		}
	}
	parts := []string{}
	if name != "" {
		parts = append(parts, fmt.Sprintf("crate=%s", name))
	}
	if edition != "" {
		parts = append(parts, fmt.Sprintf("edition=%s", edition))
	}
	return strings.Join(parts, " · "), nil
}

func detectPomXML(path string) (string, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	content := string(data)
	var artifact, group string
	for _, line := range strings.Split(content, "\n") {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "<artifactId>") {
			artifact = extractXMLTag(line, "artifactId")
		}
		if strings.HasPrefix(line, "<groupId>") {
			group = extractXMLTag(line, "groupId")
		}
	}
	return fmt.Sprintf("artifact=%s · group=%s", artifact, group), nil
}

func detectComposerJSON(path string) (string, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	var pkg struct {
		Name    string            `json:"name"`
		Require map[string]string `json:"require"`
	}
	if err := json.Unmarshal(data, &pkg); err != nil {
		return "", err
	}
	return fmt.Sprintf("name=%s · deps=%d", pkg.Name, len(pkg.Require)), nil
}

func detectGemfile(path string) (string, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	lines := strings.Split(string(data), "\n")
	var count int
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "gem ") {
			count++
		}
	}
	return fmt.Sprintf("gems=%d", count), nil
}

func detectBuildGradle(path string) (string, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	content := string(data)
	var hasPlugins bool
	for _, line := range strings.Split(content, "\n") {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "plugins {") || strings.HasPrefix(line, "apply plugin:") {
			hasPlugins = true
		}
	}
	summary := ""
	if hasPlugins {
		summary = "has plugins"
	}
	return summary, nil
}