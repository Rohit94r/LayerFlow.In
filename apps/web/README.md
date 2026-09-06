# @layerflow/web — LayerFlow browser app

Next.js 16 + React 19 + Tailwind 4 dashboard: chat, agents, prompts, rescue,
billing, history, memory, workspace, team. Also mounts the Hono API
same-origin under `/api/*` and `/v1/*` (no separate API host required).

**Full code map → [`ARCHITECTURE.md`](../../ARCHITECTURE.md) (root).**

## Layout

- `app/` — App Router pages. `(marketing)`, `(auth)`, `(dashboard)` route groups.
- `components/` — `ui/` primitives, `features/` screens, `landing/`, `layout/`.
- `lib/services/` — client service layer (one module per API area).
- `lib/providers/` — React context providers (`auth-provider.tsx` — session
  context backed by `lib/auth-client`).
- `lib/server/` — server-only glue: `hono-app.ts` + `auth-loader.ts` (import
  `apps/api/src` via the `@layerflow/api/src/*` tsconfig path) and
  `install-scripts.ts` (serves `terminal/scripts/install.*` for the `/install*`
  routes).
- `content/blog/` — markdown posts.

## Commands

```bash
npm run dev        # from repo root (starts web + api + worker together)
npm run dev --workspace @layerflow/web   # web only
npm run build --workspace @layerflow/web
npm run test  --workspace @layerflow/web
```

## Env

- `.env.local` — `NEXT_PUBLIC_API_URL` (optional; browser uses same-origin).
- Server-side env (DATABASE_URL, REDIS_URL, BETTER_AUTH_SECRET, …) is read
  from `apps/api/.env` locally, or from Vercel env vars in production.
- **Vercel:** set Root Directory to `apps/web` (Vercel installs the root
  workspace lockfile automatically).
