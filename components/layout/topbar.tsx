"use client";

import { useRouter } from "next/navigation";
import { Bell, Search } from "@/components/ui/icons";
import { IconButton } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Kbd } from "@/components/ui/kbd";
import { Avatar } from "@/components/ui/avatar";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { useSession, signOut } from "@/lib/auth-client";

export function Topbar({ onOpenCommand }: { onOpenCommand: () => void }) {
  const session = useSession();
  const user = session.data?.user;
  const router = useRouter();

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-bg/70 px-4 backdrop-blur-xl sm:px-5">
      {/* Global search trigger */}
      <button
        type="button"
        onClick={onOpenCommand}
        className="group flex h-9 w-full max-w-xs items-center gap-2.5 rounded-xl border border-border bg-surface/50 px-3 text-left transition-colors duration-150 hover:border-border-strong"
        aria-label="Search everything (Cmd K)"
      >
        <Search className="h-4 w-4 shrink-0 text-faint" />
        <span className="flex-1 truncate text-[13px] text-faint">Search anything…</span>
        <span className="hidden items-center gap-1 sm:flex">
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </span>
      </button>

      <div className="ml-auto flex items-center gap-1.5">
        <IconButton label="Notifications" className="relative">
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-brand" />
        </IconButton>
        <ThemeToggle />
        <DropdownMenu
          align="end"
          trigger={() => (
            <button
              type="button"
              aria-label="Account menu"
              className="ml-1 rounded-full ring-brand/50 transition-shadow duration-150 hover:ring-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              <Avatar initials={(user?.name ?? "LF").slice(0, 2).toUpperCase()} color="#f97316" size="sm" />
            </button>
          )}
          items={[
            {
              id: "profile",
              label: user?.name ?? "Profile",
              description: user?.email ?? "Signed in",
              onSelect: () => router.push("/settings"),
            },
            { id: "billing", label: "Billing", onSelect: () => router.push("/billing") },
            { id: "settings", label: "Settings", onSelect: () => router.push("/settings") },
            {
              id: "signout",
              label: "Sign out",
              destructive: true,
              onSelect: () => void signOut(),
            },
          ]}
        />
      </div>
    </header>
  );
}
