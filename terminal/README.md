# LayerFlow Terminal (`lf`)

A local-first AI terminal workspace with streaming, tools, memory, and cloud sync.

## Features

- **Keyboard-first TUI** with streaming, markdown, diffs, and approval cards
- **Slash-command router** that never leaks commands to the model
- **Durable sessions** with browser↔terminal continuity
- **Permissioned tool framework** with before-action approval
- **Repository intelligence** with auto-generated project context
- **Hybrid search** (filename + content + git + embeddings + memory)
- **MCP**, **LSP**, **Git**, and **OpenAI-compatible providers**
- **Background daemon** for sync, indexing, and notifications
- **Offline-first** with bidirectional sync

## Installation

### Homebrew (macOS/Linux)
```bash
brew install layerflow/tap/lf
```

### Scoop (Windows)
```bash
scoop install layerflow
```

### Standalone
```bash
curl -sSL https://raw.githubusercontent.com/Rohit94r/LayerFlow.In/main/terminal/scripts/install.sh | bash
```

### Build from source
```bash
git clone https://github.com/Rohit94r/LayerFlow.In
cd LayerFlow.In/terminal
make build
./bin/lf
```

### Building
```bash
go mod tidy   # generates go.sum (required once)
go build ./...
go vet ./...
go test ./...
```

Status: the module builds, vets, and tests cleanly with Go 1.26 (`go build
./...`, `go vet ./...`, `go test -race ./...` all pass). All commands are wired:
`chat`, `run`, `sessions`, `login`, `logout`, `sync`, `models`, `doctor`,
`rescue`, `cost`, `mcp`, `daemon`, `upgrade`.

## Quick Start

```bash
# Login
lf login

# Start chatting
lf chat

# Or run a task
lf run "Fix the auth bug in src/auth.ts"

# Sync with cloud
lf sync

# Open the same session in browser
lf sessions --open
```

## Commands

| Command | Description |
|---------|-------------|
| `lf` | Launch interactive TUI |
| `lf chat [query]` | Start or continue a session |
| `lf run "<task>"` | Non-interactive task agent |
| `lf sessions` | List/restore/branch/delete sessions |
| `lf login` | Device-code OAuth login |
| `lf logout` | Revoke + purge tokens |
| `lf sync` | Force push/pull sync |
| `lf doctor` | Diagnostics |
| `lf cost` | Token & cost usage |
| `lf mcp list/add/remove/health` | MCP server management |
| `lf daemon start/stop/status` | Background daemon |

## Slash Commands

| Command | Description |
|---------|-------------|
| `/help` | Show help |
| `/model` | Switch model |
| `/provider` | Switch provider |
| `/status` | Show routing status |
| `/new` | New session |
| `/sessions` | List sessions |
| `/compact` | Compact history |
| `/memory on\|off\|list\|forget` | Memory management |
| `/search` | Search files |
| `/sync` | Sync with cloud |
| `/cost` | Show cost |
| `/undo` | Undo last edit |
| `/git` | Git operations |
| `/doctor` | Run diagnostics |

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Enter` | Send / confirm |
| `Tab` / `Shift+Tab` | Cycle focus |
| `↑`/`↓` | Scroll history |
| `Ctrl+C` | Cancel → exit |
| `Ctrl+L` | Clear screen |
| `Ctrl+K` | Command palette |
| `y`/`n` | Approve / reject |
| `a` | Always allow |

## Configuration

- **Default**: built-in values
- **User**: `~/.config/layerflow/config.yaml`
- **Project**: `.layerflow/config.yaml`

## Architecture

```
lf (Go binary)
├── cmd/lf          Cobra root + commands
├── internal/
│   ├── app         Application composition
│   ├── tui         Bubble Tea TUI
│   ├── cmds        Slash commands
│   ├── session     Session management
│   ├── providers   LLM providers (OpenAI, Anthropic, Gemini, local)
│   ├── tools       Permissioned tool framework
│   ├── permission  Permission engine
│   ├── memory      Memory engine
│   ├── search      Hybrid search
│   ├── sync        Bidirectional sync
│   ├── git         Git integration
│   ├── lsp         LSP client
│   ├── mcp         MCP client
│   ├── daemon      Background daemon
│   ├── auth        OAuth + keyring
│   ├── config      Layered config
│   ├── storage     SQLite storage
│   └── audit       Audit log
└── pkg/
    ├── oaitype     OpenAI-compatible types
    ├── markdown    Terminal markdown
    └── diff        Diff parser
```

## License

MIT
