import type { MiddlewareHandler } from "hono";
import { getRedisDownMode } from "../config/env";
import { logger } from "../config/logger";
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

/**
 * Per-IP throttle for credential endpoints (sign-in / sign-up / OAuth).
 * Better Auth does not ship a default rate limiter, so without this a single
 * IP can brute-force passwords indefinitely or open signup in bulk.
 */
export function authRateLimit(
  requestsPerMinute = 20,
): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    // Trust the right-most IP from X-Forwarded-For (the one appended by the
    // last trusted proxy) rather than the left-most (client-spoofable).
    const forwarded = c.req.header("x-forwarded-for");
    const parts = forwarded?.split(",").map((p) => p.trim()).filter(Boolean) ?? [];
    const ip = parts.length > 0
      ? parts[parts.length - 1]
      : c.req.header("x-real-ip") || "unknown";
    const minute = Math.floor(Date.now() / 60_000);
    const key = `ratelimit:auth:${ip}:${minute}`;

    try {
      if (redis.status !== "ready") {
        await withTimeout(redis.connect().catch(() => undefined), 800);
      }
      const count = await withTimeout(redis.incr(key), 800);
      if (count === 1) await withTimeout(redis.expire(key, 70), 800);
      if (count > requestsPerMinute) {
        c.header("Retry-After", "60");
        throw new AppError(
          429,
          "rate_limited",
          `Too many auth attempts from this IP. Try again in a minute.`,
        );
      }
    } catch (err) {
      if (err instanceof AppError) throw err;
      // Fail-closed in production: brute-force/credential-stuffing protection
      // is critical; an outage must not silently disable auth rate limiting.
      if (getRedisDownMode() === "deny") {
        logger.error({ err: err instanceof Error ? err.message : err }, "redis down — fail-closed auth rate limit");
        throw new AppError(503, "rate_limiter_unavailable", "Auth rate limiter unavailable (Redis down)");
      }
      // Fail open in dev/test — session + SameSite cookie protections still apply.
    }

    await next();
  };
}