import { sql } from "drizzle-orm";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { auth } from "./auth";
import { getEnv } from "./config/env";
import { db } from "./db/client";
import { handleError, handleNotFound } from "./middleware/error";
import { requestId } from "./middleware/request-id";
import { redis } from "./redis/client";
import { registerRoutes } from "./routes";
import type { AppEnv } from "./types";

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms),
    ),
  ]);
}

/** Build the Hono app (separate from the server so tests can call it directly). */
export function createApp(): Hono<AppEnv> {
  const env = getEnv();
  const app = new Hono<AppEnv>();

  app.onError(handleError);
  app.notFound(handleNotFound);
  app.use(requestId);

  // CORS must be registered before the auth handler and routes.
  app.use(
    "/api/*",
    cors({
      origin: env.CORS_ORIGINS,
      allowHeaders: ["Content-Type", "Authorization"],
      allowMethods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
      exposeHeaders: ["Content-Length", "x-request-id"],
      maxAge: 600,
      credentials: true,
    }),
  );

  // Better Auth owns everything under /api/auth/* (Google OAuth callback, session...).
  app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));

  // Liveness + dependency check.
  app.get("/health", async (c) => {
    const checks = { db: false, redis: false };
    try {
      await withTimeout(db.execute(sql`select 1`), 2_000);
      checks.db = true;
    } catch {
      // reported below
    }
    try {
      checks.redis = (await withTimeout(redis.ping(), 2_000)) === "PONG";
    } catch {
      // reported below
    }
    const ok = checks.db && checks.redis;
    return c.json({ status: ok ? "ok" : "degraded", checks }, ok ? 200 : 503);
  });

  registerRoutes(app);
  return app;
}
