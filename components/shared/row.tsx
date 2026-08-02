import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

/**
 * Row — one-line list item used across dashboard lists.
 * Leading slot (dot/icon/avatar), title, subtitle, trailing slot.
 */
export function Row({
  href,
  leading,
  title,
  subtitle,
  trailing,
  onClick,
  className,
}: {
  href?: string;
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  const inner = (
    <>
      {leading ? <span className="shrink-0">{leading}</span> : null}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-ink">{title}</span>
        {subtitle ? <span className="mt-0.5 block truncate text-xs text-faint">{subtitle}</span> : null}
      </span>
      {trailing ? <span className="flex shrink-0 items-center gap-2 text-faint">{trailing}</span> : null}
    </>
  );

  const classes = cn(
    "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-100 hover:bg-surface-2/70",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={classes} onClick={onClick}>
        {inner}
        <ArrowRight className="h-3.5 w-3.5 shrink-0 -translate-x-1 text-faint opacity-0 transition-all duration-150 group-hover:translate-x-0 group-hover:opacity-100" />
      </Link>
    );
  }

  return (
    <button type="button" className={classes} onClick={onClick}>
      {inner}
    </button>
  );
}
