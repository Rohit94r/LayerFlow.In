import type { Env } from "../config/env";

/**
 * Pure helpers for Better Auth production config (unit-tested without a DB).
 *
 * Production topology: web on layerflow.dev, API on api.layerflow.dev. The
 * session cookie must be scoped to the shared parent domain (`.layerflow.dev`)
 * so it is sent on credentialed fetches from the web origin to the API. The
 * two hosts are same-site, so `SameSite=Lax` still applies and cross-site
 * request forgery from third-party origins is rejected.
 */

/** Session lives 30 days; refreshed on use after `SESSION_UPDATE_AGE_SEC` (sliding). */
export const SESSION_EXPIRES_IN_SEC = 60 * 60 * 24 * 30;
/** How often an active session's `expiresAt` (and cookie maxAge) is extended. */
export const SESSION_UPDATE_AGE_SEC = 60 * 60 * 24;
/** Short-lived signed cookie cache so getSession need not hit Postgres every time. */
export const SESSION_COOKIE_CACHE_MAX_AGE_SEC = 5 * 60;

/** Longest common domain suffix with at least two labels, or null. */
export function sharedParentDomain(hostA: string, hostB: string): string | null {
  const a = hostA.toLowerCase().split(".");
  const b = hostB.toLowerCase().split(".");
  const shared: string[] = [];
  for (let i = 1; i <= Math.min(a.length, b.length); i++) {
    const la = a[a.length - i];
    const lb = b[b.length - i];
    if (la !== lb) break;
    shared.unshift(la);
  }
  if (shared.length < 2) return null;
  // Single-label host parts (localhost, IPs) never produce a usable domain.
  if (shared.join(".").match(/^\d+(\.\d+)*$/)) return null;
  return shared.join(".");
}

/** True when `domain` (with or without a leading dot) is the host itself or a parent of it. */
export function hostCovers(domain: string, host: string): boolean {
  const d = domain.replace(/^\./, "").toLowerCase();
  const h = host.toLowerCase();
  return h === d || h.endsWith(`.${d}`);
}

/**
 * Cookie domain for cross-subdomain sessions. Explicit COOKIE_DOMAIN wins;
 * otherwise derived from WEB_URL/API_URL in production only. Returns
 * undefined for local dev (host-only cookies on localhost).
 *
 * Hardening: a cookie Domain the browser would reject (because the web host
 * is not inside it — e.g. a stale COOKIE_DOMAIN or API_URL left over from a
 * hosting migration) makes every Set-Cookie silently dropped, so users are
 * logged out on the very next request after a successful sign-in. Any
 * candidate that does not cover the web host falls back to a host-only
 * cookie, which is exactly right for the same-origin deployment where the
 * API is mounted on the web host.
 */
export function deriveCookieDomain(env: Pick<Env, "NODE_ENV" | "COOKIE_DOMAIN" | "WEB_URL" | "API_URL">): string | undefined {
  const webHost = new URL(env.WEB_URL).hostname;
  let candidate: string | undefined;
  if (env.COOKIE_DOMAIN) {
    candidate = env.COOKIE_DOMAIN.startsWith(".") ? env.COOKIE_DOMAIN : `.${env.COOKIE_DOMAIN}`;
  } else if (env.NODE_ENV === "production") {
    const apiHost = new URL(env.API_URL).hostname;
    if (webHost === apiHost) return undefined; // same host — host-only cookie is fine
    const parent = sharedParentDomain(webHost, apiHost);
    if (parent) candidate = `.${parent}`;
  }
  if (!candidate) return undefined;
  return hostCovers(candidate, webHost) ? candidate : undefined;
}

/**
 * Origins allowed to call the auth endpoints: the exact CORS allow-list plus
 * the web and API origins themselves. Deduplicated, no wildcards.
 *
 * In development we also allow both localhost and 127.0.0.1 on the web port —
 * browsers often switch between them, and a mismatch causes "Failed to fetch".
 */
export function buildTrustedOrigins(
  env: Pick<Env, "NODE_ENV" | "CORS_ORIGINS" | "WEB_URL" | "API_URL">,
): string[] {
  const normalize = (u: string) => new URL(u).origin;
  const origins = [
    ...env.CORS_ORIGINS.map(normalize),
    normalize(env.WEB_URL),
    normalize(env.API_URL),
  ];

  if (env.NODE_ENV !== "production") {
    try {
      const web = new URL(env.WEB_URL);
      const port = web.port || (web.protocol === "https:" ? "443" : "80");
      origins.push(
        `http://localhost:${port}`,
        `http://127.0.0.1:${port}`,
        `http://localhost:3000`,
        `http://127.0.0.1:3000`,
      );
    } catch {
      origins.push("http://localhost:3000", "http://127.0.0.1:3000");
    }
  }

  return [...new Set(origins)];
}
