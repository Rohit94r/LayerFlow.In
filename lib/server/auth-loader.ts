import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { Auth } from "@/apps/api/src/auth";

/**
 * Server-side Better Auth loader shared by the Next.js auth route and
 * server components (sign-in auto-redirect).
 *
 * The API reads its env at import time (zod-validated). On Vercel the
 * required variables are already in process.env; locally they live in
 * apps/api/.env and must be loaded before the auth module is imported,
 * otherwise getEnv() throws "Invalid environment configuration".
 */
let authPromise: Promise<Auth> | null = null;

function ensureAuthEnv(): void {
  if (process.env.VERCEL === "1") {
    if (process.env.WEB_URL?.trim()) {
      process.env.BETTER_AUTH_URL = process.env.WEB_URL.trim();
    }
    return;
  }
  if (process.env.LAYERFLOW_API_ENV_LOADED === "1") return;
  process.env.LAYERFLOW_API_ENV_LOADED = "1";
  const envPath = resolve(process.cwd(), "apps/api/.env");
  if (existsSync(envPath)) {
    loadEnv({ path: envPath });
  }
  if (process.env.WEB_URL?.trim()) {
    process.env.BETTER_AUTH_URL = process.env.WEB_URL.trim();
  } else if (process.env.NODE_ENV !== "production") {
    process.env.BETTER_AUTH_URL = "http://localhost:3000";
  }
}

/** Singleton Better Auth instance (env bootstrapped once). */
export function loadAuth(): Promise<Auth> {
  if (!authPromise) {
    authPromise = (async () => {
      ensureAuthEnv();
      const { auth } = await import("@/apps/api/src/auth/index");
      return auth;
    })();
  }
  return authPromise;
}

/** Current session for the incoming request, or null when signed out. */
export async function getServerSession(headers: Headers) {
  try {
    const auth = await loadAuth();
    return await auth.api.getSession({ headers });
  } catch {
    // Database unavailable, auth misconfigured, or session expired — treat
    // as "not signed in" so pages can render a login form instead of crashing.
    return null;
  }
}
