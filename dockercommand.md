# LayerFlow — Commands You Actually Need

Your production setup: **frontend + backend on Vercel, database on Neon, Redis on Upstash.**
The VPS Docker stack is optional (backup/legacy). Local dev needs Postgres + Redis.

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

## 🌐 PRODUCTION (Vercel + Neon) — verify it's live

```bash
# Frontend + backend health (same-origin API mode)
curl -s https://layerflow.dev/api/lf-health
# → {"ok":true,"mode":"same-origin-api","status":"ok"}

# Auth session endpoint
curl -s https://layerflow.dev/api/auth/get-session     # null when signed out

# Terminal login endpoint (device flow)
curl -s -X POST https://layerflow.dev/api/v1/auth/device \
  -H 'Content-Type: application/json' -d '{}'
# → {"device_code":"...","user_code":"ABC123","verification_uri":"..."}
```

### Deploy a code change
```bash
git push            # if Vercel is connected to GitHub it auto-deploys
# or explicit:
npx vercel --prod
```

### Change env vars
Vercel Dashboard → your project → Settings → Environment Variables.
Required there: `DATABASE_URL`, `REDIS_URL`, `BETTER_AUTH_SECRET`,
`BETTER_AUTH_URL`, `WEB_URL`, `API_URL`, `PROVIDER_KEYS_KEK`,
`NEXT_PUBLIC_API_URL`, plus any provider keys (GROQ/GEMINI/...).

---

## 💻 TERMINAL APP (`lf`)

```bash
cd terminal
./lf doctor          # diagnostics — all PASS except config/auth on first run
./lf login           # authenticate (device flow opens layerflow.dev, or paste a platform API key)
./lf models          # list available models
./lf chat            # ask questions in the terminal
./lf sessions        # list/restore previous sessions
./lf cost            # token + cost usage
./lf logout          # revoke + purge credentials
```

---

## 🐘 OPTIONAL: VPS Docker stack (only if you use the VPS backend)

```bash
ssh rohit@72.60.99.68                 # password auth
cd ~/apps/layerflow

git pull                              # get latest code
docker compose -f docker-compose.vps.yml up -d --build   # build + start all 4 containers
./scripts/vps-migrate.sh              # apply DB migrations to the VPS Postgres

docker ps                             # what's running
docker compose -f docker-compose.vps.yml logs -f api     # API logs
docker compose -f docker-compose.vps.yml logs -f worker  # worker logs
docker compose -f docker-compose.vps.yml restart api     # restart API only
docker compose -f docker-compose.vps.yml down            # stop everything
docker stats --no-stream              # memory per container
curl http://localhost:3100/health/ready                  # {"status":"ok",...}
```

---

## 🔧 Quick troubleshooting

| Symptom | Fix |
|---|---|
| `lf login` fails with 500 once | cold-start race — retry; 2nd attempt works |
| `ECONNREFUSED 5432/6379` locally | run `docker compose up -d` or point `.env` at Neon/Upstash |
| API 500 on a DB route | check migrations applied to Neon (`drizzle-kit migrate`) |
| Vercel deploy fails | run `npm run build` locally first — it must pass |
| Need a fresh local DB | `docker compose down -v && docker compose up -d` |
