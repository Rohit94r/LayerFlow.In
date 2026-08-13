// Package stream provides token stream adapters with cancellation and reconnect.
package stream

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/layerflow/terminal/internal/providers"
)

// StreamConfig configures the stream adapter.
type StreamConfig struct {
	MaxRetries     int
	InitialBackoff time.Duration
	MaxBackoff     time.Duration
}

// DefaultConfig returns sensible defaults for streaming.
func DefaultConfig() StreamConfig {
	return StreamConfig{
		MaxRetries:     5,
		InitialBackoff: 500 * time.Millisecond,
		MaxBackoff:     30 * time.Second,
	}
}

// Stream creates a channel that receives streaming chunks from a provider.
// It handles cancellation, reconnection, and partial output preservation.
func Stream(ctx context.Context, provider providers.Provider, opts providers.StreamOpts, cfg StreamConfig) <-chan providers.Chunk {
	out := make(chan providers.Chunk, 64)

	go func() {
		defer close(out)

		var accumulatedText string
		retries := 0
		backoff := cfg.InitialBackoff

		for {
			select {
			case <-ctx.Done():
				out <- providers.Chunk{
					Text: accumulatedText,
					Done: true,
					Err:  ctx.Err(),
				}
				return
			default:
			}

			if retries > cfg.MaxRetries {
				out <- providers.Chunk{
					Text: accumulatedText,
					Done: true,
					Err:  fmt.Errorf("max retries exceeded after %d attempts", retries),
				}
				return
			}

			errCh := make(chan error, 1)
			doneCh := make(chan struct{})

			streamOpts := opts
			streamOpts.CTX = ctx
			streamOpts.OnDelta = func(chunk providers.Chunk) error {
				if chunk.Text != "" {
					accumulatedText += chunk.Text
				}

				select {
				case out <- chunk:
				case <-ctx.Done():
					return ctx.Err()
				}

				return nil
			}

			go func() {
				_, err := provider.Complete(ctx, streamOpts)
				select {
				case errCh <- err:
				case <-ctx.Done():
				}
				close(doneCh)
			}()

			select {
			case <-ctx.Done():
				return
			case err := <-errCh:
				if err == nil {
					retries = 0
					backoff = cfg.InitialBackoff
					return
				}

				if ctx.Err() != nil {
					return
				}

				retries++
				select {
				case <-ctx.Done():
					return
				case <-time.After(backoff):
				}

				backoff = backoff * 2
				if backoff > cfg.MaxBackoff {
					backoff = cfg.MaxBackoff
				}
			}
		}
	}()

	return out
}

// Collect reads all chunks from a channel and returns the final accumulated text.
func Collect(ch <-chan providers.Chunk) (string, *providers.FuncUsage, error) {
	var text string
	var usage *providers.FuncUsage
	var lastErr error

	for chunk := range ch {
		if chunk.Text != "" {
			text += chunk.Text
		}
		if chunk.Usage != nil {
			usage = chunk.Usage
		}
		if chunk.Err != nil {
			lastErr = chunk.Err
		}
	}

	return text, usage, lastErr
}

// Tee duplicates a chunk stream into two consumers.
// Both channels receive the same chunks.
func Tee(ch <-chan providers.Chunk) (<-chan providers.Chunk, <-chan providers.Chunk) {
	out1 := make(chan providers.Chunk, 64)
	out2 := make(chan providers.Chunk, 64)

	go func() {
		defer close(out1)
		defer close(out2)

		for chunk := range ch {
			// Deep copy to avoid race conditions
			cp := providers.Chunk{
				Text:      chunk.Text,
				ToolCalls: chunk.ToolCalls,
				Usage:     chunk.Usage,
				Done:      chunk.Done,
				Err:       chunk.Err,
			}

			select {
			case out1 <- cp:
			default:
			}

			select {
			case out2 <- cp:
			default:
			}
		}
	}()

	return out1, out2
}

// Filter creates a new channel that only passes chunks matching the predicate.
func Filter(ch <-chan providers.Chunk, fn func(providers.Chunk) bool) <-chan providers.Chunk {
	out := make(chan providers.Chunk, 64)

	go func() {
		defer close(out)
		for chunk := range ch {
			if fn(chunk) {
				select {
				case out <- chunk:
				default:
				}
			}
		}
	}()

	return out
}

// StreamWithBuffer preserves partial output across reconnections.
type StreamWithBuffer struct {
	mu       sync.Mutex
	buffer   []providers.Chunk
	provider providers.Provider
	opts     providers.StreamOpts
	cfg      StreamConfig
}

// NewStreamWithBuffer creates a buffered stream that preserves partial results.
func NewStreamWithBuffer(provider providers.Provider, opts providers.StreamOpts, cfg StreamConfig) *StreamWithBuffer {
	return &StreamWithBuffer{
		provider: provider,
		opts:     opts,
		cfg:      cfg,
		buffer:   make([]providers.Chunk, 0),
	}
}

// Read returns all buffered chunks.
func (s *StreamWithBuffer) Read() []providers.Chunk {
	s.mu.Lock()
	defer s.mu.Unlock()

	result := make([]providers.Chunk, len(s.buffer))
	copy(result, s.buffer)
	return result
}

// Start begins streaming and accumulates results in the buffer.
func (s *StreamWithBuffer) Start(ctx context.Context) <-chan providers.Chunk {
	out := make(chan providers.Chunk, 64)

	go func() {
		defer close(out)

		ch := Stream(ctx, s.provider, s.opts, s.cfg)
		for chunk := range ch {
			s.mu.Lock()
			s.buffer = append(s.buffer, chunk)
			s.mu.Unlock()

			select {
			case out <- chunk:
			case <-ctx.Done():
				return
			}
		}
	}()

	return out
}

// Clear resets the buffer.
func (s *StreamWithBuffer) Clear() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.buffer = s.buffer[:0]
}
