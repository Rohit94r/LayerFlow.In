package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"time"

	"github.com/layerflow/terminal/internal/session"
	"github.com/layerflow/terminal/internal/storage"
	"github.com/layerflow/terminal/internal/sync"
)

// rescuePack is the portable snapshot written by `lf rescue`.
type rescuePack struct {
	ExportedAt string       `json:"exported_at"`
	Source     string       `json:"source"`
	Sessions   []sessionDTO `json:"sessions"`
	DeviceID   string       `json:"device_id,omitempty"`
	Watermark  int64        `json:"watermark,omitempty"`
}

type sessionDTO struct {
	ID           string       `json:"id"`
	ParentID     *string      `json:"parent_id,omitempty"`
	Title        string       `json:"title"`
	ProjectPath  string       `json:"project_path"`
	Model        string       `json:"model"`
	Provider     string       `json:"provider"`
	CreatedAt    int64        `json:"created_at"`
	UpdatedAt    int64        `json:"updated_at"`
	InputTokens  int          `json:"input_tokens"`
	OutputTokens int          `json:"output_tokens"`
	CostMicro    int64        `json:"cost_micro"`
	Messages     []messageDTO `json:"messages"`
}

type messageDTO struct {
	ID        string `json:"id"`
	Role      string `json:"role"`
	Content   string `json:"content"`
	Model     string `json:"model"`
	Provider  string `json:"provider"`
	CreatedAt int64  `json:"created_at"`
	Hidden    bool   `json:"hidden,omitempty"`
}

// runRescue exports a portable snapshot of local sessions, messages, and sync
// identity so data can be moved between machines or recovered.
func runRescue() error {
	db, err := storage.Open(&storage.Options{})
	if err != nil {
		return fmt.Errorf("open storage: %w", err)
	}
	defer storage.Close()

	store := session.NewSQLStore(db)
	ctx := context.Background()

	sessRows, err := db.QueryContext(ctx, `
		SELECT id, parent_id, title, project_path, model, provider,
			created_at, updated_at, input_tokens, output_tokens, cost_micro,
			compressed_context, sync_state
		FROM sessions ORDER BY updated_at DESC`)
	if err != nil {
		return fmt.Errorf("query sessions: %w", err)
	}
	defer sessRows.Close()

	var sessions []session.Session
	for sessRows.Next() {
		var s session.Session
		if err := sessRows.Scan(
			&s.ID, &s.ParentID, &s.Title, &s.ProjectPath, &s.Model, &s.Provider,
			&s.CreatedAt, &s.UpdatedAt, &s.InputTokens, &s.OutputTokens, &s.CostMicro,
			&s.CompressedCtx, &s.SyncState,
		); err != nil {
			return fmt.Errorf("scan session: %w", err)
		}
		sessions = append(sessions, s)
	}
	if err := sessRows.Err(); err != nil {
		return fmt.Errorf("scan sessions: %w", err)
	}
	pack := rescuePack{
		ExportedAt: time.Now().UTC().Format(time.RFC3339),
		Source:     "lf rescue",
		Sessions:   []sessionDTO{},
	}

	for _, s := range sessions {
		msgs, err := store.GetMessages(ctx, s.ID, 10000)
		if err != nil {
			return fmt.Errorf("get messages for %s: %w", s.ID, err)
		}
		dto := sessionDTO{
			ID:           s.ID,
			ParentID:     s.ParentID,
			Title:        s.Title,
			ProjectPath:  s.ProjectPath,
			Model:        s.Model,
			Provider:     s.Provider,
			CreatedAt:    s.CreatedAt,
			UpdatedAt:    s.UpdatedAt,
			InputTokens:  s.InputTokens,
			OutputTokens: s.OutputTokens,
			CostMicro:    s.CostMicro,
			Messages:     []messageDTO{},
		}
		for _, m := range msgs {
			dto.Messages = append(dto.Messages, messageDTO{
				ID:        m.ID,
				Role:      m.Role,
				Content:   m.Content,
				Model:     m.Model,
				Provider:  m.Provider,
				CreatedAt: m.CreatedAt,
				Hidden:    m.Hidden,
			})
		}
		pack.Sessions = append(pack.Sessions, dto)
	}

	if deviceID, err := sync.GetDeviceID(ctx, db); err == nil {
		pack.DeviceID = deviceID
		if wm, err := sync.GetWatermark(ctx, db); err == nil {
			pack.Watermark = wm
		}
	}

	data, err := json.MarshalIndent(pack, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal pack: %w", err)
	}

	outDir, err := rescueExportDir()
	if err != nil {
		return fmt.Errorf("resolve export dir: %w", err)
	}
	if err := os.MkdirAll(outDir, 0o700); err != nil {
		return fmt.Errorf("create export dir: %w", err)
	}

	path := filepath.Join(outDir, fmt.Sprintf("lf-rescue-%s.json", time.Now().UTC().Format("20060102T150405Z")))
	if err := os.WriteFile(path, data, 0o600); err != nil {
		return fmt.Errorf("write pack: %w", err)
	}

	fmt.Printf("Rescue pack written: %s\n", path)
	fmt.Printf("  %d session(s), %d message(s), watermark %d\n",
		len(pack.Sessions), countMessages(pack), pack.Watermark)
	fmt.Println("To restore, point LF_DATA_DIR at this machine's data dir or re-import via the app.")
	return nil
}

func countMessages(p rescuePack) int {
	n := 0
	for _, s := range p.Sessions {
		n += len(s.Messages)
	}
	return n
}

func rescueExportDir() (string, error) {
	if dir := os.Getenv("LF_DATA_DIR"); dir != "" {
		return filepath.Join(dir, "exports"), nil
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	switch runtime.GOOS {
	case "windows":
		appData := os.Getenv("LOCALAPPDATA")
		if appData != "" {
			return filepath.Join(appData, "layerflow", "exports"), nil
		}
		return filepath.Join(home, "AppData", "Local", "layerflow", "exports"), nil
	default:
		return filepath.Join(home, ".local", "share", "layerflow", "exports"), nil
	}
}
