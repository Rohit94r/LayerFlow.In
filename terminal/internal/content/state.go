// Package content provides LayerFlow's content-marketing automation: a
// publishing calendar, live draft generation from real product data, and
// Search-Console-based keyword research. All state is plain JSON under
// ~/.config/layerflow/content/ — no database required.
package content

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

// PostStatus is the lifecycle of a scheduled post.
type PostStatus string

const (
	StatusQueued    PostStatus = "queued"
	StatusDraft     PostStatus = "draft"
	StatusPublished PostStatus = "published"
	StatusDelayed   PostStatus = "delayed"
)

// PostType is the content shape, mapped to the cadence.
type PostType string

const (
	TypePillar   PostType = "pillar"
	TypeCluster  PostType = "cluster"
	TypeData     PostType = "data"
	TypeTutorial PostType = "tutorial"
)

// Post is a single scheduled content item.
type Post struct {
	ID          string     `json:"id"`
	Title       string     `json:"title"`
	Slug        string     `json:"slug"`
	Type        PostType   `json:"type"`
	TargetQuery []string   `json:"target_query"`
	WordGoal    int        `json:"word_goal"`
	ScheduledAt time.Time  `json:"scheduled_at"`
	Status      PostStatus `json:"status"`
	DraftPath   string     `json:"draft_path,omitempty"`
	PublishedAt *time.Time `json:"published_at,omitempty"`
	Notes       string     `json:"notes,omitempty"`
}

// Store persists the content plan and keyword research.
type Store struct {
	posts    []Post
	keywords []Keyword
	path     string
}

// Keyword is a researched search query with a scoring model.
type Keyword struct {
	Query       string  `json:"query"`
	Clicks      float64 `json:"clicks"`
	Impressions float64 `json:"impressions"`
	CTR         float64 `json:"ctr"`
	Position    float64 `json:"position"`
	Score       float64 `json:"score"`
	Tier        string  `json:"tier"`
	Intent      string  `json:"intent"`
}

// DefaultDir returns the content state directory.
func DefaultDir() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf("resolve home: %w", err)
	}
	return filepath.Join(home, ".config", "layerflow", "content"), nil
}

// Load opens (and initialises) the store at the given directory.
func Load(dir string) (*Store, error) {
	if dir == "" {
		d, err := DefaultDir()
		if err != nil {
			return nil, err
		}
		dir = d
	}
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return nil, fmt.Errorf("create content dir: %w", err)
	}
	s := &Store{path: dir}
	if err := s.loadFile(filepath.Join(dir, "posts.json"), &s.posts); err != nil {
		// Missing/invalid posts file is fine — start empty.
		s.posts = nil
	}
	_ = s.loadFile(filepath.Join(dir, "keywords.json"), &s.keywords)
	return s, nil
}

func (s *Store) loadFile(path string, v any) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	return json.Unmarshal(data, v)
}

// savePosts persists the post plan.
func (s *Store) savePosts() error {
	sort.SliceStable(s.posts, func(i, j int) bool {
		return s.posts[i].ScheduledAt.Before(s.posts[j].ScheduledAt)
	})
	return s.writeJSON("posts.json", s.posts)
}

// saveKeywords persists keyword research.
func (s *Store) saveKeywords() error {
	return s.writeJSON("keywords.json", s.keywords)
}

func (s *Store) writeJSON(name string, v any) error {
	data, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(filepath.Join(s.path, name), data, 0o600)
}

// Direction describes the cadence for plan generation.
type Direction struct {
	// PostsPerWeek sets how many posts the calendar emits per week.
	// Recommended is 3 (pillar + cluster + data/tutorial). Values over ~5
	// trip Google's scaled-content-abuse heuristics, so ceil to 6 max.
	PostsPerWeek int `json:"posts_per_week"`
	// Weeks is how many weeks ahead to plan.
	Weeks int `json:"weeks"`
	// Start is the first scheduled day (zero = today).
	Start time.Time `json:"start"`
}

// DefaultDirection returns a disciplined, ranking-safe cadence: a pillar on
// Monday, a cluster on Wednesday, and a rotating data/tutorial piece on
// Friday/Saturday. 3 high-value posts a week beats 6 thin ones.
func DefaultDirection() Direction {
	return Direction{PostsPerWeek: 3, Weeks: 4, Start: time.Now()}
}

// slugify turns a title into a URL-safe slug.
func slugify(s string) string {
	s = strings.ToLower(s)
	s = strings.TrimSpace(s)
	var b strings.Builder
	prevDash := true
	for _, r := range s {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			b.WriteRune(r)
			prevDash = false
			continue
		}
		if !prevDash {
			b.WriteByte('-')
			prevDash = true
		}
	}
	return strings.Trim(b.String(), "-")
}

// wordGoalFor returns a target word count per content type.
func wordGoalFor(t PostType) int {
	switch t {
	case TypePillar:
		return 3500
	case TypeData:
		return 1800
	case TypeCluster:
		return 1600
	default:
		return 1200
	}
}

