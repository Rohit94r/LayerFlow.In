# LayerFlow — Features & Working Status

> Founder-facing inventory. Last checked: **24 Jul 2026** against repo code + `docs/backend-status.md`, `docs/backend-runbook.md`, `docs/deployment.md`, `docs/features.md`, `docs/getting-started.md`.  
> **Do not treat** `docs/completedfeatauresandbackend.md` as current — it describes the old mock-only UI phase.  
> **Status legend:** **Working** = code + local Neon/Upstash path works end-to-end · **Partial** = shipped but incomplete UX or degraded quality · **Needs setup** = built, blocked on keys / worker / email / deploy config.

---

## 1. Product in one paragraph

**LayerFlow is an AI workspace** (not a gateway-first infra product): save and organize prompts in domains → projects → folders, keep a Git-like timeline, group work in sessions, get model recommendations with explanations, enforce **hard budgets**, compare models, and only then call providers via a BYOK OpenAI-compatible gateway. The differentiator is **cost control + prompt organization** for developers and power users — not LangSmith-style evals or enterprise compliance.

---

## 2. Working now

Assumes local stack: Neon (or Docker Postgres) + Upstash/Redis + `npm run dev` (web + API). Platform Groq/Gemini fallback keys optional; most LLM calls still need **BYOK** (see §3).

| Feature | What it does | How user uses it | Status |
|---------|--------------|------------------|--------|
| **Google sign-in + onboarding** | Better Auth Google OAuth; first login creates workspace, 9 domains, default budget/settings | `/sign-in` → Continue with Google | **Working** (local); prod uses same-origin auth on `layerflow.dev` |
| **Workspace dashboard** | Today’s activity, domains, budget snapshot, savings banner, recent prompts/sessions | `/workspace` | **Working** |
| **Domains / projects / folders** | Hierarchy for organizing prompts | `/projects`, project detail; create project from UI | **Working** |
| **Prompt library + CRUD** | List, create, open prompts; filters/favorites | `/prompts` → New prompt / open detail | **Working** |
| **Prompt editor + immutable Timeline** | Save creates new version; restore (rollback), replay (re-run), client JSON export | `/prompts/[id]` → Save / Timeline actions | **Working** |
| **Prompt sessions** | Named conversation groups; create session; append messages; run linked prompts into thread | `/sessions`, `/sessions/[id]` composer + run | **Working** |
| **Keyword / API search** | Search prompts via API (FTS path) | Search on `/prompts` | **Working** (semantic quality lower without OpenAI embeddings — see §3) |
| **Model intelligence (analyze / recommend / route)** | Category/complexity heuristics + cost estimates + WHY recommendations; workspace Manual / Suggest / Auto modes | Panel on prompt editor; modes on `/settings` + `/optimizer` | **Working** |
| **Routing rules CRUD** | IF condition → prefer model; toggle / add / delete | `/settings` (also surfaced on optimizer) | **Working** |
| **Hard budgets + Redis reserve** | Monthly/daily limits; 402 before provider call; usage ledger | `/budget` set limits; enforced on run/gateway | **Working** (needs Redis) |
| **Budget scopes (project / API key)** | Per-project and per-key hard caps | `/budget` scope editors | **Working** |
| **Cost optimizer + savings insight** | Actual vs Auto Mode estimate; prefer-cheap / execution mode | `/optimizer`, banner on workspace/budget | **Working** (insight may be illustrative if no persisted insight rows) |
| **Token saver + run savings telemetry** | Compress/truncate history, short-answer caps; per-run tokens/$ saved; UI `SavingsLine` | Toggle **Token saver** on `/optimizer`; see savings on runs/compare cards | **Working** |
| **Gateway keys + snippets** | Mint `lf_…` keys; show OpenAI-compatible base URL + TS/Python/cURL | `/gateway` + key create in `/settings` | **Working** (calling models still needs keys — §3) |
| **BYOK provider keys UI** | Add/delete encrypted provider keys (AES-256-GCM) | `/settings` → Provider keys | **Working** |
| **Settings** | Profile-ish prefs, default model, execution mode, prefer cheap, keys | `/settings` | **Working** |
| **Theme** | Light/dark via `lf-theme` | Theme toggle site-wide | **Working** |
| **Marketing site** | Landing, pricing, about, docs marketing page | `/`, `/pricing`, `/about`, `/docs` | **Working** (static) |
| **Blog** | ~40 SEO posts, filters, post pages; **day-by-day auto-publish** via `publishedAt` schedule | `/blog`, `/blog/[slug]` | **Working** — only posts with `publishedAt` ≤ today are listed/sitemap’d; future slugs 404 until live (see [blog-publish-schedule.md](blog-publish-schedule.md)) |
| **Admin analytics** | Allowlisted emails: user counts, signups, recent logins | `/admin` (sidebar when admin) | **Working** (server-enforced allowlist) |
| **Same-origin API on Vercel** | Next mounts Hono under `/api/*` and `/v1/*` so prod works without `api.layerflow.dev` DNS | Automatic on `layerflow.dev` | **Working** for HTTP API paths that don’t need a long-lived worker |

