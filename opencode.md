# LayerFlow Final Market-Validated Product Plan

Source check date: August 1, 2026.

This document is the final retouch after competitor research, senior feedback, and product-scope correction.

The important correction:

```text
Context transfer alone is not a blue-ocean idea anymore.
```

Free and paid tools already export, compress, save, inject, and reuse AI chat context across ChatGPT, Claude, Gemini, DeepSeek, Grok, Perplexity, Cursor, and other tools.

LayerFlow should still move forward, but it must not be positioned as only "move my chat to another AI." That feature is now table stakes.

The stronger product is:

```text
LayerFlow turns messy AI chats into cleaner prompts, cheaper context, model recommendations, and reusable workspaces.
```

## Final Verdict

Raw "Limit Rescue" idea: **6.5/10**.

Improved LayerFlow direction: **8.5/10**.

Potential with sharp execution and real user validation: **9/10**.
-- one of these feature is prompt improver proepve written plan english prompt after click imrpve button then promvpt imrove tlike these 
Why not 9.5 today:

- Context transfer has direct competitors.
- Several competitors are free Chrome extensions.
- Some competitors already include smart compression, memory, search, MCP, prompt enhancement, and local-first privacy.
- LayerFlow has not yet proven user willingness to pay.

Why it is still worth building:

- Most competitors focus on capture, memory, export, or injection.
- Regular users still struggle to know what context matters, what to remove, what prompt to send next, which model is enough, and what the AI task will cost.
- LayerFlow already has useful pieces: prompt workspace, compare, cost control, gateway/BYOK thinking, and product direction around saved AI work.

The market is not empty, but there is still room for a better workflow.

## New Product Positioning

Do not lead with:

```text
Move your AI chat to another model.
```

That sounds like ContextSwitchAI, TransferLLM, Rethread, AI Context Flow, and several extensions.

Lead with:

```text
Fix messy AI work before you continue.
```

Better positioning:

```text
LayerFlow turns long AI chats into a clear next prompt, compressed context, cheaper model options, and a reusable workspace.
```

Short version:

```text
Better prompts. Less context waste. Continue anywhere.
```

Developer version later:

```text
LayerFlow preserves repo context, Git reasoning, model cost, and AI-assisted decisions without trying to replace Cursor or Claude Code.
```

## Market Reality

### Coding agents are crowded but not closed

The AI coding-agent market is crowded:

- Cursor owns the AI-native editor category.
- Claude Code, OpenAI Codex CLI, GitHub Copilot agents, Windsurf, and OpenCode already cover terminal/IDE coding agents.
- OpenCode, Claude Code, Codex CLI, and Cursor already handle repo context, command execution, sessions, rules, agent workflows, and implementation.

LayerFlow does not need to out-feature OpenCode. It needs to beat the entry point:

- OpenCode and Claude Code are terminal-first: intimidating for non-developers, and they run locally.
- LayerFlow is **web-first with a terminal**: anyone opens a browser, writes plain English, clicks Improve, and gets a working prompt — then runs it with one click, no install.
- LayerFlow adds the Rescue Report workflow on top: improve the prompt, compress context, check cost, pick a model, then run the agent.
- Multi-agent by default: parallel agents (implement, review, test) instead of one linear agent loop.

### Context memory is also crowded

The senior feedback is real. Several products now solve parts of the context-continuity problem:

| Product | What it does | What this means for LayerFlow |
| --- | --- | --- |
| ContextSwitchAI / AI Chat Exporter | Free Chrome extension for export, continue, local privacy, smart compression, search, notes, and auto-injection across many AI tools | One-click transfer and compression are not enough |
| TransferLLM | Paid one-time migration between ChatGPT, Gemini, and Claude, preserving structure, dates, threads, attachments, and instructions | Full-history migration is already monetized |
| AI Context Flow | Browser extension, Memory Studio, MCP server, prompt enhancement, team spaces, pricing, and cross-tool memory | Universal memory plus prompt improvement is already a serious category |
| Rethread | Local-first cross-platform AI memory, selective recall, snapshots, daily brief, prompt templates, encrypted sync | Local-first memory is a strong competitor for power users |
| ContextBridge | Captures chats, code, files, and decisions across AI chat tools, VS Code, and Cursor | Developer memory is also becoming crowded |
| Contextable | Free/open-source context builder for saving and resuming work in multiple AI tools | Simple context workspace has free alternatives |
| Mem0 / OpenMemory | Developer memory infrastructure for agents and apps | Infrastructure memory is not LayerFlow's first wedge |

