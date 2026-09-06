import type { MiddlewareHandler } from "hono";
import { redis } from "../redis/client";
import type { AppEnv } from "../types";
import { AppError } from "./app-error";

/** Race with a timeout so a dead Redis can't hang the request forever. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`redis timed out after ${ms}ms`)), ms),
    ),
  ]);
}

export interface RateLimitOptions {
  requestsPerMinute: number;
  /** Redis key suffix; defaults to apiKeyId or workspaceId from context. */
  keyFn?: (c: { get: (k: keyof AppEnv["Variables"]) => unknown }) => string;
}

/**
 * Fixed-window per-minute rate limit backed by Redis INCR.
 * Returns 429 + Retry-After when the window is exhausted.
 */
export function rateLimit(options: RateLimitOptions): MiddlewareHandler<AppEnv> {
  const rpm = Math.max(1, options.requestsPerMinute);

  return async (c, next) => {
    const id =
      options.keyFn?.(c) ??
      (c.get("apiKeyId") as string | undefined) ??
      (c.get("workspaceId") as string | undefined);

    if (!id) {
      await next();
      return;
    }

    const minute = Math.floor(Date.now() / 60_000);
    const key = `ratelimit:${id}:${minute}`;

    try {
      if (redis.status !== "ready") {
        await withTimeout(redis.connect().catch(() => undefined), 800);
      }
      const count = await withTimeout(redis.incr(key), 800);
      if (count === 1) await withTimeout(redis.expire(key, 70), 800);
      if (count > rpm) {
        const retryAfter = 60 - Math.floor((Date.now() % 60_000) / 1000);
        c.header("Retry-After", String(Math.max(1, retryAfter)));
        throw new AppError(429, "rate_limited", `Rate limit exceeded (${rpm} requests/minute)`);
      }
    } catch (err) {
      if (err instanceof AppError) throw err;
      // Fail open on Redis errors for rate limiting (budgets remain fail-closed).
    }

    await next();
  };
}
