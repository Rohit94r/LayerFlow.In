package content

import (
	"encoding/csv"
	"fmt"
	"io"
	"sort"
	"strconv"
	"strings"
)

// Intent-classification heuristics map a query to a buying stage. Detection is
// tiered so strong commercial signals beat technical ones, which beat weak
// commercial nouns (gateway/tool are common in technical setups).
var intentStrongCommercial = []string{
	" vs ", "comparison", "compare", "review", "best ", "cheapest",
	"pricing", "price", "alternatives", "cost", "budget", "save",
}
var intentWeakCommercial = []string{"gateway", "tool", "platform", "solution"}
var intentTechnical = []string{
	"config", "setup", "api", "cli", "sdk", "install", "example",
	"codesnippet", "command", "yaml", "env",
}

// detectIntent guesses the search intent of a query, checking strong
// commercial signals first, then technical, then weak commercial nouns.
func detectIntent(q string) string {
	lower := strings.ToLower(strings.TrimSpace(q))
	for _, r := range intentStrongCommercial {
		if strings.Contains(lower, r) {
			return "commercial"
		}
	}
	for _, r := range intentTechnical {
		if strings.Contains(lower, r) {
			return "technical"
		}
	}
	for _, r := range intentWeakCommercial {
		if strings.Contains(lower, r) {
			return "commercial"
		}
	}
	return "informational"
}

// ScoreKeywords evaluates a set of keyword rows and returns them sorted by
// opportunity. Each row gets an intent label and a 0-100 opportunity score:
//
//   - demand    total impressions over the period
//   - reach     how climbable the current position is (5-20 is the sweet spot)
//   - intent    commercial/technical convert better than informational
//   - ctr       a healthy CTR with real clicks signals a page worth pushing
func ScoreKeywords(rows []Keyword) []Keyword {
	for i := range rows {
		k := &rows[i]
		k.Intent = detectIntent(k.Query)
		k.Score = scoreKeyword(k)
		k.Tier = tierFor(k)
	}
	sort.SliceStable(rows, func(i, j int) bool {
		return rows[i].Score > rows[j].Score
	})
	return rows
}

// scoreKeyword produces a 0-100 opportunity score.
func scoreKeyword(k *Keyword) float64 {
	demand := 0.0
	switch {
	case k.Impressions >= 1000:
		demand = 30
	case k.Impressions >= 300:
		demand = 22
	case k.Impressions >= 50:
		demand = 14
	case k.Impressions >= 10:
		demand = 7
	default:
		demand = 2
	}

	reach := 0.0
	switch {
	case k.Position >= 5 && k.Position <= 20:
		reach = 25
	case k.Position > 20:
		reach = 12
	case k.Position >= 1 && k.Position < 5:
		reach = 8
	}

	intentVal := 0.0
	switch k.Intent {
	case "commercial":
		intentVal = 20
	case "technical":
		intentVal = 15
	default:
		intentVal = 10
	}

	ctrBoost := 0.0
	if k.CTR > 0.08 && k.Clicks >= 3 {
		ctrBoost = 10
	}

	raw := demand + reach + intentVal + ctrBoost
	if raw > 100 {
		raw = 100
	}
	return raw
}

// tierFor buckets a keyword by opportunity for quick scanning.
func tierFor(k *Keyword) string {
	switch {
	case k.Score >= 65:
		return "opportunity"
	case k.Score >= 45 && k.Position > 0 && k.Position <= 20:
		return "quick-win"
	case k.Impressions >= 50 && k.Clicks < 2:
		return "coverage-gap"
	case k.Impressions < 10:
		return "parking-lot"
	default:
		return "watch"
	}
}