Conclusion:

```text
Context Passport is useful, but it is not enough as the hero by itself.
```

The real gap LayerFlow should target:

```text
Most tools remember context. Few help regular users improve, compress, price, compare, and act on that context in one clear workflow.
```

## Real Differentiation

LayerFlow should be the **AI Work Quality Workspace**.

It should answer five practical questions:

1. What is the useful context in this messy chat?
2. What should I remove so I do not waste tokens?
3. What is the best next prompt?
4. Which model is good enough and cheaper?
5. Where should I save this so I can reuse it later?

This is the wedge:

```text
From messy chat to action-ready AI work.
```

## Launch Customer

Primary launch customer:

- AI power users.
- Students.
- Indie hackers.
- Founders.
- Marketers.
- Writers.
- Recruiters.
- Developers who use AI chat tools in the browser.

These people often:

- Hit AI usage limits.
- Switch between multiple AI tools.
- Paste long context repeatedly.
- Lose important prompts and decisions.
- Overspend on expensive models.
- Do not know how to write strong follow-up prompts.

Developer terminal users remain important, but only after the web workflow has traction.

## New Hero Workflow

Old MVP:

```text
Paste chat -> Continue Pack.
```

New MVP:

```text
Paste chat/problem -> AI Work Rescue Report -> improved prompt -> compressed context -> cost check -> model suggestion -> continue pack -> save to workspace.
```

The product output is not only a transferred chat. It is a report that helps the user do better work.

## Hero Feature: AI Work Rescue Report

This replaces "Limit Rescue" as the main product surface.

The report includes:

- Short summary.
- Context Passport.
- Smart Compress.
- Improved next prompt.
- Cost Check.
- Best Model Suggestion.
- Continue Pack.
- Context Diff.
- Risk warnings.
- Save to workspace.

### Context Passport

A portable, editable memory package for one AI task.

Fields:

- Goal.
- Current state.
- Important context.
- Key decisions.
- What worked.
- What failed.
- Missing information.
- Constraints.
- Desired output format.
- Next action.
- Source tool.
- Target tool.
- Estimated cost.
- Tags and project.

### Smart Compress

Compresses long chats into only the useful context.

Show plain-language output:

```text
Original: 8,000 words
Useful context: 920 words
Removed: repeated messages, greetings, failed attempts, duplicate instructions
Estimated context reduction: 88%
```

### Cost Check

Shows cost and waste in dollars, not only tokens.

Example:

```text
Claude Sonnet estimate: $0.42
Gemini Flash estimate: $0.05
DeepSeek estimate: $0.03
Recommendation: use Gemini Flash for summary, Claude only for final review.
```

### Improve Prompt

Creates a better next prompt from the messy context.

It should improve:

- Clarity.
- Missing context.
- Output format.
- Constraints.
- Examples.
- Brevity.
- Cost efficiency.

### Context Diff

This is a strong trust feature.

Show:

- What LayerFlow kept.
- What LayerFlow removed.
- What LayerFlow is unsure about.
- What the user should manually review.

This makes Smart Compress less scary.

### Best Model Suggestion

Recommend with a reason:

```text
Recommended: Gemini Flash.
Why: this task is summarization and continuation, not deep reasoning. It should be cheap and fast.
Use Claude only if the final output needs stronger writing or reasoning.
```

### Continue Pack

Ready-to-paste output for another AI.

Template:

```text
Goal:
Current state:
Important decisions:
Constraints:
Useful context:
What already worked:
What failed:
Preferred output:
Next action:
```

