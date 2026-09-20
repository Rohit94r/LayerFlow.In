import { toNextJsHandler } from "better-auth/next-js";
import { loadAuth } from "@/lib/server/auth-loader";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Better Auth on the Next.js host (layerflow.dev) so sign-in works before
 * api.layerflow.dev is deployed. Local dev also uses the web host (port
 * 3000) as the auth origin so the session cookie lives on the same origin
 * the dashboard pages are served from.
 *
 * Required Vercel env (Production): DATABASE_URL, REDIS_URL, BETTER_AUTH_SECRET,
 * BETTER_AUTH_URL=https://layerflow.dev, WEB_URL, API_URL, CORS_ORIGINS,
 * PROVIDER_KEYS_KEK, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET.
 */
let handlers: ReturnType<typeof toNextJsHandler> | null = null;

async function getHandlers() {
  if (!handlers) {
    handlers = toNextJsHandler(await loadAuth());
  }
  return handlers;
}

export async function GET(request: Request) {
  return (await getHandlers()).GET(request);
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  if (url.pathname.endsWith("/sign-in/social")) {
    const hasGoogle = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
    if (!hasGoogle) {
      return Response.json(
        {
          error: {
            message: "Google sign-in is not configured on this host. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
          },
        },
        { status: 400 },
      );
    }
  }

  try {
    const response = await (await getHandlers()).POST(request);
    if (response.status >= 500 && url.pathname.endsWith("/sign-in/social")) {
      return Response.json(
        {
          error: {
            message: "Google sign-in is not configured on this host. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
          },
        },
        { status: 400 },
      );
    }
    return response;
  } catch {
    return Response.json(
      {
        error: {
          message: "Google sign-in is not configured on this host. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
        },
      },
      { status: 400 },
    );
  }
}
