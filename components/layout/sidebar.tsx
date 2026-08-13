"use client";

import { Check, ChevronDown, LogOut, Settings } from "@/components/ui/icons";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { Avatar, LogoMark } from "@/components/ui/avatar";
import { useSession, signOut } from "@/lib/auth-client";
import { doodleForName } from "@/lib/doodles";
import { cn } from "@/lib/utils";
import { SidebarNav } from "./sidebar-nav";

/**
 * Application sidebar — icon-first navigation, grouped into
 * Start / Build / Learn / Manage so the flow is easy to follow.
 * Collapsed (icon-only) below lg, expanded on lg+.
 */
export function Sidebar() {
  const session = useSession();
  const user = session.data?.user;

  return (
    <aside className="flex h-full w-16 shrink-0 flex-col border-r border-border bg-surface/40 lg:w-[280px]">
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

      <SidebarNav expanded={false} />

      {/* Profile */}
      <div className="shrink-0 border-t border-border p-2 lg:p-3">
        <div className="flex items-center gap-2.5 rounded-xl px-2 py-2">
          <Avatar
            src={doodleForName(user?.name)}
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
