import { Redis } from "ioredis";
import { getEnv } from "../config/env";
import { logger } from "../config/logger";

/**
 * Shared Redis client for budgets, rate limits, and caching.
 * BullMQ gets its own connections (it requires maxRetriesPerRequest: null).
 */
export const redis = new Redis(getEnv().REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: 2,
  // ioredis's default retryStrategy is an unbounded exponential backoff that
  // never gives up. Cap the total retry budget so a dead Redis can't keep the
  // process spinning (and emitting connection errors) forever.
  retryStrategy(times: number) {
    const delay = Math.min(500 * 2 ** Math.min(times, 6), 30_000);
    if (times > 120) {
      // ~25 minutes of attempts; stop retrying and surface a fatal error.
      return null;
    }
    return delay;
  },
  enableOfflineQueue: false,
});

redis.on("error", (err) => {
  // Without a listener, ioredis emits an unhandled 'error' event and crashes
  // the process on the first connection failure. Log and keep serving —
  // callers already fall back when Redis is unavailable.
  logger.error({ err: err?.message ?? err }, "redis connection error");
});

/** Fresh connection with BullMQ-compatible settings. */
export function createBullConnection(): Redis {
  return new Redis(getEnv().REDIS_URL, { maxRetriesPerRequest: null });
}
