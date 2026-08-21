# LayerFlow — 21 August Task Compilation
## Master Work Plan: Phases, Priorities, and Exact Tasks

**Founder & CEO: Rohit Jadhav**
**Goal: Fully working product → Host backend tomorrow → Improve terminal UI → Improve dashboard**

This file is the single source of truth for what to do next, organized in phases. Read this before starting any work.

---

# PART A — CURRENT STATUS SNAPSHOT

## Tech Stack (verified from code)

| Layer | Technology | Status |
|---|---|---|
| Web frontend | Next.js 16, React 19, TypeScript, Tailwind v4 | ✅ Live on Vercel |
| API backend | Hono 4, TypeScript, Node | ✅ Live (same-origin on Vercel) |
| Background worker | BullMQ 5, ioredis | 🔴 Not running in production |
| Database | PostgreSQL (Neon) + pgvector | ✅ Live |
| Redis | Upstash | ✅ Live |
| Terminal CLI | Go 1.25, Cobra, Bubble Tea, Lip Gloss, Glamour | ✅ v0.2.6 released publicly |
| Terminal storage | SQLite (modernc.org/sqlite, pure Go) | ✅ Working |
| AI providers | 8 providers, 21 models, 9 adapter files | ✅ Real API calls |
| Auth | Better Auth + Google OAuth | ✅ Live |
| Billing | Dodo Payments (India) | 🟡 Integrated, not launched |
| Encryption | AES-256-GCM (BYOK keys) | ✅ Working + tested |
| Email | Resend | ✅ Working |
| Error tracking | Sentry | ✅ Configured |
| CI/CD | GitHub Actions + goreleaser (terminal releases) | ✅ Working |
| Deployment | Vercel (web+API) → target: VPS/Render/Fly for API+worker | 🔴 In progress |

## Feature Status Matrix

| Feature | Web | Terminal | Backend | Worker | Prod Working? | Blocker |
|---|---|---|---|---|---|---|
| Multi-model chat (streaming) | ✅ | ✅ | ✅ | — | ✅ | None |
| Model switching | ✅ | ✅ | ✅ | — | ✅ | None |
| Auto model fallback | ✅ | ✅ | ✅ | — | ✅ | None |
| Prompt library + versioning | ✅ | — | ✅ | — | ✅ | None |
| BYOK vault (encrypted keys) | ✅ | — | ✅ | — | ✅ | None |
| Hard budgets (block requests) | ✅ | — | ✅ | — | ✅ | None |
| Cost analytics | ✅ | ✅(lf cost) | ✅ | 🟡 | 🟡 | Rollup job not running in prod |
| Rescue (dead chat recovery) | ✅ | ✅(lf rescue) | ✅ | ✅ | 🔴 | Worker not running in prod |
| Compare (multi-model side-by-side) | ✅ | — | ✅ | ✅ | 🔴 | Worker not running in prod |
| Agents (autonomous + approvals) | ✅ | ✅(lf run) | ✅ | ✅ | 🔴 | Worker not running in prod |
| AI memory + embeddings | ✅ | ✅ | ✅ | ✅ | 🔴 | Worker not running in prod |
| Hybrid search (keyword + semantic) | ✅ | ✅(lf search) | ✅ | — | ✅ | None (inline) |
| Terminal ↔ cloud sync | ✅(devices) | ✅(lf sync) | ✅ | — | ✅ | None |
| Improve prompt | ✅ | 🔴 NOT BUILT | ✅ | ✅ | 🟡 | Terminal missing, worker in prod |
| Billing (checkout + plans) | ✅ | — | ✅ | — | 🟡 | Dodo products not created |
| Team workspaces | ✅ | — | ✅ | — | ✅ | None |
| Gateway (OpenAI-compatible) | ✅(/v1) | — | ✅ | — | ✅ | Same-origin only, needs own domain |

## Terminal CLI Status (v0.2.6, 17.5K lines Go)

