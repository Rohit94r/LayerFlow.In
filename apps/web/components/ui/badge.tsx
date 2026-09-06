import { cn } from "@/lib/utils";

type Tone = "amber" | "mint" | "violet" | "rose" | "sky" | "neutral" | "green" | "red";

const TONES: Record<Tone, string> = {
  amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  mint: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  violet: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  rose: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  sky: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  green: "bg-green-500/10 text-green-500 border-green-500/20",
  red: "bg-red-500/10 text-red-400 border-red-500/20",
  neutral: "bg-surface-2 text-muted border-border",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Dot({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      className="inline-block h-1.5 w-1.5 rounded-full"
      style={{ background: color }}
    />
  );
}
