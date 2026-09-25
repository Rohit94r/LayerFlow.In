/**
 * Launch the Next.js web app (which hosts the Hono API + Better Auth
 * same-origin) for Playwright E2E. Env comes from apps/api/.env with the
 * web host ports forced to the E2E port so browser + API share one origin.
 */
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../../..");
const webDir = resolve(root, "apps/web");
const PORT = process.env.E2E_WEB_PORT ?? "3100";

const env = { ...process.env };

const apiEnvPath = resolve(root, "apps/api/.env");
try {
  for (const line of readFileSync(apiEnvPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key && !(key in env)) env[key] = value;
  }
} catch {
  // Missing apps/api/.env: rely on the inherited process env.
}

env.E2E_WEB_PORT = PORT;
env.NEXT_PUBLIC_API_URL = `http://localhost:${PORT}`;
env.BETTER_AUTH_URL = `http://localhost:${PORT}`;
env.WEB_URL = `http://localhost:${PORT}`;
env.API_URL = `http://localhost:${PORT}`;
env.CORS_ORIGINS = `http://localhost:${PORT}`;
env.BETTER_AUTH_SECRET = env.BETTER_AUTH_SECRET ?? "e2e-dev-secret-not-for-prod---0123456789abcdef";
env.NODE_ENV = "development";
env.NEXT_TELEMETRY_DISABLED = "1";

// The dev/local Postgres may predate the latest schema (e.g. provider_keys.base_url),
// so apply pending migrations before booting Next.
async function migrate() {
  return new Promise((resolve) => {
    const child = spawn("npx", ["drizzle-kit", "migrate"], {
      cwd: resolve(root, "apps/api"),
      env,
      stdio: "inherit",
    });
    child.on("exit", (code) => {
      if (code !== 0) process.exit(code ?? 1);
      resolve();
    });
  });
}

await migrate();

const child = spawn("npx", ["next", "dev", "-p", PORT], { cwd: webDir, env, stdio: "inherit" });

for (const s of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(s, () => child.kill(s));
}

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});