| Command | Implemented | Works | Notes |
|---|---|---|---|
| `lf` (TUI home) | ✅ | ✅ | Brand is pixel-block wordmark — needs cleanup |
| `lf chat` | ✅ | ✅ | Interactive + one-shot, streaming works |
| `lf run` | ✅ | ✅ | Agent loop with tool approvals |
| `lf sessions` | ✅ | ✅ | SQLite local history |
| `lf login` | 🟡 | 🟡 | Device flow written, endpoints not deployed; falls back to API key paste |
| `lf logout` | ✅ | ✅ | Keyring purge |
| `lf sync` | ✅ | ✅ | Push/pull with watermark |
| `lf models` | ✅ | ✅ | Model picker with managed/byok grouping |
| `lf doctor` | ✅ | ✅ | Connectivity diagnostics |
| `lf rescue` | ✅ | ✅ | Terminal rescue |
| `lf cost` | ✅ | ✅ | Usage from API |
| `lf mcp` | ✅ | ✅ | MCP client config |
| `lf daemon` | ✅ | ✅ | Background sync |
| `lf upgrade` | ✅ | ✅ | Self-update |

## Terminal TUI Issues Found (from code audit)

| Issue | File | Problem | Fix |
|---|---|---|---|
| Pixel-block wordmark | `tui/brand.go` | "LayerFlow.dev" rendered as giant ASCII block letters — looks dated, not clean | Replace with simple bold text wordmark like OpenCode |
| Stale version in welcome | `tui/conversation.go:216` | Says "v0.1.0" — should be dynamic or v0.2.6 | This file is DEAD CODE (not used by app.go) — delete it |
| Hardcoded colors | `tui/conversation.go:150-167` | Uses raw ANSI 39/212/243/33 instead of theme system | Dead code — delete; chat.go already uses theme colors |
| Model catalog hardcoded | `tui/models.go:21-36` | 14 hardcoded models, missing new ones (GPT-4.1, o3-mini, Claude 4, etc.) | Fetch from gateway `/v1/models` and merge with local metadata |
| BYOK classification wrong | `tui/models.go:69-106` | `isByOK()` guesses by model ID prefix, not by actual workspace keys | Use `available` flag from gateway (already does this) or API endpoint |
| No improve-prompt button | `tui/chat.go` | Web has improve panel, terminal doesn't call it | Add `/improve` slash command + button in composer |
| Streaming re-renders all | `tui/chat.go:158-201` | `renderConversation` re-runs glamour markdown on ALL messages + streaming text every View() call (220ms) | Cache rendered messages, only re-render streaming chunk |
| Tagline mismatch | `tui/brand.go:16` | "AI workspace for developers" vs website "The AI Coding Platform That Never Forgets" | Update to match |
| Two conversation renderers | `tui/conversation.go` + `tui/chat.go` | `ConversationView` is unused dead code; `renderChat` is the real one | Delete `conversation.go` |

## Dashboard Issues (inferred — all worker-dependent)

| Page | Issue | Root Cause |
|---|---|---|
| Home | Activity feed may be empty | No runs completing (worker down) |
| Costs | Shows $0 spend, $0 savings | `usage-rollup` job not running |
| Rescue | Stuck on "queued" forever | `rescue` job not processing |
| Compare | Stuck on "queued" forever | `compare` job not processing |
| Agents | Runs stuck on "pending" | `agent` job not processing |
| Memory | No extracted memories | `memory-extract` + `embeddings` jobs not processing |

**All dashboard issues are caused by ONE thing: the worker not running in production.** The UI is fine. Fix the worker → everything shows up.

---

# PART B — MANAGED MULTI-MODEL: HOW IT WORKS

## The OpenCode Comparison

OpenCode Zen gives you ONE API key and you get access to all models. But you pay per token — it's metered billing on top of someone else's infrastructure.

LayerFlow does it better:

```
User pays $5/month (Starter plan)
      ↓
Gets a LayerFlow API key (lf_live_...)
      ↓
Uses lf chat / web chat / gateway
      ↓
LayerFlow routes to the best model
      ├─ If user added BYOK keys → uses user's key (user pays provider directly, LayerFlow charges $0)
      └─ If no BYOK key → uses LayerFlow's platform key (LayerFlow pays provider, meters usage, enforces plan limits)
```

## What's Already Built

