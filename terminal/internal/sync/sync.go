package sync

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sort"
	"strings"
	"sync"
	"time"
)

// SyncState represents the state of a sync operation.
type SyncState string

const (
	StateSynced   SyncState = "synced"
	StateQueued   SyncState = "queued"
	StateConflict SyncState = "conflict"
)

// Operation represents a single syncable unit of work.
type Operation struct {
	OpID     string    `json:"op_id"`
	Entity   string    `json:"entity"` // session, message, memory, project
	EntityID string    `json:"entity_id"`
	Payload  any       `json:"payload"`
	DeviceID string    `json:"device_id"`
	OpTick   int64     `json:"op_tick"` // Lamport timestamp
	State    SyncState `json:"state"`
	Attempts int       `json:"attempts"`
}

// Client defines the wire protocol for the sync server.
type Client interface {
	// Start initiates a sync session with the server.
	Start(ctx context.Context, deviceID string, lastWatermark int64) (*HandshakeResult, error)
	// Push sends local operations to the server.
	Push(ctx context.Context, ops []Operation) (*PushResult, error)
	// Pull fetches remote operations since the given watermark.
	Pull(ctx context.Context, since int64) ([]Operation, error)
}

// HandshakeResult is returned after a successful sync handshake.
type HandshakeResult struct {
	ServerWatermark int64       `json:"server_watermark"`
	Ops             []Operation `json:"ops"`
}

// PushResult describes the server's response to a push.
type PushResult struct {
	Accepted        []string       `json:"accepted"`
	Rejected        []RejectReason `json:"rejected"`
	ServerWatermark int64          `json:"server_watermark"`
}

// RejectReason explains why an operation was rejected.
type RejectReason struct {
	OpID   string `json:"op_id"`
	Reason string `json:"reason"`
}

// Conflict represents a detected conflict between local and remote operations.
type Conflict struct {
	Type       string    `json:"type"`
	Local      Operation `json:"local"`
	Remote     Operation `json:"remote"`
	Resolution string    `json:"resolution"`
}

// Journal manages the local queue of pending operations.
type Journal interface {
	// Pending returns all operations awaiting sync.
	Pending(ctx context.Context) ([]Operation, error)
	// MarkAcked marks an operation as successfully synced.
	MarkAcked(ctx context.Context, opID string) error
	// MarkFailed records a failure for an operation.
	MarkFailed(ctx context.Context, opID string, reason string) error
	// Append adds a new operation to the journal.
	Append(ctx context.Context, op Operation) error
}

// Merger defines the conflict resolution strategy.
type Merger interface {
	// Merge combines local and remote operations for the same entity.
	Merge(local, remote Operation) (Operation, Conflict, error)
}

// Syncer orchestrates bidirectional push/pull with conflict resolution.
type Syncer struct {
	client   Client
	journal  Journal
	merger   Merger
	deviceID string
	mu       sync.Mutex
	clock    LamportClock
}

// LamportClock implements a Lamport logical clock for causal ordering.
type LamportClock struct {
	mu   sync.Mutex
	tick int64
	node string
}

// NewLamportClock creates a new clock bound to a device node.
func NewLamportClock(node string) *LamportClock {
	return &LamportClock{node: node}
}

// Tick increments and returns the current logical time.
func (c *LamportClock) Tick() int64 {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.tick++
	return c.tick
}

// Merge updates the clock when observing a remote timestamp.
func (c *LamportClock) Merge(remote int64) int64 {
	c.mu.Lock()
	defer c.mu.Unlock()
	if remote > c.tick {
		c.tick = remote
	}
	c.tick++
	return c.tick
}

// Now returns the current tick without incrementing.
func (c *LamportClock) Now() int64 {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.tick
}

// NewSyncer creates a Syncer with the given dependencies.
func NewSyncer(client Client, journal Journal, merger Merger, deviceID string) *Syncer {
	return &Syncer{
		client:   client,
		journal:  journal,
		merger:   merger,
		deviceID: deviceID,
		clock:    *NewLamportClock(deviceID),
	}
}

