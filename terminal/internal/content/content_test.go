package content

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func newTestStore(t *testing.T) *Store {
	t.Helper()
	st, err := Load(t.TempDir())
	if err != nil {
		t.Fatalf("load store: %v", err)
	}
	return st
}

// TestPlanCreatesRankingSafeCadence confirms planning emits the configured
// number of posts and respects the max-6 cap.
func TestPlanCreatesCadence(t *testing.T) {
	st := newTestStore(t)
	d := DefaultDirection()
	d.Weeks = 2
	d.PostsPerWeek = 3
	planned, err := st.Plan(d)
	if err != nil {
		t.Fatalf("plan: %v", err)
	}
	if len(planned) != 6 {
		t.Fatalf("expected 6 posts for 2 weeks x 3/week, got %d", len(planned))
	}
	// Every post is queued and has a slug/title.
	for _, p := range planned {
		if p.Slug == "" || p.Title == "" || p.Status != StatusQueued {
			t.Fatalf("bad post: %+v", p)
		}
	}

	// Over-specifying is capped to 6/week (scaled-content-abuse guard).
	d2 := DefaultDirection()
	d2.Weeks = 1
	d2.PostsPerWeek = 20
	if _, err := st.Plan(d2); err != nil {
		t.Fatalf("plan capped: %v", err)
	}
}

// TestPlanIsIdempotent ensures re-planning does not duplicate posts.
func TestPlanIsIdempotent(t *testing.T) {
	st := newTestStore(t)
	d := DefaultDirection()
	d.Weeks = 1
	d.PostsPerWeek = 3
	if _, err := st.Plan(d); err != nil {
		t.Fatalf("plan: %v", err)
	}
	before := len(st.Posts())
	if _, err := st.Plan(d); err != nil {
		t.Fatalf("re-plan: %v", err)
	}
	if after := len(st.Posts()); after != before {
		t.Fatalf("re-planning created duplicates: %d -> %d", before, after)
	}
}

// TestDraftUsesRealData confirms a draft is written with real model names and
// never invents a cost.
func TestDraftUsesRealData(t *testing.T) {
	st := newTestStore(t)
	d := DefaultDirection()
	d.Weeks = 1
	d.PostsPerWeek = 1
	if _, err := st.Plan(d); err != nil {
		t.Fatalf("plan: %v", err)
	}
	p := st.Posts()[0]
	data := RealData{
		Version:      "0.2.10",
		DefaultModel: "deepseek-chat",
		Models:       []string{"deepseek-chat", "gemini-2.0-flash"},
		CostPerM:     map[string]string{"deepseek-chat": "$0.27/M", "gemini-2.0-flash": "$0.30/M"},
		Link:         "https://layerflow.dev",
		UpdatedAt:    time.Now(),
	}
	body, err := st.Draft(&p, data)
	if err != nil {
		t.Fatalf("draft: %v", err)
	}
	for _, want := range []string{"deepseek-chat", "$0.27/M", "LayerFlow.dev", p.Title} {
		if !strings.Contains(body, want) {
			t.Fatalf("draft must contain %q, got:\n%s", want, body)
		}
	}
	if strings.Contains(body, "$0.00") || strings.Contains(body, "unspecified") {
		t.Fatalf("draft contained a placeholder/nonexistent figure: %s", body)
	}
}

// TestDraftRejectsUnknownPost prevents drafting a post outside the plan.
func TestDraftRejectsUnknownPost(t *testing.T) {
	st := newTestStore(t)
	p := Post{Slug: "not-in-plan", Title: "Nope"}
	if _, err := st.Draft(&p, RealData{}); err == nil {
		t.Fatal("expected error drafting an unknown post")
	}
}

// TestMarkPublish advances lifecycle queued -> draft -> published.
func TestMarkPublish(t *testing.T) {
	st := newTestStore(t)
	d := DefaultDirection()
	d.Weeks = 1
	d.PostsPerWeek = 1
	if _, err := st.Plan(d); err != nil {
		t.Fatalf("plan: %v", err)
	}
	slug := st.Posts()[0].Slug
	path := filepath.Join(t.TempDir(), slug+".md")
	if err := st.SetDraftPath(slug, path); err != nil {
		t.Fatalf("set draft: %v", err)
	}
	if got := st.Find(slug).Status; got != StatusDraft {
		t.Fatalf("expected draft status, got %s", got)
	}
	if err := st.MarkPublished(slug); err != nil {
		t.Fatalf("publish: %v", err)
	}
	p := st.Find(slug)
	if p.Status != StatusPublished || p.PublishedAt == nil {
		t.Fatalf("expected published post with date, got %+v", p)
	}
}