| Component | File | Status |
|---|---|---|
| BYOK key storage (encrypted) | `apps/api/src/services/crypto.ts` | ✅ |
| Platform key fallback | `apps/api/src/services/ai/providers/keys.ts` | ✅ |
| Key resolution: BYOK → platform → error | `keys.ts:loadProviderApiKey()` | ✅ |
| Has-provider-key check (for routing) | `keys.ts:hasProviderKey()` | ✅ |
| Platform default models | `keys.ts:platformDefaultModel()` | ✅ |
| Model switcher (managed vs BYOK groups) | `terminal/internal/tui/models.go` | ✅ |
| Budget enforcement (reserve/settle) | `apps/api/src/services/budgets/enforce.ts` | ✅ |
| Per-run cost recording | `apps/api/src/services/runs/` | ✅ |
| Model registry (21 models, pricing) | `packages/model-registry/src/index.ts` | ✅ |
| Intelligence router | `apps/api/src/services/intelligence/route.ts` | ✅ |

## Platform Keys Currently Configured

| Provider | Env Var | Status | Notes |
|---|---|---|---|
| Groq | `GROQ_API_KEY` | ✅ Configured | Free tier — fast, cheap (Llama, etc.) |
| Google | `GEMINI_API_KEY` | ✅ Configured | Free tier — Gemini Flash/Pro |
| OpenAI | `OPENAI_API_KEY` | 🔴 Not set | Needs paid key |
| Anthropic | `ANTHROPIC_API_KEY` | 🔴 Not set | Needs paid key |
| DeepSeek | `DEEPSEEK_API_KEY` | 🔴 Not set | Very cheap, deposit $10 |
| Kimi | `KIMI_API_KEY` | 🔴 Not set | Cheap, long context |
| xAI | `XAI_API_KEY` | 🔴 Not set | Grok models |

## What to Add (in priority order)

1. **DeepSeek** ($10 deposit) — cheapest strong coding model. Managed users get good results at near-zero cost to LayerFlow.
2. **Groq paid tier** (~$20/mo) — removes rate limits, faster, more reliable.
3. **OpenAI** (pay-as-you-go) — flagship models, but ONLY for Pro plan users (cost-capped).
4. **Anthropic** (pay-as-you-go) — same, Pro only.

## How Plan Limits Protect LayerFlow's Margin

| Plan | Price | Managed inference cap | Models available (managed) | BYOK |
|---|---|---|---|---|
| Free | $0 | ~$0.30/mo per user | Groq + Gemini (free tier) only | Unlimited, free |
| Starter | $5 | ~$2.50/mo per user | Groq + Gemini + DeepSeek | Unlimited, free |
| Pro | $14 | ~$7.00/mo per user | All providers including OpenAI/Anthropic | Unlimited, free |
| Team | per seat | pooled, capped | All providers | Unlimited, free |

**The math:** if a Starter user burns $2.50 of managed inference, LayerFlow pays ~$2.50 to providers and keeps $2.50. 50% margin. If they exceed $2.50, the hard budget BLOCKS the next request — they either upgrade to Pro or add BYOK keys (which costs LayerFlow nothing).

## What Still Needs Building

| Task | Priority | Effort |
|---|---|---|
| Plan-limit middleware (check subscription before managed call) | P1 | 1 day |
| DeepSeek platform key + `DEEPSEEK_MODEL` env | P1 | 10 min |
| "Included in your plan" badge in model switcher | P2 | 2 hrs |
| Usage meter display in terminal (`lf cost` shows plan usage vs cap) | P2 | 3 hrs |
| Auto-route cheap tasks to Groq/Gemini/DeepSeek (managed mode default) | P2 | 1 day |
| Dodo product creation + checkout test | P1 | 1 hr |

---

# PART C — WORK PLAN (Phases, Agent-Wise)

## PHASE 0 — Backend Hosting (DO THIS FIRST, tomorrow)

**Goal:** Get the worker running so rescue, compare, agents, memory, and cost analytics all work.

