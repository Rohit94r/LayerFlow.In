// ─────────────────────────────────────────────────────────────
// Command palette registry — pages and actions for Cmd+K.
// ─────────────────────────────────────────────────────────────

export interface CommandItem {
  id: string;
  label: string;
  hint?: string;
  keywords?: string[];
  href?: string;
  action?: "toggle-theme" | "copy-install" | "new-rescue";
}

export const COMMANDS: CommandItem[] = [
  {
    id: "new-rescue",
    label: "Rescue a past chat",
    hint: "Paste a dead chat, continue here",
    keywords: ["rescue", "chat", "limit", "continue"],
    action: "new-rescue",
  },
  { id: "home", label: "Home", hint: "G / Work hub", keywords: ["dashboard"], href: "/home" },
  { id: "projects", label: "Projects", hint: "P", keywords: ["workspace", "folders"], href: "/workspace" },
  { id: "prompts", label: "Prompt Library", hint: "L", keywords: ["prompt"], href: "/prompts" },
  { id: "terminal", label: "Chat", hint: "T", keywords: ["code", "cli", "chat"], href: "/chat" },
  { id: "agents", label: "Agents", hint: "A", keywords: ["runs"], href: "/agents" },
  { id: "models", label: "Model Hub", hint: "M", keywords: ["llm", "provider", "byok"], href: "/models" },
  { id: "history", label: "History", hint: "H", keywords: ["timeline", "ledger"], href: "/history" },
  { id: "search", label: "Search", hint: "S", keywords: ["find", "context"], href: "/search" },
  { id: "costs", label: "Cost Analytics", hint: "D", keywords: ["spend", "budget", "usage"], href: "/costs" },
  { id: "billing", label: "Billing", hint: "B", keywords: ["plan", "invoice", "pay"], href: "/billing" },
  { id: "keys", label: "API Keys", hint: "K", keywords: ["gateway", "secret"], href: "/keys" },
  { id: "settings", label: "Settings", hint: ",", keywords: ["profile", "preferences"], href: "/settings" },
  { id: "toggle-theme", label: "Toggle theme", hint: "Switch dark / light", action: "toggle-theme" },
  {
    id: "copy-install",
    label: "Copy install command",
    hint: "go install github.com/layerflow/terminal@latest",
    keywords: ["cli", "install"],
    action: "copy-install",
  },
];
