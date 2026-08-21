# How LayerFlow's "One Key, Every Model" System Works
## The Managed Multi-Model Architecture — Explained Simply

---

## The Idea (for investors and users)

You pay **$5/month** for LayerFlow Starter. You get ONE API key (`lf_live_...`). With that single key, you can chat with **21 models across 8 providers** — GPT, Claude, Gemini, DeepSeek, Groq, Grok, Kimi, Llama — without buying a single provider key yourself.

**This is exactly like OpenCode Zen — but better, because:**
1. It's a flat subscription, not metered per-token billing
2. You also get prompt versioning, cost analytics, hard budgets, rescue, and terminal sync
3. You can always BYOK (Bring Your Own Key) for unlimited free usage

---

## How It Works (technical, with file paths)

### The Key Resolution Chain

When a user sends a chat message, the API resolves which key to use:

```
User sends chat request (model: "deepseek-chat")
        ↓
loadProviderApiKey(workspaceId, "deepseek")     ← apps/api/src/services/ai/providers/keys.ts
        ↓
┌─────────────────────────────────────────────┐
│ Step 1: Does workspace have a BYOK key?      │
│   Query: provider_keys WHERE workspace_id    │
│          AND provider = "deepseek"           │
│          AND revoked_at IS NULL              │
│   If YES → decrypt with AES-256-GCM          │
│            → use USER's key                  │
│            → LayerFlow pays $0               │
│            → user pays DeepSeek directly     │
└─────────────────────────────────────────────┘
        ↓ (no BYOK key)
┌─────────────────────────────────────────────┐
│ Step 2: Does LayerFlow have a platform key?  │
│   Check env: DEEPSEEK_API_KEY               │
│   If YES → use PLATFORM key                  │
│            → LayerFlow pays DeepSeek         │
│            → meter usage against user's plan │
│            → enforce budget limits           │
└─────────────────────────────────────────────┘
        ↓ (no platform key either)
┌─────────────────────────────────────────────┐
│ Step 3: Throw provider_key_missing error     │
│   "Add a key under Settings → Provider keys" │
└─────────────────────────────────────────────┘
```

**Source code:** `apps/api/src/services/ai/providers/keys.ts:62-92`

### What Gets Metered (managed mode only)

Every managed-mode call records:

| Field | Where | Example |
|---|---|---|
| user_id | `runs` table | "usr_abc123" |
| workspace_id | `runs` table | "ws_xyz789" |
| session_id | `runs` table | "sess_001" |
| provider | `runs` table | "deepseek" |
| model | `runs` table | "deepseek-chat" |
| input_tokens | `runs` table | 1,200 |
| output_tokens | `runs` table | 800 |
| estimated_cost | `runs` table (micro-dollars) | 50,000 (= $0.05) |
| timestamp | `runs` table | 2026-08-21T12:00:00Z |

**Source:** `apps/api/src/services/runs/` + `packages/model-registry` (pricing)

### How Budgets Block Overspending

```
Before the AI call:
  reserveBudget(workspaceId, estimatedCost)    ← services/budgets/enforce.ts
  → checks Redis: has this workspace exceeded its cap?
  → if YES → return 429 "budget_exceeded" (request BLOCKED)
  → if NO → reserve the estimated cost in Redis

After the AI call:
  settleBudget(workspaceId, actualCost)        ← services/budgets/enforce.ts
  → update Redis with real token cost
  → release any over-reserved amount

If the call fails:
  releaseBudget(workspaceId, reservedCost)     ← services/budgets/enforce.ts
  → give back the reserved amount
```

**This is atomic (Redis Lua scripts):** `apps/api/src/services/budgets/lua.ts`

### Scheduled Cost Rollups

The worker (BullMQ) runs these on a schedule:

| Job | Schedule | What it does |
|---|---|---|
| `usage-rollup` | Every hour at :15 | Recompute spend per workspace/model, reconcile Redis with DB |
| `budget-alerts` | Every 15 minutes | Email owners at 80% and 100% of budget |
| `weekly-digest` | Monday 09:00 UTC | Per-workspace usage summary email |

**Source:** `apps/api/src/jobs/queues.ts:registerScheduledJobs()`

---

## The Terminal Experience

### What the user sees in `lf`

When the user opens the model switcher (`Ctrl+M` or `/models`):

```
┌─────────────────────────────────────────────────┐
│  Switch model          enter select · esc close  │
│                                                  │
│  MANAGED BY LAYERFLOW                            │
│    ● deepseek-chat      DeepSeek    128K  $0.27  │
│      gemini-2.5-flash   Google      1M    $0.30  │
│      llama-3.3-70b      Groq        128K  $0.59  │
│                                                  │
│  MY API KEYS                                     │
│      gpt-4o             OpenAI      128K  $2.50  │
│      claude-3-5-sonnet  Anthropic   200K  $3.00  │
│                                                  │
│  Selection applies to the active session.       │
└─────────────────────────────────────────────────┘
```

- **MANAGED BY LAYERFLOW** = LayerFlow's platform keys (included in subscription)
- **MY API KEYS** = user's own BYOK keys (free, unlimited)

**Source:** `terminal/internal/tui/models.go:136-171`

### What the user sees in the web dashboard

The model picker (`components/features/chat/model-picker.tsx`) shows available models with a badge:
- "Included" — managed, part of your plan
- "BYOK" — your own key, unlimited

