"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useSession, signOut as authSignOut } from "@/lib/auth-client";
import { mapUser } from "@/lib/api/mappers";
import type { User } from "@/lib/api/types";

type AuthContextValue = {
  user: User | null;
  isPending: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
  refetch: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data, isPending, refetch } = useSession();

  const user =
    data?.user == null
      ? null
      : mapUser({
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          image: data.user.image ?? null,
          createdAt:
            typeof data.user.createdAt === "string"
              ? data.user.createdAt
              : new Date(data.user.createdAt).toISOString(),
        });

  const signOut = useCallback(async () => {
    await authSignOut();
    refetch();
  }, [refetch]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isPending,
      isAuthenticated: Boolean(user),
      signOut,
      refetch,
    }),
    [user, isPending, signOut, refetch],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