### Task 0.1 — Deploy API + Worker to VPS (friend's Hostinger Docker)
| Step | Action | Done? |
|---|---|---|
| 1 | SSH into VPS, install Docker + Docker Compose | ☐ |
| 2 | Clone repo, `npm ci`, `npm run build --workspace @layerflow/api` | ☐ |
| 3 | Create `.env` from `.vercel.env` (ALL secrets identical) | ☐ |
| 4 | Docker compose: API (`node dist/index.js`) + Worker (`node dist/worker.js`) | ☐ |
| 5 | Nginx reverse proxy 443→8787, Certbot SSL for `api.layerflow.dev` | ☐ |
| 6 | DNS: `api` A record → VPS IP | ☐ |
| 7 | Vercel: set `NEXT_PUBLIC_API_URL=https://api.layerflow.dev`, redeploy | ☐ |
| 8 | Google OAuth: add `https://api.layerflow.dev/api/auth/callback/google` | ☐ |
| 9 | Verify: `curl https://api.layerflow.dev/health` → `{"status":"ok"}` | ☐ |
| 10 | Verify worker logs: "repeatable jobs registered" + "worker started" | ☐ |

### Task 0.2 — Verify 5 Unblocked Features
| Step | Action | Done? |
|---|---|---|
| 1 | Rescue: paste dead chat → report completes (not stuck) | ☐ |
| 2 | Compare: run prompt across 3 models → results appear | ☐ |
| 3 | Agents: run template agent → steps update live | ☐ |
| 4 | Memory: chat → check memory page → extracted memories appear | ☐ |
| 5 | Costs: check costs page → real spend + savings shown | ☐ |

---

## PHASE 1 — Terminal UI Overhaul (FIRST PRIORITY after hosting)

**Goal:** Make `lf` TUI look as clean and smooth as OpenCode. No buffering, clean branding, prompt improve button.

### Task 1.1 — Clean Brand Text (replace pixel wordmark)
| File | Change | Done? |
|---|---|---|
| `terminal/internal/tui/brand.go` | Replace `blockGlyphs` + `renderBlockRows` + `renderBrand` with simple bold text: `LayerFlow` in orange + `.dev` in dim, centered. Use `styleWordmark` from theme.go. | ☐ |
| `terminal/internal/tui/brand.go:16` | Update tagline to "The AI Coding Platform That Never Forgets" | ☐ |

**Target look (like OpenCode):**
```
        LayerFlow.dev
   The AI Coding Platform That Never Forgets
```
Clean, bold, orange "LayerFlow" + dim ".dev". No ASCII art blocks.

### Task 1.2 — Delete Dead Code
| File | Action | Done? |
|---|---|---|
| `terminal/internal/tui/conversation.go` | DELETE entirely — `ConversationView` is unused. `chat.go` has the real renderer. | ☐ |

### Task 1.3 — Fix Streaming Performance (no buffering/flicker)
| File | Change | Done? |
|---|---|---|
| `terminal/internal/tui/chat.go:158-201` | Cache rendered messages: store pre-rendered output per message in a `map[string]string`. Only re-render the streaming chunk, not the full history every View(). | ☐ |
| `terminal/internal/tui/chat.go:235-244` | `renderMarkdown` is called on every View() tick for the streaming buffer. Only render when new text arrives (compare last rendered length). | ☐ |

**The problem:** every 220ms tick, `View()` calls `renderConversation()` which:
1. Loops through ALL messages
2. Calls `renderMarkdown()` (glamour) on each
3. Also calls `renderMarkdown()` on the streaming buffer
4. Glamour is expensive — for 50 messages this re-parses 50 markdown strings 5x/second

**The fix:**
```go
// Add to App struct:
renderedCache map[string]string  // message ID → rendered string

// In renderConversation:
for _, m := range a.messages {
    if cached, ok := a.renderedCache[m.ID]; ok {
        sb.WriteString(cached)
    } else {
        rendered := renderMessage(m, w)
        a.renderedCache[m.ID] = rendered
        sb.WriteString(rendered)
    }
}
// Only re-render streaming buffer if new text arrived
if a.streamingText.Len() > a.lastRenderedLen {
    // render just the delta
}
```

### Task 1.4 — Add Improve Prompt Button
| File | Change | Done? |
|---|---|---|
| `terminal/internal/tui/slash.go` | Add `/improve` slash command | ☐ |
| `terminal/internal/tui/chat.go` | Add "Improve" hint in composer footer (like `ctrl+i improve`) | ☐ |
| `terminal/internal/cloud/` | Add `ImprovePrompt()` client method → calls `POST /api/improve` | ☐ |
| `terminal/internal/tui/chat.go` | `handleImprove()` — sends current composer text to improve API, replaces text with improved version, shows score toast | ☐ |

