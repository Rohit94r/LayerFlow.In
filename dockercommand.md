# LayerFlow — Docker Commands Guide (Simple)

Everything you need to run LayerFlow on your VPS.

---

## 🔐 SSH into Your VPS

```bash
ssh rohit@72.60.99.68
# Password: Impiclabs@Rohit01
```

---

## 📁 Your Project Location

Everything goes in: `~/apps/layerflow/`

---

## 🚀 First Time Setup (Run Once)

### Step 1: Clone the code
```bash
cd ~/apps
git clone https://github.com/Rohit94r/LayerFlow.In.git layerflow
cd layerflow
```

### Step 2: Create your secrets file
```bash
cp .env.production .env
nano .env
```

Fill in these MINIMUM required fields:
```
BETTER_AUTH_SECRET=    # Generate: openssl rand -hex 32
PROVIDER_KEYS_KEK=     # Generate: openssl rand -hex 32
POSTGRES_PASSWORD=     # Pick a password
GROQ_API_KEY=          # Get from https://console.groq.com/keys (free)
```

### Step 3: Start everything
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### Step 4: Run database migrations
```bash
docker compose -f docker-compose.prod.yml exec api npx drizzle-kit migrate
```

### Step 5: Check it's working
```bash
curl http://localhost:8787/health/live
# Should return: {"status":"ok"}
```

---

## 📋 Everyday Commands

### See what's running
```bash
docker ps
```

### See logs (live)
```bash
docker compose -f docker-compose.prod.yml logs -f
# Add --tail=50 to see last 50 lines only
```

### See API logs only
```bash
docker compose -f docker-compose.prod.yml logs -f api
```

### See worker logs only
```bash
docker compose -f docker-compose.prod.yml logs -f worker
```

### Restart everything
```bash
docker compose -f docker-compose.prod.yml restart
```

### Restart just the API (fast, no DB restart)
```bash
docker compose -f docker-compose.prod.yml restart api
```

### Stop everything
```bash
docker compose -f docker-compose.prod.yml down
```

### Stop everything + delete databases (WARNING: loses all data)
```bash
docker compose -f docker-compose.prod.yml down -v
```

---

## 🔄 Updating the Code

```bash
cd ~/apps/layerflow
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

That's it. Git pull gets new code, Docker rebuilds and restarts.

---

## 📊 Check Resource Usage

### Container memory usage
```bash
docker stats --no-stream
```

### Disk usage
```bash
docker system df
```

### Clean up old/unused images
```bash
docker image prune -a -f
```

---

## 🐘 Database Commands

### Connect to Postgres directly
```bash
docker compose -f docker-compose.prod.yml exec postgres psql -U layerflow layerflow
```
Then type SQL queries like:
```sql
SELECT * FROM users;
SELECT count(*) FROM ai_chat_sessions;
\q   (to quit)
```

### Run database migrations manually
```bash
docker compose -f docker-compose.prod.yml exec api npx drizzle-kit migrate
```

### Seed demo data (local dev only, never on production)
```bash
docker compose -f docker-compose.prod.yml exec api npx tsx src/db/seed.ts
```

---

## 🔧 Troubleshooting

### "Container exited with code 137"
→ Out of memory. Check `docker logs <container-name>` and reduce memory usage.

### "Port already in use"
→ Something else is using that port. Run `ss -tlnp | grep 3100` to see what.

### "Can't connect to database"
→ Check your DATABASE_URL in .env file.
→ Make sure Postgres container is running: `docker ps | grep postgres`

### "API not starting"
```bash
docker compose -f docker-compose.prod.yml logs api --tail=50
```

### Reset everything fresh
```bash
cd ~/apps/layerflow
docker compose -f docker-compose.prod.yml down -v
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec api npx drizzle-kit migrate
```

---

## 🏗️ How It All Connects

```
Internet
   |
   v
Caddy (port 443)  ← Handles HTTPS for api.layerflow.dev
   |
   v
Caddy (port 3100) ← Proxies to your container
   |
   v
docker-compose.prod.yml
   ├── api (port 8787)     ← The LayerFlow API
   ├── worker              ← Background jobs
   ├── postgres (port 5432)← Database (optional, skip if using Neon)
   └── redis (port 6379)   ← Cache (optional, skip if using Upstash)
```

---

## 💡 Pro Tips

1. **Use Neon for Postgres** (free tier) — saves ~256MB RAM. Get URL at https://neon.tech
2. **Use Upstash for Redis** (free tier) — saves ~128MB RAM. Get URL at https://upstash.com
3. **Get a free Groq API key** at https://console.groq.com/keys — lets you use AI models for free
4. **Run `docker stats`** to monitor memory usage anytime
5. **Set up auto-updates** with cron: `crontab -e` and add:
   ```
   0 4 * * * cd ~/apps/layerflow && git pull && docker compose -f docker-compose.prod.yml up -d --build 2>&1 | logger
   ```
