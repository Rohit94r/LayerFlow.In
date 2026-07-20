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

/**
 * Resolve the Hono API base URL for the browser.
 *
 * Critical: on localhost we ALWAYS use the local API, even if a production
 * `NEXT_PUBLIC_API_URL` was baked into a build or set in Vercel. That was
 * causing "Could not reach https://api.layerflow.dev" while developing.
 */
export function getApiBaseUrl(): string {
  if (typeof window !== "undefined" && isLocalWebHost(window.location.hostname)) {
    return "http://127.0.0.1:8787";
  }

  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  // Server-side during `next dev` — prefer local API.
  if (process.env.NODE_ENV !== "production") {
    return "http://127.0.0.1:8787";
  }

  return "https://api.layerflow.dev";
}

/** OpenAI-compatible gateway base (…/v1). */
export function getGatewayBaseUrl(): string {
  return `${getApiBaseUrl()}/v1`;
}

/**
 * Ping via the Next.js same-origin proxy so the browser never hits a
 * cross-origin /health call (that was falsely showing "API offline").
 */
export async function pingApi(timeoutMs = 5_000): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch("/api/lf-health", {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) return false;
    const data = (await res.json().catch(() => null)) as { ok?: boolean } | null;
    return data?.ok === true || res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
