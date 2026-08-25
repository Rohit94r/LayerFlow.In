package main

import (
	"context"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/spf13/cobra"

	"github.com/layerflow/terminal/internal/cloud"
	"github.com/layerflow/terminal/internal/config"
	"github.com/layerflow/terminal/internal/content"
)

// newContentCmd creates the `lf content` command group for content-marketing
// automation: planning, draft generation from real product data, keyword
// research, and a daily reminder cron.
func newContentCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "content",
		Short: "Content marketing automation (plan, drafts, keywords, reminders)",
		Long:  `Plan a ranking-safe publishing calendar, generate drafts from real LayerFlow data, research keywords from Search Console exports, and automate daily reminders via cron.`,
	}
	cmd.AddCommand(
		newContentPlanCmd(),
		newContentStatusCmd(),
		newContentDraftCmd(),
		newContentPublishCmd(),
		newContentRemindCmd(),
		newContentCronCmd(),
		newContentKeywordsCmd(),
	)
	return cmd
}

func contentStore() (*content.Store, error) {
	dir := ""
	if v := os.Getenv("LF_CONTENT_DIR"); v != "" {
		dir = v
	}
	return content.Load(dir)
}

// newContentPlanCmd generates the publishing calendar.
func newContentPlanCmd() *cobra.Command {
	var weeks, perWeek int
	cmd := &cobra.Command{
		Use:   "plan",
		Short: "Generate the publishing calendar",
		Long:  `Generate the next N weeks of scheduled posts (default 4). Defaults to 3 posts/week — a pillar, a cluster, and a rotating data/tutorial piece. More than ~6/week trips Google's scaled-content-abuse detection, so it is capped.`,
		RunE: func(cmd *cobra.Command, args []string) error {
			st, err := contentStore()
			if err != nil {
				return err
			}
			dir := content.DefaultDirection()
			dir.Weeks = weeks
			dir.PostsPerWeek = perWeek
			planned, err := st.Plan(dir)
			if err != nil {
				return fmt.Errorf("generate calendar: %w", err)
			}
			fmt.Printf("Planned %d new post(s).\n\n", len(planned))
			printPosts(st.Posts())
			return nil
		},
	}
	cmd.Flags().IntVarP(&weeks, "weeks", "w", 4, "Weeks to plan ahead")
	cmd.Flags().IntVarP(&perWeek, "per-week", "p", 3, "Posts per week (max 6)")
	return cmd
}

// newContentStatusCmd shows the whole plan and what's due.
func newContentStatusCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "status",
		Short: "Show the content calendar and progress",
		RunE: func(cmd *cobra.Command, args []string) error {
			st, err := contentStore()
			if err != nil {
				return err
			}
			posts := st.Posts()
			if len(posts) == 0 {
				fmt.Println("No scheduled content. Run `lf content plan` first.")
				return nil
			}
			fmt.Printf("Content plan — %d posts\n", len(posts))
			fmt.Println(strings.Repeat("─", 60))
			printPosts(posts)
			fmt.Println()
			printDue(st, time.Now())
			return nil
		},
	}
}

// newContentDraftCmd generates a draft from real LayerFlow data.
func newContentDraftCmd() *cobra.Command {
	var all bool
	cmd := &cobra.Command{
		Use:   "draft <slug>",
		Short: "Generate a markdown draft for a scheduled post",
		Long:  `Generate a draft for a specific post (by slug or id), built from real LayerFlow product data (models, costs, version) so the content is original and accurate. Use --all to draft everything due.`,
		Args:  cobra.MaximumNArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			st, err := contentStore()
			if err != nil {
				return err
			}
			// Build real data from the live model registry (no mock numbers).
			data := realContentData()

			targets := []*content.Post{}
			if all {
				for _, r := range st.Remind(time.Now()) {
					if r.NoDraft || !r.Ready {
						targets = append(targets, &r.Post)
					}
				}
			} else {
				if len(args) != 1 {
					return fmt.Errorf("pass a post slug, or use --all")
				}
				p := st.Find(args[0])
				if p == nil {
					return fmt.Errorf("no scheduled post matches %q (see `lf content status`)", args[0])
				}
				targets = append(targets, p)
			}

			if len(targets) == 0 {
				fmt.Println("Nothing to draft right now.")
				return nil
			}
			for _, p := range targets {
				body, err := st.Draft(p, data)
				if err != nil {
					return err
				}
				path, err := writeDraftFile(st, p, body)
				if err != nil {
					return err
				}
				fmt.Printf("Drafted → %s  (%d words)\n", path, wordCount(body))
			}
			return nil
		},
	}
	cmd.Flags().BoolVarP(&all, "all", "a", false, "Draft everything scheduled but not yet published")
	return cmd
}

