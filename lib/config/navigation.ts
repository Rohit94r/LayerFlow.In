// ─────────────────────────────────────────────────────────────
// Sidebar navigation — flat, icon-first, no nested menus.
// ─────────────────────────────────────────────────────────────

import {
  LayoutGrid,
  FolderKanban,
  Library,
  BookUser,
  LifeBuoy,
  TerminalSquare,
  Bot,
  Cpu,
  History,
  Search,
  BarChart3,
  CreditCard,
  KeyRound,
  Settings,
} from "@/components/ui/icons";
import type { LucideIcon } from "@/components/ui/icons";

export interface NavItem {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/home", label: "Home", description: "Your work hub", icon: LayoutGrid },
  { href: "/workspace", label: "Projects", description: "Projects and AI work ledger", icon: FolderKanban },
  { href: "/prompts", label: "Prompt Library", description: "Saved prompts, versioned", icon: Library },
  { href: "/passports", label: "Context Passports", description: "Portable project context", icon: BookUser },
  { href: "/rescue", label: "Continue Packs", description: "Rescue chats, continue anywhere", icon: LifeBuoy },
  { href: "/code", label: "Terminal", description: "Browser terminal and agents", icon: TerminalSquare },
  { href: "/agents", label: "Agents", description: "Agent runs and status", icon: Bot },
  { href: "/models", label: "Model Hub", description: "Models, routing and BYOK", icon: Cpu },
  { href: "/history", label: "History", description: "Every run, one timeline", icon: History },
  { href: "/search", label: "Search", description: "Search all your context", icon: Search },
  { href: "/costs", label: "Cost Analytics", description: "Spend, savings and budgets", icon: BarChart3 },
  { href: "/billing", label: "Billing", description: "Plan and invoices", icon: CreditCard },
  { href: "/keys", label: "API Keys", description: "Keys for the gateway", icon: KeyRound },
  { href: "/settings", label: "Settings", description: "Workspace and profile", icon: Settings },
];
