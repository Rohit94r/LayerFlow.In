"use client";

import AppSidebar from "@/components/app/sidebar";
import AppTopBar from "@/components/app/topbar";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { AuthProvider } from "@/lib/auth-provider";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AuthGuard>
        <div className="app-shell flex h-screen overflow-hidden">
          <AppSidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <AppTopBar />
            <main className="flex-1 overflow-y-auto">
              <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8">{children}</div>
            </main>
          </div>
        </div>
      </AuthGuard>
    </AuthProvider>
  );
}
