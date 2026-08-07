# LayerFlow — Development Flow Map (Intern Onboarding Guide)

> **यह फ़ाइल क्या है?** — यह पूरे repo का "रोड मैप" है। नया intern (full-stack developer)
> इसी फ़ाइल को पढ़कर समझेगा: कौन-सा काम किस file में लिखा है, क्यों लिखा है, और
> एक request कैसे browser से Postgres तक जाती है। कोई भी file बनाने/बदलने से पहले
> पहले इस map को देखो — अगर तुम्हें नहीं पता कि code कहाँ रखना है, तो इस फ़ाइल में
> जवाब है।

---

## 1. Repository overview — repo में क्या-क्या है?

LayerFlow एक **npm workspaces monorepo** है (एक repo, कई packages):

```
layerflow/
├── app/                    ← Next.js 16 web app (browser surface)
├── apps/
│   ├── api/                ← Hono backend + BullMQ worker (सारा data logic यहीं)
│   └── cli/                ← lf terminal agent (भविष्य में; अभी browser पहले)
├── components/             ← web के React components
├── lib/                    ← web का non-component code (services, api client, …)
├── packages/
│   ├── contracts/          ← Zod schemas — web, api और worker सब यहीं से import करते हैं
│   └── model-registry/     ← AI model catalogue + pricing (कौन-सा model कितने $ में)
├── plan.md                 ← चरण-दर-चरण build plan (Phases 1–6)
└── flow.md                 ← यह फ़ाइल
```

> 💡 **हिंदी में समझें:** `packages/contracts` सबसे ज़रूरी package है। जो भी data
> API और web के बीच जाता है, उसका "shape" (schema) सिर्फ यहीं एक बार define होता है।
> Frontend और backend दोनों उसी schema को import करते हैं — इसलिए कभी mismatch नहीं होती।
> अगर कोई नया API endpoint बनाना है, तो सबसे पहले यहीं उसका zod schema बनाओ।

---

## 2. Tech stack — कौन-सी technology कहाँ?

| Layer | चुना हुआ tool | क्यों |
|---|---|---|
| Web | **Next.js 16** (App Router, server-first) | SEO + server components + easy API routing |
| Styling | **Tailwind CSS v4** | utility-first, design tokens `app/globals.css` में |
| Icons | **Hugeicons** (`components/ui/icons.tsx` shim) | सभी icons एक जगह से |
| Auth | **better-auth** (cookie sessions) | पासवर्ड hash `accounts` table में रहता है |
| Backend HTTP | **Hono** (`@hono/node-server`) | हल्का, fast, TypeScript-first |
| DB | **PostgreSQL** + **Drizzle ORM** | type-safe SQL, migrations auto |
| Queue | **BullMQ** on **Redis** | लंबे काम (AI calls) request में नहीं, background job में |
| Validation | **zod** (`@layerflow/contracts`) | एक ही source of truth |
| Logs | **pino** · Errors | **Sentry** |
| Tests | **vitest** (web + api, pglite integration) | |

> 💡 **हिंदी में समझें — "Server-first" का मतलब:** हर page पहले server पर render
> होती है। Server Component अपने data को `await` करके लाता है, फिर HTML भेजता है।
> जहाँ interactive चीज़ें चाहिए (click, form), वहाँ छोटे `-client.tsx` components होते हैं।
> यह pattern पूरे dashboard में है — नया page बनाते समय यही pattern follow करो।

---

## 3. How to run — project चलाना

```bash
npm install                 # पहली बार: सारे packages install करो
npm run dev                 # एक साथ: web (:3000) + api (:8787) + worker

npm run dev:web             # सिर्फ web
npm run dev:api             # सिर्फ Hono API
npm run dev:worker          # सिर्फ BullMQ worker (jobs process करता है)

# checks (code push करने से पहले हमेशा):
npm run typecheck           # TypeScript errors
npm run lint                # eslint
npm test                    # web unit tests (9)
npm --workspace @layerflow/api run test   # API integration tests (105)
```