## Feature Names

Use customer-friendly names.

| Internal concept | Public name |
| --- | --- |
| Token Waste Doctor | Cost Check |
| Token compression | Smart Compress |
| Cross-model export | Continue Pack |
| Chat migration | Limit Rescue |
| Durable context object | Context Passport |
| Model router | Best Model Suggestion |
| Prompt scoring | Prompt Score |
| Kept/removed context view | Context Diff |
| Full output page | AI Work Rescue Report |

## Product Phases

### Phase 1: Web MVP - AI Work Rescue Report

Timeline: first 30 days.

Goal:

```text
Prove that users want LayerFlow to clean, compress, price, and continue messy AI work.
```

Build only this flow:

```text
Paste chat/problem -> Rescue Report -> Copy Continue Pack -> Save to workspace
```

Ship:

- Paste chat/problem screen.
- Source detection: ChatGPT, Claude, Gemini, DeepSeek, Kimi, generic text.
- AI Work Rescue Report.
- Context Passport fields.
- Smart Compress.
- Context Diff.
- Improve Prompt.
- Cost Check.
- Best Model Suggestion.
- Continue Pack copy button.
- Markdown export.
- Save to workspace.

Do not ship in Phase 1:

- Browser extension.
- Terminal agent (Phase 4).
- SDK.
- Team features.
- Marketplace.
- Desktop app.
- IDE extension.
- Git automation.
- Full autonomous code implementation.
- Unlimited hosted model credits.

Success metric:

```text
20 real users paste a real chat and say the Rescue Report is useful enough to reuse.
```

Stronger success metric:

```text
5 users come back twice in one week.
```

### Phase 2: Daily Workspace + Browser Companion

Timeline: after Phase 1 has usage.

Goal:

```text
Reduce friction and compete with extensions without becoming only an extension.
```

Ship:

- Context Passport library.
- Prompt library.
- Project folders.
- Search.
- Prompt Score.
- Model compare.
- BYOK provider setup.
- Saved learnings.
- Browser companion for one-click capture.
- Local/private mode for sensitive chats.
- Cloud sync for users who want workspace access across devices.

Browser companion should do only the jobs that the web app cannot do smoothly:

- Capture current chat.
- Send to LayerFlow workspace.
- Insert Continue Pack.
- Show quick Cost Check.
- Show quick Improve Prompt.

LayerFlow should not compete as "free local extension only." It should use the extension as a capture surface for the workspace.

Success metric:

```text
100 users save multiple Context Passports or prompts in a week.
```

### Phase 3: Developer Memory Layer

Timeline: after regular-user workspace has traction.

Goal:

```text
Bring LayerFlow memory into codebases without trying to beat Cursor, Claude Code, Codex CLI, OpenCode, or Copilot.
```

Build a memory-first developer layer.

Future commands:

```text
lf init
lf context
lf cost
lf suggest
lf memory
lf git
```

Ship first:

- `lf init` creates `LAYERFLOW.md`.
- `lf context` creates repo Context Passport.
- `lf cost` estimates repo/context model cost.
- `lf suggest` suggests improvements.
- `lf git` explains changes and drafts commit notes.
- Export repo Context Passport to Cursor, Claude Code, Codex CLI, OpenCode, or Copilot.

Do not launch with `lf implement`.

Add implementation only after users trust the memory layer.

Developer positioning:

```text
LayerFlow remembers why the code changed, what AI context was used, what model helped, and what it cost.
```

### Phase 4: Web + Terminal Coding Platform

Timeline: after Phase 1 usage, can be built in parallel with Phase 2.

This is the product direction the founder has chosen:

```text
LayerFlow is a web + terminal-based AI coding platform, similar to opencode, with improved features.
Anyone can code. Multiple agents. Plain English in, better prompts out.
```

Goals:

```text
1. Anyone can code — no terminal install, no API keys, no setup.
2. A real browser terminal for users who want the opencode experience.
3. Multiple agents that work in parallel and review each other.
4. Every Rescue Report feature (improve, compress, cost, model pick) feeds the agent loop.
```

