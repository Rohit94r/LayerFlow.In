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
  return (await getHandlers()).POST(request);
}
