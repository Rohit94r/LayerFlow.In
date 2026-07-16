# LayerFlow Gateway — Complete Project Reference

> Version 1.0 · Built by Rohit Jadhav · July 2026
> The production infrastructure platform for AI applications.

---

## Table of Contents

1. [What Is LayerFlow](#1-what-is-layerflow)
2. [The Problem](#2-the-problem)
3. [The Solution](#3-the-solution)
4. [How It Works — Full Workflow](#4-how-it-works--full-workflow)
5. [Complete Feature List](#5-complete-feature-list)
6. [SDK Reference](#6-sdk-reference)
7. [API Reference](#7-api-reference)
8. [Dashboard](#8-dashboard)
9. [Pricing](#9-pricing)
10. [Tech Stack](#10-tech-stack)
11. [Competitors and Why LayerFlow Wins](#11-competitors-and-why-layerflow-wins)
12. [Target Users](#12-target-users)
13. [Roadmap](#13-roadmap)
14. [Market Validation](#14-market-validation)

---

## 1. What Is LayerFlow

**One line:**
> LayerFlow Gateway is the production infrastructure platform for AI applications — giving developers full visibility, cost control, reliability, and testing through one integration.

**The analogy:**
Think of LayerFlow as three things combined into one:
- **Cloudflare** — sits between your code and AI APIs, adds intelligence at the network layer
- **Sentry** — captures every agent decision, failure, and anomaly automatically
- **Jest** — automated test runner that validates agent behavior on every deploy

**What it is NOT:**
- Not an AI model or chatbot
- Not a wrapper around GPT
- Not an AI agent framework
- Not competing with OpenAI, Anthropic, or Google

**What it IS:**
- The control and visibility layer that sits between your application and every AI provider
- Infrastructure every team building AI agents will need to buy or build
- You make them buy it instead of build it

---

## 2. The Problem

AI agents are entering production. The infrastructure is not ready.

Developers can build AI applications faster than ever using OpenAI, Claude, Gemini, and other models. But once these applications reach real users, six critical problems appear simultaneously.

---

### Problem 1 — AI Applications Are Black Boxes

When a traditional web application breaks, a developer traces the error to a specific line of code and fixes it in minutes.

When an AI agent breaks, none of this exists.

The developer sees: input went in, wrong output came out. The 12 steps in between — every reasoning decision, every tool call, every model response — are completely invisible.

**Real impact:**
- Debugging a production agent failure takes 4–6 hours instead of 20 minutes
- Teams cannot explain why an agent started behaving differently after a model update
- Developers redeploy and hope the problem does not repeat

---

### Problem 2 — AI Costs Are Completely Unpredictable

Most AI startups discover their true infrastructure cost by surprise — usually when they receive a monthly bill that is 5–10x what they expected.

**Real scenario that happens constantly:**
A team builds an agent that makes 8 API calls per user session. In testing with 5 users, costs seem fine. They launch to 200 users. Costs reach $8,000 in one week. They have no idea which of the 8 calls is the expensive one.

**What is missing:**
- No visibility into which feature, user, or workflow is causing costs
- No alerts before costs reach a dangerous level
- No per-user cost tracking
- No hard limits that prevent runaway spending

---

### Problem 3 — Multi-Provider Integration Is a Maintenance Nightmare

Modern AI applications often need multiple providers:
- GPT-4o for complex reasoning
- Claude for long documents
- Gemini Flash for cheap fast tasks
- Groq for ultra-low latency

Each provider has a completely different SDK, authentication format, error codes, rate limit behavior, and pricing structure. Teams maintain 4–5 separate integration layers, each with its own bugs.

---

### Problem 4 — No Standard Way to Test AI Agents

Software engineering has decades of mature testing infrastructure. All of it assumes that for a given input, the output is deterministic.

AI agents are not deterministic.

**What this means:**
- Teams either do not test at all or test manually by running the agent and reading output
- When a model update changes agent behavior, teams find out from user complaints
- There is no way to compare quality between two prompts objectively
- Deploying a change to an agent is a leap of faith

---

### Problem 5 — No Reliability Layer

A production API call to OpenAI can fail for many reasons: rate limits, server errors, network timeouts, model capacity issues.

Each team builds its own retry logic, its own fallback behavior, its own error handling — in every project, from scratch, with different quality each time.

There is no standard battle-tested reliability layer that works across providers.

---

### Problem 6 — Enterprise Adoption Has No Infrastructure

When any organization wants to adopt AI agents seriously, they need:
- Audit logs showing every API call made and by whom
- Role-based access so not every developer can change production prompts
- Security scanning of prompts before they reach the model
- Usage controls per team or department

None of this exists in any AI SDK. Teams either build it themselves or forgo enterprise customers.

---

## 3. The Solution

LayerFlow Gateway sits between your application code and every AI provider.

Every API call passes through LayerFlow first. This single integration point gives LayerFlow complete visibility and control over every aspect of AI infrastructure.

**The key insight:** Because all calls pass through one layer, you only need to integrate once to get everything.

**Before LayerFlow:**
```
Your Application  →  OpenAI API
```

**After LayerFlow:**
```
Your Application  →  LayerFlow SDK  →  LayerFlow Gateway  →  AI Provider
```

**What you get automatically from that one change:**
- Full observability (see every step of every agent run)
- Real-time cost tracking (per call, per user, per feature, per model)
- Hard budget enforcement (stop spending before bills explode)
- Intelligent caching (never pay for the same call twice)
- Automatic retry and fallback (reliability without custom code)
- Automated testing (regression detection on every deploy)
- Security scanning (protect production agents from prompt injection)
- Multi-provider routing (switch providers without code changes)

---

## 4. How It Works — Full Workflow

This is the complete journey of a single API call through LayerFlow.

```
┌─────────────────────────────────────────────────────────────────┐
│                    DEVELOPER APPLICATION                        │
│         (Chatbot · AI Agent · SaaS Product · Any App)          │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                     LAYERFLOW SDK                               │
│              Drop-in replacement for OpenAI client              │
│         import { LayerFlow } from '@layerflow/gateway'         │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                   LAYERFLOW GATEWAY                             │
│                  (Fastify on AWS Lambda)                        │
│                                                                 │
│  STEP 1 → Authentication                                        │
│           Validate API key against PostgreSQL                   │
│           Identify: which project, which environment            │
│                                                                 │
│  STEP 2 → Budget Check (Redis atomic)                           │
│           Has this key exceeded its daily limit?                │
│           YES → Return 402 error immediately (zero cost)        │
│           NO  → Continue to next step                           │
│                                                                 │
│  STEP 3 → Cache Lookup (Redis)                                  │
│           Hash the complete request                             │
│           CACHE HIT  → Return response in <5ms, zero cost       │
│           CACHE MISS → Continue to AI provider                  │
│                                                                 │
│  STEP 4 → Model Routing (Phase 2)                               │
│           Select optimal model based on configured rules         │
│           Simple task → cheap fast model                        │
│           Complex task → powerful model                         │
│                                                                 │
│  STEP 5 → Call AI Provider                                      │
│           Forward request using developer's own API key (BYOK)  │
│           Supported: OpenAI · Anthropic · Gemini · Groq         │
│                                                                 │
│  STEP 6 → Return Response                                       │
│           Response goes back to developer's application         │
│           immediately with no added latency                     │
│                                                                 │
│  STEP 7 → Async Logging (BullMQ queue)                          │
│           After response sent, background worker:               │
│           - Calculates exact cost (tokens × model price)        │
│           - Records full trace to PostgreSQL                    │
│           - Increments cost counters in Redis                   │
│           - Checks alert thresholds                             │
│           - Sends alerts if budget at 80% or errors spike       │
│                                                                 │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                  LAYERFLOW DASHBOARD                            │
│                                                                 │
│  Cost Overview                                                  │
│  - Total spend today · this week · this month                   │
│  - Cost per model, per API key, per user                        │
│  - Daily trend chart (30 days)                                  │
│  - Cache savings in dollars                                     │
│  - Budget usage indicator (green / yellow / red)                │
│                                                                 │
│  Trace Explorer                                                  │
│  - Every API call: timestamp, model, cost, latency, status      │
│  - Click any trace: full request, response, token breakdown     │
│  - Session view: group multi-step agent into one timeline        │
│  - Filter: date, model, status, cost range                      │
│                                                                 │
│  Testing Suite (Phase 2)                                        │
│  - Write test cases with expected output criteria               │
│  - Run on every GitHub commit automatically                     │
│  - Alert if agent behavior degrades after model update          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Complete Feature List

### Core Features (MVP — Phase 1)

---

#### Feature 1 — Core Proxy Gateway

**What it does:**
Intercepts every AI API call and forwards it to the actual AI provider transparently.

**How it works:**
- Developer installs LayerFlow SDK via npm
- Replaces `new OpenAI()` with `new LayerFlow()`
- All existing application code works unchanged
- Every call now passes through LayerFlow gateway

**Technical details:**
- Fastify server on AWS Lambda (globally distributed)
- Supports streaming responses
- Normalized error format across all providers
- Adds less than 20ms latency overhead
- Handles 99.9% uptime SLA

**Supported providers at MVP:**
- OpenAI (all models including GPT-4o, GPT-4o-mini, o1)
- Anthropic Claude (all models)
- Google Gemini (all models)

**Why it matters:**
Zero adoption friction. The developer changes one import and gets everything. No code restructuring, no new patterns to learn.

---

#### Feature 2 — API Key Management

**What it does:**
Create and manage API keys per project and environment.

**How it works:**
- Developer creates LayerFlow account
- Generates named API keys (production, staging, development)
- Each key tracks its own costs, traces, and budget separately
- Keys can be revoked instantly without touching application code

**Technical details:**
- Keys stored as bcrypt hash (raw key shown once at creation only)
- Last used timestamp per key
- Total cost attributed per key
- Supports multiple keys per organization

**Why it matters:**
API keys are the unit of identity. Everything — costs, traces, budgets — is attributed per key, making it easy to separate environments and projects.

---

#### Feature 3 — Real-Time Cost Dashboard

**What it does:**
Shows exactly how much money is being spent on AI APIs, broken down by every dimension.

**How it works:**
- Every API call cost is calculated: input tokens × price + output tokens × price
- Costs stored in PostgreSQL with TimescaleDB for fast time-series queries
- Dashboard queries aggregate data on load
- Updates on every page refresh

**What you see:**
- Total cost: today, this week, this month
- Cost per model (GPT-4o vs Claude vs Gemini)
- Cost per API key (production vs staging)
- Cost per user (if user IDs passed in requests)
- Daily trend line chart (30-day history)
- Average cost per request
- Total request count

**Why it matters:**
This is the "wow moment" that converts free users to paid. Developers see their true AI costs for the first time, broken down by exactly which model and which feature is causing them.

---

#### Feature 4 — Budget Enforcement

**What it does:**
Sets hard spending limits per API key. When the limit is reached, LayerFlow blocks further calls before any money is spent.

**How it works:**
- Developer sets daily or monthly budget limit in dashboard or SDK config
- Redis atomic counter increments on every request
- On each incoming request: check counter vs limit before calling AI provider
- If limit exceeded: return HTTP 402 error immediately, zero API cost
- Budget resets at midnight UTC (daily) or first of month (monthly)

**Configuration:**
```typescript
const client = new LayerFlow({
  apiKey: 'lf_your_key',
  budget: {
    daily: 50,        // $50 per day maximum
    monthly: 500,     // $500 per month maximum
    perUser: 0.10,    // $0.10 per user per day
  }
})
```

**Why it matters:**
Prevents the horror story — the $8,000 surprise bill. The most common reason developers upgrade from free to paid plan. Peace of mind for production deployments.

---

#### Feature 5 — Request Tracing

**What it does:**
Stores every API call with full details — request, response, tokens, cost, latency, model, timestamp.

**How it works:**
- Every request gets a unique trace ID
- Full request payload and response stored in PostgreSQL
- Session ID groups multi-step agent runs into one timeline
- Async write via BullMQ (zero latency impact on hot path)
- Retention: 7 days (free) · 90 days (Pro) · 1 year (Scale)

**What you can see per trace:**
- Full request payload (prompt, system message, parameters)
- Full response (complete model output)
- Token breakdown: input tokens, output tokens, cached tokens
- Cost in dollars (exact)
- Latency in milliseconds
- Model used
- Status: success / error / cached / budget exceeded
- Position in multi-step agent session

**Session Timeline View:**
Pass a `sessionId` in your requests to group all calls from one agent run:
```typescript
const response = await client.chat.completions.create({
  model: 'gpt-4o',
  messages: [...],
  layerflow: {
    sessionId: 'user-session-abc123',
    userId: 'user-abc123',
  }
})
```

The dashboard then shows the complete waterfall: every tool call, every intermediate response, where time was spent, where money was spent, where failures occurred.

**Why it matters:**
When an agent fails in production, the developer opens LayerFlow trace explorer, finds the failing request, and sees exactly what went in and what came out — in seconds, not hours.

---

#### Feature 6 — Exact-Match Caching

**What it does:**
Returns cached responses for identical requests instantly, without calling the AI provider.

**How it works:**
- SHA-256 hash of (prompt + model + temperature + all parameters) = cache key
- Check Redis for existing response before calling provider
- Cache hit: return in less than 5ms, zero cost
- Cache miss: call provider, store response in Redis with TTL
- TTL configurable: 1 hour, 24 hours, 7 days

**Configuration:**
```typescript
const client = new LayerFlow({
  apiKey: 'lf_your_key',
  cache: {
    enabled: true,
    ttl: '24h',
  }
})
// Disable cache for specific request:
const response = await client.chat.completions.create({
  model: 'gpt-4o',
  messages: [...],
  layerflow: { cache: false }
})
```

**Dashboard shows:**
- Cache hit rate (%)
- Total requests cached this month
- Dollars saved from caching (real number, highly motivating)

**Why it matters:**
Many real applications send the same prompt repeatedly. FAQ chatbots, support bots, classification tasks. Every cache hit is free and under 5ms. The dollar amount saved becomes a powerful retention metric.

---

#### Feature 7 — Budget and Error Alerts

**What it does:**
Sends alerts before problems become expensive or visible to users.

**Triggers:**
- Daily budget reaches 80% → email + optional Slack
- Monthly budget reaches 80% → email + optional Slack
- Error rate exceeds 10% in 15-minute window → email + optional Slack
- Budget fully exhausted → immediate alert

**Channels:**
- Email (via Resend)
- Slack webhook (paste your webhook URL in settings)
- Webhook (send to any endpoint)

**Alert history:**
All sent alerts visible in dashboard — not just email, so you have an audit trail.

**Why it matters:**
Budget enforcement prevents overspending. Alerts give the developer a chance to act before limits are hit. Error rate alerts catch production problems hours before users start reporting.

---

#### Feature 8 — Multi-Provider Support

**What it does:**
One SDK, one API key, all AI providers. Switch providers by changing one line.

**Providers at launch:**
- OpenAI: all GPT-4o, GPT-4o-mini, o1 models
- Anthropic: Claude 3.5 Sonnet, Claude 3 Haiku, Claude Opus
- Google: Gemini 1.5 Pro, Gemini 1.5 Flash, Gemini 2.0

**Provider switching:**
```typescript
// Use OpenAI
const response = await client.chat.completions.create({
  model: 'gpt-4o',
  messages: [...]
})

// Switch to Claude — same code, different model string
const response = await client.chat.completions.create({
  model: 'claude-3-5-sonnet',
  messages: [...]
})
```

**Normalized behavior across providers:**
- Same error format regardless of which provider failed
- Same cost tracking calculation for every provider's pricing
- Same trace format regardless of provider

**Why it matters:**
Removes vendor lock-in. A team using OpenAI today can add Gemini Flash for cheaper tasks without learning a new SDK.

---

#### Feature 9 — Developer Onboarding

**What it does:**
Takes a developer from sign-up to seeing their first trace in under 5 minutes.

**Flow:**
1. Sign up with GitHub (one click)
2. Create project (name it)
3. Copy API key (shown once, copy button ready)
4. Install SDK: `npm install @layerflow/gateway`
5. Change one import in existing code
6. First API call made by their app
7. Trace appears in dashboard automatically

**No configuration files. No complex setup. No environment variable confusion.**

**Why it matters:**
The most important moment in any developer tool is time-to-value. If it takes more than 10 minutes, most developers never come back. Under 5 minutes = they are already hooked.

---

#### Feature 10 — Stripe Billing

**What it does:**
Self-serve subscription management. Upgrade, downgrade, cancel — no sales call needed.

**Plans:**
- Free: upgrade button
- Pro ($49/month): Stripe checkout → immediately on paid plan
- Scale ($199/month): Stripe checkout → immediately on paid plan

**Stripe features used:**
- Subscription management
- Invoice download
- Card management
- Payment failure handling (auto-downgrade to free, email notification)
- Stripe Customer Portal (self-serve, zero support tickets for billing)

---

### Advanced Features (Phase 2)

---

#### Feature 11 — Semantic Caching

**What it does:**
Goes beyond exact-match. Returns cached responses for semantically similar prompts even when the wording differs.

**How it works:**
- Generate embedding for each prompt
- On cache lookup: find stored prompts with cosine similarity above threshold
- Configurable threshold: 0.95 (strict) to 0.80 (aggressive)
- "What is the capital of France?" and "Tell me France's capital" return the same cached response

**Impact:**
Increases cache hit rate by 40–60% compared to exact-match alone, proportionally reducing API costs.

---

#### Feature 12 — Intelligent Model Router

**What it does:**
Automatically routes each request to the optimal model based on rules you define.

**How it works:**
```typescript
const client = new LayerFlow({
  apiKey: 'lf_your_key',
  routing: {
    rules: [
      { if: 'inputTokens < 500', use: 'gpt-4o-mini' },
      { if: 'inputTokens >= 500', use: 'gpt-4o' },
      { if: 'task === "summarize"', use: 'claude-3-haiku' },
    ],
    fallback: ['gpt-4o', 'gpt-4o-mini', 'claude-3-haiku']
  }
})
```

**Result:**
Developers report 60–70% cost reduction with no change in output quality for most tasks, because simple tasks stop being sent to expensive models.

---

#### Feature 13 — Automatic Retry and Fallback

**What it does:**
Handles provider failures automatically without any custom code from the developer.

**How it works:**
- Rate limit error → exponential backoff with jitter → retry same provider
- Server error → retry up to 3 times → fallback to next provider in chain
- Timeout → retry with increased timeout → fallback if still failing
- All retry attempts visible in trace detail view

**Configuration:**
```typescript
const client = new LayerFlow({
  apiKey: 'lf_your_key',
  reliability: {
    maxRetries: 3,
    fallbackChain: ['gpt-4o', 'claude-3-5-sonnet', 'gpt-4o-mini'],
    timeout: 30000,
  }
})
```

---

#### Feature 14 — AI Agent Testing Suite

**What it does:**
Write test cases for your AI agent. Run them automatically on every GitHub commit. Get alerts if behavior degrades.

**How it works:**
```typescript
// Define test case in your codebase
layerflow.test('should extract correct entity', {
  input: { role: 'user', content: 'My name is Rohit and I live in Mumbai' },
  expect: {
    contains: ['Rohit', 'Mumbai'],
    evaluator: 'semantic',
    threshold: 0.90,
  }
})
```

**Evaluator types:**
- `exact` — output must contain specific string
- `semantic` — output must be semantically similar to expected (uses embeddings)
- `custom` — provide your own scoring function

**CI Integration:**
- GitHub Action available: add LayerFlow test step to your workflow
- Tests run on every push
- Dashboard shows: last test run result, pass/fail per test case
- README badge available (passing / failing)

**Why it matters:**
No more "it worked in testing" and "users are complaining." Automated regression detection before every deployment.

---

#### Feature 15 — Per-User Cost Tracking

**What it does:**
Breaks down AI costs per individual end-user of the developer's application.

**How it works:**
Pass `userId` in requests:
```typescript
const response = await client.chat.completions.create({
  model: 'gpt-4o',
  messages: [...],
  layerflow: { userId: 'end-user-123' }
})
```

**Dashboard shows:**
- Cost per user (sortable, filterable)
- Top 10 most expensive users this month
- Per-user budget limits (block specific users from exceeding limit)
- User cost trend over time

**Why it matters:**
Essential for knowing if your product pricing covers your AI costs per user. If a user costs you $2/month in AI but pays $5/month, you are profitable. If they cost $8/month, you need to reprice or optimize.

---

### Enterprise Features (Phase 3)

---

#### Feature 16 — Prompt Security Scanner

**What it does:**
Scans every incoming prompt for security threats before sending to the AI provider.

**Threats detected:**
- Prompt injection attacks (malicious instructions hidden in user input)
- Jailbreak attempts
- Data exfiltration patterns
- PII leakage detection

**How it works:**
- Scan runs synchronously before forwarding request
- Threat score returned alongside response metadata
- Blocked prompts logged separately for security audit
- Configurable: warn-only mode or block-and-return-error mode

---

#### Feature 17 — Team Management

**What it does:**
Invite team members, assign roles, manage permissions, set per-team budgets.

**Roles:**
- Admin: full access, billing, settings
- Developer: create API keys, view traces, write tests
- Viewer: read-only dashboard access

**Team budgets:**
Set separate monthly budgets per team or project. If frontend team's budget is exhausted, backend team is unaffected.

---

#### Feature 18 — Compliance and Audit Logs

**What it does:**
Immutable record of every action taken in LayerFlow — every API call, every config change, every user action.

**Required for:**
- SOC2 compliance
- GDPR compliance
- Healthcare (HIPAA)
- Financial services
- Any enterprise with a security team

**Features:**
- Every request logged with timestamp, user, key, provider
- Config change history (who changed what, when)
- Export audit log as CSV or JSON
- Data residency options (choose region where data is stored)
- GDPR option: exclude prompt/response content from logs

---

#### Feature 19 — On-Premise Deployment

**What it does:**
Run LayerFlow entirely inside the customer's own cloud infrastructure.

**How it works:**
- Docker container deployment
- Kubernetes Helm chart available
- Customer's own AWS / GCP / Azure account
- No data leaves the customer's environment
- LayerFlow dashboard still works, pointing to customer's own gateway

**Who needs this:**
Banks, healthcare companies, government, any organization with strict data residency requirements.

---

## 6. SDK Reference

### Installation

```bash
npm install @layerflow/gateway
# or
yarn add @layerflow/gateway
# or
pnpm add @layerflow/gateway
```

### Basic Setup

```typescript
import { LayerFlow } from '@layerflow/gateway'

// Drop-in replacement for OpenAI client
const layerflow = new LayerFlow({
  apiKey: 'lf_your_layerflow_key',
  // Your own provider API keys (BYOK)
  providers: {
    openai: process.env.OPENAI_API_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY,
    gemini: process.env.GEMINI_API_KEY,
  }
})
```

### Chat Completions

```typescript
// Basic request — identical to OpenAI SDK
const response = await layerflow.chat.completions.create({
  model: 'gpt-4o',
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'What is the capital of France?' }
  ],
  max_tokens: 500,
})

console.log(response.choices[0].message.content)
// → "The capital of France is Paris."

// LayerFlow metadata in response
console.log(response.layerflow)
// → {
//     traceId: 'trc_abc123',
//     cost: 0.000045,
//     cacheHit: false,
//     latencyMs: 847,
//   }
```

### With Session Tracking (For Multi-Step Agents)

```typescript
const sessionId = `session-${Date.now()}`

// Step 1
const step1 = await layerflow.chat.completions.create({
  model: 'gpt-4o',
  messages: [...],
  layerflow: {
    sessionId,
    userId: 'user-123',
    metadata: { step: 1, feature: 'summarization' }
  }
})

// Step 2 — same session, timeline groups them
const step2 = await layerflow.chat.completions.create({
  model: 'gpt-4o',
  messages: [...],
  layerflow: { sessionId }
})

// Dashboard shows both calls as one timeline
```

### Budget Configuration

```typescript
const layerflow = new LayerFlow({
  apiKey: 'lf_your_key',
  budget: {
    daily: 50,          // $50/day hard limit
    monthly: 500,       // $500/month hard limit
    perUser: 0.10,      // $0.10 per user per day
    onExceeded: 'error' // 'error' | 'warn' (default: 'error')
  }
})
```

### Caching

```typescript
const layerflow = new LayerFlow({
  apiKey: 'lf_your_key',
  cache: {
    enabled: true,
    ttl: '24h',   // '1h' | '6h' | '24h' | '7d'
    type: 'exact' // 'exact' | 'semantic' (semantic = Phase 2)
  }
})

// Override cache for specific request
const response = await layerflow.chat.completions.create({
  model: 'gpt-4o',
  messages: [...],
  layerflow: {
    cache: false  // Do not cache this specific request
  }
})
```

### Reliability — Retry and Fallback

```typescript
const layerflow = new LayerFlow({
  apiKey: 'lf_your_key',
  reliability: {
    maxRetries: 3,
    retryDelay: 'exponential', // 'exponential' | 'fixed'
    fallbackChain: [
      'gpt-4o',
      'claude-3-5-sonnet',
      'gpt-4o-mini',
    ],
    timeout: 30000, // 30 seconds
  }
})
```

### Error Handling

```typescript
import { LayerFlow, LayerFlowError } from '@layerflow/gateway'

try {
  const response = await layerflow.chat.completions.create({ ... })
} catch (error) {
  if (error instanceof LayerFlowError) {
    switch (error.code) {
      case 'BUDGET_EXCEEDED':
        // Daily or monthly budget limit reached
        console.log('Budget exhausted:', error.details)
        break
      case 'PROVIDER_ERROR':
        // AI provider returned an error
        console.log('Provider failed:', error.provider, error.status)
        break
      case 'RATE_LIMITED':
        // Rate limit hit, retries exhausted
        console.log('Rate limited:', error.details)
        break
      case 'INVALID_API_KEY':
        // LayerFlow API key is invalid or revoked
        console.log('Auth failed')
        break
    }
  }
}
```

### Full Configuration Reference

```typescript
const layerflow = new LayerFlow({
  // Required
  apiKey: 'lf_your_layerflow_key',

  // Your provider API keys (BYOK)
  providers: {
    openai: 'sk-...',
    anthropic: 'sk-ant-...',
    gemini: 'AIza...',
    groq: 'gsk_...',
  },

  // Budget limits
  budget: {
    daily: 50,
    monthly: 500,
    perUser: 0.10,
    onExceeded: 'error',
  },

  // Caching
  cache: {
    enabled: true,
    ttl: '24h',
    type: 'exact',
  },

  // Reliability
  reliability: {
    maxRetries: 3,
    retryDelay: 'exponential',
    fallbackChain: ['gpt-4o', 'gpt-4o-mini'],
    timeout: 30000,
  },

  // Model routing (Phase 2)
  routing: {
    rules: [
      { if: 'inputTokens < 500', use: 'gpt-4o-mini' },
      { if: 'inputTokens >= 500', use: 'gpt-4o' },
    ],
  },

  // Optional default metadata for all requests
  defaultMetadata: {
    environment: 'production',
    appVersion: '1.2.3',
  },
})
```

---

## 7. API Reference

All endpoints are available at: `https://api.layerflow.dev/v1`

### Authentication

All requests require the `Authorization` header:
```
Authorization: Bearer lf_your_api_key
```

---

### Chat Completions (Proxy)

```
POST /v1/chat/completions
```

**Request body:** Identical to OpenAI chat completions format, with optional `layerflow` field.

```json
{
  "model": "gpt-4o",
  "messages": [
    { "role": "user", "content": "Hello" }
  ],
  "max_tokens": 500,
  "layerflow": {
    "sessionId": "session-abc123",
    "userId": "user-123",
    "cache": true,
    "metadata": { "feature": "chat" }
  }
}
```

**Response:** OpenAI-compatible response with `layerflow` metadata appended:
```json
{
  "id": "chatcmpl-abc123",
  "choices": [...],
  "usage": { "prompt_tokens": 12, "completion_tokens": 45 },
  "layerflow": {
    "traceId": "trc_xyz789",
    "cost": 0.000045,
    "costBreakdown": {
      "inputCost": 0.000012,
      "outputCost": 0.000033
    },
    "cacheHit": false,
    "latencyMs": 847,
    "model": "gpt-4o",
    "provider": "openai",
    "budgetRemaining": {
      "daily": 45.23,
      "monthly": 287.40
    }
  }
}
```

---

### Traces

**List traces:**
```
GET /v1/traces?limit=50&offset=0&status=error&from=2026-07-01&to=2026-07-07
```

**Get single trace:**
```
GET /v1/traces/:traceId
```

**Get session timeline:**
```
GET /v1/sessions/:sessionId/traces
```

---

### Cost Analytics

**Get cost summary:**
```
GET /v1/analytics/cost?period=month&groupBy=model
```

**Get cost by user:**
```
GET /v1/analytics/cost/users?limit=20&sortBy=totalCost&order=desc
```

---

### API Keys

**List keys:**
```
GET /v1/keys
```

**Create key:**
```
POST /v1/keys
{ "name": "production" }
```

**Revoke key:**
```
DELETE /v1/keys/:keyId
```

---

### Budget

**Get current budget status:**
```
GET /v1/budget/status
```

**Update budget limits:**
```
PATCH /v1/budget
{
  "daily": 100,
  "monthly": 1000,
  "perUser": 0.25
}
```

---

### Cache

**Invalidate cache by pattern:**
```
DELETE /v1/cache
{ "pattern": "gpt-4o:summarize:*" }
```

**Get cache statistics:**
```
GET /v1/cache/stats
```

---

## 8. Dashboard

The LayerFlow dashboard is a Next.js web application at `app.layerflow.dev`.

### Pages

---

#### Home / Overview

**What you see:**
- Total spend this month (prominent, large number)
- Budget usage progress bar (green/yellow/red based on threshold)
- Request count today
- Cache hit rate today
- Dollars saved from caching
- Quick links to recent traces with errors

---

#### Cost Analytics

**Charts:**
- Daily cost trend (line chart, 30 days)
- Cost by model (bar chart, current month)
- Cost by API key (donut chart)
- Cost by user (table, sortable)

**Filters:**
- Date range picker
- Group by: model / key / user / feature
- Compare to previous period

---

#### Trace Explorer

**List view columns:**
- Timestamp
- Model
- Status (success / error / cached / budget exceeded)
- Cost
- Latency
- Session ID (if provided)

**Filters:**
- Date range
- Status filter
- Model filter
- Cost range filter
- Search by session ID

**Detail view (click any trace):**
- Full request payload (collapsible JSON)
- Full response (collapsible JSON)
- Token breakdown: input / output / cached
- Cost in dollars (exact)
- Latency timeline
- Provider details
- Metadata (userId, feature, custom fields)

**Session timeline:**
Click session ID to see all calls from one agent run in waterfall view.

---

#### API Keys

- List all keys with name, created date, last used, status
- Create new key (name it, get one-time display)
- Revoke any key
- See total cost per key

---

#### Settings

- Budget limits (set daily and monthly limits)
- Alert configuration (email, Slack webhook)
- Provider API keys (add/remove provider keys)
- Team management (invite members, set roles)
- Billing (upgrade plan, manage subscription via Stripe portal)
- Profile (name, email, password)

---

## 9. Pricing

### Free Plan — $0/month

**Limits:**
- 10,000 proxied requests per month
- 7-day trace retention
- 1 project
- 1 API key

**Features included:**
- Core proxy gateway
- Basic cost dashboard
- Exact-match caching
- Email support

**Purpose:**
The free plan is not charity — it is marketing. Every developer on the free plan is a potential Pro upgrade and a source of word-of-mouth.

---

### Pro Plan — $49/month

**Limits:**
- 500,000 requests per month
- 90-day trace retention
- 5 projects
- 10 API keys
- 3 team seats

**Features included:**
- Everything in Free
- Full cost analytics (per user, per feature)
- Budget enforcement and alerts
- Slack webhook alerts
- Priority email support

**Who upgrades:**
A developer hits the 10,000 request free tier limit within their first week of real usage. At $49, the upgrade decision takes about 30 seconds.

---

### Scale Plan — $199/month

**Limits:**
- 5 million requests per month
- 1-year trace retention
- Unlimited projects
- Unlimited API keys
- 10 team seats

**Features included:**
- Everything in Pro
- Role-based access (admin / developer / viewer)
- SLA guarantee (99.9% uptime)
- Semantic caching (Phase 2)
- Model routing (Phase 2)
- Agent testing suite (Phase 2)

---

### Enterprise — Custom Annual Contract

**Limits:**
- Unlimited everything

**Features included:**
- Everything in Scale
- On-premise deployment option
- SSO / SAML authentication
- Compliance reports (SOC2, GDPR)
- Custom data retention policy
- Dedicated support engineer
- Custom SLA

**Pricing:**
$10,000 – $50,000/year depending on scale.

One enterprise deal = 20–50 Pro plan customers in MRR.

---

### BYOK Policy (Bring Your Own Key)

Developers connect their own OpenAI, Anthropic, and Gemini API keys.

LayerFlow proxies calls using the developer's key. LayerFlow never pays the AI provider bills.

**Why this matters for business:**
LayerFlow's costs are predictable: server, Redis, database. No surprise AI bills from user activity.

**Why developers prefer it:**
Their prompts route through their own API account. No third party holds their data.

---

## 10. Tech Stack

Every technology chosen for a specific reason.

### Gateway Server — Fastify

**Role:** Core proxy server

**Why Fastify over Express:**
Handles 2–3x more requests per second. For a proxy in the critical path of every AI call, raw performance directly affects user experience. Built-in TypeScript support and schema validation included.

**Where it runs:** AWS Lambda (serverless, auto-scales, pay per invocation, globally distributed)

---

### Cache and Budget Counters — Redis via Upstash

**Role:** Three functions — cache API responses, enforce budgets with atomic counters, rate limiting

**Why Redis:**
Sub-millisecond read times. Budget checks must be fast enough to add negligible latency. Redis INCR is atomic — budget counters increment correctly under 10,000 concurrent requests.

**Why Upstash:**
Serverless Redis. No server to provision. Scales to zero when idle.

---

### Primary Database — PostgreSQL + TimescaleDB via Neon

**Role:** Store traces, user data, API keys, billing data

**Why TimescaleDB:**
All trace data is time-series data. TimescaleDB hypertables make time-range queries 10–100x faster as data grows into millions of rows.

**Why Neon:**
Serverless PostgreSQL. Branch databases like Git (perfect for staging). Scales to zero.

---

### Async Queue — BullMQ

**Role:** Process logging and cost calculation after the response is returned

**Why BullMQ:**
After the gateway returns a response to the developer, all logging happens in the background via queue workers. This keeps the hot path fast — no database writes in the request path. BullMQ is Redis-backed, reliable, and has built-in retry logic.

---

### Dashboard — Next.js 14

**Role:** Web application for developers to see costs, traces, alerts, settings

**Why Next.js:**
Server Components make data-heavy pages load fast. API routes handle dashboard actions. The engineering team already knows it deeply.

---

### Authentication — Better Auth

**Role:** User accounts, GitHub OAuth, API key management

**Why Better Auth:**
Built-in API key plugin handles creation, hashing, revocation, and usage tracking. Saves 3–4 weeks of custom auth development. Already used in LayerFlow's own products.

---

### Distributed Tracing Format — OpenTelemetry

**Role:** Industry-standard trace format

**Why OpenTelemetry:**
LayerFlow traces can be exported to Datadog, Grafana, Jaeger, or any enterprise observability tool. Enterprise customers plug LayerFlow into existing tooling without changes.

---

### Infrastructure — AWS Lambda + EventBridge

**Role:** Serverless gateway execution and scheduled background jobs

**Why AWS:**
Lambda autoscales from zero to hundreds of thousands of concurrent requests. Lambda@Edge runs the proxy close to users globally. EventBridge handles scheduled jobs (nightly cleanup, budget resets, usage summaries).

---

### Billing — Stripe

**Role:** Subscription management, payment processing, invoicing

**Why Stripe:**
Industry standard for developer tools. Metered billing for usage-based pricing. Stripe Customer Portal = zero support tickets for billing questions.

---

### Email — Resend

**Role:** Budget alerts, error notifications, onboarding emails

**Why Resend:**
Developer-friendly API. Better deliverability than SendGrid for low-volume transactional email.

---

### SDK — TypeScript NPM Package

**Role:** Developer integration point

**Why TypeScript:**
Full type safety means developers see LayerFlow's features as autocomplete suggestions while they write code — not when they read documentation. Drop-in replacement pattern means zero friction adoption.

---

## 11. Competitors and Why LayerFlow Wins

### Helicone

**Status:** Acquired by Mintlify in March 2026. Now in maintenance mode. No new features.

**What it does well:** Simple proxy-based logging, low latency, fast setup.

**What it lacks:** Deep agent debugging, budget enforcement, testing suite.

**The opportunity:** 16,000+ organizations using Helicone in production now need a replacement. These users already understand the value of an AI gateway. They are the most primed audience in the market.

**Why LayerFlow wins:** Actively developed, more features, drop-in replacement for Helicone's proxy architecture. These users migrate in under an hour.

---

### LangSmith

**Status:** Active, well-funded, growing.

**What it does well:** Best-in-class tracing for LangChain applications.

**What it lacks:** Only works with LangChain. Teams using raw OpenAI API calls, AutoGen, or custom agent loops cannot use it effectively.

**Why LayerFlow wins:** Framework-agnostic. Works with any code that makes HTTP calls to AI APIs. The entire market of raw API users is underserved by LangSmith.

---

### Portkey

**Status:** Active, funded, growing.

**What it does well:** Multi-provider routing, reliability features.

**What it lacks:** Portkey only logs requests and answers — it does not track requests properly. No testing suite. Complex setup. Pricing excludes solo developers and indie hackers.

**Why LayerFlow wins:** Proper request tracking, testing suite, developer-first pricing, simpler integration.

---

### LiteLLM

**Status:** Open source, experienced a supply chain security attack in March 2026.

**What it does well:** Model switching, open source, free.

**What it lacks:** Self-hosted only, no managed dashboard, no business model, recent security compromise reduced trust.

**Why LayerFlow wins:** Managed service with hosted dashboard, no ops overhead, security-first architecture, active development with a business model.

---

### Braintrust

**Status:** Active, funded.

**What it does well:** Strong evaluation and testing features.

**What it lacks:** Expensive ($249/month Pro). Evaluation-focused only — not a gateway. Cannot replace Helicone.

**Why LayerFlow wins:** Complete platform (gateway + observability + testing) at a fraction of the price.

---

### Amazon Bedrock AgentCore

**Status:** AWS product, growing rapidly.

**What it does well:** Agent infrastructure for teams fully on AWS.

**What it lacks:** Only works within AWS ecosystem. Developers using OpenAI directly cannot use it. Complex enterprise setup, not developer-first.

**Why LayerFlow wins:** Framework-agnostic and provider-agnostic. Works with Bedrock, OpenAI, Anthropic — developers stay in control.

---

### The Gap Nobody Fills

No competitor has all five:
1. Framework-agnostic proxy (works with any AI code)
2. Hard budget enforcement (prevent runaway spending)
3. Semantic caching (save 40–70% on API costs)
4. Full observability (see every agent step)
5. Automated testing (regression detection before deployment)

Each feature alone is easy to copy. All five integrated, with shared data across all of them — that is 12 months of focused building that creates real switching costs.

---

## 12. Target Users

### Primary — The AI Developer at an Early Startup

**Who they are:**
- 1–5 person team building an AI-powered product
- Using OpenAI, Anthropic, or Gemini API directly
- Has shipped or is about to ship to real users
- Pays their own AI bills

**What they say before LayerFlow:**
- "I have no idea which feature is costing me so much"
- "My agent broke and I spent 4 hours debugging with no idea why"
- "I'm scared to deploy because testing is basically manual"

**How they find LayerFlow:**
Twitter, Product Hunt, Hacker News, developer Discord communities.

**Why they pay:**
They are currently spending 10–20 hours per month doing manually what LayerFlow does automatically. At $49/month, if it saves 5 hours, a developer's time is worth far more than that.

---

### Secondary — The Indie Hacker / Solo Builder

**Who they are:**
- One person, side project or early startup
- Very cost-sensitive
- Highly technical, self-serve only
- Active on Twitter, Product Hunt, Indie Hackers

**What they worry about:**
One viral moment can turn a $50/month AI bill into a $5,000 bill overnight. Budget enforcement is the feature that sells itself to this audience.

**How they find LayerFlow:**
Product Hunt launch, Twitter/X developer community, Indie Hackers.

**Why they pay:**
Free plan gets them started. They hit 10,000 requests within a week of real usage. $49 feels like nothing compared to the risk of a surprise $5,000 bill.

---

### Tertiary — Developers Migrating from Helicone

**Who they are:**
16,000+ organizations that relied on Helicone and now need an actively maintained replacement.

**Why they are ready:**
- Already integrated a proxy-based AI gateway
- Already experienced the value of cost tracking and observability
- Actively looking for a replacement RIGHT NOW
- Migration takes under an hour (same proxy architecture)

**This is the fastest possible customer acquisition path available in 2026.**

---

### Future Enterprise

**Who they are:**
20–200 person companies with a dedicated AI team.

**When they come:**
Not at launch. Enterprise customers come through developers inside those companies who adopted the self-serve product and evangelized internally.

**What they need:**
Audit logs, SSO, on-premise deployment, compliance reports.

**Revenue impact:**
One enterprise deal = $10,000–50,000/year = 17–85 Pro plan customers in MRR.

---

## 13. Roadmap

### Phase 1 — MVP (Month 1–2)

**Goal:** 10 developers actively using, seeing their first cost dashboard

- Core proxy gateway (Fastify + AWS Lambda)
- TypeScript SDK (drop-in OpenAI replacement)
- API key management
- Real-time cost dashboard
- Budget enforcement
- Exact-match caching
- Request tracing
- Budget and error alerts
- Multi-provider: OpenAI, Anthropic, Gemini
- Onboarding flow (GitHub login → first trace in 5 minutes)
- Stripe billing (Free and Pro plans)

**Success metric:** 10 active developers. At least 3 say "I had no idea I was spending this much."

---

### Phase 2 — Strengthen (Month 3–4)

**Goal:** Product Hunt launch, first paying customers

- Semantic caching
- Intelligent model routing
- Automatic retry and fallback
- Agent testing suite (write test cases, CI integration)
- Per-user cost tracking
- Team management (multi-seat)
- Python SDK
- Documentation site (Mintlify/Nextra)
- Landing page

**Success metric:** Product Hunt launch, 200 signups, 5–10 paid customers.

---

### Phase 3 — Scale (Month 5–8)

**Goal:** $5,000 MRR, YC application ready

- Prompt security scanner
- Advanced analytics (custom dashboards, CSV export)
- Anomaly detection alerts (cost spike, quality degradation)
- Scale plan launch
- Improved team features
- OpenTelemetry export (connect to Datadog, Grafana)
- More provider support: Groq, Mistral, AWS Bedrock

**Success metric:** $5,000 MRR, 100 active users, clear YC application thesis.

---

### Phase 4 — Enterprise (Month 9–12)

**Goal:** First enterprise contract, funding raise

- On-premise deployment (Docker + Helm chart)
- SSO / SAML authentication
- SOC2 compliance audit
- GDPR compliance features
- Custom data retention
- Enterprise plan launch
- Dedicated support tier

**Success metric:** First $10,000+ annual enterprise contract. Seed round conversations.

---

## 14. Market Validation

### Funding Signals (VCs Fund Real Problems)

| Company | What It Raised | What It Proved |
|---------|----------------|----------------|
| Helicone | $2.5M (YC W23) | LLM observability market is real |
| Portkey | Funded | Multi-provider AI gateway is real |
| Braintrust | Series A | AI evaluation is a paid category |
| Milestone | $10M | AI cost management companies get funded |
| LangSmith (LangChain) | Part of $25M | Tracing infrastructure is valuable |

When multiple companies raise money solving variations of the same problem, the problem is real and the market is ready.

---

### Developer Complaints (From Reddit, Hacker News, GitHub)

Real quotes found in developer communities:

- "My OpenAI bill was $3,000 this month and I have no idea which feature caused it"
- "My agent failed in production and I spent 4 hours debugging with no tracing"
- "I need to switch from GPT-4 to Claude but my entire codebase uses OpenAI SDK"
- "There's no way to regression test my prompts when I update them"
- "I manually test my agent by running it 10 times and hoping it works"

These are not isolated complaints. They appear constantly across AI developer communities.

---

### Market Size

- Model API spending: $3.5B (late 2024) → $8.4B (mid-2025) → doubling every 6 months
- Enterprise LLM market projected: $71.1B by 2034
- 78% of enterprises have AI agent pilots in progress
- Only 14% have successfully reached production
- 73% of enterprises require AI agent monitoring in production
- 63.4% cite lack of adequate observability tooling as a major barrier

---

### The Helicone Gap (Immediate Opportunity)

Helicone acquired by Mintlify in March 2026. Entered maintenance mode. 16,000+ organizations using Helicone in production are encouraged to plan their migration.

This is the single largest immediate market opportunity in the AI developer tools space in mid-2026.

These organizations:
- Already understand the value of an AI gateway
- Are actively looking for a replacement
- Have already gone through the integration learning curve
- Need a drop-in replacement they can trust

LayerFlow's proxy architecture mirrors Helicone's. Migration takes under one hour.

---

### Why Now

The tools that exist today either:
- Solve one problem (observability OR cost OR testing — not all three)
- Require a specific framework (LangChain only)
- Are moving upmarket (enterprise focus, excluding developers)
- Are no longer actively developed (Helicone)
- Had security issues (LiteLLM)

The developer-first, complete, actively developed, affordable platform does not exist.

LayerFlow is that platform.

---

*LayerFlow Gateway · projectinfo.md · Version 1.0 · July 2026*
*Built by Rohit Jadhav*
