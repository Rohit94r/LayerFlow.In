import { NextResponse } from "next/server";

/**
 * Same-origin API liveness probe for the sign-in page.
 * In local/dev always probes 127.0.0.1:8787 — never the production API host.
 */
export async function GET() {
  const isProd = process.env.NODE_ENV === "production";
  const target =
    process.env.API_INTERNAL_URL?.trim() ||
    (!isProd
      ? "http://localhost:8787"
      : process.env.NEXT_PUBLIC_API_URL?.trim() || "https://api.layerflow.dev");

  const base = target.replace(/\/$/, "");
  const timeoutMs = isProd ? 12_000 : 4_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

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