---

## 3. Built but needs keys / worker / deploy

| Feature | What it does | How user uses it | Status |
|---------|--------------|------------------|--------|
| **Real model runs + streaming** | Provider adapters (OpenAI, Anthropic, Google, DeepSeek, Groq, xAI, OpenRouter); SSE/stream; budget settle | Prompt **Run**; gateway `stream: true` | **Needs setup** — BYOK and/or platform `GROQ_API_KEY` / `GEMINI_API_KEY`; Anthropic/OpenAI typically BYOK-only |
| **Multi-model Compare** | Background job fans out models; ranks Best / Cheapest / Fastest | `/compare` | **Needs setup** — **BullMQ worker must be running** (`npm run worker` / Fly worker); plus provider keys |
| **Weekly digest + 80%/100% budget emails** | Resend-backed alerts + Monday digest; DB dedupe | Automatic when thresholds hit | **Needs setup** — `RESEND_API_KEY` + `FROM_EMAIL` |
| **Gateway live `/v1/chat/completions`** | OpenAI-compatible proxy, exact-match cache, budget check, logging | SDK/curl with `lf_…` + BYOK/platform | **Needs setup** — LayerFlow key + provider credentials; on dedicated Fly host also needs DNS (below) |
| **Exact response cache** | Identical requests served from Redis cache (`x-layerflow-cache: hit`) | Transparent on gateway/runs | **Needs setup** — Redis + traffic that hits cacheable paths |
| **Semantic / memory search quality** | pgvector memories + embeddings | API exists; prompts search uses embeddings path when configured | **Partial / Needs setup** — without `OPENAI_API_KEY`, local hash embeddings (lower quality); **no dedicated Memory UI** |
| **File attachments** | Upload metadata + local disk or R2 presigned URLs | API `/api/files/*` | **Needs setup** for R2; local disk works without R2; **no full attachment UX** in workspace |
| **ElevenLabs TTS** | `POST /api/audio/speech` | API client | **Needs setup** — ElevenLabs env; 503 if unset |
| **Dedicated Fly API (`api.layerflow.dev`)** | Long-lived API + worker machines (compare, digests, streaming at scale) | Production backend host | **Needs deploy** — **`api.layerflow.dev` DNS not resolving yet** per deployment runbook; Vercel same-origin is the interim path |
| **Sentry / observability** | Error reporting, health endpoints | Automatic when DSN set | **Needs setup** (optional) |
| **Google token streaming** | Native Gemini path falls back to progressive chunking of completed output | Run Gemini models | **Partial** — other providers stream real tokens |

---

## 4. Not built / stub

