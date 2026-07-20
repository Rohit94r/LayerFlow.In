import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";

/**
 * Same-origin API liveness probe for the sign-in page.
 * Local/dev probes localhost:8787. Production tries api.layerflow.dev first,
 * then falls back to same-origin Better Auth on Vercel (layerflow.dev/api/auth).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function probeRemote(base: string, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${base}/health/live`, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    });
    const body = await res.json().catch(() => ({ status: res.ok ? "ok" : "error" }));
    return { ok: res.ok, upstream: base, ...body };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unreachable";
    return { ok: false, upstream: base, error: message };
  } finally {
    clearTimeout(timer);
  }
}

/** Auth works on Vercel when DB + Better Auth env are set (api.layerflow.dev optional). */
async function probeSameOriginAuth(webUrl: string) {
  const required = [
    "DATABASE_URL",
    "REDIS_URL",
    "BETTER_AUTH_SECRET",
    "WEB_URL",
    "API_URL",
    "PROVIDER_KEYS_KEK",
  ] as const;
  if (!required.every((k) => process.env[k]?.trim())) {
    return { ok: false as const, upstream: webUrl, error: "auth env incomplete" };
  }

  if (process.env.VERCEL === "1" && process.env.WEB_URL) {
    process.env.BETTER_AUTH_URL = process.env.WEB_URL;
  }

  try {
    const { db } = await import("../../../apps/api/src/db/client");
    await db.execute(sql`select 1`);
    return {
      ok: true as const,
      upstream: webUrl,
      mode: "same-origin-auth" as const,
      status: "ok",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "db unreachable";
    return { ok: false as const, upstream: webUrl, error: message };
  }
}

export async function GET() {
  const isProd = process.env.NODE_ENV === "production";
  const remote =
    process.env.API_INTERNAL_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
    "https://api.layerflow.dev";

  if (!isProd) {
    const local = await probeRemote("http://localhost:8787", 4_000);
    return NextResponse.json(local, { status: local.ok ? 200 : 503 });
  }

  const remoteResult = await probeRemote(remote.replace(/\/$/, ""), 8_000);
  if (remoteResult.ok) {
    return NextResponse.json(remoteResult, { status: 200 });
  }

  const webUrl = (process.env.WEB_URL ?? "https://layerflow.dev").replace(/\/$/, "");
  const authResult = await probeSameOriginAuth(webUrl);
  return NextResponse.json(authResult, { status: authResult.ok ? 200 : 503 });
}
