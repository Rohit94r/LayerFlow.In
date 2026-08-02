import Link from "next/link";
import { Panel } from "@/components/ui/panel";
import { ArrowRight } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

/**
 * Section panel with an optional header row ("title … view all")
 * and a body. Shared framing for every dashboard list panel.
 */
export function Section({
  title,
  description,
  href,
  hrefLabel = "View all",
  children,
  className,
  bodyClassName,
}: {
  title: string;
  description?: string;
  href?: string;
  hrefLabel?: string;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <Panel className={cn("flex h-full flex-col", className)}>
      <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-[13px] font-semibold text-ink">{title}</h2>
          {description ? <p className="mt-0.5 truncate text-[11px] text-faint">{description}</p> : null}
        </div>
        {href ? (
          <Link
            href={href}
            className="group flex shrink-0 items-center gap-1 text-[11px] font-medium text-muted transition-colors hover:text-ink"
          >
            {hrefLabel}
            <ArrowRight className="h-3 w-3 -translate-x-0.5 transition-transform duration-150 group-hover:translate-x-0" />
          </Link>
        ) : null}
      </div>
      <div className={cn("flex-1 p-2.5", bodyClassName)}>{children}</div>
    </Panel>
  );
}