// Sync performs a full push-then-pull cycle.
func (s *Syncer) Sync(ctx context.Context, lastWatermark int64) (*SyncResult, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	// 1. Handshake
	handshake, err := s.client.Start(ctx, s.deviceID, lastWatermark)
	if err != nil {
		return nil, fmt.Errorf("sync handshake: %w", err)
	}

	// 2. Push local pending operations
	pending, err := s.journal.Pending(ctx)
	if err != nil {
		return nil, fmt.Errorf("fetch pending ops: %w", err)
	}

	// Stamp all pending operations with our Lamport tick
	for i := range pending {
		pending[i].DeviceID = s.deviceID
		pending[i].OpTick = s.clock.Tick()
	}

	var pushResult *PushResult
	if len(pending) > 0 {
		pushResult, err = s.client.Push(ctx, pending)
		if err != nil {
			return nil, fmt.Errorf("push ops: %w", err)
		}

		// Update journal based on push result
		for _, opID := range pushResult.Accepted {
			_ = s.journal.MarkAcked(ctx, opID)
		}
		for _, rej := range pushResult.Rejected {
			_ = s.journal.MarkFailed(ctx, rej.OpID, rej.Reason)
		}
	}

	// 3. Pull remote operations
	remoteOps, err := s.client.Pull(ctx, handshake.ServerWatermark)
	if err != nil {
		return nil, fmt.Errorf("pull ops: %w", err)
	}

	// 4. Merge remote into local
	var conflicts []Conflict
	for _, remote := range remoteOps {
		s.clock.Merge(remote.OpTick)

		// Find local counterpart
		var localMatch *Operation
		for i := range pending {
			if pending[i].Entity == remote.Entity && pending[i].EntityID == remote.EntityID {
				localMatch = &pending[i]
				break
			}
		}

		if localMatch == nil {
			// No local conflict; append to journal
			remote.State = StateSynced
			if err := s.journal.Append(ctx, remote); err != nil {
				return nil, fmt.Errorf("append remote op: %w", err)
			}
			continue
		}

		// Conflict detected
		resolved, conflict, err := s.merger.Merge(*localMatch, remote)
		if err != nil {
			return nil, fmt.Errorf("merge conflict: %w", err)
		}

		conflict.Local = *localMatch
		conflict.Remote = remote
		resolved.State = StateSynced
		resolved.OpTick = s.clock.Tick()

		if err := s.journal.Append(ctx, resolved); err != nil {
			return nil, fmt.Errorf("append resolved op: %w", err)
		}

		conflicts = append(conflicts, conflict)
	}

	return &SyncResult{
		Pushed:    len(pending),
		Accepted:  pushResultAccepted(pushResult),
		Rejected:  pushResultRejected(pushResult),
		Pulled:    len(remoteOps),
		Conflicts: conflicts,
		Watermark: handshake.ServerWatermark,
	}, nil
}

func pushResultAccepted(r *PushResult) int {
	if r == nil {
		return 0
	}
	return len(r.Accepted)
}

func pushResultRejected(r *PushResult) int {
	if r == nil {
		return 0
	}
	return len(r.Rejected)
}

// SyncResult summarizes a sync cycle.
type SyncResult struct {
	Pushed    int        `json:"pushed"`
	Accepted  int        `json:"accepted"`
	Rejected  int        `json:"rejected"`
	Pulled    int        `json:"pulled"`
	Conflicts []Conflict `json:"conflicts"`
	Watermark int64      `json:"watermark"`
}

// Enqueue records a new operation in the local journal for later sync.
func (s *Syncer) Enqueue(ctx context.Context, entity, entityID string, payload any) error {
	op := Operation{
		OpID:     generateOpID(),
		Entity:   entity,
		EntityID: entityID,
		Payload:  payload,
		DeviceID: s.deviceID,
		OpTick:   s.clock.Tick(),
		State:    StateQueued,
	}
	return s.journal.Append(ctx, op)
}

// HTTPClient implements Client over HTTP. It authenticates with a LayerFlow
// workspace API key (Authorization: Bearer lf_live_...) when one is set, and
// can additionally HMAC-SHA256 sign requests when a secret is provided.
type HTTPClient struct {
	baseURL    string
	apiKey     string
	hmacSecret []byte
	httpClient *http.Client
}

// NewHTTPClient creates a new HMAC-signed sync HTTP client.
func NewHTTPClient(baseURL, hmacSecret string) *HTTPClient {
	return &HTTPClient{
		baseURL:    strings.TrimRight(baseURL, "/"),
		hmacSecret: []byte(hmacSecret),
		httpClient: &http.Client{Timeout: 30 * time.Second},
	}
}

// NewHTTPClientWithKey creates a sync HTTP client authenticated with a
// LayerFlow workspace API key (lf_live_...).
func NewHTTPClientWithKey(baseURL, apiKey string) *HTTPClient {
	return &HTTPClient{
		baseURL:    strings.TrimRight(baseURL, "/"),
		apiKey:     apiKey,
		httpClient: &http.Client{Timeout: 30 * time.Second},
	}
}

