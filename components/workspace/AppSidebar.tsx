"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  FolderKanban,
  FileText,
  GitCompare,
  Wallet,
  Settings,
  Plug,
  ChevronRight,
} from "lucide-react";
import { demoUser, budget } from "@/lib/mock-data";
import BudgetMeter from "./BudgetMeter";

const navItems = [
  { href: "/workspace", label: "Workspace", icon: LayoutGrid },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/prompts", label: "Prompts", icon: FileText },
  { href: "/compare", label: "Compare", icon: GitCompare },
  { href: "/budget", label: "Budget", icon: Wallet },
  { href: "/gateway", label: "Gateway", icon: Plug },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-bg-soft)]">
      <div className="flex items-center gap-2.5 border-b border-[var(--color-border)] px-5 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-brand)] text-sm font-bold text-[var(--color-bg)]">
          LF
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight text-[var(--color-ink)]">
            LayerFlow
          </p>
          <p className="text-xs text-[var(--color-faint)]">AI Workspace</p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-[var(--color-surface-2)] font-medium text-[var(--color-ink)]"
                  : "text-[var(--color-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)]"
              }`}
            >
              <Icon
                className={`h-4 w-4 shrink-0 ${
                  active ? "text-[var(--color-brand)]" : ""
                }`}
              />
              {label}
              {active && (
                <ChevronRight className="ml-auto h-3.5 w-3.5 text-[var(--color-faint)]" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-3 border-t border-[var(--color-border)] p-4">
        <BudgetMeter budget={budget} compact />
        <div className="flex items-center gap-3 rounded-lg px-2 py-1.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-surface-2)] text-xs font-medium text-[var(--color-brand)]">
            {demoUser.avatarInitials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-[var(--color-ink)]">
              {demoUser.name}
            </p>
            <p className="truncate text-xs text-[var(--color-faint)]">
              {demoUser.plan === "pro" ? "Pro plan" : "Free plan"}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
