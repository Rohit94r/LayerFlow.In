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

### macOS / Linux — Homebrew (Recommended on macOS)
```bash
brew install Rohit94r/tap/lf
```

### macOS / Linux — one line
```bash
curl -fsSL https://layerflow.dev/install | bash
```

### Windows — PowerShell one line
```powershell
powershell -ExecutionPolicy Bypass -c "irm https://layerflow.dev/install.ps1 | iex"
```

All install the prebuilt `lf` binary for your OS/arch (checksum-verified).
The installers also add a `layerflow` alias, so `lf` and `layerflow` both
work. The source repo stays private — only prebuilt binaries are published
(see `Rohit94r/layerflow-releases`).

### Build from source (requires repo access)
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
`rescue`, `cost`, `mcp list`, `daemon`, `upgrade`. Edges still to come:
`mcp add/remove/health`, `sessions --open`, and a true `lf upgrade`
self-update (it currently checks GitHub and prints the installer).

## Quick Start

```bash
# Launch the full-screen TUI (home → chat, palette, sessions, models)
lf

# Login — paste a LayerFlow platform key (lf_live_...)
# from the dashboard: API Keys → Platform keys
lf login

# Start chatting (interactive streaming session)
lf chat

# Or run a task
lf run "Fix the auth bug in src/auth.ts"

# Sync with cloud
lf sync

# List persisted sessions for the current project
lf sessions
```

Inside the TUI: press `Enter` on the home screen to start chatting, `Ctrl+P`
for the command palette, `Ctrl+K` for sessions, `Ctrl+M` to switch models,
`Ctrl+T` for activity, and `?` for help. `Esc` goes back, `Ctrl+C` cancels a
stream and quits.

On first launch the TUI asks the gateway which models your workspace can use.
If the configured default (`deepseek-chat`) isn't available — e.g. no DeepSeek
key set under **Settings → Provider keys** — it auto-selects the first
available model (you'll see a `Model → …` toast), so chat works immediately.
`Ctrl+M` lists only usable models.

## Keys

There are two kinds of LayerFlow API keys, managed in the dashboard under
**API Keys**:

- **Platform keys (`lf_live_…`)** — LayerFlow-hosted, billed through your plan,
  like opencode's own key. This is what the CLI authenticates with (`lf login`).
  No provider account needed; LayerFlow routes your requests to the best
  available model.
- **Private own keys (BYOK)** — your own provider accounts (OpenAI, Anthropic,
  Gemini…), encrypted at rest in your workspace vault. LayerFlow prefers these
  when they are configured, so you use your own quota and billing.

## Commands

| Command | Description |
|---------|-------------|
| `lf` | Launch interactive TUI |
| `lf chat [query]` | Start or continue a session |
| `lf run "<task>"` | Non-interactive task agent |
| `lf sessions` | List/restore/branch/delete sessions |
| `lf login` | Login with a LayerFlow platform key |
| `lf logout` | Revoke + purge tokens |
| `lf sync` | Force push/pull sync |
| `lf doctor` | Diagnostics |
| `lf cost` | Token & cost usage |
| `lf mcp list/add/remove/health` | MCP server management |
| `lf daemon start/stop/status` | Background daemon |
| `lf content plan/draft/status/keywords/cron` | Content marketing automation |

### Content automation (`lf content`)

A ranking-safe content-marketing workflow — plan a cadence, generate drafts
from real LayerFlow data (models, cost, version — never invented), analyze
Search Console keywords by opportunity, and get daily reminders via cron.

```bash
# Generate the publishing calendar (3 posts/week: pillar + cluster + data/tutorial)
lf content plan --weeks 4 --per-week 3

# See the whole plan and what's due
lf content status

# Generate a draft from real product data (model registry, costs, version)
lf content draft <slug>
lf content draft --all

# Mark a post published
lf content publish <slug>

# Rank keywords from a Search Console CSV/TSV export by opportunity
lf content keywords --file search-console.csv       # or pipe: cat file | lf content keywords

# Install a daily reminder cron (macOS/Linux; scheduled task on Windows)
lf content cron install --at 09:00
lf content cron status
lf content cron uninstall

# What's due right now (cron invokes this with --quiet)
lf content remind
```

### Fully-automatic daily publishing

Point one daily cron at `lf content autopublish` and it generates, validates,
and (when configured) pushes + publishes the day's posts with **zero manual
steps**:

```bash
# One-time setup: write the config and install a daily autopublish cron.
# Defaults are safe: it stages drafts to content/blog and only marks posts
# published (live) when you pass --live.
lf content autopublish setup --at 09:00 --live

# Or drive it manually / test it:
lf content autopublish
```

The config lives at `~/.config/layerflow/content/config.yaml`:

```yaml
branch: main
auto_push: true        # commit + push automatically
max_per_run: 3         # safety cap so a backlog never floods the repo
repo: /path/to/blog    # optional separate blog repo; empty = LayerFlow content/
draft_dir: content/blog
live: true             # mark posts published after a successful push
```

Every run:

1. **Generates** any missing draft for a due, unpublished post from real
   LayerFlow data (model registry, cost, version — never invented).
2. **Quality-gates** it — a post under the minimum length, missing a required
   section, or containing a placeholder is **rejected and never pushed**.
3. **Writes** it into the configured blog dir.
4. **Pushes** (when `auto_push`) — commits to the branch and pushes to the
   remote, idempotently (re-runs don't fail on an unchanged tree).

A post is only marked **published** after a successful push when `live` is on;
otherwise it is staged for review. The daily cron runs `lf content
autopublish --quiet`, so a clean day emits no output.

> **Why the quality gate matters:** automatic publishing only helps if the
> content clears the bar. Google's spam systems demote sites that mass-publish
> thin, low-value AI content. Generating real, data-backed posts and refusing
> anything below standard is what makes this loop sustainable.

Drafts land in `~/.config/layerflow/content/drafts/<slug>.md`. Content state
lives in `~/.config/layerflow/content/` and is plain JSON — no database.

**Why 3 posts/week and not more:** Google's spam policies (scaled content
abuse, enforced by SpamBrain in the 2024→2026 updates) demote sites that mass
publish thin AI content. A small number of high-value, original, data-backed
posts with an experienced voice compounds authority; publishing thin ones at
volume gets a site deindexed.

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
| `Enter` | Send / submit (home → chat) |
| `Shift+Enter` / `Ctrl+J` | Newline in input |
| `Esc` | Back / close overlay |
| `Ctrl+P` | Command palette |
| `Ctrl+R` | Search files |
| `Ctrl+K` | Sessions |
| `Ctrl+M` | Switch model |
| `Ctrl+T` | Activity |
| `Ctrl+N` | New session |
| `?` | Help |
| `↑` / `↓` | Navigate / recall input history |
| `Ctrl+C` | Cancel stream → close overlay → quit |

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
