# Learn Docker + VPS — The Easy Way

A single-file guide to Docker and server (VPS) work, using **LayerFlow's own
setup** as the example. No jargon dumped on you — every command comes with
*what it does*, *why you'd use it*, and a real example you can run.

If you only remember 3 things, remember these:

1. **Image** = the recipe (a ready-made snapshot of an OS + your app).
2. **Container** = one running copy of a recipe (like a pizza made from a recipe).
3. **docker compose** = a script that runs many containers together with one command.

---

## 1. What is Docker? (the mental model)

Docker packages your app so it **runs identically everywhere** — your laptop, a
friend's server, anywhere. No more "it works on my machine."

Instead of installing PostgreSQL, Redis, and your app by hand on a server, you
run each inside a small box. Each box:

- has its own files (doesn't touch the server's other files),
- can talk to other boxes (over a network),
- keeps its data safe in a "volume" even when the box is replaced,
- is disposable — delete and recreate it freely, like a LEGO build.

Concrete: LayerFlow's VPS runs **4 boxes** side by side:

| Box (container) | What it does |
|---|---|
| `lf-api` | Your Hono API (port 3100) |
| `lf-worker` | Background jobs (BullMQ) |
| `lf-postgres` | PostgreSQL database (pgvector) |
| `lf-redis` | Redis cache + queue |

If the API container crashes, you recreate just that one box. The database keeps
its data. Nothing else is affected.

---

## 2. Image vs Container vs Compose (the ABC)

| Word | Meaning | LayerFlow example |
|---|---|---|
| **Image** | A frozen recipe. Read-only. | `layerflow/api:latest`, `postgres:16` |
| **Container** | A running copy of an image. | `lf-api`, `lf-worker` |
| **Volume** | A mounted storage area that survives. | `lf-pgdata` (your database files) |
| **Network** | The wires between containers. | `lf-net` |
| **Compose** | A YAML file describing all of the above. | `docker-compose.vps.yml` |

Analogy: an image is a **class**, a container is an **object** created from it.
You can create 10 objects from 1 class. Each is independent.

---

## 3. The 10 commands that matter (each with its use case)

Run these on a server (or locally). They are the same everywhere.

### 3.1 `docker ps` — "what is running right now?"
- **Use case:** The first thing you type when something is wrong.
- **Why:** Shows every running container, its image, ports, and uptime.

```bash
docker ps                   # running containers only
docker ps -a                # ALL containers, including stopped/exited
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"   # tidy output
```

### 3.2 `docker run` — "start a container from an image"
- **Use case:** Run a one-off container (e.g. a Postgres test).
- **Why:** Powerful but verbose; you usually prefer compose for multi-container apps.

```bash
docker run -d --name my-redis -p 6379:6379 redis:7-alpine
```

