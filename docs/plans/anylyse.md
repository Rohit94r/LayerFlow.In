LAYERFLOW — FULL PRODUCTION AUDIT, BUG DISCOVERY & REMEDIATION
===============================================================

You are auditing the COMPLETE LayerFlow repository.

LayerFlow is an AI Workspace + Agents + Terminal platform.

IMPORTANT:

Do NOT assume the project is working because README files, TODOs, comments,
previous agent reports, git commits, release notes, or checklists say it works.

Verify everything from the actual source code and actual runtime.

This is a REAL production audit.

Your job is to:

1. Understand the entire repository.
2. Discover the actual architecture.
3. Find bugs and incomplete implementations.
4. Score the project.
5. Produce evidence for every finding.
6. Identify architectural weaknesses.
7. Fix confirmed issues.
8. Run tests and runtime verification.
9. Re-audit after fixes.
10. Produce a final production-readiness report.

DO NOT blindly rewrite the project.

Inspect first.
Understand first.
Then fix root causes.

===============================================================
PHASE 0 — REPOSITORY DISCOVERY
===============================================================

First inspect the complete repository.

Identify:

- package manager
- monorepo structure
- apps
- packages
- frontend
- backend
- workers
- CLI
- shared packages
- configuration
- database
- migrations
- Redis
- queues
- AI providers
- model router
- agents
- tools
- MCP
- RAG
- authentication
- authorization
- billing
- usage tracking
- WebSockets
- REST APIs
- deployment configuration
- Docker
- CI/CD
- tests
- scripts

Generate an architecture map.

Example:

LayerFlow
│
├── apps/
│   ├── web/
│   ├── api/
│   ├── worker/
│   └── terminal/
│
├── packages/
│   ├── shared/
│   ├── database/
│   ├── ai/
│   ├── agents/
│   └── ...
│
├── database
├── redis
├── workers
└── infrastructure

Use the ACTUAL repository structure.

Do not invent directories.

===============================================================
PHASE 1 — PACKAGE / MONOREPO AUDIT
===============================================================

Audit:

- package.json
- pnpm-workspace.yaml
- workspace configuration
- tsconfig
- build configuration
- scripts
- dependency versions
- duplicate dependencies
- unused dependencies
- missing dependencies
- incorrect dependencies
- circular dependencies
- package boundaries
- build order
- dev commands
- production commands

Check:

pnpm install
pnpm build
pnpm lint
pnpm typecheck
pnpm test

Use the repository's actual scripts.

Find:

CRITICAL:
- broken package references
- missing packages
- invalid workspace imports
- build failures
- runtime-only dependencies incorrectly marked
- circular package dependencies

HIGH:
- inconsistent versions
- duplicate packages
- broken scripts

MEDIUM:
- cleanup opportunities

===============================================================
PHASE 2 — FRONTEND AUDIT
===============================================================

Audit the complete web application.

Check:

- routing
- layouts
- components
- server/client boundaries
- loading states
- error states
- empty states
- responsive design
- accessibility
- forms
- validation
- API integration
- authentication
- session handling
- state management
- caching
- optimistic updates
- error handling
- streaming UI
- WebSocket UI
- terminal UI
- agent UI
- model picker
- chat
- memory
- RAG
- search
- settings
- billing
- usage
- onboarding

Test:

Desktop:
1440x1000

Mobile:
320x820

Also test:
768 width
1024 width
1920 width

Find:

- horizontal overflow
- vertical overflow
- broken responsive layout
- content clipping
- layout shift
- hydration mismatch
- server/client mismatch
- inaccessible controls
- missing labels
- keyboard issues
- broken focus
- missing loading states
- broken error states
- fake data
- hardcoded data
- broken API calls

IMPORTANT:

Do not only inspect CSS.

Trace:

UI
→ API call
→ authentication
→ backend
→ database
→ response
→ UI state

===============================================================
PHASE 3 — LANDING PAGE AUDIT
===============================================================

