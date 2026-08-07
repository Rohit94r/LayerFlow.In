# Multi-AI Conversation Workspace ("Continue My Chat") — Full Plan

> Status: **PLANNING** — do not build until this plan is reviewed.
> Owner: Product / Founder
> Depends on: existing provider gateway + BYOK vault (`apps/api/src/services/ai/providers/`, `apps/api/src/gateway/router.ts`), billing (Dodo), rescue pipeline (`apps/api/src/jobs/processors/rescue.ts`).

---

## 0. TL;DR

We already ship **Rescue** — a "life raft" that turns a lost/copied chat into a context passport + improved prompt, so you can continue **outside** LayerFlow in another AI. The product vision is bigger: a **hosted multi-AI chat workspace** where a user **stays inside LayerFlow** and continues ONE conversation across many models — switching when a key expires, runs out, or just because they want a different model's opinion. This doc is the full build plan for that second product.

---

## 1. Current Rescue vs the new vision — why they are different

| Dimension | **Rescue (today)** | **Multi-AI Conversation Workspace (planned)** |
|---|---|---|
| Moment of use | After you **lost** a chat (quota exhausted, account blocked, bad export) | **Any time** — during a chat, before one, or after one ends |
| Where the next chat happens | **Outside LayerFlow** — you take the improved prompt to ChatGPT/Claude/Gemini | **Inside LayerFlow** — the next message is sent here, to any model |
| Output | One-shot report: passport, compressed context, improved prompt, cost check, continue pack | A **live conversation** with full history, model picker, key failover |
| Model switching | You pick the "continue in" model once | Switch **per message** or **auto-failover** mid-conversation |
| Relationship to the platform | A tool you visit when in trouble (transactional) | A home you use daily (retention, session length) |
| Keys | Uses your BYOK key or platform keys for the **single** refine call | Manages **multiple keys per provider**, health-checks them, rotates live |
| Revenue fit | Great **wedge** / first-time user introduction | Great **subscription core** (Dodo billing value) |

### Why they feel similar but are different products
Both touch "I want to keep working after my chat broke." But Rescue is a **converter** (chat → portable context), while the Workspace is a **runtime** (chat lives here, routed across AIs). Rescue finishes in ~60 seconds and sends the user away. The Workspace keeps the user and monetizes model access + storage + continuity.

### Which is better for the market?
**The Multi-AI Conversation Workspace is the better long-term product.** Reasons:

1. **Retention** — Rescue users come once per crisis; workspace users come daily.
2. **Willingness to pay** — "never lose context, switch models live, keep my keys" is a monthly subscription story; "save my lost chat" is a $5 once-in-a-while story.
3. **Differentiation** — everyone can build a "paste your lost chat" tool; very few offer a **key-rotation router with full context continuity** in one box.
4. **Ecosystem effect** — every Rescue report becomes an **import point** into the Workspace, so the two features compound instead of competing.

**Positioning:** Rescue = the front door (top-of-funnel). Workspace = the room you stay in (retention + revenue). Both share the same engine (providers, keys, budgets, passports).

---

## 2. Vision statement

> "LayerFlow is where your conversation never dies and never gets stuck on one AI.
> Bring any chat in, continue it here, and switch between ChatGPT, Claude, Gemini, DeepSeek, Kimi, Groq and Grok — **manually anytime, automatically when a key runs out.**"

### Core promises
1. **Import & continue** — paste a chat from ANY AI tool (even a partial one), get it refined + stored, and continue the same conversation here on a different model.
2. **Multi-key, multi-provider chat** — each chat is a thread; the user picks the model per message; when their key expires / hits rate limits / runs out of quota, the system **auto-switches** to the next working key or a backup provider.
3. **One context, any brain** — the context passport is kept live, so switching models never loses the thread.

---

## 3. Personas

