import { createHash } from "node:crypto";
import type Redis from "ioredis";
import { redis as defaultRedis } from "../redis/client";

const DEFAULT_TTL_SECONDS = 60 * 60; // 1 hour

function cacheRedisKey(workspaceId: string, keyHash: string): string {
  return `cache:exact:${workspaceId}:${keyHash}`;
}

/**
 * Stable hash of model + messages + selected params. Never crosses workspaces —
 * the Redis key always includes workspaceId.
 */
export function hashExactCacheKey(input: {
  model: string;
  messages: unknown;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  max_completion_tokens?: number;
  stop?: unknown;
}): string {
  const payload = JSON.stringify({
    model: input.model,
    messages: input.messages,
    temperature: input.temperature ?? null,
    top_p: input.top_p ?? null,
    max_tokens: input.max_tokens ?? null,
    max_completion_tokens: input.max_completion_tokens ?? null,
    stop: input.stop ?? null,
  });
  return createHash("sha256").update(payload).digest("hex");
}

export async function getExactCache(
  workspaceId: string,
  keyHash: string,
  client: Redis = defaultRedis,
): Promise<string | null> {
  try {
    if (client.status !== "ready") await client.connect().catch(() => undefined);
    return await client.get(cacheRedisKey(workspaceId, keyHash));
  } catch {
    return null;
  }
}

export async function setExactCache(
  workspaceId: string,
  keyHash: string,
  responseBody: string,
  ttlSeconds = DEFAULT_TTL_SECONDS,
  client: Redis = defaultRedis,
): Promise<void> {
  try {
    if (client.status !== "ready") await client.connect().catch(() => undefined);
    await client.set(cacheRedisKey(workspaceId, keyHash), responseBody, "EX", ttlSeconds);
  } catch {
    // Cache is best-effort — never fail the request.
  }
}
