package tui

import "github.com/charmbracelet/bubbles/key"

// KeyMap holds the global key bindings for the TUI.
type KeyMap struct {
	Home       key.Binding
	Submit     key.Binding
	Newline    key.Binding
	Back       key.Binding
	Palette    key.Binding
	Search     key.Binding
	Sessions   key.Binding
	Models     key.Binding
	Activity   key.Binding
	Help       key.Binding
	NewSession key.Binding
	Quit       key.Binding
	Up         key.Binding
	Down       key.Binding
	Tab        key.Binding
	ShiftTab   key.Binding
	Delete     key.Binding
	Improve    key.Binding
}

// DefaultKeyMap returns the default set of bindings.
func DefaultKeyMap() KeyMap {
	return KeyMap{
		Home:       key.NewBinding(key.WithKeys("esc", "ctrl+h"), key.WithHelp("esc", "home")),
		Submit:     key.NewBinding(key.WithKeys("enter"), key.WithHelp("enter", "send")),
		Newline:    key.NewBinding(key.WithKeys("shift+enter", "ctrl+j"), key.WithHelp("S-enter", "newline")),
		Back:       key.NewBinding(key.WithKeys("esc"), key.WithHelp("esc", "back")),
		Palette:    key.NewBinding(key.WithKeys("ctrl+p"), key.WithHelp("ctrl+p", "palette")),
		Search:     key.NewBinding(key.WithKeys("ctrl+r"), key.WithHelp("ctrl+r", "search")),
		Sessions:   key.NewBinding(key.WithKeys("ctrl+k"), key.WithHelp("ctrl+k", "sessions")),
		Models:     key.NewBinding(key.WithKeys("ctrl+m"), key.WithHelp("ctrl+m", "models")),
		Activity:   key.NewBinding(key.WithKeys("ctrl+t"), key.WithHelp("ctrl+t", "activity")),
		Help:       key.NewBinding(key.WithKeys("?"), key.WithHelp("?", "help")),
		NewSession: key.NewBinding(key.WithKeys("ctrl+n"), key.WithHelp("ctrl+n", "new")),
		Quit:       key.NewBinding(key.WithKeys("ctrl+c"), key.WithHelp("ctrl+c", "quit")),
		Up:         key.NewBinding(key.WithKeys("up", "k"), key.WithHelp("↑/k", "up")),
		Down:       key.NewBinding(key.WithKeys("down", "j"), key.WithHelp("↓/j", "down")),
		Tab:        key.NewBinding(key.WithKeys("tab"), key.WithHelp("tab", "next")),
		ShiftTab:   key.NewBinding(key.WithKeys("shift+tab"), key.WithHelp("S-tab", "prev")),
		Delete:     key.NewBinding(key.WithKeys("ctrl+d", "backspace"), key.WithHelp("⌫", "delete")),
		Improve:    key.NewBinding(key.WithKeys("ctrl+i"), key.WithHelp("ctrl+i", "improve")),
	}
}
