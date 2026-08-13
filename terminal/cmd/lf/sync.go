package main

import (
	"context"
	"fmt"
	"time"

	"github.com/layerflow/terminal/internal/cloud"
	"github.com/layerflow/terminal/internal/config"
	"github.com/layerflow/terminal/internal/storage"
	"github.com/layerflow/terminal/internal/sync"
)

// performSync pushes pending operations to the cloud and pulls remote ones
// back, using a durable SQLite journal and the workspace API key.
func performSync(dryRun bool, resolve string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 90*time.Second)
	defer cancel()

	cfg, err := config.Load("")
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}

	key, err := cloud.ResolveAPIKey(cfg)
	if err != nil {
		return fmt.Errorf("sync requires an API key: %w", err)
	}
	baseURL := cloud.ResolveBaseURL(cfg)

	db, err := storage.Open(&storage.Options{})
	if err != nil {
		return fmt.Errorf("open storage: %w", err)
	}
	defer storage.Close()

	deviceID, err := sync.GetDeviceID(ctx, db)
	if err != nil {
		return fmt.Errorf("resolve device id: %w", err)
	}

	journal := sync.NewSQLJournal(db)

	if resolve != "" {
		if err := journal.Retry(ctx, resolve); err != nil {
			return fmt.Errorf("resolve op %s: %w", resolve, err)
		}
		fmt.Printf("Reset operation %s for retry.\n", resolve)
	}

	watermark, err := sync.GetWatermark(ctx, db)
	if err != nil {
		return fmt.Errorf("read watermark: %w", err)
	}

	pending, err := journal.Pending(ctx)
	if err != nil {
		return fmt.Errorf("list pending ops: %w", err)
	}

	if dryRun {
		fmt.Printf("Dry run — %d pending operation(s), device %s, watermark %d\n",
			len(pending), deviceID, watermark)
		for _, op := range pending {
			fmt.Printf("  %-8s %s/%s (tick %d, attempts %d)\n",
				op.Entity, op.EntityID, op.State, op.OpTick, op.Attempts)
		}
		if len(pending) == 0 {
			fmt.Println("Nothing to push.")
		}
		return nil
	}

	client := sync.NewHTTPClientWithKey(baseURL, key)
	syncer := sync.NewSyncer(client, journal, sync.DefaultMerger{}, deviceID)

	result, err := syncer.Sync(ctx, watermark)
	if err != nil {
		return fmt.Errorf("sync: %w", err)
	}

	if result.Watermark > watermark {
		_ = sync.SetWatermark(ctx, db, result.Watermark)
	}

	fmt.Printf("Synced with %s (device %s)\n", baseURL, deviceID)
	fmt.Printf("  pushed %d (accepted %d, rejected %d) · pulled %d · watermark %d\n",
		result.Pushed, result.Accepted, result.Rejected, result.Pulled, result.Watermark)

	if len(result.Conflicts) > 0 {
		fmt.Printf("  %d conflict(s) resolved (%s)\n", len(result.Conflicts), result.Conflicts[0].Resolution)
	}
	if result.Pushed == 0 && result.Pulled == 0 {
		fmt.Println("  up to date.")
	}
	return nil
}
