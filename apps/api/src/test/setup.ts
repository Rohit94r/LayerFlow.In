// Vitest setup: default env vars so unit tests run with zero configuration.
// Real values from apps/api/.env (loaded by dotenv) take precedence.
// (cast because Next.js's ambient types mark NODE_ENV read-only at the repo root)
(process.env as Record<string, string | undefined>).NODE_ENV = "test";

// SAFETY: tests must never touch remote infrastructure. If apps/api/.env
// points DATABASE_URL/REDIS_URL at a non-local host (Neon, Upstash, ...),
// force the local defaults — the PGlite fallback in the integration tests
// takes over when Docker isn't running.
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
for (const key of ["DATABASE_URL", "REDIS_URL"] as const) {
  const value = process.env[key];
  if (!value) continue;
  try {
    if (!LOCAL_HOSTS.has(new URL(value).hostname)) delete process.env[key];
  } catch {
    delete process.env[key];
  }
}

const defaults: Record<string, string> = {
  DATABASE_URL: "postgres://layerflow:layerflow@localhost:5432/layerflow",
  REDIS_URL: "redis://localhost:6379",
  BETTER_AUTH_SECRET: "test-secret-test-secret-test-secret",
  BETTER_AUTH_URL: "http://localhost:8787",
  GOOGLE_CLIENT_ID: "test-client-id",
  GOOGLE_CLIENT_SECRET: "test-client-secret",
  PROVIDER_KEYS_KEK: "a".repeat(64),
  WEB_URL: "http://localhost:3000",
  API_URL: "http://localhost:8787",
  CORS_ORIGINS: "http://localhost:3000",
};

for (const [key, value] of Object.entries(defaults)) {
  if (!process.env[key]) process.env[key] = value;
}
