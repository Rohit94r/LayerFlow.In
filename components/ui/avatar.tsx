import { cn } from "@/lib/utils";

export function Avatar({
  src,
  initials,
  color = "#f59e0b",
  size = "md",
  className,
}: {
  src?: string;
  initials: string;
  color?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = { sm: "h-7 w-7", md: "h-9 w-9", lg: "h-12 w-12" };
  if (src) {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full",
          sizes[size],
          className,
        )}
        aria-hidden
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" className="h-full w-full object-cover" />
      </span>
    );
  }
  const textSizes = { sm: "text-[10px]", md: "text-xs", lg: "text-sm" };
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-bold text-[#0e1416]",
        sizes[size],
        textSizes[size],
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