// newContentPublishCmd marks a post published.
func newContentPublishCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "publish <slug>",
		Short: "Mark a post as published",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			st, err := contentStore()
			if err != nil {
				return err
			}
			if err := st.MarkPublished(args[0]); err != nil {
				return err
			}
			fmt.Printf("Marked %q published ✓\n", args[0])
			return nil
		},
	}
}

// newContentRemindCmd shows what's due; --quiet is cron-safe.
func newContentRemindCmd() *cobra.Command {
	var quiet bool
	var summary bool
	cmd := &cobra.Command{
		Use:   "remind",
		Short: "Show content due today (cron-safe)",
		RunE: func(cmd *cobra.Command, args []string) error {
			st, err := contentStore()
			if err != nil {
				return err
			}
			txt := st.ReminderText(time.Now())
			if quiet {
				// Emit nothing and exit 0 when nothing is due; text otherwise.
				if strings.HasPrefix(txt, "No") {
					return nil
				}
			}
			if summary {
				N := len(st.Remind(time.Now()))
				fmt.Printf("%d content task(s) due today.\n", N)
				return nil
			}
			fmt.Print(txt)
			return nil
		},
	}
	cmd.Flags().BoolVar(&quiet, "quiet", false, "Print nothing when there is nothing to do (for cron)")
	cmd.Flags().BoolVar(&summary, "summary", false, "Print just a one-line summary")
	return cmd
}

// newContentCronCmd installs/uninstalls the daily reminder.
func newContentCronCmd() *cobra.Command {
	var at string
	install := &cobra.Command{
		Use:   "install",
		Short: "Install a daily reminder cron",
		Long:  `Install a crontab entry (macOS/Linux) or scheduled task (Windows) that runs ` + "`lf content remind`" + ` every morning.`,
		RunE: func(cmd *cobra.Command, args []string) error {
			st, err := contentStore()
			if err != nil {
				return err
			}
			exe, _ := os.Executable()
			entry, err := st.InstallCron(exe, at)
			if err != nil {
				return err
			}
			fmt.Println("LayerFlow content reminder installed.")
			fmt.Println("  crontab: " + entry)
			fmt.Println("It runs every morning and reminds you what to draft/publish.")
			return nil
		},
	}
	install.Flags().StringVarP(&at, "at", "a", "09:00", "Time to run daily (HH:MM)")

	uninstall := &cobra.Command{
		Use:   "uninstall",
		Short: "Remove the daily reminder cron",
		RunE: func(cmd *cobra.Command, args []string) error {
			st, err := contentStore()
			if err != nil {
				return err
			}
			if err := st.UninstallCron(); err != nil {
				return err
			}
			fmt.Println("LayerFlow content reminder removed.")
			return nil
		},
	}
	status := &cobra.Command{
		Use:   "status",
		Short: "Check if the reminder cron is installed",
		RunE: func(cmd *cobra.Command, args []string) error {
			st, err := contentStore()
			if err != nil {
				return err
			}
			if st.IsCronInstalled() {
				fmt.Println("Reminder cron: installed ✓")
			} else {
				fmt.Println("Reminder cron: not installed. Run `lf content cron install`.")
			}
			return nil
		},
	}

	grp := &cobra.Command{Use: "cron", Short: "Manage the daily reminder cron"}
	grp.AddCommand(install, uninstall, status)
	return grp
}

// newContentKeywordsCmd analyzes a Search Console export (.csv) and ranks the
// keywords by opportunity.
func newContentKeywordsCmd() *cobra.Command {
	var file string
	var top int
	cmd := &cobra.Command{
		Use:   "keywords",
		Short: "Analyze a Search Console export and rank keywords",
		Long:  `Read a Google Search Console CSV/TSV export (Query, Clicks, Impressions, CTR, Position), score each query by demand, reachability and intent, and print them ranked by opportunity.`,
		RunE: func(cmd *cobra.Command, args []string) error {
			var f *os.File
			var err error
			if file != "" {
				f, err = os.Open(file)
				if err != nil {
					return fmt.Errorf("open %s: %w", file, err)
				}
			} else {
				f = os.Stdin
			}
			defer f.Close()
			kw, err := content.ImportSearchConsole(f)
			if err != nil {
				return err
			}
			if top > 0 && top < len(kw) {
				kw = kw[:top]
			}
			printKeywords(kw)
			return nil
		},
	}
	cmd.Flags().StringVarP(&file, "file", "f", "", "Path to Search Console CSV/TSV (defaults to stdin)")
	cmd.Flags().IntVarP(&top, "top", "t", 0, "Show top N keywords (default all)")
	return cmd
}

