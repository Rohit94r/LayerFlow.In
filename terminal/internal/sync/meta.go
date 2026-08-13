package sync

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strconv"

	"github.com/google/uuid"
)

// Device + watermark identity, persisted in the sync_meta table.

// GetMeta reads a value from the sync_meta table. Returns "" when absent.
func GetMeta(ctx context.Context, db *sql.DB, key string) (string, error) {
	var value string
	err := db.QueryRowContext(ctx, `SELECT value FROM sync_meta WHERE key = ?`, key).Scan(&value)
	if errors.Is(err, sql.ErrNoRows) {
		return "", nil
	}
	if err != nil {
		return "", err
	}
	return value, nil
}

// SetMeta writes a value to the sync_meta table.
func SetMeta(ctx context.Context, db *sql.DB, key, value string) error {
	_, err := db.ExecContext(ctx, `
		INSERT INTO sync_meta (key, value) VALUES (?, ?)
		ON CONFLICT(key) DO UPDATE SET value = excluded.value`, key, value)
	return err
}

// GetDeviceID returns the stable per-machine device ID, creating it on first use.
func GetDeviceID(ctx context.Context, db *sql.DB) (string, error) {
	id, err := GetMeta(ctx, db, "device_id")
	if err != nil {
		return "", fmt.Errorf("read device id: %w", err)
	}
	if id != "" {
		return id, nil
	}
	id = uuid.New().String()
	if err := SetMeta(ctx, db, "device_id", id); err != nil {
		return "", fmt.Errorf("write device id: %w", err)
	}
	return id, nil
}

// GetWatermark returns the last applied server watermark (0 when never synced).
func GetWatermark(ctx context.Context, db *sql.DB) (int64, error) {
	v, err := GetMeta(ctx, db, "watermark")
	if err != nil {
		return 0, err
	}
	if v == "" {
		return 0, nil
	}
	w, err := strconv.ParseInt(v, 10, 64)
	if err != nil {
		return 0, fmt.Errorf("parse watermark %q: %w", v, err)
	}
	return w, nil
}

// SetWatermark records the highest observed server watermark.
func SetWatermark(ctx context.Context, db *sql.DB, w int64) error {
	return SetMeta(ctx, db, "watermark", strconv.FormatInt(w, 10))
}