| Persona | Story | Needs |
|---|---|---|
| **The Limit Survivor** | Hit ChatGPT's cap mid-task, lost the thread | Import + continue with a different key/model, no re-explaining |
| **The Key Roster Manager** | Has 3 ChatGPT keys (work + personal + friends), wants them pooled | Multi-key with health status + auto-failover |
| **The Model Hopper** | Starts with GPT for speed, switches to Claude for deep reasoning, Gemini for huge context | Per-message model picker, cost visibility |
| **The Team Lead** | Wants the team's chat history searchable + one billing surface | Shared workspace chat, analytics, budgets |

---

## 4. User flows (the two halves of the vision)

### Flow A — "I lost my chat on Claude, continue it here in ChatGPT"
1. User clicks **Rescue** (existing) and pastes the Claude conversation.
2. Rescue produces the passport + improved prompt (existing pipeline).
3. **New:** one-click **"Continue this conversation here"** → creates a Workspace chat pre-seeded with the full imported history + passport.
4. User types the next message; it streams from the selected model (default: the recommended one, e.g. GPT-4o mini).
5. The improved prompt becomes message #1 of the new thread.

### Flow B — "Fresh chat on LayerFlow, my ChatGPT key dies mid-chat"
1. User starts a new chat (model = ChatGPT, key = their own BYOK key).
2. Mid-chat the key returns 401/429 ("key expired" / "quota exceeded").
3. **Auto-switch** (default ON, configurable): the engine marks the key unhealthy, moves the same conversation to the next available key for OpenAI — or, if none, to the next provider in the backup order (e.g. Claude).
4. A system message in the thread tells the user: *"Your ChatGPT key (…abcd) hit its quota — switched to Claude Sonnet 4. [Change] [Keep]"*.
5. The user can also switch **manually** at any time with the model picker; the full history + passport follows.

### Flow C — "Manual model roulette"
1. User taps the model chip at the bottom of the chat.
2. Picker shows providers with key-health dots (green = key ok, yellow = degrading, red = key dead/expired).
3. Selection applies from the **next message** (per-message override also available in the message composer).

---

## 5. System architecture

```
┌────────────────────────────────────────────────────────────┐
│ Web client (chat panel + model switcher + keys health)     │
└──────────────▲──────────────────────────────▲──────────────┘
        POST/SSE │                            │ GET status
┌───────────────┴────────────┐   ┌────────────┴──────────────┐
│  Chat API (Hono routes)    │   │  Key Health Service        │
│  /api/chat/sessions        │   │  (probe 401/429/quota)     │
│  /api/chat/:id/messages    │   └────────────▲──────────────┘
│  /api/chat/:id/switch      │                │ read/write
└───────────────▲────────────┘   ┌────────────┴──────────────┐
                │                │  provider_keys (existing) │
┌───────────────┴────────────┐   │  platform env keys        │
│  Conversation Store (DB)   │   │  key_health_cache (Redis) │
│  sessions + messages       │   └───────────────────────────┘
└───────────────▲────────────┘
                │
┌───────────────┴──────────────────────────────┐
│  Model Router (new orchestrator)             │
│  pick(model, keys) → key order → failover    │
│  delegates to existing executeRun / gateway  │
│  (budgets, ledger, usage rollup, caches)     │
└──────────────────────────────────────────────┘
```

### Reuse (do not rebuild)
- **Provider adapters** — OpenAI/Claude/Gemini/DeepSeek/Groq/xAI/Kimi/OpenRouter (`apps/api/src/services/ai/providers/`).
- **BYOK vault** — encrypted provider keys per workspace (`provider_keys` table, `services/keys/provider-keys.ts`).
- **Platform fallback keys** — env-level keys (`services/ai/providers/keys.ts` — already extended for all 7 providers).
- **Budgets & ledger** — `budgetReserve`, `budgetRelease`, usage ledger, rollups.
- **Rescue pipeline** — imports feed the chat; `promptSessions` table already exists as a session anchor.
- **Billing (Dodo)** — subscriptions gate the paid tiers of the workspace.
- **Streaming** — adapters already do true SSE; gateway route `/v1/...` can be the model-execution backbone.

