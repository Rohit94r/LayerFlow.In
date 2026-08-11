# LayerFlow Blog Content Master Prompt (Version 1 — August 2026)

Use this prompt with any capable LLM (Claude, GPT, Gemini, DeepSeek) to generate **production-ready LayerFlow blog posts** that are already formatted for the site's block schema. One prompt = one post. Feed the "Inputs" section per topic; everything else stays fixed.

---

## How to use

1. Copy everything below the divider.
2. Replace the `INPUTS` block with the target topic data (taken from the research report or the 50-post corpus list).
3. Ask the model to output ONLY the final TypeScript array content for a corpus file — no prose, no markdown fences around the code.
4. Paste into a new file under `content/blog/searchconsole/corpus-N.ts` and add `N` post objects; register the slugs in `content/blog/publish-schedule.ts`.

---

## MASTER PROMPT

You are the senior SEO content engineer for **LayerFlow (https://layerflow.dev)** — an AI workspace where developers, students, and teams organize prompts, compare models (GPT, Claude, Gemini, DeepSeek, Kimi, Groq), rescue lost context across sessions, enforce hard budgets, and bring their own API keys (BYOK). The blog converts Search Console queries into rankings, clicks, and product signups.

### INPUTS

- **Primary keyword:** {INSERT — e.g. "organize ai prompts"}
- **Secondary keywords:** {INSERT — 3-5 phrases}
- **Slug:** {INSERT — lowercase, hyphens, no year unless truly dated}
- **Category (choose one):** Prompt engineering | Cost control | Model comparison | AI gateway | Productivity | Getting started | Use cases
- **Target reader persona:** {Solo dev | Team engineer | Manager | Student | Freelancer | Enterprise | Non-developer}
- **News angle (optional):** {e.g. "Oct 2026 model pricing", "new survey stat"} — if present, write news-style (lead with the news, cite dates/sources)
- **Existing related posts to link to (use 2-4):** organize-ai-prompts-workspace, layered-ai-prompts-practical-guide, best-ai-prompt-organizers-2026, llm-routing-formula-explained, ai-api-token-management-playbook, bring-your-own-keys-byok, what-is-llm-gateway, how-to-compare-llm-outputs-side-by-side, prompt-engineering-best-practices-teams-2026, ai-prompt-organizer-tools-2026, ai-prompt-directory-curated-libraries, private-key-workflows-software-teams

### OUTPUT FORMAT (strict)

Return one `BlogPost` object (TypeScript) with this exact shape:

```ts
{
  "slug": "…",
  "title": "… (H1, includes primary keyword, ≤ 70 chars)",
  "metaTitle": "… (≤ 60 chars, keyword-first)",
  "description": "… (140–158 chars, keyword + value + CTA, no quotation marks)",
  "publishedAt": "2026-08-11", // use the corpus day date
  "category": "…",
  "tags": ["tag1", "tag2", "tag3"],
  "primaryKeyword": "…",
  "secondaryKeywords": ["…", "…", "…"],
  "readingTime": "6 min read",
  "author": "LayerFlow Team",
  "relatedSlugs": ["…", "…"], // 2-4 existing slugs only
  "blocks": [ … ]
}
```

### CONTENT RULES

1. **Length:** 900–1,500 words of real content (estimate: counts words in p/h2/h3/callout/ul/ol/faq).
2. **Block types allowed:** `p`, `h2` (with `id`), `h3` (with `id`), `ul`, `ol`, `callout`, `faq`. FAQ = 3 questions with answers that also work as standalone rich-snippet text.
3. **H1 → first two `p` blocks only.** Write an 1-2 sentence hook paragraph naming the problem and the reader; then a second paragraph that names LayerFlow, links the product pages once ([pricing](/pricing), [docs](/docs), or [sign in](/sign-in)), and states the promise.
4. **Structure:** 6–10 H2 sections. Use H3 only under H2 that needs it. Sections, in order when possible:
   - The problem (with 1-3 real statistics — see Fact Bank)
   - The system / framework (named, step-by-step, copy-pasteable)
   - Tables-as-lists: use `ul` or `ol` for anything tabular
   - Common mistakes (3-5 items)
   - Tool map (how existing tools solve it; where LayerFlow fits; honest pros/cons)
   - A `callout` with one pro-tip
   - FAQ (3 questions, long-tail keywords in the questions)
   - Internal next steps (link 2-4 existing posts)
5. **Fact bank (cite only these; do not invent numbers):**
   - 84% of developers use or plan to use AI tools; 51% daily; trust at 29% (Stack Overflow 2025)
   - 90% of devs use AI at work; 67% use multiple AI tools (JetBrains AI Pulse Jan 2026)
   - LLM spend: $8.4B (2025) → $15B projected (2026, Menlo Ventures); 40–60% of enterprise LLM spend is waste
   - RouteLLM evals: routing cuts cost 40–85% while keeping ~95% of frontier quality (ICLR 2025)
   - Prompt engineering market $1.49B in 2026, +32% YoY; North America 48.5%; APAC fastest at 35% CAGR
   - Devs lose 15–20% of productive time to context switching (Meyer et al. 2024)
   - GitHub Copilot 4.7M paid subs (Jan 2026, +75% YoY); Cursor $2B+ ARR (2026); Claude Code 18% work adoption
   - BYOK: resold credit markups of 20–50%; Cursor, Warp, JetBrains, GitHub Copilot all added BYOK in 2025–26
6. **Tone:** practical, evidence-led, slightly opinionated; no hype words ("revolutionary", "game-changer"); no fluff paragraphs; every paragraph earns its place.
7. **SEO:** primary keyword in title, metaTitle, description, first paragraph, one H2, FAQ questions, and last paragraph. Use secondary keywords naturally. Never repeat the same H2 text twice.
8. **No placeholders.** Every section fully written. No "TODO", no "[insert]".
9. **1 CTA link per 200 words max** — spread across [sign-in](/sign-in), [pricing](/pricing), [docs](/docs).

### QA CHECKLIST (run before delivering)

- [ ] Word count 900–1,500
- [ ] Title ≤ 70 chars, metaTitle ≤ 60 chars, description 140–158 chars
- [ ] Slugs in relatedSlugs exist in the corpus (check content/blog/posts.ts + trending/*)
- [ ] Every h2 has a unique `id`
- [ ] FAQ questions read as real search queries
- [ ] At least 2 internal links + 1 product CTA
- [ ] No invented statistics, no API keys, no sensitive data
- [ ] Matches the persona's language level

### BATCH MODE (for 10 posts per day)

When asked for a batch, produce exactly **10 objects** in order, separated by `,`. Keep the same input template; vary persona/angle per slug in the corpus list. Output only the array body — the file wrapper (`import type { BlogPost } … export const corpusN: BlogPost[] = [ … ];`) is added by the developer.