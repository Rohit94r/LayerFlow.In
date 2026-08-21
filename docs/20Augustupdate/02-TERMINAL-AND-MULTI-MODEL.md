# Section 2 — Terminal + Multi-Model Architecture + Cost Strategy
**The strategic document: how `lf` becomes the best terminal AI, and how LayerFlow delivers "one key, every model" better than OpenCode**

---

## 2.1 The Strategic Position

You use OpenCode daily. Here's the honest comparison and the opportunity:

| | OpenCode | LayerFlow (target) |
|---|---|---|
| Terminal UX | Excellent (this is the bar) | Match it — Bubble Tea TUI already shipped |
| Models | OpenCode Zen: ONE key, all models — but **you pay per token, and it's another bill** | Managed mode included in subscription + BYOK always free |
| Web workspace | Weak/none | Full workspace: prompts, memory, search, costs, teams |
| Cost control | None | Hard budgets, per-model analytics, savings tracking, exact-cache |
| Rescue dead chats | No | Yes — flagship feature |
| Sync terminal↔web | No | Yes — already built (watermark protocol) |
| Pricing model | Pay per token (metered) | Simple subscription (Free/$5/$14) with included managed usage |

**The wedge:** OpenCode users must buy the Zen key separately AND still have no cost control, no memory, no rescue, no web view of terminal sessions. LayerFlow bundles managed multi-model access into a flat subscription and adds the workspace layer around it. Terminal-first is the RIGHT bet — developers live in the terminal. Web is the control room; terminal is the cockpit.

---

## 2.2 Terminal Architecture (as built — keep this)

```
LOCAL MACHINE
┌─────────────────────────────────────────────────────┐
│  lf (Cobra root)                                    │
│    ├─ TUI (Bubble Tea): home, conversation, slash, │
│    │   diff viewer, approval modal, search, help   │
│    ├─ Session Manager (SQLite, migrations)          │
│    ├─ Agent Runtime (lf run): planner→tools→observe │
│    ├─ Tool Registry: read/write/edit/grep/glob/     │
│    │   shell/git + LSP client + MCP client          │
│    ├─ Compaction (context overflow → summarize)     │
│    ├─ Memory + Watcher + Audit log                  │
│    ├─ Sync Journal → push/pull to cloud             │
│    └─ Auth: keyring (device OAuth or API key)       │
└───────────────────────┬─────────────────────────────┘
                        │ HTTPS (API key / OAuth token)
CLOUD                   ▼
  /v1/chat/completions (gateway) → budget reserve → provider → settle
  /api/v1/sync/*        (sessions/messages/memory/projects)
  /api/chat, /api/models, /api/runs …
```

**Language decision: STAY ON GO.** 17.5K lines shipped, pure-Go sqlite means static binaries with zero cgo pain, goreleaser pipeline works, Homebrew works. Do not rewrite. Node CLI would lose binary distribution and LSP/process performance.

### What to improve next in the terminal (priority order)
1. **`lf login` device flow end-to-end** — endpoint `/api/v1/auth/device` must exist on the API (see §2.7). Today users paste an API key from Settings — works, but device flow is the pro experience.
2. **Streaming tool-call rendering** — show tool execution diffs inline (diff viewer exists — `tui/diff.go`).
3. **`/model` slash command with live availability** — `/models` checks gateway health; wire the picker into slash palette (`tui/slash.go`).
4. **Windows real-machine testing** — PowerShell installer exists; test on actual Win11 (PATH, colors, TTY).
5. **Offline mode** — degrade to `local` provider (adapter exists) with clear banner.

---

## 2.3 The Multi-Model Key Architecture — THE Core Design

This is the most important section. The goal: **a new user installs `lf`, logs in, and chats immediately — without buying a single provider API key.** Just like OpenCode Zen, but bundled in the LayerFlow subscription.

### Two access modes (both ALREADY coded — `services/ai/providers/keys.ts`)

```
REQUEST: user asks model M
   │
   ├─ Does the user's workspace have a BYOK key for M's provider?
   │     YES → use USER's key (user pays provider directly, $0 to LayerFlow)
   │     NO  → does LayerFlow have a platform key for that provider?
   │           YES → use PLATFORM key → meter usage → enforce plan limits
   │           NO  → suggest: switch model / add BYOK key (one-click to settings)
```