**Local prerequisites:** Postgres 17 + Redis Homebrew से चल रहे हों; `apps/api/.env`
में DB/Redis keys हों। Dev user: `alex@layerflow.dev` / `layerflow123`।

---

## 4. Frontend structure — web की file कहाँ रखते हैं?

```
app/                      ← URLs ही फोल्डर हैं (App Router)
├── (marketing)/          ← public site (landing, pricing, blog, docs)
├── (auth)/sign-in/       ← login page
├── (dashboard)/          ← protected product UI
│   ├── home/             ← "Today's Workspace" hub
│   ├── workspace/        ← projects list + detail
│   ├── rescue/           ← paste chat → rescue report (CORE feature)
│   ├── prompts/ passports/ costs/ models/ keys/ history/ settings/ …
├── api/
│   ├── [[...route]]/     ← workspace API माउंट (embedded Hono)
│   ├── auth/[...all]/    ← better-auth handler
│   └── lf-health/        ← liveness check
└── v1/[[...route]]/      ← OpenAI-compatible gateway (CLI के लिए)

components/
├── ui/                   ← primitives (button, badge, panel, modal, …) — कोई business logic नहीं
├── shared/               ← composition (page-header, stat, row, …)
├── features/<domain>/    ← page-specific UI (rescue/, workspace/, prompts/, …)
├── landing/              ← marketing page sections
└── layout/               ← sidebar, topbar, command menu

lib/                      ← कोई React component नहीं — सिर्फ logic
├── services/             ← ★ हर page का data यहाँ से आता है (workspace, passports, models, …)
│                          रियल API calls; DTO → UI types mapping यहीं होती है
├── api/                  ← apiFetch() helper + getServerCookieHeader() + money utils
├── server/hono-app.ts    ← embedded Hono app (web के /api/* पर चलता है)
├── data/                 ← static reference data (models pricing, marketing content)
└── types.ts              ← frontend domain types (UI के हिसाब से)
```

> 💡 **हिंदी में समझें — लेयरिंग का नियम:** `ui/` को पता नहीं होता data कहाँ से
> आता है। `features/` सिर्फ UI जोड़ता है। Data तो `lib/services/*.ts` लाता है।
> नया feature बनाना हो → (1) `packages/contracts` में schema, (2) `lib/services/`
> में service function, (3) `app/(dashboard)/<name>/page.tsx` + `components/features/<name>/`।
> कभी भी page के अंदर सीधे `fetch()` मत लिखो — हमेशा service से लो।

---

## 5. Backend structure — `apps/api` (सबसे ज़रूरी section)