### New components
1. **Conversation Store** — chat sessions + messages tables (message-first, JSONB extras).
2. **Key Health Service** — per-key status: `healthy / degrading / dead / expired`, cached in Redis, updated on every provider error code (401/403/429/402/quota) and periodic lightweight probes.
3. **Model Router** — resolve order: *explicit pick → workspace BYOK keys (round-robin among healthy) → platform env key → next provider in backup chain*; returns `{provider, model, apiKey, switchedFrom}`.
4. **Chat API** — CRUD + message streaming + switch endpoint + import endpoint.
5. **Chat UI** — thread view, composer, model chip, key-health indicators, system "switched" notices.

---

## 6. Data model (proposed)

```sql
ai_chat_sessions (
  id, workspace_id, user_id, project_id?,
  title, source_import? (rescue_id ref), passport_json,
  status (active/archived), created_at, updated_at
)

ai_chat_messages (
  id, session_id, role (user/assistant/system),
  content, model_id, provider, key_id?, key_hint?,
  tokens_in, tokens_out, cost_micro, latency_ms,
  switched_from? (jsonb), created_at
)

provider_key_health (
  key_id (nullable for platform keys → provider+env_name),
  workspace_id?, provider, status, last_code, last_error_at,
  checks_count, consecutive_failures, cooldown_until
) -- backed by Redis cache, flushed to DB for history
```

- `ai_chat_sessions.imported_from_rescue` links a session back to a Rescue report → **Rescue becomes the import pipeline of the chat product** (compound effect).

---

## 7. API surface (draft)

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/chat` | create session (optionally from a rescue id / imported text) |
| GET | `/api/chat` | list sessions |
| GET | `/api/chat/:id` | session + messages |
| POST | `/api/chat/:id/messages` | send a message (SSE stream response) — body: `{ content, model? }` |
| POST | `/api/chat/:id/switch` | change default model; `{ model, applyTo: "next_message" }` |
| GET | `/api/chat/keys-health` | key status per provider (dots for the picker) |
| POST | `/api/chat/:id/import` | import raw text from any AI tool → refine via rescue pipeline → seed messages |
| DELETE | `/api/chat/:id` | archive/delete |

---

## 8. Model Router — decision logic (the heart)

```
request: { session, userPickedModel? }

//rountes mention here

1. model = userPickedModel ?? session.defaultModel ?? platformRecommendedModel
2. provider = resolveProvider(model)
3. keys = [
     healthy workspace BYOK keys for provider (round-robin),
     platform env key for provider (if set),
   ]
4. for key in keys:
      try execute → on 401/403/429/402:
          mark key dead/degrading (Redis + DB), notify "switched"
          continue to next key
      if no key worked:
          backupChain = [provider → next best provider by model priority]
          goto 2 with backup model