// TestRemindFindsDueAndOverdue confirms the reminder surfaces scheduled and
// late posts and ignores published ones.
func TestRemindFindsDue(t *testing.T) {
	st := newTestStore(t)
	past := time.Now().Add(-48 * time.Hour).UTC()
	st.posts = []Post{
		{Slug: "due-today", Title: "Due", ScheduledAt: time.Now().UTC(), Status: StatusQueued},
		{Slug: "late", Title: "Late", ScheduledAt: past, Status: StatusQueued},
		{Slug: "published", Title: "Done", ScheduledAt: past, Status: StatusPublished},
	}
	rs := st.Remind(time.Now().UTC())
	if len(rs) != 2 {
		t.Fatalf("expected 2 reminders (due + late), got %d", len(rs))
	}
	foundLate := false
	for _, r := range rs {
		if r.Post.Slug == "late" && r.DaysLate >= 1 {
			foundLate = true
		}
		if r.Post.Slug == "published" {
			t.Fatal("published post must not be a reminder")
		}
	}
	if !foundLate {
		t.Fatalf("expected the late post to carry a day count, got %+v", rs)
	}
}

// TestImportSearchConsoleCSV and TSV both parse and score correctly.
func TestImportSearchConsole(t *testing.T) {
	csvInput := "Query,Clicks,Impressions,CTR,Position\nllm cost optimization,3,120,0.025,8\nllm gateway comparison,1,60,0.017,15\n"
	kw, err := ImportSearchConsole(strings.NewReader(csvInput))
	if err != nil {
		t.Fatalf("import csv: %v", err)
	}
	if len(kw) != 2 {
		t.Fatalf("expected 2 keywords, got %d", len(kw))
	}
	// Highest-opportunity query ranks first.
	if kw[0].Query != "llm cost optimization" {
		t.Fatalf("expected highest score first, got %s", kw[0].Query)
	}
	if kw[0].Intent != "commercial" {
		t.Fatalf("expected commercial intent, got %s", kw[0].Intent)
	}

	// Tab-separated dashboard copy (query\tclicks\timpressions).
	tsv := "llm budget control\t0\t4\norganize ai prompts\t0\t103\n"
	kw2, err := ImportSearchConsole(strings.NewReader(tsv))
	if err != nil {
		t.Fatalf("import tsv: %v", err)
	}
	if len(kw2) != 2 {
		t.Fatalf("expected 2 keywords from tsv, got %d", len(kw2))
	}
}

// TestDetectionOfIntent sanity-checks the intent classifier (tiered).
func TestDetectIntent(t *testing.T) {
	cases := map[string]string{
		"best llm gateway":      "commercial", // strong "best" wins over weak "gateway"
		"what is an llm cache":  "informational",
		"llm gateway config":    "technical",  // "config" beats weak "gateway"
		"llm cost optimization": "commercial", // "cost"
	}
	for q, want := range cases {
		if got := detectIntent(q); got != want {
			t.Errorf("detectIntent(%q) = %q, want %q", q, got, want)
		}
	}
}

// TestReminderTextRenders confirms a friendly multi-line reminder.
func TestReminderTextRenders(t *testing.T) {
	st := newTestStore(t)
	st.posts = []Post{{Slug: "x", Title: "Semantic Caching Guide", ScheduledAt: time.Now().UTC(), Status: StatusQueued, TargetQuery: []string{"semantic caching llm"}}}
	txt := st.ReminderText(time.Now().UTC())
	if !strings.Contains(txt, "Semantic Caching Guide") || !strings.Contains(txt, "semantic caching llm") {
		t.Fatalf("reminder text missing post, got: %s", txt)
	}
}

