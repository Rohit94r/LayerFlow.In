# LayerFlow — Commands You Actually Need

Your production setup: **backend API + worker on Fly.io (Docker), frontend on
Vercel, database on Neon, Redis on Upstash.**

> Deploying the backend is scripted: `npm run deploy:api`. Full guide:
> `docs/DEPLOYMENT.md`. The old VPS Docker stack is archived under
> `scripts/legacy/`.

---

## 🖥️ LOCAL DEVELOPMENT (day-to-day)

### Option A — no Docker (simplest): point local dev at Neon + Upstash
Edit `apps/api/.env`:
```
DATABASE_URL=<your Neon URL from Vercel env>
REDIS_URL=<your Upstash rediss:// URL from Vercel env>
```
Then just run:
```bash
npm run dev
```
That single command starts ALL THREE processes:
- web     → http://localhost:3000  (Next.js frontend)
- api     → http://localhost:8787  (Hono API)
- worker  → BullMQ background jobs

### Option B — with Docker (isolated local DB)
```bash
docker compose up -d          # starts local Postgres(pgvector) :5432 + Redis :6379
npm run dev                   # starts web + api + worker together
```
Stop the containers when done:
```bash
docker compose down           # stops them (keeps data)
docker compose down -v        # stops AND wipes local data
```

### Run each process in its own terminal (if you prefer)
```bash
npm run dev:web               # terminal 1 — frontend :3000
npm run dev:api               # terminal 2 — API :8787
npm run dev:worker            # terminal 3 — background worker
```

### Local health check
```bash
curl http://localhost:8787/health/live     # {"status":"ok"}
curl http://localhost:3000/api/lf-health   # full same-origin check
```

---

## 🗄️ DATABASE (Neon — production)

### Apply migrations to Neon (after changing the schema)
```bash
# 1. put the Neon DATABASE_URL inline (from Vercel → Settings → Env):
cd apps/api
DATABASE_URL="postgresql://...neon.tech/neondb?sslmode=require" npx drizzle-kit migrate
```

### Inspect Neon directly
```bash
psql "<NEON_DATABASE_URL>" -c "\dt"                            # list tables
psql "<NEON_DATABASE_URL>" -c "SELECT count(*) FROM users;"    # any query
psql "<NEON_DATABASE_URL>" -c "SELECT extname FROM pg_extension;"  # pgvector check
```

### Schema sanity check (should print tables=76)
```bash
psql "<NEON_DATABASE_URL>" -tAc \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';"
```

---

## 🚀 PRODUCTION (Fly.io + Docker + Vercel)

```bash
# Deploy API + worker to Fly (builds apps/api/Dockerfile, DB migration runs as
# the release command, scales app=1 worker=1)
npm run deploy:api

# Verify everything (site, DNS, API + worker health)
npm run check:prod

# Manual Fly operations (alternative to the script)
flyctl logs -a layerflow-api             # API + worker logs
flyctl scale count app=1 worker=1 -a layerflow-api   # machines per process
flyctl secrets list -a layerflow-api     # confirm secrets
flyctl certs add api.layerflow.dev -a layerflow-api  # custom domain cert

# Worker health endpoint (its own Hono app on :9091)
curl -s https://layerflow-api.fly.dev:9091/health
```

### Change env vars for the backend

Edit your local `.vercel.env` (source of truth; `fly.env` is the byte-identical
copy), then re-run `npm run deploy:api` — it re-pushes secrets. Vercel env
changes go in the Vercel dashboard and need a redeploy.

---

## 💻 TERMINAL APP (`lf`)

```bash
cd terminal
./lf doctor          # diagnostics — all PASS except config/auth on first run
./lf login           # paste a platform API key (or `--browser` for device flow)
./lf models          # list available models
./lf chat            # ask questions in the terminal
./lf sessions        # list/restore previous sessions
./lf cost            # token + cost usage
./lf logout          # revoke + purge credentials
```

---

## 🐘 OPTIONAL: Legacy VPS Docker stack (archived — not the production path)

If you ever resurrect the VPS backend, the files live in `scripts/legacy/`
(`docker-compose.vps.yml`, `deploy-vps.sh`, `vps-migrate.sh`, root `Dockerfile`)
and the old commands were:

```bash
ssh rohit@72.60.99.68                 # password auth
cd ~/apps/layerflow
git pull                              # get latest code
docker compose -f docker-compose.vps.yml up -d --build   # build + start all 4 containers
./scripts/vps-migrate.sh              # apply DB migrations to the VPS Postgres
docker compose -f docker-compose.vps.yml logs -f api     # API logs
docker compose -f docker-compose.vps.yml logs -f worker  # worker logs
curl http://localhost:3100/health/ready                  # {"status":"ok",...}
```

> Production path today is Fly.io, not the VPS — see `docs/DEPLOYMENT.md`.

---

## 🔧 Quick troubleshooting

| Symptom | Fix |
|---|---|
| `lf login` fails with 500 once | cold-start race — retry; 2nd attempt works |
| `ECONNREFUSED 5432/6379` locally | run `docker compose up -d` or point `.env` at Neon/Upstash |
| API 500 on a DB route | check migrations applied to Neon (`drizzle-kit migrate`) |
| Vercel deploy fails | run `npm run build` locally first — it must pass |
| Need a fresh local DB | `docker compose down -v && docker compose up -d` |
