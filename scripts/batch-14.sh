#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
LOG="$(git rev-parse --show-toplevel)/batch-14.log"
: > "$LOG"
git reset -q

commit() {
  local msg="$1"; shift
  local want="" got="" line=""
  git add -- "$@"
  want=$(printf '%s\n' "$@" | sort)
  got=$(git diff --cached --name-only | sort)
  if [ "$got" != "$want" ]; then
    echo "MISMATCH [$msg]" | tee -a "$LOG"
    echo "  want:" | tee -a "$LOG"; echo "$want" | sed 's/^/    /' | tee -a "$LOG"
    echo "  got :" | tee -a "$LOG"; echo "$got" | sed 's/^/    /' | tee -a "$LOG"
    exit 1
  fi
  git commit -q -m "$msg"
  echo "OK [$msg] @ $(git rev-parse --short HEAD)" | tee -a "$LOG"
}

# 14 commits total; #1 (migrations 0016+0017+journal) already landed at HEAD (2261e95).
# Remaining 13, staged-set asserted against the real porcelain each time.

commit "contracts: memory/search — widen memorySourceType union with 'file'" \
  packages/contracts/src/memory.ts \
  packages/contracts/src/search.ts

commit "schema: memories.sourceType includes 'file'" \
  apps/api/db/schema/memory.ts

commit "files/storage + ai keys: byte-read seam for RAG + provider-key routing" \
  apps/api/services/files/storage.ts \
  apps/api/services/ai/providers/keys.ts

commit "files: RAG ingestion service (extract→chunk→createMemory→embed; idempotent)" \
  apps/api/src/services/files/ingest.ts

commit "files/ws: wire ingestion on upload complete + ws chat memory adjacency + test" \
  apps/api/routes/files/files.ts \
  apps/api/routes/ws/ws.ts \
  apps/api/src/routes/ws/ws.test.ts

commit "agents: DB-backed builder persistence (schema + service + route)" \
  apps/api/db/schema/agents.ts \
  apps/api/services/agents/builder.ts \
  apps/api/routes/agents/builder.ts

commit "agents: SSRF path-traversal hardening + tool argument seams" \
  apps/api/services/agents/ssrf.ts \
  apps/api/services/agents/tools.ts

commit "chat/jobs/budget/cost: retry dedupe + processor + rollup-unique recall seam" \
  apps/api/services/chat/router.ts \
  apps/api/db/schema/cost.ts \
  apps/api/jobs/processors/agent.ts \
  apps/api/services/runs/budget-hook.ts

commit "middleware/env/keys: rate-limit + XFF + env shape + provider key seams" \
  apps/api/config/env.ts \
  apps/api/middleware/auth-rate-limit.ts \
  apps/api/middleware/rate-limit.ts

commit "web: builder onboarding page + terminal-repl ref/link fix" \
  "apps/web/app/(dashboard)/agents/new/page.tsx" \
  apps/web/components/features/terminal/terminal-repl.tsx

commit "terminal-go: chat/root/sync commands + app/config seams" \
  terminal/cmd/lf/chat.go \
  terminal/cmd/lf/root.go \
  terminal/cmd/lf/sync.go \
  terminal/internal/app/app.go \
  terminal/internal/config/config.go \
  terminal/internal/sync/sync.go \
  terminal/internal/sync/sync_test.go

commit "docs: full production audit + fix plan + remaining-work ledger" \
  docs/FULL_PRODUCTION_AUDIT.md \
  docs/PRODUCTION_FIX_PLAN.md \
  docs/REMAINING_WORK.md \
  docs/plans/anylyse.md

commit "tooling: batch-14 runner + commit-composer + REMAINING_WORK scripts" \
  scripts/batch-14.sh \
  scripts/git-commits.sh \
  scripts/REMAINING_WORK

soft=$(git status --porcelain --untracked-files=no | wc -l | tr -d ' ')
echo "TRACKED_DONE=COMPLETE tracked-changes-left=$soft" | tee -a "$LOG"
git log --oneline -14 | tee -a "$LOG"
