import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { getEnv } from "../config/env";
import { logger } from "../config/logger";
import { db } from "../db/client";
import * as schema from "../db/schema";
import { onboardNewUser } from "../services/onboarding";
import { buildTrustedOrigins, deriveCookieDomain } from "./config";

const env = getEnv();
const isProduction = env.NODE_ENV === "production";
const cookieDomain = deriveCookieDomain(env);

/**
 * Better Auth instance — email/password + optional Google OAuth, sessions in Postgres.
 * Mounted at /api/auth/* in src/index.ts.
 * Google console redirect URI: {API_URL}/api/auth/callback/google
 *
 * Production cookies: Secure, HttpOnly, SameSite=Lax, scoped to the shared
 * parent domain (`.layerflow.dev`) so layerflow.dev ↔ api.layerflow.dev
 * share the session. See src/auth/config.ts.
 */
export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    // Our tables are plural; map Better Auth's singular model names to them.
    schema: {
      ...schema,
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verificationTokens,
    },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    requireEmailVerification: false,
    autoSignIn: true,
  },
  // Better Auth option name is `socialProviders` (not socialPlatforms).
  socialProviders:
    env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
          },
        }
      : undefined,
  // Browser origins allowed to call the auth endpoints.
  // In development, also accept private LAN hosts (Next.js "Network" URL).
  trustedOrigins: async (request) => {
    const base = buildTrustedOrigins(env);
    if (env.NODE_ENV === "production") return base;
    const origin = request?.headers?.get?.("origin");
    if (!origin) return base;
    try {
      const { hostname, protocol } = new URL(origin);
      const isLocal =
        hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname === "::1" ||
        hostname.startsWith("192.168.") ||
        hostname.startsWith("10.") ||
        /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname);
      if (isLocal && (protocol === "http:" || protocol === "https:")) {
        return [...base, origin];
      }
    } catch {
      // ignore
    }
    return base;
  },
  advanced: {
    useSecureCookies: isProduction,
    ...(cookieDomain
      ? { crossSubDomainCookies: { enabled: true, domain: cookieDomain } }
      : {}),
    defaultCookieAttributes: {
      httpOnly: true,
      secure: isProduction,
      // Same-site subdomains (layerflow.dev / api.layerflow.dev) work with Lax;
      // Lax also blocks the session cookie on cross-site POSTs (CSRF hardening).
      sameSite: "lax",
    },
  },
  databaseHooks: {
    user: {
      create: {
        // First sign-up (Google or email/password) → default workspace,
        // membership, settings, budget, and the 9 default domains.
        after: async (user) => {
          try {
            await onboardNewUser(user);
          } catch (err) {
            // Don't fail the signup; requireAuth also self-heals missing workspaces.
            logger.error({ err, userId: user.id }, "onboarding after signup failed");
          }
        },
      },
    },
  },
});

export type Auth = typeof auth;
