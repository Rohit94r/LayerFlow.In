# Getting Started with LayerFlow

A step-by-step, no-jargon walkthrough of using LayerFlow **from the app** —
sign in, create your first prompt, run it against a model, compare models,
set a budget, and mint a gateway key. It ends with the checklist for taking
this to production.

> New to the codebase or want to run it yourself? See `docs/database.md`
> (Neon migrate + commands), `apps/api/README.md` (backend), 
> `docs/backend-status.md` (what's built), and `docs/deployment.md` (go-live).
> This page is about **using the product**.

---

## 0. Before you start (local run)

You need Postgres (Neon or Docker), Redis, the API, and the web app. From the
repo root — full detail in `docs/database.md`:

```bash
# 1. dependencies
npm install

# 2. env
cp apps/api/.env.example apps/api/.env   # set DATABASE_URL (Neon or docker)
cp .env.example .env.local               # NEXT_PUBLIC_API_URL=http://localhost:8787

# Optional local infra instead of Neon/Upstash:
# docker compose up -d

# 3. tables (forward-only; safe to re-run)
npm run db:migrate --workspace @layerflow/api

# 4. full stack (web + API). Worker optional — needed for Compare.
npm run dev                              # web :3000 + API :8787
npm run worker --workspace @layerflow/api   # separate terminal
```

> ⚠️ **Do not run `db:seed` against Neon production.** Seed is local/demo only
> (`alex@layerflow.dev` sample data). Real users get a workspace on first Google
> sign-in. See `docs/database.md`.

> ⚠️ **The worker is required for Compare.** If `npm run worker` isn't running,
> compare jobs never finish and the UI will spin.

---

## 1. Sign in

1. Open `http://localhost:3000` and click **Sign in** (or go to `/sign-in`).
2. Choose **Continue with Google**. You'll bounce to Google and back.
3. On your **first** login, LayerFlow automatically creates your workspace,
   nine starter domains (Coding, Marketing, …), default settings, and a budget.

Any page under the app (`/workspace`, `/projects`, `/prompts`, …) is protected
— if you're not signed in you're sent to `/sign-in?next=…` and returned after.

---

## 2. Create a project and a prompt

1. Go to **Projects** (`/projects`) → **New project**. Pick a domain, give it a
   name. Projects are folders for related prompts.
2. Go to **Prompts** (`/prompts`) → **New prompt** inside that project.
3. Write your prompt text in the editor. **Save** creates an immutable
   *version* — every save is kept, so you can compare and restore later from the
   **Timeline** on the prompt's detail page.

---

## 3. Add a model key (so runs actually call a model)

LayerFlow calls real providers. You have two ways to give it credentials:

- **BYOK (bring your own key)** — recommended. Go to **Gateway** (`/gateway`)
  → **Provider keys** → add a key for a provider (e.g. OpenAI, Anthropic,
  Google, Groq, xAI, DeepSeek, OpenRouter). Keys are encrypted at rest
  (AES-256-GCM) and never leave the server in plaintext.
- **Platform fallback (no key needed from you)** — if the operator set
  `GROQ_API_KEY` and/or `GEMINI_API_KEY` on the server, those act as a shared
  fallback for their provider's models. BYOK always takes priority when present.

If no BYOK key and no platform fallback exist for a model, a run against that
model returns a clear "no key" error rather than charging you.

---

## 4. Run a prompt

1. On a prompt's page, pick a model and click **Run**.
2. LayerFlow **reserves** the estimated cost against your budget *before*
   calling the provider (see §6), streams the tokens back, then records a **run**
   with real tokens, cost (in micro-dollars), and latency.
3. Runs appear in history so you can eyeball quality, speed, and price.

Tip: `/optimizer` will *recommend* a model for a prompt (analyze → recommend →
route) based on your workspace routing mode (manual / suggest / auto).

---

## 5. Compare models side by side

1. Go to **Compare** (`/compare`), paste or pick a prompt, and select several
   models.
2. Submit — this enqueues a background job (needs the worker, §0). The page
   polls until every model returns.
3. You get a ranked table: output, tokens, cost, and latency per model, so you
   can choose the cheapest model that's still good enough.

---

## 6. Set a budget (and understand hard blocking)

1. Go to **Budget** (`/budget`). Set a **monthly** (and optional **daily**)
   limit and an alert threshold (default 80%).
2. Every paid call — playground runs, compare, and the gateway — first
   **reserves** its estimated max cost across all applicable scopes (workspace
   monthly/daily, project, API key). If a hard limit would be exceeded you get
   **`402 budget_exceeded`** and *the provider is never called*.
3. On success the reservation **settles** to the real cost and writes an
   immutable `usage_ledger` row; on failure it's **released**.
4. Owners get an email at the warning threshold and again at 100% (if email is
   configured), plus a weekly usage digest.

Money is always integer **micro-dollars** ($1 = 1,000,000) — no floats, no
rounding surprises.

---

## 7. Mint a gateway key and call the API like OpenAI

Use LayerFlow as a drop-in, budget-enforced, cached OpenAI-compatible gateway.

1. Go to **Gateway** (`/gateway`) → **API keys** → **Create key**. The secret
   (`lf_…`) is shown **once** — copy it now.
2. Point any OpenAI SDK at LayerFlow:

```bash
curl -X POST http://localhost:8787/v1/chat/completions \
  -H "Authorization: Bearer lf_...your-secret..." \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"Say hi"}]}'
```

Or in code: set `baseURL` to `http://localhost:8787/v1` and `apiKey` to your
`lf_…` secret. Identical requests are served from the exact-match cache
(`x-layerflow-cache: hit`) for free, and every call is budget-checked and
logged to your usage.

---

## 8. Ready for production?

Local everything above works today. To serve real customers, follow
`docs/deployment.md` in order. The short checklist:

1. **Rotate every secret** that was ever pasted anywhere (release gate — see
   deployment §0).
2. Frontend is already on **Vercel** at `layerflow.dev`; set
   `NEXT_PUBLIC_API_URL=https://api.layerflow.dev` there.
3. Deploy the API + worker to **Fly.io** (`fly deploy` — runs migrations first).
4. Add DNS for **`api.layerflow.dev`** → Fly, then `fly certs add`.
5. Register the production Google OAuth origins + callback.
6. Verify: `curl https://api.layerflow.dev/health` → `{"status":"ok",…}`.

Payments/Stripe are intentionally **not** wired yet — the pricing page ships
without checkout.
