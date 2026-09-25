#!/usr/bin/env bash
# Quick production readiness check for layerflow.dev sign-in + the Fly API/worker.
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
curl -sS -m 8 https://layerflow-api.fly.dev/health 2>&1 || echo "Fly API not deployed or not reachable"

echo ""
echo "=== api.layerflow.dev health ==="
curl -sS -m 8 https://api.layerflow.dev/health 2>&1 || echo "api.layerflow.dev not reachable"

echo ""
echo "=== api.layerflow.dev liveness (/health/live) ==="
curl -sS -m 8 https://api.layerflow.dev/health/live 2>&1 || echo "liveness FAIL"

echo ""
echo "=== Fly worker health (:9091) ==="
curl -sS -m 8 https://layerflow-api.fly.dev:9091/health 2>&1 || echo "Fly worker not reachable / not scaled (run: fly scale count app=1 worker=1)"

echo ""
echo "=== Vercel health proxy ==="
curl -sS -m 8 https://layerflow.dev/api/lf-health 2>&1 || echo "lf-health FAIL"