**Flow:**
1. User types a prompt in the composer
2. Presses `Ctrl+I` (or types `/improve`)
3. Terminal calls `POST /api/improve` with the prompt text
4. API returns improved prompt + score (0-100)
5. Composer text is replaced with the improved version
6. Toast shows: "Improved ✓ Score: 87/100"

### Task 1.5 — Fix Model Catalog (use API, not hardcoded)
| File | Change | Done? |
|---|---|---|
| `terminal/internal/tui/models.go:21-36` | Remove `modelCatalog` hardcoded map | ☐ |
| `terminal/internal/tui/models.go` | Use `cloud.Model` metadata from `/v1/models` (already loaded). Add context/cost from model-registry via a new API field or local fallback. | ☐ |
| `terminal/internal/tui/models.go:69-106` | Remove `isByOK()` — the gateway already returns `available: true/false` based on whether BYOK or platform key exists. Use that. | ☐ |

### Task 1.6 — General TUI Polish
| Item | Change | Done? |
|---|---|---|
| Home hints | Change "Press Ctrl+C" to "Press Ctrl+C quit" (clearer) | ☐ |
| Chat header | Add "LayerFlow" text label next to model chip (clean branding) | ☐ |
| Streaming cursor | Use `▍` (already used) — make it blink smoother (every other tick, not every tick) | ☐ |
| Error toasts | Truncate long error messages to 60 chars + "…" | ☐ |
| Scroll indicator | Show "↑ N above · ↓ N below" in dim text (already in dead conversation.go — re-implement in chat.go) | ☐ |

---

## PHASE 2 — Dashboard UI Improvements (SECOND PRIORITY)

**Goal:** Fix what's "not showing perfectly" in the web dashboard.

### Task 2.1 — Worker-Dependent Features (auto-fixed by Phase 0)
Once the worker is running (Phase 0), these should auto-fix:
- Home activity feed populates
- Costs page shows real data
- Rescue/Compare/Agents complete instead of stuck
- Memory extractions appear

**Verify each page after Phase 0 deployment. If any still shows wrong data, it's a real UI bug.**

### Task 2.2 — Dashboard Polish
| Page | Issue | Fix | Done? |
|---|---|---|---|
| Home | Greeting + date is static (server-rendered) — may feel stale | Add client-side time update | ☐ |
| Costs | Empty state when $0 — looks broken | Add friendly empty state: "No spend yet — start chatting!" | ☐ |
| Models | May show all 21 models even if no key configured | Filter to `available: true` only, with "Add key" CTA for others | ☐ |
| Chat | Model picker dropdown — verify it shows managed vs BYOK grouping like terminal | Check `components/features/chat/model-picker.tsx` | ☐ |
| Agents | Agent run progress may not poll correctly | Verify `getAgentProgress` polling interval | ☐ |
| Settings | Terminal devices list — verify it shows after `lf sync` | Check sync devices endpoint | ☐ |
| Billing | Shows "not configured" if Dodo env missing | Add plan display from `/api/billing/status` | ☐ |

### Task 2.3 — Landing Page Consistency
| Item | Check | Done? |
|---|---|---|
| Pricing section | Shows $0/$5/$14 — matches Dodo product plan | ☐ |
| Feature claims | Only claim what works in prod (no "agents" claim if worker down) | ☐ |
| Testimonials | Currently mock data — fine for now, replace with real users later | ☐ |

---

## PHASE 3 — Billing Launch (THIRD PRIORITY)

### Task 3.1 — Dodo Payments Setup
| Step | Action | Done? |
|---|---|---|
| 1 | Login to https://app.dodopayments.com | ☐ |
| 2 | Create "LayerFlow Starter" product — $5/mo recurring | ☐ |
| 3 | Create "LayerFlow Pro" product — $14/mo recurring | ☐ |
| 4 | Copy product IDs | ☐ |
| 5 | Set env on API + Worker: `DODO_PRODUCT_STARTER`, `DODO_PRODUCT_PRO`, `DODO_PAYMENTS_API_KEY`, `DODO_PAYMENTS_WEBHOOK_KEY`, `DODO_PAYMENTS_ENVIRONMENT=test` | ☐ |
| 6 | Add webhook URL: `https://api.layerflow.dev/api/billing/webhook` | ☐ |
| 7 | Test purchase with test card | ☐ |
| 8 | Verify `/api/billing/status` shows correct plan | ☐ |
| 9 | Add plan-limit enforcement middleware | ☐ |
| 10 | Flip to `DODO_PAYMENTS_ENVIRONMENT=live` | ☐ |

