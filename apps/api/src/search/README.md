# Search & embeddings (`src/search`)

Two kinds of search live in the API:

| Endpoint | Kind | How it works |
|----------|------|--------------|
| `GET /api/search?q=&type=` | **Keyword** | Postgres `ILIKE` over prompt titles, descriptions, current-version bodies, and session titles/descriptions. No extra indexes or extensions needed; works everywhere (including the PGlite test database). A GIN full-text index migration can be added later if libraries grow large. |
| `GET /api/similar?promptId=` / `?text=` | **Semantic** | pgvector cosine similarity over `memory_embeddings` (1536-dim `vector` column, HNSW index from the initial migration). |
| `GET /api/memory/search?q=` | **Hybrid** | Keyword `ILIKE` over memories **plus** semantic similarity, merged into one ranked list. If the vector query fails (e.g. exotic environment), it degrades to keyword-only and reports `semanticUsed: false`. |

## Embedding strategy — works offline by design

`embeddings.ts` picks one of two backends per request (via `resolveEmbedder`):

1. **OpenAI** (`text-embedding-3-small`, trimmed to 1536 dims) — used when
   `OPENAI_API_KEY` is set in the server env, **or** the workspace saved a
   BYOK OpenAI key (`provider_keys` row, AES-GCM decrypted at call time).
2. **Local hash embedding** (`local-hash-v1`) — the fallback when there is no
   key, or when the OpenAI call fails at runtime. This keeps the whole
   memory/search vertical usable offline and in tests with **zero** external
   services.

### How the local fallback works

`localEmbed(text)` is a deterministic "hashed bag of features" vector:

1. Lowercase the text and split into alphanumeric word tokens.
2. For every word (weight 1) and every 3-character trigram inside a word
   (weight 0.5), compute an FNV-1a hash.
3. The hash picks a dimension (`hash % 1536`) and a sign (one hash bit), and
   the weight is added there — a cheap random projection.
4. L2-normalize, so cosine similarity is meaningful.

Properties to be aware of:

- **Deterministic**: same text → same vector, on any machine. Great for tests.
- **Lexical, not semantic**: it captures shared words/trigrams ("budget
  meter" ≈ "budget bar"), but does NOT know that "car" ≈ "automobile".
  Real semantic matching needs the OpenAI backend.
- Dimension collisions are possible but rare enough at 1536 dims.

### One vector space per model

Vectors from different models are **not comparable**. Every
`memory_embeddings` row stores the `model` that produced it, and every
similarity query filters `model = <query embedding model>`. Consequence: if a
workspace starts without an OpenAI key (local embeddings) and adds one later,
old memories won't appear in semantic results until re-embedded — re-run the
`embeddings` job for them (or just edit the memory, which re-enqueues it).

## Write path

`POST /api/memory` (and memory updates) enqueue an `embeddings` BullMQ job
(`src/jobs/processors/embed.ts`). The worker embeds the memory's
`title + body` and replaces its `memory_embeddings` rows. If Redis is down
(e.g. running without Docker), the API embeds **inline** instead of failing —
see `services/memory/embed.ts` (`scheduleMemoryEmbedding`).