Flags explained:
- `-d` = detached (run in background, don't block the terminal)
- `--name` = give the container a name instead of a random one
- `-p 6379:6379` = map **host port 6379** to **container port 6379** (see §4)

### 3.3 `docker logs` — "why is my app failing?"
- **Use case:** Debugging. This is your primary diagnostic tool.
- **Why:** Containers are mostly headless; logs replace the console.

```bash
docker logs lf-api                # last logs
docker logs --tail 100 lf-api     # last 100 lines
docker logs -f lf-worker          # follow live (like tail -f)
```

### 3.4 `docker exec` — "get inside the box"
- **Use case:** Run a command inside a running container (test Redis, open psql, inspect files).
- **Why:** Lets you poke around without SSH-ing into every service.

```bash
docker exec lf-redis redis-cli ping        # → PONG (calls redis inside the container)
docker exec -it lf-api sh                  # interactive shell inside the API container
docker exec lf-postgres pg_isready -U layerflow   # is postgres ready?
```

`-it` = interactive terminal (you can type). Leave it off for one-shot commands.

### 3.5 `docker stop` / `docker start` — "pause and resume"
- **Use case:** Restart a misbehaving container, or stop work to save RAM.
- **Why:** Stopping keeps the container and its files; starting resumes it fast.

```bash
docker stop lf-api
docker start lf-api
```

### 3.6 `docker restart` — "quick reset"
- **Use case:** App is stuck; cleanest first move.
- **Why:** One command instead of stop + start.

```bash
docker restart lf-api
```

### 3.7 `docker rm` — "delete a container"
- **Use case:** Remove a broken/unused container before recreating it.
- **Why:** Containers are disposable; deleting is normal and safe (data lives in volumes, §5).

```bash
docker rm lf-api
docker rm -f lf-api          # force-remove even if running
```

### 3.8 `docker images` / `docker rmi` — "manage the recipes"
- **Use case:** Check what images exist and free disk space.
- **Why:** Old images pile up and eat disk (a common VPS problem).

```bash
docker images                # list images
docker rmi layerflow/api:old # delete one image
```

### 3.9 `docker stats` — "how much RAM is everyone using?"
- **Use case:** Your VPS has 2GB RAM and suddenly everything is slow.
- **Why:** Shows live CPU/memory per container — the proof for "who ate the RAM."

```bash
docker stats
```

### 3.10 `docker system df` — "how full is the disk?"
- **Use case:** Warnings about disk space on the VPS.
- **Why:** Shows images, containers, volumes, and build cache sizes.

```bash
docker system df
```

---

## 4. Ports — the thing everyone gets confused about

A container has its own little IP world. To reach it from outside, you map a
**host port** to the **container port**.

```
Browser / caddy  -->  HOST:3100  -->  CONTAINER:8787 (your API)
```

In `docker-compose.vps.yml`:

```yaml
ports:
  - "3100:8787"
```

- Left number (3100) = the **host** port, what the outside world uses.
- Right number (8787) = the **container** port, where your app listens.

Why 8787? Because LayerFlow's API listens on 8787 inside the box
(`EXPOSE 8787` in the Dockerfile, `CMD ["node", "dist/index.js"]` binds to it).
The host uses 3100 because Caddy already proxies `api.layerflow.dev` to
`localhost:3100`.

**Rule of thumb:** read `host:container`. Change the left side to change the
public port; never change the right side unless your app's port changes.

---

## 5. Volumes — "my data survives a restart?"

**Problem:** Containers are disposable. Delete the Postgres container and its
files vanish — unless you use a volume.

A **volume** is storage that lives *outside* the container. The container mounts
it, so data survives recreation.

In `docker-compose.vps.yml`:

```yaml
volumes:
  - lf-pgdata:/var/lib/postgresql/data   # named volume, mounted at postgres's data dir
  - lf-redisdata:/data                   # redis keeps its data here too
```

Then at the bottom, volumes are declared so they persist:

```yaml
volumes:
  lf-pgdata:
  lf-redisdata:
```

**Why this matters:** Without `lf-pgdata`, every `docker compose down` + `up`
would wipe your database. With it, you can freely rebuild, restart, delete — the
data stays.

> Docker has two mount styles. **Named volumes** (above) are managed by Docker
> and safe. **Bind mounts** map a real folder path like `~/apps/data:/app/data` —
> useful but fragile if the path moves.

---

## 6. Networks — "how do the boxes talk to each other?"

Containers on the same Docker network can talk to each other **by name**.

`docker-compose.vps.yml` creates a private `lf-net`. Inside it:

- the API talks to `postgres:5432` and `redis:6379` — using the *service name* as
  the hostname, not `localhost` — because inside a network, `localhost` is the
  container itself, not the database box next door.
- The `depends_on` block tells Docker to wait until Postgres and Redis report
  healthy before starting the API:

```yaml
depends_on:
  postgres:
    condition: service_healthy
  redis:
    condition: service_healthy
```

**Why this matters:** Your `DATABASE_URL` in `.env` points at
`postgres:5432`, not `localhost:5432`. That only works because of the network.

---

## 7. A Dockerfile — reading your own, line by line

`LayerFlow/Dockerfile` builds the image that runs both `lf-api` and `lf-worker`:

```dockerfile
FROM node:22-alpine AS deps      # stage 1: base image with Node 22 (tiny Linux)
WORKDIR /app                     # all future steps work in /app
COPY package.json package-lock.json ./     # copy dependency manifests first
RUN npm install                  # install dependencies (cached until manifests change)

FROM deps AS build               # stage 2: compile
COPY packages/ ./packages/       # copy source
COPY apps/api/ ./apps/api/
RUN npm run build --workspace @layerflow/api   # builds dist/index.js + dist/worker.js

FROM node:22-alpine AS runtime   # stage 3: the final, lean image
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules   # grab only the finished pieces
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/apps/api/drizzle ./drizzle
HEALTHCHECK --interval=60s ... CMD curl -sf http://localhost:8787/health/live || exit 1
EXPOSE 8787
CMD ["node", "--max-old-space-size=512", "dist/index.js"]   # what runs at start
```

**Multi-stage = small image.** Stages 1–2 need compilers and sources; stage 3
only keeps the compiled output. Result: a ~150MB runtime image instead of one
with gigabytes of build junk. That matters on a 2GB VPS.

Notice `CMD` here runs the **API**. The **worker** uses the *same image* but a
different command, chosen in compose:

```yaml
worker:
  image: layerflow/worker:latest
  command: ["node", "--max-old-space-size=256", "dist/worker.js"]
```

**Why this matters:** build one image, run two processes. The worker overrides
the image's `CMD` with its own.

---

## 8. Docker Compose — one file, many containers

Compose reads a YAML file and turns it into "the whole stack." You never type 10
`docker run` commands; you write them once in YAML and run:

```bash
docker compose -f docker-compose.vps.yml up -d --build
```

Reading your `docker-compose.vps.yml` services:

| Service | Image | Does | Limits |
|---|---|---|---|
| `api` | `layerflow/api:latest` | Must be reachable at host :3100 | 512MB RAM |
| `worker` | `layerflow/worker:latest` | Internal background jobs, no public port | 256MB RAM |
| `postgres` | `pgvector/pgvector:pg16` | Database with pgvector, data in `lf-pgdata` | 256MB RAM |
| `redis` | `redis:7-alpine` | Cache/queue, data in `lf-redisdata` | 128MB RAM |

Key settings you should recognize now:

```yaml
restart: unless-stopped     # if it crashes, restart it — unless you stopped it
env_file: .env              # inject secrets (DATABASE_URL, keys) from the .env file
mem_limit: 512m             # hard cap: this container can never use more than 512MB
mem_reservation: 256m       # soft target: reserve 256MB for it
cpus: 1.0                   # at most 1 full CPU core for this container
networks: [lf-net]          # all services join the private network
```

**Why the limits matter:** the VPS has ~2GB of RAM. If `worker` can burst to 2GB
it could crash the whole server. `mem_limit` guarantees each box stays inside its
budget. Total budget here: ~1.2GB, leaving headroom.

---

## 9. Using it on YOUR VPS (LayerFlow step by step)

SSH into the server first:

```bash
ssh rohit@72.60.99.68
```

### 9.1 The single most common workflow

```bash
cd ~/apps/layerflow
git pull origin main                        # 1. pull the newest code
docker compose -f docker-compose.vps.yml up -d --build   # 2. rebuild + restart
curl http://localhost:3100/health           # 3. confirm it's healthy
```

### 9.2 Normal daily operations

```bash
COMPOSE="docker compose -f docker-compose.vps.yml"

$COMPOSE up -d              # start everything (or `stopped` containers)
$COMPOSE ps                 # status of all services
$COMPOSE down               # stop everything (data stays — volumes persist)
$COMPOSE restart api        # restart just the API
$COMPOSE logs -f api        # follow API logs
$COMPOSE logs --tail 100 worker    # last 100 worker log lines
$COMPOSE exec -T api sh     # shell inside the api container
```

### 9.3 Rebuilding only what changed (faster deploys)

Rebuilding everything every time is wasteful:

```bash
$COMPOSE build api worker      # rebuild only API + worker images
$COMPOSE up -d api worker      # recreate only those two containers
```

Postgres and Redis stay untouched — their data lives in volumes and they
rarely change.

### 9.4 Cleanup (run weekly so the disk never fills)

```bash
docker builder prune -f     # delete old build cache (the biggest space eater)
docker image prune -f       # delete unused images
docker system df            # check how much space you freed
```

**Why:** every build leaves cache layers. Over weeks those can eat GBs on a
96GB disk. Weekly pruning is the cheapest insurance.

---

## 10. The VPS from the outside — what surrounds Docker

Your API lives in Docker, but a few things are *outside* it:

```
Browser ──> api.layerflow.dev (DNS A record → 72.60.99.68)
                └──> Caddy (on the host, port 443/80, handles SSL)
                        └──> localhost:3100 ──> lf-api container (8787 inside)
```

DNS (at your registrar):
```
layerflow.dev     A → 216.198.79.1  (Vercel)
api.layerflow.dev A → 72.60.99.68   (your VPS)
```

**Caddy** runs on the host (not in Docker) and:
- terminates HTTPS (SSL certs, so you type `https://`),
- forwards `api.layerflow.dev` to `localhost:3100`.

That's exactly why the compose file maps the API to port **3100** on the host —
it matches Caddy's forward target. Change it and Caddy can't find the API.

Other host-level basics:
- **SSH**: `ssh rohit@72.60.99.68` — your way in.
- **Firewall**: keep ports open only for what you use (22 SSH, 80/443 Caddy,
  3100 API if you test directly). Docker maps ports, but the host firewall is
  still the gate.
- **Backups**: volumes protect against container recreation, not against disk
  death. Back up `lf-pgdata` (or use Neon, a remote managed Postgres, as this
  project does — then the DB isn't even on the VPS).

---

## 11. Troubleshooting — symptom → command

| Symptom | First command | What to look for |
|---|---|---|
| API is down | `docker ps -a` | Is `lf-api` exited? Note the exit code. |
| API restarts in a loop | `docker logs --tail 100 lf-api` | Read the crash line (missing env? DB? bad code?) |
| health shows `db:false` | `docker exec lf-postgres pg_isready -U layerflow` | Postgres up? Is `DATABASE_URL` set in `.env`? |
| health shows `redis:false` | `docker exec lf-redis redis-cli ping` | Expect `PONG`. |
| Server is slow (low RAM) | `docker stats` | Who is at its `mem_limit`? |
| Disk becoming full | `docker system df` | Prune (see §9.4). |
| Container exits immediately | `docker logs <name>` | Config/command error at boot (bad CMD args). |
| Port conflict | `docker ps` | Is another container already using that host port? |
| Can't reach API from browser | `curl http://localhost:3100/health` | Locally ok? Then Caddy/DNS/firewall, not Docker. |

The golden rule: **read the logs first.** 90% of Docker problems are diagnosed
from `docker logs`, not guesswork.

---

## 12. One-page command cheat sheet

```bash
docker ps                          # what's running
docker ps -a                       # everything, stopped too
docker logs -f lf-api              # live logs
docker exec -it lf-api sh          # shell inside
docker restart lf-api              # quick reset
docker stats                       # RAM/CPU per container
docker system df                   # disk usage
docker system prune -af            # nuke unused everything (careful!)

docker compose -f docker-compose.vps.yml up -d          # start stack
docker compose -f docker-compose.vps.yml up -d --build  # rebuild + start
docker compose -f docker-compose.vps.yml down           # stop stack
docker compose -f docker-compose.vps.yml logs -f api    # API logs
docker compose -f docker-compose.vps.yml exec -T api sh # shell in API
```

---

## 13. Glossary (30-second lookup)

- **Image** — read-only recipe for a container.
- **Container** — a running instance of an image.
- **Volume** — persistent storage mounted into a container; survives recreation.
- **Network** — private wires so containers reach each other by service name.
- **Compose** — YAML that defines a whole multi-container stack.
- **Multi-stage build** — a Dockerfile with several `FROM` stages, keeping only
  the runnable output in the final image.
- **Host port vs container port** — `3100:8787` means outside→3100, inside→8787.
- **Caddy / Nginx** — host-level reverse proxy that handles SSL and forwards to
  a port.
- **VPS** — Virtual Private Server: a rented always-on computer (here, a 2GB
  Hostinger box) where the stack runs 24/7.

---

*Learned with the LayerFlow stack as the example. If you can run
`docker ps`, read `docker logs`, and write a `docker-compose.yml`, you know enough
Docker to run a production service.*