Audit the public landing page separately.

Check:

- hero
- navigation
- CTA
- feature sections
- pricing
- comparison
- testimonials
- FAQ
- footer
- mobile
- SEO
- metadata
- OpenGraph
- Twitter cards
- canonical
- sitemap
- robots
- structured data
- image optimization
- fonts
- performance
- accessibility

Verify every CTA.

Do not accept:

href="#"
fake links
dead buttons
fake pricing buttons
fake product claims

Check actual navigation.

===============================================================
PHASE 4 — BACKEND AUDIT
===============================================================

Audit every backend route.

Create a route inventory:

METHOD
PATH
AUTH REQUIRED
ROLE
INPUT
OUTPUT
DATABASE
REDIS
AI
WORKER
ERROR HANDLING

Inspect:

- authentication
- authorization
- middleware
- validation
- rate limiting
- error handling
- logging
- timeouts
- retries
- idempotency
- transactions
- pagination
- filtering
- sorting
- caching
- WebSockets
- streaming

Find:

- unauthenticated sensitive routes
- authorization bypass
- missing validation
- inconsistent responses
- swallowed errors
- unhandled promises
- memory leaks
- race conditions
- duplicate requests
- missing timeouts
- infinite retries
- missing rate limits
- unsafe defaults

===============================================================
PHASE 5 — DATABASE AUDIT
===============================================================

Audit PostgreSQL / Neon.

Inspect:

- schema
- migrations
- indexes
- constraints
- foreign keys
- unique constraints
- nullable fields
- enum usage
- timestamps
- soft deletion
- transactions
- connection handling

Check:

workspace isolation.

A user from Workspace A must NEVER access:

Workspace B data.

Test tenant isolation across:

- users
- workspaces
- sessions
- messages
- agents
- agent runs
- files
- embeddings
- memories
- usage
- billing
- API keys

Find N+1 queries.

Find missing indexes.

Find dangerous cascading deletes.

Find data consistency problems.

===============================================================
PHASE 6 — REDIS AUDIT
===============================================================

Inspect every Redis usage.

Identify:

- cache
- sessions
- rate limits
- locks
- queues
- temporary state
- streaming state
- agent state

Check:

TTL.

Key naming.

Namespace isolation.

Memory growth.

Serialization.

Error handling.

Redis unavailable behavior.

Race conditions.

Distributed locks.

Do not use Redis as permanent storage accidentally.

===============================================================
PHASE 7 — WORKER / QUEUE AUDIT
===============================================================

Inspect workers and BullMQ/queue systems.

Verify:

producer
→ queue
→ worker
→ job
→ result
→ persistence

Test:

- retries
- backoff
- failed jobs
- dead-letter behavior
- duplicate jobs
- idempotency
- concurrency
- cancellation
- timeouts
- stuck jobs
- graceful shutdown

Verify that jobs survive application restarts where required.

===============================================================
PHASE 8 — AI PROVIDER AUDIT
===============================================================

Audit the entire model/provider system.

Trace:

User
→ LayerFlow API
→ model router
→ provider
→ model
→ streaming
→ response
→ usage tracking

Identify:

- OpenRouter
- OpenAI
- Anthropic
- Google
- DeepSeek
- Groq
- local models
- Ollama
- other providers

Use ACTUAL providers present in code.

Check:

- provider abstraction
- model registry
- model availability
- fallback
- retries
- timeout
- streaming
- API key handling
- provider errors
- token usage
- cost calculation
- rate limits

CRITICAL:

No provider API key may reach the browser.

No secrets may be bundled into frontend code.

No fake provider availability.

No fake model status.

===============================================================
PHASE 9 — MODEL ROUTER AUDIT
===============================================================

Verify model routing.

Test:

cheap request
→ cheap model

coding request
→ coding model

reasoning request
→ reasoning model

provider failure
→ fallback

model unavailable
→ fallback