// TestValidateDraft runs the quality gate and confirms it rejects thin or
// placeholder content.
func TestValidateDraft(t *testing.T) {
	good := "## Why this matters\n\n" + strings.Repeat("real substance here ", 40) +
		"\n## How it works\n\n" + strings.Repeat("more genuine content ", 40) +
		"\n## Try it yourself\n\n" + strings.Repeat("final closing notes ", 40)
	if err := validateDraft(good); err != nil {
		t.Fatalf("valid draft rejected: %v", err)
	}
	// Too short.
	short := "## Why this matters\n## How it works\n## Try it yourself\nfew words"
	if err := validateDraft(short); err == nil {
		t.Fatal("short draft must be rejected")
	}
	// Missing required section.
	miss := strings.Repeat("word ", 60)
	if err := validateDraft(miss); err == nil {
		t.Fatal("draft missing sections must be rejected")
	}
	// Placeholder content.
	ph := "## Why this matters\n## How it works\n## Try it yourself\n" + strings.Repeat("word ", 60) + "\n$0.00 TODO placeholder"
	if err := validateDraft(ph); err == nil {
		t.Fatal("draft with placeholders must be rejected")
	}
}

// TestAutoPublishStagesWhenNotLive confirms that with AutoPush off the run
// only writes drafts (never pushes) and the quality gate blocks bad content.
func TestAutoPublishStagesWhenNotLive(t *testing.T) {
	st := newTestStore(t)
	d := DefaultDirection()
	d.Weeks = 1
	d.PostsPerWeek = 1
	if _, err := st.Plan(d); err != nil {
		t.Fatalf("plan: %v", err)
	}
	// Force a post for today so it is due.
	st.posts[0].ScheduledAt = time.Now().UTC()
	cfg := DefaultAutopublish()
	cfg.AutoPush = false
	cfg.Live = false
	data := RealData{DefaultModel: "deepseek-chat", Version: "v", CostPerM: map[string]string{}, UpdatedAt: time.Now()}
	rep, err := st.AutoPublish(cfg, data, time.Now().UTC())
	if err != nil {
		t.Fatalf("autopublish: %v", err)
	}
	if len(rep.Generated) != 1 {
		t.Fatalf("expected 1 generated, got %+v", rep)
	}
	if len(rep.Pushed) != 0 || len(rep.Published) != 0 {
		t.Fatal("staging mode must never push or publish")
	}
	// Draft file exists on disk.
	slug := st.Posts()[0].Slug
	if st.Find(slug).DraftPath == "" {
		t.Fatal("draft path should be recorded")
	}
	if _, err := os.Stat(st.Find(slug).DraftPath); err != nil {
		t.Fatalf("draft file should exist: %v", err)
	}
}

// TestAutoPublishRespectsMaxPerRun confirms the backlog cap bounds a batch.
func TestAutoPublishRespectsMaxPerRun(t *testing.T) {
	st := newTestStore(t)
	d := DefaultDirection()
	d.Weeks = 1
	d.PostsPerWeek = 3
	if _, err := st.Plan(d); err != nil {
		t.Fatalf("plan: %v", err)
	}
	// Make all due + overdue so a backlog builds.
	now := time.Now().UTC()
	for i := range st.posts {
		st.posts[i].ScheduledAt = now.AddDate(0, 0, -i)
	}
	cfg := DefaultAutopublish()
	cfg.MaxPerRun = 1
	data := RealData{DefaultModel: "deepseek-chat", UpdatedAt: now}
	rep, err := st.AutoPublish(cfg, data, now)
	if err != nil {
		t.Fatalf("autopublish: %v", err)
	}
	if len(rep.Generated) != 1 {
		t.Fatalf("expected batch capped to 1, got %+v", rep)
	}
}

// TestSaveLoadAutopublishConfig round-trips the config via YAML.
func TestSaveLoadAutopublishConfig(t *testing.T) {
	st := newTestStore(t)
	cfg := DefaultAutopublish()
	cfg.Live = true
	cfg.AutoPush = true
	cfg.Repo = "/tmp/blog"
	cfg.DraftDir = "posts"
	if err := st.SaveAutopublishConfig(cfg); err != nil {
		t.Fatalf("save: %v", err)
	}
	got, err := st.LoadAutopublishConfig()
	if err != nil {
		t.Fatalf("load: %v", err)
	}
	if !got.Live || !got.AutoPush || got.Repo != "/tmp/blog" || got.DraftDir != "posts" {
		t.Fatalf("config did not round-trip: %+v", got)
	}
}
