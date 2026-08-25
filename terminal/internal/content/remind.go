package content

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"
)

// Reminder is a due-by-you action surfaced by `lf content remind`.
type Reminder struct {
	Post     Post
	DaysLate int
	Overdue  bool
	Ready    bool // draft exists and is ready to publish
	NoDraft  bool // scheduled today but no draft yet
}

// Remind computes what needs attention today relative to a given day. A post
// is a reminder if it is scheduled on or before day and is not published yet.
func (s *Store) Remind(day time.Time) []Reminder {
	var out []Reminder
	for _, p := range s.Due(day) {
		daysLate := 0
		if day.After(p.ScheduledAt) {
			daysLate = int(day.Truncate(24*time.Hour).Sub(p.ScheduledAt.Truncate(24*time.Hour)).Hours() / 24)
		}
		r := Reminder{
			Post:     p,
			DaysLate: daysLate,
			Overdue:  day.After(day.Truncate(24*time.Hour).Add(24*time.Hour)) && daysLate > 0,
		}
		if p.Status == StatusDraft && p.DraftPath != "" {
			if _, err := os.Stat(p.DraftPath); err == nil {
				r.Ready = true // draft exists; publishing is next
			}
		}
		if p.Status == StatusQueued && daysLate == 0 {
			r.NoDraft = true
		}
		out = append(out, r)
	}
	return out
}

// ReminderText renders a compact human summary of today's reminders, suitable
// for a cron email, a terminal notice, or a shell notification.
func (s *Store) ReminderText(day time.Time) string {
	rs := s.Remind(day)
	if len(rs) == 0 {
		return "No LayerFlow content due today. \u2713\n"
	}
	var b strings.Builder
	b.WriteString(fmt.Sprintf("LayerFlow content plan — %d to do:\n", len(rs)))
	for _, r := range rs {
		kind := "write draft"
		if r.Ready {
			kind = "publish (draft ready)"
		} else if r.Overdue {
			kind = "OVERDUE — draft"
		}
		label := r.Post.Title
		b.WriteString(fmt.Sprintf("  %s  [%s]  %s\n", r.Post.ScheduledAt.Format("Jan 02"), kind, label))
		if len(r.Post.TargetQuery) > 0 {
			b.WriteString(fmt.Sprintf("        target: %s\n", strings.Join(r.Post.TargetQuery, ", ")))
		}
	}
	b.WriteString(fmt.Sprintf("\nRun `lf content status` or `lf content draft <slug>` at any time.\n"))
	return b.String()
}

// InstallCron sets up an automated daily reminder. On macOS/Linux it writes a
// crontab entry that calls `lf content remind` every morning. On Windows it
// registers a scheduled task. Returns the cron line used (for transparency).
func (s *Store) InstallCron(exe string, dailyAt string) (string, error) {
	hour, minute := "9", "0"
	if dailyAt != "" {
		hour = cronHour(dailyAt)
		minute = cronMinute(dailyAt)
	}
	switch runtime.GOOS {
	case "linux", "darwin":
		return s.installUnixCron(exe, hour, minute)
	default:
		return "", s.installWindowsTask(exe)
	}
}

// cronHour/cronMinute split an "HH:MM" clock into cron components, defaulting
// safely when malformed.
func cronHour(hhmm string) string {
	parts := strings.SplitN(hhmm, ":", 2)
	if len(parts) < 1 || parts[0] == "" {
		return "9"
	}
	return parts[0]
}

func cronMinute(hhmm string) string {
	if i := strings.Index(hhmm, ":"); i >= 0 && i+1 < len(hhmm) {
		return hhmm[i+1:]
	}
	return "0"
}

// installUnixCron appends a crontab entry for `lf content remind`.
func (s *Store) installUnixCron(exe, hour, minute string) (string, error) {
	entry := fmt.Sprintf("%s %s * * * %s content remind --quiet >/dev/null 2>&1", minute, hour, exe)
	// Try to append idempotently (skip if already present).
	out, err := exec.Command("crontab", "-l").Output()
	if err == nil && strings.Contains(string(out), "content remind") {
		return entry, nil // already installed
	}
	// Build new crontab.
	existing := strings.TrimSpace(string(out))
	body := entry
	if existing != "" {
		body = existing + "\n" + entry
	}
	cmd := exec.Command("crontab", "-")
	cmd.Stdin = strings.NewReader(body + "\n")
	if err := cmd.Run(); err != nil {
		return "", fmt.Errorf("install cron (macOS/Linux): %w", err)
	}
	return entry, nil
}

// installWindowsTask registers a scheduled task (best-effort placeholder).
func (s *Store) installWindowsTask(exe string) error {
	if runtime.GOOS != "windows" {
		return fmt.Errorf("cron install is only supported on macOS/Linux with the crontab command")
	}
	cmd := exec.Command("schtasks", "/Create", "/SC", "DAILY", "/ST", "09:00", "/TN", "LayerFlowContent", "/TR", `"`+exe+`" content remind --quiet`, "/F")
	return cmd.Run()
}

// UninstallCron removes the installed reminder entry.
func (s *Store) UninstallCron() error {
	out, err := exec.Command("crontab", "-l").Output()
	if err != nil {
		return fmt.Errorf("read crontab: %w", err)
	}
	lines := strings.Split(string(out), "\n")
	var kept []string
	removed := false
	for _, ln := range lines {
		if strings.Contains(ln, "content remind") {
			removed = true
			continue
		}
		kept = append(kept, ln)
	}
	if !removed {
		return fmt.Errorf("no LayerFlow content cron entry found")
	}
	cmd := exec.Command("crontab", "-")
	cmd.Stdin = strings.NewReader(strings.Join(kept, "\n"))
	return cmd.Run()
}

// IsCronInstalled reports whether the reminder cron is present.
func (s *Store) IsCronInstalled() bool {
	out, err := exec.Command("crontab", "-l").Output()
	if err != nil {
		return false
	}
	return strings.Contains(string(out), "content remind")
}

// publishNotice returns the file path where a draft should be written.
func (s *Store) draftFilePath(p *Post) string {
	return filepath.Join(s.path, "drafts", p.Slug+".md")
}
