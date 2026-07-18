# LayerFlow Learning Guide

This guide explains LayerFlow as both a product and a codebase.
It is written for a beginner who wants to understand not only *what* the code does, but also *why* it is arranged this way.

The frontend described here exists today, and the backend now exists too (in `apps/api` — see Part 5).
Parts 1–4 were written while the backend was still a plan; where they say something is "planned," Part 5 and `docs/backend-status.md` describe what was actually built.

---

## Part 1 — What LayerFlow is (plain language)

### The product in one page

LayerFlow is **The AI Workspace for Everyone**.

Think of it as a home for the work people do with AI.
Instead of losing useful prompts in ChatGPT history, Notes, Notion, documents, or message threads, a person can save and organize them in one workspace.

A prompt is the instruction someone gives an AI model.
For example: “Rewrite this work experience as three resume bullets.”
LayerFlow treats that instruction as useful work that should be saved, improved, compared, and reused.

LayerFlow also helps a person answer practical questions:

- Where did I save that useful prompt?
- Which version gave me the best result?
- Is GPT, Claude, Gemini, or another model better for this job?
- How much did this run cost?
- Can I stop AI spending before it goes over my limit?
- How can my own application call several AI providers through one interface?

The product is workspace-first.
The Gateway is important, but it is one module inside the product rather than the whole product.
That direction is defined in `docs/features.md` and `docs/product-strategy.md`.

### The four MVP modules

#### 1. AI Workspace

The Workspace is the center of LayerFlow.
It organizes AI work into domains, projects, folders, prompts, versions, and sessions.

A **domain** is a broad area such as Coding, Marketing, Study, Resume, or Personal.
A **project** is a specific body of work inside a domain.
A **folder** is an optional smaller grouping inside a project.

Every time a prompt is meaningfully edited, LayerFlow is intended to create a new version.
The Timeline then shows the prompt text, model, output, token count, cost, and date for each version.

Sessions group related prompts into an ordered conversation or workflow.
For example, a Resume Builder session might create an outline, improve the bullet points, and then write a cover letter.

The current frontend demonstrates these ideas under routes such as:

- `/workspace`
- `/projects`
- `/prompts`
- `/sessions`
- `/compare`

#### 2. AI Cost Manager

The Cost Manager shows where AI money is being spent.
It is designed to support daily, monthly, per-project, and per-key limits.

The key promise is a **hard budget**.
This means the server should stop a paid AI request before calling the model provider when the configured limit has been reached.

The frontend currently demonstrates budget meters, warning states, a blocked state, per-project spend, and savings suggestions.
Those screens use mock values today; the server-side enforcement does not exist in the frontend alone.

The main routes are:

- `/budget`
- `/optimizer`
- budget summaries inside `/workspace`

#### 3. AI Model Intelligence

Different AI models have different strengths, speeds, and prices.
Model Intelligence recommends a suitable model and explains *why* it made that recommendation.

LayerFlow plans to support Manual, Suggest, and Auto modes.
Auto mode can prefer the cheapest, fastest, best-quality, or balanced option.

Today, `lib/prompt-analysis.ts` demonstrates this idea with simple keyword rules and rough calculations.
It is not machine learning, and it does not call an AI provider.

The current UI appears in:

- the prompt editor at `/prompts/[promptId]`
- `/optimizer`
- routing and execution settings at `/settings`

#### 4. AI Gateway

The Gateway is for developers who want their own applications to call AI models.
It aims to provide one OpenAI-compatible address that can route to providers such as OpenAI, Anthropic, Google, DeepSeek, and Groq.

**BYOK** means “bring your own key.”
The user supplies their provider API keys, keeps the direct provider billing relationship, and uses LayerFlow for routing, organization, logs, and budget control.

The current `/gateway` page contains example configuration and SDK snippets.
Those examples are illustrative; there is no live gateway behind them yet.

### Who LayerFlow is for

The first audience is developers and AI power users.
These people already write many prompts, try several models, use API keys, and care about cost.

The same basic workspace can later help students, writers, marketers, recruiters, researchers, agencies, and small teams.
They may not care about the Gateway, but they still need to organize prompts and avoid losing good AI work.

Team and enterprise features come later.
The current strategy deliberately avoids making compliance, complex permissions, and enterprise administration the center of the MVP.

---

## Part 2 — Technologies you must learn, in order

Do not try to master every technology before touching the project.
Learn enough of each layer to understand the next one, then return for deeper study while building.

### 1. HTML and CSS basics

HTML gives a web page its structure: headings, links, buttons, forms, and sections.
CSS controls how that structure looks, including spacing, colors, layout, responsive behavior, and animation.

In LayerFlow, JSX elements such as `<main>`, `<button>`, and `<textarea>` become HTML in the browser.
Global CSS tokens and reusable classes live in `app/globals.css`, while most component styling is expressed with Tailwind classes in files throughout `app/` and `components/`.

