// ─────────────────────────────────────────────────────────────
// Sidebar navigation — all features, grouped so the flow is
// obvious: Start → Build → Learn → Manage.
// ─────────────────────────────────────────────────────────────

import {
  LayoutGrid,
  LifeBuoy,
  AiChat,
  Library,
  BookUser,
  TerminalSquare,
  Bot,
  Cpu,
  History,
  Search,
  BarChart3,
  FolderKanban,
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
      { href: "/chat", label: "Chat", description: "One thread, any AI", icon: AiChat },
      { href: "/rescue", label: "Rescue", description: "Paste a chat, continue anywhere", icon: LifeBuoy },
    ],
  },
  {
    label: "Build",
    items: [
      { href: "/prompts", label: "Prompts", description: "Save and improve prompts", icon: Library },
      { href: "/passports", label: "Passports", description: "Portable project context", icon: BookUser },
      { href: "/code", label: "Terminal", description: "Browser terminal and agents", icon: TerminalSquare },
      { href: "/agents", label: "Agents", description: "Agent runs and status", icon: Bot },
    ],
  },
  {
    label: "Learn",
    items: [
      { href: "/models", label: "Models", description: "Models, routing and BYOK", icon: Cpu },
      { href: "/history", label: "History", description: "Every run, one timeline", icon: History },
      { href: "/search", label: "Search", description: "Search all your context", icon: Search },
      { href: "/costs", label: "Costs", description: "Spend, savings and budgets", icon: BarChart3 },
    ],
  },
  {
    label: "Manage",
    items: [
      { href: "/workspace", label: "Projects", description: "Projects and AI work ledger", icon: FolderKanban },
      { href: "/keys", label: "Keys", description: "API keys for the gateway", icon: KeyRound },
      { href: "/billing", label: "Billing", description: "Plan and invoices", icon: CreditCard },
      { href: "/settings", label: "Settings", description: "Workspace and profile", icon: Settings },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);
