import { toNextJsHandler } from "better-auth/next-js";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";

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
function ensureVercelAuthEnv() {
  if (process.env.VERCEL === "1" && process.env.WEB_URL?.trim()) {
    process.env.BETTER_AUTH_URL = process.env.WEB_URL.trim();
  }
}

function ensureLocalAuthEnv() {
  if (process.env.VERCEL === "1") return;
  if (process.env.LAYERFLOW_API_ENV_LOADED === "1") return;
  process.env.LAYERFLOW_API_ENV_LOADED = "1";
  const envPath = resolve(process.cwd(), "apps/api/.env");
  if (existsSync(envPath)) {
    loadEnv({ path: envPath });
  }
  if (process.env.WEB_URL?.trim()) {
    process.env.BETTER_AUTH_URL = process.env.WEB_URL.trim();
  } else if (process.env.NODE_ENV !== "production") {
    process.env.BETTER_AUTH_URL = "http://localhost:3000";
  }
}

async function loadAuth() {
  ensureLocalAuthEnv();
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