- **Where used:** `app/layout.tsx`, `app/globals.css`, every `.tsx` file under `app/` and `components/`
- **Free resource:** [MDN: Learn web development](https://developer.mozilla.org/en-US/docs/Learn_web_development)

### 2. TypeScript

TypeScript is JavaScript with type checking.
Types describe the expected shape of values so the editor can catch many mistakes before the code runs.

LayerFlow uses interfaces such as `Prompt`, `PromptVersion`, `Budget`, and `User`.
Those definitions in `lib/types.ts` are used by mock data and components, and they will later help keep API responses consistent.

- **Where used:** `lib/types.ts`, `lib/mock-data.ts`, `lib/prompt-analysis.ts`, all `.ts` and `.tsx` files
- **Free resource:** [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)

### 3. React

React builds an interface from reusable functions called components.
A component receives data called **props**, may hold changing **state**, and returns the elements that should appear on screen.

LayerFlow components include `components/workspace/PromptEditor.tsx`, `components/workspace/Timeline.tsx`, and `components/marketing/Hero.tsx`.
Files marked `"use client"` can use browser features and React hooks such as `useState` and `useEffect`.

- **Where used:** all UI files under `app/` and `components/`
- **Free resource:** [React Learn](https://react.dev/learn)

### 4. Next.js App Router

Next.js is a React framework that adds routing, layouts, server rendering, metadata, fonts, and production build tools.
The App Router maps folders and special files inside `app/` to browser URLs.

For example, `app/(app)/budget/page.tsx` becomes `/budget`.
The parentheses create a route group for organization and layout selection, but `(app)` does not appear in the URL.

- **Where used:** `app/layout.tsx`, `app/(marketing)/`, `app/(app)/`, `app/sitemap.ts`, `app/robots.ts`
- **Free resource:** [Next.js App Router course](https://nextjs.org/learn/dashboard-app)

### 5. Tailwind CSS

Tailwind CSS provides small utility classes that are combined directly in markup.
For example, `flex`, `gap-4`, `rounded-lg`, and `text-muted` each contribute one part of an element’s appearance.

LayerFlow uses Tailwind 4 through `@import "tailwindcss"` in `app/globals.css`.
Its `@theme` block defines project names such as `bg`, `surface`, `ink`, `muted`, and `brand`.

- **Where used:** `app/globals.css`, component `className` values, `postcss.config.mjs`
- **Free resource:** [Tailwind CSS documentation](https://tailwindcss.com/docs)

### 6. Framer Motion

Framer Motion is an animation library for React.
It supplies components and hooks for entrances, exits, scrolling effects, and smooth state changes.

The package is installed as `framer-motion`.
It is used in `components/marketing/Hero.tsx`, `components/marketing/Navbar.tsx`, `components/marketing/Reveal.tsx`, and `components/marketing/ThemeToggle.tsx`.

- **Where used:** animated marketing and theme components under `components/marketing/`
- **Free resource:** [Motion for React documentation](https://motion.dev/docs/react)

### 7. Node.js

Node.js runs JavaScript outside the browser.
It runs the Next.js development and build tools today and will run the separate API service later.

Commands in `package.json` call Next.js through Node.
The backend plan chooses Node.js 22 as the runtime for Hono, but that backend code is not described in this guide yet.

- **Where used:** `package.json`, `package-lock.json`; planned backend runtime in `docs/backend.md`
- **Free resource:** [Node.js Learn](https://nodejs.org/en/learn)

### 8. Hono

Hono is a small web framework for building APIs.
It will receive HTTP requests, run authentication and business rules, and return JSON or streamed model output.

Hono is not used by the current frontend files.
It is the selected framework for the backend service being built under `apps/api`, as specified in `docs/backend.md`.

- **Where used:** planned backend service; architecture documented in `docs/backend.md`
- **Free resource:** [Hono Getting Started](https://hono.dev/docs/getting-started/basic)

### 9. SQL and PostgreSQL

SQL is the language used to read and change relational databases.
PostgreSQL stores information in tables whose rows can be connected by IDs, such as a project belonging to a domain and a prompt belonging to a project.

LayerFlow plans to use Neon-hosted PostgreSQL as its durable source of truth.
The current frontend has no database and instead uses arrays in `lib/mock-data.ts`.

- **Where used:** planned data model in `docs/backend.md` and `docs/completedfeatauresandbackend.md`
- **Free resource:** [SQLBolt interactive lessons](https://sqlbolt.com/)

### 10. Drizzle ORM

An ORM helps TypeScript code work with database tables.
Drizzle stays close to SQL while providing typed schemas, queries, and migration tools.

A **migration** is a recorded database structure change, such as creating a `prompts` table or adding a column.
Drizzle is planned for the backend and is not present in the current frontend package.

- **Where used:** planned database access described in `docs/backend.md`
- **Free resource:** [Drizzle ORM documentation](https://orm.drizzle.team/docs/overview)

### 11. Redis

Redis is a fast data store commonly used for counters, caching, and short-lived coordination.
It is not meant to replace LayerFlow’s permanent PostgreSQL records.

LayerFlow plans to use Redis for atomic budget reservations, rate limits, and caches.
The current `BudgetMeter` only displays mock values from `lib/mock-data.ts`; it does not enforce spending.

- **Where used:** planned budget and cache design in `docs/backend.md`; mock display in `components/workspace/BudgetMeter.tsx`
- **Free resource:** [Redis University](https://university.redis.io/)

### 12. REST APIs and HTTP

HTTP is the request-and-response language used between browsers and servers.
A REST API organizes operations around URLs and methods such as `GET` for reading, `POST` for creating, `PATCH` for updating, and `DELETE` for removing.

The current frontend mostly imports local data and does not fetch product data.
The planned frontend client will call workspace endpoints under `https://api…/api/*`, while external applications will call Gateway endpoints under `/v1/*`.

- **Where used:** future replacement for `lib/mock-data.ts`; endpoint design in `docs/backend.md`
- **Free resource:** [MDN: HTTP overview](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Overview)

### 13. OAuth and Google login

OAuth lets a user authorize LayerFlow to receive verified identity information from Google without giving LayerFlow their Google password.
Better Auth will manage the secure flow, account records, sessions, and cookies.

Authentication is not connected in the current frontend.
`demoUser` in `lib/mock-data.ts` is only a placeholder for the future signed-in user.

- **Where used:** future replacement for `demoUser`; flow specified in `docs/backend.md`
- **Free resource:** [Google Identity: OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)

### 14. Git

Git records changes to files so work can be reviewed, compared, and restored.
It also supports branches, which let people or agents build different parts in parallel before combining them.

The LayerFlow repository itself is a Git repository.
The product’s Prompt Timeline uses Git as a design analogy, but prompt versions are application data rather than actual Git commits.

- **Where used:** the whole repository; Timeline analogy in `components/workspace/Timeline.tsx`
- **Free resource:** [GitHub Skills: Introduction to GitHub](https://skills.github.com/)

### Small glossary

| Term | Plain-language meaning | LayerFlow example |
|---|---|---|
| **Component** | A reusable React function that renders part of a screen. | `components/workspace/BudgetMeter.tsx` |
| **Prop** | Data passed from a parent component to a child component. | `<BudgetMeter budget={budget} />` |
| **State** | Data a client component remembers while the user interacts with it. | Editor text in `PromptEditor.tsx` |
| **Route** | A URL and the code that responds to it. | `/prompts` maps to `app/(app)/prompts/page.tsx` |
| **Route group** | A parenthesized folder that organizes routes without changing the URL. | `(marketing)` and `(app)` |
| **Dynamic route** | A route with a value that changes per item. | `/prompts/prompt_sidebar` fills `[promptId]` |
| **API** | A defined way for one program to ask another program for data or actions. | `GET /api/prompts/:id` |
| **Endpoint** | One API method and path. | `POST /api/compare` |
| **Database table** | A structured collection of related rows. | A future `prompts` table stores prompts |
| **Migration** | A versioned instruction that changes database structure safely. | Add a new column to prompt records |
| **Session** | A server-side login record that identifies a signed-in user. | Better Auth’s future Google session |
| **Cookie** | A small value the browser stores and sends with matching requests. | A secure session cookie |
| **Environment variable** | Configuration supplied outside source code, often for secrets or deployment URLs. | `GOOGLE_CLIENT_ID` or `API_URL` |
| **Mock data** | Hard-coded sample data used before a real API and database exist. | `lib/mock-data.ts` |
| **Client** | Usually the browser or code that calls a server. | The Next.js interface |
| **Server** | Code that receives requests, protects data, and performs trusted work. | The planned Hono API |

---

## Part 3 — Frontend deep walkthrough

### The basic request flow

When someone visits a LayerFlow URL, the flow is:

```text
Browser URL
  → Next.js matches a folder and page.tsx
  → the nearest layouts wrap that page
  → the page renders child components
  → components receive content or mock product data
  → React turns the result into an interactive screen
```

For `/workspace`, Next.js matches `app/(app)/workspace/page.tsx`.
That page is wrapped by `app/layout.tsx` and then `app/(app)/layout.tsx`.

The root layout supplies the HTML shell, fonts, global CSS, metadata, and initial theme script.
The app layout supplies `AppSidebar`, `AppTopBar`, and the scrollable main content area.

The page imports arrays and objects from `lib/mock-data.ts`.
It sorts and selects data, then passes smaller pieces to components such as `PromptList`, `SessionList`, and `BudgetMeter`.

### Why `(marketing)` and `(app)` exist

Folders in parentheses are **route groups**.
They let the project use separate layouts without adding those folder names to public URLs.

`app/(marketing)/` contains public acquisition pages.
Its layout wraps pages with the marketing `Navbar` and `Footer`.

`app/(app)/` contains the workspace product.
Its layout wraps pages with `AppSidebar` and `AppTopBar`.

Therefore:

- `app/(marketing)/pricing/page.tsx` becomes `/pricing`, not `/marketing/pricing`
- `app/(app)/budget/page.tsx` becomes `/budget`, not `/app/budget`

Both groups still inherit `app/layout.tsx`.
This means both receive the same fonts, global CSS, document metadata defaults, and theme initialization.

### Example A: the landing page

The browser requests `/`.
Next.js selects `app/(marketing)/page.tsx` and wraps it in the marketing and root layouts.

The home page is intentionally a short composition file:

```tsx
export default function HomePage() {
  return (
    <>
      <Hero />
      <LogosStrip />
      <Journey />
      <PlatformFeatures />
      <WhyChoose />
      <Foundation />
      <Steps />
      <Faq />
      <Blog />
    </>
  );
}
```

Each imported component owns one visual section.
This keeps page order easy to see while allowing each section to have its own layout and animation code.

`components/marketing/Hero.tsx` reads the shared `site` and `heroBadges` content:

```tsx
<motion.h1 variants={item} className="hero-title ...">
  {site.headline}
</motion.h1>
<motion.p variants={item} className="...">
  {site.subtitle}
</motion.p>
<a href={site.workspaceHref}>
  Open workspace
</a>
```

The live content source is `lib/marketing-content.ts`.
It contains the site headline, navigation, feature menu, feature sections, FAQ entries, pricing tiers, and footer columns.

`lib/content.ts` is a deprecated compatibility re-export of `marketing-content.ts`.
Current marketing components import `lib/marketing-content.ts` directly.

### Example B: the prompt editor and Timeline

Suppose the browser opens `/prompts/prompt_sidebar`.
The folder `[promptId]` means the final URL segment is dynamic.

`app/(app)/prompts/[promptId]/page.tsx` reads the segment and looks up matching mock data:

```tsx
export default async function PromptDetailPage({ params }: PromptDetailPageProps) {
  const { promptId } = await params;
  const prompt = getPrompt(promptId);
  if (!prompt) notFound();

  return <PromptDetailClient prompt={prompt} />;
}
```

In Next.js 16, this page types `params` as a Promise and awaits it.
If `getPrompt` cannot find the ID, `notFound()` shows the route’s 404 behavior; this is not a redirect to another product page.

`PromptDetailClient.tsx` stores the shared version list.
The editor reports a new version through a callback prop, and the Timeline receives the updated array.

Inside `components/workspace/PromptEditor.tsx`, typing updates React state.
`useMemo` recalculates a local analysis whenever the content or selected model changes.

`analyzePrompt()` comes from `lib/prompt-analysis.ts`.
It estimates roughly one token per four characters, searches for keywords such as `code`, `api`, and `react`, and returns hard-coded model recommendations.

When “Save new version” is clicked, the editor creates a `PromptVersion` object in browser memory.
Its output is explicitly labeled as mock output:

```tsx
const newVersion: PromptVersion = {
  id: `v${versionCount + 1}`,
  version: versionCount + 1,
  content,
  model,
  cost: analysis.estimatedCost,
  output: `[Mock output for v${versionCount + 1}] ${content.slice(0, 80)}...`,
  createdAt: new Date().toISOString(),
};
```

**Mock** means the data is a demonstration, not a record loaded from a database.
The new version survives component updates because it is in React state, but it disappears after a full page refresh.

The “Run” button does not call an AI model.
Timeline rollback, replay, and export mostly display temporary messages, while duplicate creates another local version.

### Example C: navigation, links, route parameters, and redirects

`next/link` provides the `Link` component for navigation inside the Next.js app.
It can load the next route without forcing the browser to reload the entire document.

`components/workspace/AppSidebar.tsx` defines grouped links for the workspace.
`usePathname()` reads the current path so the sidebar and Navbar can show active states.
Clicking a `Link` changes the route, Next.js renders the matching page, and the relevant shared layout remains around it.

Dynamic links are built with template strings.
For example, `PromptList.tsx` turns each prompt ID into a detail URL:

```tsx
<Link
  key={prompt.id}
  href={`/prompts/${prompt.id}`}
  className="card-hover flex items-start gap-4"
>
  <h3>{prompt.title}</h3>
</Link>
```

`prompt.id === "prompt_sidebar"` produces `/prompts/prompt_sidebar`.
Next.js puts `"prompt_sidebar"` into the `[promptId]` parameter.

Query parameters are used for domain filtering.
`DomainCard.tsx` links to a URL such as `/projects?domain=coding`, and `app/(app)/projects/page.tsx` reads `searchParams.domain`.

The marketing Navbar also uses `Link` for internal destinations.
Some marketing page CTAs, including the Hero buttons, use normal `<a href>` elements instead, which cause a full document navigation.

There are currently no authentication redirects.
“Open workspace” goes directly to `/workspace`, and the app layout does not check for a signed-in session.

There are also no programmatic product redirects in the reviewed routes.
The closest related behavior is `notFound()` for unknown prompt, project, or session IDs.

### Example D: theming, CSS tokens, and localStorage

LayerFlow supports light and dark themes.
Dark values are defined first in `:root`, and `html.light` overrides them.

These values are design tokens.
A token gives a meaningful name such as `--color-bg` to a reusable design choice, so components do not need to repeat raw color values everywhere.

The Tailwind `@theme` block in `app/globals.css` exposes names such as `bg`, `surface`, `ink`, `muted`, and `brand`.
That is why components can use classes such as `bg-surface`, `text-ink`, and `text-brand`.

Before the page body appears, `app/layout.tsx` runs a small script.
It reads `localStorage.getItem("lf-theme")`; unless the saved value is `"dark"`, it adds the `light` class.

`localStorage` is browser storage that survives refreshes for the same website.
The key used by LayerFlow is `lf-theme`.

`components/marketing/ThemeToggle.tsx` changes both the class and saved value:

```tsx
const toggle = () => {
  const next: Theme = theme === "dark" ? "light" : "dark";
  setTheme(next);
  document.documentElement.classList.toggle("light", next === "light");
  try {
    localStorage.setItem("lf-theme", next);
  } catch {}
};
```

The toggle is shared by the marketing Navbar and `AppTopBar`.
The preference is currently browser-only and is not synced to a user account.

### What each top-level folder and important file is for

| Path | Purpose |
|---|---|
| `app/` | Next.js routes, layouts, global styling, metadata, sitemap, and robots file |
| `app/layout.tsx` | Root HTML shell, fonts, SEO metadata, JSON-LD, and initial theme script |
| `app/globals.css` | Tailwind import, theme tokens, global rules, animation layers, and shared component classes |
| `app/(marketing)/` | Public home, pricing, and about routes |
| `app/(marketing)/layout.tsx` | Adds the marketing Navbar and Footer |
| `app/(app)/` | Workspace routes for prompts, projects, sessions, compare, budget, optimizer, gateway, and settings |
| `app/(app)/layout.tsx` | Adds the persistent app sidebar and top bar |
| `components/marketing/` | Public-site sections, navigation, animation wrappers, logo, and theme toggle |
| `components/workspace/` | Reusable product UI such as editor, Timeline, lists, sidebar, budget meter, and compare panel |
| `lib/marketing-content.ts` | Active source of marketing copy, navigation, feature data, FAQ, pricing, and footer links |
| `lib/content.ts` | Deprecated re-export of `marketing-content.ts` |
| `lib/mock-data.ts` | In-memory sample user, domains, projects, prompts, versions, sessions, budgets, keys, and lookup helpers |
| `lib/types.ts` | TypeScript definitions for product data |
| `lib/prompt-analysis.ts` | Local heuristic token, cost, task, and recommendation demonstration |
| `lib/compare-results.ts` | Prewritten model comparison results used by the compare demo |
| `public/` | Static files served directly, including provider and company images |
| `docs/` | Product, architecture, research, handoff, and learning documents; not runtime application code |
| `package.json` | Project identity, scripts, frontend dependencies, and development dependencies |
| `package-lock.json` | Exact installed dependency versions for repeatable installs |
| `tsconfig.json` | TypeScript settings and the `@/` import alias |
| `next.config.mjs` | Next.js configuration |
| `postcss.config.mjs` | Connects Tailwind’s PostCSS plugin to the CSS build |

---

## Part 4 — How frontend and backend will connect

### Client and server in plain language

The **client** is the interface running in the user’s browser.
It displays forms and data, responds to clicks, and asks the server to perform trusted work.

The **server** is the backend application.
It authenticates users, checks permissions, reads and writes the database, protects secret provider keys, enforces budgets, and calls AI providers.

The browser must not directly contain database passwords, Google client secrets, encryption keys, or users’ raw provider keys.
Anything sent to browser JavaScript can potentially be inspected by the user.

The planned separation is:

```text
Next.js frontend
  → HTTPS request
  → Hono API
  → PostgreSQL for durable data
  → Redis for fast budget reservations and counters
  → AI provider when allowed
  → JSON or streamed response
  → frontend updates the screen
```

This design comes from [`docs/backend.md`](backend.md), especially its recommended stack, request paths, API surface, and gateway design sections.
The frontend replacement plan is also summarized in [`docs/completedfeatauresandbackend.md`](completedfeatauresandbackend.md), especially “Frontend → backend replacement map.”

### What an API endpoint is

An API endpoint is one server address plus one HTTP method.
It represents a specific operation.

Examples from the backend plan include:

- `GET /api/prompts` — return prompts the signed-in user may see
- `POST /api/prompts` — create a prompt
- `GET /api/prompts/:id/versions` — return a prompt’s Timeline
- `POST /api/compare` — start a multi-model comparison
- `GET /api/budgets/current` — return the current limits and spend
- `PUT /api/budgets/current` — change budget settings
- `POST /v1/chat/completions` — call the OpenAI-compatible Gateway

The method matters.
`GET /api/prompts` and `POST /api/prompts` use the same path but perform different operations.

Workspace endpoints use the signed-in browser session.
Gateway endpoints use a LayerFlow API key in an `Authorization: Bearer ...` header because they are called by external applications and SDKs.

### Replacing `lib/mock-data.ts`

Today a page can do this:

```ts
import { prompts } from "@/lib/mock-data";
```

That is immediate and convenient, but it always returns the same bundled sample array.
It cannot provide each user with private, persistent data.

The handoff plan says a typed `lib/api-client.ts` will replace direct mock imports.
A typed client is a small frontend module that knows the API base URL, sends requests, handles errors, and returns known TypeScript shapes.

A future call may conceptually look like this:

```ts
const prompts = await api.prompts.list();
const prompt = await api.prompts.get(promptId);
await api.prompts.createVersion(promptId, {
  content,
  model,
});
```

Underneath, those methods would call addresses such as:

```text
https://api.layerflow.dev/api/prompts
https://api.layerflow.dev/api/prompts/:id
https://api.layerflow.dev/api/prompts/:id/versions
```

The exact production hostname should come from an environment variable rather than being repeated across components.
This lets local, staging, and production deployments use different API addresses.

The replacement should happen by product area:

| Frontend today | Future server source |
|---|---|
| `demoUser` | Better Auth session |
| `domains`, `projects`, `folders`, `prompts` | Workspace REST endpoints and PostgreSQL |
| Editor’s local version creation | Prompt-version endpoint and immutable database row |
| `sessions` | Session and message endpoints |
| `compareResults` | Background compare job and real provider results |
| `lib/prompt-analysis.ts` | Model Intelligence analysis/recommendation endpoint |
| `budget`, `projectBudgets`, `keyBudgets` | Redis enforcement plus PostgreSQL usage records |
| `apiKeys`, `gatewayConfig` | Secure API-key and provider-key endpoints |
| Visual search field | PostgreSQL text and semantic search |

The types in `lib/types.ts` are useful preparation, but server responses still need runtime validation.
TypeScript checks code during development; it cannot guarantee that an unexpected network response is valid at runtime.

### How Google login will work end to end

The chosen authentication system is Better Auth with direct Google OAuth.
The intended flow is:

1. The user clicks **Continue with Google** in the frontend.
2. The frontend asks Better Auth to start Google social sign-in.
3. The browser goes to Google’s consent page.
4. Google shows which identity information LayerFlow requests.
5. After approval, Google redirects to Better Auth’s callback endpoint.
6. Better Auth verifies the callback securely and creates or updates the account.
7. On first login, LayerFlow creates a default workspace and default domains.
8. Better Auth creates a session record and sends a secure session cookie.
9. The browser stores that cookie.
10. Matching requests to `https://api…/api/*` include the cookie.
11. The API resolves the session to a user and workspace membership.
12. Every protected query is scoped to that workspace.

A session cookie is not the same as a user ID typed into frontend code.
It is a protected credential managed by the authentication library and browser.

The cookie should be configured so normal JavaScript cannot read it when possible.
The API still must check authorization on every protected request; hiding a button in the UI is not security.

Google OAuth requires environment variables such as the Google client ID and secret.
The secret belongs in backend deployment secrets, never in a committed frontend file.

This flow is specified in [`docs/backend.md`](backend.md) under Auth and in [`docs/completedfeatauresandbackend.md`](completedfeatauresandbackend.md) under “Google direct authentication.”

### How hard budget blocking will work

The budget display and the budget enforcement are different responsibilities.

`components/workspace/BudgetMeter.tsx` displays values.
It can warn the user, but browser code alone cannot safely block spending because it can be bypassed or have stale data.

The backend must enforce the limit immediately before an AI provider call.
Conceptually:

1. The request arrives with a user session or LayerFlow API key.
2. The server identifies the workspace, project, and key budget scopes.
3. It estimates the maximum cost of the proposed call.
4. Redis atomically reserves that amount across applicable limits.
5. If a daily, monthly, project, or key hard limit would be exceeded, the reservation fails.
6. The server returns a `402 budget_exceeded` error and does **not** call the provider.
7. If allowed, the server calls the provider.
8. When the result completes, the server settles the reservation to the actual cost.
9. It appends a durable usage record in PostgreSQL.
10. Background work updates summaries and sends threshold alerts.

**Atomically** means the check and reservation behave as one indivisible operation.
This matters when several requests arrive at the same time; they must not all see the same remaining money and overspend together.

Redis is the fast live enforcement layer.
PostgreSQL is the durable financial history used for reconciliation, reporting, and rebuilding counters if needed.

The frontend will handle the error by disabling or marking paid actions, showing which limit was reached, and offering the user a way to raise the limit or wait for reset.
It should not pretend a model ran when the server blocked it.

This behavior follows the hard-budget sections in [`docs/backend.md`](backend.md) and [`docs/completedfeatauresandbackend.md`](completedfeatauresandbackend.md).

---

## Part 5 — Backend deep walkthrough

The backend now exists.
It lives in `apps/api` and is a real, running service: a Hono HTTP API plus a background job worker, backed by PostgreSQL and Redis.

This part walks through it the same way Part 3 walked through the frontend: what each folder is for, what happens when a request arrives, and which file to open when you want to change something.

### The three processes you run locally

The backend is not one program; locally it is three:

```text
docker compose up -d        → Postgres (with pgvector) + Redis in containers
npm run dev    (apps/api)   → the HTTP API on http://localhost:8787
npm run worker (apps/api)   → the job worker (compare jobs, embeddings)
```

The API answers HTTP requests quickly.
Anything slow or retryable — running the same prompt against four models, computing embeddings — is put on a Redis-backed queue (BullMQ) and done by the worker, so the API never keeps a browser waiting for minutes.

`apps/api/README.md` has the exact step-by-step setup, including creating the Google OAuth client.

### Folder map of `apps/api`

| Path | Purpose |
|---|---|
| `src/index.ts` | API entrypoint — builds the app and listens on port 8787 |
| `src/app.ts` | App factory: CORS, the Better Auth mount, `/health`, then all routes |
| `src/worker.ts` | Worker entrypoint — consumes the job queue |
| `src/auth/index.ts` | Better Auth configuration (Google-only sign-in, Drizzle adapter) |
| `src/config/env.ts` | Every environment variable, validated with zod at startup |
| `src/db/schema/` | All 56 database tables, split by area (`prompts.ts`, `runs.ts`, `cost.ts`, ...) |
| `src/db/seed.ts` | Dev data: a user, workspace, projects, prompts, learning content |
| `src/middleware/auth.ts` | `requireAuth` — turns the session cookie into `userId` + `workspaceId` |
| `src/middleware/api-key-auth.ts` | `requireApiKey` — the same job for `lf_...` gateway keys |
| `src/middleware/error.ts` | `AppError` and the global error → JSON translator |
| `src/routes/` | One folder per module; `routes/index.ts` mounts them all |
| `src/services/` | Business logic the routes call (keeps route files thin) |
| `src/providers/` | One adapter per AI provider (OpenAI, Anthropic, Google, ...) |
| `src/gateway/` | The OpenAI-compatible `/v1/*` endpoints |
| `src/budgets/` | Atomic budget enforcement on Redis (reserve / settle / release) |
| `src/intelligence/` | Prompt analysis and model recommendation logic |
| `src/jobs/` | Queue helper (`queues.ts`) and job processors (`processors/`) |
| `src/search/` | Embeddings (OpenAI or a local fallback) for semantic search |
| `src/test/` | Vitest tests, including integration tests on an in-memory Postgres |
| `drizzle/` | Generated SQL migration files (checked in) |
| `packages/contracts/` | Shared zod schemas — the request/response shapes both sides agree on |
| `packages/model-registry/` | Model catalog: providers, pricing, `computeCostMicro` |

### The request lifecycle, end to end

Take one concrete request: the frontend asks for the prompt list.

```text
Browser: GET http://localhost:8787/api/prompts   (session cookie attached)
  → src/app.ts             CORS check, request-id assigned
  → requireAuth            cookie → session → userId + workspaceId
  → routes/prompts/prompts.ts   the GET "/" handler runs
  → Drizzle query          SELECT ... WHERE workspace_id = <yours>
  → zod contract           response shaped like listPromptsResponseSchema
  → JSON back to browser
```

Two details in that flow matter more than everything else:

**1. How login turns into `userId`.**
When you click “Continue with Google”, Better Auth (mounted at `/api/auth/*` in `src/app.ts`) handles the whole OAuth dance and ends up setting a secure session cookie.
On the very first login, `src/services/onboarding.ts` creates your workspace, membership, settings, budget, and the 9 default domains — so a brand-new user lands in a ready workspace.
After that, `requireAuth` in `src/middleware/auth.ts` runs before every protected route: it asks Better Auth to resolve the cookie into a session, looks up your workspace membership, and stores `userId` and `workspaceId` on the request context.

**2. Every query is workspace-scoped.**
Route handlers never trust IDs sent by the client to decide *whose* data to read.
They always filter by `c.get("workspaceId")` — the workspace that came from your verified session.
That single convention is what makes LayerFlow multi-tenant-safe.

### How a Run works, end to end

A “Run” is one real model call from the playground or a session.
The whole story is in `src/services/runs/execute.ts`, and it goes like this:

1. `POST /api/runs` arrives with a model name and either raw content or a prompt/version ID (`src/routes/runs/runs.ts`).
2. `resolveProviderFromModel` (in `src/providers/index.ts`) maps the model name — say `claude-sonnet-4` — to a provider adapter.
3. The cost is **estimated** from the model's pricing in `packages/model-registry`.
4. A `runs` row is inserted with status `pending`.
5. The budget is **reserved**: `budgetReserve` (in `src/services/runs/budget-hook.ts`) calls `reserveBudget` in `src/budgets/enforce.ts`, which atomically bumps Redis counters. If a hard limit would be crossed, the run is marked `blocked` and the client gets `402 budget_exceeded` — the provider is never called.
6. Your decrypted BYOK provider key is loaded (`src/providers/keys.ts`).
7. The adapter calls the real provider API.
8. On success the run row is updated: `succeeded`, output text, real token counts, real cost, latency. Then `budgetSettle` corrects Redis to the actual cost and writes an immutable `usage_ledger` row.
9. On failure the run is marked `failed` and `budgetRelease` gives the reserved money back.
10. If the run came from a saved prompt version, the output is also stored in `prompt_outputs` so the Timeline can show it.

`POST /api/runs/stream` is the same flow wrapped in server-sent events (`start` → `delta` → `done`).
Today it sends the whole output as one `delta` after the run finishes; true token-by-token streaming from providers is a known follow-up, and the event shape was designed so it can be added without breaking clients.

**Compare** (`POST /api/compare`) reuses all of this: it enqueues one job, and the worker (`src/jobs/processors/compare.ts`) executes a run per model, ranks the results (`src/services/compare/rank.ts`), and stores them for `GET /api/compare/:jobId` to poll.

### How the gateway works

The gateway is the same machinery with a different front door.
Differences from a workspace run:

- **Auth**: no cookie. `requireApiKey` (`src/middleware/api-key-auth.ts`) verifies the `Authorization: Bearer lf_...` secret against a hash — the plain secret is never stored.
- **Cache first**: `src/cache/exact.ts` hashes the whole request; an identical earlier request is answered from Redis instantly, for free.
- **Same budget, same adapters**: `src/gateway/router.ts` calls the exact same `reserveBudget`/`settleBudget` and the exact same provider adapters as Runs. There is one implementation of “call a model safely,” not two.
- **Logging**: every call writes a `gateway_logs` row (status, model, latency).
- **Response shape**: matches OpenAI's chat-completions format, so any OpenAI SDK works by changing `baseURL` to `http://localhost:8787/v1`.

### Which file do I open to change X? (cheat sheet)

| I want to... | Open |
|---|---|
| Add or change an API endpoint | `apps/api/src/routes/<module>/...` then mount in `routes/index.ts` |
| Change a request/response shape | `packages/contracts/src/<module>.ts` |
| Add a database table or column | `apps/api/src/db/schema/<area>.ts`, then `npm run db:generate` + `db:migrate` |
| Add a new AI provider | `apps/api/src/providers/<name>.ts`, register in `providers/index.ts` |
| Add or reprice a model | `packages/model-registry/src/index.ts` |
| Change budget enforcement rules | `apps/api/src/budgets/enforce.ts` (+ `lua.ts` for the atomic script) |
| Change what happens on first login | `apps/api/src/services/onboarding.ts` |
| Change model recommendations | `apps/api/src/intelligence/analyze.ts` and `recommend.ts` |
| Add a background job | `apps/api/src/jobs/queues.ts` (name) + `jobs/processors/<name>.ts` (code) |
| Change search / embeddings | `apps/api/src/search/embeddings.ts`, `services/search/` |
| Change dev seed data | `apps/api/src/db/seed.ts` |
| Change an environment variable | `apps/api/src/config/env.ts` + `apps/api/.env.example` |
| See every endpoint at once | the endpoint map in `apps/api/README.md` |

### What is still simplified

Three things are deliberately not production-grade yet, and each is marked in the code:

- **File storage** uploads to local disk; the Cloudflare R2 signed-URL path returns `501` until implemented (`src/routes/files/files.ts`, `src/services/files/storage.ts`).
- **Streaming** from `/api/runs/stream` is “whole answer as one event,” not token-by-token.
- **Embeddings** fall back to a local deterministic function when no `OPENAI_API_KEY` is set — search works, just with lower quality (`src/search/README.md`).

The current status of everything, plus next steps, is tracked in [`docs/backend-status.md`](backend-status.md).
