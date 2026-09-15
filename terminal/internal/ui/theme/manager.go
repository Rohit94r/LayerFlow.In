package theme

import (
	"fmt"
	"slices"
	"strings"
	"sync"

	"github.com/alecthomas/chroma/v2/styles"
)

// Persistence callback — set by the application layer to persist theme choice.
var persistCallback func(name string) error

// SetPersistenceCallback registers a function that persists the theme name
// (e.g., to LayerFlow's config). Called on theme switch.
func SetPersistenceCallback(fn func(string) error) {
	persistCallback = fn
}

// Manager handles theme registration, selection, and retrieval.
// It maintains a registry of available themes and tracks the currently active theme.
type Manager struct {
	themes      map[string]Theme
	currentName string
	mu          sync.RWMutex
}

// Global instance of the theme manager
var globalManager = &Manager{
	themes:      make(map[string]Theme),
	currentName: "",
}

// RegisterTheme adds a new theme to the registry.
// If this is the first theme registered, it becomes the default.
func RegisterTheme(name string, theme Theme) {
	globalManager.mu.Lock()
	defer globalManager.mu.Unlock()

	globalManager.themes[name] = theme

	// The LayerFlow brand theme is the default. It wins even when another
	// file happens to register first (registration order follows the order
	// files are presented to the compiler, which is not guaranteed to be
	// alphabetical).
	switch {
	case name == "layerflow":
		globalManager.currentName = "layerflow"
	case globalManager.currentName == "":
		globalManager.currentName = name
	}
}

// SetTheme changes the active theme to the one with the specified name.
// Returns an error if the theme doesn't exist.
func SetTheme(name string) error {
	globalManager.mu.Lock()
	defer globalManager.mu.Unlock()

	delete(styles.Registry, "charm")
	if _, exists := globalManager.themes[name]; !exists {
		return fmt.Errorf("theme '%s' not found", name)
	}

	globalManager.currentName = name
	return updateConfigTheme(name)
}

// CurrentTheme returns the currently active theme.
// If no theme is set, it returns nil.
func CurrentTheme() Theme {
	globalManager.mu.RLock()
	defer globalManager.mu.RUnlock()

	if globalManager.currentName == "" {
		return nil
	}

	return globalManager.themes[globalManager.currentName]
}

// CurrentThemeName returns the name of the currently active theme.
func CurrentThemeName() string {
	globalManager.mu.RLock()
	defer globalManager.mu.RUnlock()

	return globalManager.currentName
}

// AvailableThemes returns a list of all registered theme names.
func AvailableThemes() []string {
	globalManager.mu.RLock()
	defer globalManager.mu.RUnlock()

	names := make([]string, 0, len(globalManager.themes))
	for name := range globalManager.themes {
		names = append(names, name)
	}
	slices.SortFunc(names, func(a, b string) int {
		switch {
		case a == "layerflow":
			return -1
		case b == "layerflow":
			return 1
		case a == "opencode":
			return -1
		case b == "opencode":
			return 1
		}
		return strings.Compare(a, b)
	})
	return names
}

// GetTheme returns a specific theme by name.
// Returns nil if the theme doesn't exist.
func GetTheme(name string) Theme {
	globalManager.mu.RLock()
	defer globalManager.mu.RUnlock()

	return globalManager.themes[name]
}

// updateConfigTheme persists the theme choice via the registered callback.
func updateConfigTheme(themeName string) error {
	if persistCallback != nil {
		return persistCallback(themeName)
	}
	return nil
}