Web-first surfaces (ship first):

- Prompt box: "write plain english and click improve" -> prompt improves automatically (clarity, context, constraints, output format, examples, cost).
- One-click run: improved prompt runs against the chosen model in a live session.
- Browser terminal (xterm.js-style): agent output, shell commands, file diffs.
- File tree + editor pane: agent edits files, user reviews diffs.
- Agent panel: multiple agents (implement / review / test / docs), each with its own model, status, and output.
- Session history: every run saved to the workspace (Context Passport + prompt library).

Terminal parity (later):

- `lf` CLI that mirrors the web session 1:1.
- Same session files, same Context Passports, same cost ledger.
- Users start in the browser, continue in the terminal, or vice versa.

Differentiation vs opencode:

```text
OpenCode: terminal-only, developer-first, local.
LayerFlow: web + terminal, plain-English prompt improver, multi-agent, cost check, rescue workflow.
```

How to do it (implementation path):

1. Web editor: Next.js app page (`/code`) with a file tree, code viewer/editor, and a chat/prompt panel — mock-first with local state and mock data, then wire to the API.
2. Browser terminal: use `@xterm/xterm` + `@xterm/addon-fit` in a React component; stream agent output through SSE or WebSocket.
3. Agent loop (MVP): Vercel AI SDK `streamText` with tool calls (read_file, edit_file, run_command); typed tool registry; one implement agent first.
4. Multi-agent (later): LangGraph.js with a supervisor that spawns implement/review/test agents; each agent has its own model and budget.
5. Prompt improver: a cheaper/faster model rewrites the user's plain-English request into a structured prompt (existing Improve Prompt feature), then the improved prompt feeds the main agent.
6. Cost + model pick: reuse Cost Check and Best Model Suggestion before the agent starts — show the run's estimated cost up front.
7. Sessions: every run produces a Context Passport and saved prompt in the workspace.

Tech stack additions (on top of the production stack table):

| Layer | Choice |
| --- | --- |
| Terminal UI | `@xterm/xterm` + `@xterm/addon-fit` (web), raw TTY pipe for CLI |
| Editor pane | CodeMirror 6 (light, Next.js-friendly) or Monaco for heavy users |
| Streaming | SSE first, WebSocket when sessions need bidirectional input |
| Agent loop | Vercel AI SDK tool calls -> typed state machine -> LangGraph.js for multi-agent |
| Execution (web) | Managed sandbox (E2B or Modal) for `run_command`; local execution only in the CLI |
| Session store | Redis for live session state, PostgreSQL for history |
| CLI | Node + Bun as the `lf` binary, same session format as web |

Do not ship in Phase 4 day one:

- Full IDE (file explorer is enough; Monaco comes later).
- Full autonomous implementation (`lf implement`) — keep agent suggestions reviewable.
- Unlimited hosted model credits.

Success metric:

```text
20 non-developer users write plain English, click Improve, and run a working session without installing anything.
```

## What To Add Now

### 1. AI Work Rescue Report

This is the new hero output.

It should feel like:

```text
Your messy AI conversation has been cleaned, compressed, improved, priced, and made ready to continue.
```

### 2. Context Diff

Must-have trust feature.

Users need to see what was removed before they trust compression.

### 3. Cost Check With Model Alternatives

Do not only estimate one model. Show cheaper alternatives.

Minimum:

- Claude estimate.
- OpenAI estimate.
- Gemini estimate.
- DeepSeek/OpenRouter estimate.
- "Good enough" recommendation.

### 4. Prompt Score

Score the improved prompt.

Categories:

- Clarity.
- Context completeness.
- Output format.
- Constraints.
- Token efficiency.
- Model fit.

### 5. Outcome Feedback

After users copy a Continue Pack, ask:

```text
Did this help you continue successfully?
```

Options:

- Worked well.
- Missing context.
- Too long.
- Wrong model suggestion.
- Bad prompt.

