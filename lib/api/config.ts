/** True when the browser (or host string) is a local / private development host. */
export function isLocalWebHost(hostname?: string): boolean {
  const host =
    hostname ??
    (typeof window !== "undefined" ? window.location.hostname : undefined);
  if (!host) return false;
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host.endsWith(".local")
  ) {
    return true;
  }
  // LAN IPs used when opening the app from a phone/other device on the network.
  return /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(host);
}

/** True when the page is served from the public LayerFlow domain (Vercel prod). */
export function isProductionWebHost(hostname?: string): boolean {
  const host =
    hostname ??
    (typeof window !== "undefined" ? window.location.hostname : undefined);
  if (!host) return false;
  return host === "layerflow.dev" || host.endsWith(".layerflow.dev");
}

/**
 * Better Auth base URL — local uses the Hono API; production web uses same-origin
 * (layerflow.dev/api/auth) until api.layerflow.dev is deployed.
 */
export function getAuthBaseUrl(): string {
  if (typeof window !== "undefined") {
    if (isLocalWebHost(window.location.hostname)) {
      return "http://localhost:8787";
    }
    if (isProductionWebHost(window.location.hostname)) {
      return window.location.origin;
    }
  }

  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:8787";
  }

  return process.env.WEB_URL?.replace(/\/$/, "") || "https://layerflow.dev";
}

/**
 * Resolve the Hono API base URL for workspace/gateway calls.
 *
 * - Localhost/LAN → always `http://localhost:8787` (even if a prod
 *   `NEXT_PUBLIC_API_URL` was baked into the client bundle).
 * - Production web (`layerflow.dev`) → same-origin. The Next.js app mounts
 *   Hono under `/api/*` and `/v1/*` until api.layerflow.dev (Fly) is live.
 *   Ignoring `NEXT_PUBLIC_API_URL=https://api.layerflow.dev` avoids DNS
 *   failures that previously broke every workspace page with "Try again".
 */
export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    if (isLocalWebHost(window.location.hostname)) {
      return "http://localhost:8787";
    }
    if (isProductionWebHost(window.location.hostname)) {
      return window.location.origin;
    }
  }

  // Server-side on Vercel: same-origin as the web host (cookies + DB).
  if (process.env.VERCEL === "1") {
    const web = process.env.WEB_URL?.trim()?.replace(/\/$/, "");
    if (web) return web;
  }

  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:8787";
  }

  return process.env.WEB_URL?.replace(/\/$/, "") || "https://layerflow.dev";
}

/** OpenAI-compatible gateway base (…/v1). */
export function getGatewayBaseUrl(): string {
  return `${getApiBaseUrl()}/v1`;
}

export type ApiHealthResult = {
  ok: boolean;
  upstream?: string;
  error?: string;
};

/**
 * Ping via the Next.js same-origin proxy so the browser never hits a
 * cross-origin /health call (that was falsely showing "API offline").
 */
export async function pingApi(timeoutMs = 8_000): Promise<ApiHealthResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch("/api/lf-health", {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as {
      ok?: boolean;
      upstream?: string;
      error?: string;
    } | null;
    return {
      ok: data?.ok === true,
      upstream: data?.upstream,
      error: data?.error,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "unreachable",
    };
  } finally {
    clearTimeout(timer);
  }
}
