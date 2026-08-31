# LayerFlow — Architecture (v2)

> Single source of truth as of 2026-08-31. This doc describes the **actual**
> codebase — not planned/placeholder surfaces. The previous version listed a
> `/code` page and a mock layer that were removed.

## Product shape

LayerFlow is one product across four surfaces sharing **one backend**:

- **Web** — Next.js 16 (App Router, React 19) at the repo root (`app/`,
  `components/`, `lib/`).
- **API + worker** — Hono API + Drizzle ORM + PostgreSQL (pgvector) + Redis
  (BullMQ) in `apps/api`. The API is mounted into Next.js at `/api/*` + `/v1/*`
  (same-origin, Mode A) and can also run standalone (Mode B).
- **Shared packages** — `packages/contracts` (zod schemas shared web↔api),
  `packages/model-registry` (single source of provider/model/cost data).
- **Terminal CLI** — Go (`terminal/`, binary `lf`, TUI via Bubble Tea). Device-flow
  login; shares the same Hono API + session/event protocol as the web.

## Route groups (dashboard)

`app/(marketing)/` — public landing, pricing.
`app/(auth)/sign-in` — Better Auth sign-in.
`app/(dashboard)/` — auth-gated workspace; `layout.tsx` → `AppShell`.

The dashboard navigation (`lib/config/navigation.ts`) drives sidebar / Cmd+K.
Actual pages (17):

```
home  chat  chat/[id]  prompts  prompts/[id]  agents  agents/new
agents/[id]  terminal  models  history  memory  search  costs
keys  billing  settings  team  workspace  workspace/[projectId]
```

## Terminal parity

The browser and terminal are one product. A web-created chat session is
accessible from `lf` and vice-versa over the same Hono API. Sync uses a
device protocol (`POST /api/v1/sync/handshake` / `push` / `pull`) with a
watermark so the two sides never double-apply. See `terminal/README.md` and
`docs/API.md` §"Terminal sync protocol".

## Layering

```
app/(dashboard)/*           pages (server-first, async fetch)
  └ components/features/*   feature components (client only where interactive)
      └ components/shared/* cross-page primitives
      └ components/ui/*     design-system primitives
lib/                        config, services, hooks, types, API client
packages/contracts/*        shared zod schemas (web↔api source of truth)
packages/model-registry/*   single model/provider/pricing registry
apps/api/src/               Hono app, routes/*, services/*, jobs/processors/*, db/
terminal/                   Go CLI + Bubble Tea TUI (cmd/lf, internal/tui, internal/cloud)
```

### Rules

- **Server-first.** Pages fetch through `lib/services/*` (real API client) and
  render; only interactive bits become client components.
- **Client = island.** A client component never fetches page data itself; it
  receives props from its server parent.
- **One navigation source of truth.** `lib/config/navigation.ts` powers the
  sidebar; `lib/config/commands.ts` powers Cmd+K.
- **Models are never hardcoded in the web layer.** The picker reads from the
  session-authenticated `/api/intelligence` endpoint (model registry + live
  availability), so it never offers models the platform cannot serve.

## Design system

- Theme tokens in `app/globals.css` (`--color-*`): bg `#0e1416`, surface
  `#141b1e`, ink `#f7f8f8`, brand `#f97316` (LayerFlow orange), brand-2 `#44edbc`.
- `Panel` / `PanelHeader` / `PanelBody` / `PanelFooter` are the core surface.
- `Badge` tones: amber, mint, violet, rose, sky, green, red, neutral.
- `Section`, `Row`, `Stat`, `EmptyState`, `ErrorState`, `Skeleton` standardize
  loading / empty / error states.
- Icons come from the Hugeicons shim (`components/ui/icons.tsx`).

## Verification

```bash
npm run typecheck   # strict tsc (root + all workspaces)
npm run lint        # 0 errors
npm test            # web unit tests (vitest)
npm test --workspace @layerflow/api          # API tests (PGlite + mocked Redis)
(cd terminal && go build ./... && go vet ./... && go test -race ./...)
npm run build      # Next.js production build
```

The full dev loop is in `31August.md` -> "Daily dev loop".