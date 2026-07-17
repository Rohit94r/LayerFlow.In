"use client";

import {
  LayoutGrid,
  FolderKanban,
  FileText,
  MessageSquare,
  GitCompare,
  Wallet,
  Sparkles,
  Plug,
  Settings,
  Home,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "@/components/marketing/Logo";
import { demoUser, budget } from "@/lib/mock-data";
import BudgetMeter from "./BudgetMeter";

const navSections = [
  {
    label: "Workspace",
    items: [
      { href: "/workspace", label: "Home", icon: Home },
      { href: "/sessions", label: "Sessions", icon: MessageSquare },
      { href: "/prompts", label: "Prompts", icon: FileText },
      { href: "/projects", label: "Projects", icon: FolderKanban },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { href: "/compare", label: "Compare", icon: GitCompare },
      { href: "/budget", label: "Cost / Budget", icon: Wallet },
      { href: "/optimizer", label: "Optimizer", icon: Sparkles },
    ],
  },
  {
    label: "Build",
    items: [
      { href: "/gateway", label: "Gateway", icon: Plug },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export default function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-border bg-bg-soft">
      <div className="border-b border-border px-5 py-4">
        <Link href="/workspace" className="block">
          <Logo />
          <p className="mt-0.5 text-xs text-faint">AI Workspace</p>
        </Link>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="mb-1.5 px-3 text-[11px] font-medium uppercase tracking-wider text-faint">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map(({ href, label, icon: Icon }) => {
                const active =
                  pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                      active
                        ? "bg-surface-2 font-medium text-ink"
                        : "text-muted hover:bg-surface hover:text-ink"
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 shrink-0 ${
                        active ? "text-brand" : ""
                      }`}
                    />
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="space-y-3 border-t border-border p-4">
        <BudgetMeter budget={budget} compact />
        <Link
          href="/settings"
          className={`flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors ${
            pathname === "/settings" ? "bg-surface-2" : "hover:bg-surface"
          }`}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-xs font-medium text-brand">
            {demoUser.avatarInitials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink">
              {demoUser.name}
            </p>
            <p className="truncate text-xs text-faint">
              {demoUser.plan === "pro" ? "Pro plan" : "Free plan"}
            </p>
          </div>
          <LayoutGrid className="h-4 w-4 shrink-0 text-faint" />
        </Link>
      </div>
    </aside>
  );
}