This creates a learning loop and helps improve the product.

### 6. Privacy Choice

Competitors are strong on local-first privacy. LayerFlow must address this clearly.

Modes:

- Web mode: save to LayerFlow workspace.
- Private mode later: process locally in browser where possible, or avoid storing originals.
- BYOK mode: user pays provider directly.

### 7. BYOK Vault

Support:

- OpenAI.
- Anthropic.
- Google Gemini.
- DeepSeek.
- Kimi.
- Groq.
- OpenRouter.
- Local/OpenAI-compatible endpoints later.

Important:

```text
BYOK is not just a developer feature. It is a margin and trust feature.
```

## What To Remove Or Defer

Remove from first launch:

- SDK.
- Desktop app.
- IDE extension.
- Marketplace.
- Social prompt feed.
- Enterprise SSO.
- SOC2/HIPAA positioning.
- Complex team roles.
- Full autonomous code implementation.
- Git Change Story.
- Dozens of integrations.
- Unlimited hosted model credits.

Defer until usage proves demand:

- Browser extension.
- Slack/Discord/Teams apps.
- Notion/Google Docs import.
- GitHub PR automation.
- Mobile app.
- Team shared memory.
- Fine-grained audit logs.
- LangGraph multi-agent workflows (Phase 4 day-one is a single implement agent; multi-agent comes after).

Reason:

```text
These features make the product look bigger but not sharper. The first product must prove that users value the Rescue Report.
```

## Pricing

Pricing must account for free competitors.

### Free

- Limited Rescue Reports.
- Limited Smart Compress.
- Limited Improve Prompt.
- Markdown export.
- Basic prompt/context library.
- No hosted model credits.

Purpose:

```text
Let users test value before paying.
```

### Starter: `$5/month`

No hosted model credits.

Includes:

- More Rescue Reports.
- More Context Passports.
- More Smart Compress runs.
- More Improve Prompt runs.
- BYOK.
- Cost Check.
- Saved workspace.
- Search.

Purpose:

```text
Sell workflow value, not model resale.
```

### Pro: `$12-$15/month`

Includes:

- Everything in Starter.
- Capped hosted LayerFlow credits.
- More model compare runs.
- Advanced Cost Check.
- Larger Context Passports.
- Browser companion when available.
- Workspace search and exports.

Hard rule:

```text
Never offer unlimited hosted AI credits.
```

### Optional Early Lifetime Deal

Because competitors offer free or one-time pricing, a limited early deal can help validate demand:

```text
$29-$49 lifetime for early users, limited quantity, BYOK only.
```

Do this only if it helps get early feedback. Do not make it the long-term business model.

### Team Later

Includes:

- Shared Context Passports.
- Shared prompt library.
- Team budgets.
- Admin provider keys.
- Usage reports.
- Shared project memory.

## 30 Day Build Plan

Build only the sharp MVP.

### Week 1

- Paste/import screen.
- Save draft sessions.
- Source detection.
- Basic Context Passport schema.

### Week 2

- Smart Compress.
- Context Diff.
- Editable Context Passport fields.

### Week 3

- Improve Prompt.
- Continue Pack copy/export.
- Save to workspace.

### Week 4

- Cost Check.
- Best Model Suggestion.
- Landing page for AI Work Rescue Report.
- Test with 20 real users.

Do not spend this month on terminal, SDK, marketplace, team features, or a full extension.

## Validation Plan

Before building more, validate against competitors.

### Competitor Test

Try:

- ContextSwitchAI.
- Rethread.
- AI Context Flow.
- TransferLLM.
- Contextable.

For each, record:

- How easy is capture?
- Does it improve the prompt?
- Does it show cost?
- Does it show what context was removed?
- Does it recommend cheaper models?
- Does it save a reusable project workspace?
- Would a regular user understand it?
- Would a user pay for LayerFlow after seeing this competitor?

### User Test

Ask users:

