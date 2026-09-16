#!/bin/sh
# 14 topical commits for LayerFlow production-audit remediation.
# Each stage asserts the staged set equals the intended paths BEFORE committing.
set -e
cd "$(git rev-parse --show-toplevel)"

assert_staged() {
  # $1 = expected count; remainder = expected paths
  expect_count=$1; shift
  actual=$(git diff --cached --name-only)
  lack=$(printf '%s\n' "$@" | grep -vFx "$actual" || true)
  extra=$(printf '%s\n' "$actual" | grep -vFx -e "$(printf '%s\n' "$@")" . || true)
  if [ -n "$lack" ] || [ -n "$extra" ]; then
    echo "STAGED MISMATCH (aborting):"
    echo "  missing: $lack"
    echo "  extra:   $extra"
    exit 1
  fi
}

commit() {
  # $1 = count+paths already staged; $2 = message
  words="$1"; msg="$2"
  eval "set -- $words"
  assert_staged "$@"
  git commit -q -m "$msg"
  echo "  committed ($(git rev-parse --short HEAD)): $msg"
}

# --- 1. builder sessions migration (schema-only table, hand-written like 0016) ---
git add apps/api/drizzle/0017_agent_builder_sessions.sql
commit '
  apps/api/drizzle/0017_agent_builder_sessions.sql
' 'add agent_builder_sessions migration (hand-written like 0016)'

true
