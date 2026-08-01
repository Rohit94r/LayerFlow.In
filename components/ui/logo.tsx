import { cn } from "@/lib/utils";

export function Logo({
  className,
  size = 28,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={cn("shrink-0", className)}
    >
      <defs>
        <linearGradient id="lf-grad" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f59e0b" />
          <stop offset="0.55" stopColor="#44edbc" />
          <stop offset="1" stopColor="#8b7cf8" />
        </linearGradient>
      </defs>
      <rect x="1.5" y="1.5" width="29" height="29" rx="9" fill="var(--color-surface)" />
      <rect
        x="1.5"
        y="1.5"
        width="29"
        height="29"
        rx="9"
        stroke="url(#lf-grad)"
        strokeOpacity="0.55"
      />
      {/* layered context glyph */}
      <path d="M10 8.5h8.5a4.5 4.5 0 0 1 0 9H10V8.5Z" stroke="url(#lf-grad)" strokeWidth="2" strokeLinejoin="round" />
      <path d="M10 14.5h8.5a4.5 4.5 0 0 1 0 9H10v-9Z" stroke="url(#lf-grad)" strokeWidth="2" strokeLinejoin="round" opacity="0.65" />
      <path d="M6.5 5.5h14" stroke="url(#lf-grad)" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
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
