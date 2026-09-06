import { cn } from "@/lib/utils";

/** Thin progress bar (e.g. budget usage, prompt score). */
export function Progress({
  value,
  className,
  barClassName,
  max = 100,
}: {
  value: number;
  className?: string;
  barClassName?: string;
  max?: number;
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-surface-2", className)}
    >
      <div
        className={cn("h-full rounded-full bg-brand transition-[width] duration-500 ease-out", barClassName)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
