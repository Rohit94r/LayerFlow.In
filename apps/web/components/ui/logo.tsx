import Image from "next/image";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  size = 28,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <Image
      src="/logo.png"
      alt="LayerFlow"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
    />
  );
}

export function Wordmark({
  className,
  withTagline = false,
}: {
  className?: string;
  withTagline?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <Logo size={26} />
      <span className="flex flex-col leading-none">
        <span className="font-sans text-[17px] font-bold tracking-tight text-ink">LayerFlow</span>
        {withTagline ? (
          <span className="mt-0.5 text-[9px] font-medium uppercase tracking-[0.18em] text-faint">
            AI Context OS
          </span>
        ) : null}
      </span>
    </span>
  );
}
