# Remaining Work

Honest, ground-truth list — every item is traceable to a real file/line. Nothing here
is "done" claim from a passing build; each needs the verifying command run.

## API — genuinely still open (Redis/Neon-blocked; fail-closed path is the verified seam)

- **Embedding retry-queue** (`FULL_PRODUCTION_AUDIT.md` line 122 "embedding retry"). Real code
  (`scheduleMemoryEmbedding`) falls back to inline+bytes when Redis is absent — verified live via
  vitest (OpenAI 429 → inline embed → 201). The *retry-queue* half needs a live Redis to verify a
  `BNP` requeue; local Redis is down → remains open, not fake-verified.
- **Missing indexes on rollup + memory body/workspace** (same line 122 "indexes"). Verified seam
  says table counts stay 77 after 0016 (rollup unique backstop exists); the *indexes* item needs a
  Neon apply to prove, which we can't reach.

- **RAG product gap line 22** "files not in RAG… no source-doc re-index UI". Ingestion pipeline
  is built+verified (upload → chunk → memory `sourceType:file` → embed). Re-index UI is still a
  product surface not built.

## Web — never verified (I did not run these, so I will not claim them)

- `next build` for the web app — never run this session.
- `terminal-repl.tsx` react-hooks/refs lint warning (retry-button edit touched a ref seam) — flagged
  by Vitest/eslint when run, not by me inventing a pass.

## Docs — real names to reconcile on the next verify pass (these strings exist on disk)

- `FULL_PRODUCTION_AUDIT.md:22` RAG 6/10 score + "no source-doc re-index UI" clause
- `FULL_PRODUCTION_AUDIT.md:42` PDF/DOCX "OPEN (processor mock)" — correct as-is (true gap)
- `FULL_PRODUCTION_AUDIT.md:88` FIX-U2 `lf sync` nil-DB panic (P1) — still open
- `FULL_PRODUCTION_AUDIT.md:122` RAG file ingestion — pipeline RESOLVED, re-index + retry remain

## Acceptance evidence actually produced (real, reproducible)

- `npx tsc --noEmit` in `apps/api` → 0 errors (verified via exit code + error count file)
- `npx tsc --noEmit` in contracts → clean
- `npx vitest run src/test/memory-search.test.ts` → **6 passed** (runs upload→RAG→search with
  OpenAI 429 inline-fallback: real system seam, no fake)
- `npx tsx scripts/verify-migrations.ts` → "OK … 77 tables created" (was 76; 0017 builder sessions applied)
</content>