// Package remote implements the "driver / car" loop: the web dashboard
// enqueues shell commands via the LayerFlow API, and this worker — running
// inside the local `lf` daemon — polls for them, executes them on this
// machine, and streams the output back.
package remote

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"os/exec"
	"strings"
	"sync"
	"time"
)

// Command is the server-side command DTO (device_commands row).
type Command struct {
	ID          string `json:"id"`
	WorkspaceID string `json:"workspace_id"`
	DeviceID    string `json:"device_id"`
	Command     string `json:"command"`
	Cwd         string `json:"cwd"`
	Status      string `json:"status"`
}

// MaxCommandRuntime bounds how long a single remote command may run.
const MaxCommandRuntime = 15 * time.Minute

// PollInterval is how often the daemon checks for a new command.
const PollInterval = 3 * time.Second

// StreamInterval is how often in-flight output is pushed to the server.
const StreamInterval = 2 * time.Second

// Client talks to the LayerFlow remote-control API. Unauthenticated when
// baseURL is empty (remote control disabled without a workspace key).
type Client struct {
	baseURL    string
	apiKey     string
	httpClient *http.Client
}

// NewClient builds a remote-control client. baseURL empty disables it.
func NewClient(baseURL, apiKey string) *Client {
	if baseURL == "" {
		return &Client{httpClient: &http.Client{Timeout: 30 * time.Second}}
	}
	return &Client{
		baseURL:    strings.TrimRight(baseURL, "/"),
		apiKey:     apiKey,
		httpClient: &http.Client{Timeout: 30 * time.Second},
	}
}

// Enabled reports whether remote control can call the API at all.
func (c *Client) Enabled() bool { return c != nil && c.baseURL != "" && c.apiKey != "" }

// Claim atomically claims the next pending command for this device, or
// returns nil when the queue is empty.
func (c *Client) Claim(ctx context.Context, deviceID string) (*Command, error) {
	body, _ := json.Marshal(map[string]string{"device_id": deviceID})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/api/v1/terminal/commands/poll", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("X-LF-Device", deviceID)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	payload, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("claim returned %d: %s", resp.StatusCode, string(payload))
	}

	var out struct {
		Command *Command `json:"command"`
	}
	if err := json.Unmarshal(payload, &out); err != nil {
		return nil, fmt.Errorf("decode claim response: %w", err)
	}
	return out.Command, nil
}

// resultPayload mirrors the API result schema.
type resultPayload struct {
	Output   string `json:"output,omitempty"`
	Finished bool   `json:"finished"`
	ExitCode *int   `json:"exit_code,omitempty"`
	Error    string `json:"error,omitempty"`
}

// SendResult pushes either a live output snapshot (finished=false) or the
// final result (finished=true) for a command.
func (c *Client) SendResult(ctx context.Context, id, output string, finished bool, exitCode int, execErr string) error {
	code := exitCode
	if !finished {
		code = -1
	}
	body, _ := json.Marshal(resultPayload{
		Output:   output,
		Finished: finished,
		ExitCode: &code,
		Error:    execErr,
	})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/api/v1/terminal/commands/"+id+"/result", bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.apiKey)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	payload, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 {
		return fmt.Errorf("result returned %d: %s", resp.StatusCode, string(payload))
	}
	return nil
}

// Worker owns the poll→execute→report loop for one daemon.
type Worker struct {
	client   *Client
	deviceID string
	mu       sync.Mutex
	running  bool
}

// NewWorker builds a worker bound to a device ID.
func NewWorker(client *Client, deviceID string) *Worker {
	return &Worker{client: client, deviceID: deviceID}
}

// Run blocks forever, polling for work. Stops when ctx is cancelled.
func (w *Worker) Run(ctx context.Context) {
	slog.Info("remote: remote-control worker started", "device", short(w.deviceID))
	ticker := time.NewTicker(PollInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
		}

		w.mu.Lock()
		busy := w.running
		w.mu.Unlock()
		if busy {
			continue
		}

		cmd, err := w.client.Claim(ctx, w.deviceID)
		if err != nil || cmd == nil {
			if err != nil {
				slog.Debug("remote: claim failed", "err", err)
			}
			continue
		}

		slog.Info("remote: claimed command", "id", cmd.ID, "command", truncate(cmd.Command, 80))
		w.execute(ctx, cmd)
	}
}

func (w *Worker) execute(parent context.Context, cmd *Command) {
	w.mu.Lock()
	w.running = true
	w.mu.Unlock()
	defer func() {
		w.mu.Lock()
		w.running = false
		w.mu.Unlock()
	}()

	runCtx, cancel := context.WithTimeout(parent, MaxCommandRuntime)
	defer cancel()

	var buf bytes.Buffer
	var mu sync.Mutex

	execCmd := exec.CommandContext(runCtx, "/bin/sh", "-c", cmd.Command)
	if cmd.Cwd != "" {
		execCmd.Dir = cmd.Cwd
	} else if dir, err := os.Getwd(); err == nil {
		execCmd.Dir = dir
	}
	execCmd.Stdout = &buf
	execCmd.Stderr = &buf

	snapshot := func() string {
		mu.Lock()
		defer mu.Unlock()
		return buf.String()
	}

	done := make(chan error, 1)
	go func() {
		done <- execCmd.Run()
	}()

	// Stream cumulative output while the command runs.
	streamDone := make(chan struct{})
	go func() {
		ticker := time.NewTicker(StreamInterval)
		defer ticker.Stop()
		for {
			select {
			case <-streamDone:
				return
			case <-ticker.C:
				if out := snapshot(); out != "" {
					if err := w.client.SendResult(runCtx, cmd.ID, out, false, 0, ""); err != nil {
						slog.Debug("remote: stream snapshot failed", "id", cmd.ID, "err", err)
					}
				}
			}
		}
	}()

	started := time.Now()
	err := <-done
	close(streamDone)

	output := snapshot()
	exitCode := 0
	execErr := ""
	if err != nil {
		execErr = err.Error()
		if exitErr, ok := err.(*exec.ExitError); ok {
			exitCode = exitErr.ExitCode()
		} else if runCtx.Err() == context.DeadlineExceeded {
			exitCode = 124
			execErr = "command timed out after " + MaxCommandRuntime.String()
		} else {
			exitCode = 1
		}
	}

	slog.Info("remote: command finished", "id", cmd.ID, "exit", exitCode, "duration", time.Since(started).Round(time.Millisecond))
	if err := w.client.SendResult(runCtx, cmd.ID, output, true, exitCode, execErr); err != nil {
		slog.Warn("remote: final result failed", "id", cmd.ID, "err", err)
	}
}

func short(s string) string {
	if len(s) > 8 {
		return s[:8]
	}
	return s
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "…"
}
