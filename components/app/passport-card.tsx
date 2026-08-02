import Link from "next/link";
import { BookUser, Star } from "@/components/ui/icons";
import type { ContextPassport } from "@/lib/types";
import { toolMeta } from "@/lib/data/providers";
import { timeAgo, formatMoney } from "@/lib/data/providers";
import { ToolChip } from "@/components/ui/tool-logo";
import { Badge } from "@/components/ui/badge";

export function PassportCard({ passport }: { passport: ContextPassport }) {
  const meta = toolMeta(passport.meta.sourceTool);
  return (
    <Link
      href={`/passports/${passport.id}`}
      className="card card-hover group block p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold"
            style={{ background: `${meta.color}1f`, color: meta.color }}
          >
            <BookUser className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{passport.title}</p>
            <p className="text-[11px] text-faint">
              {meta.label} · {timeAgo(passport.updatedAt)} · {passport.wordCount.toLocaleString()} words
            </p>
          </div>
        </div>
        {passport.favorite ? (
          <Star className="h-3.5 w-3.5 shrink-0 fill-brand text-brand" aria-label="Favorite" />
        ) : null}
      </div>

      <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted">
        {passport.fields.goal}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        <ToolChip tool={passport.meta.sourceTool} />
        <Badge tone="mint">~{formatMoney(passport.meta.estimatedNextCost)} next run</Badge>
        <span className="ml-auto text-[10px] font-medium text-faint">
          used {passport.usageCount}×
        </span>
      </div>
    </Link>
  );
}
