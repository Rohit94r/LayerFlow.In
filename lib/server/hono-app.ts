/**
 * Lazy Hono app for Vercel / Next.js same-origin API routes.
 *
 * Auth already runs on layerflow.dev via `app/api/auth/[...all]`. Until
 * api.layerflow.dev (Fly) is live, workspace `/api/*` and gateway `/v1/*`
 * are served by the same Hono app under Next's Node runtime.
 */

type HonoFetchApp = {
  fetch: (request: Request) => Response | Promise<Response>;
};

function ensureVercelAuthEnv() {
  if (process.env.VERCEL === "1" && process.env.WEB_URL?.trim()) {
    process.env.BETTER_AUTH_URL = process.env.WEB_URL.trim();
  }
}

let appPromise: Promise<HonoFetchApp> | null = null;

export function getHonoApp(): Promise<HonoFetchApp> {
  if (!appPromise) {
    appPromise = (async () => {
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
