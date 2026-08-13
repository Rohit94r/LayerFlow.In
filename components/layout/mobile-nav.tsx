"use client";

import { useEffect, useState } from "react";
import { LogOut, Menu, X } from "@/components/ui/icons";
import { Avatar, LogoMark } from "@/components/ui/avatar";
import { useSession, signOut } from "@/lib/auth-client";
import { doodleForName } from "@/lib/doodles";
import { SidebarNav } from "./sidebar-nav";

/**
 * Mobile navigation — hamburger trigger rendered in the Topbar (visible below
 * lg) that opens an overlay drawer with the full sidebar content. Closes on
 * nav link click, backdrop click and Escape.
 */
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const session = useSession();
  const user = session.data?.user;

  // Escape to close.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close navigation" : "Open navigation"}
        aria-expanded={open}
        aria-controls="mobile-nav"
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border text-muted transition-colors hover:bg-surface-2 hover:text-ink lg:hidden"
      >
        {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <div
            id="mobile-nav"
            className="absolute inset-y-0 left-0 flex w-[280px] flex-col border-r border-border bg-bg shadow-2xl"
          >
            {/* Workspace */}
            <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-border px-3">
              <LogoMark className="h-6 w-6" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-ink">Personal</span>
                <span className="block text-[10px] text-faint">Free plan</span>
              </span>
              <button
                type="button"
                aria-label="Close navigation"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-faint transition-colors hover:bg-surface-2 hover:text-ink"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <SidebarNav expanded onNavigate={() => setOpen(false)} />

            {/* Profile */}
            <div className="shrink-0 border-t border-border p-3">
              <div className="flex items-center gap-2.5 rounded-xl px-2 py-2">
                <Avatar
                  src={doodleForName(user?.name)}
                  initials={(user?.name ?? "LF").slice(0, 2).toUpperCase()}
                  color="#f97316"
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-ink">{user?.name ?? "Guest"}</p>
                  <p className="truncate text-[10px] text-faint">{user?.email ?? "Free plan"}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  aria-label="Sign out"
                  title="Sign out"
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-ink"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}