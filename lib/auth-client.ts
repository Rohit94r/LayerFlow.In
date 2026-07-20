import { createAuthClient } from "better-auth/react";
import { getApiBaseUrl } from "@/lib/api/config";

/**
 * Better Auth browser client — Google-only social sign-in.
 * Session cookies are set by the API origin; requests use credentials: include.
 */
export const authClient = createAuthClient({
  baseURL: getApiBaseUrl(),
  fetchOptions: {
    credentials: "include",
  },
});

export const { signIn, signOut, useSession } = authClient;
