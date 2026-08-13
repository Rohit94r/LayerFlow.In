#!/usr/bin/env bash
# Deploy LayerFlow API + worker to Fly.io and print DNS steps for api.layerflow.dev.
# Prereqs: flyctl auth login (once), Docker running for image build.
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

# Backend secrets only (skip NEXT_PUBLIC_* — that goes in Vercel).
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

echo "Setting Fly secrets for $APP_NAME…"
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

# Optional platform keys (ignore if unset).
for opt in GROQ_API_KEY GROQ_MODEL GEMINI_API_KEY GEMINI_MODEL RESEND_API_KEY SENTRY_DSN; do
  if grep -qE "^${opt}=" "$ENV_FILE"; then
    "$FLYCTL" secrets set "$opt=$(read_secret "$opt")" --app "$APP_NAME" 2>/dev/null || true
  fi
done

echo "Deploying $APP_NAME (API + worker)…"
"$FLYCTL" deploy --app "$APP_NAME"

echo ""
echo "=== Post-deploy: DNS for api.layerflow.dev ==="
echo "1. At your domain registrar, add:"
echo "   CNAME  api  →  ${APP_NAME}.fly.dev"
echo "2. Then run:"
echo "   $FLYCTL certs add api.layerflow.dev --app $APP_NAME"
echo "   $FLYCTL certs show api.layerflow.dev --app $APP_NAME"
echo ""
echo "3. Verify:"
echo "   curl https://${APP_NAME}.fly.dev/health"
echo "   curl https://api.layerflow.dev/health   (after DNS propagates)"
echo ""
echo "4. Google OAuth: add redirect URI"
echo "   https://api.layerflow.dev/api/auth/callback/google"
echo ""
echo "5. Vercel: ensure NEXT_PUBLIC_API_URL=https://api.layerflow.dev (Production)"
