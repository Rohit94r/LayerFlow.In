// Package app holds the runtime services the TUI components bind to. The
// LayerFlow backend populates these fields with LayerFlow-backed
// implementations.
package app

import (
	"github.com/layerflow/terminal/internal/ui/agent"
	"github.com/layerflow/terminal/internal/ui/history"
	"github.com/layerflow/terminal/internal/ui/lsp"
	"github.com/layerflow/terminal/internal/ui/message"
	"github.com/layerflow/terminal/internal/ui/permission"
	"github.com/layerflow/terminal/internal/ui/session"
)

type App struct {
	Sessions    session.Service
	Messages    message.Service
	History     history.Service
	Permissions permission.Service

	CoderAgent agent.Service

	LSPClients map[string]*lsp.Client
}