- Have you ever lost AI context when switching tools?
- Have you hit a Claude/ChatGPT/Gemini limit while working?
- Would you paste your chat here for a Rescue Report?
- Is the improved prompt actually better?
- Is the compressed context trustworthy?
- Is the cost estimate useful?
- Would you pay `$5/month` for this if you use your own API key?

Launch test copy:

```text
I built a tool that turns messy AI chats into a cleaner prompt, cheaper context, and a ready-to-paste continuation pack.
```

Places to test:

- Reddit AI communities.
- Student/founder groups.
- Indie hacker communities.
- Developer Discords.
- Friends using Claude/ChatGPT daily.

## Production Tech Stack

Use production-grade primitives, but keep MVP simple.

| Layer | MVP choice | Later scale choice |
| --- | --- | --- |
| Web app | Next.js, React, Tailwind | Same |
| API | Existing Hono API, Zod/contracts, Drizzle | Same |
| Database | PostgreSQL | PostgreSQL as source of truth |
| RAG memory | PostgreSQL + pgvector | Qdrant if vector scale requires it |
| Cache | Redis | Redis semantic cache / LangCache-style layer |
| Jobs | BullMQ on Redis | Temporal for mission-critical workflows |
| AI UX | Vercel AI SDK or equivalent | Same plus richer streaming/tool calls |
| Agent orchestration | Simple typed state machine | LangGraph/LangGraph.js when workflows need checkpointing |
| Observability | Sentry + structured logs | OpenTelemetry + LangSmith-style agent traces |
| Evals | Manual eval set first | Promptfoo or Ragas-style evals |
| Secrets | Encrypted provider-key vault | OS keychain/local vault for terminal later |

## RAG And Memory Design

Use RAG for useful context retrieval, not for buzzwords.

MVP flow:

```text
Paste chat/problem
-> clean text
-> summarize into Context Passport
-> save original + summary
-> create embeddings when useful
-> retrieve relevant context next time
-> create Continue Pack
```

Store:

- Original chat text, unless user chooses no-storage mode.
- Clean summary.
- Context Passport fields.
- Context Diff.
- Improved prompt.
- Continue Pack.
- Source model/tool.
- Target model/tool.
- Estimated cost.
- User edits.
- Tags/project.
- Outcome feedback.

For MVP:

```text
PostgreSQL + pgvector + Redis cache.
```

For scale:

```text
Qdrant for dedicated vector search + Redis semantic cache + PostgreSQL as source of truth.
```

## Cache Strategy

Redis should support:

- Session cache.
- Rate limiting.
- Cost estimate cache.
- Provider health.
- Exact prompt cache.
- Semantic prompt cache later.
- Background job queues through BullMQ.

Cache layers:

```text
L1: short in-process cache for hot config/pricing
L2: Redis exact cache for identical tasks
L3: Redis semantic cache for similar prompts later
L4: RAG retrieval from pgvector/Qdrant
```

Safety rules:

- Never share private cache across users.
- Cache by user/workspace/project/model.
- Mark whether output is fresh, exact cache, or semantic cache.
- Let users delete saved context.
- Do not store provider keys in project repos.

## Agent Orchestration Strategy

Do not start with a big autonomous framework.

Start with a simple typed workflow:

```text
Input -> clean -> summarize -> context diff -> improve -> cost check -> model suggestion -> export -> save
```

Use LangGraph or LangGraph.js later when LayerFlow needs:

- Checkpointing.
- Human approval in the middle of a workflow.
- Resume after crash.
- Branching workflows.
- Multi-agent comparison.
- Durable agent memory.
- Complex terminal automation.

Production path:

```text
Simple typed state machine -> LangGraph for complex workflows -> Temporal for mission-critical durable jobs
```

## Fast UX Rules

The product should feel fast even when AI is slow.

Rules:

- Stream output.
- Show progress steps.
- Show editable Context Passport fields.
- Show Context Diff before final copy.
- Let users copy partial Continue Pack.
- Run long imports and embeddings in background jobs.
- Use cheaper/faster models for classification and compression.
- Use stronger models only for hard reasoning or final prompt improvement.
- Show savings clearly.
- Keep the first screen focused on paste/import.