// ─── Helpers ────────────────────────────────────────────────────────────────

// writeDraftFile writes a draft to the store's drafts directory.
func writeDraftFile(st *content.Store, p *content.Post, body string) (string, error) {
	dir := contentDirFor(st)
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return "", err
	}
	path := dir + "/" + p.Slug + ".md"
	if err := os.WriteFile(path, []byte(body), 0o600); err != nil {
		return "", fmt.Errorf("write draft: %w", err)
	}
	if err := st.SetDraftPath(p.Slug, path); err != nil {
		return "", err
	}
	return path, nil
}

// contentDirFor returns the drafts path associated with the store.
func contentDirFor(st *content.Store) string {
	if v := os.Getenv("LF_CONTENT_DIR"); v != "" {
		return v + "/drafts"
	}
	if home, err := os.UserHomeDir(); err == nil {
		return home + "/.config/layerflow/content/drafts"
	}
	return "content/drafts"
}

func wordCount(s string) int {
	return len(strings.Fields(s))
}

func printPosts(posts []content.Post) {
	for _, p := range posts {
		status := bold(string(p.Status))
		fmt.Printf("  %s  [%s]  %s\n", p.ScheduledAt.Format("2006-01-02"), status, p.Title)
		fmt.Printf("          type=%s  words=%d  target: %s\n", p.Type, p.WordGoal, strings.Join(p.TargetQuery, ", "))
	}
}

func printDue(st *content.Store, day time.Time) {
	due := st.Remind(day)
	if len(due) == 0 {
		fmt.Println("Nothing scheduled or overdue today. ✓")
		return
	}
	fmt.Printf("Due now / overdue — %d\n", len(due))
	fmt.Println(strings.Repeat("─", 60))
	dt := day.Truncate(24 * time.Hour)
	for _, r := range due {
		flag := ""
		if r.Post.ScheduledAt.Before(dt) {
			flag = fmt.Sprintf(" (%d day(s) late)", r.DaysLate)
		}
		next := "write draft"
		if r.Ready {
			next = "publish"
		}
		fmt.Printf("  %s  → %s%s\n", next, r.Post.Title, flag)
	}
}

func printKeywords(kw []content.Keyword) {
	if len(kw) == 0 {
		fmt.Println("No keywords analyzed.")
		return
	}
	fmt.Printf("%-32s %9s %11s %7s %7s %-11s %-14s %s\n", "Query", "Clicks", "Impr", "CTR", "Pos", "Intent", "Tier", "Score")
	fmt.Println(strings.Repeat("─", 100))
	for _, k := range kw {
		fmt.Printf("%-32s %9.0f %11.0f %6.1f%% %6.1f %-11s %-14s %.0f\n",
			trunc(k.Query, 32), k.Clicks, k.Impressions, k.CTR*100, k.Position, k.Intent, k.Tier, k.Score)
	}
}

func trunc(s string, n int) string {
	r := []rune(s)
	if len(r) <= n {
		return s
	}
	return string(r[:n-1]) + "…"
}

func bold(s string) string {
	return s
}

// realContentData gathers genuine LayerFlow facts for draft generation. It
// reads the live model registry from the gateway; on any error it falls back
// to the configured default model so drafts never contain invented numbers.
func realContentData() content.RealData {
	d := content.RealData{
		Version:   buildVersion,
		Link:      "https://layerflow.dev",
		UpdatedAt: time.Now(),
	}
	cfg, err := config.Load("")
	if err != nil {
		d.DefaultModel = cloud.DefaultModel
		d.CostPerM = map[string]string{}
		return d
	}
	d.DefaultModel = cfg.Model
	if d.DefaultModel == "" {
		d.DefaultModel = cloud.DefaultModel
	}
	if cfg.APIKey != "" {
		client := cloud.NewClient(cloud.ResolveBaseURL(cfg), cfg.APIKey)
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if models, err := client.ListModels(ctx); err == nil {
			for _, m := range models {
				d.Models = append(d.Models, m.ID)
			}
		}
	}
	d.CostPerM = map[string]string{}
	return d
}