API key missing
→ understandable error

Check whether routing decisions are deterministic and explainable.

Do not claim intelligent routing unless actual routing logic exists.

===============================================================
PHASE 10 — CHAT AUDIT
===============================================================

Test:

new conversation
message
streaming
stop
retry
regenerate
edit
continue
long response
tool response
error
provider failure
network failure
session reload

Check:

- message persistence
- streaming correctness
- duplicate messages
- ordering
- auto-scroll
- manual scroll
- markdown
- code blocks
- huge output
- mobile UI

===============================================================
PHASE 11 — AGENT SYSTEM AUDIT
===============================================================

Audit the complete agent lifecycle.

Expected:

Create Agent
→ Configure Agent
→ Save
→ Run
→ Plan
→ Tool execution
→ Permission
→ Result
→ Persistence

Verify actual implementation.

Test:

- agent creation
- builder
- agent configuration
- tools
- tool permissions
- execution
- state machine
- retries
- failures
- cancellation
- background jobs
- session persistence
- agent memory

Check for fake agent behavior.

A UI saying:

"Agent completed"

does NOT count.

Verify actual tool execution.

===============================================================
PHASE 12 — AGENT BUILDER AUDIT
===============================================================

Audit:

POST /api/agents/builder
POST /api/agents/builder/:id/step
GET /api/agents/builder/:id

or the actual current routes.

Verify:

- authentication
- authorization
- persistence
- state
- validation
- step ordering
- resume behavior
- cancellation
- errors

Test interrupted builder sessions.

Restart application.

Verify state remains correct.

===============================================================
PHASE 13 — TOOL SYSTEM AUDIT
===============================================================

Inventory every tool.

For each:

NAME
INPUT
PERMISSION
EXECUTION
OUTPUT
ERROR

Audit:

- shell
- filesystem
- browser
- search
- code execution
- Git
- MCP
- HTTP
- database
- custom tools

Check:

- path traversal
- command injection
- SSRF
- unsafe URLs
- environment variable leakage
- secret leakage
- permission bypass
- excessive privileges

===============================================================
PHASE 14 — TERMINAL / GO CLI AUDIT
===============================================================

Audit the Go terminal as a first-class product.

Check:

lf
lf chat
lf run
lf sessions
lf models
lf cost
lf doctor
lf login
lf logout
lf sync
lf mcp
lf daemon
lf rescue
lf upgrade

Test:

- installation
- startup
- authentication
- model selection
- chat
- streaming
- sessions
- tool execution
- errors
- network failures
- update mechanism
- configuration
- environment variables

Run:

go test ./...
go vet ./...

Check:

- race conditions
- nil pointers
- panic paths
- malformed JSON
- broken terminal rendering
- resize handling
- Unicode
- ANSI handling
- Ctrl+C
- Ctrl+D
- command history
- multiline input

===============================================================
PHASE 15 — TERMINAL UI AUDIT
===============================================================

Specifically inspect the LayerFlow terminal UI.

Compare behavior against professional AI coding terminals.

Check:

- home centering
- chat viewport
- message alignment
- bottom composer
- status bar
- streaming
- auto-scroll
- manual scroll
- slash commands
- command palette
- model picker
- agent picker
- tool output
- permission UI
- errors
- terminal resizing
- overflow

Find:

- content overflow
- input jumping
- broken cursor
- broken brackets
- clipping
- incorrect wrapping
- duplicate output
- stale status
- layout corruption

===============================================================
PHASE 16 — RAG AUDIT
===============================================================

Audit the entire RAG pipeline.

Expected:

Document
→ extraction
→ chunking
→ embeddings
→ vector storage
→ retrieval
→ filtering
→ reranking
→ context
→ model

Verify what actually exists.

Test:

- document upload
- extraction
- chunking
- embedding
- pgvector
- retrieval
- metadata filtering
- workspace isolation
- deletion
- re-indexing
- duplicate files
- large files
- unsupported files

