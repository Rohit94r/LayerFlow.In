/** Public API base URL. Prefer 127.0.0.1 locally so IPv6-only listeners never break auth. */
export function getApiBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return "http://127.0.0.1:8787";
}

/** OpenAI-compatible gateway base (…/v1). */
export function getGatewayBaseUrl(): string {
  return `${getApiBaseUrl()}/v1`;
}

/** Lightweight liveness check — does not require Neon to be warm. */
export async function pingApi(timeoutMs = 4_000): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${getApiBaseUrl()}/health/live`, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
