import { cn } from "@/lib/utils";

export function Avatar({
  initials,
  color = "#f59e0b",
  size = "md",
  className,
}: {
  initials: string;
  color?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = { sm: "h-7 w-7 text-[10px]", md: "h-9 w-9 text-xs", lg: "h-12 w-12 text-sm" };
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-bold text-[#0e1416]",
        sizes[size],
        className,
      )}
      style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}
      aria-hidden
    >
      {initials}
    </span>
  );
}

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 via-emerald-400 to-violet-400 text-[13px] font-black text-[#0e1416]",
        className,
      )}
      aria-hidden
    >
      L
    </span>
  );
}
