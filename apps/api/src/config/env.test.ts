import { describe, expect, it } from "vitest";
import { parseEnv } from "./env";

const validEnv = {
  DATABASE_URL: "postgres://layerflow:layerflow@localhost:5432/layerflow",
  REDIS_URL: "redis://localhost:6379",
  BETTER_AUTH_SECRET: "a-long-enough-secret-value",
  BETTER_AUTH_URL: "http://localhost:8787",
  GOOGLE_CLIENT_ID: "client-id",
  GOOGLE_CLIENT_SECRET: "client-secret",
  PROVIDER_KEYS_KEK: "ab".repeat(32),
  WEB_URL: "http://localhost:3000",
  API_URL: "http://localhost:8787",
  CORS_ORIGINS: "http://localhost:3000, https://layerflow.dev",
};

describe("parseEnv", () => {
  it("accepts a valid env and applies defaults", () => {
    const env = parseEnv(validEnv);
    expect(env.PORT).toBe(8787);
    expect(env.NODE_ENV).toBe("development");
  });

  it("splits CORS_ORIGINS into a trimmed array", () => {
    const env = parseEnv(validEnv);
    expect(env.CORS_ORIGINS).toEqual(["http://localhost:3000", "https://layerflow.dev"]);
  });

  it("fails fast and names every missing var", () => {
    expect(() => parseEnv({})).toThrow(/DATABASE_URL/);
    expect(() => parseEnv({})).toThrow(/BETTER_AUTH_SECRET/);
    expect(() => parseEnv({})).toThrow(/PROVIDER_KEYS_KEK/);
  });

  it("rejects a malformed KEK with a helpful message", () => {
    expect(() => parseEnv({ ...validEnv, PROVIDER_KEYS_KEK: "too-short" })).toThrow(
      /64 hex chars/,
    );
  });

  it("treats optional services as optional", () => {
    const env = parseEnv(validEnv);
    expect(env.STRIPE_SECRET_KEY).toBeUndefined();
    expect(env.RESEND_API_KEY).toBeUndefined();
    expect(env.SENTRY_DSN).toBeUndefined();
  });
});
