#!/usr/bin/env bash
# LayerFlow production preflight — run BEFORE any flyctl/Vercel action.
#
# Validates the secrets files WITHOUT printing any values (only ✓ / ⚠ / ✗):
#   1. Required secrets are present + non-empty in the source file.
#   2. Golden URL rules hold (BETTER_AUTH_URL == WEB_URL == NEXT_PUBLIC_API_URL).
#   3. Vercel + Fly secret files agree on every shared key (the golden parity
#      rule: BETTER_AUTH_SECRET / PROVIDER_KEYS_KEK / DB / Redis / OAuth /
#      provider keys must be identical on both hosts).
#   4. Syntax traps that break .env parsing (CRLF, unquoted '#', whitespace).
#
# Usage:  npm run preflight:prod            # default: .vercel.env vs fly.env
#         bash scripts/preflight-prod.sh fly.env   # check the Fly copy instead
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ENV_FILE="${1:-$ROOT/.vercel.env}"
OTHER_FILE="$ROOT/fly.env"
[[ "$(basename "$ENV_FILE")" == "fly.env" ]] && OTHER_FILE="$ROOT/.vercel.env"

FAIL=0
pass() { printf '  \033[32m✓\033[0m  %s\n' "$*"; }
warn() { printf '  \033[33m⚠\033[0m  %s\n' "$*"; }
fail() { printf '  \033[31m✗\033[0m  %s\n' "$*"; FAIL=1; }

# Value of KEY in file (last occurrence wins, CR stripped). Never printed.
get_() { grep -E "^${1}=" "$2" 2>/dev/null | tail -n1 | sed -E 's/^[^=]*=//' | tr -d '\r' || true; }
keys_() { grep -E '^[A-Za-z_][A-Za-z0-9_]*=' "$1" 2>/dev/null | sed -E 's/=.*//' | sort -u; }

echo "=== LayerFlow production preflight ==="
echo "Source secrets file: $ENV_FILE"
[[ -f "$ENV_FILE" ]] || { fail "Missing secrets file: $ENV_FILE (copy from docs/PRODUCTION-GO.md)"; echo ""; exit 1; }

# ── 1. Required secrets present + non-empty ──────────────────────────────────
REQUIRED="DATABASE_URL REDIS_URL BETTER_AUTH_SECRET BETTER_AUTH_URL
GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET PROVIDER_KEYS_KEK WEB_URL API_URL
CORS_ORIGINS"
if [[ "$(basename "$ENV_FILE")" != "fly.env" ]]; then
  REQUIRED="$REQUIRED NEXT_PUBLIC_API_URL"
fi
echo ""
echo "[1] Required secrets in $ENV_FILE"
for k in $REQUIRED; do
  v=$(get_ "$k" "$ENV_FILE")
  if [[ -z "$v" ]]; then fail "$k is missing or empty"; else pass "$k"; fi
done

# ── 2. Golden URL rules ──────────────────────────────────────────────────────
echo ""
echo "[2] Golden URL rules (auth must be same-origin)"
ba_url=$(get_ BETTER_AUTH_URL "$ENV_FILE")
web_url=$(get_ WEB_URL "$ENV_FILE")
np_url=$(get_ NEXT_PUBLIC_API_URL "$ENV_FILE")
if [[ -n "$ba_url" && "$ba_url" == "$web_url" ]]; then pass "BETTER_AUTH_URL == WEB_URL"; else fail "BETTER_AUTH_URL != WEB_URL (auth breaks!)"; fi
if [[ -n "$np_url" ]]; then
  if [[ "$np_url" == "$web_url" ]]; then pass "NEXT_PUBLIC_API_URL == WEB_URL"; else fail "NEXT_PUBLIC_API_URL != WEB_URL (browser hits wrong host)"; fi
fi

# ── 3. Vercel/Fly parity on every shared key ─────────────────────────────────
echo ""
echo "[3] Parity with $OTHER_FILE"
if [[ ! -f "$OTHER_FILE" ]]; then
  warn "$OTHER_FILE not found — parity unverified (create it: cp .vercel.env fly.env)."
else
  union=$(sort -u <(keys_ "$ENV_FILE") <(keys_ "$OTHER_FILE"))
  shared=0; one_sided=0
  while IFS= read -r k; do
    [[ -z "$k" ]] && continue
    va=$(get_ "$k" "$ENV_FILE"); vb=$(get_ "$k" "$OTHER_FILE")
    if [[ -n "$va" && -n "$vb" ]]; then
      shared=$((shared+1))
      ha=$(printf '%s' "$va" | openssl dgst -sha256 | awk '{print $1}')
      hb=$(printf '%s' "$vb" | openssl dgst -sha256 | awk '{print $1}')
      if [[ "$ha" == "$hb" ]]; then pass "$k (identical)"; else fail "$k DIFFERS between files"; fi
    elif [[ -n "$va" ]]; then
      one_sided=$((one_sided+1)); warn "$k present only in $ENV_FILE"
    elif [[ -n "$vb" ]]; then
      one_sided=$((one_sided+1)); warn "$k present only in $OTHER_FILE"
    fi
  done <<< "$union"
  echo "  ($shared shared keys, $one_sided one-sided)"
fi

# ── 4. Syntax traps ──────────────────────────────────────────────────────────
echo ""
echo "[4] Syntax traps (break .env parsing)"
if grep -q $'\r' "$ENV_FILE"; then warn "CRLF line endings — run: sed -i '' $'s/\r$//' $ENV_FILE"; else pass "No CRLF line endings"; fi
while IFS= read -r k; do
  [[ -z "$k" ]] && continue
  val=$(get_ "$k" "$ENV_FILE")
  if [[ -z "$val" ]]; then continue; fi
  if [[ "$val" =~ \ # ]]; then warn "$k has '# ' — likely an unquoted comment"; fi
  if [[ "$val" =~ (^[[:space:]]|[[:space:]]$) ]]; then warn "$k has leading/trailing whitespace"; fi
done < <(keys_ "$ENV_FILE")

echo ""
if [[ "$FAIL" == "1" ]]; then
  echo "✗  PREFLIGHT FAILED — fix the items above before deploying."
  exit 1
fi
echo "✓  PREFLIGHT PASSED — safe to deploy (npm run deploy:api)."