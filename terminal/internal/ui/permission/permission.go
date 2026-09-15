package permission

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"sync/atomic"

	"github.com/layerflow/terminal/internal/ui/pubsub"
)

var ErrorPermissionDenied = errors.New("permission denied")

const (
	ActionAllowSession = "allow_session"
	ActionAllow        = "allow"
	ActionDeny         = "deny"
)

type PermissionRequest struct {
	ID          string `json:"id"`
	SessionID   string `json:"session_id"`
	ToolName    string `json:"tool_name"`
	Description string `json:"description"`
	Action      string `json:"action"`
	Params      any    `json:"params"`
	Path        string `json:"path"`
}

type CreatePermissionRequest struct {
	SessionID   string `json:"session_id"`
	ToolName    string `json:"tool_name"`
	Description string `json:"description"`
	Action      string `json:"action"`
	Params      any    `json:"params"`
	Path        string `json:"path"`
}

type Service interface {
	pubsub.Suscriber[PermissionRequest]
	GrantPersistant(permission PermissionRequest)
	Grant(permission PermissionRequest)
	Deny(permission PermissionRequest)
	Request(opts CreatePermissionRequest) bool
	AutoApproveSession(sessionID string)
}

type permissionService struct {
	*pubsub.Broker[PermissionRequest]

	sessionPermissions  []PermissionRequest
	pendingRequests     sync.Map
	autoApproveSessions []string
}

func NewPermissionService() Service {
	return &permissionService{
		Broker: pubsub.NewBroker[PermissionRequest](),
	}
}

func (s *permissionService) GrantPersistant(permission PermissionRequest) {
	s.grant(permission)
	s.sessionPermissions = append(s.sessionPermissions, permission)
}

func (s *permissionService) grant(permission PermissionRequest) {
	if respCh, ok := s.pendingRequests.Load(permission.ID); ok {
		respCh.(chan bool) <- true
	}
}

func (s *permissionService) Grant(permission PermissionRequest) {
	s.grant(permission)
}

func (s *permissionService) Deny(permission PermissionRequest) {
	if respCh, ok := s.pendingRequests.Load(permission.ID); ok {
		respCh.(chan bool) <- false
	}
}

func (s *permissionService) AutoApproveSession(sessionID string) {
	s.autoApproveSessions = append(s.autoApproveSessions, sessionID)
}

func (s *permissionService) Request(opts CreatePermissionRequest) bool {
	ctx := context.Background()
	return s.RequestWithContext(ctx, opts)
}

// RequestWithContext implements the blocking permission flow used by the
// backend agent loop. Request delegates to it with a background context.
func (s *permissionService) RequestWithContext(ctx context.Context, opts CreatePermissionRequest) bool {
	respCh := make(chan bool, 1)

	permission := PermissionRequest{
		ID:          newRequestID(),
		SessionID:   opts.SessionID,
		ToolName:    opts.ToolName,
		Description: opts.Description,
		Action:      opts.Action,
		Params:      opts.Params,
		Path:        opts.Path,
	}

	for _, sessionID := range s.autoApproveSessions {
		if sessionID == permission.SessionID {
			return true
		}
	}
	for _, p := range s.sessionPermissions {
		if (p.ToolName == permission.ToolName || p.ToolName == "*") && p.Path == permission.Path {
			return true
		}
	}

	s.pendingRequests.Store(permission.ID, respCh)
	s.Publish(pubsub.CreatedEvent, permission)

	select {
	case result := <-respCh:
		return result
	case <-ctx.Done():
		return false
	}
}

var requestIDCounter atomic.Uint64

func newRequestID() string {
	n := requestIDCounter.Add(1)
	return fmt.Sprintf("req-%d", n)
}
