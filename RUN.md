# LayerFlow — RUN / रन गाइड (Complete Operations Manual)

> दोस्त अगर आपने यह फाइल खोली है तो इसका मतलब आप LayerFlow project चलाना / deploy करना चाहते हैं।
> यह guide **Hindi + English** दोनों में है — जो भी काम करना है नीचे step-by-step मिलेगा।

---

## 🗺️ सबसे पहले — Architecture समझो (Where everything runs)

| क्या (What) | कहाँ (Where) | क्यों (Why) |
|---|---|---|
| **Web Frontend** (`layerflow.dev`) | **Vercel** (Root dir: `apps/web`) | Browser app — Next.js 16 |
| **API** (`api.layerflow.dev`) | **VPS** → `72.60.99.68:3100` | Hono API — Docker |
| **Worker** (BullMQ jobs) | **VPS** → Docker `lf-worker` | Background jobs (rescue, embeddings) |
| **Database (PostgreSQL)** | **Neon** (external/cloud) | Remote Postgres + pgvector |
| **Redis** (queue/cache) | **VPS** → Docker `lf-redis` | Local Redis |
| **Terminal CLI (`lf`)** | User's computer (Go binary) | Talks to `layerflow.dev/api/v1/*` |

```
Browser (layerflow.dev / Vercel)
        │
        ├── Mounts Hono API same-origin  /api/*  /v1/*
        └── Talks to api.layerflow.dev (VPS) when needed

lf CLI (terminal) ──▶ layerflow.dev/api/v1/* ──▶ Vercel ──▶ Neon DB
                                              ──▶ VPS api ──▶ Neon DB + Redis

VPS (72.60.99.68) ──▶ lf-api (:3100→8787)  +  lf-worker  +  lf-redis
```

---

## 🛠️ 1. Local Development (अपने कंप्यूटर पर चलाना)

### Prerequisites (ज़रूरी चीज़ें)
- **Node.js 22+**
- **Docker** (सिर्फ local Postgres/Redis के लिए, optional)
- **Go 1.26+** (सिर्फ `lf` terminal CLI के लिए)

### Install dependencies (पहली बार)
```bash
npm install
```

### Run everything (web + api + worker एक साथ)
```bash
npm run dev
```
यह 3 चीज़ें एक साथ start करता है:
```
Web   → http://localhost:3000
API   → http://localhost:8787
Worker→ background jobs
```

### अलग-अलग चलाना (if needed)
```bash
npm run dev:web      # सिर्फ frontend
npm run dev:api      # सिर्फ API
npm run dev:worker   # सिर्फ worker
```

### Local database (अगर Neon नहीं इस्तेमाल करना)
```bash
docker compose up -d    # Postgres :5432 + Redis :6379
```

### Environment files (ज़रूरी)
```
apps/web/.env.local      → NEXT_PUBLIC_* variables
apps/api/.env            → DATABASE_URL, REDIS_URL, secrets
```

---

## 🖥️ 2. वेरिफाई — Sab kuch sahi chal raha hai? (Health Checks)

### Local checks
```bash
# Web app
curl http://localhost:3000/sign-in

# API liveness
curl http://localhost:8787/health/live      # → {"status":"ok"}

# API full health (db + redis)
curl http://localhost:8787/health           # → {"status":"ok","checks":{"db":true,"redis":true}}
```

### Production checks (लाइव)
```bash
# Frontend
curl https://layerflow.dev/sign-in                              # → 200

# API (VPS)
curl https://api.layerflow.dev/health                           # → db:true, redis:true
curl https://api.layerflow.dev/health/live                      # → 200

# Terminal auth endpoint
curl -X POST https://layerflow.dev/api/v1/auth/device \
  -H 'Content-Type: application/json' \
  -d '{"client_id":"layerflow-lf-cli"}'                          # → device_code मिलता है

# एक साथ सब verify करने के लिए:
npm run check:prod
```

### आसान तरीका (5-second health summary)
```bash
echo "Frontend:"; curl -s -o /dev/null -w "%{http_code}\n" https://layerflow.dev
echo "API:";     curl -s -o /dev/null -w "%{http_code}\n" https://api.layerflow.dev/health
echo "Worker:";  curl -s -o /dev/null -w "%{http_code}\n" https://layerflow.dev/api/lf-health
```
सब `200` आए तो सब कुछ ठीक है। ✅

