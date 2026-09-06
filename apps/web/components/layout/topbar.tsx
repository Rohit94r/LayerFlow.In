"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Notification } from "@layerflow/contracts";
import { Bell, Search } from "@/components/ui/icons";
import { IconButton } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Kbd } from "@/components/ui/kbd";
import { Avatar } from "@/components/ui/avatar";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { useSession, signOut } from "@/lib/auth-client";
import { doodleForName } from "@/lib/doodles";
import { timeAgo } from "@/lib/data/providers";
import { notificationsService } from "@/lib/services/notifications";
import { MobileNav } from "./mobile-nav";

function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const poll = async () => {
      try {
        const [countRes, listRes] = await Promise.all([
          notificationsService.unreadCount(),
          notificationsService.list({ limit: 8 }),
        ]);
        setUnread(countRes.count);
        setNotifications(listRes.notifications);
      } catch {
        // unauthenticated or transient API failure — keep current state
      }
    };

    void poll();
    const interval = setInterval(() => void poll(), 30_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  async function markAllRead() {
    try {
      await notificationsService.markRead();
      setUnread(0);
      setNotifications((current) => current.map((n) => ({ ...n, read: true })));
    } catch {
      // ignore
    }
  }

  return (
    <div ref={ref} className="relative">
      <IconButton
        label="Notifications"
        className="relative"
        onClick={() => setOpen((o) => !o)}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[9px] font-bold leading-none text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </IconButton>
      {open ? (
        <div className="absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-xl border border-border bg-surface shadow-xl shadow-black/40">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <p className="text-xs font-semibold text-ink">Notifications</p>
            <button
              type="button"
              onClick={() => void markAllRead()}
              className="text-[11px] font-medium text-faint transition-colors hover:text-ink"
            >
              Mark all read
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-faint">No notifications yet.</p>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    if (notification.agentId) router.push(`/agents/${notification.agentId}`);
                  }}
                  className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-surface-2"
                >
                  <span
                    className={
                      notification.read
                        ? "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-transparent"
                        : "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand"
                    }
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-ink">
                      {notification.title}
                    </span>
                    {notification.body ? (
                      <span className="mt-0.5 block line-clamp-2 text-[11px] leading-4 text-faint">
                        {notification.body}
                      </span>
                    ) : null}
                    <span className="mt-0.5 block text-[10px] text-faint">
                      {timeAgo(notification.createdAt)}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function Topbar({ onOpenCommand }: { onOpenCommand: () => void }) {
  const session = useSession();
  const user = session.data?.user;
  const router = useRouter();

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-bg/70 px-4 backdrop-blur-xl sm:px-5">
      <MobileNav />

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
        <NotificationBell />
        <ThemeToggle />
        <DropdownMenu
          align="end"
          trigger={() => (
            <button
              type="button"
              aria-label="Account menu"
              className="ml-1 rounded-full ring-brand/50 transition-shadow duration-150 hover:ring-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              <Avatar
                src={doodleForName(user?.name)}
                initials={(user?.name ?? "LF").slice(0, 2).toUpperCase()}
                color="#f97316"
                size="sm"
              />
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