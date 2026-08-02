# LayerFlow — Dashboard Architecture

> Architecture and conventions for the auth-gated workspace (`app/(dashboard)`).

## Route groups

| Group | Purpose |
| --- | --- |
| `app/(marketing)/` | Public landing + pricing |
| `app/(auth)/sign-in` | Sign-in (better-auth) |
| `app/(dashboard)/` | Auth-gated workspace; `layout.tsx` → `AppShell` (force-dynamic) |

The dashboard has 14 pages: home, workspace (+ `[projectId]`), prompts
(+ `[id]`), passports (+ `[id]`), rescue, code, agents, history, search,
models, costs, billing, keys, settings. The navigation config drives the
sidebar, topbar and command palette.

## Layering

```
app/(dashboard)/*          pages (server-first)
  └ components/features/*  feature components (client where interactive)
      └ components/shared/*  cross-page primitives
          └ components/ui/*  design-system primitives
              └ lib/         config, services, data, hooks, types
```

### Rules

- **Server-first.** Pages fetch through `lib/services/*` and render; only
  interactive bits become client components (e.g. `PassportActions`).
- **Client = island.** A client component never fetches page data itself; it
  receives props from its server parent. Pages fetch once, pass data down.
- **Services are the seam.** `lib/services/*` expose async methods backed by
  `lib/data/*` mocks today; the typed live client (`lib/api/index.ts`) is kept
  for the backend swap. Never import `lib/data/*` directly from a page.
- **One navigation source of truth.** `lib/config/navigation.ts` (14 items)
  powers the sidebar; `lib/config/commands.ts` powers Cmd+K; site constants
  live in `lib/config/site.ts`.

## Design system

- Theme tokens in `app/globals.css` (`--color-*`): bg `#0e1416`, surface
  `#141b1e`, ink `#f7f8f8`, brand `#f97316`, brand-2 `#44edbc`. Note:
  `--color-crimson` is also `#f97316` (orange) — don't expect red.
- `Panel` / `PanelHeader` / `PanelBody` / `PanelFooter` are the core surface;
  prefer them over ad-hoc card markup. (Legacy `Card` is deleted.)
- `Badge` tones: amber, mint, violet, rose, sky, green, red, neutral. Use
  `mint` — there is no `emerald` tone (though Tailwind's `text-emerald-400`
  is fine for inline accents).
- Shared list framing: `Section` (panel + "View all" link) + `Row` (hover-arrow
  list item) + `Stat` (metric tile). `EmptyState` and `ErrorState` are
  first-class for loading/empty/error states; `app/(dashboard)/loading.tsx`
  and `error.tsx` cover the group.
- Buttons: `primary` (brand), `secondary`, `ghost`, `outline`, `gradient`,
  `danger` (crimson). `loading` prop renders a spinner in place of the icon.
- `Tabs`, `Table`, `Switch`, `Dialog`, `DropdownMenu`, `Progress`, `Kbd`,
  `Skeleton` round out the primitives. Icons come from the Hugeicons shim
  (`components/ui/icons.tsx`) — add new icons there as `createIcon(H.XIcon)`.

## Patterns

- **Copy feedback:** `useCopy()` from `lib/hooks/` — boolean `copied` + `copy(text)`.
- **Command palette:** `useCommandMenu` hook + `components/layout/command-menu.tsx`.
- **Theme sync:** `lib/theme.ts` `THEME_EVENT` + `emitThemeToggle` (ThemeToggle
  in the topbar dispatches; globals listen).
- **Loading:** mock services resolve immediately, but pages assume async —
  wrap client-heavy views in `Suspense` with `Skeleton` fallbacks.
- **Lint:** `react-hooks/set-state-in-effect` is on — reset state during
  render (prev-open pattern) or inside timers, not synchronously in effects.

## Mock ↔ real backend swap

1. Implement the same interface in `lib/api/` for each service
   (e.g. `workspaceService.getProject(id)` → `api.workspace.getProject(id)`).
2. Replace the body of `lib/services/*`; page code does not change.
3. Auth is already real (better-auth via `/api/auth/*`).

## Verification

```bash
npm run typecheck   # strict tsc
npm run lint        # next/core-web-vitals (0 errors)
npm run build       # production build
npx next start -p 3199  # then curl /home /workspace … for 200s
```
