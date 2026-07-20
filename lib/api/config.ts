/** Resolve the Hono API base URL used by the browser. */
export function getApiBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return "http://127.0.0.1:8787";
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