```
apps/api/src/
├── index.ts            ← API entry: Sentry init → serve(createApp()) on :8787
├── worker.ts           ← BullMQ worker entry: सारे jobs यहाँ register होते हैं
├── app.ts              ← Hono app: middleware + routes माउंट + error handling
│
├── config/             ← env.ts (fail-fast), logger.ts (pino), admin.ts
├── auth/               ← better-auth config (Drizzle adapter)
├── db/
│   ├── client.ts       ← drizzle client
│   ├── seed.ts         ← demo user + data
│   └── schema/         ← ★ एक domain = एक file (workspace, sessions, runs, rescue, gateway, …)
├── redis/client.ts     ← shared Redis (BullMQ + budget counters)
├── middleware/         ← auth (session), api-key-auth, rate-limit, request-id, app-error, admin
│
├── routes/             ← ★ HTTP layer: सिर्फ request handle + response map
│   ├── index.ts        ← यहीं सारे routers माउंट होते हैं (/api/...)
│   └── <feature>/      ← rescue/, runs/, sessions/, workspace/, keys/, intelligence/, …
│
├── services/           ← ★★ BUSINESS LOGIC (सबसे बड़ी layer)
│   ├── ai/
│   │   ├── providers/  ← AI provider adapters (openai, anthropic, google, deepseek, …)
│   │   │                 + keys.ts (BYOK keys पढ़ना) + sse.ts (streaming)
│   │   ├── prompt_engine/  ← (growth skeleton — भविष्य के prompt work)
│   │   ├── cost/ embeddings/ evaluation/ memory/ routing/   ← (growth skeleton)
│   ├── intelligence/   ← analyze (prompt scoring), recommend (model suggestion), route
│   ├── runs/           ← execute.ts (AI run engine — हर model call यहीं से), dto, budget-hook
│   ├── rescue/         ← report.ts (rescue_reports CRUD + enqueue)
│   ├── budgets/        ← enforce.ts (Redis Lua token budget), rollup, usage, scopes
│   ├── search/         ← embeddings.ts, keyword.ts, similar.ts (hybrid search)
│   ├── keys/           ← api-keys (lf_…) + provider-keys (BYOK, KEK-encrypted)
│   ├── workspace/      ← projects, domains, activity
│   ├── savings/        ← compress, estimate, prepare (token saver)
│   ├── memory/ learning/ community/ email/ files/ audio/ compare/ admin/
│   └── crypto.ts       ← KEK encrypt/decrypt (provider keys vault)
│
├── jobs/               ← ★★ QUEUE LAYER: लंबे काम हमेशा यहीं
│   ├── queues.ts       ← JobName enum + queue definitions
│   └── processors/     ← rescue.ts, embed.ts, compare.ts, budget-alerts.ts, usage-rollup.ts, …
├── gateway/router.ts   ← v1 OpenAI-compatible gateway (CLI surface)
├── observability/      ← sentry
├── cache/              ← exact-match cache helper
├── test/               ← integration tests (vitest + pglite)
└── types.ts            ← AppEnv (request context: workspaceId, userId)
```

> 💡 **हिंदी में समझें — सबसे ज़रूरी नियम (3-लेयर rule):**
> ```
> routes/  →  सिर्फ HTTP (request आई, body parse, response भेजा)
> services/ → असली काम (DB queries, calculations, AI calls)
> db/schema/ → table definitions
> ```
> **Route कभी सीधे DB touch नहीं करता। Service ही DB से बात करती है।**
> इसलिए अगर कल API के अलावा कोई और surface (CLI) भी data चाहे, तो वही service
> reuse हो सकती है। यही structure growth का foundation है — नया feature = नया
> folder, हर folder में routes/ + services/ + schema/ की तिकड़ी।

---

## 6. THE REQUEST FLOW — एक request कैसे पूरी यात्रा करती है?

### 6.1 Browser → API (same-origin)

```
Browser (localhost:3000)
   │  session cookie (better-auth)
   ▼
Next.js page (server component)  →  lib/services/passports.ts
   │  await passportService.listRescueReports()
   ▼
lib/api/client.ts  →  apiFetch("/api/rescue?limit=30")
   │  cookie header साथ भेजा (getServerCookieHeader)
   ▼
app/api/[[...route]]/route.ts  →  lib/server/hono-app.ts  (embedded Hono)
   │  ← same-origin: कोई CORS नहीं, cookie अपने-आप
   ▼
apps/api: routes/rescue/rescue.ts  →  services/rescue/report.ts  →  drizzle → Postgres
   │  response DTO → JSON (contracts schema से validate)
   ▼
Browser render
```

> 💡 **हिंदी में समझें — same-origin architecture:** web के `/api/*` पर असली Hono
> app ही चलता है (Next के अंदर mount)। इसलिए cookie उसी domain पर है — कोई CORS
> problem नहीं, auth आसान। अलग से `:8787` पर भी API चलती है — वो CLI/tests के लिए।
> `lib/api/client.ts` में `getApiBaseUrl()` ही decide करता है कौन-सा base use करना है
> (browser में `window.location.origin`, server पर `localhost:3000`/`WEB_URL`)।

