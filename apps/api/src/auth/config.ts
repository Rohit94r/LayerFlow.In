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

/**
 * Cookie domain for cross-subdomain sessions. Explicit COOKIE_DOMAIN wins;
 * otherwise derived from WEB_URL/API_URL in production only. Returns
 * undefined for local dev (host-only cookies on localhost).
 */
export function deriveCookieDomain(env: Pick<Env, "NODE_ENV" | "COOKIE_DOMAIN" | "WEB_URL" | "API_URL">): string | undefined {
  if (env.COOKIE_DOMAIN) {
    return env.COOKIE_DOMAIN.startsWith(".") ? env.COOKIE_DOMAIN : `.${env.COOKIE_DOMAIN}`;
  }
  if (env.NODE_ENV !== "production") return undefined;
  const webHost = new URL(env.WEB_URL).hostname;
  const apiHost = new URL(env.API_URL).hostname;
  if (webHost === apiHost) return undefined; // same host — host-only cookie is fine
  const parent = sharedParentDomain(webHost, apiHost);
  return parent ? `.${parent}` : undefined;
}

/**
 * Origins allowed to call the auth endpoints: the exact CORS allow-list plus
 * the web and API origins themselves. Deduplicated, no wildcards.
 */
export function buildTrustedOrigins(env: Pick<Env, "CORS_ORIGINS" | "WEB_URL" | "API_URL">): string[] {
  const normalize = (u: string) => new URL(u).origin;
  return [...new Set([...env.CORS_ORIGINS.map(normalize), normalize(env.WEB_URL), normalize(env.API_URL)])];
}
