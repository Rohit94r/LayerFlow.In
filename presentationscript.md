# LayerFlow — Presentation Script (Shark Tank Style)

> **Tone:** Confident, direct, simple English. Like you're explaining to a friend, not reading a textbook.
> **Pace:** Fast but clear. Pause after big statements.
> **Rule:** Never say "um", "uh", or "basically". Own every word.

---

## SLIDE 1 — TITLE (10 seconds)

**Suresh:**
"Good morning. We are three students from Atharva College of Engineering. Our product is called **LayerFlow** — and it's live on the internet right now at **layerflow.dev**."

*(Pause. Look at the audience.)*

"Today we'll show you the problem, the product, and the business — in 12 minutes."

---

## SLIDE 2 — TEAM (15 seconds)

**Suresh:**
"I'm Suresh Patel — I handle the problem statement and pitch.
Rohit Jadhav — he built the entire product and will do the live demo.
Shivam Adwale — he handles market research and business model."

"We're not presenting a PPT project. We're presenting something we use every day."

---

## SLIDE 3 — PROBLEM (1 minute)

**Suresh:**
"Quick question — how many of you use more than one AI tool? ChatGPT, Claude, Gemini — raise your hand."

*(Wait 2 seconds. Look around.)*

"Good. Now here's the problem.

You save prompts in Notion. Your friend saves them in Google Docs. Someone else has them in ChatGPT history. There's no folder structure. No version control. No way to compare what you wrote last week with what you wrote today.

Second — you're paying for multiple AI tools. But nobody tells you which model gives the best output for the lowest cost. The bill just shows up.

Third — you're manually copy-pasting the same prompt into five different tabs to compare outputs. That's not a workflow. That's a headache.

**AI tools got powerful fast. The way we manage them didn't keep up.**"

---

## SLIDE 4 — SOLUTION (1 minute)

**Suresh:**
"LayerFlow fixes all three problems in one workspace.

**Prompt Workspace** — you organize prompts into domains, projects, and folders. Not a flat list.

**Prompt Timeline** — every time you save, it creates a version. Like Git for prompts. You can roll back to any version instantly.

**Multi-Model Compare** — you run one prompt across GPT, Claude, Gemini, and DeepSeek. You see the output, cost, and speed — side by side. One screen. Done.

**Hard Budgets** — you set a spending cap. When you hit it, LayerFlow blocks the next request. Not an email after. A block before.

"One control panel for every AI model you use. That's LayerFlow."

"Now Rohit will show you the actual product."

*(Step back. Rohit steps forward.)*

---

## SLIDE 5 — LIVE DEMO (3–4 minutes)

**Rohit:**
"Thanks Suresh. I'm Rohit. Let me show you the real thing."

*(Open laptop. Project layerflow.dev on screen.)*

"This is layerflow.dev — our live production site."

### Step 1 — Landing Page (10 sec)
"Here's our public site. It explains the problem and the workflow for a new user."

### Step 2 — Sign In (10 sec)
"I sign in with Google. Straight to my workspace — today's activity, budget snapshot, recent prompts."

### Step 3 — Project + Prompt (30 sec)
"I'll create a project under a Domain. Write a prompt. Hit Save. That's version one on the Timeline. I edit it, save again — version two. I can diff them or roll back instantly."

### Step 4 — Budget (20 sec)
"Here's Budgets. I set a monthly limit. If I go over, LayerFlow blocks the next request before it happens. Not after the invoice."

### Step 5 — Compare (30 sec)
"Now I run this prompt. I open Compare, run it across multiple models, and see cost, speed, and output ranked side by side. Best, cheapest, fastest — all in one screen."

### Step 6 — Cost Optimizer (20 sec)
"The Optimizer shows how much I've saved using Token Saver and smarter model routing. Instead of always using the most expensive model, it picks the cheapest one that's good enough."

### Step 7 — Gateway (20 sec)
"Finally — the Gateway. I mint a key here. I get a base URL that works exactly like the OpenAI API. Any developer can point their existing code at this URL and instantly get budgets, routing, and comparison. For free."

