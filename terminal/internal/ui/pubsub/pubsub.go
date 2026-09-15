package pubsub

import (
	"context"
	"sync"
)

const (
	CreatedEvent EventType = "created"
	UpdatedEvent EventType = "updated"
	DeletedEvent EventType = "deleted"
)

type Suscriber[T any] interface {
	Subscribe(context.Context) <-chan Event[T]
}

type (
	// EventType identifies the type of event
	EventType string

	// Event represents an event in the lifecycle of a resource
	Event[T any] struct {
		Type    EventType
		Payload T
	}

	Publisher[T any] interface {
		Publish(EventType, T)
	}
)

// Broker is a minimal in-memory pub/sub broker shared by backend services.
type Broker[T any] struct {
	mu   sync.RWMutex
	subs map[chan Event[T]]struct{}
}

func NewBroker[T any]() *Broker[T] {
	return &Broker[T]{subs: make(map[chan Event[T]]struct{})}
}

func (b *Broker[T]) Subscribe(ctx context.Context) <-chan Event[T] {
	ch := make(chan Event[T], 100)
	b.mu.Lock()
	b.subs[ch] = struct{}{}
	b.mu.Unlock()
	go func() {
		<-ctx.Done()
		b.mu.Lock()
		delete(b.subs, ch)
		b.mu.Unlock()
		close(ch)
	}()
	return ch
}

func (b *Broker[T]) Publish(eventType EventType, payload T) {
	b.mu.RLock()
	defer b.mu.RUnlock()
	for ch := range b.subs {
		select {
		case ch <- Event[T]{Type: eventType, Payload: payload}:
		default:
		}
	}
}
