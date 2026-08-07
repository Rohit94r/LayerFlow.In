import { logger } from "../../config/logger";
import { getEnv } from "../../config/env";
import { db } from "../../db/client";
import { decryptSecret } from "../../services/crypto";

/**
 * Text → vector embedding, with two interchangeable backends:
 *
 * 1. **OpenAI** (`text-embedding-3-small`, 1536 dims) — used when the server
 *    has OPENAI_API_KEY set, or the workspace stored a BYOK OpenAI key.
 * 2. **Local hash embedding** (`local-hash-v1`, 1536 dims) — a deterministic,
 *    dependency-free fallback so search works offline. See README.md in this
 *    folder for how it works and its limitations.
 *
 * IMPORTANT: vectors from different models live in different "spaces" and
 * must never be compared with each other. Every stored embedding records its
 * model, and similarity queries always filter on the same model that produced
 * the query vector.
 */

/** Must match the vector(1536) column on memory_embeddings. */
export const EMBEDDING_DIMENSIONS = 1536;

export const LOCAL_EMBEDDING_MODEL = "local-hash-v1";
export const OPENAI_EMBEDDING_MODEL = "text-embedding-3-small";

export interface EmbeddingResult {
  vector: number[];
  /** Model that actually produced the vector, e.g. "local-hash-v1". */
  model: string;
}

export interface Embedder {
  embed(text: string): Promise<EmbeddingResult>;
}

// ── Local fallback: deterministic hash-ngram embedding ───────────────────────

/** FNV-1a 32-bit hash — fast, deterministic, no dependencies. */
function fnv1a(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Deterministic "bag of hashed features" embedding:
 * each word and each character-trigram is hashed to a dimension (and a sign),
 * accumulated, then L2-normalized. Same text always gives the same vector;
 * texts sharing words/trigrams end up with higher cosine similarity.
 */
export function localEmbed(text: string): number[] {
  const vector = new Float64Array(EMBEDDING_DIMENSIONS);
  const tokens = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];

  const addFeature = (feature: string, weight: number) => {
    const hash = fnv1a(feature);
    const dim = hash % EMBEDDING_DIMENSIONS;
    // Use one hash bit as the sign so unrelated features cancel out instead
    // of all piling up positively (a cheap random projection).
    const sign = (hash >>> 16) & 1 ? 1 : -1;
    vector[dim] += sign * weight;
  };

  for (const token of tokens) {
    addFeature(`word:${token}`, 1);
    for (let i = 0; i + 3 <= token.length; i++) {
      addFeature(`tri:${token.slice(i, i + 3)}`, 0.5);
    }
  }

  let norm = 0;
  for (const value of vector) norm += value * value;
  norm = Math.sqrt(norm) || 1;
  return Array.from(vector, (value) => value / norm);
}

// ── OpenAI backend ────────────────────────────────────────────────────────────

async function openaiEmbed(text: string, apiKey: string): Promise<number[]> {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_EMBEDDING_MODEL,
      input: text.slice(0, 8_000), // stay well under the token limit
      dimensions: EMBEDDING_DIMENSIONS,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    throw new Error(`OpenAI embeddings failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as { data: { embedding: number[] }[] };
  return json.data[0].embedding;
}

/** Find an OpenAI key: server env first, then the workspace's BYOK key. */
async function findOpenAiKey(workspaceId: string): Promise<string | undefined> {
  const envKey = getEnv().OPENAI_API_KEY;
  if (envKey) return envKey;

  const byok = await db.query.providerKeys.findFirst({
    where: (k, { and, eq, isNull }) =>
      and(eq(k.workspaceId, workspaceId), eq(k.provider, "openai"), isNull(k.revokedAt)),
  });
  if (!byok) return undefined;
  try {
    return decryptSecret(byok.ciphertext);
  } catch (err) {
    logger.warn({ err, workspaceId }, "could not decrypt BYOK openai key; using local embeddings");
    return undefined;
  }
}

/**
 * Pick the best available embedder for a workspace. If the OpenAI call fails
 * at runtime (offline, bad key), we fall back to the local embedding so the
 * API never hard-fails on embeddings.
 */
export async function resolveEmbedder(workspaceId: string): Promise<Embedder> {
  const apiKey = await findOpenAiKey(workspaceId);
  if (!apiKey) {
    return {
      embed: async (text) => ({ vector: localEmbed(text), model: LOCAL_EMBEDDING_MODEL }),
    };
  }
  return {
    embed: async (text) => {
      try {
        return { vector: await openaiEmbed(text, apiKey), model: OPENAI_EMBEDDING_MODEL };
      } catch (err) {
        logger.warn({ err, workspaceId }, "OpenAI embedding failed; falling back to local");
        return { vector: localEmbed(text), model: LOCAL_EMBEDDING_MODEL };
      }
    },
  };
}

/** One-shot helper: embed a single text for a workspace. */
export async function embedText(workspaceId: string, text: string): Promise<EmbeddingResult> {
  const embedder = await resolveEmbedder(workspaceId);
  return embedder.embed(text);
}
