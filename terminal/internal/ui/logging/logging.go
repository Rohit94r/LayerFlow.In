// Package logging is a minimal logging facade that mirrors the opencode
// TUI's logging package. Log messages are also published to an in-memory
// broker so the status bar and logs page can surface them.
package logging

import (
	"context"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"github.com/layerflow/terminal/internal/ui/pubsub"
)

type LogMessage struct {
	ID          string
	Time        time.Time
	Level       string
	Persist     bool
	PersistTime time.Duration
	Message     string `json:"msg"`
	Attributes  []Attr
}

type Attr struct {
	Key   string
	Value string
}

type LogData struct {
	messages []LogMessage
	*pubsub.Broker[LogMessage]
	lock sync.Mutex
}

func (l *LogData) Add(msg LogMessage) {
	l.lock.Lock()
	defer l.lock.Unlock()
	l.messages = append(l.messages, msg)
	l.Publish(pubsub.CreatedEvent, msg)
}

func (l *LogData) List() []LogMessage {
	l.lock.Lock()
	defer l.lock.Unlock()
	return l.messages
}

var defaultLogData = &LogData{
	messages: make([]LogMessage, 0),
	Broker:   pubsub.NewBroker[LogMessage](),
}

func Subscribe(ctx context.Context) <-chan pubsub.Event[LogMessage] {
	return defaultLogData.Subscribe(ctx)
}

func List() []LogMessage {
	return defaultLogData.List()
}

func add(level, msg string, persist bool, ttl time.Duration, args ...any) {
	logMessage := LogMessage{
		ID:          fmt.Sprintf("%d", time.Now().UnixNano()),
		Time:        time.Now(),
		Level:       level,
		Persist:     persist,
		PersistTime: ttl,
		Message:     msg,
	}
	for i := 0; i+1 < len(args); i += 2 {
		logMessage.Attributes = append(logMessage.Attributes, Attr{
			Key:   fmt.Sprintf("%v", args[i]),
			Value: fmt.Sprintf("%v", args[i+1]),
		})
	}
	switch level {
	case "error":
		slog.Error(msg, args...)
	case "warn":
		slog.Warn(msg, args...)
	case "debug":
		slog.Debug(msg, args...)
	default:
		slog.Info(msg, args...)
	}
	defaultLogData.Add(logMessage)
}

func Error(msg string, args ...any) {
	add("error", msg, false, 0, args...)
}

func Warn(msg string, args ...any) {
	add("warn", msg, false, 0, args...)
}

func Info(msg string, args ...any) {
	add("info", msg, false, 0, args...)
}

func Debug(msg string, args ...any) {
	add("debug", msg, false, 0, args...)
}

func ErrorPersist(msg string, args ...any) {
	add("error", msg, true, 5*time.Second, args...)
}

func WarnPersist(msg string, args ...any) {
	add("warn", msg, true, 5*time.Second, args...)
}

func InfoPersist(msg string, args ...any) {
	add("info", msg, true, 5*time.Second, args...)
}
