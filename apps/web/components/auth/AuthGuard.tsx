"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/providers/auth-provider";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isPending } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isPending) return;
    if (!isAuthenticated) {
      const next = encodeURIComponent(pathname || "/home");
      router.replace(`/sign-in?next=${next}`);
    }
  }, [isAuthenticated, isPending, pathname, router]);

  if (isPending) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg">
        <div className="text-center">
          <p className="text-sm font-medium text-ink">Loading session…</p>
          <p className="mt-1 text-xs text-muted">Checking your sign-in</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg">
        <p className="text-sm text-muted">Redirecting to sign in…</p>
      </div>
    );
  }

  return <>{children}</>;
}
