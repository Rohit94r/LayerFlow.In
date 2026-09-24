#!/usr/bin/env bash
# ── LayerFlow: deploy to Hostinger VPS (2GB RAM) ──────────────────────────────
# Run this ON your VPS after cloning the repo.
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# ── Check prerequisites ───────────────────────────────────────────────────────
command -v docker >/dev/null 2>&1 || error "Docker not installed. Run: curl -fsSL https://get.docker.com | sh"
command -v git >/dev/null 2>&1 || error "Git not installed"

# ── Setup ────────────────────────────────────────────────────────────────────
cd /opt/layerflow 2>/dev/null || {
  REPO="https://github.com/Rohit94r/LayerFlow.In.git"
  info "Cloning $REPO into /opt/layerflow..."
  sudo git clone "$REPO" /opt/layerflow
  cd /opt/layerflow
}

# ── Environment ───────────────────────────────────────────────────────────────
if [[ ! -f .env ]]; then
  cp .env.production .env
  warn "Edit .env with your secrets: nano .env"
  warn "Then re-run this script to deploy."
  exit 0
fi

# ── Docker Compose file ───────────────────────────────────────────────────────
COMPOSE_FILE="docker-compose.prod.yml"

# ── Decide: local DB vs managed DB ────────────────────────────────────────────
if grep -qE "^DATABASE_URL=postgres://" .env && ! grep -q "@postgres" .env; then
  info "Using managed Postgres (Neon or similar)"
  LOCAL_DB=""
else
  info "Using local Postgres (will use ~256MB RAM)"
  LOCAL_DB="--profile local-db"
fi

if grep -qE "^REDIS_URL=redis://" .env && ! grep -q "@redis" .env; then
  info "Using managed Redis (Upstash or similar)"
  LOCAL_REDIS=""
else
  info "Using local Redis (will use ~64MB RAM)"
  LOCAL_REDIS="--profile local-db"
fi

# ── Build and start ───────────────────────────────────────────────────────────
info "Building Docker images..."
docker compose -f "$COMPOSE_FILE" build --pull

info "Starting services..."
# Start managed-DB services first (no profiles), then local-DB if needed
if [[ -n "$LOCAL_DB" || -n "$LOCAL_REDIS" ]]; then
  docker compose -f "$COMPOSE_FILE" $LOCAL_DB up -d postgres redis 2>/dev/null || true
  sleep 5
fi

docker compose -f "$COMPOSE_FILE" up -d

# ── Health check ──────────────────────────────────────────────────────────────
info "Waiting for API to be healthy..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:8787/health/live >/dev/null 2>&1; then
    info "API is healthy!"
    break
  fi
  if [[ "$i" -eq 30 ]]; then
    warn "API health check timed out. Check logs: docker compose -f $COMPOSE_FILE logs api"
  fi
  sleep 2
done

# ── Run DB migrations ─────────────────────────────────────────────────────────
info "Running database migrations..."
docker compose -f "$COMPOSE_FILE" exec -T api node dist/index.js --migrate 2>/dev/null || {
  warn "Could not run migrations automatically. Run manually:"
  warn "  docker compose -f $COMPOSE_FILE exec -T api npx drizzle-kit migrate"
}

# ── Summary ───────────────────────────────────────────────────────────────────
info "═══ Deployment Complete ═══"
info ""
info "API:        http://localhost:8787/health/live"
info "Public:     https://api.layerflow.dev (after DNS + SSL)"
info ""
info "Logs:       docker compose -f $COMPOSE_FILE logs -f"
info "Restart:    docker compose -f $COMPOSE_FILE restart"
info "Stop:       docker compose -f $COMPOSE_FILE down"
info "Update:     git pull && docker compose -f $COMPOSE_FILE up -d --build"
info ""

# ── SSL setup (if DNS is ready) ───────────────────────────────────────────────
if command -v dig >/dev/null 2>&1; then
  IP=$(curl -4 -sf ifconfig.co 2>/dev/null || echo "")
  DNS_IP=$(dig +short api.layerflow.dev 2>/dev/null || echo "")
  if [[ -n "$IP" && "$IP" == "$DNS_IP" ]]; then
    info "DNS is pointing here! Run SSL setup:"
    info "  docker compose -f $COMPOSE_FILE run --rm certbot certonly --webroot \"
    info "    -w /var/www/certbot -d api.layerflow.dev"
    info "  docker compose -f $COMPOSE_FILE restart nginx"
  else
    warn "DNS not pointing here yet. Set A record: api.layerflow.dev -> $IP"
  warn ""
  fi
fi