// templateTitle returns a default title for a given type and index.
func templateTitle(t PostType, week, idx int) (title string, queries []string) {
	switch t {
	case TypePillar:
		title = "LLM Gateway Cost Optimization: The 2026 Playbook"
		queries = []string{"llm cost optimization", "llm gateway cost", "reduce llm costs"}
	case TypeCluster:
		title = "Semantic Caching: Cut LLM Cost Without Cutting Quality"
		queries = []string{"semantic caching llm", "llm prompt caching", "llm caching strategy"}
	case TypeData:
		title = "We Benchmarked 5 LLM Routers: Real Cost vs Quality Numbers"
		queries = []string{"llm router comparison", "llm routing cost quality", "best llm gateway"}
	default:
		title = "Budget Control and BYOK: A LayerFlow Walkthrough"
		queries = []string{"llm budget control", "llm budget management", "byok api key management"}
	}
	// De-duplicated suffix so the calendar isn't a wall of identical titles.
	if week > 0 {
		title = fmt.Sprintf("%s (Part %d)", title, week+idx)
	}
	return title, queries
}

// Plan generates the next <weeks> weeks of scheduled posts and merges them
// into the store, skipping any that already exist for the same day+slug.
func (s *Store) Plan(d Direction) ([]Post, error) {
	if d.PostsPerWeek <= 0 {
		d.PostsPerWeek = DefaultDirection().PostsPerWeek
	}
	if d.PostsPerWeek > 6 {
		d.PostsPerWeek = 6 // keep under scaled-content-abuse thresholds
	}
	if d.Weeks <= 0 {
		d.Weeks = DefaultDirection().Weeks
	}
	if d.Start.IsZero() {
		d.Start = time.Now()
	}

	// A safe weekly rotation of content types.
	rotation := []PostType{TypePillar, TypeCluster, TypeData, TypeTutorial}
	startDate := time.Date(d.Start.Year(), d.Start.Month(), d.Start.Day(), 0, 0, 0, 0, time.UTC)

	var planned []Post
	existing := map[string]bool{}
	for _, p := range s.posts {
		existing[p.ScheduledAt.Format("2006-01-02")+"|"+p.Slug] = true
	}

	for wk := 0; wk < d.Weeks; wk++ {
		weekStart := startDate.AddDate(0, 0, wk*7)
		// Spread the week's posts over Mon/Wed/Fri/Sat.
		schedule := []int{1, 3, 5, 6}
		for i := 0; i < d.PostsPerWeek && i < len(schedule); i++ {
			typ := rotation[(wk+i)%len(rotation)]
			day := weekStart.AddDate(0, 0, schedule[i]-1) // offset from Monday
			title, queries := templateTitle(typ, wk, i)
			slug := slugify(title)
			key := day.Format("2006-01-02") + "|" + slug
			if existing[key] {
				continue
			}
			existing[key] = true
			p := Post{
				ID:          fmt.Sprintf("post-%s-%s", day.Format("20060102"), slug),
				Title:       title,
				Slug:        slug,
				Type:        typ,
				TargetQuery: queries,
				WordGoal:    wordGoalFor(typ),
				ScheduledAt: day,
				Status:      StatusQueued,
			}
			s.posts = append(s.posts, p)
			planned = append(planned, p)
		}
	}
	if err := s.savePosts(); err != nil {
		return nil, err
	}
	return planned, nil
}

// Posts returns the full plan, sorted by date.
func (s *Store) Posts() []Post {
	out := make([]Post, len(s.posts))
	copy(out, s.posts)
	sort.SliceStable(out, func(i, j int) bool {
		return out[i].ScheduledAt.Before(out[j].ScheduledAt)
	})
	return out
}

// Find returns the post with the given slug/id, or nil.
func (s *Store) Find(ref string) *Post {
	for i := range s.posts {
		if s.posts[i].Slug == ref || s.posts[i].ID == ref {
			return &s.posts[i]
		}
	}
	return nil
}

// SetDraftPath records where a generated draft was written.
func (s *Store) SetDraftPath(ref, path string) error {
	p := s.Find(ref)
	if p == nil {
		return errors.New("no scheduled post matches that slug")
	}
	p.DraftPath = path
	p.Status = StatusDraft
	return s.savePosts()
}

// MarkPublished advances a post to published, recording the date.
func (s *Store) MarkPublished(ref string) error {
	p := s.Find(ref)
	if p == nil {
		return errors.New("no scheduled post matches that slug")
	}
	now := time.Now()
	p.Status = StatusPublished
	p.PublishedAt = &now
	return s.savePosts()
}

// Due returns posts scheduled on or before day that are not yet published.
// Comparisons are by calendar day, so a post scheduled at any time today is
// still treated as due today (never pushed to tomorrow).
func (s *Store) Due(day time.Time) []Post {
	var out []Post
	day = time.Date(day.Year(), day.Month(), day.Day(), 0, 0, 0, 0, time.UTC)
	for _, p := range s.Posts() {
		if p.Status == StatusPublished {
			continue
		}
		postDay := time.Date(p.ScheduledAt.Year(), p.ScheduledAt.Month(), p.ScheduledAt.Day(), 0, 0, 0, 0, time.UTC)
		if !postDay.After(day) {
			out = append(out, p)
		}
	}
	return out
}
