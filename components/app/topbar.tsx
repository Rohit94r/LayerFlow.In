"use client";

import { Search, Plus } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { useSession } from "@/lib/auth-client";

export default function AppTopBar({ onSearch }: { onSearch?: (query: string) => void }) {
  const session = useSession();
  const user = session.data?.user;

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-border bg-bg/70 px-5 backdrop-blur-xl">
      <div className="relative hidden max-w-sm flex-1 sm:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
        <input
          type="search"
          placeholder="Search context, prompts, learnings…"
          aria-label="Search workspace"
          className="workspace-input pl-9"
          onChange={(e) => onSearch?.(e.target.value)}
        />
      </div>
      <div className="ml-auto flex items-center gap-3">
        <ThemeToggle />
        <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />}>
          <span className="hidden sm:inline">New Rescue</span>
          <span className="sm:hidden">Rescue</span>
        </Button>
        <Avatar initials={(user?.name ?? "LF").slice(0, 2).toUpperCase()} color="#f59e0b" size="sm" />
      </div>
    </header>
  );
}
