import { cn } from "@/lib/utils";

/**
 * Panel — the dashboard's core surface primitive.
 * Prefer this over ad-hoc card markup for consistent radius,
 * border, and interior padding.
 */
export function Panel({
  className,
  children,
  interactive = false,
}: {
  className?: string;
  children: React.ReactNode;
  /** Subtle hover state for clickable panels. */
  interactive?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-surface/60",
        interactive && "transition-colors duration-150 hover:border-border-strong",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PanelHeader({
  title,
  description,
  action,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4 border-b border-border px-5 py-4", className)}>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        {description ? <p className="mt-0.5 text-xs text-muted">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function PanelBody({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("p-5", className)}>{children}</div>;
}

export function PanelFooter({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("border-t border-border px-5 py-3", className)}>{children}</div>
  );
}
