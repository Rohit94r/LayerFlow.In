import { handleHonoRequest } from "@/lib/server/hono-app";

/**
 * Catch-all for workspace Hono routes on the Next.js host.
 *
 * More specific siblings win first:
 * - `app/api/auth/[...all]` — Better Auth
 * - `app/api/admin/analytics` — admin analytics
 * - `app/api/lf-health` — liveness probe
 *
 * Everything else under `/api/*` (workspaces, prompts, sessions, …) is
 * handled by the shared Hono app so production does not need api.layerflow.dev.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

async function handler(request: Request) {
  try {
    return await handleHonoRequest(request);
  } catch (err) {
    const message = err instanceof Error ? err.message : "API failed";
    // Env misconfig on first import surfaces clearly instead of an opaque 500.
    const status = /Invalid environment configuration/i.test(message) ? 503 : 500;
    return Response.json(
      { error: { code: status === 503 ? "api_misconfigured" : "internal_error", message } },
      { status },
    );
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