---

## 🐳 3. Docker — Important Commands (VPS पर)

> सारे docker commands VPS पर चलते हैं। SSH करो पहले:
> `ssh rohit@72.60.99.68`

### Docker compose file
```bash
cd ~/apps/layerflow
COMPOSE="docker compose -f docker-compose.vps.yml"
```

### Basic Commands (रोज़मर्रा)

| काम (Task) | Command |
|---|---|
| सब start करो | `$COMPOSE up -d` |
| सब stop करो | `$COMPOSE down` |
| सब restart करो | `$COMPOSE restart` |
| नई build + start | `$COMPOSE up -d --build` |
| Container status dekho | `docker ps` |
| Memory/RAM dekho | `docker stats` |
| डिस्क space dekho | `docker system df` |
| API logs dekho | `$COMPOSE logs -f api` |
| Worker logs dekho | `$COMPOSE logs -f worker` |
| सब हटा दो (data भी) | `$COMPOSE down -v` |

### Deploy / Update (नया code डालना)
```bash
cd ~/apps/layerflow
git pull origin main          # नया code लाओ
$COMPOSE build                # नए images बनाओ
$COMPOSE up -d                # नए containers चलाओ
```

### बिना रुके update (safe: old khilta rahe jab tak naya ban jaye)
```bash
cd ~/apps/layerflow
git pull origin main
$COMPOSE build api worker
$COMPOSE up -d api worker
```

### सिर्फ एक service
```bash
$COMPOSE up -d api        # सिर्फ API
$COMPOSE up -d worker     # सिर्फ worker
$COMPOSE restart redis    # सिर्फ Redis restart
```

### Migration (database schema update — Neon)
```bash
cd ~/apps/layerflow
$COMPOSE exec -T api node dist/index.js  # note: migrate flag हट गया है नई build में
```
> ⚠️ नई code में `--migrate` flag नहीं है। Neon DB पे 76 tables already हैं।
> नई migration लगानी हो तो:
> ```bash
> $COMPOSE exec -T api sh -c 'node -e "const {migrate}=require(\"drizzle-orm/node-postgres/migrator\");const {drizzle}=require(\"drizzle-orm/node-postgres\");const {Pool}=require(\"pg\");const p=new Pool({connectionString:process.env.DATABASE_URL});migrate(drizzle(p),{migrationsFolder:\"/app/drizzle\"}).then(()=>{console.log(\"OK\");process.exit(0)}).catch(e=>{console.error(e.message);process.exit(1)})"'
> ```

### Docker space cleanup (जगह बचाना)
```bash
docker builder prune -f      # पुराने build cache हटाओ
docker image prune -f        # unused images हटाओ
docker system df             # check करो कितनी जगह है
```
> यह हर हफ़्ते चला दो तो VPS space कभी नहीं भरेगा।

### Container access (अंदर जाना)
```bash
$COMPOSE exec -it api sh        # API container के अंदर
$COMPOSE exec -it worker sh     # Worker के अंदर
$COMPOSE exec -it redis redis-cli ping   # Redis test → PONG
$COMPOSE exec -it postgres psql -U layerflow -d layerflow   # Postgres में
```

### अगर कुछ टूट जाए (Troubleshoot)
```bash
# 1. Logs dekho
$COMPOSE logs --tail 100 api

# 2. Container restart
$COMPOSE restart api

# 3. पूरी rebuild (cache हटा कर)
$COMPOSE build --no-cache api worker
$COMPOSE up -d

# 4. सब reset
$COMPOSE down
$COMPOSE up -d
```

---

## 💻 4. Terminal CLI (`lf`) — Important

### क्या है
- `lf` एक **Go CLI** है जो आपके computer पे चलता है (VPS पर नहीं!)
- यह `layerflow.dev/api/v1/*` से बात करता है (Vercel same-origin)

### Install (पहली बार)
```bash
curl -fsSL https://layerflow.dev/install.sh | bash
# या Windows: PowerShell में https://layerflow.dev/install.ps1
```

### Login (सबसे ज़रूरी!)
```bash
lf login
# browser खुलेगा → device code approve करो → बस done
```

