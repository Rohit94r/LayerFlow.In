import { toNextJsHandler } from "better-auth/next-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Better Auth on the Next.js host (layerflow.dev) so sign-in works before
 * api.layerflow.dev is deployed. Local dev still uses the Hono API on :8787.
 *
 * Required Vercel env (Production): DATABASE_URL, REDIS_URL, BETTER_AUTH_SECRET,
 * BETTER_AUTH_URL=https://layerflow.dev, WEB_URL, API_URL, CORS_ORIGINS,
 * PROVIDER_KEYS_KEK, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET.
 */
function ensureVercelAuthEnv() {
  if (process.env.VERCEL === "1" && process.env.WEB_URL?.trim()) {
    process.env.BETTER_AUTH_URL = process.env.WEB_URL.trim();
  }
}

async function loadAuth() {
  ensureVercelAuthEnv();
  const { auth } = await import("../../../../apps/api/src/auth/index");
  return auth;
}

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
