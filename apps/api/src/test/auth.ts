import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { getEnv } from "../config/env";
import { db } from "../db/client";
import { sessions, users } from "../db/schema/auth";
import { onboardNewUser } from "../services/onboarding";

/**
 * Integration-test auth helper. Google OAuth can't run headlessly, so we
 * insert user + session rows directly and forge the signed session cookie
 * exactly the way Better Auth does (value.hmacSignature, URI-encoded).
 */

function signSessionCookie(token: string): string {
  // Mirrors better-call's signCookieValue: standard-base64 HMAC-SHA256.
  const signature = createHmac("sha256", getEnv().BETTER_AUTH_SECRET)
    .update(token)
    .digest("base64");
  return encodeURIComponent(`${token}.${signature}`);
}

export interface TestSession {
  userId: string;
  workspaceId: string;
  /** Ready-to-use Cookie header value. */
  cookie: string;
}

/** Create a user + workspace + session directly in the DB. */
export async function createTestSession(
  overrides: { name?: string; email?: string } = {},
): Promise<TestSession> {
  const userId = `user_test_${randomUUID().slice(0, 8)}`;
  const name = overrides.name ?? "Test User";
  const email = overrides.email ?? `${userId}@test.layerflow.dev`;

  await db.insert(users).values({ id: userId, name, email, emailVerified: true });
  const workspaceId = await onboardNewUser({ id: userId, name });

  const token = randomBytes(32).toString("base64url");
  await db.insert(sessions).values({
    id: randomUUID(),
    userId,
    token,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  return {
    userId,
    workspaceId,
    cookie: `better-auth.session_token=${signSessionCookie(token)}`,
  };
}