### Common commands
```bash
lf chat          # नई chat शुरू करो
lf run "task"    # एक task
lf sessions      # sessions dekho
lf sync          # cloud से sync करो
lf cost          # usage/cost dekho
lf doctor        # diagnostics check
lf models        # available models
lf mcp           # MCP server management
lf upgrade       # नया version check
lf --help        # सब commands
```

### Verify terminal ठीक है?
```bash
lf doctor    # PASS आना चाहिए (storage, git, workspace)
```
अगर `authentication not signed in` दिखे → `lf login` करो।

---

## 🚀 5. Production Cheat Sheet (VPS — पूरा summary)

| Service | Container | Port | Status Check |
|---|---|---|---|
| API | `lf-api` | host:3100 → 8787 | `curl http://localhost:3100/health` |
| Worker | `lf-worker` | internal | `$COMPOSE logs -f worker` |
| Redis | `lf-redis` | 6379 | `docker exec lf-redis redis-cli ping` → PONG |
| Postgres | `lf-postgres` | 5432 | `docker exec lf-postgres pg_isready` |

**Live URLs:**
- Web: `https://layerflow.dev`
- API: `https://api.layerflow.dev`
- API health: `https://api.layerflow.dev/health`

**DNS records (registrar पर):**
```
layerflow.dev    A  → 216.198.79.1    (Vercel)
api.layerflow.dev A → 72.60.99.68     (VPS)
```

---

## 🔧 6. Deployment — Step-by-Step (नई VPS बनानी हो तो)

```bash
# 1. VPS पे SSH
ssh rohit@72.60.99.68

# 2. Repo clone
cd ~ && mkdir -p apps && cd apps
git clone https://github.com/Rohit94r/LayerFlow.In.git layerflow
cd layerflow

# 3. .env बनाओ (Neon + secrets)
cp .env.production .env
nano .env   # DATABASE_URL (Neon), REDIS_URL, BETTER_AUTH_SECRET, आदि

# 4. Build + start
docker compose -f docker-compose.vps.yml up -d --build

# 5. Health check
curl http://localhost:3100/health   # → {"status":"ok","checks":{"db":true,"redis":true}}
```

### VPS resource limits (2GB-ढंग से)
`docker-compose.vps.yml` में already set हैं:
```
API:     512MB limit / 256MB reserve
Worker:  256MB limit / 128MB reserve
Postgres: 256MB limit / 128MB reserve
Redis:   128MB limit / 64MB reserve
```
कुल: ~1.2GB → 2GB RAM पे चल जाता है आराम से। ✅

### Actual usage (abhi VPS पे)
```
Rohit VPS (72.60.99.68): 7.8GB RAM total | ~250MB used by containers
Disk: 96GB total | 77GB free
```

---

## 🧹 7. Weekly Maintenance (हर हफ़्ते 2 मिनट)

```bash
# space साफ़
docker builder prune -f && docker image prune -f

# server update
cd ~/apps/layerflow && git pull origin main && docker compose -f docker-compose.vps.yml up -d --build

# सब ठीक है?
curl -s https://api.layerflow.dev/health
lf doctor
```

---

## ❓ 8. FAQ / Troubleshooting

| Problem | Solution |
|---|---|
| `API not reachable` | `docker compose -f docker-compose.vps.yml ps` → सब up है? |
| `db:false` in health | Neon का `DATABASE_URL` .env में सही है? Neon dashboard खोलो |
| `redis:false` | `docker exec lf-redis redis-cli ping` → PONG चाहिए |
| करोड़ों disk full | `docker system prune -af` (सावधानी: unused सब हटेगा) |
| `lf login` नहीं होता | `lf doctor` run करो; network check करो (`curl layerflow.dev`) |
| Web अपडेट नहीं | Vercel dashboard → production deploy |
| API पुराना है | `git pull` + rebuild (ऊपर section 3) |

---

## 📁 Folder Map (files कहाँ हैं)

```
LayerFlow/
├── apps/
│   ├── web/          → Next.js frontend (Vercel पर जाता है)
│   └── api/          → Hono API + Worker (Docker image बनता है)
├── packages/
│   ├── contracts/    → Shared types (zod schemas)
│   └── model-registry/ → Model catalog
├── terminal/         → Go CLI (`lf`) source
├── scripts/          → Deploy/ops scripts
├── docs/             → दस्तावेज़
├── Dockerfile        → API production image
└── docker-compose*.yml → Docker configs
```

---

© LayerFlow — Last updated: 2026-09-06