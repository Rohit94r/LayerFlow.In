"use client";

import { useCallback, useSyncExternalStore } from "react";
import { createAuthClient } from "better-auth/client";
import { getAuthBaseUrl } from "@/lib/api/config";

type AuthClient = ReturnType<typeof createAuthClient>;
/** Vanilla client exposes `useSession` as a nanostores atom, not a React hook. */
type SessionAtom = AuthClient["useSession"];
type SessionSnapshot = ReturnType<SessionAtom["get"]>;

let cachedBaseUrl: string | null = null;
let cachedClient: AuthClient | null = null;

/**
 * Better Auth browser client — email/password + Google.
 * Uses the vanilla client (no React hooks inside better-auth) so SSR never
 * hits a dual-React `useRef` null when `better-auth` is server-externalized.
 * Rebuilt when the API base URL changes (localhost vs production).
 */
export function getAuthClient(): AuthClient {
  const baseURL = getAuthBaseUrl();
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

/**
 * Subscribe to the Better Auth session atom with *this* bundle's React.
 * Do not call `better-auth/react`'s `useSession` — that package imports
 * React from an externalized copy during SSR and crashes with
 * "Cannot read properties of null (reading 'useRef')".
 */
export function useSession(): SessionSnapshot {
  const sessionAtom = getAuthClient().useSession;

  const subscribe = useCallback(
    (onStoreChange: () => void) => sessionAtom.subscribe(onStoreChange),
    [sessionAtom],
  );

  const getSnapshot = useCallback(() => sessionAtom.get(), [sessionAtom]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