Check:

RAG data from Workspace A MUST NOT appear in Workspace B.

Check embedding failures.

Check partial ingestion.

Check worker retry behavior.

===============================================================
PHASE 17 — MEMORY AUDIT
===============================================================

Audit:

- chat memory
- agent memory
- project memory
- terminal memory
- long-term memory

Verify:

creation
retrieval
ranking
deletion
workspace isolation
expiration if applicable

No fake memory.

If UI says:

"Memory saved"

verify database/storage actually contains it.

===============================================================
PHASE 18 — MCP AUDIT
===============================================================

Audit MCP.

Check:

- server registration
- connection
- discovery
- tool discovery
- execution
- authentication
- permissions
- errors
- timeouts
- reconnects

Verify MCP tools cannot bypass LayerFlow permission policies.

===============================================================
PHASE 19 — SECURITY AUDIT
===============================================================

Perform a security review.

Check:

AUTH:
- JWT
- cookies
- sessions
- token expiration
- refresh
- logout

AUTHORIZATION:
- user
- workspace
- admin
- agent
- tool

INPUT:
- SQL injection
- XSS
- command injection
- path traversal
- SSRF
- unsafe file upload

SECRETS:
- API keys
- tokens
- environment variables
- logs
- frontend bundles

NETWORK:
- CORS
- CSRF
- rate limits
- origin validation

FILES:
- MIME validation
- size limits
- path traversal
- malicious files

AI:
- prompt injection
- tool injection
- data leakage
- cross-tenant retrieval

Do NOT perform destructive attacks.

Use safe verification techniques.

===============================================================
PHASE 20 — OBSERVABILITY AUDIT
===============================================================

Check:

- logs
- structured logging
- error IDs
- request IDs
- job IDs
- agent run IDs
- model request IDs
- provider errors
- latency
- token usage
- cost

A production failure should be diagnosable.

===============================================================
PHASE 21 — COST / USAGE AUDIT
===============================================================

Trace:

AI request
→ input tokens
→ output tokens
→ provider
→ model
→ cost
→ workspace usage

Check:

- usage persistence
- cost calculation
- free tier
- limits
- budgets
- rate limits
- model pricing
- failed request handling

Never charge users for requests that never reached the provider unless explicitly intended.

===============================================================
PHASE 22 — BILLING AUDIT
===============================================================

If billing exists:

test:

- plans
- subscription
- checkout
- webhook
- cancellation
- renewal
- usage limits
- entitlement

Verify webhook signature validation.

Verify idempotency.

Never trust client-side billing state.

===============================================================
PHASE 23 — SEO / PUBLIC WEB AUDIT
===============================================================

Audit:

- title
- description
- canonical
- sitemap
- robots
- OpenGraph
- Twitter metadata
- structured data
- headings
- image alt
- performance
- mobile

Check every public route.

===============================================================
PHASE 24 — PERFORMANCE AUDIT
===============================================================

Check:

frontend bundle
images
fonts
API latency
database queries
Redis
worker
AI streaming
RAG retrieval

Find:

- unnecessary rerenders
- N+1 queries
- huge dependencies
- blocking requests
- duplicate API calls
- unnecessary polling
- memory leaks

===============================================================
PHASE 25 — DEPLOYMENT AUDIT
===============================================================

Inspect actual deployment configuration.

Check:

Vercel
Render
Neon
Redis
object storage
workers
CLI releases
environment variables
Docker
CI/CD

Do not assume these are deployed correctly.

Verify configuration from repository.

Find:

- missing env vars
- wrong URLs
- development URLs
- production secrets in source
- CORS mistakes
- health checks
- startup commands
- build commands
- worker commands
- migration strategy

===============================================================
PHASE 26 — TEST COVERAGE AUDIT
===============================================================

Inventory tests.

Classify:

unit
integration
API
database
worker
AI
agent
CLI
E2E
security

Find critical untested flows.

