#!/usr/bin/env bash
# Deploy LayerFlow API + BullMQ worker to Fly.io (via Docker) and print DNS
# steps for api.layerflow.dev.
#
# Grouped by fly.toml into TWO processes from ONE image (apps/api/Dockerfile):
#   - app    -> Hono API on :8787
#   - worker -> BullMQ worker on :9091 (health default via WORKER_HEALTH_PORT)
#
# Prereqs:
#   - flyctl installed: https://fly.io/docs/hands-on/install-flyctl/
#   - logged in:        flyctl auth login  (once)
#   - Docker running    (needed for the image build)
#   - secrets file      (.vercel.env by default) — source of truth for env vars
#
# Usage:  npm run deploy:api          # or: bash scripts/deploy-api-prod.sh
#         ENV_FILE=fly.env bash scripts/deploy-api-prod.sh   # alternate file
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

FLYCTL="${FLYCTL:-}"
if [[ -z "$FLYCTL" ]]; then
  if command -v flyctl >/dev/null 2>&1; then
    FLYCTL=flyctl
  elif [[ -x "$HOME/.fly/bin/flyctl" ]]; then
    FLYCTL="$HOME/.fly/bin/flyctl"
  else
    echo "Install flyctl: https://fly.io/docs/hands-on/install-flyctl/"
    exit 1
  fi
fi

if ! "$FLYCTL" auth whoami >/dev/null 2>&1; then
  echo "Not logged in. Run: $FLYCTL auth login"
  exit 1
fi

ENV_FILE="${ENV_FILE:-$ROOT/.vercel.env}"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE — copy secrets from docs/DEPLOYMENT.md"
  exit 1
fi

read_secret() {
  local key="$1"
  local val
  val="$(grep -E "^${key}=" "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '\r' || true)"
  if [[ -z "$val" ]]; then
    echo "Missing $key in $ENV_FILE" >&2
    exit 1
  fi
  printf '%s' "$val"
}

APP_NAME="${FLY_APP_NAME:-layerflow-api}"

if ! "$FLYCTL" apps list 2>/dev/null | grep -q "$APP_NAME"; then
  echo "Creating Fly app: $APP_NAME"
  "$FLYCTL" apps create "$APP_NAME" || true
fi

# ── Required secrets (the API refuses to start without these) ────────────────
echo "Setting required Fly secrets for $APP_NAME…"
"$FLYCTL" secrets set \
  DATABASE_URL="$(read_secret DATABASE_URL)" \
  REDIS_URL="$(read_secret REDIS_URL)" \
  BETTER_AUTH_SECRET="$(read_secret BETTER_AUTH_SECRET)" \
  BETTER_AUTH_URL="$(read_secret BETTER_AUTH_URL)" \
  GOOGLE_CLIENT_ID="$(read_secret GOOGLE_CLIENT_ID)" \
  GOOGLE_CLIENT_SECRET="$(read_secret GOOGLE_CLIENT_SECRET)" \
  PROVIDER_KEYS_KEK="$(read_secret PROVIDER_KEYS_KEK)" \
  WEB_URL="$(read_secret WEB_URL)" \
  API_URL="$(read_secret API_URL)" \
  CORS_ORIGINS="$(read_secret CORS_ORIGINS)" \
  --app "$APP_NAME"

# ── Optional secrets (set when present in the file) ──────────────────────────
set_optional() {
  local key="$1"
  if grep -qE "^${key}=" "$ENV_FILE"; then
    "$FLYCTL" secrets set "$key=$(read_secret "$key")" --app "$APP_NAME"
  fi
}

echo "Setting optional Fly secrets for $APP_NAME…"
for opt in \
  GROQ_API_KEY GROQ_MODEL \
  GEMINI_API_KEY GEMINI_MODEL \
  DEEPSEEK_API_KEY DEEPSEEK_MODEL \
  KIMI_API_KEY KIMI_MODEL \
  XAI_API_KEY XAI_MODEL \
  ELEVENLABS_API_KEY ELEVENLABS_VOICE_ID ELEVENLABS_MODEL_ID \
  RESEND_API_KEY FROM_EMAIL \
  SENTRY_DSN \
  COOKIE_DOMAIN ADMIN_EMAILS \
  DODO_PAYMENTS_API_KEY DODO_PAYMENTS_WEBHOOK_KEY DODO_PAYMENTS_ENVIRONMENT \
  DODO_PAYMENTS_RETURN_URL DODO_BILLING_CURRENCY \
  DODO_PRODUCT_STARTER DODO_PRODUCT_PRO DODO_PRODUCT_TEAM \
  GMAIL_USER GMAIL_APP_PASSWORD \
  R2_ACCOUNT_ID R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY R2_BUCKET \
; do
  set_optional "$opt"
done

# ── Deploy (builds the Docker image, release_command runs DB migrations) ─────
echo "Deploying $APP_NAME (app + worker)…"
"$FLYCTL" deploy --app "$APP_NAME"

# ── Ensure both process groups are running ───────────────────────────────────
echo "Ensuring app=1 worker=1…"
"$FLYCTL" scale count app=1 worker=1 --yes --app "$APP_NAME" 2>/dev/null || \
  "$FLYCTL" scale count app=1 worker=1 --app "$APP_NAME"

echo ""
echo "=== Post-deploy verification ==="
echo "   curl -s  https://${APP_NAME}.fly.dev/health          # API"
echo "   curl -s  https://${APP_NAME}.fly.dev:9091/health     # worker (after a few s)"
echo ""
echo "=== Custom host: api.layerflow.dev ==="
echo "1. At your domain registrar, add a CNAME record:"
echo "   NAME api   TARGET ${APP_NAME}.fly.dev"
echo "2. Then run:"
echo "   $FLYCTL certs add api.layerflow.dev --app $APP_NAME"
echo "   $FLYCTL certs show api.layerflow.dev --app $APP_NAME"
echo ""
echo "3. Output of scripts/check-production.sh should be all green:"
echo "   npm run check:prod"
echo ""
echo "4. Google OAuth: the browser flow runs on the web host (same-origin)."
echo "   Register this EXACT redirect URI in Google Cloud Console:"
echo "   https://layerflow.dev/api/auth/callback/google"
echo ""
echo "5. Vercel: keep BETTER_AUTH_URL=https://layerflow.dev (== WEB_URL)."
echo "   api.layerflow.dev is only for this Fly API/worker, not for OAuth."