---

## PHASE 4 — Terminal Device Auth (FOURTH PRIORITY)

### Task 4.1 — Device Login Flow
| Step | Action | Done? |
|---|---|---|
| 1 | Add `POST /api/v1/auth/device` endpoint (creates device code in Redis, 5-min TTL) | ☐ |
| 2 | Add `POST /api/v1/auth/token` endpoint (polls for approval) | ☐ |
| 3 | Add `GET /settings/devices` page (user approves device) | ☐ |
| 4 | Update `terminal/internal/auth/auth.go` DeviceAuthURL → `https://api.layerflow.dev/api/v1` | ☐ |
| 5 | Test: `lf login` → browser opens → approve → CLI authenticated | ☐ |
| 6 | Release `lf v0.2.7` with device auth | ☐ |

---

# PART D — ENGINEERING PRIORITY ORDER

## Do NOT do everything at once. Follow this order:

```
PHASE 0 (hosting)     ← Tomorrow. Unblocks everything.
    ↓
PHASE 1 (terminal UI) ← Next 2 days. User's #1 ask.
    ↓
PHASE 2 (dashboard)   ← Day 3-4. Verify + polish.
    ↓
PHASE 3 (billing)     ← Day 5. Turn on revenue.
    ↓
PHASE 4 (device auth) ← Day 6-7. Pro terminal experience.
```

## P0 — Must do before anything else
1. Deploy API + Worker to VPS (Phase 0)
2. Verify rescue/compare/agents/memory/costs all work

## P1 — Do immediately after P0
3. Terminal brand cleanup (Phase 1.1)
4. Delete dead conversation.go (Phase 1.2)
5. Fix streaming performance (Phase 1.3)
6. Add improve prompt button (Phase 1.4)
7. Fix model catalog (Phase 1.5)
8. Dodo billing setup (Phase 3.1)

## P2 — Do after P1 is stable
9. Dashboard polish (Phase 2.2)
10. Device auth (Phase 4.1)
11. DeepSeek platform key
12. Plan-limit enforcement middleware

## P3 — Future
13. Semantic search ranking tuning
14. E2E test suite (Playwright)
15. Windows terminal real-machine testing
16. Files-in-chat integration
17. Community features polish

---

# PART E — FILES TO TOUCH (quick reference)

## Terminal UI changes (Phase 1)
| File | Action |
|---|---|
| `terminal/internal/tui/brand.go` | REWRITE — clean text wordmark |
| `terminal/internal/tui/conversation.go` | DELETE — dead code |
| `terminal/internal/tui/chat.go` | EDIT — cache renders, add improve, add scroll indicator |
| `terminal/internal/tui/models.go` | EDIT — remove hardcoded catalog, use API data |
| `terminal/internal/tui/slash.go` | EDIT — add `/improve` command |
| `terminal/internal/cloud/` | ADD — `ImprovePrompt()` client method |

## Backend changes (Phase 0 + 3 + 4)
| File | Action |
|---|---|
| `docker-compose.yml` or new `Dockerfile.deploy` | ADD/EDIT — VPS deployment |
| `apps/api/src/routes/billing/billing.ts` | VERIFY — after Dodo setup |
| `apps/api/src/services/billing/dodo.ts` | VERIFY — product IDs |
| New: `apps/api/src/routes/auth/device.ts` | ADD — device flow endpoints |
| `apps/api/src/middleware/plan-limits.ts` | ADD — subscription enforcement |

## Dashboard changes (Phase 2)
| File | Action |
|---|---|
| `app/(dashboard)/costs/page.tsx` | EDIT — empty state |
| `app/(dashboard)/models/page.tsx` | EDIT — filter to available |
| `app/(dashboard)/agents/` | VERIFY — progress polling |
| `app/(dashboard)/billing/` | VERIFY — plan display |

---

*This file is the work plan. 00-START-HERE.md is the overview. 01/02/03 are the deep-dive references. Start with Phase 0 tomorrow.*
