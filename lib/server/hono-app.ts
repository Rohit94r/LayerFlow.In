/**
 * Lazy Hono app for Vercel / Next.js same-origin API routes.
 *
 * Auth already runs on layerflow.dev via `app/api/auth/[...all]`. Until
 * api.layerflow.dev (Fly) is live, workspace `/api/*` and gateway `/v1/*`
 * are served by the same Hono app under Next's Node runtime.
 */

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";

type HonoFetchApp = {
  fetch: (request: Request) => Response | Promise<Response>;
};

function ensureVercelAuthEnv() {
  if (process.env.VERCEL === "1" && process.env.WEB_URL?.trim()) {
    process.env.BETTER_AUTH_URL = process.env.WEB_URL.trim();
  }
}

/** Local dev: the web host (not :8787) is the auth origin, so load the API
 * env (DB/Redis/secrets) into the Next process and point Better Auth at
 * localhost:3000. The standalone :8787 API keeps serving CLI/worker/tests. */
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

let appPromise: Promise<HonoFetchApp> | null = null;

export function getHonoApp(): Promise<HonoFetchApp> {
  if (!appPromise) {
    appPromise = (async () => {
      ensureLocalAuthEnv();
      ensureVercelAuthEnv();
      const { createApp } = await import("../../apps/api/src/app");
      return createApp();
    })();
  }
  return appPromise;
}

export async function handleHonoRequest(request: Request): Promise<Response> {
  const app = await getHonoApp();
  return app.fetch(request);
}
