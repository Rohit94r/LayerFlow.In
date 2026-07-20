import { NextResponse } from "next/server";

/**
 * Same-origin API liveness probe for the sign-in page.
 * Avoids browser CORS / private-network blocks when checking the Hono API.
 */
export async function GET() {
  const target =
    process.env.API_INTERNAL_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
    "http://127.0.0.1:8787";

  const base = target.replace(/\/$/, "");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4_000);

  try {
    const res = await fetch(`${base}/health/live`, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    });
    const body = await res.json().catch(() => ({ status: res.ok ? "ok" : "error" }));
    return NextResponse.json(
      { ok: res.ok, upstream: base, ...body },
      { status: res.ok ? 200 : 503 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "unreachable";
    return NextResponse.json(
      { ok: false, upstream: base, error: message },
      { status: 503 },
    );
  } finally {
    clearTimeout(timer);
  }
}