| Item | Notes |
|------|--------|
| **Stripe billing / checkout** | Env placeholders only; pricing page has no checkout |
| **First-party TS/Python SDK packages** | Gateway snippets only; no `packages/sdk-*` in repo |
| **Learning Academy UI** | Backend routes/seed exist; **no app screens** (Phase 2 in `features.md`) |
| **Community / collections / social UI** | API routes exist; **no frontend** (Phase 3) |
| **AI Memory dedicated UI** | Memories API + search backend; no Memory product surface |
| **Prompt variables create/edit UI** | Types + API exist; editor does not persist new `{{vars}}` on create |
| **Gateway request-log UI** | Logs may be stored server-side; no dedicated log viewer on `/gateway` |
| **Teams / SSO / RBAC / SOC2 / HIPAA** | Explicitly out of MVP |
| **Browser extension, Marketplace, Notebook, Prompt Score** | Deferred per `features.md` |
| **OpenTelemetry / full eval CI** | Not in MVP |

---

## 5. Recent additions

| Addition | What’s there | Status |
|----------|--------------|--------|
| **Token savings** | Migration `0003_token_savings`; `workspace_settings.token_saver`; compress/prepare/estimate services; savings JSON on runs; Optimizer toggle; `SavingsLine` in UI | **Working** (local) when settings enabled |
| **Persistent sessions** | Create sessions; session detail loads messages from API; composer calls `appendSessionMessage`; can run prompt → append assistant output | **Working** |
| **Same-origin API on Vercel** | `app/api/[[...route]]`, `app/v1/[[...route]]`, auth on web origin; `getApiBaseUrl()` forces same-origin on `layerflow.dev` so missing Fly DNS doesn’t blank the app | **Working** for request/response API; **not a substitute for the Fly worker** |
| **Blog** | Static corpus (~40 posts) under `content/blog`, `/blog` + slug pages, SEO metadata; schedule overlay in `publish-schedule.ts` | **Working** (published-only filter + hourly revalidate) |
| **Admin analytics** | `/admin` + `GET /api/admin/analytics` (Hono + Next proxy); email allowlist | **Working** for admins |

---

## 6. Honest gaps for customer demos

Use this checklist before a live demo or customer walkthrough:

1. **Run the worker** before showing Compare — without it, jobs queue forever and the UI times out. Production Compare also needs a **deployed Fly worker**, not just Vercel.
2. **Add BYOK (or show Groq/Gemini with platform keys)** before promising “run any model.” OpenAI/Anthropic without BYOK will fail clearly but look broken in a demo.
3. **Don’t demo `api.layerflow.dev` yet** — DNS/deploy for the dedicated API host is still outstanding. Demo local or `https://layerflow.dev` same-origin API instead.
4. **Email digests/alerts** won’t send until Resend + `FROM_EMAIL` are configured — don’t promise inbox alerts in the room.
5. **Payments** — pricing is informational; no Stripe checkout.
6. **Learning / Community / Memory product screens** — backend scaffolding ≠ customer-facing features; don’t pitch them as live product.
7. **Prompt variables & attachments** — talk “coming soon,” not “try it now.”
8. **SDK drop-in** — use OpenAI SDK against `/v1` with a LayerFlow key; there is no published `@layerflow/sdk` package yet.
9. **Rotate secrets** before any customer-facing prod traffic if they were ever exposed (deployment runbook §0).
10. **`docs/completedfeatauresandbackend.md` is stale** — it still says mock-only UI; trust this file + `backend-status.md` instead.

### Quick demo path that works today (local)

```text
Sign in → Projects → Prompt → Save (Timeline) → Settings BYOK → Run
→ Budget meter → Optimizer / Token saver → Sessions continue
→ (Worker on) Compare → Gateway mint key → curl /v1
```

---

## Related docs

| Doc | Use |
|-----|-----|
| [features.md](features.md) | MVP product scope & success criteria |
| [backend-status.md](backend-status.md) | Engineering “what’s built” (some UI gaps there are already fixed — prefer this status file for founder demos) |
| [backend-runbook.md](backend-runbook.md) | Local Neon + Upstash verification |
| [getting-started.md](getting-started.md) | End-user walkthrough |
| [sdk.md](sdk.md) | Official SDK planned (not published); HTTP / OpenAI client today |
| [blog-publish-schedule.md](blog-publish-schedule.md) | Day-by-day SEO blog calendar + auto-publish rules |
| [deployment.md](deployment.md) | Vercel + Fly go-live (incl. DNS gap) |
