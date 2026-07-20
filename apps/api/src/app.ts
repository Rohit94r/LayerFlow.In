import { sql } from "drizzle-orm";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { timeout } from "hono/timeout";
import { MAX_FILE_SIZE_BYTES } from "@layerflow/contracts";
import { auth } from "./auth";
import { buildTrustedOrigins } from "./auth/config";
import { getEnv } from "./config/env";
import { db } from "./db/client";
import { AppError, handleError, handleNotFound } from "./middleware/app-error";
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

/** JSON bodies are capped small; file-content uploads get the contract max. */
const JSON_BODY_LIMIT_BYTES = 1 * 1024 * 1024;

const jsonBodyLimit = bodyLimit({
  maxSize: JSON_BODY_LIMIT_BYTES,
  onError: () => {
    throw new AppError(413, "payload_too_large", "Request body exceeds 1 MB");
  },
});

const fileBodyLimit = bodyLimit({
  maxSize: MAX_FILE_SIZE_BYTES + 64 * 1024, // contract max + envelope slack
  onError: () => {
    throw new AppError(413, "payload_too_large", "File exceeds the 25 MB upload limit");
  },
});

async function dependencyChecks(): Promise<{ ok: boolean; checks: { db: boolean; redis: boolean } }> {
  const checks = { db: false, redis: false };
  try {
    // Neon pooler can take several seconds after idle — keep this generous.
    await withTimeout(db.execute(sql`select 1`), 8_000);
    checks.db = true;
  } catch {
    // reported below
  }
  try {
    checks.redis = (await withTimeout(redis.ping(), 2_000)) === "PONG";
  } catch {
    // reported below
  }
  return { ok: checks.db && checks.redis, checks };
}

/** Build the Hono app (separate from the server so tests can call it directly). */
export function createApp(): Hono<AppEnv> {
  const env = getEnv();
  const app = new Hono<AppEnv>();

  app.onError(handleError);
  app.notFound(handleNotFound);
  app.use(requestId);

  // Baseline security headers on every response (API-appropriate subset).
  app.use(
    secureHeaders({
      // No cross-origin isolation needs; the API serves JSON + SSE only.
      crossOriginResourcePolicy: "cross-origin",
      crossOriginOpenerPolicy: false,
      xFrameOptions: "DENY",
      strictTransportSecurity:
        env.NODE_ENV === "production" ? "max-age=31536000; includeSubDomains" : false,
    }),
  );

  // CORS on ALL routes. In development, also reflect private LAN origins
  // (e.g. http://192.168.x.x:3000) so opening Next's "Network" URL still works.
  const corsOrigins = buildTrustedOrigins(env);
  app.use(
    "*",
    cors({
      origin: (origin) => {
        if (!origin) return corsOrigins[0] ?? "*";
        if (corsOrigins.includes(origin)) return origin;
        if (env.NODE_ENV !== "production") {
          try {
            const { hostname, protocol } = new URL(origin);
            const isLocal =
              hostname === "localhost" ||
              hostname === "127.0.0.1" ||
              hostname === "::1" ||
              hostname.startsWith("192.168.") ||
              hostname.startsWith("10.") ||
              /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname);
            if (isLocal && (protocol === "http:" || protocol === "https:")) {
              return origin;
            }
          } catch {
            // fall through
          }
        }
        return null;
      },
      allowHeaders: ["Content-Type", "Authorization"],
      allowMethods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
      exposeHeaders: ["Content-Length", "x-request-id"],
      maxAge: 600,
      credentials: true,
    }),
  );

  // Body-size limits: 1 MB JSON everywhere, 25 MB for local file-content PUTs.
  app.use("/api/*", (c, next) =>
    c.req.path.startsWith("/api/files/") ? fileBodyLimit(c, next) : jsonBodyLimit(c, next),
  );
  app.use("/v1/*", jsonBodyLimit);

  // Hard request deadline. SSE routes return their Response immediately and
  // stream afterwards, so this only bounds time-to-first-byte for them.
  app.use("/api/*", timeout(120_000));
  app.use("/v1/*", timeout(120_000));

  // Better Auth owns everything under /api/auth/* (Google OAuth callback, session...).
  app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));

  // Liveness: process is up (no dependency checks — for container restarts).
  app.get("/health/live", (c) => c.json({ status: "ok" }));

  // Readiness: dependencies reachable (for load-balancer / deploy gating).
  app.get("/health/ready", async (c) => {
    const { ok, checks } = await dependencyChecks();
    return c.json({ status: ok ? "ok" : "degraded", checks }, ok ? 200 : 503);
  });

  // Back-compat combined check (used by the smoke script).
  app.get("/health", async (c) => {
    const { ok, checks } = await dependencyChecks();
    return c.json({ status: ok ? "ok" : "degraded", checks }, ok ? 200 : 503);
  });

  registerRoutes(app);
  return app;
}