// ImportSearchConsole parses a Search Console export. It accepts the standard
// CSV/TSV export WITH a header (Query,Clicks,Impressions,CTR,Position), the
// tab-separated dashboard copy WITHOUT a header (query \t clicks \
// impressions), and the sectioned dashboard dump. The header row is detected
// automatically; headerless rows default to query/page/clicks/impressions.
func ImportSearchConsole(r io.Reader) ([]Keyword, error) {
	cr, err := newCSVReader(r)
	if err != nil {
		return nil, err
	}
	records, err := cr.readAll()
	if err != nil {
		return nil, fmt.Errorf("read search console data: %w", err)
	}
	if len(records) == 0 {
		return nil, fmt.Errorf("no rows found")
	}

	idx := headerIndex(records[0])
	hasHeader := idx["query"] >= 0

	start := 0
	if hasHeader {
		start = 1
	}
	var rows []Keyword
	for _, rec := range records[start:] {
		if k, ok := parseRow(rec, idx, hasHeader); ok {
			rows = append(rows, k)
		}
	}
	if len(rows) == 0 {
		return nil, fmt.Errorf("no valid keyword rows found")
	}
	return ScoreKeywords(rows), nil
}

// csvWrap is a csv.Reader that honours an auto-detected delimiter.
type csvWrap struct {
	comma rune
	data  string
}

func newCSVReader(r io.Reader) (*csvWrap, error) {
	data, err := io.ReadAll(r)
	if err != nil {
		return nil, fmt.Errorf("read input: %w", err)
	}
	comma := rune(',')
	if !strings.ContainsRune(string(data), ',') && strings.ContainsRune(string(data), '\t') {
		comma = '\t'
	}
	return &csvWrap{comma: comma, data: string(data)}, nil
}

func (c *csvWrap) readAll() ([][]string, error) {
	r := csv.NewReader(strings.NewReader(c.data))
	r.Comma = c.comma
	r.TrimLeadingSpace = true
	return r.ReadAll()
}

// headerIndex finds column positions by header name.
func headerIndex(header []string) map[string]int {
	idx := map[string]int{
		"query": -1, "clicks": -1, "impressions": -1, "ctr": -1, "position": -1,
	}
	for i, h := range header {
		h = strings.ToLower(strings.TrimSpace(h))
		switch h {
		case "query":
			idx["query"] = i
		case "clicks":
			idx["clicks"] = i
		case "impressions":
			idx["impressions"] = i
		case "ctr":
			idx["ctr"] = i
		case "position", "positionavg", "avgposition":
			idx["position"] = i
		}
	}
	return idx
}

// parseRow builds a Keyword from a record. With a detected header it uses the
// named columns; without one, it assumes column order query, clicks,
// impressions (the dashboard copy), reading CTR/position as absent.
func parseRow(rec []string, idx map[string]int, hasHeader bool) (Keyword, bool) {
	col := func(name string) string {
		i := idx[name]
		if i < 0 || i >= len(rec) {
			return ""
		}
		return strings.TrimSpace(rec[i])
	}

	var q string
	k := Keyword{}
	if hasHeader {
		q = col("query")
		k.Clicks = parseFloat(col("clicks"))
		k.Impressions = parseFloat(col("impressions"))
		k.CTR = parseCTR(col("ctr"))
		k.Position = parseFloat(col("position"))
	} else {
		// Headerless dashboard copy: [query, clicks, impressions]. Skip
		// section-title lines like "Top queries" that aren't real rows.
		q = strings.TrimSpace(rec[0])
		if len(rec) >= 3 {
			k.Clicks = parseFloat(rec[1])
			k.Impressions = parseFloat(rec[2])
		}
	}
	if q == "" || q == "query" {
		return Keyword{}, false
	}
	k.Query = q
	return k, true
}

func parseFloat(s string) float64 {
	if s == "" {
		return 0
	}
	v, _ := strconv.ParseFloat(s, 64)
	return v
}

// parseCTR handles "0.5%", "0.5", and "50" (percent) representations.
func parseCTR(s string) float64 {
	s = strings.TrimSpace(s)
	s = strings.TrimSuffix(s, "%")
	if s == "" {
		return 0
	}
	v, err := strconv.ParseFloat(s, 64)
	if err != nil {
		return 0
	}
	// If the source used a fraction (0.5 = 50%) keep it; a bare percent like
	// 50 means 50% and we normalise to 0.5.
	if v > 1 {
		return v / 100
	}
	if v >= 0 && v <= 1 {
		return v
	}
	return 0
}
