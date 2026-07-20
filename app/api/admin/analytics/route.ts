import { NextResponse } from "next/server";
import { adminAnalyticsResponseSchema } from "@layerflow/contracts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Same-origin admin analytics.
 *
 * - Local: proxies to the Hono API (session cookie lives on :8787).
 * - Production (Vercel): runs against Postgres with Better Auth session
 *   cookies on layerflow.dev — same pattern as `app/api/auth/[...all]`.
 *
 * Hono also exposes GET /api/admin/analytics for direct API clients.
 */

function ensureVercelAuthEnv() {
  if (process.env.VERCEL === "1" && process.env.WEB_URL?.trim()) {
    process.env.BETTER_AUTH_URL = process.env.WEB_URL.trim();
  }
}

function errorJson(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

async function proxyToHono(request: Request) {
  const base =
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
    process.env.API_INTERNAL_URL?.trim() ||
    "http://localhost:8787";
  const url = `${base.replace(/\/$/, "")}/api/admin/analytics`;
  const cookie = request.headers.get("cookie") ?? "";
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      ...(cookie ? { cookie } : {}),
    },
    cache: "no-store",
  });
  const body = await res.text();
  return new NextResponse(body, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
  });
}

async function handleSameOrigin(request: Request) {
  ensureVercelAuthEnv();
  const { auth } = await import("../../../../apps/api/src/auth/index");
  const { isAdminEmail } = await import("../../../../apps/api/src/config/admin");
  const { getAdminAnalytics } = await import(
    "../../../../apps/api/src/services/admin/analytics"
  );

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return errorJson(401, "unauthorized", "Sign in required");
  }
  if (!isAdminEmail(session.user.email)) {
    return errorJson(403, "forbidden", "Not authorized");
  }

  const data = await getAdminAnalytics();
  const parsed = adminAnalyticsResponseSchema.safeParse(data);
  if (!parsed.success) {
    return errorJson(500, "invalid_response", "Analytics payload failed validation");
  }
  return NextResponse.json(parsed.data);
}

export async function GET(request: Request) {
  const isLocal =
    process.env.NODE_ENV !== "production" && process.env.VERCEL !== "1";

  if (isLocal) {
    try {
      return await proxyToHono(request);
    } catch (err) {
      const message = err instanceof Error ? err.message : "API unreachable";
      return errorJson(503, "api_unreachable", message);
    }
  }

  try {
    return await handleSameOrigin(request);
  } catch (err) {
    // If same-origin DB/auth isn't configured, fall back to the remote API.
    try {
      return await proxyToHono(request);
    } catch {
      const message = err instanceof Error ? err.message : "Analytics failed";
      return errorJson(500, "internal_error", message);
    }
  }
}
