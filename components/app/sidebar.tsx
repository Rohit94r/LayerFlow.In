"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Code2,
  LifeBuoy,
  BookUser,
  Library,
  FolderKanban,
  BarChart3,
  Cpu,
  Settings,
  LogOut,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { Avatar } from "@/components/ui/avatar";
import { useSession, signOut } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

interface NavSection {
  title: string;
  items: { href: string; label: string; icon: LucideIcon }[];
}

const NAV: NavSection[] = [
  {
    title: "Code",
    items: [
      { href: "/code", label: "Coding Workspace", icon: Code2 },
    ],
  },
  {
    title: "Workspace",
    items: [
      { href: "/home", label: "Home", icon: LayoutGrid },
      { href: "/rescue", label: "Rescue Chat", icon: LifeBuoy },
      { href: "/passports", label: "Context Passport", icon: BookUser },
      { href: "/prompts", label: "Prompt Library", icon: Library },
      { href: "/workspace", label: "Workspace", icon: FolderKanban },
    ],
  },
  {
    title: "Insights",
    items: [
      { href: "/costs", label: "Cost Analytics", icon: BarChart3 },
      { href: "/models", label: "Models", icon: Cpu },
    ],
  },
  {
    title: "Account",
    items: [{ href: "/settings", label: "Settings", icon: Settings }],
  },
];

export default function AppSidebar() {
  const pathname = usePathname();
  const session = useSession();
  const user = session.data?.user;

  const isActive = (href: string) =>
    href === "/home" ? pathname === "/home" : pathname.startsWith(href);

  return (
    <aside className="flex h-full w-16 shrink-0 flex-col border-r border-border bg-surface/60 lg:w-60">
      <Link
        href="/home"
        className="flex h-16 items-center gap-2.5 border-b border-border px-4 lg:px-5"
        aria-label="LayerFlow home"
      >
        <Logo size={26} />
        <span className="hidden text-[15px] font-bold tracking-tight text-ink lg:block">
          LayerFlow
        </span>
      </Link>

      <nav className="flex-1 overflow-y-auto px-2 py-4 lg:px-3">
        {NAV.map((section) => (
          <div key={section.title} className="mb-5">
            <p className="mb-1.5 hidden px-3 text-[10px] font-bold uppercase tracking-widest text-faint lg:block">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn("sidebar-link", active && "sidebar-link-active")}
                    title={item.label}
                  >
                    <item.icon
                      className={cn(
                        "h-[18px] w-[18px] shrink-0",
                        active ? "text-brand" : "text-muted",
                      )}
                    />
                    <span className="hidden lg:block">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-border p-2 lg:p-3">
        <div className="flex items-center gap-2.5 rounded-xl px-2 py-2">
          <Avatar
            initials={(user?.name ?? "LF").slice(0, 2).toUpperCase()}
            color="#8b7cf8"
            size="sm"
          />
          <div className="hidden min-w-0 flex-1 lg:block">
            <p className="truncate text-xs font-semibold text-ink">{user?.name ?? "Guest"}</p>
            <p className="truncate text-[10px] text-faint">{user?.email ?? "Free plan"}</p>
          </div>
          <button
            type="button"
            onClick={() => void signOut()}
            aria-label="Sign out"
            className="hidden h-7 w-7 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-ink lg:inline-flex"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
