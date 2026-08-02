import Link from "next/link";
import { BookUser, Star, Plus } from "@/components/ui/icons";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { toolMeta, timeAgo, formatMoney } from "@/lib/data/providers";
import { ToolChip } from "@/components/ui/tool-logo";
import { passportService } from "@/lib/services/passports";

export default async function PassportsPage() {
  const passports = await passportService.listPassports();
  const sorted = [...passports].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Context Passports"
        description="Portable project context — any model picks up where the last one left off."
        action={
          <Link href="/rescue">
            <Button size="sm" icon={<Plus className="h-4 w-4" />}>
              New Continue Pack
            </Button>
          </Link>
        }
      />

      {sorted.length === 0 ? (
        <EmptyState
          icon={<BookUser className="h-5 w-5" />}
          title="No passports yet"
          description="Rescue a chat and LayerFlow builds your first Context Passport automatically."
          action={
            <Link href="/rescue">
              <Button variant="secondary" size="sm">
                Rescue a chat
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sorted.map((p) => {
            const meta = toolMeta(p.meta.sourceTool);
            return (
              <Link
                key={p.id}
                href={`/passports/${p.id}`}
                className="group flex h-full flex-col rounded-2xl border border-border bg-surface/40 p-5 transition-colors duration-150 hover:border-border-strong hover:bg-surface-2/50"
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
                      <p className="truncate text-sm font-semibold text-ink transition-colors duration-150 group-hover:text-brand">
                        {p.title}
                      </p>
                      <p className="text-[11px] text-faint">
                        {timeAgo(p.updatedAt)} · {p.wordCount.toLocaleString()} words
                      </p>
                    </div>
                  </div>
                  {p.favorite ? (
                    <Star className="h-3.5 w-3.5 shrink-0 fill-brand text-brand" aria-label="Favorite" />
                  ) : null}
                </div>

                <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted">{p.fields.goal}</p>

                <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-border pt-3">
                  <ToolChip tool={p.meta.sourceTool} />
                  <Badge tone="mint">~{formatMoney(p.meta.estimatedNextCost)} next run</Badge>
                  <span className="ml-auto text-[10px] font-medium text-faint">
                    used {p.usageCount}×
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
