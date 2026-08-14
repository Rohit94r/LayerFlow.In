package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

const (
	upgradeRepo    = "Rohit94r/layerflow-releases"
	installURL     = "https://layerflow.dev/install"
	upgradeTimeout = 15 * time.Second
)

// releaseInfo is the subset of the GitHub release payload we care about.
type releaseInfo struct {
	TagName     string `json:"tag_name"`
	Name        string `json:"name"`
	PublishedAt string `json:"published_at"`
	HTMLURL     string `json:"html_url"`
}

// performUpgrade checks the latest released lf version and either reports it
// or triggers a reinstall from the official install script.
func performUpgrade() error {
	client := &http.Client{Timeout: upgradeTimeout}
	req, err := http.NewRequest(http.MethodGet, "https://api.github.com/repos/"+upgradeRepo+"/releases/latest", nil)
	if err != nil {
		return fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("User-Agent", "lf-cli")

	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("could not reach GitHub: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		fmt.Printf("No tagged releases for %s yet.\n", upgradeRepo)
		fmt.Println("Install or update from the official installer:")
		fmt.Println("  curl -sSL " + installURL + " | bash")
		return nil
	}
	if resp.StatusCode >= 400 {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("GitHub release check failed (%d): %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}

	var rel releaseInfo
	if err := json.NewDecoder(resp.Body).Decode(&rel); err != nil {
		return fmt.Errorf("decode release: %w", err)
	}
	if rel.TagName == "" {
		return fmt.Errorf("release returned no tag")
	}

	current := strings.TrimPrefix(strings.TrimSpace(buildVersion), "v")
	latest := strings.TrimPrefix(rel.TagName, "v")

	if current != "" && current != "dev" && current == latest {
		fmt.Printf("You are up to date: lf %s\n", current)
		return nil
	}

	fmt.Printf("A new release is available: %s (you have %s)\n", rel.TagName, orDefault(current, "dev"))
	if rel.PublishedAt != "" {
		fmt.Printf("  published %s\n", rel.PublishedAt)
	}
	fmt.Printf("  %s\n", rel.HTMLURL)
	fmt.Println()
	fmt.Println("To update, run the official installer:")
	fmt.Println("  curl -sSL " + installURL + " | bash")
	return nil
}

func orDefault(s, def string) string {
	if s == "" {
		return def
	}
	return s
}