func (c *HTTPClient) Start(ctx context.Context, deviceID string, lastWatermark int64) (*HandshakeResult, error) {
	body := map[string]any{
		"device_id":      deviceID,
		"last_watermark": lastWatermark,
	}
	var result HandshakeResult
	if err := c.do(ctx, http.MethodPost, "/api/v1/sync/handshake", body, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

func (c *HTTPClient) Push(ctx context.Context, ops []Operation) (*PushResult, error) {
	body := map[string]any{"ops": ops}
	var result PushResult
	if err := c.do(ctx, http.MethodPost, "/api/v1/sync/push", body, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

func (c *HTTPClient) Pull(ctx context.Context, since int64) ([]Operation, error) {
	body := map[string]any{"since": since}
	var result struct {
		Ops []Operation `json:"ops"`
	}
	if err := c.do(ctx, http.MethodPost, "/api/v1/sync/pull", body, &result); err != nil {
		return nil, err
	}
	return result.Ops, nil
}

func (c *HTTPClient) do(ctx context.Context, method, path string, reqBody, respBody any) error {
	payload, err := json.Marshal(reqBody)
	if err != nil {
		return fmt.Errorf("marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, method, c.baseURL+path, bytes.NewReader(payload))
	if err != nil {
		return fmt.Errorf("create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")

	if c.apiKey != "" {
		req.Header.Set("Authorization", "Bearer "+c.apiKey)
	}

	// Extract device ID from context if available
	deviceID := ctx.Value(contextKeyDeviceID)
	if deviceID != nil {
		req.Header.Set("X-LF-Device", deviceID.(string))
	}

	// HMAC-SHA256 signature (optional, legacy)
	if len(c.hmacSecret) > 0 {
		sig := c.sign(payload)
		req.Header.Set("X-LF-Sig", sig)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("http request: %w", err)
	}
	defer resp.Body.Close()

	respBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("read response: %w", err)
	}

	if resp.StatusCode >= 400 {
		return fmt.Errorf("sync server error %d: %s", resp.StatusCode, string(respBytes))
	}

	if respBody != nil {
		if err := json.Unmarshal(respBytes, respBody); err != nil {
			return fmt.Errorf("unmarshal response: %w", err)
		}
	}

	return nil
}

func (c *HTTPClient) sign(payload []byte) string {
	mac := hmac.New(sha256.New, c.hmacSecret)
	mac.Write(payload)
	return hex.EncodeToString(mac.Sum(nil))
}

// contextKey is an unexported type for context keys to avoid collisions.
type contextKey string

const contextKeyDeviceID contextKey = "device_id"

// ContextWithDeviceID attaches a device ID to the context.
func ContextWithDeviceID(ctx context.Context, deviceID string) context.Context {
	return context.WithValue(ctx, contextKeyDeviceID, deviceID)
}

// LocalWinsMerger is the default conflict resolution strategy: local wins.
type LocalWinsMerger struct{}

// Merge returns the local operation unchanged, recording the conflict.
func (m LocalWinsMerger) Merge(local, remote Operation) (Operation, Conflict, error) {
	return local, Conflict{
		Type:       "local_wins",
		Resolution: "local",
	}, nil
}

// DefaultMerger uses a deterministic heuristic: higher OpTick wins, ties go to local.
type DefaultMerger struct{}

// Merge picks the operation with the higher Lamport tick; ties favor local.
func (m DefaultMerger) Merge(local, remote Operation) (Operation, Conflict, error) {
	if local.OpTick >= remote.OpTick {
		return local, Conflict{
			Type:       "timestamp",
			Resolution: "local",
		}, nil
	}
	return remote, Conflict{
		Type:       "timestamp",
		Resolution: "remote",
	}, nil
}

// BatchedSyncer wraps Syncer to batch operations by entity for efficiency.
type BatchedSyncer struct {
	syncer    *Syncer
	batchSize int
}

// NewBatchedSyncer creates a Syncer that batches operations.
func NewBatchedSyncer(syncer *Syncer, batchSize int) *BatchedSyncer {
	if batchSize <= 0 {
		batchSize = 50
	}
	return &BatchedSyncer{syncer: syncer, batchSize: batchSize}
}

// SyncBatch runs sync in chunks of batchSize operations.
func (b *BatchedSyncer) SyncBatch(ctx context.Context, lastWatermark int64) ([]*SyncResult, error) {
	var results []*SyncResult
	for {
		result, err := b.syncer.Sync(ctx, lastWatermark)
		if err != nil {
			return results, err
		}
		results = append(results, result)
		lastWatermark = result.Watermark

		if result.Pushed == 0 && result.Pulled == 0 {
			break
		}
	}
	return results, nil
}

// SortByTick orders operations by Lamport timestamp for deterministic replay.
func SortByTick(ops []Operation) {
	sort.Slice(ops, func(i, j int) bool {
		if ops[i].OpTick != ops[j].OpTick {
			return ops[i].OpTick < ops[j].OpTick
		}
		return ops[i].OpID < ops[j].OpID
	})
}

// generateOpID creates a unique operation identifier.
func generateOpID() string {
	return fmt.Sprintf("op_%d_%s", time.Now().UnixNano(), randomHex(8))
}

// randomHex returns n bytes of hex-encoded random data (crypto/rand).
func randomHex(n int) string {
	buf := make([]byte, n)
	if _, err := rand.Read(buf); err != nil {
		// crypto/rand only fails on catastrophic entropy failure; fall back
		// to a timestamp-based ID so sync never deadlocks.
		return fmt.Sprintf("%0*d", n*2, time.Now().UnixNano())
	}
	return hex.EncodeToString(buf)
}
