"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Check, ChevronDown, LogOut, Settings } from "@/components/ui/icons";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { Avatar, LogoMark } from "@/components/ui/avatar";
import { useSession, signOut } from "@/lib/auth-client";
import { NAV_ITEMS } from "@/lib/config/navigation";
import { cn } from "@/lib/utils";

/**
 * Application sidebar — icon-first navigation.
 * Collapsed (icon-only) below lg, expanded on lg+.
 */
export function Sidebar() {
  const pathname = usePathname();
  const session = useSession();
  const user = session.data?.user;

  const isActive = (href: string) =>
    href === "/home" ? pathname === "/home" : pathname.startsWith(href);

  return (
    <aside className="flex h-full w-16 shrink-0 flex-col border-r border-border bg-surface/40 lg:w-64">
      {/* Workspace switcher */}
      <div className="flex h-14 shrink-0 items-center border-b border-border px-3">
        <DropdownMenu
          align="start"
          trigger={(open) => (
            <button
              type="button"
              aria-label="Switch workspace"
              className="flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition-colors duration-150 hover:bg-surface-2"
            >
              <LogoMark className="h-6 w-6" />
              <span className="hidden min-w-0 flex-1 lg:block">
                <span className="block truncate text-[13px] font-semibold text-ink">Personal</span>
                <span className="block text-[10px] text-faint">Free plan</span>
              </span>
              <ChevronDown
                className={cn("hidden h-3.5 w-3.5 text-faint transition-transform duration-150 lg:block", open && "rotate-180")}
              />
            </button>
          )}
          items={[
            {
              id: "personal",
              label: "Personal",
              description: "Current workspace",
              icon: <Check className="h-3.5 w-3.5 text-brand" />,
              onSelect: () => {},
            },
            {
              id: "manage",
              label: "Manage workspaces",
              icon: <Settings className="h-3.5 w-3.5" />,
              onSelect: () => {
                window.location.href = "/settings";
              },
            },
          ]}
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 lg:px-3" aria-label="Main">
        <div className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-medium transition-colors duration-100",
                  active ? "bg-surface-2 text-ink" : "text-muted hover:bg-surface-2/60 hover:text-ink",
                )}
              >
                <item.icon className={cn("h-[18px] w-[18px] shrink-0", active ? "text-brand" : "text-muted group-hover:text-ink")} />
                <span className="hidden min-w-0 truncate lg:block">{item.label}</span>
                {active ? <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-brand" /> : null}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Profile */}
      <div className="shrink-0 border-t border-border p-2 lg:p-3">
        <div className="flex items-center gap-2.5 rounded-xl px-2 py-2">
          <Avatar
            initials={(user?.name ?? "LF").slice(0, 2).toUpperCase()}
            color="#f97316"
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
            title="Sign out"
            className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-ink lg:inline-flex"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
