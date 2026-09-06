"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_GROUPS } from "@/lib/config/navigation";
import { cn } from "@/lib/utils";

/**
 * Sidebar navigation list — rendered in the desktop rail (collapsed icon rail
 * below lg) and in the mobile drawer (always expanded). `expanded` controls
 * whether labels are visible; `onNavigate` fires on link activation (used by
 * the mobile drawer to close itself).
 */
export function SidebarNav({ expanded, onNavigate }: { expanded: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/home" ? pathname === "/home" : pathname.startsWith(href);

  return (
    <nav className="flex-1 overflow-y-auto px-2 py-3 lg:px-3" aria-label="Main">
      {NAV_GROUPS.map((group) => (
        <div key={group.label} className="mb-4 last:mb-0">
          <p
            className={cn(
              "px-2.5 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-faint",
              expanded ? "block" : "hidden lg:block",
            )}
          >
            {group.label}
          </p>
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  aria-current={active ? "page" : undefined}
                  onClick={() => onNavigate?.()}
                  className={cn(
                    "group relative flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-medium transition-colors duration-100",
                    active ? "bg-surface-2 text-ink" : "text-muted hover:bg-surface-2/60 hover:text-ink",
                  )}
                >
                  <item.icon className={cn("h-[18px] w-[18px] shrink-0", active ? "text-brand" : "text-muted group-hover:text-ink")} />
                  <span className={cn("min-w-0 truncate", expanded ? "block" : "hidden lg:block")}>{item.label}</span>
                  {active ? <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-brand" /> : null}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}