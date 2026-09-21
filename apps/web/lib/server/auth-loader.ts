import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { Auth } from "@layerflow/api/src/auth";

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

/**
 * The Next.js host is the auth origin (same-origin design), so BETTER_AUTH_URL
 * must equal WEB_URL. Google's OAuth server rejects any other value with
 * 400 redirect_uri_mismatch, because the redirect_uri it validates is
 * `${BETTER_AUTH_URL}/api/auth/callback/google` — verbatim, no trailing slash.
 * If a stale BETTER_AUTH_URL (e.g. https://api.layerflow.dev) survives to
 * runtime, sign-in breaks, so this override is authoritative and logs loudly.
 */
export function coerceAuthBaseUrlToWeb(): void {
  if (process.env.NODE_ENV === "production" && !process.env.WEB_URL?.trim()) {
    console.warn(
      "[auth-loader] WEB_URL is not set in production. Google redirect_uri will be " +
        `"${process.env.BETTER_AUTH_URL ?? "(unset)"}/api/auth/callback/google" — ` +
        "register exactly that URI in Google Cloud Console, or set WEB_URL=https://layerflow.dev.",
    );
    return;
  }
  const web = (process.env.WEB_URL ?? (process.env.NODE_ENV !== "production" ? "http://localhost:3000" : "")).trim();
  if (!web) return;
  if (process.env.BETTER_AUTH_URL && process.env.BETTER_AUTH_URL !== web) {
    console.warn(
      `[auth-loader] Overriding BETTER_AUTH_URL=${process.env.BETTER_AUTH_URL} → ${web} so ` +
        "Google OAuth matches WEB_URL. Remove the stale BETTER_AUTH_URL from your env template.",
    );
  }
  process.env.BETTER_AUTH_URL = web;
}

function ensureAuthEnv(): void {
  if (process.env.VERCEL === "1") {
    coerceAuthBaseUrlToWeb();
    return;
  }
  if (process.env.LAYERFLOW_API_ENV_LOADED === "1") return;
  process.env.LAYERFLOW_API_ENV_LOADED = "1";
  // Local dev env lives in apps/api/.env (cwd = apps/web → one level up);
  // the second candidate covers running Next from the repo root.
  const envPath = [
    resolve(process.cwd(), "../api/.env"),
    resolve(process.cwd(), "apps/api/.env"),
  ].find((p) => existsSync(p));
  if (envPath) {
    loadEnv({ path: envPath });
  }
  coerceAuthBaseUrlToWeb();
}

/** Singleton Better Auth instance (env bootstrapped once). */
export function loadAuth(): Promise<Auth> {
  if (!authPromise) {
    authPromise = (async () => {
      ensureAuthEnv();
      const { auth } = await import("@layerflow/api/src/auth/index");
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
