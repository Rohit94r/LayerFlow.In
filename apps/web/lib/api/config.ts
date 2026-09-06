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
 * Better Auth base URL — same-origin everywhere (local + production).
 * Both the Hono workspace API and Better Auth are mounted under /api/*
 * on the Next.js host, so the browser uses the same origin for auth
 * and workspace calls.  The standalone :8787 API is only used by the
 * worker, CLI, and tests — never by the browser auth client.
 */
export function getAuthBaseUrl(): string {
  if (typeof window !== "undefined") {
    // Same-origin: works for localhost:3000 (dev) and layerflow.dev (prod).
    return window.location.origin;
  }

  // Server-side (RSC / route handler) — match the Next.js host.
  if (process.env.VERCEL === "1") {
    const web = process.env.WEB_URL?.trim()?.replace(/\/$/, "");
    if (web) return web;
  }

  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:3000";
  }

  return process.env.WEB_URL?.replace(/\/$/, "") || "https://layerflow.dev";
}

/**
 * Resolve the Hono API base URL for workspace/gateway calls.
 *
 * Same-origin everywhere: the Next.js app mounts Hono under `/api/*` and
 * `/v1/*` (prod on layerflow.dev, dev on localhost:3000), so the session
 * cookie from Better Auth lives on the same origin as the dashboard pages.
 * The standalone API on :8787 is used by the worker, CLI and tests.
 */
export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  // Server-side on Vercel: same-origin as the web host (cookies + DB).
  if (process.env.VERCEL === "1") {
    const web = process.env.WEB_URL?.trim()?.replace(/\/$/, "");
    if (web) return web;
  }

  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:3000";
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
