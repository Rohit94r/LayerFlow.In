import "dotenv/config";
import { z } from "zod";

/**
 * Typed environment validation. The API fails fast at startup with a clear
 * list of missing/invalid vars instead of crashing later mid-request.
 *
 * Optional services (Stripe, Resend, Sentry, R2) are genuinely optional so
 * local dev only needs DB + Redis + auth vars.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(8787),

  // Database + cache
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),

  // Auth
  BETTER_AUTH_SECRET: z.string().min(16, "must be at least 16 chars (use `openssl rand -hex 32`)"),
  BETTER_AUTH_URL: z.url(),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),

  // Crypto: 32-byte key as 64 hex chars, used for BYOK encryption + API key HMAC
  PROVIDER_KEYS_KEK: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, "must be 64 hex chars (use `openssl rand -hex 32`)"),

  // URLs / CORS
  WEB_URL: z.url(),
  API_URL: z.url(),
  CORS_ORIGINS: z
    .string()
    .min(1)
    .transform((s) => s.split(",").map((o) => o.trim()).filter(Boolean)),

  // Optional services
  /** Server-wide OpenAI key for embeddings; without it (and without a
   * workspace BYOK key) search falls back to local hash embeddings. */
  OPENAI_API_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

/** Parse an env record. Exported separately so tests can feed fake values. */
export function parseEnv(raw: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `Invalid environment configuration:\n${issues}\n` +
        `Copy apps/api/.env.example to apps/api/.env and fill in the values.`,
    );
  }
  return result.data;
}

let cached: Env | undefined;

/** Validated env singleton. First call validates process.env and fails fast. */
export function getEnv(): Env {
  if (!cached) cached = parseEnv(process.env);
  return cached;
}