Prioritize tests for:

1. authentication
2. workspace isolation
3. chat
4. model routing
5. agent execution
6. tools
7. RAG
8. terminal
9. billing
10. security

Do not chase percentage coverage blindly.

Prioritize business-critical paths.

===============================================================
PHASE 27 — REAL USER JOURNEY TEST
===============================================================

Test LayerFlow as a real new user.

Journey:

1. Open website
2. Sign up
3. Create workspace
4. Enter chat
5. Select model
6. Send message
7. Receive streaming response
8. Create agent
9. Run agent
10. Use tool
11. Save memory
12. Upload knowledge
13. Search/retrieve RAG
14. Open terminal
15. Login CLI
16. Run lf
17. Continue session
18. Check usage/cost
19. Logout
20. Login again

Record every failure.

===============================================================
PHASE 28 — SECOND USER / TENANT TEST
===============================================================

Create a conceptual second-user test.

Verify User A cannot access:

- User B chat
- User B sessions
- User B agents
- User B memories
- User B files
- User B embeddings
- User B usage
- User B API keys

This is CRITICAL.

===============================================================
PHASE 29 — SCORE SYSTEM
===============================================================

Create a 0–100 score.

Use:

Architecture       10
Frontend           10
Backend            10
Database           10
AI / Models        10
Agents             10
RAG / Memory       10
Terminal / CLI     10
Security           10
Production / DX    10

Each category gets:

0–2  = broken
3–4  = poor
5–6  = partially working
7–8  = good
9    = very strong
10   = production-grade

IMPORTANT:

Do not inflate the score.

A feature that exists visually but does not actually work gets:

0 or partial credit.

A TODO gets no credit.

A mocked feature gets no production credit.

An unverified feature gets:

UNVERIFIED

Do not pretend unverified functionality works.

===============================================================
PHASE 30 — BUG SEVERITY
===============================================================

Classify every bug:

P0 — Critical

Examples:

- security vulnerability
- cross-tenant data leak
- production data corruption
- authentication bypass
- catastrophic failure

P1 — High

Examples:

- core chat broken
- agent execution broken
- CLI broken
- database inconsistency
- production deployment failure

P2 — Medium

Examples:

- important UX bug
- unreliable retry
- broken edge case
- performance issue

P3 — Low

Examples:

- cosmetic issue
- minor DX problem
- non-critical refactor

===============================================================
PHASE 31 — BUG REPORT FORMAT
===============================================================

For every bug:

ID:
SEVERITY:
CATEGORY:
FILE:
LINE:
FUNCTION:
DESCRIPTION:
ACTUAL BEHAVIOR:
EXPECTED BEHAVIOR:
ROOT CAUSE:
EVIDENCE:
IMPACT:
REPRODUCTION:
FIX:
TEST REQUIRED:

Never report:

"this might be broken"

unless clearly marked:

UNVERIFIED / NEEDS VERIFICATION.

===============================================================
PHASE 32 — DO NOT FIX YET
===============================================================

First produce:

AUDIT REPORT

including:

1. Overall score
2. Category scores
3. P0 issues
4. P1 issues
5. P2 issues
6. P3 issues
7. Security findings
8. Architecture findings
9. Missing functionality
10. Fake/mock functionality
11. Unverified functionality
12. Test gaps
13. Deployment gaps
14. Performance issues
15. UX issues
16. Recommended priority order

Do NOT modify code yet.

===============================================================
PHASE 33 — CREATE AUDIT DOCUMENT
===============================================================

Create:

docs/FULL_PRODUCTION_AUDIT.md

Include:

# LayerFlow Full Production Audit

Date:
Commit:
Repository version:

## Overall Score

XX / 100

## Category Scores

table

## Architecture

## Frontend

## Backend

## Database

## Redis

## Workers

## AI Providers

## Model Router

## Chat

## Agents

## Tools

## RAG

## Memory

## MCP

## Terminal

