#!/usr/bin/env bash
# Print Vercel Production env vars needed for layerflow.dev sign-in.
# Paste values from .vercel.env in Vercel → Settings → Environment Variables.
set -euo pipefail

echo "Set these in Vercel (Production):"
echo ""
cat <<'EOF'
DATABASE_URL          → from Neon
REDIS_URL             → from Upstash (rediss://)
BETTER_AUTH_SECRET    → openssl rand -hex 32
BETTER_AUTH_URL       → https://layerflow.dev   ← NOT api.layerflow.dev
WEB_URL               → https://layerflow.dev
API_URL               → https://api.layerflow.dev
CORS_ORIGINS          → https://layerflow.dev
PROVIDER_KEYS_KEK     → 64 hex chars
GOOGLE_CLIENT_ID      → Google Cloud Console
GOOGLE_CLIENT_SECRET  → Google Cloud Console
NEXT_PUBLIC_API_URL   → https://api.layerflow.dev
EOF
echo ""
echo "Google OAuth → Authorized redirect URI:"
echo "  https://layerflow.dev/api/auth/callback/google"
echo ""
echo "After saving env vars, redeploy Vercel (push to main or Redeploy in dashboard)."
