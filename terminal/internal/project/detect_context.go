package project

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

// configDetectors maps a file name to a function that reads and summarizes it.
var configDetectors = map[string]func(path string) (string, error){
	"package.json":     detectPackageJSON,
	"go.mod":           detectGoMod,
	"requirements.txt": detectRequirementsTXT,
	"pyproject.toml":   detectPyProjectTOML,
	"Cargo.toml":       detectCargoTOML,
	"pom.xml":          detectPomXML,
	"composer.json":    detectComposerJSON,
	"Gemfile":          detectGemfile,
	"build.gradle":     detectBuildGradle,
	"build.gradle.kts": detectBuildGradle,
}

// DetectContext scans a repository root and builds a ProjectContext.
func DetectContext(root string) (*ProjectContext, error) {
	ctx := &ProjectContext{RootPath: root}

	entries, err := os.ReadDir(root)
	if err != nil {
		return nil, fmt.Errorf("read root: %w", err)
	}
	for _, e := range entries {
		name := e.Name()
		if strings.HasPrefix(name, ".") && name != ".gitignore" && name != ".env.example" {
			continue
		}
		if e.IsDir() {
			ctx.FileTree = append(ctx.FileTree, name+"/")
		} else {
			ctx.FileTree = append(ctx.FileTree, name)
		}
	}
	sort.Strings(ctx.FileTree)

	for name, detector := range configDetectors {
		path := filepath.Join(root, name)
		if info, err := os.Stat(path); err == nil && !info.IsDir() {
			summary, err := detector(path)
			if err != nil {
				summary = fmt.Sprintf("(unreadable: %v)", err)
			}
			ctx.ConfigFiles = append(ctx.ConfigFiles, ContextFile{
				Path: name, Type: name, Summary: summary,
			})
		}
	}
	sort.Slice(ctx.ConfigFiles, func(i, j int) bool {
		return ctx.ConfigFiles[i].Path < ctx.ConfigFiles[j].Path
	})

	ctx.Language = detectLanguage(ctx.ConfigFiles)
	ctx.BuildSystem = detectBuildSystem(ctx.ConfigFiles)
	ctx.GitState = detectGit(root)

	return ctx, nil
}

// DetectJSON returns the context as JSON.
func (c *ProjectContext) DetectJSON() (string, error) {
	data, err := json.MarshalIndent(c, "", "  ")
	if err != nil {
		return "", err
	}
	return string(data), nil
}