## Security

## Billing

## Usage

## SEO

## Performance

## Testing

## Deployment

## P0 Issues

## P1 Issues

## P2 Issues

## P3 Issues

## Missing Features

## Mocked Features

## Unverified Features

## Recommended Fix Order

===============================================================
PHASE 34 — AFTER AUDIT
===============================================================

Once the audit is complete:

DO NOT automatically implement everything.

Create:

docs/PRODUCTION_FIX_PLAN.md

Organize fixes:

PHASE 1 — Critical
PHASE 2 — Core Product
PHASE 3 — Reliability
PHASE 4 — Security
PHASE 5 — Performance
PHASE 6 — UX
PHASE 7 — Polish

Each task must contain:

- problem
- root cause
- files
- proposed fix
- test
- acceptance criteria

===============================================================
PHASE 35 — THEN FIX
===============================================================

After the audit report exists, fix issues in priority order.

Start with:

P0
↓
P1
↓
core P2
↓
P3

For every fix:

1. Understand root cause.
2. Make smallest correct change.
3. Add regression test.
4. Run relevant tests.
5. Re-run affected flow.
6. Update audit.

Do not rewrite working architecture unnecessarily.

===============================================================
PHASE 36 — RE-AUDIT
===============================================================

After fixes:

Run the complete audit again.

Compare:

BEFORE SCORE
AFTER SCORE

For every resolved bug:

mark:

RESOLVED

For every remaining issue:

mark:

OPEN

For regressions:

mark:

REGRESSION

Do not remove old findings simply because code changed.

===============================================================
PHASE 37 — FINAL VERIFICATION
===============================================================

Run:

pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build

And where applicable:

go test ./...
go vet ./...

Run actual application.

Run actual CLI.

Test critical user journeys.

Verify no regression.

===============================================================
FINAL REPORT
===============================================================

At the end give me:

===================================================
LAYERFLOW PRODUCTION AUDIT
===================================================

Overall:
XX / 100

Architecture:
XX / 10

Frontend:
XX / 10

Backend:
XX / 10

Database:
XX / 10

AI / Models:
XX / 10

Agents:
XX / 10

RAG / Memory:
XX / 10

Terminal / CLI:
XX / 10

Security:
XX / 10

Production / DX:
XX / 10

---------------------------------------------------

P0:
X

P1:
X

P2:
X

P3:
X

---------------------------------------------------

FIXED:
X

REMAINING:
X

UNVERIFIED:
X

MOCKED:
X

---------------------------------------------------

Top 10 Remaining Problems:

1.
2.
3.
4.
5.
6.
7.
8.
9.
10.

---------------------------------------------------

BEFORE:
XX / 100

AFTER:
XX / 100

---------------------------------------------------

Tests:

PASS
FAIL
UNVERIFIED

---------------------------------------------------

Final Production Status:

DO NOT use vague labels like:

"Looks good"
"Production ready"

Instead give an evidence-based conclusion:

- Ready for internal testing
- Ready for private beta
- Needs fixes before beta
- Needs major engineering work

based strictly on the evidence found.

===================================================
CRITICAL RULES
===================================================

1. NEVER trust README claims.
2. NEVER trust TODO/checkmark claims.
3. NEVER trust previous AI agent reports.
4. NEVER invent functionality.
5. NEVER mark mocked functionality as complete.
6. NEVER ignore security.
7. NEVER ignore tenant isolation.
8. NEVER modify code before the initial audit.
9. NEVER report a bug without evidence unless clearly marked unverified.
10. NEVER claim tests passed unless actually executed.
11. NEVER claim production works without verification.
12. NEVER remove working functionality for cosmetic reasons.
13. ALWAYS test root causes.
14. ALWAYS add regression tests for important fixes.
15. ALWAYS perform a second audit after remediation.

Treat LayerFlow as a real startup product.

The goal is not to make the repository look complete.

The goal is to determine what ACTUALLY works.