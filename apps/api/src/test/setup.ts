// Vitest setup: default env vars so unit tests run with zero configuration.
// Real values from apps/api/.env (loaded by dotenv) take precedence.
// (cast because Next.js's ambient types mark NODE_ENV read-only at the repo root)
(process.env as Record<string, string | undefined>).NODE_ENV = "test";

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
