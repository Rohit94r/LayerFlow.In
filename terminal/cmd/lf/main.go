package main

import (
	"fmt"
	"log/slog"
	"os"
)

var version = "dev"
var commit = "none"
var date = "unknown"

func main() {
	// Keep the terminal clean: only surface warnings/errors by default.
	// Debug/info logs (e.g. "storage opened") must never clutter the UI.
	slog.SetDefault(slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{
		Level: slog.LevelWarn,
	})))

	SetVersionInfo(version, commit, date)
	if err := Execute(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
