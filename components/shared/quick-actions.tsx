import Link from "next/link";
import type { LucideIcon } from "@/components/ui/icons";
import { ArrowRight } from "@/components/ui/icons";

export interface QuickAction {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
}

/** Quick action tile row — one line of primary actions per page. */
export function QuickActions({ actions }: { actions: QuickAction[] }) {
  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
      {actions.map((a) => (
        <Link
          key={a.href + a.label}
          href={a.href}
          className="group flex items-center gap-3 rounded-xl border border-border bg-surface/40 px-4 py-3 transition-colors duration-150 hover:border-border-strong hover:bg-surface-2/60"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-2 text-brand">
            <a.icon className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold text-ink">{a.label}</span>
            <span className="block truncate text-[11px] text-faint">{a.description}</span>
          </span>
          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-faint transition-transform duration-150 group-hover:translate-x-0.5" />
        </Link>
      ))}
    </div>
  );
}
