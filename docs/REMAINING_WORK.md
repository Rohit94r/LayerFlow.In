# Remaining Work

Honest, ground-truth list — every item is traceable to a real file/line. Nothing here
is "done" claim from a passing build; each needs the verifying command run.

## API — genuinely still open (Redis/Neon-blocked; fail-closed path is the verified seam)

- **Embedding retry-queue** (`FULL_PRODUCTION_AUDIT.md` line 122 "embedding retry"). Real code
  (`scheduleMemoryEmbedding`) falls back to inline+bytes when Redis is absent — verified live via
  vitest (OpenAI 429 → inline embed → 201). The DB-side half of the retry story is now built and
  tested: `findUnembeddedMemories` / `requeueUnembeddedMemories` (`apps/api/src/services/memory/embed.ts`)
  reconcile any memory with no embedding row, driven by the scheduled `embeddings-backfill` job
  (daily 02:00Z). Verified by `apps/api/src/test/rag-reindex.test.ts` ("embedding backfill finds
  memories without an embedding row") — no live Redis required. What remains: a **live-Reality
  (BNP-requeue under real Redis)** check of BullMQ's `attempts: 3` + exponential backoff
  interacting with a real queue — that specific observation still needs Redis up.
- **Missing indexes on rollup + memory body/workspace** (same line 122 "indexes").
  **RESOLVED** — migration `0018_rag_indexes.sql` adds `memories(workspace, source_type, source_id)`,
  `memories(workspace, updated_at)`, `memory_embeddings(memory_id)`, `files(checksum)`,
  `usage_ledger(created_at)`, `usage_rollups(day)`. Verified via `npm run db:verify` → "OK:
  migrations applied cleanly (77 tables created)" plus schema `tsc` clean. A Neon apply is still
  the only way to prove them against production (local PGlite passes).

- **RAG product gap line 22** "files not in RAG… no source-doc re-index UI".
  **RESOLVED** — ingestion pipeline was already wired (upload → chunk → memory `sourceType:file` →
  embed); the **re-index UI + API** is now shipped:
  - `GET /api/files` — workspace files with `ragStatus` + `chunkCount` (`apps/api/src/routes/files/files.ts`)
  - `POST /api/files/:id/reindex` — force-rebuild a file's chunks from current bytes (clear + re-ingest)
  - `DELETE /api/files/:id` — also removes that file's RAG memories (previously orphaned)
  - `GET /api/memory?sourceType=&sourceId=` — list memories sourced from one file
  - Web: `/files` dashboard page (list, re-index, delete) + sidebar nav entry
  - Verified by `apps/api/src/test/rag-reindex.test.ts` + `next build` (279 pages).

## Web — never verified (verified this pass)

- `next build` for the web app — **RUN 2026-09-18**: compiles clean, 279 routes incl. new `/files`.
- `terminal-repl.tsx` react-hooks/refs — checked with the `react-hooks/refs` rule on the whole
  tree: **no match** (the retry-button ref seam is already clean).

## Docs — real names to reconcile on the next verify pass (these strings exist on disk)

- `FULL_PRODUCTION_AUDIT.md:22` RAG 6/10 score + "no source-doc re-index UI" clause —
  now stale; score should rise with the shipped re-index UI.
- `FULL_PRODUCTION_AUDIT.md:42` PDF/DOCX "OPEN (processor mock)" — correct as-is (true gap)
- `FULL_PRODUCTION_AUDIT.md:88` FIX-U2 `lf sync` nil-DB panic (P1) — still open
  (SEE: Terminal section; nil-DB panic RESOLVED, raw-SQL interpolation still open)
- `FULL_PRODUCTION_AUDIT.md:122` RAG file ingestion — pipeline RESOLVED + **re-index UI now
  RESOLVED**; retry-queue DB-side resolved, live-Redis BNP observation remains.

## Acceptance evidence actually produced (real, reproducible)

- `npx tsc --noEmit` in `apps/api` → 0 errors
- `npx tsc --noEmit` in contracts → clean
- `npx tsc --noEmit` in `apps/web` → clean
- `npx vitest run src/test/memory-search.test.ts` → **6 passed** (upload→RAG→search, OpenAI 429
  inline-fallback)
- `npx vitest run src/test/rag-reindex.test.ts` → **2 passed** (file list/reindex/delete + memory
  source filter + embedding backfill)
- `npx vitest run` in api → **189 passed / 3 skipped** (skips are live-provider integration tests)
- `npx vitest run` in web → **9 passed**
- `npx tsx scripts/verify-migrations.ts` → "OK … 77 tables" (0018 indexes applied)
- `npm run build` in `apps/web` → success (279 routes, `/files` dynamic)