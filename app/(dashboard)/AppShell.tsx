"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { CommandMenu } from "@/components/layout/command-menu";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { AuthProvider } from "@/lib/providers/auth-provider";
import { useCommandMenu } from "@/lib/hooks";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const command = useCommandMenu();

  return (
    <AuthProvider>
      <AuthGuard>
        <div className="flex h-dvh overflow-hidden bg-bg text-ink">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <Topbar onOpenCommand={() => command.setOpen(true)} />
            <main className="flex-1 overflow-y-auto">
              <div className="w-full px-4 py-6 md:px-6 md:py-7 xl:px-8">{children}</div>
            </main>
          </div>
        </div>
        <CommandMenu open={command.open} onClose={() => command.setOpen(false)} />
      </AuthGuard>
    </AuthProvider>
  );
}
