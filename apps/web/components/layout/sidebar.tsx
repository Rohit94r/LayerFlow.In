"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { Check, ChevronDown, ChevronLeft, ChevronRight, LogOut, Settings } from "@/components/ui/icons";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { Avatar, LogoMark } from "@/components/ui/avatar";
import { useSession, signOut } from "@/lib/auth-client";
import { doodleForName } from "@/lib/doodles";
import { cn } from "@/lib/utils";
import { SidebarNav } from "./sidebar-nav";

const WIDE_QUERY = "(min-width: 768px)";
const STORAGE_KEY = "layerflow.sidebar";
const CHANGE_EVENT = "layerflow:sidebar";

type SidebarMode = "wide" | "compact" | "auto";

function readStoredMode(): SidebarMode {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === "wide" || raw === "compact" ? raw : "auto";
  } catch {
    // private mode / storage blocked — fall back to auto
    return "auto";
  }
}

/**
 * Persisted sidebar preference (wide / compact / auto). Subscribed through
 * useSyncExternalStore so writes inside the same tab (via CHANGE_EVENT) and
 * other tabs (via the storage event) both refresh live, with a deterministic
 * "auto" default during SSR + hydration.
 */
function useStoredMode(): SidebarMode {
  return useSyncExternalStore(
    (onChange) => {
      window.addEventListener("storage", onChange);
      window.addEventListener(CHANGE_EVENT, onChange);
      return () => {
        window.removeEventListener("storage", onChange);
        window.removeEventListener(CHANGE_EVENT, onChange);
      };
    },
    readStoredMode,
    () => "auto",
  );
}

/**
 * True when the viewport is wide enough to fit the full (labelled) sidebar.
 * SSR-safe: server and the first hydration render use the default, then it
 * flips once `matchMedia` is applied on the client.
 */
function useIsWide(): boolean {
  const subscribe = useCallback((onChange: () => void) => {
    const mql = window.matchMedia(WIDE_QUERY);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(WIDE_QUERY).matches,
    () => true,
  );
}

/**
 * Application sidebar — icon-first navigation, grouped into
 * Start / Build / Connect / Spend / Manage so the flow is easy to follow.
 * Labelled (280px) on wide viewports by default and collapses to a 64px icon
 * rail on small screens or via the manual toggle (persisted locally).
 */
export function Sidebar() {
  const session = useSession();
  const user = session.data?.user;
  const isWide = useIsWide();
  const stored = useStoredMode();

  const expanded = useMemo(
    () => stored === "wide" || (stored === "auto" && isWide),
    [stored, isWide],
  );

  const toggle = useCallback(() => {
    const next: SidebarMode = expanded ? "compact" : "wide";
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // storage blocked — the choice still applies for this session
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, [expanded]);

  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col border-r border-border bg-surface/40 transition-[width] duration-200",
        expanded ? "w-[280px]" : "w-16",
      )}
    >
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
              <LogoMark className="h-6 w-6 shrink-0" />
              <span className={cn("min-w-0 flex-1", expanded ? "block" : "hidden")}>
                <span className="block truncate text-[13px] font-semibold text-ink">Personal</span>
                <span className="block text-[10px] text-faint">Free plan</span>
              </span>
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 text-faint transition-transform duration-150",
                  expanded ? "block" : "hidden",
                  open && "rotate-180",
                )}
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

      <SidebarNav expanded={expanded} />

      {/* Profile + collapse toggle */}
      <div className="shrink-0 border-t border-border p-2 lg:p-3">
        <div className="flex items-center gap-2.5 rounded-xl px-2 py-2">
          <Avatar
            src={doodleForName(user?.name)}
            initials={(user?.name ?? "LF").slice(0, 2).toUpperCase()}
            color="#f97316"
            size="sm"
          />
          <div className={cn("min-w-0 flex-1", expanded ? "block" : "hidden")}>
            <p className="truncate text-xs font-semibold text-ink">{user?.name ?? "Guest"}</p>
            <p className="truncate text-[10px] text-faint">{user?.email ?? "Free plan"}</p>
          </div>
          <button
            type="button"
            onClick={() => void signOut()}
            aria-label="Sign out"
            title="Sign out"
            className={cn(
              "hidden h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-ink",
              expanded && "inline-flex",
            )}
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
        <button
          type="button"
          onClick={toggle}
          aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
          title={expanded ? "Collapse sidebar" : "Expand sidebar"}
          className="mt-1 flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-[12px] font-medium text-muted transition-colors hover:bg-surface-2 hover:text-ink"
        >
          {expanded ? <ChevronLeft className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
          <span className={cn("min-w-0 truncate", expanded ? "block" : "hidden")}>Collapse</span>
        </button>
      </div>
    </aside>
  );
}