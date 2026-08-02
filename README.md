<div align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-6C5CE7?style=flat-square" alt="Version" />
  <img src="https://img.shields.io/badge/license-MIT-00B894?style=flat-square" alt="License" />
  <img src="https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind-4-06B6D4?style=flat-square&logo=tailwindcss" alt="Tailwind" />
  <img src="https://img.shields.io/badge/build-browser+terminal-44EDBC?style=flat-square" alt="Status" />
</div>

<br/>

<div align="center">
  <h1>LayerFlow</h1>
  <p>
    <strong>The AI Coding Platform — web + terminal</strong>
  </p>
  <p>
    <em>Code with AI in your browser or terminal.</em>
  </p>
  <p>
    Write plain English, click Improve, and run working code with multiple
    agents. Rescue dead AI chats into <strong>Context Passports</strong> and
    continue in any model with better prompts and lower cost.
  </p>
</div>

## Why LayerFlow exists

People lose time (and money) to three AI problems:

- messy prompts that produce wrong output
- dead chats and lost context when switching models
- overspending on expensive models

LayerFlow solves all three with one platform:

```text
Plain English → Improve prompt → Multi-agent run → Browser terminal + lf CLI
Paste chat → Clean → Compress → Improve → Cost check → Continue Pack
```

One product, two faces: the dashboard (`/code`) and the `lf` terminal agent share
the same Hono API, agents and workspace — see `docs/workflow.md` for the
per-feature status.

## What's inside

| Surface | What it does |
| --- | --- |
| Landing page | Problem → How it works → Magic Moment → Features → Comparison → Use cases → Pricing → Roadmap → Testimonials → FAQ |
| Coding Workspace | Plain English → Improve → run with parallel agents (implement / review / test) |
| Browser Terminal | Live agent output, shell commands and file diffs — same as the `lf` CLI |
| Rescue Chat | Paste any conversation, get a full Rescue Report in ~20s |
| Context Passport | Portable memory package: goal, state, decisions, constraints, failures, next action |
| Smart Compress | 15,000 words → ~1,000 words of useful context, with a Context Diff showing what was removed |
| Improve Prompt | Scored (0–100) improved next prompt |
| Cost Check | Dollar estimates across Claude, GPT, Gemini, DeepSeek, Kimi, Groq |
| Continue Pack | Copy-ready continuation for any model |
| Workspace | Projects, prompt library, context search, learning memory, AI Work Ledger |
| Cost Analytics | Spend by model, savings, budget |
| Models / BYOK | Model registry + bring-your-own-key vault |
| Agents · History · Search · Billing · API Keys | Agent mesh, work ledger, global search, plans, developer keys |

## Status

**Frontend-first build.** Everything renders with realistic mock data behind a
service layer (`lib/services/*`, backed by `lib/data/*`) so the UX can be
validated before the backend is wired in. The target architecture is
documented in `docs/tech-stack.md`, the engineering workflow in
`docs/workflow.md`, and the dashboard architecture in `docs/architecture.md`.

Not built yet (by design): real AI calls, SDK, IDE/browser extensions,
marketplace, enterprise features, git automation.

## Getting started

```bash
npm install

# frontend only (mock data, no API needed)
npm run dev:web

# full local stack (web + API + worker; needs docker-compose services)
npm run dev
```

Open http://localhost:3000. Sign-in is available (email/password + Google);
the workspace runs on mock data regardless.

### Scripts

| Command | What |
| --- | --- |
| `npm run dev:web` | Next.js frontend |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript strict check |
| `npm run lint` | ESLint |
| `npm run test` | Vitest unit tests |
| `npm run check:prod` | Production health checks |

## Project structure

```
flow.md            Repo map · tech stack · page map · conventions (START HERE)
app/
  (marketing)/     Landing, pricing, blog, docs
  (auth)/          Sign-in (better-auth)
  (dashboard)/     Auth-gated workspace — home, workspace, prompts, passports,
                   rescue, code, models, costs, history, search, agents,
                   billing, keys, settings
components/
  landing/         Marketing sections
  marketing/       Marketing shell (navbar, hero, footer, theme toggle)
  layout/          Dashboard shell (sidebar, topbar, command menu)
  shared/          Cross-page primitives (page header, section, row, stat)
  features/        Feature components (workspace, prompts, passports, rescue, history, home)
  auth/            Auth flow (kept)
  ui/              Design system primitives (panel, button, tabs, table, badge…)
lib/
  config/          Site, navigation + command registry
  services/        Async service layer (workspace, prompts, passports, models, search)
  data/            Mock data layer (types + providers + passports + prompts + workspace + marketing)
  hooks/           use-copy, use-command-menu, use-is-mobile
  providers/       Auth provider
  api/             Typed API client helpers (kept for the future backend)
  auth-client.ts   better-auth browser client (kept)
docs/
  tech-stack.md    Full technology stack
  workflow.md      Engineering workflows
  architecture.md  Dashboard architecture + conventions
```

## Product principles

- Priced on **workflow value** — never unlimited AI credits.
- **BYOK-first**: users bring their own API keys and pay providers directly.
- **Trust through transparency**: Context Diff shows exactly what was removed.
- Private by default; raw chats are never sold or used for training.

## Roadmap

1. **Live** — Coding Workspace (plain-English improve + agents + browser terminal), Rescue Reports (Limit Rescue, Passport, Compress, Diff, Improve, Cost, Model, Continue Pack)
2. **Building** — Workspace (projects, libraries, search, learnings, ledger, BYOK)
3. **Planned** — Real agent tool calls, `lf` CLI parity, browser companion, private mode, repo passports

See `docs/workflow.md` for the full engineering plan.
