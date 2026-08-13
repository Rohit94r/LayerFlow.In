// Package compact provides context window compaction by summarizing conversation
// history to fit within model token limits.
package compact

import (
	"context"
	"fmt"
	"strings"

	"github.com/layerflow/terminal/internal/session"
)

// TokenEstimator provides rough token counts for text.
type TokenEstimator interface {
	Count(text string) int
}

// Summarizer generates summaries of message groups.
type Summarizer interface {
	Summarize(ctx context.Context, messages []session.Message) (string, error)
}

// Compactor manages context window compaction.
type Compactor struct {
	sessionStore session.Store
	msgStore     session.MessageStore
	estimator    TokenEstimator
	summarizer   Summarizer
	maxTokens    int
}

// NewCompactor creates a new context compactor.
func NewCompactor(
	sessionStore session.Store,
	msgStore session.MessageStore,
	estimator TokenEstimator,
	summarizer Summarizer,
	maxTokens int,
) *Compactor {
	if maxTokens <= 0 {
		maxTokens = 8192
	}
	return &Compactor{
		sessionStore: sessionStore,
		msgStore:     msgStore,
		estimator:    estimator,
		summarizer:   summarizer,
		maxTokens:    maxTokens,
	}
}

// CompactResult describes the outcome of a compaction operation.
type CompactResult struct {
	TokensBefore int
	TokensAfter  int
	Saved        int
	Summary      string
	HiddenCount  int
}

// Compact summarizes older messages to fit the context window while preserving
// recent and important messages (tool calls, approvals, system prompts).
func (c *Compactor) Compact(ctx context.Context, sessID string) (*CompactResult, error) {
	messages, err := c.msgStore.GetMessages(ctx, sessID, 0)
	if err != nil {
		return nil, fmt.Errorf("get messages: %w", err)
	}
	if len(messages) == 0 {
		return &CompactResult{}, nil
	}

	// Count total tokens.
	totalTokens := 0
	for _, m := range messages {
		totalTokens += c.estimator.Count(m.Content)
	}

	// If already within budget, no compaction needed.
	if totalTokens <= c.maxTokens {
		return &CompactResult{
			TokensBefore: totalTokens,
			TokensAfter:  totalTokens,
			Saved:        0,
		}, nil
	}

	// Classify messages into must-keep and summarizable.
	// Must-keep: system messages, tool calls, approval messages, recent messages.
	var toSummarize []session.Message
	var toKeep []session.Message
	cutoffIdx := len(messages) / 2 // summarize older half

	for i, m := range messages {
		if isMustKeep(m) || i >= cutoffIdx {
			toKeep = append(toKeep, m)
		} else {
			toSummarize = append(toSummarize, m)
		}
	}

	// Generate summary of summarizable messages.
	summary := ""
	if len(toSummarize) > 0 && c.summarizer != nil {
		summary, err = c.summarizer.Summarize(ctx, toSummarize)
		if err != nil {
			return nil, fmt.Errorf("summarize: %w", err)
		}
	}

	// Build compacted message set: summary + kept messages.
	compacted := make([]session.Message, 0, len(toKeep)+1)
	if summary != "" {
		compacted = append(compacted, session.Message{
			ID:      "compact-summary",
			Role:    "system",
			Content: fmt.Sprintf("[Conversation summary]\n%s", summary),
		})
	}
	compacted = append(compacted, toKeep...)

	// Count new tokens.
	newTokens := 0
	for _, m := range compacted {
		newTokens += c.estimator.Count(m.Content)
	}

	// Hide the summarized messages.
	var summarizeCutoff int64
	if len(toSummarize) > 0 {
		summarizeCutoff = toSummarize[len(toSummarize)-1].CreatedAt
	}
	hidden, err := c.msgStore.HideMessages(ctx, sessID, summarizeCutoff)
	if err != nil {
		return nil, fmt.Errorf("hide messages: %w", err)
	}

	// Update session with compressed context.
	sess, err := c.sessionStore.Get(ctx, sessID)
	if err != nil {
		return nil, fmt.Errorf("get session: %w", err)
	}
	sess.CompressedCtx = summary
	if err := c.sessionStore.Update(ctx, sess); err != nil {
		return nil, fmt.Errorf("update session: %w", err)
	}

	return &CompactResult{
		TokensBefore: totalTokens,
		TokensAfter:  newTokens,
		Saved:        totalTokens - newTokens,
		Summary:      summary,
		HiddenCount:  hidden,
	}, nil
}

// isMustKeep determines if a message must be preserved during compaction.
func isMustKeep(m session.Message) bool {
	switch m.Role {
	case "system":
		return true
	case "tool":
		return true
	}
	// Keep messages that contain tool call patterns or approval patterns.
	content := strings.ToLower(m.Content)
	if strings.Contains(content, "approve") || strings.Contains(content, "confirm") {
		return true
	}
	if m.ToolCallID != "" {
		return true
	}
	return false
}

// SimpleEstimator provides a basic token count estimate (~4 chars per token).
type SimpleEstimator struct{}

// Count returns an estimated token count for the given text.
func (e *SimpleEstimator) Count(text string) int {
	if text == "" {
		return 0
	}
	// Rough heuristic: ~4 characters per token for English text.
	// This is intentionally simple; production code should use a proper tokenizer.
	n := len(text) / 4
	if n == 0 {
		n = 1
	}
	return n
}

// FormatCompactResult returns a human-readable summary of the compaction.
func FormatCompactResult(r *CompactResult) string {
	if r.Saved == 0 {
		return "No compaction needed — within token budget."
	}
	return fmt.Sprintf(
		"Compacted: %d → %d tokens (saved %d, %d messages hidden)",
		r.TokensBefore, r.TokensAfter, r.Saved, r.HiddenCount,
	)
}
