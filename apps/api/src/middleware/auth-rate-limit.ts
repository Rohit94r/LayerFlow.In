import type { MiddlewareHandler } from "hono";
import { redis } from "../redis/client";
import type { AppEnv } from "../types";
import { AppError } from "./app-error";

/**
 * Per-IP throttle for credential endpoints (sign-in / sign-up / OAuth).
 * Better Auth does not ship a default rate limiter, so without this a single
 * IP can brute-force passwords indefinitely or open signup in bulk.
 */
export function authRateLimit(
  requestsPerMinute = 20,
): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const forwarded = c.req.header("x-forwarded-for");
    const ip =
      forwarded?.split(",")[0]?.trim() ||
      c.req.header("x-real-ip") ||
      "unknown";
    const minute = Math.floor(Date.now() / 60_000);
    const key = `ratelimit:auth:${ip}:${minute}`;

    try {
      if (redis.status !== "ready") await redis.connect().catch(() => undefined);
      const count = await redis.incr(key);
      if (count === 1) await redis.expire(key, 70);
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
      // Fail open on Redis errors — we must never lock users out because Redis
      // hiccuped; the session + SameSite cookie protections still apply.
    }

    await next();
  };
}