### 6.2 The Rescue Pipeline (CORE feature — पूरी depth में)

```
app/(dashboard)/rescue/page.tsx        ← user chat paste करता है
   │  passportService.createRescue({ content, sourceTool })
   ▼
POST /api/rescue  (routes/rescue/rescue.ts)
   │  1. prompt_sessions table में row (passport भी बनेगा)
   │  2. rescue_reports में row: status="queued"
   │  3. jobs/queues.ts → enqueue("rescue", …)
   ▼  ← 202 Accepted तुरंत return (request block नहीं होती)
BullMQ worker (worker.ts) → jobs/processors/rescue.ts
   │  processRescue():
   │    1. executeRun() → AI call (gpt-4o-mini default)
   │    2. JSON parse (RESCUE_SYSTEM_PROMPT का output)
   │       → passport, improvedPrompt, summary, diff, continuePack
   │    3. costs: 6 candidate models पर estimate (model-registry pricing)
   │    4. status="completed" + activity "rescue.completed"
   │    FAIL होने पर: status="failed" + errorMessage (जैसे "No openai API key…")
   ▼
Frontend polling (हर 2.5s)  →  GET /api/rescue/:id  →  ReportView render
```

> 💡 **हिंदी में समझें — queue क्यों?** AI call में 5–30 सेकंड लगते हैं। अगर request
> के अंदर करते तो browser 30 सेकंड तक घूमता रहता। इसलिए **job** pattern: request
> तुरंत 202 return कर देती है, worker background में काम करता है, frontend status
> poll करता है। यही pattern हर heavy काम के लिए है (embed, compare, digest)।

### 6.3 Auth flow

```
/ sign-in → better-auth handler (app/api/auth/[...all]/route.ts)
   │  email+password → accounts table (providerId="credential" वाली row)
   │  ← याद रखो: password hash users में नहीं, accounts में रहता है!
   ▼
cookie (session) → browser
   ▼
हर protected route: middleware/auth.ts (requireAuth)
   │  session validate → c.set("workspaceId"), c.set("userId")
   ▼
service layer को workspaceId मिलती है → उसी workspace का data ही मिलता है
   (multitenancy: हर query पर workspaceId filter)
```

> 💡 **हिंदी में समझें:** web और API एक ही origin पर हैं, इसलिए cookie
> automatically हर request में जाती है। RSC (server components) में
> `getServerCookieHeader()` cookie को API call में forward करता है।

### 6.4 Cost / ledger flow

```
हर AI run (services/runs/execute.ts):
   tokens count → computeCostMicro(modelId, inputTokens, outputTokens)
   → runs table में costMicro + tokens save
   → savings engine (services/savings/) compress/estimate
   → budgets (services/budgets/) Redis Lua counter से daily/monthly spend check
Dashboard costs page: /api/usage + /api/savings + /api/budgets (सब real)
```

---

## 7. Data flow — "mock → real" story (अब सब real है)

पहले web mock data पर चलती थी। अब सारे core services रियल API से जुड़े हैं:

| `lib/services/` | Backend route | Status |
|---|---|---|
| `workspace.ts` | `/api/workspace`, `/api/projects`, `/api/domains`, `/api/activity`, `/api/usage`, `/api/memory` | ✅ real |
| `passports.ts` | `/api/sessions`, `/api/rescue` | ✅ real |
| `prompts.ts` | `/api/prompts` | ✅ real |
| `models.ts` | `/api/provider-keys`, `/api/intelligence/recommend` | ✅ real |
| `search.ts` | `/api/search` (hybrid vector+keyword) | ✅ real |

> 💡 **हिंदी में समझें — service का pattern:** हर service function async है,
> `@layerflow/contracts` का response schema देकर `apiFetch` call करता है, और DTO को
> `lib/types.ts` के UI shape में map करता है। Page को पता ही नहीं चलता data कहाँ से
> आया — इसीलिए signatures कभी change नहीं होते।

