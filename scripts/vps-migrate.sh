#!/usr/bin/env bash
# Apply LayerFlow drizzle migrations to the VPS Postgres container.
#
# Why not `drizzle-kit migrate`: the runtime image omits dev deps (no
# drizzle-kit). These generated SQL files are pure DDL, applied in order via
# psql. We strip only the `--> statement-breakpoint` TEXT (which many
# statements keep on the SAME line as their SQL — never delete the whole line).
#
# Usage:  ./scripts/vps-migrate.sh
set -euo pipefail
cd "$(dirname "$0")/.."

COMPOSE="docker compose -f docker-compose.vps.yml"

applied=0
for f in $(ls apps/api/drizzle/[0-9][0-9][0-9][0-9]_*.sql | sort); do
  echo "== applying $f"
  sed 's/--> statement-breakpoint//g' "$f" \
    | $COMPOSE exec -T postgres psql -v ON_ERROR_STOP=1 -U layerflow -d layerflow >/dev/null
  echo "   ok"
  applied=$((applied + 1))
done

echo ""
echo "Applied ${applied} migration(s)."
$COMPOSE exec -T postgres psql -U layerflow -d layerflow -tc \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';" \
  | xargs echo "Public base tables:"