**MODE A — MANAGED (LayerFlow's keys, metered)**
- LayerFlow holds provider keys in env (`GROQ_API_KEY`, `GEMINI_API_KEY` today; add paid ones later)
- Every managed call records: user, workspace, session, model, tokens in/out, cost (micro-dollars) — `runs` table already does this
- Plan limits enforced BEFORE the call (budget reserve/settle — already built)
- This is the "OpenCode Zen-like" experience, but included in the subscription

**MODE B — BYOK (user's keys, free forever)**
- Already complete: encrypted vault, per-workspace, never exposed to browser
- LayerFlow charges NOTHING for BYOK routing — that's the value prop and the margin protection

### The bootstrapped provider ladder (what keys to buy, in order)

| Stage | Platform keys to add | Monthly cost | Why |
|---|---|---|---|
| Now (done) | Groq free tier + Gemini free tier | $0 | Free-plan users get real chat out of the box |
| After first revenue | Groq paid tier ($~20) + DeepSeek (deposit $10) | ~$30/mo | Fast + cheap coding models for managed mode |
| ~$500 MRR | OpenAI + Anthropic small budgets | ~$100/mo | Flagship models available managed; hard-capped by plan limits |
| Scale | Negotiated/volume | revenue-linked | Only when margin math supports it |

**Rules that keep you solvent:**
1. Managed usage is ALWAYS capped below plan price (Free: ~$0.30/mo of inference; Starter: ~$2.50; Pro: ~$7 — leaves 50%+ margin)
2. Enforce per-user daily caps (Redis rate limiter exists — extend per plan)
3. Route cheap tasks to cheap models automatically (intelligence router exists — make it the DEFAULT for managed mode)
4. Cache aggressively per-user (exact cache exists — never cross-user, privacy)
5. BYOK is unlimited and free — the escape valve that makes caps acceptable

---

## 2.4 Model Registry & Router (what exists, what to tune)

**Registry** (`packages/model-registry`): 21 models, 8 providers, micro-dollar pricing, context windows, capabilities (streaming/tool-calling/vision/reasoning). Versioned `model_pricing` DB table for effective-dated overrides so historical costs stay accurate. **Never put pricing in frontend components — always read from registry/API.**

**Router** (`services/intelligence/`): classifies task (simple/coding/reasoning/long-context/vision/agent/terminal) → scores models on quality, latency, cost, context, availability, user preference, budget → returns primary + alternative with savings%. Has tests.

**Recommended routing defaults (managed mode):**
```
simple Q&A        → gemini-flash / groq llama     (near-free)
normal coding     → deepseek-v3 / kimi-k2          (cheap, strong)
complex reasoning → claude/gpt flagship            (BYOK or Pro plan only)
terminal agent    → model with reliable tool-calls (deepseek/kimi/gpt)
long context      → gemini long-window
provider down     → auto-fallback next provider     (already built in chat router)
```
**Make the router the DEFAULT in managed mode.** Show the choice in UI ("routed to DeepSeek — saved 87%") — transparency converts.

---

## 2.5 Gateway (OpenAI-compatible) — the developer wedge

Already live same-origin at `layerflow.dev/v1`:
- `POST /v1/chat/completions` (stream + non-stream), `GET /v1/models`
- API-key auth (`lf_live_...` keys minted in dashboard), 60 req/min
- Budget reserve/settle, exact cache, gateway logs, savings headers

**To make it marketing-ready:**
1. Move to `api.layerflow.dev` (Section 3) — 120s serverless timeout and cold starts hurt SDK users
2. Conformance-test with `openai` python + node SDKs (a weekend task)
3. Publish `BASE_URL=https://api.layerflow.dev/v1` snippets in docs — any OpenAI SDK user becomes a LayerFlow user with zero code change
4. This is how you absorb OpenCode users: they can point OpenCode itself at LayerFlow's gateway as a custom provider while they try `lf`

---

## 2.6 Agent Runtime (terminal + web, shared rules)

The loop (terminal `internal/app`, web `jobs/processors/agent.ts`):
```
Planner → Context Builder (memory + files + recent) → Tool Selection
→ Permission Check (approval gate) → Execute → Observe → Loop
→ max iterations/tokens/cost → Validate → Final report
```
Built today: marketplace templates, scheduled agents, approvals (`decideAgentApproval`), step logs, progress polling, cancellation, maintenance job.

**Guardrails (already partially in, finish these):**
- Permission levels: READ_ONLY / SAFE_WRITE / FULL_WRITE / DANGEROUS
- DANGEROUS ops (rm, force-push, credentials, external submits like job applications) → ALWAYS require explicit approval. Never let the model bypass.
- Hard caps per agent run: maxSteps, maxTokens, maxCost — enforce via budget reserve (exists)

---

## 2.7 Terminal Auth — finish the device flow

Current code (`terminal/internal/auth/auth.go`) expects:
- `GET auth.layerflow.dev/device` → `{ device_code, user_code, verification_uri }`
- poll `POST auth.layerflow.dev/token` until user approves in browser

**Simplest completion (no new host):** add these endpoints to the existing Hono app (`/api/v1/auth/device`, `/api/v1/auth/token`), store device codes in Redis (5-min TTL), user approves at `layerflow.dev/settings/devices`, CLI receives a workspace API key (minted via existing api-keys service). Then point `DeviceAuthURL` at `layerflow.dev/api/v1` and ship `lf v0.2.7`.

---

## 2.8 Context & Cost Management (both ends)

- **Terminal:** compaction on overflow (`internal/compact`), local memory, only deltas sync
- **Server:** context builder assembles recent messages + summaries + relevant memory + project context + tool results; token accounting per run (input/output/cached); `services/savings/` tracks tokens & dollars saved per run vs naive flagship-only usage
- **Never cache across users. Never drop safety to save tokens.**

### Unit economics target (keep this math)
| Plan | Price | Managed inference cap | BYOK | Gross margin |
|---|---|---|---|---|
| Free | $0 | ~$0.30/mo (Groq/Gemini free tiers mostly) | unlimited | n/a (CAC investment) |
| Starter | $5 | $2.50 | unlimited | ~50% |
| Pro | $14 | $7.00 | unlimited | ~50% |
| Team | per seat | pooled, capped | unlimited | ~55%+ |

At 500 Starter users: ~$2,500 MRR, ~$1,250 gross profit, infra ~$150 (see Section 3 costs) → **~$1,100/mo runway-positive on a tiny base.** That's the bootstrap story.

---

## 2.9 What makes LayerFlow defensible (say this to investors)

1. **Rescue pipeline** — context extraction → compression → scoring → model recommendation → continue-pack. Nobody ships this end-to-end.
2. **Terminal↔web sync** — sessions created in `lf` appear in the browser with files, costs, models. OpenCode has no web layer.
3. **Cost enforcement at request time** — reserve/settle is atomic; budgets actually BLOCK, not email.
4. **Flat subscription + managed models + free BYOK** — OpenCode Zen is metered; we're flat with an escape valve.
5. **21-model registry with real micro-dollar pricing** — cost analytics are accurate by construction, not estimated.