---

## 8. Jobs / Queue — कौन-सा job क्या करता है?

| Job | Processor file | काम |
|---|---|---|
| `rescue` | `jobs/processors/rescue.ts` | chat paste → report (AI call) |
| `embed` | `jobs/processors/embed.ts` | text → vector embeddings (search के लिए) |
| `compare` | `jobs/processors/compare.ts` | models की side-by-side comparison |
| `usage-rollup` | `jobs/processors/usage-rollup.ts` | दैनिक usage stats (repeatable) |
| `budget-alerts` | `jobs/processors/budget-alerts.ts` | budget limit पार → email (repeatable) |
| `weekly-digest` | `jobs/processors/weekly-digest.ts` | weekly summary email (repeatable) |

नया job बनाना = `queues.ts` में JobName + `processors/<name>.ts` + `processors/index.ts`
में register — बस।

---

## 9. Naming & conventions — style rules

1. **Folders/files:** kebab-case (`provider-keys.ts`). Components: PascalCase exports.
2. Client components का suffix `-client` (`workspace-client.tsx`).
3. **Layering:** `ui/` → `shared/` → `features/` → `app/`। `lib/` कभी components से import नहीं करता।
4. **Contracts first:** कोई data shape बदले तो पहले `packages/contracts` में schema बदलो।
5. **Jobs only:** AI calls कभी request में नहीं — हमेशा BullMQ job में।
6. **Tests:** नई service/API → नया `*.test.ts` उसी folder में।
7. **No dead code:** unused file/mock हटाओ, `console.log`/`@ts-ignore` commit मत करो।
8. **Checks before push:** `npm run typecheck && npm run lint && npm test` (+ API tests)।

---

## 10. आम सवाल (Quick FAQ)

**Q: नया API endpoint कैसे बनाऊँ?**
A: (1) `packages/contracts/src/<domain>.ts` में zod schema → (2) `apps/api/src/services/<domain>/` में service → (3) `apps/api/src/routes/<domain>/` में router → (4) `routes/index.ts` में mount → (5) `lib/services/` में frontend call → (6) page में use करो।

**Q: नई DB table कैसे बनाऊँ?**
A: `apps/api/src/db/schema/<domain>.ts` में define → `db/schema/index.ts` में export → `npm --workspace @layerflow/api run db:generate` → migration SQL check करके `db:migrate`। (जनरेटेड SQL में कभी-कभी redundant ALTER आते हैं — पहले पढ़ो, फिर apply करो!)

**Q: मेरी चेंज से rescue fail क्यों हो रहा?**
A: Worker log देखो: `tail -f /tmp/lf-worker.log`। सबसे common कारण: provider key नहीं है (Models → Add key), या contract schema का shape mismatch (DTO को `{report}` wrap करना याद रखो)।

**Q: API बदला लेकिन web पुराना data दे रहा?**
A: Web का Hono `lib/server/hono-app.ts` mount करता है — दोनों एक ही source हैं। Dev में web + api + worker तीनों चलने चाहिए (`npm run dev`)।

---

## 11. Source-of-truth docs

| File | क्या बताता है |
|---|---|
| `plan.md` | चरण-दर-चरण build plan (Phase 1–6), current status |
| `flow.md` (यह) | पूरा repo map — कहाँ क्या लिखा है और क्यों |
| `docs/architecture.md` | Dashboard architecture & conventions |
| `docs/workflow.md` | Product engineering workflow |
| `docs/infor.md` | Product overview (browser + terminal vision) |

---

*Keep this file in sync with the codebase. अगर folder structure बदले, imports
बदलें, या कोई नया flow जुड़े — तो इस फ़ाइल को भी अपडेट करना मत भूलना। 🙏*
