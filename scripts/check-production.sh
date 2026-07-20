#!/usr/bin/env bash
# Quick production readiness check for layerflow.dev sign-in.
set -euo pipefail

echo "=== layerflow.dev (frontend) ==="
curl -sS -m 8 -o /dev/null -w "site: %{http_code}\n" https://layerflow.dev/sign-in || echo "site: FAIL"

echo ""
echo "=== api.layerflow.dev DNS ==="
if dig +short api.layerflow.dev A api.layerflow.dev AAAA 2>/dev/null | grep -q .; then
  dig +short api.layerflow.dev A api.layerflow.dev AAAA
else
  echo "NO DNS — add CNAME api → layerflow-api.fly.dev at your registrar"
fi

echo ""
echo "=== layerflow-api.fly.dev (Fly default host) ==="
curl -sS -m 8 https://layerflow-api.fly.dev/health 2>&1 || echo "Fly app not deployed or not reachable"

echo ""
echo "=== api.layerflow.dev health ==="
curl -sS -m 8 https://api.layerflow.dev/health 2>&1 || echo "api.layerflow.dev not reachable"

echo ""
echo "=== Vercel health proxy ==="
curl -sS -m 8 https://layerflow.dev/api/lf-health 2>&1 || echo "lf-health FAIL"