## Website Copy

Hero headline:

```text
Fix messy AI chats before you continue.
```

Subtitle:

```text
Paste any ChatGPT, Claude, Gemini, DeepSeek, or Kimi conversation. LayerFlow creates a Rescue Report with compressed context, a better next prompt, cheaper model options, and a Continue Pack you can use anywhere.
```

Primary CTA:

```text
Rescue My AI Chat
```

Secondary CTA:

```text
Improve A Prompt
```

Feature bullets:

- Compress long chats into useful context.
- Improve your next prompt.
- See cheaper model options.
- Continue in any AI tool.
- Save what worked.
- Review what context was kept or removed.

## Brand Note

There are existing unrelated uses of the name "LayerFlow", including AI UI generation, research, and other projects.

This is not an immediate reason to stop, but before serious launch:

- Check trademark availability.
- Check SEO difficulty.
- Secure clear social handles if possible.
- Consider a clearer product tagline if the name stays.

The name can still work if the positioning is strong:

```text
LayerFlow - AI Work Rescue Reports
```

## Developer Roadmap Later

The developer layer should use the same Context Passport system.

Local project files:

```text
LAYERFLOW.md
.layerflow/
  context/
  sessions/
  cache/
  logs/
```

Future commands:

```text
lf init
lf context
lf cost
lf suggest
lf memory
lf git
```

Do not launch with `lf implement`.

Developer value:

- Save repo context.
- Explain Git changes.
- Track AI-assisted decisions.
- Estimate model cost.
- Export repo Context Passport to any coding agent.

This lets LayerFlow work with Cursor, Claude Code, Codex CLI, OpenCode, and GitHub Copilot instead of fighting them.

## Final Feature Priority

Build now:

1. AI Work Rescue Report.
2. Context Passport.
3. Smart Compress.
4. Context Diff.
5. Improve Prompt.
6. Cost Check.
7. Best Model Suggestion.
8. Continue Pack.

Build next:

1. Context library.
2. Prompt library.
3. BYOK.
4. Browser companion.
5. Model compare.

Build later (Phase 4, web + terminal coding platform):

1. Web coding workspace (`/code`): prompt improver, agent panel, file tree, editor.
2. Browser terminal (xterm.js-style).
3. Multi-agent (implement / review / test).
4. `lf` CLI parity with web sessions.
5. Git Change Story.
6. Team memory.
7. Automations.
8. SDK.

Do not build:

1. A terminal-only clone of opencode with no web entry point and no prompt-improvement workflow.
2. Full Cursor competitor.
3. Enterprise-first observability platform.
4. Unlimited credit plan.
5. Marketplace before usage.

## Final Recommendation

Move forward, but change the wedge.

Do not build LayerFlow as:

```text
Another context transfer tool.
```

Build it as:

```text
The AI Work Rescue workspace that improves, compresses, prices, and preserves AI work.
```

This is the path:

```text
Web Rescue Report first -> Workspace second -> Web + Terminal coding platform (Phase 4) -> Developer memory later.
```

That path is more realistic in the current market and more defensible than a simple Limit Rescue product. The coding platform inherits everything the workspace already builds: Context Passports, prompt improver, cost check, model suggestion, and session history.

## Research Sources

Sources checked for this market analysis:

- ContextSwitchAI: https://contextswitchai.github.io/ContextSwitchAI/
- AI Chat Exporter Chrome listing: https://chromewebstore.google.com/detail/ai-chat-exporter-transfer/oodgeokclkgibmnnhegmdgcmaekblhof
- TransferLLM: https://transferllm.com/
- AI Context Flow: https://plurality.network/ai-context-flow/
- Rethread: https://rethread.dev/
- ContextBridge: https://www.ctxbridge.io/
- Contextable: https://contextable.me/
- Mem0 / OpenMemory: https://mem0.ai/
- LayerFlow name collision: https://www.layerflow.com/