5. if everything failed → system message + mark thread "needs a key"
```

**Settings per workspace:** `auto_switch` (on/off), `backup_order` (custom provider chain), `notify_on_switch` (system message vs silent), `cost_warning` (before switching to a pricier model).

---

## 9. Key Health Service — details

- Every adapter error already carries HTTP status; the router maps:
  - `401/403` → key invalid/expired → status **dead**
  - `429` → rate limit → **degrading** (cooldown, e.g. 60s, then retry)
  - `402` or `quota_exceeded`/`insufficient_quota` in body → **expired**
  - `5xx`/network → **degrading** (provider issue, not key)
- Consecutive-failure counters; a key only returns to `healthy` after a successful call.
- Periodic probe (scheduled job, reuse BullMQ repeats): ping each workspace's active keys with a 1-token call every N minutes when idle.
- UI: model picker dots + a "Keys" panel listing each key's status + last used model.

---

## 10. UX plan (chat panel)

- **Header:** session title, source badge if imported ("Imported from Claude"), passport chip ("Context: 12k tokens kept").
- **Thread:** scrollable history; messages show provider/model tag + cost chip; system notices for switches are visually distinct.
- **Composer:** textarea + Enter to send, model chip next to send (opens picker), auto-switch toggle, attachment (paste raw chat) icon.
- **Picker:** grouped by provider with key-health dots; shows cost class (flagship/balanced/cheap); "Auto" option = router decides.
- **Import CTA:** on the Rescue report: "Continue this conversation here →" (creates session with full history + passport + improved prompt as first message).

---

## 11. Roadmap (phases)

### Phase 0 — Foundation (mostly exists ✅)
- [x] All 7 provider adapters + platform keys in env (OpenAI, Anthropic, Google, DeepSeek, Groq, xAI, Kimi, OpenRouter)
- [x] BYOK vault + budgets + ledger + streaming gateway
- [x] Rescue pipeline (import & refine)
- [ ] Fix any key gaps (user's six keys → into env) — **blocked on key values**, see §13

### Phase 1 — "Continue here" (MVP, ~2 weeks)
- [ ] Chat session + message tables (migration)
- [ ] `/api/chat` CRUD + message send w/ SSE
- [ ] Import-from-rescue button (Rescue report → new session)
- [ ] Basic chat UI (thread, composer, model chip)
- [ ] Single-key-per-provider path first (no failover yet)

### Phase 2 — Multi-key & failover (~2–3 weeks)
- [ ] Key Health Service (status cache + probes)
- [ ] Router: multi-key round-robin + auto-switch on 401/429/quota
- [ ] System "switched" notices + per-message model override
- [ ] Keys-health UI in picker + Keys page

### Phase 3 — Polish & scale (~2 weeks)
- [ ] Search across sessions; session export (Markdown/JSON)
- [ ] Cost analytics per session; savings view (reuse rollups)
- [ ] Billing gates: free = 1 session + platform keys only; Starter = BYOK + failover; Pro = unlimited sessions + priority routing (hooks into existing Dodo billing)
- [ ] Team workspaces (shared sessions), admin key pool

### Phase 4 — Smartness (~later)
- [ ] Auto "best model for this message" suggestions (heuristic scorer exists in `services/intelligence/analyze.ts`)
- [ ] Context auto-compaction when approaching the model's context window
- [ ] "Answer in 3 models" side-by-side comparison mode

---

## 12. Non-goals (for now)

- Fine-tuning / model training
- Running models locally
- Voice/audio chat
- Desktop/CLI chat parity (CLI stays on the gateway API)
- Marketplace of public prompts in chat

---

## 13. Risks & open questions

1. **Key values not in env yet** — the six keys you shared (OpenAI, DeepSeek, Kimi, Groq, xAI, Gemini) are still only in the chat, not in `apps/api/.env`. Only Groq + Gemini (2.5-flash) are live today. **Action:** paste the six keys into `apps/api/.env` (block "Platform AI provider keys"), then I'll live-verify each and wire them. Until then, Rescue auto-picks Groq/Gemini (fix already applied to the code: `pickRescueModel`).
2. **Cost blow-up risk** — auto-switching to a pricier model must be opt-in with a warning (design covers it).
3. **Key sharing / abuse** — workspace key pools need per-user access controls in Phase 3.
4. **Context size** — 1M-token Gemini windows help, but compaction will be needed (Phase 4).
5. **Compliance** — importing a chat means storing its content; privacy copy + delete flows must be explicit.

---

## 14. Success metrics

| Metric | Target (12 weeks post-launch) |
|---|---|
| Sessions per user / week | ≥ 3 |
| % of sessions imported from Rescue | ≥ 20% |
| Auto-switch events / active user / week | ≥ 1.5 (proves the pain exists) |
| Chat retention (D7) | ≥ 35% |
| Paid conversion of Starter/Pro (chat) | ≥ 8% of active chat users |

---

## 15. Immediate next steps

1. (You) Paste the six API keys into `apps/api/.env` → I verify all six live and finish the rescue/chat key wiring.
2. Review this plan; approve Phase 1 scope.
3. Then: migration → chat API → import-from-rescue → chat UI (MVP).
