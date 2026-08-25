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

// InstallAutoCron sets up a daily cron that runs `lf content autopublish` —
// the fully-automatic generate-and-push loop. Used by `lf content
// autopublish setup`.
func (s *Store) InstallAutoCron(exe string, dailyAt string) (string, error) {
	hour, minute := "9", "0"
	if dailyAt != "" {
		hour = cronHour(dailyAt)
		minute = cronMinute(dailyAt)
	}
	if runtime.GOOS == "linux" || runtime.GOOS == "darwin" {
		entry := fmt.Sprintf("%s %s * * * %s content autopublish --quiet >/dev/null 2>&1", minute, hour, exe)
		if err := s.appendCron(entry, "content autopublish"); err != nil {
			return "", err
		}
		return entry, nil
	}
	return "", s.installWindowsTask(exe)
}

// installUnixCron appends a crontab entry for `lf content remind`.
func (s *Store) installUnixCron(exe, hour, minute string) (string, error) {
	entry := fmt.Sprintf("%s %s * * * %s content remind --quiet >/dev/null 2>&1", minute, hour, exe)
	return entry, s.appendCron(entry, "content remind")
}

// appendCron adds a crontab entry, idempotently (won't duplicate a matching
// line).
func (s *Store) appendCron(entry, marker string) error {
	out, err := exec.Command("crontab", "-l").Output()
	if err == nil && strings.Contains(string(out), marker) {
		return nil // already installed
	}
	existing := strings.TrimSpace(string(out))
	body := entry
	if existing != "" {
		body = existing + "\n" + entry
	}
	cmd := exec.Command("crontab", "-")
	cmd.Stdin = strings.NewReader(body + "\n")
	return cmd.Run()
}

// installWindowsTask registers a scheduled task (best-effort placeholder).
func (s *Store) installWindowsTask(exe string) error {
	if runtime.GOOS != "windows" {
		return fmt.Errorf("cron install is only supported on macOS/Linux with the crontab command")
	}
	cmd := exec.Command("schtasks", "/Create", "/SC", "DAILY", "/ST", "09:00", "/TN", "LayerFlowContent", "/TR", `"`+exe+`" content remind --quiet`, "/F")
	return cmd.Run()
}

// cronMarkers are the subcommand strings that indicate a LayerFlow content
// cron entry (remind or autopublish).
var cronMarkers = []string{"content remind", "content autopublish"}

// UninstallCron removes any installed LayerFlow content reminder entry.
func (s *Store) UninstallCron() error {
	out, err := exec.Command("crontab", "-l").Output()
	if err != nil {
		return fmt.Errorf("read crontab: %w", err)
	}
	lines := strings.Split(string(out), "\n")
	var kept []string
	removed := false
	for _, ln := range lines {
		if strings.Contains(ln, "content remind") || strings.Contains(ln, "content autopublish") {
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

// IsCronInstalled reports whether any LayerFlow content cron is present.
func (s *Store) IsCronInstalled() bool {
	out, err := exec.Command("crontab", "-l").Output()
	if err != nil {
		return false
	}
	for _, m := range cronMarkers {
		if strings.Contains(string(out), m) {
			return true
		}
	}
	return false
}

// publishNotice returns the file path where a draft should be written.
func (s *Store) draftFilePath(p *Post) string {
	return filepath.Join(s.path, "drafts", p.Slug+".md")
}