---

## The Provider Ladder (what keys LayerFlow buys, in order)

### Now (live, $0/mo)
| Provider | Key | Models | Cost to LayerFlow |
|---|---|---|---|
| Groq | `GROQ_API_KEY` (free tier) | Llama 3.3 70B, etc. | $0 (free tier) |
| Google | `GEMINI_API_KEY` (free tier) | Gemini Flash, Gemini Pro | $0 (free tier) |

### After first revenue ($10/mo)
| Provider | Key | Models | Cost to LayerFlow |
|---|---|---|---|
| DeepSeek | `DEEPSEEK_API_KEY` ($10 deposit) | DeepSeek V3, DeepSeek R1 | ~$0.27/M tokens (very cheap) |

### At ~$500 MRR ($100/mo)
| Provider | Key | Models | Cost to LayerFlow |
|---|---|---|---|
| OpenAI | `OPENAI_API_KEY` (pay-as-you-go) | GPT-4o, GPT-4.1, o3-mini | $2.50-$15/M tokens (Pro plan only) |
| Anthropic | `ANTHROPIC_API_KEY` (pay-as-you-go) | Claude Sonnet 4, Claude Opus 4 | $3-$15/M tokens (Pro plan only) |

### At scale (revenue-linked)
| Provider | Key | Models | Cost to LayerFlow |
|---|---|---|---|
| Kimi | `KIMI_API_KEY` | Kimi K2, Kimi K2 Thinking | ~$1.25/M tokens |
| xAI | `XAI_API_KEY` | Grok 3, Grok 3 Mini | ~$3/M tokens |

---

## Unit Economics (how LayerFlow makes money)

### Per-plan margin

| Plan | Price | Managed inference cap | Provider cost (worst case) | LayerFlow keeps |
|---|---|---|---|---|
| Free | $0 | $0.30/mo | $0 (Groq/Gemini free tiers) | -$0.30 (acquisition cost) |
| Starter | $5 | $2.50/mo | $2.50 (DeepSeek mostly) | $2.50 (50% margin) |
| Pro | $14 | $7.00/mo | $7.00 (mixed providers) | $7.00 (50% margin) |
| Team | $25/seat | $12/seat/mo | $12 (pooled, capped) | $13/seat (52% margin) |

### What happens when a user hits their cap

1. User sends a chat request
2. `reserveBudget()` checks Redis → cap exceeded
3. API returns `429 budget_exceeded`
4. User sees: "You've hit your monthly AI budget. Add your own API keys for unlimited free usage, or upgrade to Pro."
5. Two choices:
   - **Add BYOK keys** → costs LayerFlow $0, user pays provider directly
   - **Upgrade to Pro** → more managed budget, LayerFlow earns more

**BYOK is the pressure valve that makes caps acceptable.** Users never feel trapped.

---

## What's Built vs What's Missing

### ✅ Already Built
- Key resolution chain (BYOK → platform → error)
- AES-256-GCM encryption for BYOK keys
- Budget reserve/settle/release (atomic, Redis Lua)
- Per-run cost recording with micro-dollar pricing
- Model registry (21 models, 8 providers)
- Intelligence router (task classification → model recommendation)
- Model switcher with available/add-key grouping + ✓/○ badges (terminal + web)
- Usage rollups, budget alerts, weekly digests (worker jobs)
- Savings tracking (tokens saved + dollars saved vs flagship-only)
- Gateway (OpenAI-compatible `/v1/chat/completions`)
- Plan-limit enforcement middleware (`plan-limits.ts`) — checks plan vs provider access
- Device auth endpoints (`/api/v1/auth/device`) — CLI `lf login` browser flow
- Gateway improve endpoint (`POST /v1/improve`) — CLI prompt improvement
- Gateway usage endpoint (`GET /v1/usage`) — CLI budget/plan display
- `lf cost` shows workspace budget cap, progress bar, and plan status

### 🟡 Remaining (config/deployment, not code)
- **Dodo product IDs** — billing routes work but no products created in Dodo dashboard (deploy-time task)
- **DeepSeek platform key** — only Groq + Gemini configured as platform keys today (env config when ready)

---

## How to Explain This to Investors

> "LayerFlow is like OpenCode Zen, but with a flat subscription instead of metered billing. You pay $5/month and get access to 21 AI models through one API key — no need to buy OpenAI, Anthropic, or DeepSeek keys separately. LayerFlow handles the routing, the cost optimization, and the budgets. And if you want unlimited free usage, you can always bring your own keys — we charge nothing for that.
>
> The economics work because we route cheap tasks to cheap models. A simple question goes to Groq (free tier) or DeepSeek ($0.27/M tokens). Only complex reasoning hits the expensive models, and only for Pro users. Our gross margin is 50%+ at every tier because we cap managed inference below the subscription price. If someone exceeds their cap, they either upgrade or switch to BYOK — which costs us nothing."

---

*Source files: `apps/api/src/services/ai/providers/keys.ts` · `apps/api/src/services/budgets/enforce.ts` · `apps/api/src/services/budgets/lua.ts` · `packages/model-registry/src/index.ts` · `apps/api/src/services/intelligence/route.ts` · `terminal/internal/tui/models.go` · `apps/api/src/jobs/queues.ts`*
