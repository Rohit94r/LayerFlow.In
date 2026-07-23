# Database (Neon + local)

Forward-only Drizzle migrations live in `apps/api/drizzle/`. Schema source of
truth: `apps/api/src/db/schema/`. Production Postgres is Neon; local Docker is
optional for offline work.

> **Never run `db:seed` against Neon production.** Seeding inserts a sample
> user (`alex@layerflow.dev`) and demo workspace data. The seed script refuses
> remote URLs unless you override with `ALLOW_PROD_SEED=1` (not recommended).

---

## Copy-paste: first-time / Neon setup

From the **repo root**:

```bash
# 1. Install
npm install

# 2. Backend env (secrets are gitignored — never commit)
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env — set DATABASE_URL to your Neon connection string
# (Neon console → Connection details → URI, include ?sslmode=require)

# 3. Frontend env
cp .env.example .env.local
# Keep NEXT_PUBLIC_API_URL=http://localhost:8787 for local full-stack

# 4. Push tables to Neon (forward-only; safe to re-run)
npm run db:migrate --workspace @layerflow/api

# 5. Sanity-check migration SQL (in-memory Postgres — does not touch Neon)
npm run db:verify --workspace @layerflow/api

# 6. Run full stack (web :3000 + API :8787)
npm run dev

# 7. Optional: BullMQ worker (needed for Compare / digests)
npm run worker --workspace @layerflow/api
# or from root: npm run dev:worker
```

### Optional local Docker (instead of Neon)

```bash
docker compose up -d   # Postgres (pgvector) + Redis on localhost
# Point DATABASE_URL / REDIS_URL at the docker-compose defaults in .env.example
npm run db:migrate --workspace @layerflow/api
```

### Optional seed — **local / demo only**

```bash
# Only when DATABASE_URL is local (localhost / docker). Refuses Neon.
npm run db:seed --workspace @layerflow/api
```

Creates `alex@layerflow.dev`, a sample workspace, prompts, and learning paths.
Real sign-in (Google) creates a real workspace via onboarding — no seed needed.

---

## Check tables in the Neon console

1. Open [console.neon.tech](https://console.neon.tech) → your project.
2. **SQL Editor** (or Tables) → run:

```sql
-- How many public tables?
SELECT count(*) FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

-- Applied Drizzle migrations
SELECT id, hash, created_at FROM drizzle.__drizzle_migrations ORDER BY id;

-- Spot-check: no demo user on production
SELECT email FROM users WHERE email = 'alex@layerflow.dev';
```

Expect **57** public tables after migrations `0000`–`0002`. The demo email
query should return **no rows** on production.

---

## Scripts reference

| Command | What it does |
|---------|----------------|
| `npm run db:migrate --workspace @layerflow/api` | Apply pending migrations to `DATABASE_URL` |
| `npm run db:verify --workspace @layerflow/api` | Apply all migrations in-memory (no Docker / no Neon) |
| `npm run db:generate --workspace @layerflow/api` | Generate a new migration from schema edits |
| `npm run db:seed --workspace @layerflow/api` | Local/demo data only — blocked on Neon by default |

Deploy also migrates: Fly `release_command` runs `db:migrate` (see `fly.toml`).
No deploy path runs seed.
