import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { getEnv } from "../config/env";
import { logger } from "../config/logger";
import { db } from "../db/client";
import * as schema from "../db/schema";
import { onboardNewUser } from "../services/onboarding";

const env = getEnv();

/**
 * Better Auth instance — Google OAuth only, sessions in Postgres.
 * Mounted at /api/auth/* in src/index.ts.
 * Google console redirect URI: {API_URL}/api/auth/callback/google
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
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },
  // Browser origins allowed to call the auth endpoints (Next.js dev server).
  trustedOrigins: env.CORS_ORIGINS,
  databaseHooks: {
    user: {
      create: {
        // First Google login → default workspace, membership, settings,
        // budget, and the 9 default domains.
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
