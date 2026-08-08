---
marp: true
theme: default
paginate: true
size: 16:9
math: false
style: |
  section {
    font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
    background: linear-gradient(135deg, #0e1416 0%, #101c22 55%, #0b2a26 100%);
    color: #e6edf3;
    padding: 48px 64px;
  }
  h1 { color: #44edbc; font-size: 2.4em; }
  h2 { color: #7ef0d0; font-size: 1.5em; margin-bottom: 8px; }
  h3 { color: #44edbc; }
  code { color: #8ee6c8; background: rgba(68,237,188,.12); }
  blockquote { border-left: 4px solid #44edbc; color: #9fe8d2; }
  footer { color: #3d4f57; font-size: 0.6em; }
  li { line-height: 1.45; }
  strong { color: #44edbc; }
  table { border-collapse: collapse; width: 100%; font-size: .8em; }
  th { color: #44edbc; border-bottom: 2px solid #2c4a46; text-align: left; padding: 6px 10px; }
  td { border-bottom: 1px solid #1f3336; padding: 6px 10px; }
  .small { font-size: .72em; color: #8aa2ab; }
  .speaker { font-size: .7em; color: #f5c76b; }
  section.lead h1 { text-align: center; }
  section.lead p { text-align: center; color: #9fe8d2; }
---

<!--
HOW TO USE THIS FILE
1. Each slide below has FOUR blocks, in this order:
   SPEAKER  → who talks
   TIMING   → how long to hold the slide (script is sized to fit)
   SCRIPT   → the FULL speech, word for word — read this, don't improvise
   ANIMATION→ the build order of the slide effects
2. The scripts are written in natural spoken English with pauses and
   transitions built in. (PAUSE) = stop talking for 1 second. (CLICK) = advance
   the slide or trigger the next animation step.
3. Present with: VS Code + "Marp for VS Code" extension → Export PDF/PPTX,
   or `npx @marp-team/marp-cli@latest docs/PPT.md --pptx`.
4. Team roles: Suresh = Problem & Market · Rohit = Product & Prototype · Shivam = Business & Finance.
-->

# LayerFlow

## AI Knowledge Workspace — Turn every AI conversation into a reusable asset

**Presented by**
- **Suresh Patel** — Problem & Market Research
- **Rohit Jadhav** — Product & Prototype Lead
- **Shivam Adwale** — Business & Finance Lead

*Atharva College of Engineering · ECS*

<!-- speaker: All three together — Suresh opens -->
<!-- timing: 25 sec -->
<!-- animation: Title fades in → names fade in one by one → tagline pops last -->
<!-- script:
(CLICK) Good morning everyone. (PAUSE) We are three students from Atharva College of Engineering, and today we want to show you something we have actually built. (CLICK) I am Suresh Patel, and I lead our problem and market research. (CLICK) This is Rohit Jadhav, our product and prototype lead — he built the working app. (CLICK) And this is Shivam Adwale, our business and finance lead. (PAUSE) We identified a problem that every person who uses ChatGPT, Gemini, or Claude feels every single day. We built a working product that solves it. And we designed a real business around it. Please give us ten minutes, and we will show you all three.
-->

---

# The Problem: AI knowledge is evaporating

- Students & developers live in ChatGPT, Gemini, and Claude — for coding, assignments, projects
- But every conversation is **trapped in its own chat window**
- Old chats are **lost, buried, or impossible to search**
- Teams **re-type the same prompts** over and over
- Knowledge **dies at the end of every hackathon and assignment**

## The key statement

> "AI helps us create knowledge, but we are **not preserving** that knowledge."

<!-- speaker: Suresh -->
<!-- timing: 55 sec -->
<!-- animation: Reveal each bullet (CLICK) → key statement slides in last, highlighted -->
<!-- script:
Let me start with the problem, because I think every person in this room has felt it. (CLICK) Right now, students and developers live inside AI chat tools. We use ChatGPT, Gemini, and Claude every day — for coding, for assignments, for our projects. (CLICK) But here is the catch: every one of those conversations is trapped inside its own chat window. (CLICK) And when we close that window, that knowledge is lost. It is buried. It is impossible to find later. (CLICK) So what happens? We re-type the same prompts again and again. Our teams repeat the same mistakes, because we cannot find what we already solved. (CLICK) And at the end of every hackathon and every assignment, all that learning simply dies. (PAUSE) (CLICK) So our key statement is this: AI helps us create knowledge faster than ever before — but we are not preserving that knowledge. And that is the gap LayerFlow was built to fill.
-->

---

# Market Context: the window is now

- Global generative AI market growing at **~45%+ CAGR** (2025–2030)
- **Millions** of students & developers use AI chats daily
- Every one of them creates knowledge they cannot retrieve
- Knowledge management for AI workflows is still an **emerging, under-served category**
- First movers get the ecosystem

<!-- speaker: Suresh -->
<!-- timing: 45 sec -->
<!-- animation: Stat cards scale in one by one; "under-served category" glows last -->
<!-- script:
Now, is this a real market? Let me give you the numbers. (CLICK) The global generative AI market is growing at roughly forty-five percent every year, and analysts expect that to continue through 2030. (CLICK) Millions of students and developers are using AI chats every single day. (CLICK) And here is the important part — every one of those users is creating knowledge they cannot retrieve. (CLICK) Yet the category that manages and organizes AI knowledge is still emerging. It is under-served. Almost nobody owns it yet. (PAUSE) (CLICK) And in a category like this, the first movers win the ecosystem — they win the habit, and they win the data. That is exactly the window that LayerFlow is built for. We are not entering an existing market. We are entering before the market has a leader.
-->

---

# The Solution: LayerFlow

**LayerFlow** converts temporary AI conversations into **permanent, searchable, reusable knowledge**.

### Core capabilities
- **Rescue** any pasted conversation → structured summary, key decisions, next actions
- **Search** across all your saved AI work instantly
- **Prompt Library** — your best prompts, reusable and versioned
- **Project Passports** — memory that carries context between sessions
- **Cost Analytics & Model Hub** — see what every AI call costs across providers
- **Multi-model chat** — OpenAI, Gemini, DeepSeek, Groq, Grok, Kimi in one place

### Tagline
> **"From AI chat to permanent knowledge."**

<!-- speaker: Suresh → hands over to Rohit -->
<!-- timing: 45 sec -->
<!-- animation: Wordmark → feature chips fly in one by one → tagline stamp at the end -->
<!-- script:
So what is LayerFlow? (CLICK) LayerFlow is an AI Knowledge Workspace. It takes a temporary AI conversation and turns it into permanent, searchable, reusable knowledge. Let me walk you through what it can do. (CLICK) Rescue — you paste any conversation you lost, and we restructure it into a summary, key decisions, and next actions. (CLICK) Search — you can search across all your saved AI work instantly. (CLICK) A Prompt Library that keeps your best prompts reusable and versioned. (CLICK) Project Passports, which carry your project memory from one session to the next. (CLICK) Cost analytics and a model hub, so you always know what every AI call costs. (CLICK) And multi-model chat — OpenAI, Gemini, DeepSeek, Groq, Grok, and Kimi, all in one workspace. (PAUSE) (CLICK) Our tagline is simple: from AI chat, to permanent knowledge. (PAUSE) Now, Rohit will show you exactly how the product works.
-->

---

# Product Overview: one workspace, every AI workflow

### Modules in the dashboard
1. **Home Dashboard** — activity, health, quick actions
2. **Rescue Workspace** — paste → structured knowledge report
3. **Prompt Library** — capture & reuse your best prompts
4. **Search Center** — semantic search over saved knowledge
5. **Project Passports** — portable project memory
6. **Cost Analytics** — spend per model & provider
7. **Model Hub** — pick or bring your own model

### User flow
`AI Conversation → Rescue → Structured Knowledge → Search Anytime → Reuse in Any Chat`

<!-- speaker: Rohit -->
<!-- timing: 50 sec -->
<!-- animation: Module cards cascade in (1→7), then the flow arrow animates left to right -->
<!-- script:
Thanks, Suresh. (PAUSE) So inside LayerFlow, everything lives in one dashboard. Let me walk through the modules. (CLICK) The home dashboard shows your activity, your provider health, and your quick actions. (CLICK) The Rescue Workspace is where a pasted conversation becomes a structured report. (CLICK) The Prompt Library captures and reuses your best prompts. (CLICK) The Search Center gives you instant, semantic search over everything you have saved. (CLICK) Project Passports keep your project memory portable. (CLICK) Cost Analytics shows your spend per model and per provider. (CLICK) And the Model Hub lets you pick a model — or bring your own key. (PAUSE) (CLICK) The core loop is the whole story: an AI conversation comes in, Rescue structures it, it becomes searchable knowledge, and you can reuse that knowledge in any chat, with any model. That loop is the product.
-->

---

# Live Prototype — this is real, not a mockup

### Demo flow
1. Paste a ChatGPT / Gemini / Claude conversation
2. Click **Rescue My Chat**
3. Background AI job cleans, compresses, and extracts context
4. Get a **Rescue Report**: summary · context passport · improved prompt · cost check · continue pack
5. **Continue here** — opens a live multi-model chat pre-loaded with that context
6. Search it later, instantly

### On screen: dashboard · rescue · report · search · prompt library · cost analytics

> **"This is not a design. This is our working prototype."**

<!-- speaker: Rohit (live demo — drive the app, do not read this as a script; use as a guide) -->
<!-- timing: 75 sec -->
<!-- animation: Show the app in a browser tab; bullet by bullet as each step happens -->
<!-- script:
Now, enough talk — let me show you the real thing. (PAUSE) (CLICK) This is the live product, running right now. I am going to paste a real ChatGPT conversation into the Rescue Workspace. (CLICK) I click Rescue My Chat. (PAUSE) You can see it is processing in the background — the AI is cleaning the text, compressing it, and extracting the useful context. (CLICK) And here is the Rescue Report: a clear summary, a context passport with the key decisions, an improved prompt, a cost check across models, and a ready-made Continue Pack. (CLICK) Now watch this — I click Continue here, and it opens a live chat pre-loaded with all of that context. I can pick any model, and if one provider's key runs out, LayerFlow automatically switches to the next one, mid-conversation. (CLICK) And later, all of this is searchable in one click. (PAUSE) I want to be very clear: this is not a design. This is not a mockup. This is our working prototype. It is real, it is live, and it is already solving this problem today.
-->

---

# How the System Works

### Architecture
`User → Next.js Web App → Hono API → AI Engine (Router + Failover) → PostgreSQL + Redis → Search`

### Tech stack
- **Next.js 16 + TypeScript** — frontend
- **Hono API** — fast, typed backend
- **PostgreSQL + Drizzle** — knowledge storage
- **Redis + BullMQ** — async background jobs
- **Multi-provider AI SDK** — OpenAI · Gemini · DeepSeek · Groq · xAI · Kimi

### AI pipeline
`Clean text → Extract context → Summarize → Score prompt → Index for search`

### Differentiator
**Multi-model router with automatic failover** — if a provider key rate-limits or runs out, the next model takes over *mid-chat*. Users are never blocked.

<!-- speaker: Rohit -->
<!-- timing: 65 sec -->
<!-- animation: Architecture layers build top→bottom; the failover node pulses at the end -->
<!-- script:
Let me open the hood briefly, because this is where we have real engineering under the hood. (CLICK) On the front, we have a Next.js application in TypeScript. It talks to a Hono API — a fast, typed backend that we built from scratch. (CLICK) Behind that sits our AI engine, and here is the key idea: all heavy AI work runs as background jobs on Redis and BullMQ. (CLICK) That means the user interface never freezes while the AI thinks. Everything is stored in PostgreSQL. (CLICK) The AI pipeline cleans the text, extracts the context, summarizes it, scores the prompt, and indexes it for search. (CLICK) And then our differentiator — the part we are most proud of. We built a multi-model router with automatic failover. If one provider rate-limits you, or your key runs out of credits, LayerFlow does not show you an error. It simply switches to the next healthy model, mid-chat, and your work continues without you noticing. That reliability is what makes LayerFlow trustworthy enough to hold your knowledge.
-->

---

# Business Model

| Plan | Price (INR) | What you get |
|------|-------------|--------------|
| **Free** | ₹0 | Limited projects · basic search · prompt storage |
| **Pro** | ₹299 / month | Unlimited projects · advanced AI reports · smart search · export & sharing · priority processing |
| **Team** | ₹999 / month | Shared workspace · team knowledge vault · admin controls · analytics dashboard |

### Additional revenue streams
- **College licenses** — bulk onboarding for institutions
- **Startup team subscriptions** — multi-seat workspaces
- **AI productivity workshops** — training + premium accounts
- **Model credits (future)** — usage-based markup on AI calls

<!-- speaker: Shivam -->
<!-- timing: 60 sec -->
<!-- animation: Table builds row by row (CLICK×3); revenue streams slide in from right -->
<!-- script:
Thank you, Rohit. Now let me talk about how LayerFlow becomes a business. (PAUSE) We monetize with three simple tiers. (CLICK) Free — zero rupees — limited projects, basic search, and prompt storage. Free is how we capture the habit; it is our marketing engine. (CLICK) Pro, at two hundred ninety-nine rupees a month — unlimited projects, advanced AI reports, smart search, export and sharing, and priority processing. That is for power users. (CLICK) And Team, at nine hundred ninety-nine rupees a month — a shared workspace, a team knowledge vault, admin controls, and analytics. That is for organizations. (PAUSE) (CLICK) On top of subscriptions we have four additional streams: college licenses for institutions, startup team subscriptions, AI productivity workshops, and — in the future — usage-based model credits. (PAUSE) Here is the business logic: our marginal cost is low, our retention is high, and the more knowledge a user stores, the more switching cost we build. Users stay because their work lives here.
-->

---

# Market Opportunity & Growth

### Who we serve first
- Engineering students → **large, dense, fast-adopting base**
- Developers & freelancers → **pay for productivity**
- Startup teams → **pay for shared knowledge**

### Growth plan
- **Phase 1:** Mumbai college campuses (ambassadors + workshops)
- **Phase 2:** Developer communities (Product Hunt, Discord, GitHub)
- **Phase 3:** Startup teams across India (Team plan + licenses)

### Why now
- Daily AI usage keeps rising
- AI knowledge management is an **emerging category** — first mover advantage
- Land-and-expand: student → team → organization

<!-- speaker: Shivam (or Suresh — market) -->
<!-- timing: 50 sec -->
<!-- animation: Who-we-serve cards fill → phase pills fill 1→2→3 → land-and-expand arrow draws -->
<!-- script:
Who are we going to sell to, and in what order? (CLICK) First, engineering students — a huge, dense, fast-adopting base, and they feel this pain every day. (CLICK) Second, developers and freelancers, who pay for productivity. (CLICK) Third, startup teams, who pay for shared knowledge. (PAUSE) (CLICK) Our growth plan is phased. Phase one: Mumbai college campuses, through ambassadors and workshops — we start right here, where we are today. (CLICK) Phase two: developer communities — Product Hunt, Discord, GitHub. (CLICK) Phase three: startup teams across India, with the Team plan and institutional licenses. (PAUSE) (CLICK) And why now? Because AI usage is rising every single day, because this category has no leader yet, and because our motion is a classic land-and-expand: one student becomes a team, one team becomes an organization. We start local, and we grow with our users.
-->

---

# Traction & Roadmap

### Where we are — **bootstrapped, working MVP**
- Real product, built by a student team
- Open-source friendly stack, low burn
- Core loop shipped: rescue → knowledge → chat → search

### Next 12 months
- **Q1–Q2:** Public beta + 1,000 users · campus ambassador program
- **Q3:** Product Hunt launch · team collaboration features
- **Q4:** LayerFlow CLI for developers · multi-model + BYOK polish

### Key metrics we track
- Rescues performed · knowledge items created · searches · retention · spend per user

<!-- speaker: Rohit + Shivam -->
<!-- timing: 60 sec -->
<!-- animation: Roadmap timeline draws left→right; metrics tick up -->
<!-- script:
Let me be honest about where we are. (CLICK) We are a bootstrapped student team with a working MVP. That is not a limitation — that is our strength. We have real product, built by students, on an open-source friendly stack, with a very low burn rate. (CLICK) Our core loop is already shipped: rescue, knowledge, chat, search. It works, end to end. (PAUSE) (CLICK) The roadmap for the next twelve months is clear. In the first two quarters: a public beta with our first one thousand users, and a campus ambassador program. (CLICK) In the third quarter: a Product Hunt launch and team collaboration features. (CLICK) In the fourth: a LayerFlow CLI for developers, and polish on multi-model and bring-your-own-key. (PAUSE) (CLICK) And we do not guess. We track the numbers that matter: rescues performed, knowledge items created, searches, retention, and spend per user. Every milestone we are asking for is tied to a metric we can already measure in the product.
-->

---

# Funding & Use of Funds

### Current stage
- **Bootstrapped** — student-built, open-source stack, low burn rate

### Funding sources
- Angel investors · Startup India · College incubation center · Innovation grants

### Use of funds
| Area | Allocation |
|------|------------|
| AI API credits | 30% |
| Cloud infrastructure & scaling | 25% |
| Product development | 20% |
| Security & compliance | 10% |
| Marketing & growth | 15% |

**Ask:** Seed round to run the beta at scale, hold multi-provider credits, and reach the first 1,000 paying users.

<!-- speaker: Shivam -->
<!-- timing: 60 sec -->
<!-- animation: Table bars fill one by one; the Ask line pulses at the end -->
<!-- script:
So what are we asking for, and what will we do with it? (PAUSE) Today we are bootstrapped. We want to raise a focused seed round — enough to run the beta at scale, hold multi-provider credits, and reach our first one thousand paying users. (CLICK) Here is exactly where the money goes. Thirty percent to AI API credits — this is critical, because a demo must never hit a dead end when a key runs out. (CLICK) Twenty-five percent to cloud infrastructure and scaling. (CLICK) Twenty percent to product development. (CLICK) Ten percent to security and compliance. (CLICK) And fifteen percent to marketing and growth. (PAUSE) Every rupee is accounted for. This is a modest, disciplined plan built by students who understand exactly what it costs to run an AI product — because we have been running one.
-->

---

# Competition & Our Edge

| | LayerFlow | Raw AI chats | Generic note apps |
|---|---|---|---|
| Search over AI knowledge | **Yes** | No | No |
| Multi-model chat + failover | **Yes** | No | No |
| Rescue / restructure lost chats | **Yes** | No | No |
| Cost analytics per model | **Yes** | No | No |
| Portable project memory | **Yes** | No | Partial |

**Our moat:** switching cost — users' *organized knowledge* lives in LayerFlow; multi-provider neutrality; density of features in one workspace.

<!-- speaker: Suresh -->
<!-- timing: 50 sec -->
<!-- animation: Matrix builds row by row; the LayerFlow column glows green at the end -->
<!-- script:
Let me address the obvious question: what about competition? (CLICK) When you use raw AI chats, you cannot search your knowledge. (CLICK) When you use a generic note app, you cannot search your AI knowledge either. (CLICK) Neither one survives a provider outage, and neither one can restructure a lost conversation. (CLICK) LayerFlow is the only layer in the middle — we combine search, multi-model failover, rescue, cost analytics, and portable project memory in one workspace. (PAUSE) (CLICK) And here is our moat: the more knowledge a user organizes inside LayerFlow, the harder it is to leave. Their work lives here. On top of that, we are provider-neutral — we do not depend on any single AI company — and we have density: five workflows in one place that today are scattered across five apps.
-->

---

# Risks & Mitigation

- **AI cost burn** → multi-provider router picks the cheapest healthy model; BYOK option
- **Big-model providers build this** → speed + focus on the knowledge layer; provider-neutral by design
- **Low willingness to pay among students** → free tier + college licenses; monetize teams & pros
- **Model API reliability** → automatic failover already shipped
- **Security of stored conversations** → encryption at rest, scope first for BYOK power users

<!-- speaker: Shivam -->
<!-- timing: 50 sec -->
<!-- animation: Risk cards flip in one by one; mitigation text appears under each -->
<!-- script:
No investor should trust a team that has not thought about risk, so here is our honest risk register. (CLICK) Risk one: AI cost burn. Our answer is already in the product — the router always picks the cheapest healthy model, and users can bring their own keys. (CLICK) Risk two: the big model providers build this themselves. Our answer is speed and focus — we own the knowledge layer, and we are provider-neutral by design, so we are not competing against any single AI company. (CLICK) Risk three: students do not pay. Our answer is a free tier and college licenses — we monetize teams and professionals first. (CLICK) Risk four: model API reliability. Our automatic failover is already shipped, so a provider outage is invisible to our users. (CLICK) Risk five: security of stored conversations. We encrypt data at rest, and we are scoping our first enterprise customers to bring-your-own-key power users. (PAUSE) We have stress-tested every risk on this slide, and each one has a concrete answer.
-->

---

# Vision & Close

> **"Every AI conversation should become a reusable asset."**

### 12-month vision
- Public beta · 1,000+ users
- Team collaboration + shared knowledge vaults
- Full multi-model support with BYOK
- LayerFlow CLI for developers
- Developer & student ecosystem around the platform

### The close
**Suresh:** "We identified a real problem."
**Rohit:** "We built a working AI solution."
**Shivam:** "We designed a scalable business around it."

**All:** "Thank you. We're ready for questions."

<!-- speaker: All three together -->
<!-- timing: 45 sec -->
<!-- animation: Vision line reveals → goal chips fly in → the three-voice close lines in sequence, slow -->
<!-- script:
To close, our vision is simple. (PAUSE) Every AI conversation should become a reusable asset. (CLICK) In the next twelve months we will ship a public beta with one thousand users, team collaboration with shared knowledge vaults, full multi-model support with bring-your-own-key, a developer CLI, and an ecosystem of students and developers around the platform. (PAUSE) And we want to leave you with one picture. (CLICK) Suresh: We identified a real problem. (CLICK) Rohit: We built a working AI solution. (CLICK) Shivam: We designed a scalable business around it. (PAUSE) (CLICK) All together: Thank you. We are ready for your questions.
-->
