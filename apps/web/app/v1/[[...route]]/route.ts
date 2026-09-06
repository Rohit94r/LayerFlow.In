import { handleHonoRequest } from "@/lib/server/hono-app";

/**
 * OpenAI-compatible gateway (`/v1/*`) on the Next.js host.
 *
 * Same Hono app as Fly — used until api.layerflow.dev is deployed so
 * gateway snippets and BYOK chat completions work same-origin.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

async function handler(request: Request) {
  try {
    return await handleHonoRequest(request);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gateway failed";
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
