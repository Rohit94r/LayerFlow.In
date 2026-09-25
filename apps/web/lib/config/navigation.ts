// ─────────────────────────────────────────────────────────────
// Sidebar navigation — the AI spend firewall surface. Every
// entry here sits on top of the gateway: models, keys, costs,
// usage history, and billing.
// ─────────────────────────────────────────────────────────────

import {
  LayoutGrid,
  AiChat,
  Cpu,
  History,
  BarChart3,
  KeyRound,
  CreditCard,
  Settings,
} from "@/components/ui/icons";
import type { LucideIcon } from "@/components/ui/icons";

export interface NavItem {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Start",
    items: [
      { href: "/home", label: "Home", description: "Your work hub", icon: LayoutGrid },
      { href: "/chat", label: "Chat", description: "One thread, any model", icon: AiChat },
    ],
  },
  {
    label: "Connect",
    items: [
      { href: "/models", label: "Models", description: "Gateway models + BYOK", icon: Cpu },
      { href: "/keys", label: "Keys", description: "Gateway keys + provider keys", icon: KeyRound },
    ],
  },
  {
    label: "Spend",
    items: [
      { href: "/costs", label: "Costs", description: "Spend, budgets and alerts", icon: BarChart3 },
      { href: "/history", label: "Usage History", description: "Request and usage history", icon: History },
    ],
  },
  {
    label: "Manage",
    items: [
      { href: "/billing", label: "Billing", description: "Plan and invoices", icon: CreditCard },
      { href: "/settings", label: "Settings", description: "Workspace and profile", icon: Settings },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);
