import type { BlogPost } from "@/lib/blog/types";

/**
 * Search Console corpus — Batch 2 (Aug 12): context engineering cluster.
 */
export const corpusSC2: BlogPost[] = [
  {
    "slug": "context-engineering-guide",
    "title": "Context Engineering: The Discipline After Prompt Engineering",
    "metaTitle": "Context Engineering Guide (2026)",
    "description": "Context engineering is the discipline of managing what the model sees: project state, decisions, and compressed history. Here is the 2026 playbook.",
    "publishedAt": "2026-08-12",
    "category": "Prompt engineering",
    "tags": ["context engineering", "context management", "LLM context", "AI workflow"],
    "primaryKeyword": "context engineering",
    "secondaryKeywords": ["context management AI", "LLM context engineering", "context layer", "AI context workflow"],
    "readingTime": "7 min read",
    "author": "LayerFlow Team",
    "relatedSlugs": ["layered-ai-prompts-layers-explained", "ai-context-loss-problem", "context-compression-techniques", "context-window-optimization"],
    "blocks": [
      { "type": "p", "text": "Prompt engineering decides what you ask. Context engineering decides what the model sees — and in 2026, that second question determines both output quality and your API bill. Developers lose an estimated 15-20% of productive time to context switching, and the AI version of that tax is re-explaining projects to every new session." },
      { "type": "p", "text": "Context engineering is the discipline of managing that layer deliberately: what context enters the window, what gets compressed, what persists across sessions, and what is portable across models. This guide is the 2026 playbook. It is the design philosophy behind the [LayerFlow workspace](/sign-in) — check the [pricing](/pricing) and [docs](/docs) to see how it maps to the product." },
      { "type": "h2", "id": "what-context-engineering-means", "text": "What context engineering means" },
      { "type": "p", "text": "A model is only as good as the context it sees. Context engineering treats that input as designed infrastructure instead of an accident: the static context (project rules, conventions) is curated once, the dynamic context (files, diffs, errors) is gathered automatically, and the historical context is compressed to decisions instead of transcripts." },
      { "type": "h2", "id": "the-context-stack", "text": "The context stack" },
      { "type": "ul", "items": [
        "Static layer: project conventions, tech stack, security rules — written once, always attached.",
        "Dynamic layer: open files, git diff, error logs — gathered at request time.",
        "Historical layer: past decisions and failures — compressed, never pasted raw.",
        "Output layer: format and constraints — stable per task."
      ] },
      { "type": "p", "text": "The failure mode is the same at every layer: bloat. Teams paste full chat histories, entire file trees, and obsolete docs into the window and wonder why quality drops. Context engineering replaces pasting with structure." },
      { "type": "h2", "id": "the-three-operations", "text": "The three operations: gather, compress, preserve" },
      { "type": "ol", "items": [
        "Gather: collect current state automatically — which files changed, which error just appeared.",
        "Compress: reduce history to decisions and constraints; a 15,000-word session becomes ~1,000 words of signal.",
        "Preserve: keep the result in durable memory that survives sessions, models, and team members."
      ] },
      { "type": "h2", "id": "measuring-context-quality", "text": "Measuring context quality" },
      { "type": "ul", "items": [
        "Signal ratio: useful tokens divided by total tokens. Below 30% means bloat is costing you.",
        "Decision survival: can a fresh session reproduce the last session's key decisions without re-asking?",
        "Re-explanation rate: how often do you restate your project setup to a model?",
        "Cost per task: compressed context cuts token spend 60-80% on the same work."
      ] },
      { "type": "callout", "text": "Pro tip: run the decision survival test once a month. Start a fresh session with only your preserved context and ask it to restate your project's goal, conventions, and last decision. If it cannot, your context layer is leaking." },
      { "type": "h2", "id": "common-mistakes", "text": "Common mistakes" },
      { "type": "ul", "items": [
        "Storing context as chat history and searching it later — transcripts are not state.",
        "Letting the context window fill with noise because trimming feels risky.",
        "Keeping project context in one person's head instead of a shared file or workspace.",
        "Treating all context as equal — decisions matter more than reasoning."
      ] },
      { "type": "h2", "id": "next-steps", "text": "Internal next steps" },
      { "type": "p", "text": "Go deeper with [AI Context Loss](/blog/ai-context-loss-problem) and [Context Compression Techniques](/blog/context-compression-techniques). For the architecture, read [Layered AI Prompts Explained](/blog/layered-ai-prompts-layers-explained) and [Context Window Optimization](/blog/context-window-optimization)." },
      { "type": "p", "text": "Put context engineering into practice: [sign in](/sign-in) to LayerFlow and build your first AI summary, or review [pricing](/pricing) first." },
      { "type": "h2", "id": "faq", "text": "FAQ" },
      { "type": "faq", "items": [
        { "q": "What is context engineering?", "a": "Context engineering is the discipline of managing what an LLM sees: curating static project context, gathering dynamic state automatically, compressing history to decisions, and preserving it across sessions and models." },
        { "q": "Why does context matter more than the model?", "a": "Because a great model with bad context answers worse than a good model with great context. The model can only reason over what you give it, and noisy context actively degrades attention." },
        { "q": "How do I start with context engineering?", "a": "Write your static project context into one durable file (CLAUDE.md, AGENTS.md, or a workspace), stop pasting raw chat history, and compress past sessions into goal, decisions, state, constraints, and next action." }
      ] }
    ]
  },
  {
    "slug": "ai-context-loss-problem",
    "title": "AI Context Loss: The Hidden Productivity Tax and How to Fix It",
    "metaTitle": "AI Context Loss: The Hidden Productivity Tax",
    "description": "AI context loss costs developers 15-20% of productive time. Learn where context leaks, how much it costs, and the fix that ends re-explaining.",
    "publishedAt": "2026-08-12",
    "category": "Productivity",
    "tags": ["ai context loss", "context management", "AI productivity", "context switching"],
    "primaryKeyword": "ai context loss",
    "secondaryKeywords": ["context loss LLM", "AI session continuity", "re-explaining to AI", "context switching AI tools"],
    "readingTime": "6 min read",
    "author": "LayerFlow Team",
    "relatedSlugs": ["ai-chat-rescue-continue-sessions", "context-engineering-guide", "context-portability-models", "complete-guide-ai-workspace-cost-control"],
    "blocks": [
      { "type": "p", "text": "Every time you explain your project to ChatGPT for the fifth time this week, you are paying the AI context loss tax. Research on developer productivity finds context switching eats 15-20% of productive time — and the AI version is worse, because every session, model, and tool restart resets the state." },
      { "type": "p", "text": "This guide breaks down where context leaks, what the tax actually costs, and the durable fix. LayerFlow was built on this problem: the [workspace](/sign-in) exists so context survives sessions, and the [pricing](/pricing) shows how it scales from solo to team." },
      { "type": "h2", "id": "where-context-leaks", "text": "The five places context leaks" },
      { "type": "ul", "items": [
        "Session death: rate limits, timeouts, and refresh accidents end threads with the work inside.",
        "Model switching: moving from Claude to GPT means starting over unless context is portable.",
        "Tool switching: the IDE has context the chat never had, and vice versa.",
        "Long-session decay: past a few thousand tokens, models start forgetting their own earlier answers.",
        "Team handoffs: one engineer's context dies when they leave the room — or the company."
      ] },
      { "type": "h2", "id": "the-cost-math", "text": "The cost math" },
      { "type": "p", "text": "Assume a developer re-establishes project context for five minutes, twice a day, across a 220-day working year. That is 36 hours a year per developer — nearly a full work week. On a ten-person team, that is nine weeks of collective context tax. And that is before counting the token cost of re-explaining: every redundant explanation is paid for twice in API spend." },
      { "type": "h2", "id": "the-symptom-matrix", "text": "The symptom matrix: recognizing the leak" },
      { "type": "ul", "items": [
        "You paste the same project description into more than one tool.",
        "You say can you remember the constraints from last time? and get a blank.",
        "Your teammates each have private, divergent versions of project context.",
        "You avoid switching models even when another would be better, to protect context."
      ] },
      { "type": "h2", "id": "the-fix", "text": "The fix: durable, portable context" },
      { "type": "ol", "items": [
        "Write it down once: project goals, conventions, and constraints in a durable file or workspace.",
        "Compress sessions: after each working session, save goal, decisions, state, next action.",
        "Port the summary: the same compressed context works in any model and any tool.",
        "Share it: teammates consume the same context instead of recreating it."
      ] },
      { "type": "callout", "text": "Pro tip: context loss is not a memory problem, it is a state problem. Sessions are transcripts; state must live outside them. The day you stop treating chat history as memory is the day the tax ends." },
      { "type": "h2", "id": "context-loss-in-agents", "text": "Context loss in AI agents: the same failure, bigger stakes" },
      { "type": "p", "text": "Multi-agent systems fail the same way humans do — at the handoffs. Analysis of production agent pipelines identifies goal loss, evidence loss, and constraint loss as the recurring failure modes when one agent hands work to the next. The fix is identical: structured state that survives the boundary, not a story that has to be retold." },
      { "type": "h2", "id": "next-steps", "text": "Internal next steps" },
      { "type": "p", "text": "Fix the leak with [Context Engineering](/blog/context-engineering-guide) and [AI Chat Rescue](/blog/ai-chat-rescue-continue-sessions). For the model side, read [Context Portability Between Models](/blog/context-portability-models) and [The Complete Guide to AI Workspaces and Cost Control](/blog/complete-guide-ai-workspace-cost-control)." },
      { "type": "p", "text": "Stop paying the tax: [sign in](/sign-in) to LayerFlow, save your project context once, and carry it everywhere. See [pricing](/pricing) for the free tier." },
      { "type": "h2", "id": "faq", "text": "FAQ" },
      { "type": "faq", "items": [
        { "q": "What is AI context loss?", "a": "AI context loss is when the working state of an AI session — goals, decisions, constraints, progress — disappears between sessions, models, or tools, forcing you to re-explain everything from scratch." },
        { "q": "How much does context loss cost?", "a": "Estimates put context-switching losses at 15-20% of productive developer time. Re-explaining also costs real API spend, since every redundant explanation is a paid token call." },
        { "q": "How do I stop losing AI context?", "a": "Move state out of chat history: write project context once into a durable file or workspace, compress each session into decisions and next actions, and reuse that compressed context across models and tools." }
      ] }
    ]
  },
  {
    "slug": "context-portability-models",
    "title": "Context Portability: Move Any Conversation to Any Model Without Losing a Step",
    "metaTitle": "Context Portability Between Models (2026)",
    "description": "Context portability lets you move a conversation from ChatGPT to Claude to Gemini without re-explaining. Here is the pattern that makes it work.",
    "publishedAt": "2026-08-12",
    "category": "Prompt engineering",
    "tags": ["context portability", "switch AI models", "portable context", "AI conversation summary"],
    "primaryKeyword": "context portability",
    "secondaryKeywords": ["switch between AI models", "portable AI context", "AI conversation summary", "move conversation to another model"],
    "readingTime": "6 min read",
    "author": "LayerFlow Team",
    "relatedSlugs": ["context-engineering-guide", "multi-model-workflow-design", "ai-chat-rescue-continue-sessions", "how-to-multi-model-comparison"],
    "blocks": [
      { "type": "p", "text": "JetBrains found 67% of developers use multiple AI tools — but almost none of them have a way to move work between models without re-explaining. That is the context portability gap: your work is locked inside whichever chat happened to be open." },
      { "type": "p", "text": "Context portability is the ability to take a conversation's real state — goal, decisions, constraints, progress — and continue it in another model in seconds. This guide shows the pattern. It is the core of the [LayerFlow workspace](/sign-in); the [docs](/docs) document the summary format." },
      { "type": "h2", "id": "what-travels", "text": "What actually needs to travel" },
      { "type": "ul", "items": [
        "Goal: the thing you are building or fixing.",
        "Decisions: what was already agreed, so the new model does not re-litigate.",
        "State: where the work stopped, file by file.",
        "Constraints: budgets, conventions, security rules.",
        "Failures: what was tried and rejected.",
        "Next action: the exact thing to do next."
      ] },
      { "type": "p", "text": "Transcripts do not travel. Raw history pasted into a new model is expensive, noisy, and often counterproductive. What travels is the distilled state — roughly 1,000 words of signal instead of 15,000 words of talk." },
      { "type": "h2", "id": "the-summary-pattern", "text": "The AI summary pattern" },
      { "type": "p", "text": "An AI summary is a structured block with those six fields, formatted so any model can consume it as a continuation prompt. The opening line tells the model the rules: continue this work; restate the goal before starting; preserve the constraints; do not revisit settled decisions." },
      { "type": "p", "text": "Format matters less than completeness — but consistency matters a lot. Teams that standardize on one summary template can automate the whole flow: extract from the old session, compress, hand to the new model." },
      { "type": "h2", "id": "when-to-port", "text": "When porting is a superpower" },
      { "type": "ul", "items": [
        "Rate-limited mid-task: switch models instead of waiting or restarting.",
        "Quality plateau: a fresh model on the same state often finds the error the first one missed.",
        "Cost optimization: move long-tail work to cheaper models without losing context.",
        "Best-of-breed: use the strongest model for each stage — planning here, coding there."
      ] },
      { "type": "h2", "id": "common-mistakes", "text": "Common mistakes" },
      { "type": "ul", "items": [
        "Porting the transcript instead of the state — the new model drowns in noise.",
        "Leaving out failures, so the new model repeats the old mistakes.",
        "Hand-editing the summary every time instead of using a template.",
        "No verification step — a model that misread the goal will confidently do the wrong thing."
      ] },
      { "type": "callout", "text": "Pro tip: always verify the handoff. Ask the new model to restate the goal and the last decision in one line before it starts. Thirty seconds of verification saves thirty minutes of wrong work." },
      { "type": "h2", "id": "next-steps", "text": "Internal next steps" },
      { "type": "p", "text": "See [Context Engineering](/blog/context-engineering-guide) for the underlying discipline and [AI Chat Rescue](/blog/ai-chat-rescue-continue-sessions) for the emergency version. For choosing where to port, read [Designing a Multi-Model Workflow](/blog/multi-model-workflow-design)." },
      { "type": "p", "text": "Make context portable today: [sign in](/sign-in) to LayerFlow, save an AI summary for your active project, and try the same task in two models. [Pricing](/pricing) has a free tier." },
      { "type": "h2", "id": "faq", "text": "FAQ" },
      { "type": "faq", "items": [
        { "q": "How do I switch models without losing context?", "a": "Compress the session into an AI summary: goal, decisions, state, constraints, failures, and next action. Paste it as the opening message in the new model and verify it restates the goal before working." },
        { "q": "What is an AI conversation summary?", "a": "It is the distilled state of an AI session — goal, current state, key decisions, constraints, failures, next action — captured in six fields so any model can continue the work." },
        { "q": "Can I move a ChatGPT conversation to Claude?", "a": "Yes. Copy the conversation, distill it into the summary fields, and paste it into Claude with a continuation instruction. The new model continues the work without needing the full transcript." }
      ] }
    ]
  },
  {
    "slug": "context-compression-techniques",
    "title": "Context Compression: 7 Techniques That Cut Tokens Without Losing Signal",
    "metaTitle": "Context Compression: 7 Token-Saving Techniques",
    "description": "Context compression cuts token costs 60-80%. Seven techniques for compressing LLM context without losing the signal that drives quality.",
    "publishedAt": "2026-08-12",
    "category": "Cost control",
    "tags": ["context compression", "token savings", "LLM cost", "context management"],
    "primaryKeyword": "context compression",
    "secondaryKeywords": ["compress LLM context", "reduce tokens", "context summarization", "token efficiency"],
    "readingTime": "7 min read",
    "author": "LayerFlow Team",
    "relatedSlugs": ["llm-context-compression", "token-cost-optimization-guide", "context-window-budgeting", "context-engineering-guide"],
    "blocks": [
      { "type": "p", "text": "The most expensive tokens in AI are the ones the model does not need. Context compression is the practice of shrinking what you send — history, files, instructions — while keeping the signal that drives quality. Done well it cuts token spend 60-80% on the same work, which is the fastest cost fix that does not touch model choice." },
      { "type": "p", "text": "Menlo Ventures projects LLM inference spend reaching $15B by the end of 2026, with 40-60% of enterprise spend wasted. Compression attacks the waste side directly. These seven techniques are ordered from easiest to most advanced — implement them in order. LayerFlow's [smart compress](/sign-in) automates the workflow; [pricing](/pricing) covers the details." },
      { "type": "h2", "id": "technique-1", "text": "1. Lead with the task" },
      { "type": "p", "text": "Put the instruction first, context after. Models weight the beginning of the window heavily, and a buried instruction forces repetition — which is itself token waste. Task first, then context, then constraints, then output format." },
      { "type": "h2", "id": "technique-2", "text": "2. Diff instead of full files" },
      { "type": "p", "text": "Never paste a 500-line file when the change is ten lines. Send the diff, the interface, or the relevant function signature. A developer debugging an error needs the 20 lines around the stack trace, not the whole repository." },
      { "type": "h2", "id": "technique-3", "text": "3. Preserve decisions, drop reasoning" },
      { "type": "p", "text": "When compressing a long session, keep the conclusions and constraints; discard the intermediate reasoning. The next session needs to know what was decided and what is off-limits — not how the model got there. This is the single biggest win when porting history." },
      { "type": "h2", "id": "technique-4", "text": "4. Summarize hierarchically" },
      { "type": "p", "text": "For genuinely long context, summarize in layers: a paragraph per major section, then a sentence per paragraph. Two-level compression preserves structure while cutting volume by an order of magnitude. The summary should read as state, not narrative." },
      { "type": "h2", "id": "technique-5", "text": "5. Strip formatting and fluff" },
      { "type": "p", "text": "Markdown tables, repeated boilerplate, and conversational filler cost real tokens. Convert tables to compact key-value lists, strip greetings and pleasantries, and remove anything that does not change what the model should do." },
      { "type": "h2", "id": "technique-6", "text": "6. Set max output tokens honestly" },
      { "type": "p", "text": "If the answer needs 200 tokens, request 200, not 4,000. Output tokens are the expensive ones on every major provider, and unused headroom still gets charged. Right-sizing output is free money." },
      { "type": "h2", "id": "technique-7", "text": "7. Cache what repeats" },
      { "type": "p", "text": "For repeated tasks with stable instructions, prompt caching lets you pay a fraction of the input cost on re-runs. Combined with compression, caching turns the most repetitive 20% of your workload into the cheapest 20%." },
      { "type": "callout", "text": "Pro tip: measure the signal ratio before optimizing anything. Useful tokens divided by total tokens. Under 30% means bloat is costing you quality as well as money — compressed prompts often produce better answers, not just cheaper ones." },
      { "type": "h2", "id": "what-not-to-compress", "text": "What never to compress" },
      { "type": "ul", "items": [
        "Constraints and exclusions — they define correctness.",
        "Security rules and compliance requirements.",
        "The current error message or stack trace, verbatim.",
        "Exact names: files, functions, services — paraphrasing breaks references."
      ] },
      { "type": "h2", "id": "next-steps", "text": "Internal next steps" },
      { "type": "p", "text": "Pair compression with [Context Window Budgeting](/blog/context-window-budgeting) and [Token Cost Optimization](/blog/token-cost-optimization-guide). For the engineering layer, read [LLM Context Compression](/blog/llm-context-compression)." },
      { "type": "p", "text": "Compress your next session: [sign in](/sign-in) to LayerFlow and run a chat through smart compress, or start with [pricing](/pricing)." },
      { "type": "h2", "id": "faq", "text": "FAQ" },
      { "type": "faq", "items": [
        { "q": "How do I compress LLM context?", "a": "Lead with the task, send diffs instead of full files, preserve decisions while dropping reasoning, summarize hierarchically, strip formatting, right-size output tokens, and cache repeating instructions." },
        { "q": "Does context compression hurt output quality?", "a": "It usually improves it. Noise dilutes attention; compressed context focuses the model on the signal. The exceptions are constraints, security rules, and exact identifiers — never compress those." },
        { "q": "How much can context compression save?", "a": "Teams typically cut token spend 60-80% on the same workload by compressing history and trimming context, without touching model choice — the fastest cost fix available." }
      ] }
    ]
  },
  {
    "slug": "claude-code-md-project-context",
    "title": "CLAUDE.md and Friends: Project Context Files That Actually Work",
    "metaTitle": "CLAUDE.md Project Context Files (2026 Guide)",
    "description": "CLAUDE.md, AGENTS.md, and project context files: what to put in them, how to structure them, and why they fix the re-explaining problem.",
    "publishedAt": "2026-08-12",
    "category": "Prompt engineering",
    "tags": ["CLAUDE.md", "project context files", "AI coding conventions", "AGENTS.md"],
    "primaryKeyword": "CLAUDE.md",
    "secondaryKeywords": ["AGENTS.md", "project context file AI", "AI coding conventions file", "context file best practices"],
    "readingTime": "6 min read",
    "author": "LayerFlow Team",
    "relatedSlugs": ["context-engineering-guide", "openai-system-prompt-best-practices-2026", "prompt-folder-structure-design", "ai-context-loss-problem"],
    "blocks": [
      { "type": "p", "text": "CLAUDE.md is a file in your repository that tells AI coding tools how the project works: conventions, architecture, commands, and constraints. AGENTS.md and similar files do the same job across other tools. In 2026, with coding assistants like Claude Code and Cursor reaching 18% work adoption each, these files are becoming the standard interface between teams and AI." },
      { "type": "p", "text": "A good context file is the cheapest productivity infrastructure your team can build — and a bad one is noise the model reads every session. This guide covers what belongs inside, how to structure it, and the maintenance rhythm. It complements the [LayerFlow workspace](/sign-in) approach to context; the [docs](/docs) show the full setup." },
      { "type": "h2", "id": "what-belongs-in-it", "text": "What belongs in a project context file" },
      { "type": "ul", "items": [
        "Tech stack and versions: Next.js 14, TypeScript, Prisma — no ambiguity.",
        "Architecture: where the code lives, how layers talk to each other.",
        "Conventions: naming, patterns, testing requirements.",
        "Commands: how to build, test, lint, and run.",
        "Security rules: never commit keys, validate inputs, no raw SQL.",
        "Project state: what is in flight and what is off-limits."
      ] },
      { "type": "p", "text": "What does not belong: history, personal preferences, and anything the model can discover from the code itself. The file answers the questions that code cannot answer." },
      { "type": "h2", "id": "structure", "text": "A structure that survives teams" },
      { "type": "p", "text": "Use short sections with a fixed order: project overview (2-3 lines), stack, architecture, conventions, commands, guardrails. Keep every section under ten lines. If a section grows past that, it is documentation that belongs in the docs folder — and the context file should point there." },
      { "type": "p", "text": "Write it so a new developer — or a new model — can act correctly on their first session. Test this literally: give the file to a fresh teammate and see if they ask zero setup questions." },
      { "type": "h2", "id": "maintenance", "text": "The maintenance rhythm" },
      { "type": "p", "text": "Context files rot faster than code. The fix is small and regular: every time a convention changes, update the file in the same commit. Every time a model does the wrong thing because the file was stale, fix the file on the spot. A quarterly review that reads the file top to bottom and cuts anything unused keeps it honest." },
      { "type": "callout", "text": "Pro tip: one context file per repository, not per tool. Keep CLAUDE.md as the source of truth and let other tools reference it. Multiple files drift; one file stays accurate." },
      { "type": "h2", "id": "beyond-repos", "text": "Beyond repositories: project context everywhere" },
      { "type": "p", "text": "The same pattern extends beyond code: a team wiki page, a shared workspace, a Notion doc. The principle is identical — durable state that every AI session and every teammate consumes instead of recreating. The difference between a file and a workspace is automation: files require tools to read them; workspaces attach context automatically." },
      { "type": "h2", "id": "next-steps", "text": "Internal next steps" },
      { "type": "p", "text": "Pair this with [Context Engineering](/blog/context-engineering-guide) and [Prompt Folder Structures That Scale](/blog/prompt-folder-structure-design). For system prompts in products, read [OpenAI System Prompt Best Practices 2026](/blog/openai-system-prompt-best-practices-2026)." },
      { "type": "p", "text": "Put project context where AI tools and teammates both use it: [sign in](/sign-in) to LayerFlow or keep it in a file — the discipline is the same. See [pricing](/pricing)." },
      { "type": "h2", "id": "faq", "text": "FAQ" },
      { "type": "faq", "items": [
        { "q": "What is a CLAUDE.md file?", "a": "CLAUDE.md is a repository file that documents how a project works for AI coding tools — stack, architecture, conventions, commands, and guardrails — so every session starts with the right context." },
        { "q": "What should I put in AGENTS.md or CLAUDE.md?", "a": "The non-obvious facts: tech stack, architecture, conventions, build commands, security rules, and current project state. Leave out anything the model can discover from the code itself." },
        { "q": "How often should I update my context file?", "a": "Update it in the same commit as any convention change, fix it immediately when a model acts on stale information, and do a quarterly read-through that removes unused sections." }
      ] }
    ]
  },
  {
    "slug": "multi-model-workflow-design",
    "title": "Designing a Multi-Model Workflow: Which Model for Which Step",
    "metaTitle": "Multi-Model Workflow Design (2026)",
    "description": "Design a multi-model workflow that assigns the right model to each step: planning, coding, review, and cost-sensitive batch work.",
    "publishedAt": "2026-08-12",
    "category": "Model comparison",
    "tags": ["multi-model workflow", "model selection", "AI workflow design", "best model per task"],
    "primaryKeyword": "multi-model workflow",
    "secondaryKeywords": ["best model for each task", "multi-model setup", "model per step workflow", "AI tool workflow"],
    "readingTime": "7 min read",
    "author": "LayerFlow Team",
    "relatedSlugs": ["how-to-multi-model-comparison", "best-model-per-task-2026", "context-portability-models", "cheap-mode-routing-flash-vs-frontier"],
    "blocks": [
      { "type": "p", "text": "JetBrains reports 67% of developers already use multiple AI tools — yet most use them by accident, not by design. A multi-model workflow assigns models to steps deliberately: the strongest model for the hard thinking, the cheapest for the repetitive work, and portable context so switching costs nothing." },
      { "type": "p", "text": "This guide is the design process for a multi-model workflow, with a worked example and the pitfalls that sink most attempts. The [LayerFlow compare](/sign-in) feature was built for exactly this: pick the winner per task with cost and latency in front of you. [Pricing](/pricing) covers model access." },
      { "type": "h2", "id": "the-design-process", "text": "The design process in four steps" },
      { "type": "ol", "items": [
        "List your recurring tasks: planning, coding, review, research, writing, batch processing.",
        "Rate each task on complexity (simple to frontier) and latency tolerance.",
        "Map a model tier to each rating: small and cheap for simple, frontier for hard.",
        "Test the map side by side on your real work — then lock the winners in."
      ] },
      { "type": "p", "text": "The goal is not one model per task forever. It is a reviewed map, revisited whenever models change — and they change every few months." },
      { "type": "h2", "id": "the-worked-example", "text": "A worked example: the product development loop" },
      { "type": "ul", "items": [
        "Spec drafting: frontier model — reasoning-heavy, low volume, high leverage.",
        "Boilerplate and CRUD: small model — simple, high volume, cost-sensitive.",
        "Code review: mid-tier model — needs judgment, but not frontier depth.",
        "Debugging a hard failure: frontier model with full context ported from the session.",
        "Documentation and summaries: small model — quality bar is low, volume is high."
      ] },
      { "type": "p", "text": "The pattern: pay frontier prices where judgment matters, pay small-model prices where volume matters, and never re-pay the context tax between steps." },
      { "type": "h2", "id": "context-is-the-glue", "text": "Context is the glue" },
      { "type": "p", "text": "A multi-model workflow only works if state moves with the task. The spec drafted on a frontier model must reach the small model doing the boilerplate — compressed, with decisions intact. Without portable context, each model switch is a re-explanation session, and the workflow dies from friction." },
      { "type": "h2", "id": "pitfalls", "text": "Pitfalls that sink multi-model workflows" },
      { "type": "ul", "items": [
        "Choosing models by reputation instead of side-by-side results on your own tasks.",
        "Ignoring latency: a cheap model that takes 30 seconds for a user-facing step is not cheap.",
        "No fallback: when the assigned model fails, the workflow has no second option.",
        "Context loss at every handoff — the workflow becomes a game of telephone.",
        "Never revisiting the map when new models ship."
      ] },
      { "type": "callout", "text": "Pro tip: keep a per-task cost ledger for one month. The tasks where the small model won will surprise you — and the tasks where the frontier model paid for itself will justify the budget." },
      { "type": "h2", "id": "next-steps", "text": "Internal next steps" },
      { "type": "p", "text": "Test your map with [How to Do a Multi-Model Comparison](/blog/how-to-multi-model-comparison) and [Compare LLM Outputs Side by Side](/blog/how-to-compare-llm-outputs-side-by-side). For the 2026 model landscape, read [Best AI Model per Task](/blog/best-model-per-task-2026)." },
      { "type": "p", "text": "Design your workflow with data: [sign in](/sign-in) to LayerFlow and run your tasks across models side by side. [Pricing](/pricing) shows the free tier." },
      { "type": "h2", "id": "faq", "text": "FAQ" },
      { "type": "faq", "items": [
        { "q": "How do I choose which model for each task?", "a": "Rate each recurring task on complexity and latency tolerance, map model tiers to those ratings, and validate with side-by-side comparisons on your own work. Revisit the map whenever new models ship." },
        { "q": "Is it worth using multiple AI models?", "a": "Yes — 67% of developers already do. The savings come from sending simple high-volume work to cheap models and reserving frontier models for judgment-heavy tasks, with portable context between them." },
        { "q": "What breaks multi-model workflows?", "a": "Context loss at handoffs is the top killer, followed by model choice by reputation instead of evidence, and missing fallbacks when the assigned model fails." }
      ] }
    ]
  },
  {
    "slug": "ai-project-memory-guide",
    "title": "AI Project Memory: Persistent Context Across Sessions and Models",
    "metaTitle": "AI Project Memory Guide (2026)",
    "description": "AI project memory keeps context alive across sessions, models, and teammates. Build persistent project memory with state files and workspaces.",
    "publishedAt": "2026-08-12",
    "category": "Productivity",
    "tags": ["AI project memory", "persistent context", "project context", "AI memory"],
    "primaryKeyword": "AI project memory",
    "secondaryKeywords": ["persistent AI context", "project memory for AI", "AI memory across sessions", "remember context between sessions"],
    "readingTime": "6 min read",
    "author": "LayerFlow Team",
    "relatedSlugs": ["context-engineering-guide", "ai-context-loss-problem", "context-portability-models", "claude-code-md-project-context"],
    "blocks": [
      { "type": "p", "text": "Your AI tools forget everything between sessions; your project does not. AI project memory is the bridge: durable, structured state that survives model switches, session deaths, and team members leaving — so the tenth session starts where the ninth ended." },
      { "type": "p", "text": "Models do not remember, but your system can. This guide covers the memory layers — project state files, conversation summaries, and workspaces — and the discipline that keeps them accurate. The [LayerFlow workspace](/sign-in) is built on this idea; the [docs](/docs) explain the memory model." },
      { "type": "h2", "id": "the-memory-layers", "text": "The three memory layers" },
      { "type": "h3", "id": "layer-static", "text": "Layer 1: Static project state" },
      { "type": "p", "text": "The facts that rarely change: stack, architecture, conventions, security rules, goals. One durable file (CLAUDE.md, AGENTS.md) or workspace section. Written once, consumed everywhere. This layer answers what is this project?" },
      { "type": "h3", "id": "layer-working", "text": "Layer 2: Working state" },
      { "type": "p", "text": "The facts that change daily: what is in flight, what was decided, what is blocked, what is next. Updated at session end — five minutes of writing saves an hour of re-explaining. This layer answers where are we?" },
      { "type": "h3", "id": "layer-history", "text": "Layer 3: History and learnings" },
      { "type": "p", "text": "The compressed record: what failed and why, which prompts win, which models underperformed. This is the layer most teams skip, and it is the one that makes the whole system compound." },
      { "type": "h2", "id": "the-session-ritual", "text": "The session ritual that keeps memory alive" },
      { "type": "ol", "items": [
        "Start: open the project state and read it aloud to the model as context.",
        "Work: run the task with the model.",
        "End: update three lines — what we decided, where we stopped, what is next.",
        "Archive: once a week, fold the session notes into the history layer."
      ] },
      { "type": "p", "text": "The ritual takes under five minutes and eliminates the two-hour re-onboarding that otherwise happens every Monday morning." },
      { "type": "h2", "id": "files-vs-workspace", "text": "Files vs workspace memory" },
      { "type": "p", "text": "Files work: they are greppable, versionable, and free. The gap is automation — files only help if the model reads them, and most chat tools do not. Workspaces close the gap by attaching the right memory to the right session automatically, including compressed history from past runs." },
      { "type": "callout", "text": "Pro tip: keep a lessons-learned file per project, one bullet per failure. It is the highest-ROI memory you can keep: your team stops repeating the mistakes the models made last quarter." },
      { "type": "h2", "id": "next-steps", "text": "Internal next steps" },
      { "type": "p", "text": "Start with [Context Engineering](/blog/context-engineering-guide) and [CLAUDE.md Files That Work](/blog/claude-code-md-project-context). To recover memory that was never saved, see [AI Chat Rescue](/blog/ai-chat-rescue-continue-sessions)." },
      { "type": "p", "text": "Build project memory today: [sign in](/sign-in) to LayerFlow, or start with a state file and the session ritual. [Pricing](/pricing) covers the free tier." },
      { "type": "h2", "id": "faq", "text": "FAQ" },
      { "type": "faq", "items": [
        { "q": "How do I give AI persistent memory?", "a": "Keep three layers of durable state: static project facts, working state updated at session end, and compressed history. Attach them as context to every session — manually in files or automatically in a workspace." },
        { "q": "Why does my AI forget context between sessions?", "a": "Chat sessions are stateless transcripts. Memory only exists if you store state outside the session and feed it back in. Without that layer, every session starts from zero." },
        { "q": "What is the fastest way to start with AI project memory?", "a": "Write one project state file with stack, conventions, current work, and last decisions. Read it to the model at session start and update three lines at the end. That is the whole system in miniature." }
      ] }
    ]
  },
  {
    "slug": "context-window-budgeting",
    "title": "Context Window Budgeting: Allocate 128K Tokens Like an Engineer",
    "metaTitle": "Context Window Budgeting (2026 Guide)",
    "description": "Context window budgeting: allocate your token budget deliberately — task, context, constraints, output — and stop paying for noise.",
    "publishedAt": "2026-08-12",
    "category": "Cost control",
    "tags": ["context window budgeting", "token budget", "context management", "LLM cost"],
    "primaryKeyword": "context window budgeting",
    "secondaryKeywords": ["token budget allocation", "context window management", "128K context tokens", "LLM prompt size"],
    "readingTime": "6 min read",
    "author": "LayerFlow Team",
    "relatedSlugs": ["context-window-optimization", "context-compression-techniques", "token-cost-optimization-guide", "token-budget-planning"],
    "blocks": [
      { "type": "p", "text": "A 128K context window is not a gift, it is a budget. Every token you spend on noise is a token the model cannot use for judgment — and a dollar you pay twice: once for input, once again for the degraded output caused by the noise." },
      { "type": "p", "text": "Context window budgeting treats the window like a project budget: allocate deliberately, track the big items, and cut the line items that do not produce value. This guide gives you the allocation model and the guardrails. [LayerFlow's compress](/sign-in) helps you stay under budget automatically; [pricing](/pricing) shows the cost side." },
      { "type": "h2", "id": "the-allocation-model", "text": "The allocation model" },
      { "type": "ul", "items": [
        "Task: 2-5% — the instruction, first, and short.",
        "Static context: 10-15% — stack, conventions, rules, once.",
        "Dynamic context: 40-50% — the actual work: files, diffs, errors.",
        "Constraints: 5-10% — exclusions, decision boundaries, format rules.",
        "Output: 5-10% — the shape of the answer.",
        "Headroom: 20-30% — reserved for the model's own reasoning."
      ] },
      { "type": "p", "text": "The percentages are a starting point, not a law. The signal is the shape: tiny task, lean static context, heavy focused work context, explicit constraints, and deliberate headroom. If your history exceeds 30% of the window, compress it before you run." },
      { "type": "h2", "id": "the-cut-list", "text": "What to cut first" },
      { "type": "ol", "items": [
        "Raw chat history — replace with decisions and state.",
        "Full files — replace with diffs and interfaces.",
        "Duplicated instructions — say it once, exactly.",
        "Obsolete docs and dead code references.",
        "Conversational filler and repeated pleasantries."
      ] },
      { "type": "h2", "id": "budget-rules", "text": "Three budget rules that stick" },
      { "type": "p", "text": "Rule one: if a section of context did not change what the model did, it was noise — remove it next time. Rule two: the model cannot distinguish signal from noise in a wall of text, so structure every section with headings. Rule three: when in doubt, compress — a good summary beats a faithful transcript." },
      { "type": "callout", "text": "Pro tip: run a weekly audit of your longest prompts. Anything over 30% of the window with under 30% signal ratio is a candidate for compression — and a direct line item on your API bill." },
      { "type": "h2", "id": "long-context-temptation", "text": "The long-context temptation" },
      { "type": "p", "text": "Bigger windows invite dumping. Models with 200K and 1M windows handle it, but cost scales with input tokens on every provider, and quality still degrades with noise. Budgeting matters more on a 1M window, not less — the temptation is bigger and the bill is steeper." },
      { "type": "h2", "id": "next-steps", "text": "Internal next steps" },
      { "type": "p", "text": "Deepen with [Context Window Optimization](/blog/context-window-optimization) and [Context Compression: 7 Techniques](/blog/context-compression-techniques). For the money side, read [Token Cost Optimization Guide](/blog/token-cost-optimization-guide)." },
      { "type": "p", "text": "Put your context on a budget: [sign in](/sign-in) to LayerFlow and run your longest prompt through compress, or check [pricing](/pricing) first." },
      { "type": "h2", "id": "faq", "text": "FAQ" },
      { "type": "faq", "items": [
        { "q": "How do I budget a context window?", "a": "Allocate deliberately: short task instruction, lean static context, focused work context, explicit constraints, and 20-30% headroom. Compress anything that exceeds those shares, starting with raw chat history." },
        { "q": "Does a bigger context window mean better output?", "a": "No. Cost scales with input tokens and attention degrades with noise. A 1M window used carelessly produces worse answers than a 128K window used with discipline." },
        { "q": "What wastes the most context window tokens?", "a": "Raw chat history and full file dumps. Replacing transcripts with decisions and full files with diffs typically cuts context 60-80% without losing signal." }
      ] }
    ]
  },
  {
    "slug": "ai-conversation-handoff-team",
    "title": "AI Conversation Handoff: Team Protocols for Sharing AI Work",
    "metaTitle": "AI Conversation Handoff: Team Protocols (2026)",
    "description": "AI conversation handoff protocols for teams: how to pass AI work between people and models without losing decisions, constraints, or context.",
    "publishedAt": "2026-08-12",
    "category": "Productivity",
    "tags": ["AI conversation handoff", "team AI workflow", "context handoff", "AI collaboration"],
    "primaryKeyword": "AI conversation handoff",
    "secondaryKeywords": ["handoff AI session", "team AI workflow", "share AI context", "context handoff protocol"],
    "readingTime": "6 min read",
    "author": "LayerFlow Team",
    "relatedSlugs": ["sharing-prompt-versions-team", "teams-collaborate-ai-prompts", "context-portability-models", "prompt-management-enterprise-guide"],
    "blocks": [
      { "type": "p", "text": "Multi-agent systems fail at handoffs — and so do human teams using AI. One engineer finishes a session with a model, hands the work to another engineer, and the decisions, constraints, and failed approaches stay in the first engineer's head. The second engineer re-explains the project to a fresh model and repeats the mistakes." },
      { "type": "p", "text": "The fix is a handoff protocol: a standard, structured way to pass AI work between people and models. This guide gives you the protocol template and the team rules that make it stick. It is the collaborative pattern inside the [LayerFlow workspace](/sign-in); [pricing](/pricing) covers team plans." },
      { "type": "h2", "id": "the-handoff-template", "text": "The handoff template" },
      { "type": "ul", "items": [
        "Task: what the work was and what it must produce.",
        "Decisions: what was already settled — the next person does not re-litigate.",
        "State: where things stand, file by file or step by step.",
        "Constraints: budgets, conventions, and rules in effect.",
        "Failures: what was tried and rejected, with one-line reasons.",
        "Next action: the exact next step for the receiver.",
        "Context note: where the durable project context lives."
      ] },
      { "type": "p", "text": "The template doubles as an AI summary: the same block that hands work to a teammate hands work to a model. Teams that standardize on it stop translating between human handoffs and AI sessions." },
      { "type": "h2", "id": "the-team-rules", "text": "The four team rules" },
      { "type": "ol", "items": [
        "No handoff without a template — a verbal handoff is not a handoff.",
        "Failures travel with the work — the receiver must know what did not work.",
        "Context lives in one place — a shared workspace or file, not in chat history.",
        "Verify at the boundary — the receiver restates the task and decisions before starting."
      ] },
      { "type": "p", "text": "Rule three is the one that gets teams. If each engineer keeps their own AI context, the team has N versions of project truth. One shared context source turns handoffs from translation into copy." },
      { "type": "h2", "id": "handoffs-across-models", "text": "Handoffs across models" },
      { "type": "p", "text": "The same template works when the receiver is a model: paste the handoff as the opening message, ask it to restate the task, and let it continue. This is the human-to-agent and agent-to-human version of the same protocol — and it is why the summary format matters more than any single tool." },
      { "type": "callout", "text": "Pro tip: add a blame-free rule — if a handoff was incomplete, the receiver fixes the template, not the sender's memory. The protocol improves fastest when gaps are treated as system bugs, not people bugs." },
      { "type": "h2", "id": "next-steps", "text": "Internal next steps" },
      { "type": "p", "text": "See [How Teams Collaborate on AI Prompts](/blog/teams-collaborate-ai-prompts) and [Sharing Prompt Versions with Your Team](/blog/sharing-prompt-versions-team). For the state side, read [AI Project Memory](/blog/ai-project-memory-guide) and [Context Portability](/blog/context-portability-models)." },
      { "type": "p", "text": "Standardize your handoffs: [sign in](/sign-in) to LayerFlow, save the template as a workspace note, and try it on your next task. [Pricing](/pricing) has team tiers." },
      { "type": "h2", "id": "faq", "text": "FAQ" },
      { "type": "faq", "items": [
        { "q": "How do teams hand off AI work?", "a": "Use a standard template: task, decisions, state, constraints, failures, next action, and where durable context lives. The same block works for human and model receivers." },
        { "q": "Why do AI handoffs fail in teams?", "a": "Context is the failure: decisions and constraints live in the previous person's head or chat history, so the receiver re-explains everything and repeats rejected approaches." },
        { "q": "What is the most important rule for team AI handoffs?", "a": "Keep context in one shared place. If each person maintains private AI context, the team runs on N versions of project truth." }
      ] }
    ]
  },
  {
    "slug": "long-context-vs-compression",
    "title": "Long Context vs Compression: When to Pay for 1M Tokens",
    "metaTitle": "Long Context vs Compression (2026 Decision Guide)",
    "description": "Long context windows vs context compression: when 1M-token models pay off, when compression wins, and the decision rule that balances both.",
    "publishedAt": "2026-08-12",
    "category": "Model comparison",
    "tags": ["long context", "context compression", "1M token models", "LLM cost"],
    "primaryKeyword": "long context vs compression",
    "secondaryKeywords": ["1M token context", "long context models", "compression vs long context", "context window cost"],
    "readingTime": "6 min read",
    "author": "LayerFlow Team",
    "relatedSlugs": ["context-window-optimization", "context-compression-techniques", "context-window-budgeting", "cheap-mode-routing-flash-vs-frontier"],
    "blocks": [
      { "type": "p", "text": "Models with 1M-token context windows are here, and they tempt every team to dump everything into the prompt and stop thinking about context. The honest question is economic: long context is a convenience you pay for per token, and compression is work you pay for once." },
      { "type": "p", "text": "This guide gives you the decision rule: when long context pays for itself, when compression wins, and the hybrid that most teams should run. [LayerFlow's cost check](/sign-in) shows the real-dollar difference before you send; [pricing](/pricing) covers the models." },
      { "type": "h2", "id": "the-tradeoff", "text": "The trade-off in one sentence" },
      { "type": "p", "text": "Long context moves the cost into every call; compression moves the cost into preparation. If you run a task once, long context is simpler. If you run a task a hundred times — the same document set, the same project, the same session history — compression pays for itself on the second run and keeps paying." },
      { "type": "h2", "id": "when-long-context-wins", "text": "When long context wins" },
      { "type": "ul", "items": [
        "One-off analysis over a large document you will not touch again.",
        "Tasks where you cannot pre-compress: reading a novel, auditing a codebase once.",
        "The first exploratory pass, before you know what matters.",
        "Latency-sensitive jobs where preparation time is the bottleneck."
      ] },
      { "type": "h2", "id": "when-compression-wins", "text": "When compression wins" },
      { "type": "ul", "items": [
        "Repeated workloads: support, documentation, classification, the same corpus daily.",
        "Conversation history: transcripts compress to decisions, and every session re-pays.",
        "Cost-sensitive pipelines where input tokens are the biggest line item.",
        "Long sessions: models degrade with noise, and compressed context answers better."
      ] },
      { "type": "h2", "id": "the-math", "text": "The math" },
      { "type": "p", "text": "If a task needs 500K input tokens and you run it weekly, raw long-context costs dwarf the once-per-corpus embedding and compression work within a month. Compression plus caching turns the repeated 80% into near-free. RouteLLM-style evidence shows routing and context discipline together cut bills 40-85% while keeping quality." },
      { "type": "h2", "id": "the-hybrid", "text": "The hybrid most teams should run" },
      { "type": "p", "text": "Use long context for the exploration pass, then compress what you learned into reusable state. The corpus stays compressed and cached; the 1M window stays reserved for the one-off jobs that genuinely need it. This is context engineering: the window is a tool, not a religion." },
      { "type": "callout", "text": "Pro tip: before upgrading a workflow to a 1M model, run the repeat-count test. If the same context returns in more than one session, compress it once and reuse it — the upgrade is a bill, not an investment." },
      { "type": "h2", "id": "next-steps", "text": "Internal next steps" },
      { "type": "p", "text": "Read [Context Window Budgeting](/blog/context-window-budgeting) for allocation and [Context Compression Techniques](/blog/context-compression-techniques) for the how. For model economics, see [LLM Pricing Comparison 2026](/blog/llm-pricing-comparison-2026)." },
      { "type": "p", "text": "See the real-dollar difference: [sign in](/sign-in) to LayerFlow, run your workload both ways, and compare costs before you commit. [Pricing](/pricing) first if you like." },
      { "type": "h2", "id": "faq", "text": "FAQ" },
      { "type": "faq", "items": [
        { "q": "Is a long context window worth the cost?", "a": "For one-off large-document analysis, yes. For repeated workloads, no — input tokens are charged on every call, and compression plus caching pays for itself within weeks." },
        { "q": "Does compression hurt quality?", "a": "Usually it helps. Noise degrades attention, and a compressed summary of decisions beats a faithful transcript. The exceptions are exact identifiers, constraints, and security rules." },
        { "q": "What is the best approach for large context needs?", "a": "Hybrid: use the long window for exploration, compress what you learn into reusable state, and reserve the 1M window for genuine one-off jobs." }
      ] }
    ]
  }
];