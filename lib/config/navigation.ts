// ─────────────────────────────────────────────────────────────
// Sidebar navigation — all features, grouped so the flow is
// obvious: Start → Build → Learn → Manage.
// ─────────────────────────────────────────────────────────────

import {
  LayoutGrid,
  AiChat,
  Library,
  Bot,
  Cpu,
  History,
  Search,
  BarChart3,
  FolderKanban,
  KeyRound,
  CreditCard,
  Settings,
  TerminalSquare,
  Brain,
  Users,
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
      { href: "/chat", label: "Chat", description: "One thread, any AI — rescue past chats", icon: AiChat },
    ],
  },
  {
    label: "Build",
    items: [
      { href: "/prompts", label: "Prompts", description: "Save and improve prompts", icon: Library },
      { href: "/agents", label: "Agents", description: "Build and run your own agents", icon: Bot },
      { href: "/terminal", label: "Terminal", description: "Sessions synced from lf", icon: TerminalSquare },
    ],
  },
  {
    label: "Learn",
    items: [
      { href: "/models", label: "Models", description: "Models, routing and BYOK", icon: Cpu },
      { href: "/history", label: "History", description: "Every run, one timeline", icon: History },
      { href: "/memory", label: "Memory", description: "What LayerFlow remembered", icon: Brain },
      { href: "/search", label: "Search", description: "Search all your context", icon: Search },
      { href: "/costs", label: "Costs", description: "Spend, savings and budgets", icon: BarChart3 },
    ],
  },
  {
    label: "Manage",
    items: [
      { href: "/workspace", label: "Projects", description: "Projects and AI work ledger", icon: FolderKanban },
      { href: "/team", label: "Team", description: "Members, roles and invitations", icon: Users },
      { href: "/keys", label: "Keys", description: "API keys for the gateway", icon: KeyRound },
      { href: "/billing", label: "Billing", description: "Plan and invoices", icon: CreditCard },
      { href: "/settings", label: "Settings", description: "Workspace and profile", icon: Settings },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);
