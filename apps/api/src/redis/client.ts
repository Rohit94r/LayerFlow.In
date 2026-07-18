import { Redis } from "ioredis";
import { getEnv } from "../config/env";

/**
 * Shared Redis client for budgets, rate limits, and caching.
 * BullMQ gets its own connections (it requires maxRetriesPerRequest: null).
 */
export const redis = new Redis(getEnv().REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: 2,
});

/** Fresh connection with BullMQ-compatible settings. */
export function createBullConnection(): Redis {
  return new Redis(getEnv().REDIS_URL, { maxRetriesPerRequest: null });
}
