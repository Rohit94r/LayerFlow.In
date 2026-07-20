"use client";

import { createAuthClient } from "better-auth/react";
import { getApiBaseUrl } from "@/lib/api/config";

type AuthClient = ReturnType<typeof createAuthClient>;

let cachedBaseUrl: string | null = null;
let cachedClient: AuthClient | null = null;

/**
 * Better Auth browser client — email/password + Google.
 * Rebuilt when the API base URL changes (localhost vs production).
 */
export function getAuthClient(): AuthClient {
  const baseURL = getApiBaseUrl();
  if (!cachedClient || cachedBaseUrl !== baseURL) {
    cachedBaseUrl = baseURL;
    cachedClient = createAuthClient({
      baseURL,
      fetchOptions: {
        credentials: "include",
      },
    });
  }
  return cachedClient;
}

/** Convenience — always uses the current API base URL. */
export const signIn = {
  social: (...args: Parameters<AuthClient["signIn"]["social"]>) =>
    getAuthClient().signIn.social(...args),
  email: (...args: Parameters<AuthClient["signIn"]["email"]>) =>
    getAuthClient().signIn.email(...args),
};

export const signUp = {
  email: (...args: Parameters<AuthClient["signUp"]["email"]>) =>
    getAuthClient().signUp.email(...args),
};

export const signOut = (...args: Parameters<AuthClient["signOut"]>) =>
  getAuthClient().signOut(...args);

export function useSession(
  ...args: Parameters<AuthClient["useSession"]>
): ReturnType<AuthClient["useSession"]> {
  return getAuthClient().useSession(...args);
}