### Closing Demo (5 sec)
"Everything I just showed you is live on our production site right now. Not a mockup. Not a recording."

*(Pause one second.)*

---

## SLIDE 6 — TECHNOLOGY (1 minute)

**Rohit:**
"Behind the product — here's the stack.

**Next.js** for the frontend. **TypeScript** end to end — no JavaScript anywhere. **Hono** for backend API services. **PostgreSQL on Neon** for structured data. **Redis and BullMQ** for background jobs like model comparison.

Provider integrations — **OpenAI, Anthropic, Google Gemini, Groq, and DeepSeek**.

One important thing — provider API keys are encrypted with **AES-256-GCM**. We never see your keys in plaintext. That's a real security feature, not a checkbox.

What's next: we're building a published SDK for JavaScript and Python, team workspaces with shared budgets, a CLI for terminal users, and semantic memory search across prompt history."

---

## SLIDE 7 — BUSINESS MODEL (1 minute)

**Shivam:**
"Thanks Rohit. Now the business side.

We have four planned tiers:

**Free** — limited projects, prompt history, basic compare. ₹0.

**Pro** — unlimited prompts, full Compare, full Timeline, cost analytics. ₹299/month.

**Team** — shared workspace, team budgets, role access. ₹999/month.

**Enterprise** — custom pricing once SSO and team features ship.

We haven't turned on billing yet. That's our next milestone — not a projection we're claiming as revenue."

---

## SLIDE 8 — MARKET (1 minute)

**Shivam:**
"There are existing players — OpenRouter, Perplexity, PromptLayer. That tells us the category is real and validated.

But most of them focus on infrastructure and routing. We focus on **organization and cost control for individual developers and small teams** — a segment underserved by enterprise-first competitors.

Our target users: independent developers, freelancers managing client API costs, student builders, and small startup teams of 2 to 10 people.

India alone has millions of developers using two or more AI tools daily. No tool organizes this yet."

---

## SLIDE 9 — ROADMAP (50 seconds)

**Shivam:**
"Our next 6 months, in order:

**Now** — fix onboarding. A brand-new user runs a prompt with zero setup, using platform fallback keys.

**Month 2** — turn on billing. Free and Pro plans live.

**Month 3** — stabilize Compare in production. Publish the first SDK package.

**Month 4** — get to 100 real users. Talk to every one of them.

**Month 5** — launch Team workspaces.

**Month 6** — campus ambassador rollout. Starting here at Atharva.

Our focus for the next two quarters isn't fundraising. It's proving people will pay for this."

---

## SLIDE 10 — CLOSING (20 seconds)

*(All three stand together.)*

**Suresh:**
"We identified a real, everyday problem."

**Rohit:**
"We built a real product — and just showed it to you live."

**Shivam:**
"We're building the business honestly — one milestone at a time."

**All together:**
"**LayerFlow is the control layer for how developers use AI. Organized prompts. Compared models. Costs under control. Thank you — we're ready for your questions.**"

*(Smile. Hold for one second. Stop speaking.)*

---

# 🎯 PRESENTATION TIPS

1. **Never read the slides.** The slides are keywords. You talk.
2. **Look at the audience, not the screen.** Especially during Problem and Closing.
3. **Pause after big statements.** "AI tools got powerful fast. The way we manage them didn't keep up." — Pause. Let it land.
4. **During demo:** Talk while clicking. Narrate every action. "I'm clicking Compare now — you'll see three models run at the same time."
5. **If something fails live:** Say "That's a real production issue — let me show you the next feature." Never apologize twice.
6. **If asked "how many users":** "We're in early validation. We have [X] users. No paying customers yet — that's the next milestone." Be honest.
7. **If asked "what's your MRR":** "Zero. We haven't turned on billing. That's deliberate — we wanted the product solid first."
8. **Time yourself once.** This script is calibrated to ~11 minutes. You have 1 minute buffer.
