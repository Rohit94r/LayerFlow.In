#!/bin/bash
# LayerFlow — 14 topical commits honoring a strict staged-set contract:
# for each commit, `git add <exact paths>` then assert
#   staged == the exact path-set  (stray/scoped-inclusion surfaces plain).
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

commit() {
  local msg="$1"; shift
  git add -- "$@"
  # Assert exactly our paths are staged, nothing more (catches scoping drift).
  local want got
  want=$(printf '%s\n' "$@")
  got=$(git diff --cached --name-only)
  if [ "$got" != "$want" ]; then
    echo "STAGE-SET MISMATCH for: $msg"
    echo "--- wanted ---"; echo "$want"
    echo "--- staged  ---"; echo "$got"
    exit 1
  fi
  git commit -q -m "$msg"
  echo "committed: $msg"
}

# 1 — drizzle: hand-written migrations (journal + both .sql) as one schema unit
commit "db: hand-written 0016 rollup-unique + 0017 builder-sessions migrations" \
  apps/api/drizzle/meta/_journal.json \
  apps/api/drizzle/0016_rollup_usage_unique.sql \
  apps/api/drizzle/0017_agent_builder_sessions.sql

# 2 — contracts: widen memory sourceType union with "file" (+ hit schema)
commit "contracts: add \"file\" to memory sourceType union and similar-hit schema" \
  packages/contracts/src/memory.ts \
  packages/contracts/src/search.ts

# 3 — schema: memories.sourceType $type + index seams the RAG service depends on
commit "schema: include \"file\" in memories.sourceType union" \
  apps/api/src/db/schema/memory.ts

# 4 — files storage: R2 byte-reader + saveLocalFile seam (ingest dependency)
commit "files: add R2 object-byte read helper for RAG ingestion" \
  apps/api/src/services/files/storage.ts

# 5 — RAG ingestion service: extract→chunk→createMemory("file")→embed
commit "files: RAG ingestion service (extract, chunk, memory-source=file)" \
  apps/api/src/services/files/ingest.ts

# 6 — files route + ws route: wire ingestion trigger; ws memory-based messages
commit "files/ws: trigger RAG ingestion on complete; ws chat adjacency" \
  apps/api/src/routes/files/files.ts \
  apps/api/src/routes/ws/ws.ts

# 7 — ws chat e2e test (RAG memory adjacency)
commit "test: ws chat flow exercises memory adjacency" \
  apps/api/src/routes/ws/ws.test.ts

# 8 — agents: builder persistence (schema + service + route)
commit "agents: DB-backed agent builder sessions (persist goal/draft/step)" \
  apps/api/src/db/schema/agents.ts \
  apps/api/src/services/agents/builder.ts \
  apps/api/src/routes/agents/builder.ts

# 9 — agents security: path traversal (ssrf) + tool arg hardening (tools)
commit "agents: patch path-traversal SSRF check; tighten tool permission args" \
  apps/api/src/services/agents/ssrf.ts \
  apps/api/src/services/agents/tools.ts

# 10 — chat/rollup: dedupe chat retries; rollup usage unique backstop bypass
commit "chat: dedupe duplicate chat retries; rollup unique-index migration handler" \
  apps/api/src/services/chat/router.ts \
  apps/api/src/db/schema/cost.ts \
  apps/api/src/services/runs/budget-hook.ts \
  apps/api/src/jobs/processors/agent.ts

# 11 — rate-limit/middleware/env/keys: XFF + dedupe + env shaping that RAG+repl rely on
commit "api: fail-closed rate limits, XFF handling, provider key routing" \
  apps/api/src/config/env.ts \
  apps/api/src/middleware/auth-rate-limit.ts \
  apps/api/src/middleware/rate-limit.ts \
  apps/api/src/services/ai/providers/keys.ts

# 12 — web: builder page + terminal repl (retry button + link fix from lint pass)
commit "web: builder onboarding page; terminal repl retry + next/link for lint" \
  "apps/web/app/(dashboard)/agents/new/page.tsx" \
  apps/web/components/features/terminal/terminal-repl.tsx

# 13 — terminal-go: chat/root/sync command + workspace sync (fs-notify dir scan)
commit "terminal: chat/root/sync commands; workspace change syncer" \
  terminal/cmd/lf/chat.go \
  terminal/cmd/lf/root.go \
  terminal/cmd/lf/sync.go \
  terminal/internal/app/app.go \
  terminal/internal/config/config.go \
  terminal/internal/sync/sync.go \
  terminal/internal/sync/sync_test.go

# 14 — docs: production audit + fix plan + remaining-work ledger
commit "docs: production audit, fix plan, and remaining-work ledger" \
  docs/FULL_PRODUCTION_AUDIT.md \
  docs/PRODUCTION_FIX_PLAN.md \
  docs/REMAINING_WORK.md \
  docs/plans/anylyse.md

echo "ALL 14 COMMITS OK"
git log --oneline -1 >/dev/null 2>&1 || true
exit 0
